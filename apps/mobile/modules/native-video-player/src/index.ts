import { requireNativeViewManager } from 'expo-modules-core';
import type { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';

export interface VideoProgressEvent {
  currentTime: number;
  duration: number;
}

export interface NativeVideoPlayerProps {
  videoUrl: string | null | undefined;
  headers?: Record<string, string>;
  onProgress?: (event: NativeSyntheticEvent<VideoProgressEvent>) => void;
  onPlaybackEnd?: (event: NativeSyntheticEvent<void>) => void;
  style?: StyleProp<ViewStyle>;
}

const NativeVideoPlayer = requireNativeViewManager<NativeVideoPlayerProps>('NativeVideoPlayer');

export default NativeVideoPlayer;