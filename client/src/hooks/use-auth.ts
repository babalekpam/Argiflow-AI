import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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
}

async function fetchUser(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      window.location.href = "/";
    },
  });

  const login = async (data: { email: string; password: string }) => {
    const res = await apiRequest("POST", "/api/auth/login", data);
    const userData = await res.json();
    // A successful password check isn't enough: verify the browser can return
    // the saved session cookie before displaying an authenticated dashboard.
    const sessionUser = await fetchUser();
    if (!sessionUser || sessionUser.id !== userData.id) {
      queryClient.setQueryData(["/api/auth/user"], null);
      throw new Error("Your password was accepted, but this browser did not keep the login session. Stay on this website and allow its first-party cookies, then sign in again. No email was sent.");
    }
    queryClient.setQueryData(["/api/auth/user"], sessionUser);
    return sessionUser;
  };

  const register = async (data: { email: string; password: string; firstName: string; lastName: string }) => {
    const res = await apiRequest("POST", "/api/auth/register", data);
    const userData = await res.json();
    queryClient.setQueryData(["/api/auth/user"], userData);
    return userData;
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
