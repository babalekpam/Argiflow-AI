---
name: add-route
description: Add a new Express API route following the Argiflow pattern — schema validation, Drizzle DB query, error handling, and route registration. Use when the user wants to add a new backend endpoint.
---

# Add Express Route Skill

Add a fully wired Express route that follows the existing project patterns.

## Workflow

Make a todo list for all tasks in this workflow and complete them in order.

### 1. Understand the Request

Ask (or infer from context):
- Route path and HTTP method (GET / POST / PATCH / DELETE)
- What data it reads or writes
- Auth required? (most routes check `req.user`)
- Which module does this belong to? (e.g., leads, sequences, analytics)

### 2. Locate the Right Route File

Check `server/routes.ts` for route registrations. If a dedicated module file exists (e.g., `server/linkedin-routes.ts`), add there. Otherwise add directly in `routes.ts`.

Look for the pattern:
```ts
export function registerXxxRoutes(app: Express) { ... }
```

### 3. Define the Zod Schema (if new data shape)

Add to `shared/schema.ts` or the relevant `shared/*-schema.ts`:
```ts
export const insertXxxSchema = createInsertSchema(xxxTable).omit({ id: true, createdAt: true });
export type InsertXxx = z.infer<typeof insertXxxSchema>;
```

### 4. Write the Route

Follow this exact pattern:
```ts
app.post("/api/xxx", async (req: Request, res: Response) => {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

  const parsed = insertXxxSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

  try {
    const [result] = await db
      .insert(xxxTable)
      .values({ ...parsed.data, userId: req.user.id })
      .returning();
    res.json(result);
  } catch (err) {
    console.error("Error creating xxx:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});
```

Key rules:
- Always check `req.user?.id` for auth-protected routes
- Use `safeParse` not `parse` so you can return a 400 cleanly
- Wrap DB calls in try/catch — never let Drizzle errors bubble unhandled
- Use `.returning()` after insert/update so the client gets the saved row
- Prefer `eq(table.userId, req.user.id)` in WHERE to scope to current user

### 5. Register the Route File

If you created a new module file, register it in `server/routes.ts`:
```ts
import { registerXxxRoutes } from "./xxx-routes";
// inside registerRoutes():
registerXxxRoutes(app);
```

### 6. Type-Check

```bash
npm run check
```

Fix any TypeScript errors before proceeding.

### 7. Manual Smoke Test

If the dev server is running, test with curl or the existing client:
```bash
curl -s -X POST http://localhost:5000/api/xxx \
  -H "Content-Type: application/json" \
  -d '{"field":"value"}' | jq .
```

### 8. Commit

```bash
git add -A && git commit -m "feat: add /api/xxx endpoint"
```

## Common Pitfalls

- Forgetting `async` on the handler → unhandled promise rejections
- Missing `return` before `res.status(401)` → headers sent twice error
- Using `db.insert().values()` without `.returning()` → client gets undefined
- Not scoping queries to `userId` → data leaks between users
