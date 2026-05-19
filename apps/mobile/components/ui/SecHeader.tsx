import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Theme } from "../../lib/theme";

const FONT_SEMIBOLD = Theme.typography.weights.semibold;

export function SecHeader({ label }: { label: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  text: {
    color: "#fff",
    fontSize: 18,
    fontWeight: FONT_SEMIBOLD,
    letterSpacing: -0.2,
  },
});
