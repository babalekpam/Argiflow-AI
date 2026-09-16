import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes, getAnthropicForUser } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { attachVoiceStreamWSS } from "./voice-stream";
import { storage } from "./storage";
import { startApprovedCampaignDispatcher } from "./outreach-agent";
import { startOutreachSearchWorkersScheduler } from "./outreach-search-workers";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Clerk proxy must be mounted BEFORE body parsers (streams raw bytes)
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));

app.use(
  express.json({
    limit: "50mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "50mb" }));

// Clerk middleware — resolves publishable key from request host for custom-domain support
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        const safe = { ...capturedJsonResponse };
        const redactKeys = ["password", "token", "secret", "apiKey", "api_key", "sessionId", "passwordHash", "smtpPassword"];
        for (const key of redactKeys) {
          if (key in safe) safe[key] = "[REDACTED]";
        }
        const snippet = JSON.stringify(safe);
        logLine += ` :: ${snippet.length > 200 ? snippet.slice(0, 200) + "…" : snippet}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const port = parseInt(process.env.PORT || "5000", 10);

  await registerRoutes(httpServer, app);
  // Search-only workers resume only tenants that explicitly enabled their
  // independent persisted config; this does not activate the full agent.
  startOutreachSearchWorkersScheduler();
  // Campaign sending is restart-safe but authorization-scoped: this worker
  // only polls durable user-approved launch markers and never starts the
  // autonomous discovery/enrollment agent.
  startApprovedCampaignDispatcher();

  attachVoiceStreamWSS(httpServer, storage, getAnthropicForUser);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = process.env.NODE_ENV === "production" ? "Internal Server Error" : (err.message || "Internal Server Error");

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
