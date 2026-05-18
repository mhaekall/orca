import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface Props {
  progress: number; // 0 to 100
  height?: number;
  color?: string;
  trackColor?: string;
  borderRadius?: number;
  style?: ViewStyle;
}

export function ProgressBar({ 
  progress, 
  height = 4, 
  color = '#0A84FF', 
  trackColor = 'rgba(255,255,255,0.2)', 
  borderRadius = 0,
  style 
}: Props) {
  const safeProgress = Math.max(0, Math.min(100, progress));

  return (
    <View style={[{ height, backgroundColor: trackColor, borderRadius, overflow: 'hidden' }, style]}>
      <View style={{ height: '100%', backgroundColor: color, width: `${safeProgress}%` }} />
    </View>
  );
}