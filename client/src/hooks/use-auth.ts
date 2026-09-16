import { useUser, useAuth as useClerkAuth, useClerk } from "@clerk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  companyName: string | null;
  industry: string | null;
  website: string | null;
  companyDescription: string | null;
  onboardingCompleted: string | null;
  jobTitle?: string | null;
  emailVerified?: string | null;
  planLabel?: string;
  trialDaysLeft?: number | null;
}

export function useAuth() {
  const { isSignedIn, isLoaded } = useClerkAuth();
  const { signOut } = useClerk();
  const queryClient = useQueryClient();

  const { data: dbUser, isLoading: dbLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    enabled: isLoaded && isSignedIn === true,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const user = isLoaded && isSignedIn && dbUser ? dbUser : null;

  return {
    user,
    isLoading: !isLoaded || (isSignedIn === true && dbLoading),
    isAuthenticated: isLoaded && isSignedIn === true && !!dbUser,
    logout: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      signOut({ redirectUrl: "/" });
    },
    isLoggingOut: false,
    // login and register are no longer used — Clerk handles sign-in/sign-up
  };
}
