import React from 'react';
import { View, Text, Platform } from 'react-native';

interface Props {
  text: string;
  color?: string;
}

export function AbstractBadge({ text, color = '#0A84FF' }: Props) {
  return (
    <View style={{ alignSelf: 'flex-start', marginBottom: 12, marginLeft: -20, position: 'relative' }}>
      <View style={{
        position: 'absolute',
        top: 0, bottom: 0, left: 0, right: 0,
        transform: [{ rotate: '-3deg' }, { skewX: '-18deg' }],
        shadowColor: color, shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6,
      }}>
        <View style={{ 
          flex: 1, 
          backgroundColor: color,
          borderTopRightRadius: 4, borderBottomRightRadius: 12,
          overflow: 'hidden'
        }}>
          <View style={{ position: 'absolute', width: 2, height: 60, backgroundColor: 'rgba(255,255,255,0.2)', transform: [{rotate: '45deg'}], left: 10, top: -10 }} />
          <View style={{ position: 'absolute', width: 4, height: 60, backgroundColor: 'rgba(255,255,255,0.15)', transform: [{rotate: '45deg'}], left: 30, top: -10 }} />
          <View style={{ position: 'absolute', width: 1, height: 60, backgroundColor: 'rgba(255,255,255,0.3)', transform: [{rotate: '45deg'}], left: 50, top: -10 }} />
          <View style={{ position: 'absolute', width: 6, height: 80, backgroundColor: 'rgba(0,0,0,0.1)', transform: [{rotate: '-30deg'}], left: 70, top: -20 }} />
          <View style={{ position: 'absolute', width: 2, height: 60, backgroundColor: 'rgba(255,255,255,0.2)', transform: [{rotate: '45deg'}], left: 100, top: -10 }} />
          <View style={{ position: 'absolute', width: 3, height: 60, backgroundColor: 'rgba(0,0,0,0.15)', transform: [{rotate: '45deg'}], left: 120, top: 0 }} />
          <View style={{ position: 'absolute', width: 1, height: 60, backgroundColor: 'rgba(255,255,255,0.25)', transform: [{rotate: '-45deg'}], left: 140, top: -10 }} />
        </View>
      </View>
      
      <Text style={{
        color: '#fff', fontSize: 24, 
        paddingHorizontal: 16, paddingVertical: 2,
        fontWeight: 'bold', fontStyle: 'italic',
        textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4,
        transform: [{ rotate: '-4deg' }]
      }}>
        {text}
      </Text>
    </View>
  );
}