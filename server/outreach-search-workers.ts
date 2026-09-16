/**
 * Search-only outreach workers.
 *
 * This module intentionally has no dependency on the full outreach agent. It
 * stores reservations and unqualified web results in agent_tasks, never in
 * leads/campaigns/sequences, so a search result cannot accidentally enter an
 * outbound workflow.
 */

import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import { agentConfigs, agentTasks } from "../shared/schema";

export const OUTREACH_SEARCH_AGENT_TYPE = "outreach_search_workers";
export const OUTREACH_AGENT_TYPE = "outreach_agent";
export const WORKER_COUNT = 3 as const;
export const DEFAULT_DAILY_SEARCH_LIMIT = 3;
export const DEFAULT_DAILY_RESULT_LIMIT = 10;
export const MAX_PROVIDER_RESULTS = 10;
export const SEARCH_TIMEOUT_MS = 15_000;

const SEARCH_RESERVATION_TASK = "search_request_reservation";
const SEARCH_RESULT_TASK = "search_result";
const SEARCH_CYCLE_LEASE_TASK = "search_cycle_lease";
const SEARCH_CONFIG_SCHEMA = "outreach_search_workers_config";
const SEARCH_RESERVATION_SCHEMA = "outreach_search_worker_reservation";
const SEARCH_RESULT_SCHEMA = "outreach_search_worker_result";
const SCHEMA_VERSION = 1 as const;
const CYCLE_LEASE_TIMEOUT_MS = 20 * 60 * 1000;
const MAX_QUERY_LENGTH = 500;
const MAX_QUERY_COUNT = 100;

export type SearchWorkerStatus = "idle" | "running" | "completed" | "error";

export type SearchWorkerResult = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  query: string;
  workerId: 1 | 2 | 3;
  discoveredAt: string;
};

export type SearchWorkerStatusResponse = {
  enabled: boolean;
  workerCount: 3;
  providerConfigured: boolean;
  criteriaReady: boolean;
  queries: string[];
  dailySearchLimit: number;
  searchesUsedToday: number;
  dailyResultLimit: number;
  resultsToday: number;
  workers: Array<{
    id: 1 | 2 | 3;
    status: SearchWorkerStatus;
    lastRun: string | null;
    lastError: string | null;
  }>;
  results: SearchWorkerResult[];
  blockers: string[];
};

export type SearchCriteria = {
  targetAudience?: string;
  businessType?: string;
  businessDescription?: string;
  valueProposition?: string;
  competitorKeywords?: string[];
};

export type TavilySearchResponse = {
  results?: Array<{
    title?: unknown;
    url?: unknown;
    content?: unknown;
    snippet?: unknown;
  }>;
};

export type SearchProvider = {
  search: (
    query: string,
    options: {
      maxResults: number;
      criteria: SearchCriteria;
      signal: AbortSignal;
    },
  ) => Promise<TavilySearchResponse | unknown[]>;
};

type SearchWorkerServiceOptions = {
  provider?: SearchProvider;
  database?: typeof db;
  now?: () => Date;
  providerConfigured?: boolean | (() => boolean);
  timeoutMs?: number;
};

export type SearchWorkerAssignment = {
  workerId: 1 | 2 | 3;
  query: string;
  queryIndex: number;
};

export type SearchCandidate = {
  url: string;
  emails?: string[];
  [key: string]: unknown;
};

export function buildRoundRobinAssignments(
  queries: string[],
  cursor = 0,
): SearchWorkerAssignment[] {
  if (queries.length === 0) return [];
  const normalizedCursor = ((cursor % queries.length) + queries.length) % queries.length;
  return ([1, 2, 3] as const)
    .slice(0, Math.min(WORKER_COUNT, queries.length))
    .map((workerId, offset) => {
      const queryIndex = (normalizedCursor + offset) % queries.length;
      return { workerId, query: queries[queryIndex], queryIndex };
    });
}

export function allocateSharedResultSlots(availableSlots: number, workersRemaining: number): number {
  if (!Number.isFinite(availableSlots) || availableSlots <= 0) return 0;
  const fairShare = Math.max(1, Math.ceil(availableSlots / Math.max(1, workersRemaining)));
  return Math.min(MAX_PROVIDER_RESULTS, Math.floor(availableSlots), fairShare);
}

export function canReserveSearchRequest(searchesUsed: number, dailySearchLimit: number): boolean {
  return Number.isFinite(searchesUsed) &&
    Number.isFinite(dailySearchLimit) &&
    searchesUsed >= 0 &&
    dailySearchLimit >= 1 &&
    searchesUsed < dailySearchLimit;
}

export function shouldDispatchSearch(
  enabled: boolean,
  searchesUsed: number,
  dailySearchLimit: number,
): boolean {
  return enabled && canReserveSearchRequest(searchesUsed, dailySearchLimit);
}

export function getSearchWorkerBlockers(input: {
  providerConfigured: boolean;
  queryCount: number;
  searchesUsed: number;
  dailySearchLimit: number;
  resultsToday: number;
  dailyResultLimit: number;
}): string[] {
  const blockers: string[] = [];
  if (!input.providerConfigured) blockers.push("Tavily search provider is not configured");
  if (input.queryCount === 0) blockers.push("No approved discovery queries are configured");
  else if (input.queryCount < WORKER_COUNT) {
    blockers.push("At least 3 unique non-empty discovery queries are required for all 3 workers");
  }
  if (input.searchesUsed >= input.dailySearchLimit) blockers.push("Daily search request limit reached");
  if (input.resultsToday >= input.dailyResultLimit) blockers.push("Daily result limit reached");
  return blockers;
}

export function dedupeSearchCandidates<T extends SearchCandidate>(
  existing: SearchCandidate[],
  incoming: T[],
  limit = Number.POSITIVE_INFINITY,
): T[] {
  const seenUrls = new Set<string>();
  const seenEmails = new Set<string>();
  for (const candidate of existing) {
    const canonical = canonicalSourceUrl(candidate.url);
    if (canonical) seenUrls.add(canonical);
    for (const email of candidate.emails || []) {
      if (typeof email === "string") seenEmails.add(email.trim().toLocaleLowerCase("en-US"));
    }
  }

  const deduped: T[] = [];
  for (const candidate of incoming) {
    if (deduped.length >= limit) break;
    const canonical = canonicalSourceUrl(candidate.url);
    if (!canonical || seenUrls.has(canonical)) continue;
    const emails = (candidate.emails || [])
      .filter((email): email is string => typeof email === "string")
      .map((email) => email.trim().toLocaleLowerCase("en-US"));
    if (emails.some((email) => seenEmails.has(email))) continue;
    const normalized = { ...candidate, url: canonical, emails } as T;
    deduped.push(normalized);
    seenUrls.add(canonical);
    for (const email of emails) seenEmails.add(email);
  }
  return deduped;
}

type SearchReservation = {
  id: string;
  workerId: 1 | 2 | 3;
  query: string;
  queryIndex: number;
  resultSlots: number;
};

type ConfigState = {
  enabled: boolean;
  dailySearchLimit: number;
  dailyResultLimit: number;
};

type CriteriaState = {
  queries: string[];
  criteria: SearchCriteria;
};

type JsonRecord = Record<string, unknown>;

export class SearchWorkersBlockedError extends Error {
  readonly blockers: string[];

  constructor(blockers: string[]) {
    super("Search workers are not ready");
    this.name = "SearchWorkersBlockedError";
    this.blockers = blockers;
  }
}

export class SearchWorkersValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchWorkersValidationError";
  }
}

function isObject(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseJson(value: string | null | undefined): JsonRecord {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return isObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseJsonForUpdate(value: string | null | undefined): JsonRecord | null {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function jsonString(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "{}";
  }
}

function normalizeQuery(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function normalizedQueryKey(value: string): string {
  return value.toLocaleLowerCase("en-US");
}

/**
 * Read-only criteria validation deliberately does not create or infer a query.
 * A tenant's saved discoveryQueries are the only approved search criteria.
 */
export function readApprovedQueries(settings: JsonRecord): string[] {
  if (!Array.isArray(settings.discoveryQueries)) return [];

  const queries: string[] = [];
  const seen = new Set<string>();
  for (const candidate of settings.discoveryQueries.slice(0, MAX_QUERY_COUNT)) {
    const query = normalizeQuery(candidate);
    if (!query || query.length > MAX_QUERY_LENGTH) continue;
    const key = normalizedQueryKey(query);
    if (seen.has(key)) continue;
    seen.add(key);
    queries.push(query);
  }
  return queries;
}

export function validateApprovedQueries(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new SearchWorkersValidationError("queries must be an array of at least 3 non-empty strings");
  }
  if (value.length > MAX_QUERY_COUNT) {
    throw new SearchWorkersValidationError(`queries cannot contain more than ${MAX_QUERY_COUNT} entries`);
  }

  const queries: string[] = [];
  const seen = new Set<string>();
  for (const candidate of value) {
    const query = normalizeQuery(candidate);
    if (!query) {
      throw new SearchWorkersValidationError("queries cannot contain blank entries");
    }
    if (query.length > MAX_QUERY_LENGTH) {
      throw new SearchWorkersValidationError(`each query must be ${MAX_QUERY_LENGTH} characters or fewer`);
    }
    const key = normalizedQueryKey(query);
    if (seen.has(key)) {
      throw new SearchWorkersValidationError("queries must be unique");
    }
    seen.add(key);
    queries.push(query);
  }
  if (queries.length < WORKER_COUNT) {
    throw new SearchWorkersValidationError("at least 3 unique non-empty queries are required for all 3 workers");
  }
  return queries;
}

export function validateDailySearchLimit(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 30) {
    throw new SearchWorkersValidationError("dailySearchLimit must be an integer from 1 through 30");
  }
  return value as number;
}

function integerSetting(value: unknown, fallback: number, min: number, max: number): number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max
    ? value as number
    : fallback;
}

function utcDayStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function lockKey(userId: string, purpose: string): string {
  return `argiflow:outreach-search:${purpose}:${userId}`;
}

function safeProviderError(error: unknown): string {
  if (error instanceof SearchTimeoutError || (error instanceof Error && error.name === "AbortError")) {
    return "Search provider timed out";
  }
  if (error instanceof SearchWorkersBlockedError) {
    return "Search workers are not configured";
  }
  return "Search provider request failed";
}

class SearchTimeoutError extends Error {
  constructor() {
    super("Search provider timed out");
    this.name = "SearchTimeoutError";
  }
}

function isPublicHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 4096) return false;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  if (!parsed.hostname || parsed.username || parsed.password) return false;
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".lan") ||
    hostname.endsWith(".home") ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.includes(":")
  ) {
    return false;
  }

  // Reject private/link-local IPv4 addresses. Public hostnames remain
  // acceptable without doing DNS resolution in the request path.
  const ipv4 = hostname.match(/^\d+\.\d+\.\d+\.\d+$/);
  if (ipv4) {
    const octets = hostname.split(".").map(Number);
    if (
      octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255) ||
      octets[0] === 10 ||
      octets[0] === 127 ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168) ||
      (octets[0] === 169 && octets[1] === 254)
    ) {
      return false;
    }
  }

  return true;
}

export function canonicalSourceUrl(value: string): string | null {
  if (!isPublicHttpUrl(value)) return null;
  const parsed = new URL(value);
  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();
  if ((parsed.protocol === "http:" && parsed.port === "80") || (parsed.protocol === "https:" && parsed.port === "443")) {
    parsed.port = "";
  }

  const trackingParams = new Set([
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "gclid",
    "fbclid",
    "mc_cid",
    "mc_eid",
  ]);
  for (const key of Array.from(parsed.searchParams.keys())) {
    if (trackingParams.has(key.toLowerCase())) parsed.searchParams.delete(key);
  }
  parsed.searchParams.sort();
  if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed.toString();
}

function extractEmails(text: string): string[] {
  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  return Array.from(new Set(matches.map((email) => email.trim().toLocaleLowerCase("en-US"))));
}

function parseProviderResults(response: unknown, assignment: SearchWorkerAssignment, discoveredAt: string): Array<{
  title: string;
  url: string;
  snippet: string;
  emails: string[];
  query: string;
  workerId: 1 | 2 | 3;
  discoveredAt: string;
}> | null {
  const rawResults = isObject(response)
    ? (Array.isArray(response.results) ? response.results : null)
    : Array.isArray(response)
      ? response
      : null;
  if (!rawResults) return null;
  const parsed: Array<{
    title: string;
    url: string;
    snippet: string;
    emails: string[];
    query: string;
    workerId: 1 | 2 | 3;
    discoveredAt: string;
  }> = [];

  for (const raw of rawResults.slice(0, MAX_PROVIDER_RESULTS)) {
    if (!isObject(raw)) continue;
    const url = canonicalSourceUrl(typeof raw.url === "string" ? raw.url : "");
    if (!url) continue;
    const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 500) : "";
    const snippetValue = typeof raw.snippet === "string"
      ? raw.snippet
      : typeof raw.content === "string"
        ? raw.content
        : "";
    const snippet = snippetValue.trim().slice(0, 4000);
    const emails = extractEmails(`${title}\n${snippet}\n${url}`);
    parsed.push({
      title,
      url,
      snippet,
      emails,
      query: assignment.query,
      workerId: assignment.workerId,
      discoveredAt,
    });
  }
  return parsed;
}

function resultPayload(result: {
  title: string;
  url: string;
  snippet: string;
  emails: string[];
  query: string;
  workerId: 1 | 2 | 3;
  discoveredAt: string;
}): JsonRecord {
  return {
    schema: SEARCH_RESULT_SCHEMA,
    version: SCHEMA_VERSION,
    originalQuery: result.query,
    title: result.title,
    url: result.url,
    snippet: result.snippet,
    workerId: result.workerId,
    discoveredAt: result.discoveredAt,
    // Kept internal for tenant-wide duplicate checks; never returned by the
    // status contract.
    emails: result.emails,
  };
}

function publicResult(taskId: string, payload: JsonRecord): SearchWorkerResult | null {
  if (
    payload.schema !== SEARCH_RESULT_SCHEMA ||
    payload.version !== SCHEMA_VERSION ||
    typeof payload.title !== "string" ||
    typeof payload.url !== "string" ||
    typeof payload.snippet !== "string" ||
    typeof payload.originalQuery !== "string" ||
    ![1, 2, 3].includes(payload.workerId as number) ||
    typeof payload.discoveredAt !== "string"
  ) {
    return null;
  }
  const url = canonicalSourceUrl(payload.url);
  if (!url) return null;
  return {
    id: taskId,
    title: payload.title,
    url,
    snippet: payload.snippet,
    query: payload.originalQuery,
    workerId: payload.workerId as 1 | 2 | 3,
    discoveredAt: payload.discoveredAt,
  };
}

class TavilySearchProvider implements SearchProvider {
  async search(
    query: string,
    options: { maxResults: number; criteria: SearchCriteria; signal: AbortSignal },
  ): Promise<TavilySearchResponse> {
    const apiKey = process.env.TAVILY_API_KEY?.trim();
    if (!apiKey) throw new SearchWorkersBlockedError(["Tavily search provider is not configured"]);

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: options.signal,
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "advanced",
        max_results: Math.min(MAX_PROVIDER_RESULTS, Math.max(1, options.maxResults)),
        include_answer: false,
      }),
    });
    if (!response.ok) throw new Error("Tavily request failed");
    return await response.json() as TavilySearchResponse;
  }
}

const defaultProvider = new TavilySearchProvider();

export class OutreachSearchWorkerService {
  private readonly provider: SearchProvider;
  private readonly database: typeof db;
  private readonly now: () => Date;
  private readonly configuredOverride?: boolean | (() => boolean);
  private readonly timeoutMs: number;

  constructor(options: SearchWorkerServiceOptions = {}) {
    this.provider = options.provider || defaultProvider;
    this.database = options.database || db;
    this.now = options.now || (() => new Date());
    this.configuredOverride = options.providerConfigured;
    this.timeoutMs = options.timeoutMs || SEARCH_TIMEOUT_MS;
  }

  providerConfigured(): boolean {
    if (typeof this.configuredOverride === "function") return this.configuredOverride();
    if (typeof this.configuredOverride === "boolean") return this.configuredOverride;
    return Boolean(process.env.TAVILY_API_KEY?.trim());
  }

  private async getOldCriteria(userId: string): Promise<CriteriaState> {
    const [config] = await this.database
      .select({ agentSettings: agentConfigs.agentSettings })
      .from(agentConfigs)
      .where(and(eq(agentConfigs.userId, userId), eq(agentConfigs.agentType, OUTREACH_AGENT_TYPE)));
    const settings = parseJson(config?.agentSettings);
    const queries = readApprovedQueries(settings);
    const criteria: SearchCriteria = {};
    for (const key of ["targetAudience", "businessType", "businessDescription", "valueProposition"] as const) {
      if (typeof settings[key] === "string" && settings[key].trim()) criteria[key] = settings[key].trim().slice(0, 2000);
    }
    if (Array.isArray(settings.competitorKeywords)) {
      criteria.competitorKeywords = settings.competitorKeywords
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim().slice(0, 200))
        .filter(Boolean)
        .slice(0, 100);
    }
    return { queries, criteria };
  }

  private async getConfig(userId: string): Promise<ConfigState> {
    const [config] = await this.database
      .select()
      .from(agentConfigs)
      .where(and(eq(agentConfigs.userId, userId), eq(agentConfigs.agentType, OUTREACH_SEARCH_AGENT_TYPE)));
    const settings = parseJson(config?.agentSettings);
    const [oldConfig] = await this.database
      .select({ agentSettings: agentConfigs.agentSettings })
      .from(agentConfigs)
      .where(and(eq(agentConfigs.userId, userId), eq(agentConfigs.agentType, OUTREACH_AGENT_TYPE)));
    const oldSettings = parseJson(oldConfig?.agentSettings);
    return {
      enabled: config?.enabled === true,
      dailySearchLimit: integerSetting(settings.dailySearchLimit, DEFAULT_DAILY_SEARCH_LIMIT, 1, 30),
      dailyResultLimit: integerSetting(oldSettings.dailyProspectLimit, DEFAULT_DAILY_RESULT_LIMIT, 1, 100_000),
    };
  }

  private async getDailyCounts(userId: string): Promise<{ searches: number; results: number }> {
    const start = utcDayStart(this.now());
    const [searchCount] = await this.database
      .select({ count: sql<number>`count(*)` })
      .from(agentTasks)
      .where(and(
        eq(agentTasks.userId, userId),
        eq(agentTasks.agentType, OUTREACH_SEARCH_AGENT_TYPE),
        eq(agentTasks.taskType, SEARCH_RESERVATION_TASK),
        gte(agentTasks.createdAt, start),
      ));
    const [resultCount] = await this.database
      .select({ count: sql<number>`count(*)` })
      .from(agentTasks)
      .where(and(
        eq(agentTasks.userId, userId),
        eq(agentTasks.agentType, OUTREACH_SEARCH_AGENT_TYPE),
        eq(agentTasks.taskType, SEARCH_RESULT_TASK),
        gte(agentTasks.createdAt, start),
      ));
    return { searches: Number(searchCount?.count || 0), results: Number(resultCount?.count || 0) };
  }

  private async getReservationTasks(userId: string, limit = 300) {
    return this.database
      .select()
      .from(agentTasks)
      .where(and(
        eq(agentTasks.userId, userId),
        eq(agentTasks.agentType, OUTREACH_SEARCH_AGENT_TYPE),
        eq(agentTasks.taskType, SEARCH_RESERVATION_TASK),
      ))
      .orderBy(desc(agentTasks.createdAt))
      .limit(limit);
  }

  private async getResultTasks(userId: string, limit = 500) {
    return this.database
      .select()
      .from(agentTasks)
      .where(and(
        eq(agentTasks.userId, userId),
        eq(agentTasks.agentType, OUTREACH_SEARCH_AGENT_TYPE),
        eq(agentTasks.taskType, SEARCH_RESULT_TASK),
      ))
      .orderBy(desc(agentTasks.createdAt))
      .limit(limit);
  }

  private blockers(
    providerConfigured: boolean,
    criteria: CriteriaState,
    counts: { searches: number; results: number },
    config: ConfigState,
  ): string[] {
    return getSearchWorkerBlockers({
      providerConfigured,
      queryCount: criteria.queries.length,
      searchesUsed: counts.searches,
      dailySearchLimit: config.dailySearchLimit,
      resultsToday: counts.results,
      dailyResultLimit: config.dailyResultLimit,
    });
  }

  async getStatus(userId: string): Promise<SearchWorkerStatusResponse> {
    const [config, criteria, counts, reservations, resultTasks] = await Promise.all([
      this.getConfig(userId),
      this.getOldCriteria(userId),
      this.getDailyCounts(userId),
      this.getReservationTasks(userId),
      this.getResultTasks(userId),
    ]);

    const latestByWorker = new Map<number, typeof reservations[number]>();
    for (const reservation of reservations) {
      const payload = parseJson(reservation.result);
      const workerId = Number(payload.workerId);
      if ([1, 2, 3].includes(workerId) && !latestByWorker.has(workerId)) latestByWorker.set(workerId, reservation);
    }

    const workers = ([1, 2, 3] as const).map((id) => {
      const latest = latestByWorker.get(id);
      const payload = parseJson(latest?.result);
      const hasAssignment = criteria.queries.length >= id;
      let status: SearchWorkerStatus = "idle";
      let lastError: string | null = hasAssignment ? null : "No approved query assigned";
      if (latest?.status === "reserved") status = "running";
      else if (latest?.status === "completed") status = "completed";
      else if (latest?.status === "failed") {
        status = "error";
        lastError = typeof payload.error === "string" ? payload.error : "Search provider request failed";
      } else if (latest?.status === "stopped") {
        status = "idle";
      }
      return {
        id,
        status,
        lastRun: latest?.createdAt ? new Date(latest.createdAt).toISOString() : null,
        lastError,
      };
    });

    const results = resultTasks
      .map((task) => publicResult(task.id, parseJson(task.result)))
      .filter((result): result is SearchWorkerResult => !!result);

    return {
      enabled: config.enabled,
      workerCount: WORKER_COUNT,
      providerConfigured: this.providerConfigured(),
      criteriaReady: criteria.queries.length >= WORKER_COUNT,
      queries: criteria.queries,
      dailySearchLimit: config.dailySearchLimit,
      searchesUsedToday: counts.searches,
      dailyResultLimit: config.dailyResultLimit,
      resultsToday: counts.results,
      workers,
      results,
      blockers: this.blockers(this.providerConfigured(), criteria, counts, config),
    };
  }

  /**
   * PUT /config uses this method so budget and optional criteria are persisted
   * atomically. The old outreach-agent row is updated only when the user
   * explicitly supplies queries, and its enabled/isRunning fields are never
   * touched.
   */
  async updateConfig(userId: string, dailySearchLimit: unknown, queries?: unknown): Promise<void> {
    const limit = validateDailySearchLimit(dailySearchLimit);
    const validatedQueries = queries === undefined ? undefined : validateApprovedQueries(queries);

    await this.database.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey(userId, "config")}))`);

      const [searchConfig] = await tx
        .select()
        .from(agentConfigs)
        .where(and(eq(agentConfigs.userId, userId), eq(agentConfigs.agentType, OUTREACH_SEARCH_AGENT_TYPE)));

      if (validatedQueries) {
        const [oldConfig] = await tx
          .select()
          .from(agentConfigs)
          .where(and(eq(agentConfigs.userId, userId), eq(agentConfigs.agentType, OUTREACH_AGENT_TYPE)));
        if (!oldConfig) throw new SearchWorkersValidationError("The existing outreach agent criteria could not be found");
        const oldSettings = parseJsonForUpdate(oldConfig.agentSettings);
        if (!oldSettings) throw new SearchWorkersValidationError("The existing outreach agent criteria are invalid");
        oldSettings.discoveryQueries = validatedQueries;
        await tx
          .update(agentConfigs)
          .set({ agentSettings: jsonString(oldSettings) })
          .where(eq(agentConfigs.id, oldConfig.id));
      }

      const settings = {
        ...parseJson(searchConfig?.agentSettings),
        schema: SEARCH_CONFIG_SCHEMA,
        version: SCHEMA_VERSION,
        dailySearchLimit: limit,
      };
      if (searchConfig) {
        await tx
          .update(agentConfigs)
          .set({ agentSettings: jsonString(settings) })
          .where(eq(agentConfigs.id, searchConfig.id));
      } else {
        await tx.insert(agentConfigs).values({
          userId,
          agentType: OUTREACH_SEARCH_AGENT_TYPE,
          enabled: false,
          agentSettings: jsonString(settings),
          runFrequency: "daily",
        });
      }
    });
  }

  async start(userId: string): Promise<void> {
    const [criteria, config] = await Promise.all([this.getOldCriteria(userId), this.getConfig(userId)]);
    const counts = await this.getDailyCounts(userId);
    const blockers = this.blockers(this.providerConfigured(), criteria, counts, config)
      .filter((blocker) => !blocker.startsWith("Daily "));
    if (blockers.length > 0) throw new SearchWorkersBlockedError(blockers);

    await this.database.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey(userId, "config")}))`);
      const [existing] = await tx
        .select()
        .from(agentConfigs)
        .where(and(eq(agentConfigs.userId, userId), eq(agentConfigs.agentType, OUTREACH_SEARCH_AGENT_TYPE)));
      if (existing) {
        await tx.update(agentConfigs).set({ enabled: true }).where(eq(agentConfigs.id, existing.id));
      } else {
        await tx.insert(agentConfigs).values({
          userId,
          agentType: OUTREACH_SEARCH_AGENT_TYPE,
          enabled: true,
          agentSettings: jsonString({
            schema: SEARCH_CONFIG_SCHEMA,
            version: SCHEMA_VERSION,
            dailySearchLimit: DEFAULT_DAILY_SEARCH_LIMIT,
          }),
          runFrequency: "daily",
        });
      }
    });
  }

  async stop(userId: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey(userId, "config")}))`);
      const [existing] = await tx
        .select()
        .from(agentConfigs)
        .where(and(eq(agentConfigs.userId, userId), eq(agentConfigs.agentType, OUTREACH_SEARCH_AGENT_TYPE)));
      if (existing) {
        await tx.update(agentConfigs).set({ enabled: false }).where(eq(agentConfigs.id, existing.id));
      } else {
        await tx.insert(agentConfigs).values({
          userId,
          agentType: OUTREACH_SEARCH_AGENT_TYPE,
          enabled: false,
          agentSettings: jsonString({
            schema: SEARCH_CONFIG_SCHEMA,
            version: SCHEMA_VERSION,
            dailySearchLimit: DEFAULT_DAILY_SEARCH_LIMIT,
          }),
          runFrequency: "daily",
        });
      }
    });
  }

  private async acquireCycleLease(userId: string): Promise<string | null> {
    const now = this.now();
    const staleBefore = new Date(now.getTime() - CYCLE_LEASE_TIMEOUT_MS);
    return this.database.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey(userId, "cycle")}))`);
      const [active] = await tx
        .select({ id: agentTasks.id })
        .from(agentTasks)
        .where(and(
          eq(agentTasks.userId, userId),
          eq(agentTasks.agentType, OUTREACH_SEARCH_AGENT_TYPE),
          eq(agentTasks.taskType, SEARCH_CYCLE_LEASE_TASK),
          eq(agentTasks.status, "running"),
          gte(agentTasks.createdAt, staleBefore),
        ))
        .limit(1);
      if (active) return null;
      const [lease] = await tx.insert(agentTasks).values({
        userId,
        agentType: OUTREACH_SEARCH_AGENT_TYPE,
        taskType: SEARCH_CYCLE_LEASE_TASK,
        description: "Search-only worker cycle lease",
        status: "running",
        result: jsonString({
          schema: SEARCH_CYCLE_LEASE_TASK,
          version: SCHEMA_VERSION,
          startedAt: now.toISOString(),
        }),
        startedAt: now,
      }).returning({ id: agentTasks.id });
      return lease?.id || null;
    });
  }

  private async releaseCycleLease(userId: string, leaseId: string, status: "completed" | "failed" = "completed"): Promise<void> {
    await this.database
      .update(agentTasks)
      .set({ status, completedAt: this.now() })
      .where(and(
        eq(agentTasks.id, leaseId),
        eq(agentTasks.userId, userId),
        eq(agentTasks.agentType, OUTREACH_SEARCH_AGENT_TYPE),
        eq(agentTasks.taskType, SEARCH_CYCLE_LEASE_TASK),
      ));
  }

  private async nextQueryIndex(userId: string, queryCount: number): Promise<number> {
    if (queryCount <= 0) return 0;
    const [latest] = await this.database
      .select()
      .from(agentTasks)
      .where(and(
        eq(agentTasks.userId, userId),
        eq(agentTasks.agentType, OUTREACH_SEARCH_AGENT_TYPE),
        eq(agentTasks.taskType, SEARCH_RESERVATION_TASK),
      ))
      .orderBy(desc(agentTasks.createdAt))
      .limit(1);
    const payload = parseJson(latest?.result);
    return Number.isInteger(payload.queryIndex)
      ? (Number(payload.queryIndex) + 1) % queryCount
      : 0;
  }

  /**
   * Request and result budgets are reserved under the same tenant advisory
   * transaction lock. Reservations remain counted even when the provider
   * fails or times out.
   */
  private async reserveRequest(
    userId: string,
    assignment: SearchWorkerAssignment,
    workersRemaining: number,
  ): Promise<SearchReservation | null> {
    const now = this.now();
    const start = utcDayStart(now);
    return this.database.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey(userId, "budget")}))`);

      const [searchConfig] = await tx
        .select()
        .from(agentConfigs)
        .where(and(eq(agentConfigs.userId, userId), eq(agentConfigs.agentType, OUTREACH_SEARCH_AGENT_TYPE)));
      if (!searchConfig) return null;

      const settings = parseJson(searchConfig.agentSettings);
      const searchLimit = integerSetting(settings.dailySearchLimit, DEFAULT_DAILY_SEARCH_LIMIT, 1, 30);
      const [usedSearches] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(agentTasks)
        .where(and(
          eq(agentTasks.userId, userId),
          eq(agentTasks.agentType, OUTREACH_SEARCH_AGENT_TYPE),
          eq(agentTasks.taskType, SEARCH_RESERVATION_TASK),
          gte(agentTasks.createdAt, start),
        ));
      if (!shouldDispatchSearch(
        searchConfig.enabled === true,
        Number(usedSearches?.count || 0),
        searchLimit,
      )) return null;

      const [oldConfig] = await tx
        .select({ agentSettings: agentConfigs.agentSettings })
        .from(agentConfigs)
        .where(and(eq(agentConfigs.userId, userId), eq(agentConfigs.agentType, OUTREACH_AGENT_TYPE)));
      const oldSettings = parseJson(oldConfig?.agentSettings);
      const resultLimit = integerSetting(oldSettings.dailyProspectLimit, DEFAULT_DAILY_RESULT_LIMIT, 1, 100_000);

      const [usedResults] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(agentTasks)
        .where(and(
          eq(agentTasks.userId, userId),
          eq(agentTasks.agentType, OUTREACH_SEARCH_AGENT_TYPE),
          eq(agentTasks.taskType, SEARCH_RESULT_TASK),
          gte(agentTasks.createdAt, start),
        ));

      const reservedRows = await tx
        .select({ result: agentTasks.result, status: agentTasks.status })
        .from(agentTasks)
        .where(and(
          eq(agentTasks.userId, userId),
          eq(agentTasks.agentType, OUTREACH_SEARCH_AGENT_TYPE),
          eq(agentTasks.taskType, SEARCH_RESERVATION_TASK),
          gte(agentTasks.createdAt, start),
          inArray(agentTasks.status, ["reserved"]),
        ));
      const pendingSlots = reservedRows.reduce((sum, row) => sum + Number(parseJson(row.result).resultSlots || 0), 0);
      const availableSlots = Math.max(0, resultLimit - Number(usedResults?.count || 0) - pendingSlots);
      if (availableSlots <= 0) return null;
      // Spread the shared result budget across this cycle's workers instead
      // of letting the first transaction reserve the whole remaining quota.
      const resultSlots = allocateSharedResultSlots(availableSlots, workersRemaining);

      const [created] = await tx.insert(agentTasks).values({
        userId,
        agentType: OUTREACH_SEARCH_AGENT_TYPE,
        taskType: SEARCH_RESERVATION_TASK,
        description: "Reserved one Tavily search request",
        status: "reserved",
        result: jsonString({
          schema: SEARCH_RESERVATION_SCHEMA,
          version: SCHEMA_VERSION,
          workerId: assignment.workerId,
          query: assignment.query,
          queryIndex: assignment.queryIndex,
          resultSlots,
        }),
        startedAt: now,
      }).returning({ id: agentTasks.id });
      if (!created) return null;
      return { ...assignment, id: created.id, resultSlots };
    });
  }

  private async isEnabled(userId: string): Promise<boolean> {
    const [config] = await this.database
      .select({ enabled: agentConfigs.enabled })
      .from(agentConfigs)
      .where(and(eq(agentConfigs.userId, userId), eq(agentConfigs.agentType, OUTREACH_SEARCH_AGENT_TYPE)));
    return config?.enabled === true;
  }

  private async finalizeReservation(
    userId: string,
    reservation: SearchReservation,
    error: string,
    status: "failed" | "stopped",
  ): Promise<void> {
    await this.database.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey(userId, "budget")}))`);
      const payload = parseJson((await tx
        .select({ result: agentTasks.result })
        .from(agentTasks)
        .where(eq(agentTasks.id, reservation.id))
        .limit(1))[0]?.result);
      payload.resultSlots = 0;
      payload.error = error;
      await tx
        .update(agentTasks)
        .set({ status, result: jsonString(payload), completedAt: this.now() })
        .where(and(eq(agentTasks.id, reservation.id), eq(agentTasks.userId, userId)));
    });
  }

  private async markReservationFailed(userId: string, reservation: SearchReservation, error: string): Promise<void> {
    await this.finalizeReservation(userId, reservation, error, "failed");
  }

  private async markReservationStopped(userId: string, reservation: SearchReservation): Promise<void> {
    await this.finalizeReservation(userId, reservation, "Search workers stopped before dispatch", "stopped");
  }

  private async persistProviderResults(
    userId: string,
    reservation: SearchReservation,
    results: NonNullable<ReturnType<typeof parseProviderResults>>,
  ): Promise<void> {
    await this.database.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey(userId, "budget")}))`);
      const [reservationRow] = await tx
        .select({ result: agentTasks.result })
        .from(agentTasks)
        .where(and(eq(agentTasks.id, reservation.id), eq(agentTasks.userId, userId)))
        .limit(1);
      const reservationPayload = parseJson(reservationRow?.result);

      // Stop is durable. A stop that arrives while Tavily is in flight leaves
      // the request consumed but prevents every result from being persisted.
      const [config] = await tx
        .select({ enabled: agentConfigs.enabled })
        .from(agentConfigs)
        .where(and(eq(agentConfigs.userId, userId), eq(agentConfigs.agentType, OUTREACH_SEARCH_AGENT_TYPE)));
      if (config?.enabled !== true) {
        reservationPayload.resultSlots = 0;
        reservationPayload.error = "Search workers stopped before persistence";
        await tx.update(agentTasks).set({
          status: "stopped",
          result: jsonString(reservationPayload),
          completedAt: this.now(),
        }).where(eq(agentTasks.id, reservation.id));
        return;
      }

      const existingRows = await tx
        .select({ result: agentTasks.result })
        .from(agentTasks)
        .where(and(
          eq(agentTasks.userId, userId),
          eq(agentTasks.agentType, OUTREACH_SEARCH_AGENT_TYPE),
          eq(agentTasks.taskType, SEARCH_RESULT_TASK),
        ));
      const existingCandidates: SearchCandidate[] = existingRows.flatMap((row) => {
        const existing = parseJson(row.result);
        if (typeof existing.url !== "string") return [];
        return [{
          url: existing.url,
          emails: Array.isArray(existing.emails)
            ? existing.emails.filter((email): email is string => typeof email === "string")
            : [],
        }];
      });

      let inserted = 0;
      const uniqueResults = dedupeSearchCandidates(
        existingCandidates,
        results,
        reservation.resultSlots,
      );
      for (const result of uniqueResults) {
        const [created] = await tx.insert(agentTasks).values({
          userId,
          agentType: OUTREACH_SEARCH_AGENT_TYPE,
          taskType: SEARCH_RESULT_TASK,
          description: "Unverified web result awaiting review",
          status: "review",
          result: jsonString(resultPayload(result)),
          startedAt: new Date(result.discoveredAt),
          completedAt: new Date(result.discoveredAt),
        }).returning({ id: agentTasks.id });
        if (created) inserted++;
      }
      reservationPayload.resultSlots = inserted;
      reservationPayload.resultCount = inserted;
      await tx.update(agentTasks).set({
        status: "completed",
        result: jsonString(reservationPayload),
        completedAt: this.now(),
      }).where(eq(agentTasks.id, reservation.id));
    });
  }

  private async invokeProvider(assignment: SearchWorkerAssignment, criteria: SearchCriteria, maxResults: number): Promise<unknown> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const providerPromise = this.provider.search(assignment.query, {
      maxResults: Math.min(MAX_PROVIDER_RESULTS, Math.max(1, maxResults)),
      criteria,
      signal: controller.signal,
    });
    try {
      return await new Promise<unknown>((resolve, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new SearchTimeoutError());
        }, this.timeoutMs);
        providerPromise.then(resolve, reject);
      });
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async runReservation(
    userId: string,
    reservation: SearchReservation,
    criteria: SearchCriteria,
  ): Promise<void> {
    // Check immediately before dispatch. A stop intentionally does not abort
    // a provider call already in flight, but this prevents new work.
    if (!(await this.isEnabled(userId))) {
      await this.markReservationStopped(userId, reservation);
      return;
    }
    try {
      const response = await this.invokeProvider(
        reservation,
        criteria,
        reservation.resultSlots,
      );
      const results = parseProviderResults(response, reservation, this.now().toISOString());
      if (!results) throw new Error("Search provider returned an uncertain response");
      await this.persistProviderResults(userId, reservation, results);
    } catch (error) {
      await this.markReservationFailed(userId, reservation, safeProviderError(error));
    }
  }

  async runCycle(userId: string): Promise<{ started: boolean; dispatched: number; skipped?: string }> {
    const [config, criteria] = await Promise.all([this.getConfig(userId), this.getOldCriteria(userId)]);
    if (!config.enabled) return { started: false, dispatched: 0, skipped: "disabled" };
    const counts = await this.getDailyCounts(userId);
    const blockers = this.blockers(this.providerConfigured(), criteria, counts, config);
    if (blockers.length > 0) return { started: false, dispatched: 0, skipped: blockers[0] };

    const leaseId = await this.acquireCycleLease(userId);
    if (!leaseId) return { started: false, dispatched: 0, skipped: "already_running" };

    let dispatched = 0;
    try {
      // The criteria and enabled flag are read again after taking the durable
      // lease so a concurrent config change cannot start stale work.
      const [latestConfig, latestCriteria] = await Promise.all([
        this.getConfig(userId),
        this.getOldCriteria(userId),
      ]);
      if (!latestConfig.enabled) return { started: true, dispatched, skipped: "stopped" };
      const latestBlockers = this.blockers(this.providerConfigured(), latestCriteria, await this.getDailyCounts(userId), latestConfig);
      if (latestBlockers.length > 0) return { started: true, dispatched, skipped: latestBlockers[0] };

      const cursor = await this.nextQueryIndex(userId, latestCriteria.queries.length);
      const assignments = buildRoundRobinAssignments(latestCriteria.queries, cursor);
      // Reservations are serialized under the budget lock; provider calls
      // below remain parallel. Serializing this small preflight lets each
      // worker receive a fair share of a small daily result budget.
      const reservations: SearchReservation[] = [];
      for (let index = 0; index < assignments.length; index++) {
        const reservation = await this.reserveRequest(
          userId,
          assignments[index],
          assignments.length - index,
        );
        if (reservation) reservations.push(reservation);
      }
      dispatched = reservations.length;
      // Explicit allSettled keeps one provider failure from cancelling the
      // other workers. Each rejection is also converted to a safe task error.
      await Promise.allSettled(reservations.map((reservation) => this.runReservation(
        userId,
        reservation,
        latestCriteria.criteria,
      )));
      return { started: true, dispatched };
    } finally {
      await this.releaseCycleLease(userId, leaseId);
    }
  }

  async runEnabledTenants(): Promise<void> {
    const configs = await this.database
      .select({ userId: agentConfigs.userId })
      .from(agentConfigs)
      .where(and(eq(agentConfigs.agentType, OUTREACH_SEARCH_AGENT_TYPE), eq(agentConfigs.enabled, true)));
    await Promise.allSettled(configs.map((config) => this.runCycle(config.userId)));
  }
}

export const outreachSearchWorkers = new OutreachSearchWorkerService();

let schedulerStarted = false;

/**
 * Restart-safe poller. It only runs tenants with the independent search
 * worker config enabled by the explicit start endpoint.
 */
export function startOutreachSearchWorkersScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  const poll = () => {
    void outreachSearchWorkers.runEnabledTenants().catch(() => {
      // Polling must not surface provider or database details to logs.
    });
  };
  poll();
  const interval = setInterval(poll, 15 * 60 * 1000);
  interval.unref?.();
}
