import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions, ActivityIndicator, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import Video, { VideoRef, OnProgressData, OnLoadData } from 'react-native-video';
import { Play, Pause, SkipForward, SkipBack, Maximize, Minimize, Settings, Heart, MessageSquare, Eye, RotateCcw, RotateCw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';

interface Props {
  videoUrl: string | null;
  title: string;
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
  title, 
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
  const videoRef = useRef<VideoRef>(null);
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
  
  // Progress bar refs
  const progressBarWidth = useRef(0);
  const progressBarPageX = useRef(0);

  const durationRef = useRef(duration);
  const [sliderWidth, setSliderWidth] = useState(Dimensions.get('window').width - 32);
  
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

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
    const willPlay = !isPlaying;
    setIsPlaying(willPlay);
    showControls();
  };

  const [showSeekLeft, setShowSeekLeft] = useState(false);
  const [showSeekRight, setShowSeekRight] = useState(false);

  const handleDoubleTapLeft = () => {
    if (videoRef.current) {
      const newTime = Math.max(0, currentTime - 10);
      if (isFinite(newTime)) {
        videoRef.current.seek(newTime);
        setCurrentTime(newTime);
      }
    }
    setShowSeekLeft(true);
    setTimeout(() => setShowSeekLeft(false), 500);
    showControls();
  };

  const handleDoubleTapRight = () => {
    if (videoRef.current) {
      const newTime = Math.min(duration, currentTime + 10);
      if (isFinite(newTime)) {
        videoRef.current.seek(newTime);
        setCurrentTime(newTime);
      }
    }
    setShowSeekRight(true);
    setTimeout(() => setShowSeekRight(false), 500);
    showControls();
  };

  const onProgress = (data: OnProgressData) => {
    if (!isDragging.current) {
      setCurrentTime(data.currentTime);
      if (onProgressUpdate) {
        onProgressUpdate(data.currentTime, duration);
      }
      
      // Auto-play Next Trigger
      if (duration > 0 && duration - data.currentTime <= 1.5) {
         if (onNext) {
            onNext();
         }
      }
    }
  };

  const onLoad = (data: OnLoadData) => {
    setDuration(data.duration);
    setIsBuffering(false);
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
      
      {videoUrl ? (
        <Video
          ref={videoRef}
          source={{ 
            uri: videoUrl,
            type: (videoUrl.includes('proxy') || videoUrl.includes('workers.dev')) ? 'm3u8' : undefined
          }}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
          paused={!isPlaying}
          onProgress={onProgress}
          onLoad={(data) => {
             console.log("[PLAYER] onLoad Triggered", data);
             onLoad(data);
          }}
          onLoadStart={() => {
             console.log("[PLAYER] onLoadStart Triggered");
             setIsBuffering(true);
          }}
          onBuffer={({ isBuffering }) => {
             console.log("[PLAYER] onBuffer Triggered: ", isBuffering);
             setIsBuffering(isBuffering);
          }}
          onEnd={() => {
            console.log("[PLAYER] onEnd Triggered");
            if (onEnd) onEnd();
            else if (onNext) onNext();
          }}
          onError={(e) => {
            console.error("[PLAYER] Video Error:", e);
            setIsBuffering(false);
          }}
          progressUpdateInterval={250}
          bufferConfig={{
            minBufferMs: 5000,
            maxBufferMs: 50000,
            bufferForPlaybackMs: 2500,
            bufferForPlaybackAfterRebufferMs: 5000
          }}
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
        onPress={() => {
          console.log("[TOUCH] Base Interaction Layer Pressed");
          toggleControls();
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
            
            {isFullscreen && (
              <View style={styles.socialBar}>
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

          {/* Center Play/Pause & Skip Controls */}
          <View style={styles.centerControls} pointerEvents="box-none">
            <View style={styles.centerRow} pointerEvents="box-none">
              {onPrevious ? (
                <Pressable onPress={() => {
                  console.log("[TOUCH] Previous Button Pressed");
                  onPrevious();
                }} style={styles.controlButton}>
                  <SkipBack color="white" size={28} fill="white" />
                </Pressable>
              ) : <View style={{ width: 48 }} />}
              
              <Pressable onPress={() => {
                console.log("[TOUCH] Double Tap Left (Rotate) Pressed");
                handleDoubleTapLeft();
              }} style={styles.controlButton}>
                <RotateCcw color="white" size={32} />
              </Pressable>

              <Pressable onPress={() => {
                console.log("[TOUCH] Play/Pause Button Pressed. Currently playing:", isPlaying);
                handlePlayPause();
              }} style={[styles.controlButton, styles.playButton]}>
                {isPlaying ? (
                  <Pause color="white" size={40} fill="white" />
                ) : (
                  <Play color="white" size={40} fill="white" style={{ marginLeft: 4 }} />
                )}
              </Pressable>

              <Pressable onPress={() => {
                 console.log("[TOUCH] Double Tap Right (Rotate) Pressed");
                 handleDoubleTapRight();
              }} style={styles.controlButton}>
                <RotateCw color="white" size={32} />
              </Pressable>

              {onNext ? (
                <Pressable onPress={() => {
                  console.log("[TOUCH] Next Button Pressed");
                  onNext();
                }} style={styles.controlButton}>
                  <SkipForward color="white" size={28} fill="white" />
                </Pressable>
              ) : <View style={{ width: 48 }} />}
            </View>
          </View>

          {/* Bottom Bar Content & Seekbar */}
          <View style={styles.bottomBarContentWrapper} pointerEvents="box-none">
            <View style={styles.timeRow} pointerEvents="box-none">
              <Text style={styles.timeText}>{formatTime(currentTime)} <Text style={{color: 'rgba(255,255,255,0.5)'}}>/ {formatTime(duration)}</Text></Text>
              
              <View style={styles.bottomRightControls}>
                  <Pressable onPress={() => {
                     console.log("[TOUCH] Fullscreen Toggle Pressed");
                     handleToggleFullscreen();
                  }} style={styles.iconButton}>
                    {isFullscreen ? <Minimize color="white" size={24} /> : <Maximize color="white" size={24} />}
                  </Pressable>
              </View>
            </View>

            {/* Preview Bubble when Scrubbing */}
            {previewTime !== null && previewPct !== null && (
              <View style={[styles.previewBubble, { left: `${previewPct}%` }]}>
                <Text style={styles.previewBubbleText}>{formatTime(previewTime)}</Text>
              </View>
            )}

            {/* Native Slider for Zero Crash Guarantee */}
            <View 
              style={{ width: '100%', height: 40, justifyContent: 'center', zIndex: 10 }}
              onLayout={(e) => {
                console.log("[SLIDER] Container Layout:", e.nativeEvent.layout);
                if (e.nativeEvent.layout.width > 0) {
                  setSliderWidth(e.nativeEvent.layout.width);
                }
              }}
            >
              <Slider
                style={{ width: sliderWidth, height: 40 }}
                minimumValue={0}
                maximumValue={duration > 0 ? duration : 1}
                value={isFinite(currentTime) && duration > 0 ? Math.min(Math.max(0, currentTime), duration) : 0}
                minimumTrackTintColor="#0A84FF"
                maximumTrackTintColor="rgba(255,255,255,0.4)"
                thumbTintColor="#FFFFFF"
                onSlidingStart={() => {
                  console.log("[TOUCH] Slider onSlidingStart");
                  isDragging.current = true;
                  if (hideTimeout.current) clearTimeout(hideTimeout.current);
                }}
                onValueChange={(val) => {
                  console.log("[TOUCH] Slider onValueChange", val);
                  if (isFinite(val)) {
                    setPreviewTime(val);
                    setCurrentTime(val);
                  }
                }}
                onSlidingComplete={(val) => {
                  console.log("[TOUCH] Slider onSlidingComplete", val);
                  isDragging.current = false;
                  setPreviewTime(null);
                  if (isFinite(val)) {
                    setCurrentTime(val);
                    if (videoRef.current && duration > 0) {
                       videoRef.current.seek(Math.min(val, duration));
                    }
                  }
                  showControls();
                }}
              />
            </View>
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
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 10,
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 16,
    borderRadius: 32,
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
    zIndex: 20,
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
  centerControls: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1, // below bottom bar
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
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    height: 40,
    width: '100%',
    justifyContent: 'center',
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
    marginLeft: -25, // Center the bubble
  },
  previewBubbleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  progressBarHitbox: {
    height: 24,
    justifyContent: 'center',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0A84FF',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  progressThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    marginLeft: -8, // center the thumb
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
});