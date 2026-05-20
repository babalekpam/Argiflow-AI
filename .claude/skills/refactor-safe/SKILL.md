---
name: refactor-safe
description: Safely refactor code — extract functions, rename, reorganize — without changing behavior. Use when the user wants to clean up code without breaking anything.
---

# Safe Refactor Skill

Refactor without breaking. Change structure, not behavior.

## Workflow

### 1. Define the Scope

Be precise. Refactoring one of these at a time:
- Extract a function from a large handler
- Rename a variable/function across files
- Split a large file into modules
- Consolidate duplicated logic
- Remove dead code

Never mix refactoring with feature changes in the same commit.

### 2. Capture the Before State

Before touching anything:
```bash
npm run check          # record current type error count (should be 0)
git stash              # if uncommitted changes exist, stash them first
git log --oneline -3   # note the current commit
```

### 3. Make the Refactor

**Extract function:**
```ts
// Before: inline logic in handler
app.get("/api/leads", async (req, res) => {
  const score = Math.min(100, Math.max(0, (opens * 10) + (clicks * 25)));
  ...
});

// After: extracted, testable, named
function computeEngagementScore(opens: number, clicks: number): number {
  return Math.min(100, Math.max(0, (opens * 10) + (clicks * 25)));
}
app.get("/api/leads", async (req, res) => {
  const score = computeEngagementScore(opens, clicks);
  ...
});
```

**Rename across files (safe pattern):**
```bash
# 1. Find all usages first
grep -rn "oldName" server/ client/ shared/ --include="*.ts" --include="*.tsx"
# 2. Update all occurrences — use Edit tool, not sed
# 3. Check: npm run check
```

**Split a large file:**
```ts
// server/routes.ts → server/lead-routes.ts
export function registerLeadRoutes(app: Express) {
  app.get("/api/leads", ...);
  app.post("/api/leads", ...);
  app.patch("/api/leads/:id", ...);
  app.delete("/api/leads/:id", ...);
}
// In routes.ts:
import { registerLeadRoutes } from "./lead-routes";
registerLeadRoutes(app);
```

**Remove dead code:**
```bash
# Find functions that are exported but never imported
grep -rn "export function deadFn" server/ --include="*.ts"
grep -rn "deadFn" server/ client/ shared/ --include="*.ts" --include="*.tsx"
# If only one result (the definition), safe to delete
```

### 4. Verify Nothing Changed

```bash
npm run check          # same error count as before (ideally 0)
```

If tests exist:
```bash
npm test               # all tests still pass
```

Manually test the changed routes/components to confirm behavior is identical.

### 5. Commit with a Clear Message

Refactor commits must be labeled so they're easy to skip in blame/bisect:
```bash
git add <files> && git commit -m "refactor: extract computeEngagementScore from lead handler"
```

Use `refactor:` prefix — never mix with `feat:` or `fix:`.

## Rules of Safe Refactoring

1. **One thing at a time** — one extraction, one rename, one split per commit
2. **No behavior changes** — if you're tempted to "fix" something while refactoring, resist
3. **Check TypeScript first, last** — type errors are the fastest signal that you broke something
4. **Read before edit** — always read the full context of what you're changing
5. **Verify imports** — after moving code, make sure all imports resolve correctly

## Anti-Patterns to Avoid

- Renaming a DB column as part of a "code refactor" (that's a schema migration)
- Extracting a helper and then changing its logic at the same time
- Splitting a file and adding new functionality to the new file in the same commit
- Changing `async/await` to `.then()` chains (or vice versa) without a reason
