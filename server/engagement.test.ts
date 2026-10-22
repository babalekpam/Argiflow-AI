/**
 * engagement.test.ts — unit tests for the pure scoring / bot
 * classification module. No test framework is configured in this
 * repo; run directly with tsx:
 *
 *   npx tsx server/engagement.test.ts
 *
 * Exits non-zero on the first failed assertion.
 *
 * The calculateEngagement checks encode the WORKSPACE scoring
 * policy (opens are not intent — privacy preload; clicks score
 * 10 / 20; level tops out at "interested"). The clamp and bot
 * classification checks are unchanged from the original fix.
 */
import assert from "node:assert";
import {
  clampScore,
  calculateEngagement,
  classifyByUaIp,
  classifyEngagementEvent,
  findBurstEventIds,
} from "./engagement";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`ok - ${name}`);
}

// ── clampScore ────────────────────────────────────────────────────
check("clampScore clamps above 100 (the 105/120 bug)", () => {
  assert.equal(clampScore(105), 100);
  assert.equal(clampScore(120), 100);
  assert.equal(clampScore(100), 100);
});
check("clampScore clamps below 0 and handles junk", () => {
  assert.equal(clampScore(-5), 0);
  assert.equal(clampScore(NaN), 0);
  assert.equal(clampScore("abc"), 0);
  assert.equal(clampScore(undefined), 0);
  assert.equal(clampScore(null), 0);
});
check("clampScore rounds and passes valid values", () => {
  assert.equal(clampScore(0), 0);
  assert.equal(clampScore(42), 42);
  assert.equal(clampScore(42.6), 43);
  assert.equal(clampScore("85"), 85);
});

// ── calculateEngagement (workspace policy) ────────────────────────
check("engagement score caps at 20 and never exceeds 100", () => {
  const r = calculateEngagement(50, 50);
  assert.equal(r.score, 20);
  assert.equal(r.level, "interested");
});
check("engagement tiers: opens alone never score (privacy preload)", () => {
  assert.equal(calculateEngagement(0, 0).score, 0);
  assert.equal(calculateEngagement(1, 0).score, 0);
  assert.equal(calculateEngagement(3, 0).score, 0);
  assert.equal(calculateEngagement(9, 0).score, 0);
  assert.equal(calculateEngagement(1, 0).level, "none");
});
check("engagement tiers: clicks only", () => {
  assert.equal(calculateEngagement(0, 1).score, 10);
  assert.equal(calculateEngagement(0, 2).score, 20);
  assert.equal(calculateEngagement(0, 9).score, 20); // tiers cap
});
check("engagement levels follow thresholds", () => {
  assert.equal(calculateEngagement(0, 1).level, "interested"); // 10
  assert.equal(calculateEngagement(0, 2).level, "interested"); // 20
  assert.equal(calculateEngagement(1, 0).level, "none");
  assert.equal(calculateEngagement(0, 0).level, "none");
});
check("engagement score is monotonic and never exceeds 100", () => {
  for (let o = 0; o <= 20; o++) {
    let prev = -1;
    for (let c = 0; c <= 20; c++) {
      const s = calculateEngagement(o, c).score;
      assert.ok(s >= 0 && s <= 100, `score ${s} out of range for ${o}/${c}`);
      assert.ok(s >= prev, `non-monotonic at ${o}/${c}`);
      prev = s;
    }
  }
});

// ── classifyByUaIp ────────────────────────────────────────────────
const HUMAN_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
check("human UA + residential IP is not a bot", () => {
  assert.equal(classifyByUaIp(HUMAN_UA, "98.207.14.55").isBot, false);
});
check("security scanner UAs are bots", () => {
  for (const ua of [
    "Mozilla/5.0 (compatible; Proofpoint URL Defense)",
    "BarracudaCentralScanner/2.1",
    "Mimecast Link Checker",
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  ]) {
    const r = classifyByUaIp(ua, "98.207.14.55");
    assert.equal(r.isBot, true, ua);
    assert.equal(r.reason, "bot-user-agent");
  }
});
check("Gmail image proxy UA is a bot", () => {
  const r = classifyByUaIp("Mozilla/5.0 (compatible; GoogleImageProxy)", "98.207.14.55");
  assert.equal(r.isBot, true);
});
check("Google egress IPs are bots", () => {
  assert.equal(classifyByUaIp(HUMAN_UA, "66.249.83.10").isBot, true);
  assert.equal(classifyByUaIp(HUMAN_UA, "66.249.83.10").reason, "bot-ip");
});
check("empty/short UA is a bot", () => {
  assert.equal(classifyByUaIp("", "1.2.3.4").isBot, true);
  assert.equal(classifyByUaIp("ok", "1.2.3.4").isBot, true);
});

// ── classifyEngagementEvent timing ────────────────────────────────
check("click 1s after send is inhuman-speed", () => {
  const r = classifyEngagementEvent({ userAgent: HUMAN_UA, ipAddress: "98.207.14.55", eventType: "click", msSinceSend: 1000 });
  assert.equal(r.isBot, true);
  assert.equal(r.reason, "inhuman-speed");
});
check("open 2s after send is a prefetch", () => {
  const r = classifyEngagementEvent({ userAgent: HUMAN_UA, ipAddress: "98.207.14.55", eventType: "open", msSinceSend: 2000 });
  assert.equal(r.isBot, true);
  assert.equal(r.reason, "prefetch-open");
});
check("human-paced events pass", () => {
  assert.equal(classifyEngagementEvent({ userAgent: HUMAN_UA, ipAddress: "98.207.14.55", eventType: "click", msSinceSend: 3600_000 }).isBot, false);
  assert.equal(classifyEngagementEvent({ userAgent: HUMAN_UA, ipAddress: "98.207.14.55", eventType: "open", msSinceSend: null }).isBot, false);
});

// ── findBurstEventIds ─────────────────────────────────────────────
const t0 = new Date("2026-10-22T12:00:00Z").getTime();
const ev = (id: string, secs: number, url: string, messageId: string | null = "m1") => ({
  id,
  eventType: "click",
  messageId,
  linkUrl: url,
  createdAt: new Date(t0 + secs * 1000),
});
check("scanner burst: all links within seconds are flagged", () => {
  const ids = findBurstEventIds([
    ev("a", 1, "https://x.com/1"),
    ev("b", 3, "https://x.com/2"),
    ev("c", 6, "https://x.com/3"),
    ev("d", 9, "https://x.com/4"),
  ]);
  assert.equal(ids.size, 4);
});
check("human clicks spread over minutes are not flagged", () => {
  const ids = findBurstEventIds([
    ev("a", 60, "https://x.com/1"),
    ev("b", 600, "https://x.com/2"),
    ev("c", 3600, "https://x.com/3"),
  ]);
  assert.equal(ids.size, 0);
});
check("repeated clicks of one link are not a burst", () => {
  const ids = findBurstEventIds([
    ev("a", 1, "https://x.com/same"),
    ev("b", 2, "https://x.com/same"),
    ev("c", 3, "https://x.com/same"),
  ]);
  assert.equal(ids.size, 0);
});
check("bursts in different messages are evaluated separately", () => {
  const ids = findBurstEventIds([
    ev("a", 1, "https://x.com/1", "m1"),
    ev("b", 2, "https://x.com/2", "m2"),
    ev("c", 3, "https://x.com/3", "m1"),
  ]);
  assert.equal(ids.size, 0);
});
check("opens never count toward a burst", () => {
  const ids = findBurstEventIds([
    { id: "a", eventType: "open", messageId: "m1", linkUrl: null, createdAt: new Date(t0) },
    { id: "b", eventType: "open", messageId: "m1", linkUrl: null, createdAt: new Date(t0 + 1000) },
    { id: "c", eventType: "open", messageId: "m1", linkUrl: null, createdAt: new Date(t0 + 2000) },
  ]);
  assert.equal(ids.size, 0);
});

console.log(`\n${passed} tests passed`);
