import React, { useState, memo } from 'react';
import { View, Dimensions, StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';
import { Skeleton } from '../Skeleton';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  uri: string;
  isFirst?: boolean;
  scaleType?: 'fill' | 'contain';
  isHorizontal?: boolean;
}

export const AutoHeightImage = memo(({ uri, isFirst, scaleType = 'fill', isHorizontal = false }: Props) => {
  // Gunakan estimasi tinggi 1.5x width sebagai tinggi default/placeholder agar mendekati proporsi manga
  const [height, setHeight] = useState<number>(SCREEN_WIDTH * 1.5); 
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // If in horizontal reading mode, we constrain to the exact screen dimensions
  const containerWidth = SCREEN_WIDTH;
  const containerHeight = isHorizontal ? SCREEN_HEIGHT : height;

  return (
    <View style={{ width: containerWidth, height: containerHeight, backgroundColor: '#0a0812', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
      {!loaded && !error && (
        <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
          <Skeleton w="100%" h="100%" r={0} style={{ position: 'absolute' }} />
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 'bold', fontSize: 12 }}>Memuat gambar...</Text>
        </View>
      )}
      {error && (
        <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#1f1c29' }]}>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Gagal memuat gambar</Text>
        </View>
      )}
      
      <Image
        source={{ uri }}
        style={{ width: '100%', height: '100%', opacity: loaded ? 1 : 0 }}
        contentFit={isHorizontal ? 'contain' : scaleType}
        onLoad={(e) => {
          if (e.source.width && e.source.height && !isHorizontal) {
            const calculatedHeight = (SCREEN_WIDTH / e.source.width) * e.source.height;
            setHeight(calculatedHeight);
          }
          setLoaded(true);
        }}
        onError={() => {
          setError(true);
          setLoaded(true);
          if (!isHorizontal) setHeight(150); // Tinggi minimal jika error
        }}
        transition={300}
        cachePolicy="disk"
      />
    </View>
  );
}, (prevProps, nextProps) => 
  prevProps.uri === nextProps.uri && 
  prevProps.scaleType === nextProps.scaleType &&
  prevProps.isHorizontal === nextProps.isHorizontal
);

