---
name: api-audit
description: Audit API routes for security issues — missing auth, injection risks, data leaks, improper error handling. Use when the user wants a security review of backend routes.
---

# API Security Audit Skill

Find and fix real security issues in Express routes. No theoretical risks — only issues that can be exploited.

## Workflow

### 1. Scope the Audit

Determine which routes to audit:
```bash
# List all route definitions
grep -n "app\.\(get\|post\|patch\|put\|delete\)" server/routes.ts | head -60
grep -rn "app\.\(get\|post\|patch\|put\|delete\)" server/ --include="*.ts" | grep -v "node_modules"
```

### 2. Check Authentication

Every non-public route must check `req.user`:
```bash
# Find routes missing auth check
grep -A 5 "app\.\(post\|patch\|delete\|put\)" server/routes.ts | grep -v "req\.user"
```

Flag any route that:
- Reads or writes user-specific data without checking `req.user?.id`
- Checks `req.user` but doesn't scope DB queries to `req.user.id`

Fix pattern:
```ts
if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
// All DB queries must include: where(eq(table.userId, req.user.id))
```

### 3. Check Input Validation

Every POST/PATCH must validate with Zod before touching the DB:
```bash
grep -A 10 "app\.post" server/routes.ts | grep -v "safeParse\|parse("
```

Flag:
- Routes that use `req.body.field` directly without validation
- Routes using `JSON.parse(req.body)` without error handling
- Routes that pass `req.body` objects directly into SQL strings

Fix pattern:
```ts
const parsed = insertXxxSchema.safeParse(req.body);
if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
// Use parsed.data, never req.body directly
```

### 4. Check for Data Leaks

Routes that return data must scope to the current user:
```bash
# Find .select() without userId filter
grep -A 5 "db\.select" server/routes.ts | grep -v "userId\|user_id"
```

Flag any route that:
- Returns all rows from a table without filtering by `userId`
- Returns sensitive fields (password hashes, API keys, tokens) in JSON responses
- Returns DB error messages directly to the client

Fix pattern — never return DB errors raw:
```ts
} catch (err) {
  console.error("Error in POST /api/xxx:", err);  // log full error server-side
  res.status(500).json({ message: "Internal server error" });  // generic to client
}
```

### 5. Check for Injection Risks

This project uses Drizzle ORM which parameterizes queries — but watch for:
```bash
# Look for raw SQL with string interpolation
grep -rn "sql\`" server/ --include="*.ts"
grep -rn "\.execute(" server/ --include="*.ts"
```

Flag any `sql\`\`` template literal that interpolates untrusted user input directly.

### 6. Check Rate Limiting & Expensive Routes

Find routes that call external APIs (OpenAI, Anthropic, email, scraping):
```bash
grep -rn "anthropic\.\|openai\.\|sgMail\.\|axios\.get" server/routes.ts | head -20
```

These should either:
- Require authentication (already checked in step 2)
- Have a usage quota check before calling the expensive API

Flag routes with no quota enforcement.

### 7. Check File Upload / SSRF

If any route accepts URLs from users and fetches them server-side:
```bash
grep -rn "axios\.get(req\.\|fetch(req\." server/ --include="*.ts"
```

Flag any server-side fetch where the URL comes from `req.body` / `req.query` without validation.

### 8. Report Findings

Format each finding:
```
[SEVERITY] Description
File: server/routes.ts:142
Issue: Route GET /api/leads returns all leads without scoping to req.user.id
Fix: Add .where(eq(leads.userId, req.user.id)) to the Drizzle query
```

Severity levels:
- **CRITICAL** — auth bypass, SQL injection, data leak to other users
- **HIGH** — missing validation that enables crashes or unexpected behavior
- **MEDIUM** — information disclosure, verbose error messages
- **LOW** — missing rate limiting on non-critical routes

### 9. Fix and Verify

Fix CRITICAL and HIGH issues. For each fix:
```bash
npm run check   # no new type errors
```

Commit with:
```bash
git add <files> && git commit -m "security: fix auth bypass on /api/leads GET"
```

## Quick Checklist

- [ ] All mutating routes (POST/PATCH/DELETE) check `req.user?.id`
- [ ] All routes returning user data scope to `req.user.id`
- [ ] All request bodies validated with Zod before DB access
- [ ] No raw DB error messages returned to clients
- [ ] No string-interpolated SQL with user input
- [ ] Expensive API calls require auth
