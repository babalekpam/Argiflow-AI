# Frontend Rules

## Component Guidelines
- Use shadcn/ui from `client/src/components/ui/` — never raw HTML form elements
- Page components go in `client/src/pages/`; shared components in `client/src/components/`
- Keep components under 200 lines; split into sub-components when larger

## Styling
- Dark theme only — no light mode variants needed
- Sky-blue gradient accent: `from-sky-400 to-blue-600` on primary CTAs
- Spacing: use Tailwind `space-y-*` and `p-*` — no inline styles
- Font: Inter (loaded globally in `client/src/index.css`)

## Data Fetching
- All server state via TanStack Query — no `useState` + `useEffect` fetch patterns
- Cache keys must be arrays: `["resource", id]`
- After any mutation, invalidate the relevant key with `queryClient.invalidateQueries`
- Show loading state with `isLoading` — never blank screens

## Forms
- Use `react-hook-form` with `zodResolver` for all user-input forms
- Define Zod schema in `shared/` if it matches a DB insert schema, otherwise inline
- Display field errors from `formState.errors` — never `alert()`

## Routing
- Use `wouter`: `<Link href="/path">`, `useLocation()`, `<Route path="..." component={...} />`
- Protect authenticated routes by checking session in the component or a wrapper

## Gotchas
- Never import from `server/` in client code — shared types come from `shared/` only
- `wouter` does not support nested `<Switch>` — flatten your routes
- Use `useTranslation()` + `t("key")` for any string that needs localization (i18next is configured)
