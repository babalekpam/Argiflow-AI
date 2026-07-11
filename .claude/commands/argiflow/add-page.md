# Add React Page

Scaffold a new page in the ArgiFlow frontend.

## Steps

1. Create `client/src/pages/<feature>.tsx`:
   - Use dark theme with sky-blue accents (`from-sky-400 to-blue-600`)
   - Import UI primitives from `client/src/components/ui/`
   - Fetch data with TanStack Query `useQuery(['feature', id], fetchFn)`
   - Mutations use `useMutation` + `queryClient.invalidateQueries(['feature'])`

2. Register the route in `client/src/App.tsx`:
   ```tsx
   import { FeaturePage } from './pages/feature';
   // Inside the router:
   <Route path="/feature" component={FeaturePage} />
   ```

3. Add a nav link in the sidebar component if needed.

4. Run `npm run check` to verify TypeScript.

## Template

```tsx
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function FeaturePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['feature'],
    queryFn: () => fetch('/api/feature').then(r => r.json()),
  });

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Feature</h1>
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {/* content */}
        </CardContent>
      </Card>
    </div>
  );
}
```
