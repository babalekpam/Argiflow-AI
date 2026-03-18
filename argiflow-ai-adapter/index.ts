import { callAI, resolveProvider, getProviderInfo } from "../server/ai-provider";
import { callLLM, getProviderList, REGISTRY } from "../server/llm-router";

export interface ChatOptions {
  provider?: string;
  model?: string;
  maxTokens?: number;
  userId?: string;
  system?: string;
}

export interface ChatResult {
  text: string;
  provider: string;
  model: string;
}

export const ai = {
  async chat(input: string | Array<{ role: string; content: string }>, options: ChatOptions = {}): Promise<ChatResult> {
    const userMessage = typeof input === "string"
      ? input
      : input.filter(m => m.role === "user").map(m => m.content).join("\n");

    const systemMessage = typeof input === "string"
      ? (options.system || "You are a helpful AI assistant.")
      : input.filter(m => m.role === "system").map(m => m.content).join("\n") || options.system || "You are a helpful AI assistant.";

    if (options.provider && options.provider !== "auto") {
      const reg = REGISTRY[options.provider];
      if (!reg) throw new Error(`Unknown provider: ${options.provider}`);
      const apiKey = reg.getKey();
      if (!apiKey) throw new Error(`No API key configured for ${options.provider}. Set ${options.provider.toUpperCase()}_API_KEY`);
      return callLLM({
        system: systemMessage,
        userMessage,
        maxTokens: options.maxTokens || 2000,
        providerId: options.provider,
        apiKey,
        model: options.model || reg.defaultModel,
      });
    }

    return callAI({
      system: systemMessage,
      userMessage,
      maxTokens: options.maxTokens || 2000,
      userId: options.userId,
    });
  },

  async chatWithSystem(system: string, message: string, options: ChatOptions = {}): Promise<ChatResult> {
    return ai.chat(message, { ...options, system });
  },

  async chatJSON<T = any>(input: string | Array<{ role: string; content: string }>, options: ChatOptions = {}): Promise<T> {
    const wrappedInput = typeof input === "string"
      ? input + "\n\nRespond ONLY with valid JSON. No markdown, no explanation."
      : input;

    const result = await ai.chat(wrappedInput, {
      ...options,
      system: (options.system || "") + "\nYou must respond with valid JSON only. No markdown code fences, no explanation text.",
    });

    let text = result.text.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    }

    return JSON.parse(text);
  },

  listProviders() {
    return getProviderList().map(p => ({
      id: p.id,
      name: p.name,
      defaultModel: p.defaultModel,
      models: p.modelOptions,
      configured: p.hasKey,
      format: p.format,
    }));
  },

  getActiveProvider(): string {
    return (process.env.AI_PROVIDER || process.env.LLM_PROVIDER || "openai").toLowerCase();
  },

  getActiveModel(): string {
    const providerId = ai.getActiveProvider();
    const reg = REGISTRY[providerId];
    return process.env.AI_MODEL || process.env.LLM_MODEL || reg?.defaultModel || "gpt-4o";
  },

  async resolveForUser(userId?: string) {
    return resolveProvider(userId);
  },

  getProviderInfo() {
    return getProviderInfo();
  },
};

export default ai;
