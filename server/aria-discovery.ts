import { callAI } from "./ai-provider";
import * as memory from "./aria-memory";

const DISCOVERY_QUESTIONS = [
  { key: "name", question: "What's the name of your business?" },
  { key: "type", question: "What type of business is it? (e.g., medical billing, consulting, agency, retail)" },
  { key: "owner_name", question: "What's your name?" },
  { key: "owner_email", question: "What's your email address?" },
  { key: "main_service", question: "What's the main service or product you sell?" },
  { key: "customer_type", question: "Who are your ideal customers? (e.g., small clinics, enterprise companies, local homeowners)" },
  { key: "service_area", question: "Where do you serve? (e.g., Dallas TX, nationwide, online-only)" },
  { key: "avg_job_value", question: "What's the average value of a deal or project for you? (rough number is fine)" },
  { key: "website", question: "Do you have a website? If so, what's the URL?" },
];

const REQUIRED_FIELDS = ["name", "type", "owner_name", "owner_email", "main_service"];

function calculateOnboardScore(biz: any): number {
  let score = 0;
  const fields = ["name", "type", "owner_name", "owner_email", "main_service", "customer_type", "service_area", "avg_job_value", "website"];
  for (const f of fields) {
    if (biz[f]) score += Math.floor(100 / fields.length);
  }
  return Math.min(score, 100);
}

function getMissingFields(biz: any): string[] {
  return REQUIRED_FIELDS.filter(f => !biz[f]);
}

function extractFieldFromResponse(response: string, field: string): string | null {
  const clean = response.trim();
  if (!clean || clean.toLowerCase() === "skip" || clean.toLowerCase() === "n/a") return null;
  return clean;
}

export async function handleDiscoveryMessage(userId: string, userMessage: string): Promise<string> {
  let biz = await memory.getBusiness(userId);
  if (!biz) {
    biz = await memory.upsertBusiness(userId, { status: "onboarding", onboarded: false, onboard_score: 0 });
  }

  await memory.addDiscoveryMessage(userId, "user", userMessage);
  const history = await memory.getDiscoveryHistory(userId);

  const missingFields = getMissingFields(biz);
  const filledFields: Record<string, any> = {};
  for (const q of DISCOVERY_QUESTIONS) {
    if ((biz as any)[q.key]) {
      filledFields[q.key] = (biz as any)[q.key];
    }
  }

  const prompt = `You are Aria, a friendly AI business assistant helping onboard a new user. Your job is to learn about their business through natural conversation — NOT a boring form.

WHAT WE KNOW SO FAR:
${Object.entries(filledFields).map(([k, v]) => `- ${k}: ${v}`).join("\n") || "Nothing yet — this is the start."}

WHAT WE STILL NEED:
${missingFields.map(f => `- ${f}`).join("\n") || "We have all required info!"}

OPTIONAL FIELDS WE COULD ASK:
${DISCOVERY_QUESTIONS.filter(q => !filledFields[q.key] && !missingFields.includes(q.key)).map(q => `- ${q.key}: ${q.question}`).join("\n") || "None remaining."}

CONVERSATION SO FAR:
${history.slice(-10).map(h => `${h.role === "user" ? "Owner" : "Aria"}: ${h.content}`).join("\n")}

RULES:
1. Be warm, conversational, and encouraging. Use the owner's name if you know it.
2. Extract any business info from what they just said and include it in your response metadata.
3. Ask about 1-2 missing fields naturally — don't interrogate.
4. If all required fields are filled, congratulate them and say you're ready to start managing their business.
5. Keep responses under 100 words.
6. NEVER use technical jargon. Speak like a smart friend, not a robot.

RESPOND AS JSON:
{
  "message": "Your conversational response to the owner",
  "extracted": { "field_name": "value" } // any fields you could extract from their message
  "onboarding_complete": true/false
}`;

  const result = await callAI({
    system: "You are Aria, a friendly AI business assistant. Return only valid JSON. No markdown.",
    userMessage: prompt,
    maxTokens: 800,
    userId,
  });

  let parsed: any;
  try {
    let text = result.text.trim();
    if (text.startsWith("```")) text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    parsed = JSON.parse(text);
  } catch {
    parsed = { message: "I'd love to learn about your business! What's the name of your company?", extracted: {}, onboarding_complete: false };
  }

  if (parsed.extracted && Object.keys(parsed.extracted).length > 0) {
    const updates: any = {};
    for (const [key, val] of Object.entries(parsed.extracted)) {
      if (val && typeof val === "string" && val.trim()) {
        const validKeys = DISCOVERY_QUESTIONS.map(q => q.key);
        if (validKeys.includes(key)) {
          updates[key] = key === "avg_job_value" ? parseFloat(val.replace(/[^0-9.]/g, "")) || null : val.trim();
        }
      }
    }
    if (Object.keys(updates).length > 0) {
      biz = await memory.upsertBusiness(userId, updates);
    }
  }

  const score = calculateOnboardScore(biz);
  const remaining = getMissingFields(biz);
  const isComplete = remaining.length === 0 || parsed.onboarding_complete;

  await memory.upsertBusiness(userId, {
    onboard_score: score,
    onboarded: isComplete,
    status: isComplete ? "active" : "onboarding",
  });

  await memory.addDiscoveryMessage(userId, "assistant", parsed.message);

  return parsed.message;
}

export async function getOnboardingStatus(userId: string) {
  const biz = await memory.getBusiness(userId);
  if (!biz) return { onboarded: false, score: 0, missing: REQUIRED_FIELDS };
  return {
    onboarded: biz.onboarded,
    score: biz.onboard_score,
    missing: getMissingFields(biz),
    business: {
      name: biz.name,
      type: biz.type,
      owner_name: biz.owner_name,
      main_service: biz.main_service,
      autonomy: biz.autonomy,
    },
  };
}
