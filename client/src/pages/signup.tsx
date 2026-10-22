import { Redirect } from "wouter";

// Legacy signup page. Sign-up is handled by Clerk: the router redirects
// /signup to the canonical Clerk sign-up route (see App.tsx), and this
// component does the same if it is ever rendered directly.
export default function SignupPage() {
  return <Redirect to="/sign-up" />;
}
