import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions, ActivityIndicator, Alert, PanResponder } from 'react-native';
import NativeVideoPlayer, { NativeVideoPlayerRef } from '../modules/native-video-player/src/index';
import { Play, Pause, SkipForward, SkipBack, Maximize, Minimize, Settings, Heart, MessageSquare, Eye, RotateCcw, RotateCw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { resolveProxyUrl } from '../lib/utils';

interface Props {
  videoUrl: string | null;
  sourceType?: string;
  title: string;
  headers?: Record<string, string>;
  onNext?: () => void;
  onPrevious?: () => void;
  isLoading?: boolean;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  views?: number;
  likes?: number;
  isLiked?: boolean;
  onLike?: () => void;
  onShowComments?: () => void;
  onProgressUpdate?: (currentTime: number, duration: number) => void;
  onEnd?: () => void;
}

function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function CustomVideoPlayer({ 
  videoUrl, 
  sourceType,
  title, 
  headers,
  onNext, 
  onPrevious, 
  isLoading = false,
  onFullscreenChange,
  views = 0,
  likes = 0,
  isLiked = false,
  onLike,
  onShowComments,
  onProgressUpdate,
  onEnd
}: Props) {
  // Bypass stale Cloudflare Edge Cache for proxy URLs & ensure it doesn't trigger re-renders
  const finalUrl = React.useMemo(() => resolveProxyUrl(videoUrl), [videoUrl]);

  const playerRef = useRef<NativeVideoPlayerRef>(null);

  const [controlsVisible, setControlsVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [previewTime, setPreviewTime] = useState<number | null>(null);
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);
  const isDragging = useRef(false);
  const lastTapRef = useRef({ time: 0 });
  
  // Progress bar refs
  const progressBarWidth = useRef(0);
  const progressBarPageX = useRef(0);

  const durationRef = useRef(duration);
  const currentTimeRef = useRef(currentTime);
  
  useEffect(() => {
    durationRef.current = duration;
    currentTimeRef.current = currentTime;
  }, [duration, currentTime]);

  useEffect(() => {
    setIsBuffering(true);
  }, [finalUrl]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        isDragging.current = true;
        if (hideTimeout.current) clearTimeout(hideTimeout.current);
        
        const screenWidth = Dimensions.get('window').width;
        const barWidth = progressBarWidth.current || screenWidth;
        const assumedPageX = (screenWidth - barWidth) / 2;
        progressBarPageX.current = assumedPageX;
        
        const touchPageX = e.nativeEvent.pageX;
        let pct = (touchPageX - assumedPageX) / barWidth;
        pct = Math.max(0, Math.min(1, pct));
        
        if (durationRef.current > 0) {
           const newTime = pct * durationRef.current;
           setPreviewTime(newTime);
           setCurrentTime(newTime);
        }
      },
      onPanResponderMove: (e) => {
        const touchPageX = e.nativeEvent.pageX;
        const barWidth = progressBarWidth.current || 1;
        let pct = (touchPageX - progressBarPageX.current) / barWidth;
        pct = Math.max(0, Math.min(1, pct));
        
        if (durationRef.current > 0) {
           const newTime = pct * durationRef.current;
           setPreviewTime(newTime);
           setCurrentTime(newTime);
        }
      },
      onPanResponderRelease: (e) => {
        isDragging.current = false;
        const touchPageX = e.nativeEvent.pageX;
        const barWidth = progressBarWidth.current || 1;
        let pct = (touchPageX - progressBarPageX.current) / barWidth;
        pct = Math.max(0, Math.min(1, pct));
        
        setPreviewTime(null);
        if (durationRef.current > 0) {
           const newTime = pct * durationRef.current;
           setCurrentTime(newTime);
           if (playerRef.current) {
             playerRef.current.seekTo(newTime);
           }
        }
        showControls();
      },
    })
  ).current;

  const handleToggleFullscreen = async () => {
    try {
      if (isFullscreen) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        await NavigationBar.setVisibilityAsync('visible');
        setIsFullscreen(false);
        if (onFullscreenChange) onFullscreenChange(false);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        await NavigationBar.setVisibilityAsync('hidden');
        setIsFullscreen(true);
        if (onFullscreenChange) onFullscreenChange(true);
      }
    } catch (e) {
      console.warn("Fullscreen toggle error:", e);
    }
  };

  const handleCommentsPress = () => {
    if (onShowComments) onShowComments();
  };

  useEffect(() => {
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      NavigationBar.setVisibilityAsync('visible').catch(() => {});
    };
  }, []);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    
    if (isPlaying && !isDragging.current) {
      hideTimeout.current = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setControlsVisible(false));
      }, 3000);
    }
  }, [fadeAnim, isPlaying]);

  const toggleControls = useCallback(() => {
    if (controlsVisible) {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setControlsVisible(false));
    } else {
      showControls();
    }
  }, [controlsVisible, fadeAnim, showControls]);

  useEffect(() => {
    showControls();
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, [isPlaying, showControls]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    showControls();
  };

  const [showSeekLeft, setShowSeekLeft] = useState(false);
  const [showSeekRight, setShowSeekRight] = useState(false);

  const handleDoubleTapLeft = () => {
    const newTime = Math.max(0, currentTimeRef.current - 10);
    if (playerRef.current) {
      playerRef.current.seekTo(newTime);
      setCurrentTime(newTime);
      setIsBuffering(true);
    }
    setShowSeekLeft(true);
    setTimeout(() => setShowSeekLeft(false), 500);
    showControls();
  };

  const handleDoubleTapRight = () => {
    const newTime = Math.min(durationRef.current, currentTimeRef.current + 10);
    if (playerRef.current) {
      playerRef.current.seekTo(newTime);
      setCurrentTime(newTime);
      setIsBuffering(true);
    }
    setShowSeekRight(true);
    setTimeout(() => setShowSeekRight(false), 500);
    showControls();
  };

  let progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  if (isNaN(progressPct) || !isFinite(progressPct)) progressPct = 0;
  progressPct = Number(Math.max(0, Math.min(100, progressPct)).toFixed(2));
  
  let previewPct = duration > 0 && previewTime !== null ? (previewTime / duration) * 100 : null;
  if (previewPct !== null && (isNaN(previewPct) || !isFinite(previewPct))) previewPct = null;
  if (previewPct !== null) previewPct = Number(Math.max(0, Math.min(100, previewPct)).toFixed(2));

  return (
    <View style={styles.container}>
      <StatusBar hidden={isFullscreen} />
      
      {finalUrl ? (
        <NativeVideoPlayer
          ref={playerRef}
          videoUrl={finalUrl}
          headers={headers}
          isPlaying={isPlaying}
          onBufferingChange={({ nativeEvent }) => {
            setIsBuffering(nativeEvent.isBuffering);
          }}
          onProgress={({ nativeEvent }) => {
            if (!isDragging.current) {
              const cur = nativeEvent.currentTime;
              const dur = nativeEvent.duration;
              setCurrentTime(cur);
              setDuration(dur);
              setIsBuffering(false);
              if (onProgressUpdate) onProgressUpdate(cur, dur);
            }
          }}
          onPlaybackEnd={() => {
            if (onEnd) onEnd();
            else if (onNext) onNext();
          }}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0A84FF" />
        </View>
      )}

      {/* Loading Overlay */}
      {(isLoading || isBuffering) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0A84FF" />
        </View>
      )}

      {/* Double Tap Background Ripple Overlay */}
      <View style={[StyleSheet.absoluteFill, styles.seekOverlay]} pointerEvents="box-none">
        {showSeekLeft && (
          <View style={[styles.seekArea, { alignItems: 'center' }]}>
            <View style={styles.seekIndicator}>
              <SkipBack color="white" size={24} />
              <Text style={styles.seekIndicatorText}>10s</Text>
            </View>
          </View>
        )}
        <View style={{ flex: 1 }} />
        {showSeekRight && (
          <View style={[styles.seekArea, { alignItems: 'center' }]}>
            <View style={styles.seekIndicator}>
              <SkipForward color="white" size={24} />
              <Text style={styles.seekIndicatorText}>10s</Text>
            </View>
          </View>
        )}
      </View>

      {/* Interaction Layer */}
      <Pressable 
        style={styles.interactionLayer} 
        onPress={(e) => {
          const now = Date.now();
          const DOUBLE_PRESS_DELAY = 300;
          const { pageX } = e.nativeEvent;
          const screenWidth = Dimensions.get('window').width;

          if (now - lastTapRef.current.time < DOUBLE_PRESS_DELAY) {
            // Double Tap Detected
            if (pageX < screenWidth / 3) {
              handleDoubleTapLeft();
            } else if (pageX > (screenWidth * 2) / 3) {
              handleDoubleTapRight();
            } else {
              // Middle double tap
              handlePlayPause();
            }
            lastTapRef.current.time = 0; // reset
          } else {
            // Single Tap
            lastTapRef.current.time = now;
            toggleControls();
          }
        }} 
      />
      
      <View style={[StyleSheet.absoluteFillObject, { zIndex: 30, elevation: 30 }]} pointerEvents={controlsVisible ? 'box-none' : 'none'}>
        <Animated.View style={[styles.controlsContainer, { opacity: fadeAnim }]} pointerEvents="box-none">
          
          {/* Top Gradient Background */}
          <LinearGradient colors={['rgba(0,0,0,0.8)', 'transparent']} style={styles.topGradient} pointerEvents="none" />
          
          {/* Bottom Gradient Background */}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.bottomGradient} pointerEvents="none" />

          {/* Top Bar Content */}
          <View style={styles.topBarContentWrapper} pointerEvents="box-none">
            <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
          </View>

          {/* Center Play/Pause & Skip Controls */}
          <View style={styles.centerControls} pointerEvents="box-none">
            <View style={styles.centerRow} pointerEvents="box-none">
              {onPrevious ? (
                <Pressable onPress={() => {
                  onPrevious();
                }} style={styles.controlButton}>
                  <SkipBack color="white" size={28} fill="white" />
                </Pressable>
              ) : <View style={{ width: 48 }} />}
              
              <Pressable onPress={() => {
                handleDoubleTapLeft();
              }} style={styles.controlButton}>
                <RotateCcw color="white" size={32} />
              </Pressable>

              <Pressable onPress={() => {
                handlePlayPause();
              }} style={[styles.controlButton, styles.playButton]}>
                {isPlaying ? (
                  <Pause color="white" size={40} fill="white" />
                ) : (
                  <Play color="white" size={40} fill="white" style={{ marginLeft: 4 }} />
                )}
              </Pressable>

              <Pressable onPress={() => {
                 handleDoubleTapRight();
              }} style={styles.controlButton}>
                <RotateCw color="white" size={32} />
              </Pressable>

              {onNext ? (
                <Pressable onPress={() => {
                  onNext();
                }} style={styles.controlButton}>
                  <SkipForward color="white" size={28} fill="white" />
                </Pressable>
              ) : <View style={{ width: 48 }} />}
            </View>
          </View>

          {/* Bottom Bar Content & Seekbar */}
          <View style={[styles.bottomBarContentWrapper, isFullscreen && { paddingHorizontal: 60 }]} pointerEvents="box-none">
            <View style={styles.timeRow} pointerEvents="box-none">
              <Text style={styles.timeText}>{formatTime(currentTime)} <Text style={{color: 'rgba(255,255,255,0.5)'}}>/ {formatTime(duration)}</Text></Text>
              
              <View style={styles.bottomRightControls} pointerEvents="auto">
                  <Pressable onPress={() => {
                     handleToggleFullscreen();
                  }} style={styles.iconButton}>
                    {isFullscreen ? <Minimize color="white" size={24} /> : <Maximize color="white" size={24} />}
                  </Pressable>
              </View>
            </View>

            {/* Custom Slider for Guaranteed Touch */}
            <View 
              style={styles.progressContainer}
              pointerEvents="auto"
              onLayout={(e) => {
                progressBarWidth.current = e.nativeEvent.layout.width;
              }}
              {...panResponder.panHandlers}
            >
              <View style={styles.progressBarHitbox} pointerEvents="none">
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
                  <View style={[styles.progressThumb, { left: `${progressPct}%` }]} />
                </View>
              </View>
            </View>

            {/* Social Actions in Fullscreen */}
            {isFullscreen && (
              <View style={styles.fullscreenSocialBarBottom} pointerEvents="auto">
                <View style={styles.viewBadge}>
                  <Eye color="#e5e5ea" size={14} />
                  <Text style={styles.socialText}>
                    {views && views >= 1000000 ? (views/1000000).toFixed(1) + 'M' : views && views >= 1000 ? (views/1000).toFixed(1) + 'K' : views || 0}
                  </Text>
                </View>
                <Pressable onPress={() => { if(onLike) onLike(); }} style={styles.iconButton}>
                  <Heart color={isLiked ? "#ff2d55" : "#e5e5ea"} size={20} fill={isLiked ? "#ff2d55" : "none"} />
                </Pressable>
                <Pressable onPress={() => { if(onShowComments) onShowComments(); }} style={styles.iconButton}>
                  <MessageSquare color="#e5e5ea" size={20} />
                </Pressable>
              </View>
            )}
          </View>

        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: 'black',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
    elevation: 10,
    pointerEvents: 'none',
  },
  seekOverlay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 15,
  },
  seekArea: {
    width: '35%',
    height: '100%',
    justifyContent: 'center',
  },
  seekIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  seekIndicatorText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  interactionLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20, // Must be above seekOverlay but below controlsContainer
  },
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    zIndex: 30,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 0,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
    zIndex: 0,
  },
  topBarContentWrapper: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  titleText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    flex: 1,
  },
  socialBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginLeft: 16,
  },
  viewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  socialText: {
    color: '#e5e5ea',
    fontSize: 12,
    fontWeight: '600',
  },
  fullscreenSocialBarBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  centerControls: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  controlButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  bottomBarContentWrapper: {
    paddingTop: 32,
    zIndex: 2,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  timeRow: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  bottomRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    padding: 4,
  },
  progressContainer: {
    height: 24,
    width: '100%',
    justifyContent: 'flex-end',
    position: 'relative',
    zIndex: 10,
  },
  previewBubble: {
    position: 'absolute',
    bottom: 24,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginLeft: -25,
  },
  previewBubbleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  progressBarHitbox: {
    height: 24,
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  progressBarTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1,
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0A84FF',
    borderRadius: 1,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  progressThumb: {
    position: 'absolute',
    top: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
    marginLeft: -5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
});