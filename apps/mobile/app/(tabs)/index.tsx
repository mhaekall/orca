import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  StatusBar as RNStatusBar,
  Platform,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Search, Bell } from "lucide-react-native";
import { HomeContent } from "../../components/home/HomeContent";
import { Theme } from "../../lib/theme";

const { width: W } = Dimensions.get("window");
const BG = Theme.colors.background;
const FONT_BOLD = Theme.typography.weights.bold;

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'anime' | 'manga'>('anime');

  const tabAnim = React.useRef(new Animated.Value(0)).current; // 0 for anime, 1 for manga

  const handleTabChange = (tab: 'anime' | 'manga') => {
    if (tab === activeTab) return;
    
    // Completely safe Haptics check
    if (Haptics && typeof Haptics.impactAsync === 'function') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    setActiveTab(tab);
    
    Animated.spring(tabAnim, {
      toValue: tab === 'anime' ? 0 : 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  const animeScrollY = React.useRef(new Animated.Value(0)).current;
  const mangaScrollY = React.useRef(new Animated.Value(0)).current;
  
  const activeScrollY = activeTab === 'anime' ? animeScrollY : mangaScrollY;

  const animeOpacity = tabAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [1, 0, 0],
  });

  const mangaOpacity = tabAnim.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 0, 1],
  });

  const animeTranslateX = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -W * 0.05],
  });

  const mangaTranslateX = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [W * 0.05, 0],
  });

  const animeScale = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.98],
  });

  const mangaScale = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });

  const headerBg = activeScrollY.interpolate({
    inputRange: [0, 100],
    outputRange: ["rgba(10, 8, 18, 0)", "rgba(10, 8, 18, 0.96)"], // Subtle transparency even when solid
    extrapolate: "clamp",
  });

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar style="light" />

      {/* Fixed header with Search Bar and Logo */}
      <Animated.View style={[s.header, { backgroundColor: headerBg }]}>
        <View style={s.headerTopRow}>
          <Text style={s.logo}>orca</Text>
          
          <Pressable onPress={() => router.push(`/explore?mediaType=${activeTab}` as any)} style={s.search}>
            <Search size={16} color="rgba(255,255,255,0.4)" />
            <Text style={s.searchText} numberOfLines={1}>Cari...</Text>
          </Pressable>

          <Pressable onPress={() => router.push("/notifications" as any)} style={s.bellBtn}>
            <Bell size={20} color="rgba(255,255,255,0.8)" />
          </Pressable>
        </View>
      </Animated.View>

      <View style={{ flex: 1 }}>
        <Animated.View 
          style={[
            StyleSheet.absoluteFillObject, 
            { 
              opacity: animeOpacity,
              transform: [{ scale: animeScale }, { translateX: animeTranslateX }],
              zIndex: activeTab === 'anime' ? 10 : 0
            }
          ]} 
          pointerEvents={activeTab === 'anime' ? 'auto' : 'none'}
        >
          <HomeContent scrollY={animeScrollY} mediaType="anime" />
        </Animated.View>

        <Animated.View 
          style={[
            StyleSheet.absoluteFillObject, 
            { 
              opacity: mangaOpacity,
              transform: [{ scale: mangaScale }, { translateX: mangaTranslateX }],
              zIndex: activeTab === 'manga' ? 10 : 0
            }
          ]} 
          pointerEvents={activeTab === 'manga' ? 'auto' : 'none'}
        >
          <HomeContent scrollY={mangaScrollY} mediaType="manga" />
        </Animated.View>
      </View>

      {/* Floating Bottom Pill (Ergonomic Safari Style) */}
      <View style={[s.bottomPillContainer, { bottom: Theme.layout.bottomPillBottom + (insets.bottom > 0 ? insets.bottom / 3 : 0) }]}>
        <View style={s.bottomPill}>
          <Pressable 
            onPress={() => handleTabChange('anime')}
            style={[s.bottomSegmentBtn, activeTab === 'anime' && s.bottomSegmentBtnActive]}
          >
            <Text style={[s.bottomSegmentText, activeTab === 'anime' && s.bottomSegmentTextActive]}>Nonton</Text>
          </Pressable>
          <Pressable 
            onPress={() => handleTabChange('manga')}
            style={[s.bottomSegmentBtn, activeTab === 'manga' && s.bottomSegmentBtnActive]}
          >
            <Text style={[s.bottomSegmentText, activeTab === 'manga' && s.bottomSegmentTextActive]}>Baca</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 100,
    flexDirection: "column",
    paddingHorizontal: Theme.layout.headerPaddingHorizontal, 
    paddingTop: Theme.layout.paddingTopSafe + Theme.layout.headerPaddingTop, 
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8,
  },
  logo: { fontSize: 24, fontWeight: FONT_BOLD, color: "#fff", letterSpacing: -0.5 },
  search: {
    flex: 1,
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, gap: 8,
    marginHorizontal: 12,
  },
  searchText: { color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: "400", flex: 1 },
  bellBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  bottomPillContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 100,
  },
  bottomPill: {
    flexDirection: "row",
    backgroundColor: "rgba(31, 28, 41, 0.8)", // Enhanced glassmorphism-ish
    borderRadius: 28,
    padding: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  bottomSegmentBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 22,
  },
  bottomSegmentBtnActive: {
    backgroundColor: Theme.colors.primary,
  },
  bottomSegmentText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: FONT_BOLD,
  },
  bottomSegmentTextActive: {
    color: "#fff",
  },
});
