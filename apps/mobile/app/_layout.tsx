import "../global.css";
import { Stack } from "expo-router";
import { AuthProvider } from "../lib/auth";
import { StatusBar } from "expo-status-bar";
import { SWRConfig } from "swr";
import { AppState } from "react-native";

export default function RootLayout() {
  return (
    <SWRConfig
      value={{
        provider: () => new Map(),
        isVisible: () => { return true },
        initFocus(callback) {
          let appState = AppState.currentState;
          const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (appState.match(/inactive|background/) && nextAppState === 'active') {
              callback();
            }
            appState = nextAppState;
          });
          return () => {
            subscription.remove();
          }
        }
      }}
    >
      <AuthProvider>
        <StatusBar style="light" />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </SWRConfig>
  );
}
