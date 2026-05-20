---
name: debug-ts
description: Systematic TypeScript/Node.js debugging workflow — isolate the error, trace the call stack, identify root cause, fix and verify. Use when the user has a bug, runtime error, or unexpected behavior.
---

# Debug TypeScript Skill

Diagnose and fix bugs methodically. Don't guess — trace.

## Workflow

Make a todo list and work through it.

### 1. Capture the Full Error

Get the complete error output, not just the message:
- Stack trace (which file, which line)
- The triggering HTTP request (method, path, body) if a server error
- What was expected vs. what happened

If the error is intermittent, add a log right before the suspected line:
```ts
console.log("[DEBUG]", { variable, context });
```

### 2. Locate the Error Origin

Read the stack trace bottom-up — the top is where it crashed, but the cause is usually further down.

```bash
# Search for the failing function/route
grep -r "functionName\|routePath" server/ --include="*.ts" -n
```

Read the file at the exact line numbers from the stack trace. Don't assume — read.

### 3. Reproduce Locally

If it's an API error, reproduce with curl:
```bash
curl -s -X POST http://localhost:5000/api/path \
  -H "Content-Type: application/json" \
  -d '{"key":"value"}' | jq .
```

If it's a DB error, run the raw Drizzle query with a console.log to see what's being sent.

### 4. Common Error Patterns

**"Cannot read properties of undefined (reading 'x')"**
→ The object is null/undefined. Add a guard: `if (!obj) return ...`
→ Check Drizzle query — `.returning()` returns an array, destructure: `const [row] = await db...`

**TypeScript "Type X is not assignable to type Y"**
→ Run `npm run check` to get all type errors at once
→ The inferred type from Drizzle schema is the source of truth — align to it

**"headers already sent"**
→ Missing `return` before a `res.json()` call: `return res.status(401).json({...})`

**Drizzle "column does not exist"**
→ Schema was changed but `npm run db:push` was not run
→ Run: `npm run db:push`

**"ECONNREFUSED" / DB connection errors**
→ `DATABASE_URL` env var is not set or wrong
→ Check: `echo $DATABASE_URL`

**Infinite re-render (React)**
→ A `useEffect` dependency array includes an object/function created inline
→ Memoize with `useMemo`/`useCallback` or move outside the component

**React Query stale data**
→ Invalidate after mutation: `queryClient.invalidateQueries({ queryKey: ['/api/xxx'] })`

### 5. Fix It

Make the minimal change that fixes the root cause. Don't refactor surrounding code as part of a bug fix.

### 6. Verify

```bash
npm run check          # no type errors
# restart dev server and retest the exact scenario that failed
```

If there was a test that should have caught this, note it for the user.

### 7. Commit

```bash
git add <files> && git commit -m "fix: <what was broken and how>"
```

## Investigation Cheatsheet

```bash
# Find all usages of a function/variable
grep -rn "functionName" server/ client/ --include="*.ts" --include="*.tsx"

# See recent changes to a file
git log --oneline -10 -- server/routes.ts

# Check what changed between working and broken
git diff HEAD~1 -- server/routes.ts

# Show only TypeScript errors
npm run check 2>&1 | grep "error TS"

# Check if a DB table exists
psql $DATABASE_URL -c "\d table_name"
```
