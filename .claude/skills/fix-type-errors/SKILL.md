---
name: fix-type-errors
description: Systematically find and fix all TypeScript errors in the project. Use when `npm run check` has errors or the user wants the codebase to be fully type-safe.
---

# Fix TypeScript Errors Skill

Get to zero type errors. Work through them systematically, not randomly.

## Workflow

### 1. Get the Full Error List

```bash
npm run check 2>&1 | tee /tmp/ts-errors.txt
wc -l /tmp/ts-errors.txt   # how many lines = scope
```

Categorize errors by type to tackle groups efficiently:
```bash
npm run check 2>&1 | grep "error TS" | sed 's/.*error TS/TS/' | sort | uniq -c | sort -rn
```

### 2. Fix by Category (Most Common First)

**TS2339 — Property does not exist on type**
```ts
// Problem: accessing a field TypeScript doesn't know about
const x = obj.unknownField;  // TS2339

// Fix A: The field exists at runtime → add it to the type/schema
// Fix B: Optional access → obj?.unknownField
// Fix C: Type assertion only if you're certain → (obj as ExtendedType).field
```

**TS2345 — Argument of type X not assignable to parameter of type Y**
```ts
// Usually means you're passing string where number expected, or a nullable where non-null expected
// Fix: add runtime guard
if (typeof val === "string") { fn(val); }
// Or fix the function signature to accept the actual type
```

**TS7006 — Parameter 'x' implicitly has an 'any' type**
```ts
// Fix: add explicit type annotation
async function handler(req: Request, res: Response) { ... }
// For event callbacks:
arr.map((item: Lead) => item.id)
```

**TS2532 — Object is possibly undefined**
```ts
// Fix A: optional chaining
const id = user?.id;
// Fix B: non-null assertion (only if you know it's not null)
const id = user!.id;
// Fix C: explicit guard
if (!user) return res.status(401).json({ message: "Unauthorized" });
```

**TS2304 — Cannot find name 'X'**
```ts
// Missing import — check the source file
import { X } from "./module";
// Or it was renamed
grep -rn "export.*X" server/ shared/ --include="*.ts"
```

**TS2307 — Cannot find module '@shared/...'**
```ts
// Check tsconfig.json paths
// Check that the file actually exists and is exported correctly
ls shared/
grep -n "export" shared/schema.ts | head -20
```

**TS2322 — Type 'X | null' not assignable to type 'X'**
```ts
// Drizzle nullable columns return T | null
// Fix A: filter at query level
.where(isNotNull(table.field))
// Fix B: coerce with fallback
const val = row.field ?? "default";
// Fix C: update the type to accept null
```

### 3. Drizzle-Specific Type Errors

Drizzle infers types from schema — the schema is the source of truth.

```bash
# Find the schema definition for the problematic table
grep -n "export const tableName" shared/*.ts
```

If you're getting type errors when accessing columns, compare what Drizzle inferred vs. what you're using:
```ts
type Row = typeof tableName.$inferSelect;
// Hover or console.log won't help — read the schema definition directly
```

Common Drizzle fixes:
```ts
// Drizzle returns arrays from .returning()
const [row] = await db.insert(table).values(data).returning();
// NOT: const row = await db.insert(...)

// Drizzle where() requires Drizzle operators
import { eq, and, or, isNull, desc } from "drizzle-orm";
.where(eq(table.userId, userId))
```

### 4. React/Client Type Errors

**Component prop mismatch:**
```ts
// Find the component's Props interface
grep -n "interface.*Props\|type.*Props" client/src/components/ComponentName.tsx
// Then align the caller
```

**React Query response typing:**
```ts
// Add generic type to useQuery
const { data } = useQuery<Lead[]>({ queryKey: ['/api/leads'] });
```

**Event handler typing:**
```ts
// Common patterns
onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleClick()}
```

### 5. Work Through File by File

Process errors from most-referenced files first (shared types affect the most downstream code):
```bash
# Sort errors by file, count per file
npm run check 2>&1 | grep "^server/\|^shared/\|^client/" | cut -d'(' -f1 | sort | uniq -c | sort -rn
```

Fix `shared/` errors first → they cascade to fix many errors in `server/` and `client/`.

### 6. Verify to Zero

```bash
npm run check
# Must exit with 0 errors
echo $?   # should be 0
```

### 7. Commit

```bash
git add <files> && git commit -m "fix(types): resolve all TypeScript errors"
```

## Shortcuts

```bash
# Count remaining errors
npm run check 2>&1 | grep "error TS" | wc -l

# See errors only for one file
npx tsc --noEmit 2>&1 | grep "server/routes.ts"

# Check a specific file in isolation
npx tsc --noEmit server/routes.ts 2>&1
```
