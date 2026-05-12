import * as SecureStore from "expo-secure-store";

export const fetcher = async (url: string) => {
  let headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  try {
    const sessionStr = await SecureStore.getItemAsync("auth_session");
    if (sessionStr) {
      const sessionData = JSON.parse(sessionStr);
      const token = sessionData?.token || sessionData?.session?.token || sessionData?.accessToken || sessionData?.user?.token;
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
  } catch (e) {
    console.warn("Fetcher error reading auth_session", e);
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

  try {
    const sessionStr = await SecureStore.getItemAsync("auth_session");
    if (sessionStr) {
      const sessionData = JSON.parse(sessionStr);
      const token = sessionData?.token || sessionData?.session?.token || sessionData?.accessToken || sessionData?.user?.token;
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
  } catch (e) {
    console.warn("fetchWithAuth error reading auth_session", e);
  }

  return fetch(url, { ...options, headers });
};
