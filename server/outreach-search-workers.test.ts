import test from "node:test";
import assert from "node:assert/strict";
import {
  allocateSharedResultSlots,
  buildRoundRobinAssignments,
  canReserveSearchRequest,
  canonicalSourceUrl,
  dedupeSearchCandidates,
  getSearchWorkerBlockers,
  shouldDispatchSearch,
  validateApprovedQueries,
  validateDailySearchLimit,
} from "./outreach-search-workers";

test("round-robin planning gives each of three workers one approved query", () => {
  assert.deepEqual(
    buildRoundRobinAssignments(["q1", "q2", "q3", "q4"], 1),
    [
      { workerId: 1, query: "q2", queryIndex: 1 },
      { workerId: 2, query: "q3", queryIndex: 2 },
      { workerId: 3, query: "q4", queryIndex: 3 },
    ],
  );
  assert.deepEqual(
    buildRoundRobinAssignments(["q1", "q2"], 0).map(({ workerId, query }) => ({ workerId, query })),
    [
      { workerId: 1, query: "q1" },
      { workerId: 2, query: "q2" },
    ],
  );
});

test("shared result reservations are fair and never become a three-times multiplier", () => {
  const first = allocateSharedResultSlots(10, 3);
  const second = allocateSharedResultSlots(10 - first, 2);
  const third = allocateSharedResultSlots(10 - first - second, 1);

  assert.deepEqual([first, second, third], [4, 3, 3]);
  assert.equal(first + second + third, 10);
  assert.ok([first, second, third].every((slots) => slots <= 10));
  assert.equal(allocateSharedResultSlots(0, 3), 0);
  assert.equal(allocateSharedResultSlots(100, 3), 10);
});

test("request budget and durable stop gate dispatch independently", () => {
  assert.equal(canReserveSearchRequest(2, 3), true);
  assert.equal(canReserveSearchRequest(3, 3), false);
  assert.equal(shouldDispatchSearch(true, 2, 3), true);
  assert.equal(shouldDispatchSearch(false, 0, 3), false);
  assert.equal(shouldDispatchSearch(true, 3, 3), false);
});

test("canonical URL and exact normalized email dedupe reject unsafe and duplicate results", () => {
  assert.equal(
    canonicalSourceUrl("HTTPS://Example.com/source/?utm_source=tavily#fragment"),
    "https://example.com/source",
  );
  assert.equal(canonicalSourceUrl("javascript:alert(1)"), null);
  assert.equal(canonicalSourceUrl("http://127.0.0.1/private"), null);

  const accepted = dedupeSearchCandidates(
    [{ url: "https://example.com/existing", emails: ["Person@Example.com"] }],
    [
      { url: "https://example.com/existing/?utm_medium=email", emails: [] },
      { url: "https://example.com/other", emails: ["person@example.com"] },
      { url: "javascript:alert(1)", emails: [] },
      { url: "https://example.com/new", emails: ["new@example.com"] },
    ],
  );

  assert.deepEqual(accepted.map((result) => result.url), ["https://example.com/new"]);
  assert.deepEqual(accepted[0]?.emails, ["new@example.com"]);
});

test("strict criteria, budget, and provider blockers fail closed", () => {
  assert.throws(
    () => validateApprovedQueries(["one", "two"]),
    /at least 3/i,
  );
  assert.throws(
    () => validateApprovedQueries(["one", "two", "ONE"]),
    /unique/i,
  );
  assert.throws(
    () => validateApprovedQueries(["one", " ", "three"]),
    /blank/i,
  );
  assert.deepEqual(
    validateApprovedQueries([" one ", "two", "three"]),
    ["one", "two", "three"],
  );
  assert.throws(() => validateDailySearchLimit(0), /1 through 30/i);
  assert.throws(() => validateDailySearchLimit(31), /1 through 30/i);
  assert.equal(validateDailySearchLimit(3), 3);

  assert.deepEqual(
    getSearchWorkerBlockers({
      providerConfigured: false,
      queryCount: 2,
      searchesUsed: 0,
      dailySearchLimit: 3,
      resultsToday: 0,
      dailyResultLimit: 100,
    }),
    [
      "Tavily search provider is not configured",
      "At least 3 unique non-empty discovery queries are required for all 3 workers",
    ],
  );
  assert.deepEqual(
    getSearchWorkerBlockers({
      providerConfigured: true,
      queryCount: 3,
      searchesUsed: 3,
      dailySearchLimit: 3,
      resultsToday: 100,
      dailyResultLimit: 100,
    }),
    ["Daily search request limit reached", "Daily result limit reached"],
  );
});
