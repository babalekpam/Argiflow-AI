---
name: db-schema
description: Add or modify a Drizzle ORM table schema, push to the database, and update all related types and Zod validators. Use when the user wants to change the database structure.
---

# DB Schema Change Skill

Safely add or modify Drizzle ORM schemas in this project.

## Workflow

Make a todo list and complete tasks in order.

### 1. Understand the Change

Determine:
- New table, new column, or modify existing column?
- What type? (text, varchar, integer, boolean, timestamp, jsonb, real)
- Nullable or required? Does it need a default?
- Any relations to other tables (foreign key)?

### 2. Find the Right Schema File

Schemas live in `shared/`:
- `shared/schema.ts` — core tables (users, leads, businesses, etc.)
- `shared/workflow-schema.ts` — workflow engine tables
- `shared/intelligence-schema.ts` — intelligence/research tables
- `shared/marketing-autopilot-schema.ts` — autopilot tables
- `shared/instantly-schema.ts` — email sequences
- `shared/domain-schema.ts` — domain management
- `shared/email-quota-schema.ts` — email quota tables
- `shared/business-manager-schema.ts` — business manager tables

### 3. Write the Schema Change

**New table example:**
```ts
export const widgetSettings = pgTable("widget_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  config: jsonb("config").default({}),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWidgetSettingsSchema = createInsertSchema(widgetSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type WidgetSettings = typeof widgetSettings.$inferSelect;
export type InsertWidgetSettings = z.infer<typeof insertWidgetSettingsSchema>;
```

**Add a column:**
```ts
// In the existing pgTable() call, add:
newField: text("new_field"),  // nullable — safe to add
// or
newField: text("new_field").notNull().default("default_value"),
```

**Rules:**
- New columns on existing tables MUST be nullable OR have a `.default()` — never add a bare `.notNull()` column without a default to a table with existing rows
- Use `varchar("id")` for UUIDs (not `uuid()` type — project convention)
- Use `jsonb` for flexible/nested data, not `text` with JSON.stringify
- Mirror `createdAt`/`updatedAt` pattern from existing tables

### 4. Export From Schema File

If you created a new table, make sure it's exported and re-exported if needed.

For new schema files, add an export to `server/routes.ts` or wherever `db` is imported:
```ts
import { newTable } from "@shared/new-schema";
```

### 5. Push to Database

```bash
npm run db:push
```

This runs `drizzle-kit push` — it introspects the live DB and applies the diff. Review the output carefully. If it warns about dropping data, stop and confirm with the user.

### 6. Type-Check

```bash
npm run check
```

Fix all errors. The inferred types from the schema are the source of truth.

### 7. Update Consumers

Search for any routes, storage functions, or client queries that touch the changed table and update them to handle the new shape:
```bash
grep -r "tableName\|TypeName" server/ shared/ client/ --include="*.ts" --include="*.tsx"
```

### 8. Commit

```bash
git add shared/ server/ && git commit -m "feat(db): add widget_settings table"
```

## Common Pitfalls

- Pushing a `.notNull()` column with no default to a populated table → DB error
- Forgetting to export the new type → import errors in routes
- Using `text` for JSON storage → lose type safety, hard to query
- Not running `npm run check` after schema change → broken inferred types at runtime
