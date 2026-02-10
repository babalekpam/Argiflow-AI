import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

async function fetchUser(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
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
    staleTime: 1000 * 60 * 5,
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
    queryClient.setQueryData(["/api/auth/user"], userData);
    return userData;
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
