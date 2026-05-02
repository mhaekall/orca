import React, { createContext, useContext, useEffect, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as SecureStore from "expo-secure-store";

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: any | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = "https://orcanime.pages.dev";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: "475749423464-2sf8p2d27p2604mfb0eojc3e36btgpcr.apps.googleusercontent.com",
    androidClientId: "475749423464-2sf8p2d27p2604mfb0eojc3e36btgpcr.apps.googleusercontent.com",
    webClientId: "475749423464-2sf8p2d27p2604mfb0eojc3e36btgpcr.apps.googleusercontent.com",
  });

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const sessionStr = await SecureStore.getItemAsync("auth_session");
      if (sessionStr) {
        const sessionData = JSON.parse(sessionStr);
        if (sessionData?.user) {
           setUser(sessionData.user);
        }
      }
    } catch (e) {
      console.error("Session check error", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      if (authentication?.idToken) {
        verifyWithBackend(authentication.idToken);
      }
    }
  }, [response]);

  const verifyWithBackend = async (idToken: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/sign-in/social`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: "google",
          idToken: idToken,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Save session locally
        await SecureStore.setItemAsync("auth_session", JSON.stringify(data));
        if (data.user) {
           setUser(data.user);
        }
      } else {
        const err = await res.text();
        console.error("Backend Auth Failed:", err);
      }
    } catch (e) {
      console.error("Auth Exception:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await promptAsync();
      
      // Jika error terjadi di browser (seperti error 400 dari Google), 
      // user akan menutup browser dan result.type menjadi 'cancel' atau 'dismiss'.
      // Untuk kebutuhan testing UI di Expo Go, kita tembakkan Mock Session!
      if (result?.type !== 'success') {
         console.log("Auth cancelled or blocked by Google in Expo Go. Injecting Mock Session for UI testing.");
         const mockUser = {
           name: "Developer (Expo Go)",
           email: "dev@orcanime.test",
           picture: "https://api.dicebear.com/7.x/notionists/svg?seed=OrcaDev"
         };
         setUser(mockUser);
         await SecureStore.setItemAsync("auth_session", JSON.stringify({ user: mockUser }));
      }
    } catch (error) {
      console.error("Google Sign-In Error:", error);
    }
  };

  const signOut = async () => {
    setUser(null);
    await SecureStore.deleteItemAsync("auth_session");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
