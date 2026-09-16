import { Router, type Request, type Response, type NextFunction } from "express";
import {
  outreachSearchWorkers,
  SearchWorkersValidationError,
} from "./outreach-search-workers";
import type { SearchWorkerStatusResponse } from "./outreach-search-workers";

const router = Router();

function requireUser(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

function userId(req: Request): string {
  return req.session.userId!;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof SearchWorkersValidationError) return error.message;
  return "Search workers request failed";
}

router.use(requireUser);

router.get("/status", async (req, res) => {
  try {
    res.json(await outreachSearchWorkers.getStatus(userId(req)));
  } catch {
    res.status(500).json({ error: "Unable to read search worker status" });
  }
});

router.put("/config", async (req, res) => {
  try {
    if (!isObject(req.body)) {
      return res.status(400).json({ error: "Configuration payload must be an object" });
    }
    const allowedKeys = new Set(["dailySearchLimit", "queries"]);
    if (Object.keys(req.body).some((key) => !allowedKeys.has(key))) {
      return res.status(400).json({ error: "Only dailySearchLimit and optional queries may be changed" });
    }
    if (!Object.prototype.hasOwnProperty.call(req.body, "dailySearchLimit")) {
      return res.status(400).json({ error: "dailySearchLimit is required" });
    }
    await outreachSearchWorkers.updateConfig(
      userId(req),
      req.body.dailySearchLimit,
      Object.prototype.hasOwnProperty.call(req.body, "queries") ? req.body.queries : undefined,
    );
    res.json(await outreachSearchWorkers.getStatus(userId(req)));
  } catch (error) {
    const status = error instanceof SearchWorkersValidationError ? 400 : 500;
    res.status(status).json({ error: safeErrorMessage(error) });
  }
});

router.post("/start", async (req, res) => {
  try {
    await outreachSearchWorkers.start(userId(req));
    res.json(await outreachSearchWorkers.getStatus(userId(req)));
  } catch (error: any) {
    if (error?.name === "SearchWorkersBlockedError") {
      const status = await outreachSearchWorkers.getStatus(userId(req));
      return res.status(409).json({ error: "Search workers are not ready", status });
    }
    res.status(500).json({ error: "Unable to start search workers" });
  }
});

router.post("/stop", async (req, res) => {
  try {
    await outreachSearchWorkers.stop(userId(req));
    res.json(await outreachSearchWorkers.getStatus(userId(req)));
  } catch {
    res.status(500).json({ error: "Unable to stop search workers" });
  }
});

router.post("/run", async (req, res) => {
  try {
    const id = userId(req);
    const before = await outreachSearchWorkers.getStatus(id);
    if (!before.enabled) return res.status(409).json({ error: "Search workers are disabled", status: before });
    const outcome = await outreachSearchWorkers.runCycle(id);
    const status: SearchWorkerStatusResponse = await outreachSearchWorkers.getStatus(id);
    if (!outcome.started && outcome.skipped !== "already_running") {
      return res.status(409).json({ error: "Search workers are not ready", status });
    }
    res.json({ success: true, outcome, status });
  } catch {
    res.status(500).json({ error: "Unable to run search workers" });
  }
});

export default router;
