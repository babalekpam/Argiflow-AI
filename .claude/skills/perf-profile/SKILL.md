---
name: perf-profile
description: Find and fix performance bottlenecks — slow API routes, N+1 queries, missing DB indexes, React re-renders. Use when the app feels slow or a specific operation is taking too long.
---

# Performance Profile Skill

Find where time is actually being spent, then fix it. Don't optimize what isn't slow.

## Workflow

### 1. Identify the Bottleneck

First, locate the slow thing:
- Specific API endpoint? (check response time in browser DevTools Network tab)
- Page load? (check React DevTools Profiler)
- Background job? (check server logs for duration)

Get a baseline measurement before touching anything.

### 2. Backend — Find Slow Routes

Add timing logs to suspect routes:
```ts
app.get("/api/slow-endpoint", async (req, res) => {
  const t0 = Date.now();
  
  const result = await db.select().from(leads).where(eq(leads.userId, req.user!.id));
  console.log(`[PERF] select leads: ${Date.now() - t0}ms`);
  
  const enriched = await Promise.all(result.map(enrichLead));
  console.log(`[PERF] enrich: ${Date.now() - t0}ms`);
  
  res.json(enriched);
});
```

### 3. Find N+1 Queries

The most common backend performance killer: fetching a list, then querying DB once per item.

```ts
// N+1 problem (1 query for leads + N queries for each lead's appointments)
const leads = await db.select().from(leads);
const enriched = await Promise.all(
  leads.map(async (lead) => ({
    ...lead,
    appointments: await db.select().from(appointments)
      .where(eq(appointments.leadId, lead.id)),  // ← N queries!
  }))
);

// Fix: JOIN or batch query
import { inArray } from "drizzle-orm";
const leadIds = leads.map(l => l.id);
const allAppointments = await db.select().from(appointments)
  .where(inArray(appointments.leadId, leadIds));  // 1 query

const apptByLeadId = Object.groupBy(allAppointments, a => a.leadId);
const enriched = leads.map(lead => ({
  ...lead,
  appointments: apptByLeadId[lead.id] ?? [],
}));
```

### 4. Check Missing Indexes

Look at queries with `WHERE`, `ORDER BY`, or `JOIN` on non-primary-key columns:
```bash
# Find common WHERE clauses in routes
grep -n "\.where(eq" server/routes.ts | head -30
```

Add indexes to frequently filtered columns:
```ts
// In pgTable() definition, add third argument:
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  status: text("status"),
  createdAt: timestamp("created_at"),
}, (table) => ({
  userIdIdx: index("leads_user_id_idx").on(table.userId),
  statusIdx: index("leads_status_idx").on(table.status),
  userIdStatusIdx: index("leads_user_id_status_idx").on(table.userId, table.status),
}));
```

Then push:
```bash
npm run db:push
```

### 5. Fix Expensive Operations

**Parallel independent async ops:**
```ts
// Before: serial (slow)
const leads = await getLeads(userId);
const stats = await getStats(userId);
const agents = await getAgents(userId);

// After: parallel (fast)
const [leads, stats, agents] = await Promise.all([
  getLeads(userId),
  getStats(userId),
  getAgents(userId),
]);
```

**Cache expensive results:**
```ts
import NodeCache from "node-cache";
const cache = new NodeCache({ stdTTL: 60 }); // 60 second TTL

app.get("/api/stats", async (req, res) => {
  const cacheKey = `stats:${req.user!.id}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  
  const stats = await computeExpensiveStats(req.user!.id);
  cache.set(cacheKey, stats);
  res.json(stats);
});
```

**Limit result sets:**
```ts
// Never return unbounded queries
const leads = await db.select().from(leads)
  .where(eq(leads.userId, req.user!.id))
  .limit(100)                              // always limit
  .orderBy(desc(leads.createdAt));
```

### 6. Frontend — React Re-renders

**Find unnecessary re-renders:**
- Install React DevTools browser extension
- Enable "Highlight updates when components render"
- Navigate to the slow page and interact

**Fix: memoize expensive computations**
```ts
const sortedLeads = useMemo(
  () => leads.sort((a, b) => b.score - a.score),
  [leads]
);
```

**Fix: stable references for callbacks**
```ts
const handleDelete = useCallback((id: string) => {
  deleteLead.mutate(id);
}, [deleteLead]);
```

**Fix: virtualize long lists (> 100 items)**
```ts
// If rendering 500+ rows, use windowing
// Install: npm install @tanstack/react-virtual
import { useVirtualizer } from "@tanstack/react-virtual";
```

### 7. Measure After

Rerun the same test that was slow. Compare:
- Before: Xms
- After: Yms

If improvement < 20%, the bottleneck is elsewhere. Profile again.

### 8. Commit

```bash
git add <files> && git commit -m "perf: batch appointment queries to eliminate N+1 in /api/leads"
```

## Quick Wins Checklist

- [ ] All common WHERE clauses have DB indexes
- [ ] Independent async calls use `Promise.all`
- [ ] No N+1 queries (fetching inside a `.map()` over DB results)
- [ ] API responses are paginated / have `.limit()`
- [ ] Expensive repeated computations are cached
- [ ] React lists over 100 items use virtualization
