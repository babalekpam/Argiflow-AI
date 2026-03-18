import { Router, Request, Response } from "express";
import { ai } from "./index";
import { REGISTRY } from "../server/llm-router";

const router = Router();

router.get("/providers", (_req: Request, res: Response) => {
  const providers = ai.listProviders();
  const active = ai.getActiveProvider();
  const activeModel = ai.getActiveModel();

  res.json({
    active: {
      provider: active,
      model: activeModel,
    },
    providers,
  });
});

router.post("/test", async (req: Request, res: Response) => {
  try {
    const { message, provider, model } = req.body;
    const testMessage = message || "Say 'ArgiFlow AI is connected!' in exactly those words.";

    const start = Date.now();
    const result = await ai.chat(testMessage, {
      provider,
      model,
      maxTokens: 150,
      system: "You are a helpful assistant. Respond concisely.",
    });
    const latency = Date.now() - start;

    res.json({
      success: true,
      response: result.text,
      provider: result.provider,
      model: result.model,
      latencyMs: latency,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
      provider: req.body.provider || ai.getActiveProvider(),
    });
  }
});

router.patch("/provider", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { provider, model } = req.body;
    if (!provider) {
      return res.status(400).json({ error: "provider is required" });
    }

    const reg = REGISTRY[provider];
    if (!reg) {
      return res.status(400).json({
        error: `Unknown provider: ${provider}`,
        available: Object.keys(REGISTRY),
      });
    }

    process.env.AI_PROVIDER = provider;
    process.env.LLM_PROVIDER = provider;
    if (model) {
      process.env.AI_MODEL = model;
      process.env.LLM_MODEL = model;
    }

    res.json({
      success: true,
      active: {
        provider,
        model: model || reg.defaultModel,
      },
      note: "Runtime switch applied. This will reset on server restart unless you also set AI_PROVIDER and AI_MODEL in your Replit Secrets.",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { message, system, provider, model, maxTokens } = req.body;
    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    const userId = (req.session as any)?.userId;
    const result = await ai.chat(message, {
      system,
      provider,
      model,
      maxTokens,
      userId,
    });

    res.json({
      text: result.text,
      provider: result.provider,
      model: result.model,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/chat-json", async (req: Request, res: Response) => {
  try {
    const { message, system, provider, model, maxTokens } = req.body;
    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    const userId = (req.session as any)?.userId;
    const result = await ai.chatJSON(message, {
      system,
      provider,
      model,
      maxTokens,
      userId,
    });

    res.json({ data: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
