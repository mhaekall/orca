import React from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  FlatList,
  StyleSheet,
  Dimensions,
  StatusBar as RNStatusBar,
  Platform,
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { Link, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import useSWR from "swr";
import { Search, Play, Bell, TrendingUp, Flame, Film, Tv, Eye, Star } from "lucide-react-native";
import { LatestGrid } from "../../components/LatestGrid";

const { width: W, height: H } = Dimensions.get("window");
const API = "https://jonyyyyyyyu-anime-scraper-api.hf.space";
const fetcher = (url: string) => fetch(url).then((r) => r.json());

const BG = "#0a0812";
const SURFACE = "#13111a";
const SURFACE2 = "#1a1825";
// Standard Google-like font style (less bold)
const FONT_REGULAR = "400";
const FONT_MEDIUM = "500";
const FONT_SEMIBOLD = "600";
const FONT_BOLD = "700";

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skel({ w, h, r = 12 }: { w: number; h: number; r?: number }) {
  return <View style={{ width: w, height: h, borderRadius: r, backgroundColor: "rgba(255,255,255,0.06)" }} />;
}

function LoadingState() {
  return (
    <View style={{ paddingTop: 0 }}>
      <View style={{ marginBottom: 28 }}>
        <Skel w={W} h={W * 1.4} r={0} />
      </View>
      {[0, 1, 2].map((s) => (
        <View key={s} style={{ marginBottom: 28 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, marginBottom: 12 }}>
            <Skel w={140} h={16} r={6} />
          </View>
          <View style={{ flexDirection: "row", gap: 10, paddingLeft: 16 }}>
            {[0, 1, 2, 3].map((c) => (
              <View key={c} style={{ gap: 6 }}>
                <Skel w={s === 1 ? W * 0.72 : 110} h={s === 1 ? 155 : 158} r={14} />
                {s !== 1 && <Skel w={85} h={10} r={5} />}
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Hero Carousel ─────────────────────────────────────────────────────────────
function HeroCard({ item, width, progress }: { item: any, width: number, progress?: number }) {
  const id = String(item.anilistId || item.id);
  const ep = item.latestEpisode ? String(item.latestEpisode) : "1";
  const img = item.poster || item.img || item.coverImage?.extraLarge || item.coverImage?.large;
  const title = item.title?.english || item.title?.romaji || item.title || "";
  const score = item.score || item.averageScore;
  const views = item.views || 0;
  
  return (
    <Link href={`/watch/${id}/${ep}` as any} asChild>
      <Pressable style={[s.hero, { width }]}>
        <Image 
          source={{ uri: img }} 
          style={StyleSheet.absoluteFillObject} 
          contentFit="cover" 
          transition={400} 
        />
        <LinearGradient 
          colors={["rgba(10,8,18,0.4)", "transparent", "rgba(10,8,18,0.8)", BG]} 
          locations={[0, 0.3, 0.7, 1]} 
          style={StyleSheet.absoluteFillObject} 
        />
        
        <View style={s.heroBottom}>
          <Text style={s.heroTitle} numberOfLines={2}>{title}</Text>
          
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            <View style={{ backgroundColor: "#FF2D55", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <Text style={{ color: "#fff", fontSize: 9, fontWeight: FONT_BOLD, letterSpacing: 0.5 }}>NEW</Text>
            </View>
            <View style={{ backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: FONT_SEMIBOLD }}>Episode {ep}</Text>
            </View>
            {views > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Eye size={12} color="rgba(255,255,255,0.7)" />
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: FONT_MEDIUM }}>
                  {views > 1000 ? (views/1000).toFixed(1) + 'K' : views}
                </Text>
              </View>
            )}
            {score ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Star size={12} color="#FFD60A" fill="#FFD60A" />
                <Text style={{ color: "#FFD60A", fontSize: 11, fontWeight: FONT_BOLD }}>
                  {(score / 10).toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={s.heroPlayBtnContainer}>
            <View style={s.heroPlayBtn}>
              <Play size={16} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
            </View>
            {/* Progress Bar under play button */}
            {progress !== undefined && (
              <View style={s.heroProgressBg}>
                <Animated.View style={[s.heroProgressFill, { width: `${progress * 100}%` }]} />
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

function HeroCarousel({ items }: { items: any[] }) {
  const scrollRef = React.useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const progressAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isPaused || items.length <= 1) {
      progressAnim.stopAnimation();
      return;
    }

    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 5000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        const nextIndex = (currentIndex + 1) % items.length;
        scrollRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        setCurrentIndex(nextIndex);
      }
    });

    return () => progressAnim.stopAnimation();
  }, [currentIndex, isPaused, items.length]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / W);
    if (index !== currentIndex) {
      setCurrentIndex(index);
      progressAnim.setValue(0); // Reset progress on manual scroll
    }
  };

  return (
    <View style={{ marginBottom: 32 }}>
      <FlatList
        ref={scrollRef}
        data={items}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        onScrollBeginDrag={() => setIsPaused(true)}
        onMomentumScrollEnd={() => setIsPaused(false)}
        keyExtractor={(item) => String(item.anilistId || item.id)}
        renderItem={({ item, index }) => (
          <HeroCard 
            item={item} 
            width={W} 
            progress={index === currentIndex ? (progressAnim as any).__getValue() : 0} 
          />
        )}
      />
    </View>
  );
}

// ── Spotlight: 1 big + 2 stacked ─────────────────────────────────────────────
function SpotlightRow({ items }: { items: any[] }) {
  if (items.length < 3) return null;
  return (
    <View style={{ flexDirection: "row", gap: 10, height: 230, paddingHorizontal: 16 }}>
      <View style={{ flex: 1.5 }}>
        {[items[0]].map((item, i) => {
          const id = String(item.anilistId || item.id);
          const img = item.img || item.coverImage?.extraLarge;
          const title = item.title?.english || item.title?.romaji || item.title || "";
          return (
            <Link key={id} href={`/anime/${id}` as any} asChild>
              <Pressable style={s.spotBig}>
                <Image source={{ uri: img }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={300} />
                <LinearGradient colors={["transparent", "rgba(10,8,18,0.95)"]} style={StyleSheet.absoluteFillObject} />
                <View style={s.spotBigBadge}><Text style={s.spotBigBadgeText}>#1 TRENDING</Text></View>
                <Text style={s.spotBigTitle} numberOfLines={2}>{title}</Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
      <View style={{ flex: 1, flexDirection: "column", gap: 10 }}>
        {items.slice(1, 3).map((item, i) => {
          const id = String(item.anilistId || item.id);
          const img = item.img || item.coverImage?.extraLarge;
          const title = item.title?.english || item.title?.romaji || item.title || "";
          return (
            <Link key={id} href={`/anime/${id}` as any} asChild>
              <Pressable style={s.spotSmall}>
                <Image source={{ uri: img }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={300} />
                <LinearGradient colors={["transparent", "rgba(10,8,18,0.9)"]} style={StyleSheet.absoluteFillObject} />
                <View style={s.spotSmallBadge}><Text style={s.spotSmallBadgeText}>#{i + 2}</Text></View>
                <Text style={s.spotSmallTitle} numberOfLines={2}>{title}</Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

// ── Wide Row (landscape 16:9) ─────────────────────────────────────────────────
function WideRow({ items }: { items: any[] }) {
  const CW = W * 0.72;
  return (
    <FlatList
      data={items.slice(0, 10)} horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}
      keyExtractor={(item, i) => String(item.anilistId || item.id || i)}
      renderItem={({ item }) => {
        const id = String(item.anilistId || item.id);
        const ep = item.latestEpisode ? String(item.latestEpisode) : "1";
        const img = item.banner || item.bannerImage || item.img || item.coverImage?.extraLarge;
        const title = item.title?.english || item.title?.romaji || item.title || "";
        const score = item.score || item.averageScore;
        return (
          <Link href={`/watch/${id}/${ep}` as any} asChild>
            <Pressable style={[s.wideCard, { width: CW }]}>
              <Image source={{ uri: img }} style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]} contentFit="cover" transition={300} />
              <LinearGradient colors={["transparent", "rgba(10,8,18,0.95)"]} locations={[0.35, 1]} style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]} />
              <View style={s.wideContent}>
                <Text style={s.wideTitle} numberOfLines={1}>{title}</Text>
                <View style={s.wideMeta}>
                  {score ? <Text style={s.wideScore}>★ {(score / 10).toFixed(1)}</Text> : null}
                  <View style={s.widePlayBtn}>
                    <Play size={11} color="#000" fill="#000" />
                    <Text style={s.widePlayText}>EP {ep}</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          </Link>
        );
      }}
    />
  );
}

// ── Vertical Small Row ────────────────────────────────────────────────────────
function VertRow({ items, showRank, cw = 110, ch = 158 }: { items: any[]; showRank?: boolean; cw?: number; ch?: number }) {
  return (
    <FlatList
      data={items.slice(0, 15)} horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}
      keyExtractor={(item, i) => String(item.anilistId || item.id || i)}
      renderItem={({ item, index }) => {
        const id = String(item.anilistId || item.id);
        const ep = item.latestEpisode ? String(item.latestEpisode) : "1";
        const img = item.img || item.coverImage?.extraLarge;
        const title = item.title?.english || item.title?.romaji || item.title || "";
        return (
          <Link href={`/anime/${id}` as any} asChild>
            <Pressable style={{ width: cw, marginRight: 10 }}>
              <View style={{ height: ch, borderRadius: 12, overflow: "hidden", backgroundColor: SURFACE, marginBottom: 8 }}>
                <Image source={{ uri: img }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={300} />
                <LinearGradient colors={["transparent", "rgba(10,8,18,0.85)"]} style={StyleSheet.absoluteFillObject} />
                {showRank && <Text style={s.rankNum}>#{index + 1}</Text>}
                <View style={s.epBadge}><Text style={s.epBadgeText}>EP {ep}</Text></View>
              </View>
              <Text style={s.cardTitle} numberOfLines={2}>{title}</Text>
            </Pressable>
          </Link>
        );
      }}
    />
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
// Removed icon and simplified text
function SecHeader({ label }: { label: string }) {
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
      <Text style={{ color: "#fff", fontSize: 18, fontWeight: FONT_SEMIBOLD, letterSpacing: -0.2 }}>{label}</Text>
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const { data, isLoading, isValidating, mutate } = useSWR(`${API}/api/v2/home?v=3`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const scrollY = React.useRef(new Animated.Value(0)).current;
  const headerBg = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: ["rgba(19, 17, 26, 0)", "rgba(19, 17, 26, 0.95)"], // from transparent to #13111a
    extrapolate: "clamp",
  });

  const d = data?.data || {};
  const latest: any[] = d.latest || [];
  const airing: any[] = d.airing || [];
  const popular: any[] = d.popular || [];
  const topRated: any[] = d.top_rated || [];
  const completed: any[] = d.completed || [];
  const movies: any[] = d.movies || [];

  const trendMap = new Map();
  [...popular, ...topRated].forEach((i) => { const k = String(i.anilistId || i.id); if (!trendMap.has(k)) trendMap.set(k, i); });
  const trending = Array.from(trendMap.values());

  const ongoingMap = new Map();
  [...latest, ...airing].forEach((i) => { const k = String(i.anilistId || i.id); if (!ongoingMap.has(k)) ongoingMap.set(k, i); });
  const ongoing = Array.from(ongoingMap.values());

  const heroOngoing = ongoing.slice(0, 5);
  const gridOngoing = ongoing.slice(5);

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar style="light" />

      {/* Fixed header with Search Bar integrated */}
      <Animated.View style={[s.header, { backgroundColor: headerBg }]}>
        <Text style={s.logo}>orca</Text>
        
        {/* Search integrated into header */}
        <Pressable onPress={() => router.push("/explore" as any)} style={s.search}>
          <Search size={16} color="rgba(255,255,255,0.4)" />
          <Text style={s.searchText}>Cari anime...</Text>
        </Pressable>

        <Pressable onPress={() => router.push("/notifications" as any)} style={s.bellBtn}>
          <Bell size={21} color="rgba(255,255,255,0.8)" />
        </Pressable>
      </Animated.View>

      {isLoading ? (
        <LoadingState />
      ) : (
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={isValidating && !!data}
              onRefresh={() => mutate()}
              tintColor="#fff"
              colors={["#0A84FF"]}
              progressViewOffset={80}
            />
          }
        >
          {/* Hero Carousel (Full Width) */}
          {heroOngoing.length > 0 && (
            <HeroCarousel items={heroOngoing} />
          )}

          {/* Sisa Sedang Tayang — Grid 3x3 */}
          {gridOngoing.length > 0 && (
            <LatestGrid title="" items={gridOngoing} badge="NEW" />
          )}

          {/* Trending — Spotlight */}
          {trending.length >= 3 && (
            <View style={{ marginBottom: 32 }}>
              <SecHeader label="Trending" />
              <SpotlightRow items={trending} />
            </View>
          )}

          {/* Populer — Vertical with rank */}
          {popular.length > 0 && (
            <View style={{ marginBottom: 32 }}>
              <SecHeader label="Terpopuler" />
              <VertRow items={popular} showRank />
            </View>
          )}

          {/* Top Rated — Vertical slightly wider */}
          {topRated.length > 0 && (
            <View style={{ marginBottom: 32 }}>
              <SecHeader label="Skor Tertinggi" />
              <VertRow items={topRated} cw={120} ch={172} />
            </View>
          )}

          {/* Film — Wide */}
          {movies.length > 0 && (
            <View style={{ marginBottom: 32 }}>
              <SecHeader label="Film Anime" />
              <WideRow items={movies} />
            </View>
          )}

          {/* Tamat — Vertical compact */}
          {completed.length > 0 && (
            <View style={{ marginBottom: 32 }}>
              <SecHeader label="Sudah Tamat" />
              <VertRow items={completed} cw={100} ch={144} />
            </View>
          )}
        </Animated.ScrollView>
      )}
    </View>
  );
}

const paddingTopSafe = Platform.OS === 'android' ? RNStatusBar.currentHeight || 24 : 50;

const s = StyleSheet.create({
  header: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 100,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: paddingTopSafe + 10, paddingBottom: 16,
  },
  logo: { fontSize: 24, fontWeight: FONT_BOLD, color: "#fff", letterSpacing: -0.5 },
  bellBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  search: {
    flex: 1,
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, gap: 8,
  },
  searchText: { color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: FONT_REGULAR },
  // Hero fills the entire top area using poster aspect ratio (approx 3:4)
  hero: { aspectRatio: 3/4, overflow: "hidden", backgroundColor: SURFACE },
  heroBottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingTop: 40 },
  heroTitle: { color: "#fff", fontSize: 28, fontWeight: FONT_BOLD, letterSpacing: -0.5, marginBottom: 8, lineHeight: 34, paddingRight: 50 },
  heroPlayBtnContainer: {
    position: "absolute", bottom: 20, right: 20, alignItems: "center"
  },
  heroPlayBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#0A84FF", alignItems: "center", justifyContent: "center",
    elevation: 4, shadowColor: "#0A84FF", shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
    marginBottom: 8
  },
  heroProgressBg: { width: 30, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)", overflow: "hidden" },
  heroProgressFill: { height: "100%", backgroundColor: "#fff" },
  spotBig: {
    flex: 1, borderRadius: 16, overflow: "hidden",
    backgroundColor: SURFACE, justifyContent: "flex-end", padding: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.05)"
  },
  spotBigBadge: {
    position: "absolute", top: 12, left: 12,
    backgroundColor: "#FF9F0A", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  spotBigBadgeText: { color: "#000", fontSize: 9, fontWeight: FONT_BOLD, letterSpacing: 0.5 },
  spotBigTitle: { color: "#fff", fontSize: 14, fontWeight: FONT_SEMIBOLD, lineHeight: 20 },
  spotSmall: {
    flex: 1, borderRadius: 12, overflow: "hidden",
    backgroundColor: SURFACE, justifyContent: "flex-end", padding: 10,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.05)"
  },
  spotSmallBadge: {
    position: "absolute", top: 8, left: 8,
    backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4,
  },
  spotSmallBadgeText: { color: "#fff", fontSize: 9, fontWeight: FONT_BOLD },
  spotSmallTitle: { color: "#fff", fontSize: 12, fontWeight: FONT_MEDIUM, lineHeight: 16 },
  wideCard: { height: 165, borderRadius: 16, overflow: "hidden", backgroundColor: SURFACE, marginRight: 12, justifyContent: "flex-end", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  wideContent: { padding: 14 },
  wideTitle: { color: "#fff", fontSize: 14, fontWeight: FONT_SEMIBOLD, marginBottom: 6 },
  wideMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  wideScore: { color: "#FFD60A", fontSize: 12, fontWeight: FONT_MEDIUM },
  widePlayBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  widePlayText: { color: "#000", fontSize: 11, fontWeight: FONT_BOLD },
  rankNum: { position: "absolute", top: 6, left: 8, color: "#fff", fontSize: 24, fontWeight: FONT_BOLD, opacity: 0.9, letterSpacing: -1 },
  epBadge: {
    position: "absolute", bottom: 8, right: 8,
    backgroundColor: "rgba(0,0,0,0.7)", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4,
  },
  epBadgeText: { color: "#fff", fontSize: 10, fontWeight: FONT_MEDIUM },
  cardTitle: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: FONT_MEDIUM, lineHeight: 18, marginTop: 8, minHeight: 36 },
});