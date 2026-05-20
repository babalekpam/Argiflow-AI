---
name: gen-tests
description: Generate meaningful tests for a route, function, or component in this codebase. Use when the user wants to add test coverage to existing or new code.
---

# Generate Tests Skill

Write tests that actually catch bugs, not just tests that pass.

## Workflow

### 1. Identify What to Test

Ask or infer:
- A specific route/handler, utility function, or React component?
- What are the critical paths? What inputs would break it?
- Is there existing test infrastructure? (check `package.json` for vitest/jest)

Check for existing tests:
```bash
find . -name "*.test.ts" -o -name "*.spec.ts" -o -name "*.test.tsx" | head -20
```

### 2. Assess the Stack

This project uses:
- **Backend**: Express + Drizzle + PostgreSQL
- **Frontend**: React + React Query + Wouter
- **Language**: TypeScript

If no test setup exists yet, propose adding vitest (matches Vite already in use):
```bash
npm install -D vitest @vitest/ui
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

### 3. Identify Test Cases

For every function or route, enumerate:
1. **Happy path** — valid input, expected output
2. **Auth guard** — unauthenticated request returns 401
3. **Validation** — malformed input returns 400
4. **Edge cases** — empty arrays, null fields, boundary values
5. **Error path** — DB failure returns 500

### 4. Write the Tests

**Route handler test (no running server needed):**
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB module
vi.mock("../db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "1", name: "test" }]),
      }),
    }),
  },
}));

describe("POST /api/leads", () => {
  it("returns 401 when not authenticated", async () => {
    const req = { user: undefined, body: {} } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    await handleCreateLead(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 400 for invalid body", async () => {
    const req = { user: { id: "u1" }, body: { email: "not-an-email" } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    await handleCreateLead(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("creates lead and returns it", async () => {
    const req = {
      user: { id: "u1" },
      body: { name: "Alice", email: "alice@example.com", source: "manual" },
    } as any;
    const res = { json: vi.fn() } as any;
    await handleCreateLead(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: "1" }));
  });
});
```

**Utility function test:**
```ts
import { describe, it, expect } from "vitest";
import { normalizePhoneNumber } from "../routes";

describe("normalizePhoneNumber", () => {
  it("formats 10-digit US number", () => {
    expect(normalizePhoneNumber("5551234567")).toBe("+1 (555) 123-4567");
  });
  it("handles null", () => {
    expect(normalizePhoneNumber(null)).toBe("");
  });
  it("strips non-digits", () => {
    expect(normalizePhoneNumber("(555) 123-4567")).toBe("+1 (555) 123-4567");
  });
});
```

**Zod schema test:**
```ts
import { describe, it, expect } from "vitest";
import { insertLeadSchema } from "@shared/schema";

describe("insertLeadSchema", () => {
  it("accepts valid lead", () => {
    const result = insertLeadSchema.safeParse({
      name: "Bob", email: "bob@example.com", source: "web",
    });
    expect(result.success).toBe(true);
  });
  it("rejects missing required fields", () => {
    const result = insertLeadSchema.safeParse({ name: "Bob" });
    expect(result.success).toBe(false);
  });
});
```

### 5. Extract Handler for Testability

If the route handler is anonymous, extract it:
```ts
// Before (hard to test):
app.post("/api/leads", async (req, res) => { ... });

// After (testable):
export async function handleCreateLead(req: Request, res: Response) { ... }
app.post("/api/leads", handleCreateLead);
```

### 6. Run and Verify

```bash
npm test
```

All tests must pass. Fix failures before committing.

### 7. Commit

```bash
git add <test-files> && git commit -m "test: add coverage for <what>"
```

## What Makes a Good Test

- Tests the CONTRACT (inputs → outputs), not the implementation
- Fails when the code breaks, passes when it works
- Fast — mock external dependencies (DB, HTTP, AI APIs)
- Readable — anyone can understand what scenario is being tested
