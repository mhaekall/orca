import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Theme } from "../../lib/theme";

const FONT_BLACK = Theme.typography.weights.black;

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
    marginBottom: 16,
  },
  text: {
    color: "#fff",
    fontSize: 20,
    fontWeight: FONT_BLACK,
    letterSpacing: -0.5,
  },
});
