import { requireNativeViewManager } from 'expo-modules-core';
import type { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';

export interface VideoProgressEvent {
  currentTime: number;
  duration: number;
}

export interface NativeVideoPlayerProps {
  videoUrl: string | null | undefined;
  headers?: Record<string, string>;
  isPlaying?: boolean;
  onProgress?: (event: NativeSyntheticEvent<VideoProgressEvent>) => void;
  onPlaybackEnd?: (event: NativeSyntheticEvent<void>) => void;
  onBufferingChange?: (event: NativeSyntheticEvent<{ isBuffering: boolean }>) => void;
  style?: StyleProp<ViewStyle>;
}

export interface NativeVideoPlayerRef {
  seekTo: (timeSeconds: number) => Promise<void>;
}

const NativeVideoPlayer = requireNativeViewManager<NativeVideoPlayerProps>('NativeVideoPlayer');

export default NativeVideoPlayer;