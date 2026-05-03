import { Stack } from "expo-router";
import { AuthProvider } from "../lib/auth";
import { StatusBar } from "expo-status-bar";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { View, StyleSheet } from "react-native";

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
        <AuthProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              contentStyle: styles.stackContent,
              animation: "default", // Mengembalikan animasi ke bawaan (default Android/iOS)
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </AuthProvider>
      </View>
    </ThemeProvider>
  );
}
