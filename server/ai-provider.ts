import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { storage } from "./storage";
import { callLLM, REGISTRY } from "./llm-router";

export interface AICallParams {
  system: string;
  userMessage: string;
  maxTokens?: number;
}

export interface AICallResult {
  text: string;
  provider: string;
  model: string;
}

export interface AnthropicLikeClient {
  messages: {
    create: (params: any) => Promise<any>;
  };
}

const isValidAnthropicKey = (key?: string) => key && key.startsWith("sk-ant-");

const AI_PROVIDER_KEY_FIELDS: Record<string, string> = {
  anthropic: "anthropicApiKey",
  openai: "openaiApiKey",
  gemini: "geminiApiKey",
  mistral: "mistralApiKey",
  groq: "groqApiKey",
  together: "togetherApiKey",
  cohere: "cohereApiKey",
  openrouter: "openrouterApiKey",
};

const SYSTEM_ENV_KEYS: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
  mistral: "MISTRAL_API_KEY",
  groq: "GROQ_API_KEY",
  together: "TOGETHER_API_KEY",
  cohere: "COHERE_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

function getSystemKey(providerId: string): string | undefined {
  const envVar = SYSTEM_ENV_KEYS[providerId];
  if (!envVar) return undefined;
  const key = process.env[envVar];
  if (providerId === "anthropic" && !isValidAnthropicKey(key)) return undefined;
  return key || undefined;
}

function getReplitProxy(): { apiKey: string; baseURL: string } | null {
  const k = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  const u = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  if (k && u) return { apiKey: k, baseURL: u };
  return null;
}

export interface ResolvedProvider {
  providerId: string;
  apiKey: string;
  model: string;
  source: "user" | "system" | "replit-proxy";
  baseURL?: string;
}

export async function resolveProvider(userId?: string): Promise<ResolvedProvider> {
  if (userId) {
    const settings = await storage.getSettingsByUser(userId);
    if (settings) {
      const preferred = settings.preferredAiProvider || "auto";

      if (preferred !== "auto") {
        const keyField = AI_PROVIDER_KEY_FIELDS[preferred] as keyof typeof settings;
        const userKey = keyField ? (settings as any)[keyField] : undefined;
        if (userKey) {
          const reg = REGISTRY[preferred];
          const model = settings.preferredAiModel || reg?.defaultModel || "gpt-4o-mini";
          return { providerId: preferred, apiKey: userKey, model, source: "user" };
        }

        const sysKey = getSystemKey(preferred);
        if (sysKey) {
          const reg = REGISTRY[preferred];
          const model = settings.preferredAiModel || reg?.defaultModel || "gpt-4o-mini";
          return { providerId: preferred, apiKey: sysKey, model, source: "system" };
        }

        if (preferred === "anthropic") {
          const proxy = getReplitProxy();
          if (proxy) {
            return { providerId: "anthropic", apiKey: proxy.apiKey, model: settings.preferredAiModel || "claude-sonnet-4-5", source: "replit-proxy", baseURL: proxy.baseURL };
          }
        }
      }

      for (const [pid, field] of Object.entries(AI_PROVIDER_KEY_FIELDS)) {
        const userKey = (settings as any)[field];
        if (userKey) {
          if (pid === "anthropic" && !isValidAnthropicKey(userKey)) continue;
          const reg = REGISTRY[pid];
          return { providerId: pid, apiKey: userKey, model: reg?.defaultModel || "gpt-4o-mini", source: "user" };
        }
      }
    }
  }

  if (process.env.OPENAI_API_KEY) {
    return { providerId: "openai", apiKey: process.env.OPENAI_API_KEY, model: "gpt-4o", source: "system" };
  }

  if (isValidAnthropicKey(process.env.ANTHROPIC_API_KEY)) {
    return { providerId: "anthropic", apiKey: process.env.ANTHROPIC_API_KEY!, model: "claude-sonnet-4-20250514", source: "system" };
  }

  const proxy = getReplitProxy();
  if (proxy) {
    return { providerId: "anthropic", apiKey: proxy.apiKey, model: "claude-sonnet-4-5", source: "replit-proxy", baseURL: proxy.baseURL };
  }

  for (const [pid, envVar] of Object.entries(SYSTEM_ENV_KEYS)) {
    const key = process.env[envVar];
    if (key) {
      const reg = REGISTRY[pid];
      return { providerId: pid, apiKey: key, model: reg?.defaultModel || "gpt-4o-mini", source: "system" };
    }
  }

  throw new Error("AI_NOT_CONFIGURED");
}

export async function callAI(params: AICallParams & { userId?: string }): Promise<AICallResult> {
  const resolved = await resolveProvider(params.userId);

  return callLLM({
    system: params.system,
    userMessage: params.userMessage,
    maxTokens: params.maxTokens || 2000,
    providerId: resolved.providerId,
    apiKey: resolved.apiKey,
    model: resolved.model,
    baseURL: resolved.baseURL,
  });
}

export async function getAnthropicCompatClient(userId?: string): Promise<{ client: AnthropicLikeClient; model: string; provider: string }> {
  const resolved = await resolveProvider(userId);

  if (resolved.providerId === "anthropic") {
    const client = new Anthropic({
      apiKey: resolved.apiKey,
      ...(resolved.baseURL ? { baseURL: resolved.baseURL } : {}),
    });
    return { client, model: resolved.model, provider: "anthropic" };
  }

  if (resolved.providerId === "openai" || REGISTRY[resolved.providerId]?.format === "openai") {
    const reg = REGISTRY[resolved.providerId];
    const openai = new OpenAI({
      apiKey: resolved.apiKey,
      ...(reg && reg.baseUrl !== "https://api.openai.com" ? { baseURL: `${reg.baseUrl}/v1` } : {}),
    });

    const wrapper: AnthropicLikeClient = {
      messages: {
        create: async (anthropicParams: any) => {
          const { max_tokens, system, messages, tools } = anthropicParams;
          const openaiMessages: any[] = [];
          if (system) openaiMessages.push({ role: "system", content: typeof system === "string" ? system : JSON.stringify(system) });
          for (const msg of messages) {
            if (msg.role === "assistant") {
              if (Array.isArray(msg.content)) {
                const text = msg.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
                const toolCalls = msg.content.filter((b: any) => b.type === "tool_use").map((b: any) => ({
                  id: b.id, type: "function" as const,
                  function: { name: b.name, arguments: JSON.stringify(b.input || {}) }
                }));
                openaiMessages.push({ role: "assistant", content: text || null, ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}) });
              } else {
                openaiMessages.push({ role: "assistant", content: msg.content });
              }
            } else if (msg.role === "user") {
              if (Array.isArray(msg.content)) {
                const toolResults = msg.content.filter((b: any) => b.type === "tool_result");
                if (toolResults.length > 0) {
                  for (const tr of toolResults) {
                    openaiMessages.push({ role: "tool", tool_call_id: tr.tool_use_id, content: typeof tr.content === "string" ? tr.content : JSON.stringify(tr.content) });
                  }
                } else {
                  const textContent = msg.content.map((b: any) => typeof b === "string" ? b : b.type === "text" ? b.text : JSON.stringify(b)).join("\n");
                  openaiMessages.push({ role: "user", content: textContent });
                }
              } else {
                openaiMessages.push({ role: "user", content: msg.content });
              }
            }
          }

          let openaiTools: any[] | undefined;
          if (tools?.length) {
            openaiTools = tools.filter((t: any) => t.type !== "web_search_20250305").map((t: any) => ({
              type: "function", function: { name: t.name, description: t.description || "", parameters: t.input_schema || { type: "object", properties: {} } }
            }));
            if (openaiTools.length === 0) openaiTools = undefined;
          }

          const response = await openai.chat.completions.create({
            model: resolved.model,
            max_tokens: max_tokens || 4096,
            messages: openaiMessages,
            ...(openaiTools ? { tools: openaiTools } : {}),
          });

          const choice = response.choices[0];
          const content: any[] = [];
          if (choice?.message?.content) content.push({ type: "text", text: choice.message.content });
          if (choice?.message?.tool_calls) {
            for (const tc of choice.message.tool_calls) {
              content.push({ type: "tool_use", id: tc.id, name: (tc as any).function.name, input: JSON.parse((tc as any).function.arguments || "{}") });
            }
          }
          return { content: content.length > 0 ? content : [{ type: "text", text: "" }], stop_reason: choice?.finish_reason === "tool_calls" ? "tool_use" : "end_turn", model: response.model, usage: response.usage };
        }
      }
    };

    return { client: wrapper, model: resolved.model, provider: resolved.providerId };
  }

  if (resolved.providerId === "gemini") {
    const geminiWrapper: AnthropicLikeClient = {
      messages: {
        create: async (anthropicParams: any) => {
          const { max_tokens, system, messages } = anthropicParams;
          const userText = messages.filter((m: any) => m.role === "user").map((m: any) => typeof m.content === "string" ? m.content : m.content?.map((b: any) => b.text || "").join("\n")).join("\n");
          const result = await callLLM({ system: system || "", userMessage: userText, maxTokens: max_tokens || 2000, providerId: "gemini", apiKey: resolved.apiKey, model: resolved.model });
          return { content: [{ type: "text", text: result.text }], stop_reason: "end_turn", model: result.model };
        }
      }
    };
    return { client: geminiWrapper, model: resolved.model, provider: "gemini" };
  }

  throw new Error(`Unsupported provider for Anthropic-compatible client: ${resolved.providerId}`);
}

export function getProviderInfo() {
  const providers = Object.entries(REGISTRY).map(([id, r]) => ({
    id,
    name: r.name,
    defaultModel: r.defaultModel,
    modelOptions: r.modelOptions,
    hasSystemKey: !!getSystemKey(id),
  }));

  const proxy = getReplitProxy();
  if (proxy) {
    const anthIdx = providers.findIndex(p => p.id === "anthropic");
    if (anthIdx >= 0) providers[anthIdx].hasSystemKey = true;
  }

  return providers;
}
