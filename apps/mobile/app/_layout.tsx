import { Stack } from "expo-router";
import { AuthProvider } from "../lib/auth";
import { SWRProvider } from "../lib/swr-provider";
import { StatusBar } from "expo-status-bar";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { View, StyleSheet, LogBox } from "react-native";
import * as SplashScreen from 'expo-splash-screen';

LogBox.ignoreLogs(["Unable to activate keep awake", "Uncaught (in promise, id: "]);

// Prevent splash screen from hiding automatically
SplashScreen.preventAutoHideAsync().catch(() => {});

const customTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#13111a",
  },
};

const styles = StyleSheet.create({
  stackContent: {
    backgroundColor: "#13111a",
  },
  rootView: {
    flex: 1,
    backgroundColor: "#13111a",
  }
});

export default function RootLayout() {
  return (
    <ThemeProvider value={customTheme}>
      <View style={styles.rootView}>
        <SWRProvider>
          <AuthProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                contentStyle: styles.stackContent,
                animation: "default", // Mengembalikan animasi ke bawaan (default Android/iOS)
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="explore" options={{ headerShown: false }} />
              <Stack.Screen name="notifications" options={{ headerShown: false }} />
              <Stack.Screen name="anime/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="watch/[id]/[episode]" options={{ headerShown: false }} />
            </Stack>
          </AuthProvider>
        </SWRProvider>
      </View>
    </ThemeProvider>
  );
}
