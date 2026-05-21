import React, { createContext, useContext, useEffect, useState } from "react";
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as SecureStore from "expo-secure-store";

interface AuthContextType {
  user: any | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { API_URL } from "./config";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Configure Google Sign-In with your Web Client ID for the backend
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "475749423464-e2dq5kmtgdehbbb369f0nvr86f73gpl0.apps.googleusercontent.com",
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });

    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const sessionStr = await SecureStore.getItemAsync("auth_session");
      if (sessionStr) {
        const sessionData = JSON.parse(sessionStr);
        if (sessionData?.user) {
           console.log("Logged in User ID from local storage:", sessionData.user.id || sessionData.user._id || "No ID found");
           setUser(sessionData.user);
        }
      }
    } catch (e) {
      console.error("Session check error", e);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyWithBackend = async (idToken: string, accessToken?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/sign-in/social`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": API_URL,
        },
        body: JSON.stringify({
          provider: "google",
          idToken: {
            token: idToken,
            accessToken: accessToken || ""
          }
        }),
      });

      if (res.ok) {
        const data = await res.json();
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
      setIsLoading(true);
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      
      // userInfo.data.idToken contains the ID token required by the backend
      if (userInfo?.data?.idToken) {
        await verifyWithBackend(userInfo.data.idToken, tokens.accessToken);
      } else {
        console.error("No ID Token received from Google Sign-In");
      }
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setUser(null);
      await SecureStore.deleteItemAsync("auth_session");
      await GoogleSignin.signOut();
    } catch (error) {
      console.error("Google Sign-Out Error:", error);
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