import { Redirect } from "wouter";

// Legacy login page. Sign-in is handled by Clerk: the router redirects
// /login to the canonical Clerk sign-in route (see App.tsx), and this
// component does the same if it is ever rendered directly.
export default function LoginPage() {
  return <Redirect to="/sign-in" />;
}
