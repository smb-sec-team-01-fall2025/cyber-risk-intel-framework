import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Build URL properly - handle query parameters
    let url: string;
    if (queryKey.length === 1) {
      // Simple URL: ["/api/stats"]
      url = queryKey[0] as string;
    } else if (queryKey.length === 2 && typeof queryKey[1] === "object" && !Array.isArray(queryKey[1])) {
      // URL with query params: ["/api/assets", { search: "test", page: 1 }]
      const baseUrl = queryKey[0] as string;
      const params = queryKey[1] as Record<string, any>;
      const searchParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, String(value));
        }
      });
      
      const queryString = searchParams.toString();
      url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    } else {
      // Path segments: ["/api/assets", "123"] or ["/api/assets", "123", "intel"]
      url = queryKey.filter(k => k !== null && k !== undefined).join("/") as string;
    }
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
