---
name: component-build
description: Build a new React component following the Argiflow patterns — shadcn/ui primitives, React Query for data, wouter for routing, Tailwind for styling. Use when the user wants a new UI component or page.
---

# Build React Component Skill

Create React components that fit the existing architecture.

## Workflow

### 1. Clarify Requirements

Before writing code, understand:
- Is this a full page or a reusable component?
- Does it need to fetch data? From which endpoint?
- Does it mutate data? What route?
- Where does it live in the navigation?

### 2. Find Similar Existing Components

Read 1-2 existing components that are closest to what you're building:
```bash
ls client/src/pages/          # full page components
ls client/src/components/     # reusable components
# Read the closest example to understand patterns
```

### 3. Stack Conventions

**Routing:** uses `wouter` not `react-router`
```ts
import { Link, useRoute, useLocation } from "wouter";
const [match, params] = useRoute("/leads/:id");
const [, navigate] = useLocation();
navigate("/dashboard");
```

**Data fetching:** uses `@tanstack/react-query`
```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Fetch
const { data: leads, isLoading } = useQuery<Lead[]>({
  queryKey: ["/api/leads"],
});

// Mutate
const queryClient = useQueryClient();
const createLead = useMutation({
  mutationFn: (data: InsertLead) =>
    fetch("/api/leads", { method: "POST", body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" } }).then(r => r.json()),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/leads"] }),
});
```

**Forms:** uses `react-hook-form` + `zod` resolver
```ts
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLeadSchema, type InsertLead } from "@shared/schema";

const form = useForm<InsertLead>({
  resolver: zodResolver(insertLeadSchema),
  defaultValues: { name: "", email: "", source: "manual" },
});
```

**UI components:** uses shadcn/ui (already installed)
```ts
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
```

**Icons:** uses `lucide-react`
```ts
import { Plus, Trash2, ChevronRight, Loader2 } from "lucide-react";
```

**Styling:** Tailwind CSS with `cn()` utility
```ts
import { cn } from "@/lib/utils";
<div className={cn("base-classes", condition && "conditional-class")} />
```

### 4. Component Template

```tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { insertLeadSchema, type Lead, type InsertLead } from "@shared/schema";
import { Loader2 } from "lucide-react";

export default function LeadsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const createLead = useMutation({
    mutationFn: async (data: InsertLead) => {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead created" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Leads</h1>
      <div className="grid gap-4">
        {leads.map((lead) => (
          <Card key={lead.id}>
            <CardHeader><CardTitle>{lead.name}</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">{lead.email}</p></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### 5. Register the Route (for full pages)

In `client/src/App.tsx` or wherever routes are defined:
```tsx
import { Route } from "wouter";
import LeadsPage from "@/pages/LeadsPage";
// Inside the Switch/Router:
<Route path="/leads" component={LeadsPage} />
```

### 6. Type-Check

```bash
npm run check
```

### 7. Visual Test

If the dev server is running, navigate to the new route and verify:
- Data loads correctly
- Loading state shows
- Error state (simulate with a bad API call if needed)
- Form validation works
- Mutations invalidate cache and UI updates

### 8. Commit

```bash
git add client/src/ && git commit -m "feat(ui): add LeadsPage component"
```

## Anti-Patterns

- Using `useState` + `useEffect` for data fetching instead of React Query
- Direct `fetch` without error handling in the mutation
- Hardcoding colors/sizes instead of Tailwind utilities
- Creating new UI primitives instead of using shadcn/ui components
- Using `react-router` — this project uses `wouter`
