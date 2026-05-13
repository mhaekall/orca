import * as SecureStore from "expo-secure-store";

async function getAuthToken(): Promise<string | null> {
  try {
    const sessionStr = await SecureStore.getItemAsync("auth_session");
    if (sessionStr) {
      const sessionData = JSON.parse(sessionStr);
      return sessionData?.token || sessionData?.session?.token || sessionData?.accessToken || sessionData?.user?.token;
    }
  } catch (e) {
    console.warn("Error reading auth_session", e);
  }
  return null;
}

export const fetcher = async (url: string) => {
  let headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  const token = await getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { headers });
  
  if (!res.ok) {
    const error = new Error("An error occurred while fetching the data.");
    (error as any).info = await res.text();
    (error as any).status = res.status;
    throw error;
  }

  return res.json();
};

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  let headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const token = await getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers });
};
