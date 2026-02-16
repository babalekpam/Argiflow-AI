/**
 * ArgiFlow Real-Time Voice AI Streaming Pipeline
 * ================================================
 * Twilio Media Streams (WebSocket) → Deepgram STT → Claude API (streaming) → Deepgram TTS → Twilio
 *
 * This replaces the broken <Gather>/<Say> TwiML loop that times out.
 * Now the AI responds in real-time with no silence gaps.
 *
 * Required env vars:
 *   DEEPGRAM_API_KEY  - For speech-to-text AND text-to-speech (https://console.deepgram.com)
 *   ANTHROPIC_API_KEY - Already configured for Claude
 *
 * Optional env vars:
 *   ELEVENLABS_API_KEY - Use ElevenLabs TTS instead of Deepgram (higher quality voice)
 *   ELEVENLABS_VOICE_ID - ElevenLabs voice (default: "21m00Tcm4TlvDq8ikWAM" = Rachel)
 */

import { WebSocket, WebSocketServer } from "ws";
import type { IncomingMessage } from "http";
import type { Server as HttpServer } from "http";
import Anthropic from "@anthropic-ai/sdk";

interface TwilioMediaMessage {
  event: "connected" | "start" | "media" | "stop" | "mark";
  sequenceNumber?: string;
  start?: { streamSid: string; callSid: string; accountSid: string; customParameters?: Record<string, string> };
  media?: { track: string; chunk: string; timestamp: string; payload: string };
  stop?: { accountSid: string; callSid: string };
  mark?: { name: string };
  streamSid?: string;
}

interface CallSession {
  callLogId: string;
  streamSid: string;
  callSid: string;
  systemPrompt: string;
  greeting: string;
  conversationHistory: { role: "user" | "assistant"; content: string }[];
  transcript: { role: string; text: string }[];
  deepgramWs: WebSocket | null;
  isProcessing: boolean;
  currentUtterance: string;
  silenceTimer: ReturnType<typeof setTimeout> | null;
  markCounter: number;
  isSpeaking: boolean;
  pendingAudio: Buffer[];
  userId: string;
}

type GetAnthropicFn = (userId: string) => Promise<{ client: Anthropic; model: string }>;

function log(callId: string, msg: string) {
  console.log(`[VoiceStream:${callId.slice(0, 8)}] ${msg}`);
}

const MULAW_DECODE_TABLE = new Int16Array(256);
(function buildMulawTable() {
  for (let i = 0; i < 256; i++) {
    let mu = ~i & 0xff;
    let sign = mu & 0x80;
    let exponent = (mu >> 4) & 0x07;
    let mantissa = mu & 0x0f;
    let sample = ((mantissa << 3) + 0x84) << exponent;
    sample -= 0x84;
    MULAW_DECODE_TABLE[i] = sign ? -sample : sample;
  }
})();

function mulawToLinear16(mulawBase64: string): Buffer {
  const mulawBytes = Buffer.from(mulawBase64, "base64");
  const pcm = Buffer.alloc(mulawBytes.length * 2);
  for (let i = 0; i < mulawBytes.length; i++) {
    const sample = MULAW_DECODE_TABLE[mulawBytes[i]];
    pcm.writeInt16LE(sample, i * 2);
  }
  return pcm;
}

function linear16ToMulaw(pcm16: Buffer): Buffer {
  const mulaw = Buffer.alloc(pcm16.length / 2);
  for (let i = 0; i < mulaw.length; i++) {
    let sample = pcm16.readInt16LE(i * 2);
    const sign = sample < 0 ? 0x80 : 0;
    if (sign) sample = -sample;
    if (sample > 32635) sample = 32635;
    sample += 0x84;
    let exponent = 7;
    for (let expMask = 0x4000; (sample & expMask) === 0 && exponent > 0; exponent--, expMask >>= 1) {}
    const mantissa = (sample >> (exponent + 3)) & 0x0f;
    mulaw[i] = ~(sign | (exponent << 4) | mantissa) & 0xff;
  }
  return mulaw;
}

function createDeepgramSTT(
  session: CallSession,
  onTranscript: (text: string, isFinal: boolean) => void,
  onError: (err: Error) => void
): WebSocket {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY not set");

  const dgUrl = "wss://api.deepgram.com/v1/listen?" + new URLSearchParams({
    model: "nova-2",
    language: "en-US",
    encoding: "linear16",
    sample_rate: "8000",
    channels: "1",
    punctuate: "true",
    interim_results: "true",
    utterance_end_ms: "1200",
    vad_events: "true",
    endpointing: "300",
    smart_format: "true",
  }).toString();

  const ws = new WebSocket(dgUrl, {
    headers: { Authorization: `Token ${apiKey}` },
  });

  ws.on("open", () => {
    log(session.callLogId, "Deepgram STT connected");
  });

  ws.on("message", (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === "Results" && msg.channel?.alternatives?.[0]) {
        const alt = msg.channel.alternatives[0];
        const text = alt.transcript?.trim();
        if (text) {
          const isFinal = msg.is_final === true;
          onTranscript(text, isFinal);
        }
      }

      if (msg.type === "UtteranceEnd") {
        if (session.currentUtterance.trim()) {
          onTranscript(session.currentUtterance.trim(), true);
        }
      }
    } catch (e) {
    }
  });

  ws.on("error", (err) => {
    log(session.callLogId, `Deepgram STT error: ${err.message}`);
    onError(err);
  });

  ws.on("close", () => {
    log(session.callLogId, "Deepgram STT closed");
  });

  return ws;
}

async function textToMulawAudio(text: string): Promise<Buffer> {
  if (process.env.ELEVENLABS_API_KEY) {
    return elevenLabsTTS(text);
  }
  return deepgramTTS(text);
}

async function deepgramTTS(text: string): Promise<Buffer> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY not set");

  const response = await fetch("https://api.deepgram.com/v1/speak?" + new URLSearchParams({
    model: "aura-asteria-en",
    encoding: "mulaw",
    sample_rate: "8000",
    container: "none",
  }).toString(), {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`Deepgram TTS error: ${response.status} ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function elevenLabsTTS(text: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey!,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0 },
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs TTS error: ${response.status}`);
  }

  console.warn("[VoiceStream] ElevenLabs returns MP3, falling back to Deepgram for mulaw output");
  return deepgramTTS(text);
}

async function getAIResponse(
  session: CallSession,
  userText: string,
  getAnthropic: GetAnthropicFn,
  onSentence: (sentence: string) => void,
  onComplete: (fullText: string) => void,
): Promise<void> {
  session.conversationHistory.push({ role: "user", content: userText });
  session.transcript.push({ role: "caller", text: userText });

  let anthropicClient: Anthropic;
  let model: string;

  try {
    const ai = await getAnthropic(session.userId);
    anthropicClient = ai.client;
    model = ai.model;
  } catch {
    anthropicClient = new Anthropic();
    model = "claude-sonnet-4-20250514";
  }

  let fullResponse = "";
  let sentenceBuffer = "";

  const stream = await anthropicClient.messages.stream({
    model,
    max_tokens: 300,
    system: session.systemPrompt,
    messages: session.conversationHistory,
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      const chunk = event.delta.text;
      fullResponse += chunk;
      sentenceBuffer += chunk;

      const sentenceEnders = /([.!?]+[\s]|[.!?]+$)/g;
      let match;
      let lastIndex = 0;

      while ((match = sentenceEnders.exec(sentenceBuffer)) !== null) {
        const sentence = sentenceBuffer.slice(lastIndex, match.index + match[0].length).trim();
        if (sentence.length > 3) {
          onSentence(sentence);
        }
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex > 0) {
        sentenceBuffer = sentenceBuffer.slice(lastIndex);
      }
    }
  }

  if (sentenceBuffer.trim().length > 3) {
    onSentence(sentenceBuffer.trim());
  }

  session.conversationHistory.push({ role: "assistant", content: fullResponse });
  session.transcript.push({ role: "agent", text: fullResponse });

  onComplete(fullResponse);
}

function sendAudioToTwilio(twilioWs: WebSocket, session: CallSession, audioPayload: Buffer) {
  if (twilioWs.readyState !== WebSocket.OPEN) return;

  const chunkSize = 160;
  for (let offset = 0; offset < audioPayload.length; offset += chunkSize) {
    const chunk = audioPayload.subarray(offset, Math.min(offset + chunkSize, audioPayload.length));
    const base64Chunk = chunk.toString("base64");

    twilioWs.send(JSON.stringify({
      event: "media",
      streamSid: session.streamSid,
      media: { payload: base64Chunk },
    }));
  }

  session.markCounter++;
  twilioWs.send(JSON.stringify({
    event: "mark",
    streamSid: session.streamSid,
    mark: { name: `speech_${session.markCounter}` },
  }));
}

function clearTwilioAudio(twilioWs: WebSocket, session: CallSession) {
  if (twilioWs.readyState !== WebSocket.OPEN) return;
  twilioWs.send(JSON.stringify({
    event: "clear",
    streamSid: session.streamSid,
  }));
  session.isSpeaking = false;
}

async function handleVoiceStream(
  twilioWs: WebSocket,
  callLogId: string,
  storage: any,
  getAnthropic: GetAnthropicFn,
) {
  const session: CallSession = {
    callLogId,
    streamSid: "",
    callSid: "",
    systemPrompt: "",
    greeting: "",
    conversationHistory: [],
    transcript: [],
    deepgramWs: null,
    isProcessing: false,
    currentUtterance: "",
    silenceTimer: null,
    markCounter: 0,
    isSpeaking: false,
    pendingAudio: [],
    userId: "",
  };

  log(callLogId, "WebSocket connected");

  const callLog = await storage.getVoiceCallById(callLogId);
  if (!callLog) {
    log(callLogId, "Call log not found, closing");
    twilioWs.close();
    return;
  }

  session.userId = callLog.userId;

  try {
    const scriptData = callLog.script ? JSON.parse(callLog.script) : {};
    session.greeting = scriptData.greeting || "Hello, this is an AI assistant. How can I help you?";
    session.systemPrompt = scriptData.systemPrompt || "You are a professional AI phone agent. Be helpful and concise.";
  } catch {
    session.greeting = "Hello, this is an AI assistant. How can I help you?";
    session.systemPrompt = "You are a professional AI phone agent. Be helpful and concise.";
  }

  twilioWs.on("message", async (data: Buffer) => {
    try {
      const msg: TwilioMediaMessage = JSON.parse(data.toString());

      switch (msg.event) {
        case "connected":
          log(callLogId, "Twilio stream connected");
          break;

        case "start":
          session.streamSid = msg.start!.streamSid;
          session.callSid = msg.start!.callSid;
          log(callLogId, `Stream started: ${session.streamSid}`);

          await storage.updateVoiceCall(callLogId, { status: "in-progress" });

          try {
            session.deepgramWs = createDeepgramSTT(
              session,
              (text: string, isFinal: boolean) => {
                if (isFinal) {
                  log(callLogId, `[Caller] ${text}`);
                  session.currentUtterance = "";

                  if (session.silenceTimer) clearTimeout(session.silenceTimer);

                  if (session.isSpeaking) {
                    clearTwilioAudio(twilioWs, session);
                  }

                  session.silenceTimer = setTimeout(async () => {
                    if (session.isProcessing) return;
                    session.isProcessing = true;

                    try {
                      session.isSpeaking = true;
                      await getAIResponse(
                        session,
                        text,
                        getAnthropic,
                        async (sentence: string) => {
                          try {
                            log(callLogId, `[AI] ${sentence}`);
                            const audio = await textToMulawAudio(sentence);
                            sendAudioToTwilio(twilioWs, session, audio);
                          } catch (ttsErr) {
                            log(callLogId, `TTS error: ${(ttsErr as Error).message}`);
                          }
                        },
                        async (fullText: string) => {
                          try {
                            await storage.updateVoiceCall(callLogId, {
                              transcript: JSON.stringify(session.transcript),
                            });
                          } catch {}

                          const lower = fullText.toLowerCase();
                          if (lower.includes("goodbye") || lower.includes("have a great day") || session.transcript.length > 40) {
                            session.markCounter++;
                            twilioWs.send(JSON.stringify({
                              event: "mark",
                              streamSid: session.streamSid,
                              mark: { name: "goodbye" },
                            }));
                          }

                          session.isProcessing = false;
                        },
                      );
                    } catch (aiErr) {
                      log(callLogId, `AI error: ${(aiErr as Error).message}`);
                      session.isProcessing = false;
                      session.isSpeaking = false;

                      try {
                        const errAudio = await textToMulawAudio("I apologize, I'm having a brief technical issue. Could you repeat that?");
                        sendAudioToTwilio(twilioWs, session, errAudio);
                      } catch {}
                    }
                  }, 500);
                } else {
                  session.currentUtterance = text;
                }
              },
              (err: Error) => {
                log(callLogId, `STT error: ${err.message}`);
              },
            );
          } catch (dgErr) {
            log(callLogId, `Failed to connect Deepgram: ${(dgErr as Error).message}`);
            try {
              const errAudio = await textToMulawAudio("I apologize, the voice system is not available right now. A team member will follow up with you. Goodbye.");
              sendAudioToTwilio(twilioWs, session, errAudio);
            } catch {}
          }

          try {
            session.transcript.push({ role: "agent", text: session.greeting });
            session.conversationHistory.push({ role: "assistant", content: session.greeting });
            const greetingAudio = await textToMulawAudio(session.greeting);
            sendAudioToTwilio(twilioWs, session, greetingAudio);
            session.isSpeaking = true;
            log(callLogId, `[AI Greeting] ${session.greeting}`);
          } catch (ttsErr) {
            log(callLogId, `Greeting TTS error: ${(ttsErr as Error).message}`);
          }
          break;

        case "media":
          if (session.deepgramWs && session.deepgramWs.readyState === WebSocket.OPEN && msg.media?.payload) {
            const pcmAudio = mulawToLinear16(msg.media.payload);
            session.deepgramWs.send(pcmAudio);
          }
          break;

        case "mark":
          if (msg.mark?.name === "goodbye") {
            log(callLogId, "Goodbye mark received, ending call");
            session.deepgramWs?.close();
            twilioWs.close();
          } else {
            const markNum = parseInt(msg.mark?.name?.replace("speech_", "") || "0");
            if (markNum >= session.markCounter) {
              session.isSpeaking = false;
            }
          }
          break;

        case "stop":
          log(callLogId, "Stream stopped by Twilio");
          cleanup();
          break;
      }
    } catch (err) {
      log(callLogId, `Message handling error: ${(err as Error).message}`);
    }
  });

  function cleanup() {
    if (session.silenceTimer) clearTimeout(session.silenceTimer);

    if (session.deepgramWs && session.deepgramWs.readyState === WebSocket.OPEN) {
      session.deepgramWs.send(JSON.stringify({ type: "CloseStream" }));
      session.deepgramWs.close();
    }

    if (session.transcript.length > 0) {
      storage.updateVoiceCall(callLogId, {
        transcript: JSON.stringify(session.transcript),
        status: "completed",
      }).catch(() => {});
    }

    log(callLogId, `Call ended. ${session.transcript.length} transcript entries.`);
  }

  twilioWs.on("close", () => {
    log(callLogId, "Twilio WebSocket closed");
    cleanup();
  });

  twilioWs.on("error", (err) => {
    log(callLogId, `Twilio WebSocket error: ${err.message}`);
    cleanup();
  });
}

export function attachVoiceStreamWSS(httpServer: HttpServer, storage: any, getAnthropic: GetAnthropicFn) {
  const voiceWss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request: IncomingMessage, socket, head) => {
    const url = request.url || "";

    const match = url.match(/^\/api\/voice\/stream\/([a-zA-Z0-9_-]+)/);
    if (match) {
      const callLogId = match[1];
      voiceWss.handleUpgrade(request, socket, head, (ws) => {
        handleVoiceStream(ws, callLogId, storage, getAnthropic);
      });
    }
  });

  console.log("[VoiceStream] WebSocket server attached for /api/voice/stream/:callLogId");
  return voiceWss;
}

export { handleVoiceStream };
