import React from 'react';
import { View, Text, Platform } from 'react-native';

interface Props {
  text: string;
  color?: string;
}

export function AbstractBadge({ text, color = '#0A84FF' }: Props) {
  return (
    <View style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
      <View style={{
        backgroundColor: color,
        borderRadius: 10,
        overflow: 'hidden',
        shadowColor: color,
        shadowOpacity: 0.5,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
      }}>
        {/* Subtle Decorative Lines */}
        <View style={{ position: 'absolute', width: 1, height: 60, backgroundColor: 'rgba(255,255,255,0.3)', transform: [{rotate: '30deg'}], left: 10, top: -10 }} />
        <View style={{ position: 'absolute', width: 3, height: 60, backgroundColor: 'rgba(255,255,255,0.1)', transform: [{rotate: '30deg'}], left: 25, top: -10 }} />
        <View style={{ position: 'absolute', width: 1, height: 80, backgroundColor: 'rgba(255,255,255,0.2)', transform: [{rotate: '30deg'}], left: 45, top: -20 }} />
        
        <Text style={{
          color: '#fff', 
          fontSize: 11, 
          paddingHorizontal: 12, 
          paddingVertical: 4,
          fontWeight: '900',
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}>
          {text}
        </Text>
      </View>
    </View>
  );
}