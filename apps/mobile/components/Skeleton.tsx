import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface SkeletonProps {
  w?: number | `${number}%`;
  h: number | `${number}%`;
  r?: number;
  style?: ViewStyle;
}

export function Skeleton({ w = '100%', h, r = 12, style }: SkeletonProps) {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        {
          width: w as any,
          height: h as any,
          borderRadius: r,
          backgroundColor: 'rgba(255,255,255,0.1)',
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
}
