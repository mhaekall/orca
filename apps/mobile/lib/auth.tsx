import React, { createContext, useContext, useEffect, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { authClient } from "./auth-client";

// Ensure WebBrowser closes the modal on redirect
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: any | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Layer 1 - Google OAuth via expo-auth-session
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: "475749423464-2sf8p2d27p2604mfb0eojc3e36btgpcr.apps.googleusercontent.com",
    // In the future, for a real APK build, we will add androidClientId here.
    // For now, Expo Go on Android forces the use of iOS Client ID logic.
  });

  // Check initial session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await authClient.getSession();
        if (data?.user) setUser(data.user);
      } catch (e) {
        console.log("No active session");
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  // Handle the response from Google
  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      if (id_token) {
        // Send the id_token to BetterAuth backend to establish a session
        // This relies on the backend accepting an idToken via signIn.social
        authClient.signIn.social({
            provider: "google",
            idToken: id_token
        }).then(res => {
            if (res.data?.user) {
                setUser(res.data.user);
            }
        }).catch(err => {
            console.error("BetterAuth Sign In failed:", err);
        });
      }
    }
  }, [response]);

  const signInWithGoogle = async () => {
    try {
      await promptAsync();
    } catch (error) {
      console.error("Google Sign-In Error:", error);
    }
  };

  const signOut = async () => {
    try {
      await authClient.signOut();
      setUser(null);
    } catch (error) {
      console.error("Sign-Out Error:", error);
    }
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
