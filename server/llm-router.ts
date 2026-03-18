interface LLMProviderConfig {
  name: string;
  baseUrl: string;
  format: "anthropic" | "openai" | "gemini" | "ollama";
  defaultModel: string;
  getKey: () => string | undefined;
  modelOptions: string[];
}

const REGISTRY: Record<string, LLMProviderConfig> = {
  anthropic: {
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com",
    format: "anthropic",
    defaultModel: "claude-sonnet-4-6",
    getKey: () => process.env.ANTHROPIC_API_KEY,
    modelOptions: ["claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-5-20251001"],
  },
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com",
    format: "openai",
    defaultModel: "gpt-4o",
    getKey: () => process.env.OPENAI_API_KEY,
    modelOptions: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o3-mini"],
  },
  gemini: {
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com",
    format: "gemini",
    defaultModel: "gemini-1.5-pro",
    getKey: () => process.env.GEMINI_API_KEY,
    modelOptions: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"],
  },
  mistral: {
    name: "Mistral AI",
    baseUrl: "https://api.mistral.ai",
    format: "openai",
    defaultModel: "mistral-large-latest",
    getKey: () => process.env.MISTRAL_API_KEY,
    modelOptions: ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest"],
  },
  groq: {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai",
    format: "openai",
    defaultModel: "llama-3.3-70b-versatile",
    getKey: () => process.env.GROQ_API_KEY,
    modelOptions: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
  },
  together: {
    name: "Together AI",
    baseUrl: "https://api.together.xyz",
    format: "openai",
    defaultModel: "meta-llama/Llama-3-70b-chat-hf",
    getKey: () => process.env.TOGETHER_API_KEY,
    modelOptions: ["meta-llama/Llama-3-70b-chat-hf", "mistralai/Mixtral-8x22B-Instruct-v0.1"],
  },
  cohere: {
    name: "Cohere",
    baseUrl: "https://api.cohere.ai",
    format: "openai",
    defaultModel: "command-r-plus",
    getKey: () => process.env.COHERE_API_KEY,
    modelOptions: ["command-r-plus", "command-r", "command-light"],
  },
  openrouter: {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api",
    format: "openai",
    defaultModel: "openai/gpt-4o",
    getKey: () => process.env.OPENROUTER_API_KEY,
    modelOptions: ["openai/gpt-4o", "anthropic/claude-sonnet-4-20250514", "google/gemini-pro-1.5", "meta-llama/llama-3.1-405b-instruct"],
  },
  ollama: {
    name: "Ollama (Local)",
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    format: "ollama",
    defaultModel: "llama3",
    getKey: () => "ollama-local",
    modelOptions: ["llama3", "mistral", "codellama", "gemma"],
  },
};

export function getActiveConfig() {
  const providerId = (process.env.LLM_PROVIDER || "openai").toLowerCase();
  const reg = REGISTRY[providerId];
  if (!reg) throw new Error(`Unknown LLM_PROVIDER: ${providerId}`);
  const model = process.env.LLM_MODEL || reg.defaultModel;
  const apiKey = reg.getKey();
  if (!apiKey) throw new Error(`No API key for provider "${reg.name}". Set ${providerId.toUpperCase()}_API_KEY`);
  return { providerId, model, apiKey, ...reg };
}

interface CallLLMParams {
  system: string;
  userMessage: string;
  maxTokens?: number;
  providerId?: string;
  apiKey?: string;
  model?: string;
  baseURL?: string;
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, options);
    if (res.status === 429 && attempt < maxRetries) {
      const retryAfter = res.headers.get("retry-after");
      const waitMs = retryAfter ? Math.min(parseFloat(retryAfter) * 1000, 30000) : Math.min(1000 * Math.pow(2, attempt), 15000);
      console.log(`[LLM-Router] Rate limited (429), retrying in ${(waitMs / 1000).toFixed(1)}s (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }
    return res;
  }
  throw new Error("Rate limit exceeded after maximum retries");
}

export async function callLLM({ system, userMessage, maxTokens = 800, providerId, apiKey, model, baseURL }: CallLLMParams) {
  let cfg: any;

  if (providerId && apiKey) {
    const reg = REGISTRY[providerId];
    if (!reg) throw new Error(`Unknown provider: ${providerId}`);
    cfg = { ...reg, apiKey, model: model || reg.defaultModel };
    if (baseURL) cfg.baseUrl = baseURL;
  } else {
    cfg = getActiveConfig();
    if (model) cfg.model = model;
  }

  if (cfg.format === "anthropic") {
    const res = await fetchWithRetry(`${cfg.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    if (!res.ok) {
      const e: any = await res.json().catch(() => ({}));
      throw new Error(e?.error?.message || res.statusText);
    }
    const data: any = await res.json();
    return { text: data.content?.[0]?.text ?? "", provider: cfg.name, model: cfg.model };
  }

  if (cfg.format === "openai") {
    const messages: any[] = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: userMessage });
    const res = await fetchWithRetry(`${cfg.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({ model: cfg.model, max_tokens: maxTokens, messages }),
    });
    if (!res.ok) {
      const e: any = await res.json().catch(() => ({}));
      throw new Error(e?.error?.message || res.statusText);
    }
    const data: any = await res.json();
    return { text: data.choices?.[0]?.message?.content ?? "", provider: cfg.name, model: cfg.model };
  }

  if (cfg.format === "gemini") {
    const endpoint = `${cfg.baseUrl}/v1beta/models/${cfg.model}:generateContent?key=${cfg.apiKey}`;
    const body: any = {
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    };
    if (system) body.systemInstruction = { parts: [{ text: system }] };
    const res = await fetchWithRetry(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const e: any = await res.json().catch(() => ({}));
      throw new Error(e?.error?.message || res.statusText);
    }
    const data: any = await res.json();
    return { text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? "", provider: cfg.name, model: cfg.model };
  }

  if (cfg.format === "ollama") {
    const messages: any[] = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: userMessage });
    const res = await fetchWithRetry(`${cfg.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: cfg.model, messages, stream: false }),
    });
    if (!res.ok) {
      const e: any = await res.json().catch(() => ({}));
      throw new Error(e?.error || res.statusText);
    }
    const data: any = await res.json();
    return { text: data.message?.content ?? "", provider: cfg.name, model: cfg.model };
  }

  throw new Error(`Unsupported format: ${cfg.format}`);
}

export function getProviderList() {
  return Object.entries(REGISTRY).map(([id, r]) => ({
    id,
    name: r.name,
    defaultModel: r.defaultModel,
    modelOptions: r.modelOptions,
    format: r.format,
    hasKey: !!r.getKey(),
  }));
}

export { REGISTRY };
