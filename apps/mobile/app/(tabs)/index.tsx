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
import useSWR, { mutate } from "swr";
import { Search, Play, Bell, TrendingUp, Flame, Film, Tv, Eye, Star, ChevronRight } from "lucide-react-native";
import { LatestGrid } from "../../components/LatestGrid";
import { useAuth } from "../../lib/auth";

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

function formatViews(v: number): string {
  if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
  if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
  return v.toString();
}

const prefetchAnime = (id: string) => {
  mutate(`${API}/api/v2/anime/${id}`);
};

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skel({ w, h, r = 12 }: { w: number; h: number; r?: number }) {
  const pulseAnim = React.useRef(new Animated.Value(0.4)).current;

  React.useEffect(() => {
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
        })
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <Animated.View 
      style={{ 
        width: w, 
        height: h, 
        borderRadius: r, 
        backgroundColor: "rgba(255,255,255,0.1)",
        opacity: pulseAnim 
      }} 
    />
  );
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

// ── Hero ──────────────────────────────────────────────────────────────────────
function HeroCard({ item }: { item: any }) {
  const id = String(item.anilistId || item.id);
  const ep = item.latestEpisode ? String(item.latestEpisode) : "1";
  // Use poster image instead of banner
  const img = item.poster || item.img || item.coverImage?.extraLarge || item.coverImage?.large;
  const title = item.title?.english || item.title?.romaji || item.title || "";
  const score = item.score || item.averageScore;
  const views = item.views || 0;
  
  return (
    <Link href={`/watch/${id}/${ep}` as any} asChild>
      <Pressable style={s.hero} onPressIn={() => prefetchAnime(id)}>
        <Image 
          source={{ uri: img }} 
          style={StyleSheet.absoluteFillObject} 
          contentFit="cover" 
          transition={400} 
        />
        <LinearGradient 
          colors={["rgba(10,8,18,0.4)", "transparent", "rgba(10,8,18,0.7)", BG]} 
          locations={[0, 0.3, 0.7, 1]} 
          style={StyleSheet.absoluteFillObject} 
        />
        
        <View style={s.heroBottom}>
          {/* Premium Abstract Calligraphy Badge (Edge & Larger) */}
          <View style={{ alignSelf: 'flex-start', marginBottom: 12, marginLeft: -20, position: 'relative' }}>
            {/* Background shape (smaller and separated from text) */}
            <View style={{
              position: 'absolute',
              top: 16, bottom: 4, left: 0, right: 20, // Mengecilkan bg dari atas dan kanan (seperti sapuan highlighter)
              backgroundColor: '#FF2D55', 
              transform: [{ rotate: '-3deg' }, { skewX: '-12deg' }],
              borderTopRightRadius: 4, borderBottomRightRadius: 16,
              shadowColor: '#FF2D55', shadowOpacity: 0.8, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
            }} />
            
            {/* Text on top */}
            <Text style={{
              color: '#fff', fontSize: 24, 
              paddingHorizontal: 22, paddingVertical: 8,
              fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'cursive',
              fontWeight: 'bold', fontStyle: 'italic',
              textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4,
            }}>
              Tayang Terbaru
            </Text>
          </View>

          <Text style={s.heroTitle} numberOfLines={2}>{title}</Text>
          
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: -4 }}>
            {views > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Eye size={12} color="rgba(255,255,255,0.7)" />
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: FONT_MEDIUM }}>
                  {formatViews(views)}
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
            <View style={{ backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: FONT_BOLD }}>
                EPS {ep}
              </Text>
            </View>
          </View>

          <View style={s.heroPlayBtn}>
            <Play size={16} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

// ── Spotlight: 1 big + 2 stacked (Scrollable chunks) ────────────────────────
function SpotlightRow({ items }: { items: any[] }) {
  if (items.length === 0) return null;
  
  const listData = [];
  if (items.length > 0) {
    listData.push({ type: 'big', item: items[0], rank: 1 });
  }
  for (let i = 1; i < items.length; i += 2) {
    if (items[i]) {
      listData.push({
        type: 'stacked',
        items: items.slice(i, i + 2),
        startRank: i + 1,
      });
    }
  }

  const BIG_W = W * 0.55;
  const SMALL_W = W * 0.35;

  return (
    <FlatList
      data={listData}
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      contentContainerStyle={{ paddingLeft: 16, paddingRight: 6 }}
      keyExtractor={(_, i) => String(i)}
      renderItem={({ item: chunk }) => {
        if (chunk.type === 'big') {
          const item = chunk.item;
          const id = String(item.anilistId || item.id);
          const img = item.img || item.coverImage?.extraLarge;
          const title = item.title?.english || item.title?.romaji || item.title || "";
          const score = item.score || item.averageScore;
          const views = item.views || 0;
          return (
            <View style={{ width: BIG_W, height: 230, marginRight: 10 }}>
              <Link key={id} href={`/anime/${id}` as any} asChild>
                <Pressable style={s.spotBig} onPressIn={() => prefetchAnime(id)}>
                  <Image source={{ uri: img }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={300} />
                  <LinearGradient colors={["transparent", "rgba(10,8,18,0.95)"]} style={StyleSheet.absoluteFillObject} />
                  <View style={s.spotBigBadge}><Text style={s.spotBigBadgeText}>#{chunk.rank} TRENDING</Text></View>
                  <Text style={s.spotBigTitle} numberOfLines={2}>{title}</Text>
                  
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                    {score ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <Star size={11} color="#FFD60A" fill="#FFD60A" />
                        <Text style={{ color: "#FFD60A", fontSize: 11, fontWeight: FONT_BOLD }}>
                          {(score / 10).toFixed(1)}
                        </Text>
                      </View>
                    ) : null}
                    {views > 0 && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <Eye size={11} color="rgba(255,255,255,0.6)" />
                        <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: FONT_MEDIUM }}>
                          {formatViews(views)}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              </Link>
            </View>
          );
        }

        if (chunk.type === 'stacked') {
          return (
            <View style={{ width: SMALL_W, height: 230, marginRight: 10, flexDirection: "column", gap: 10 }}>
              {chunk.items.map((item, i) => {
                const id = String(item.anilistId || item.id);
                const img = item.img || item.coverImage?.extraLarge;
                const title = item.title?.english || item.title?.romaji || item.title || "";
                const score = item.score || item.averageScore;
                const views = item.views || 0;
                return (
                  <Link key={id} href={`/anime/${id}` as any} asChild>
                    <Pressable style={s.spotSmall} onPressIn={() => prefetchAnime(id)}>
                      <Image source={{ uri: img }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={300} />
                      <LinearGradient colors={["transparent", "rgba(10,8,18,0.9)"]} style={StyleSheet.absoluteFillObject} />
                      <View style={s.spotSmallBadge}><Text style={s.spotSmallBadgeText}>#{chunk.startRank + i}</Text></View>
                      <Text style={s.spotSmallTitle} numberOfLines={2}>{title}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                        {score ? (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                            <Star size={9} color="#FFD60A" fill="#FFD60A" />
                            <Text style={{ color: "#FFD60A", fontSize: 9, fontWeight: FONT_BOLD }}>
                              {(score / 10).toFixed(1)}
                            </Text>
                          </View>
                        ) : null}
                        {views > 0 && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                            <Eye size={9} color="rgba(255,255,255,0.6)" />
                            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 9, fontWeight: FONT_MEDIUM }}>
                              {formatViews(views)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </Pressable>
                  </Link>
                );
              })}
            </View>
          );
        }
        
        return null;
      }}
    />
  );
}

// ── Wide Row (List View) ──────────────────────────────────────────────────────
function WideRow({ items }: { items: any[] }) {
  return (
    <View style={{ paddingHorizontal: 16, gap: 16 }}>
      {items.slice(0, 5).map((item, i) => {
        const id = String(item.anilistId || item.id);
        const img = item.poster || item.img || item.coverImage?.extraLarge || item.banner;
        const title = item.title?.english || item.title?.romaji || item.title || "";
        const score = item.score || item.averageScore;
        const views = item.views || 0;
        const genres = item.genres || [];
        const firstGenre = genres.length > 0 ? genres[0] : "";

        return (
          <View key={String(id || i)} style={{ width: "100%", height: 130 }}>
            <Link href={`/anime/${id}` as any} asChild>
              <Pressable style={{ flex: 1, flexDirection: "row", backgroundColor: SURFACE2, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }} onPressIn={() => prefetchAnime(id)}>
                <View style={{ width: 100, height: "100%", backgroundColor: BG }}>
                  <Image source={{ uri: img }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={300} />
                  <LinearGradient colors={["transparent", "rgba(10,8,18,0.8)"]} style={StyleSheet.absoluteFillObject} />
                  {/* Smooth horizontal transition blending into SURFACE2 */}
                  <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={["transparent", "transparent", SURFACE2]} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFillObject} />
                </View>
                
                <View style={{ flex: 1, padding: 14, justifyContent: "center", paddingLeft: 4 }}>
                  <Text style={{ color: "#fff", fontSize: 14, fontWeight: FONT_SEMIBOLD, marginBottom: 6, lineHeight: 20 }} numberOfLines={2}>
                    {title}
                  </Text>
                  
                  <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                     {score ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                          <Star size={11} color="#FFD60A" fill="#FFD60A" />
                          <Text style={{ color: "#FFD60A", fontSize: 11, fontWeight: FONT_BOLD }}>
                            {(score / 10).toFixed(1)}
                          </Text>
                        </View>
                      ) : null}

                      {views > 0 && (
                        <>
                          <Text style={{ color: "rgba(255,255,255,0.2)", fontSize: 10 }}>•</Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                            <Eye size={11} color="rgba(255,255,255,0.6)" />
                            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: FONT_MEDIUM }}>
                              {formatViews(views)}
                            </Text>
                          </View>
                        </>
                      )}

                      {firstGenre ? (
                        <>
                          <Text style={{ color: "rgba(255,255,255,0.2)", fontSize: 10 }}>•</Text>
                          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: FONT_MEDIUM }}>
                            {firstGenre}
                          </Text>
                        </>
                      ) : null}
                  </View>

                  <View style={{ alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                    <Text style={{ color: "#fff", fontSize: 10, fontWeight: FONT_BOLD, letterSpacing: 0.5 }}>LIHAT DETAIL</Text>
                  </View>
                </View>
              </Pressable>
            </Link>
          </View>
        );
      })}
    </View>
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
        const score = item.score || item.averageScore;
        const views = item.views || 0;
        return (
          <Link href={`/anime/${id}` as any} asChild>
            <Pressable style={{ width: cw, marginRight: 10 }} onPressIn={() => prefetchAnime(id)}>
              <View style={{ height: ch, borderRadius: 12, overflow: "hidden", backgroundColor: SURFACE, marginBottom: 8 }}>
                <Image source={{ uri: img }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={300} />
                <LinearGradient colors={["transparent", "rgba(10,8,18,0.85)"]} style={StyleSheet.absoluteFillObject} />
                {showRank && <Text style={s.rankNum}>#{index + 1}</Text>}
                <View style={s.epBadge}><Text style={s.epBadgeText}>EP {ep}</Text></View>
              </View>
              <Text style={s.cardTitle} numberOfLines={2}>{title}</Text>
              
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                 {score ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <Star size={10} color="#FFD60A" fill="#FFD60A" />
                      <Text style={{ color: "#FFD60A", fontSize: 10, fontWeight: FONT_BOLD }}>
                        {(score / 10).toFixed(1)}
                      </Text>
                    </View>
                  ) : null}
                  {views > 0 && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <Eye size={10} color="rgba(255,255,255,0.6)" />
                      <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: FONT_MEDIUM }}>
                        {formatViews(views)}
                      </Text>
                    </View>
                  )}
              </View>
            </Pressable>
          </Link>
        );
      }}
    />
  );
}

function formatDuration(sec: number) {
  if (!sec) return "0m";
  const m = Math.floor(sec / 60);
  return `${m}m`;
}

// ── Watch History Row ─────────────────────────────────────────────────────────
function WatchHistoryRow({ items }: { items: any[] }) {
  const router = useRouter();
  if (!items || items.length === 0) return null;

  return (
    <View style={{ marginBottom: 32 } as any}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 12 }}>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: FONT_SEMIBOLD, letterSpacing: -0.2 }}>Lanjutkan Menonton</Text>
        <Pressable onPress={() => router.push("/collection")} style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ color: "#0A84FF", fontSize: 12, fontWeight: FONT_BOLD, marginRight: 2 }}>Selengkapnya</Text>
          <ChevronRight size={14} color="#0A84FF" />
        </Pressable>
      </View>
      <FlatList<any>
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 } as any}
        data={items.slice(0, 8)}
        keyExtractor={(item: any, index: number) => String(item.anilistId || item.animeSlug || '') + '-' + String(item.episode || '') + '-' + index}
        renderItem={({ item }: any) => {
          const id = String(item.animeSlug || item.anilistId);
          const title = item.cleanTitle || item.nativeTitle || `Anime #${id}`;
          const img = item.coverImage || "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/default.jpg";
          const ep = item.episode || "?";
          const ts = item.timestampSec || 0;
          const dur = item.durationSec || 0;
          const pct = dur > 0 ? Math.min(100, Math.max(0, (ts / dur) * 100)) : 0;

          return (
            <Link href={`/watch/${id}/${ep}` as any} asChild>
              <Pressable style={{ width: 160 } as any}>
                <View style={{ height: 90, borderRadius: 10, overflow: "hidden", backgroundColor: SURFACE2, marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" } as any}>
                  <Image source={{ uri: img }} style={StyleSheet.absoluteFillObject as any} contentFit="cover" />
                  <LinearGradient colors={["transparent", "rgba(10,8,18,0.9)"]} style={StyleSheet.absoluteFillObject as any} />
                  
                  <View style={{ position: "absolute", top: '35%', left: '40%' } as any}>
                     <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' } as any}>
                       <Play size={14} color="#fff" fill="#fff" style={{ marginLeft: 2 } as any} />
                     </View>
                  </View>

                  <View style={{ position: "absolute", bottom: 0, left: 0, right: 0 } as any}>
                    {dur > 0 && (
                      <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.2)' } as any}>
                        <View style={{ height: '100%', backgroundColor: '#0A84FF', width: `${pct}%` } as any} />
                      </View>
                    )}
                  </View>
                  <View style={{ position: "absolute", top: 6, right: 6, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 } as any}>
                     <Text style={{ color: "#fff", fontSize: 9, fontWeight: FONT_BOLD } as any}>EPS {ep}</Text>
                  </View>
                </View>
                
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: FONT_SEMIBOLD, marginBottom: 2, lineHeight: 16 } as any} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: FONT_MEDIUM } as any}>
                   Tersisa {dur > 0 ? formatDuration(dur - ts) : "..."}
                </Text>
              </Pressable>
            </Link>
          );
        }}
      />
    </View>
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
  const { user } = useAuth();
  const userId = user?.id || user?.email;

  const { data, isLoading, isValidating, error, mutate } = useSWR(`${API}/api/v2/home?v=3`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const { data: historyRes } = useSWR(
    userId ? `${API}/api/v2/social/progress?user_id=${userId}` : null,
    fetcher,
    { revalidateOnFocus: true }
  );
  
  const historyItems = React.useMemo(() => {
    const raw = Array.isArray(historyRes) ? historyRes : [];
    const grouped = new Map();
    raw.forEach((item: any) => {
      const id = String(item.anilistId || item.animeSlug);
      const existing = grouped.get(id);
      if (!existing || new Date(item.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
        grouped.set(id, item);
      }
    });
    return Array.from(grouped.values()).sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [historyRes]);

  const scrollY = React.useRef(new Animated.Value(0)).current;
  const headerBg = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: ["rgba(10, 8, 18, 0)", "rgba(10, 8, 18, 1)"], // from transparent to solid #0a0812
    extrapolate: "clamp",
  });

  const d = data?.data || {};
  const latest: any[] = d.latest || [];
  const airing: any[] = d.airing || [];
  const popular: any[] = d.popular || [];
  const topRated: any[] = d.top_rated || [];
  const completed: any[] = d.completed || [];
  const movies: any[] = d.movies || [];

  const hero = airing[0] || latest[0];

  const trendMap = new Map();
  [...popular, ...topRated].forEach((i) => { const k = String(i.anilistId || i.id); if (!trendMap.has(k)) trendMap.set(k, i); });
  const trending = Array.from(trendMap.values());

  const ongoingMap = new Map();
  [...latest, ...airing].forEach((i) => { const k = String(i.anilistId || i.id); if (!ongoingMap.has(k)) ongoingMap.set(k, i); });
  const ongoing = Array.from(ongoingMap.values());

  const isError = error || (!isLoading && !d.latest && !d.airing && !d.popular);

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
      ) : isError ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,59,48,0.1)", justifyContent: "center", alignItems: "center", marginBottom: 20 }}>
            <Tv size={28} color="#FF3B30" />
          </View>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "center" }}>Gagal Memuat Beranda</Text>
          <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 }}>Terjadi kesalahan saat mengambil data dari server. Silakan coba lagi.</Text>
          <Pressable 
            onPress={() => mutate()} 
            style={{ backgroundColor: "#0A84FF", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <RefreshControl refreshing={isValidating} tintColor="transparent" style={{ display: 'none' }} />
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>Coba Lagi</Text>
          </Pressable>
        </View>
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
          {/* Hero (Full Width, fills top edge) */}
          {hero && (
            <View style={{ marginBottom: 16 }}>
              <HeroCard item={hero} />
            </View>
          )}

          {/* Riwayat Ditonton (Watch History) */}
          <WatchHistoryRow items={historyItems} />

          {/* Sedang Tayang — Grid 3x3 */}
          {ongoing.length > 0 && (
            <LatestGrid title="" items={ongoing} badge="NEW" />
          )}

          {/* Trending & Populer — Spotlight */}
          {trending.length >= 3 && (
            <View style={{ marginBottom: 32 }}>
              <SecHeader label="Trending & Populer" />
              <SpotlightRow items={trending} />
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
  hero: { width: "100%", aspectRatio: 3/4, overflow: "hidden", backgroundColor: SURFACE },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 12, alignSelf: "flex-start", marginBottom: 10,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#32D74B" },
  heroBadgeText: { color: "#fff", fontSize: 9, fontWeight: FONT_BOLD, letterSpacing: 0.5 },
  heroBottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingTop: 40 },
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: FONT_BOLD, letterSpacing: -0.5, marginBottom: 8, lineHeight: 28, paddingRight: 60 },
  heroPlayBtn: {
    position: "absolute", bottom: 16, right: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#0A84FF", alignItems: "center", justifyContent: "center",
    elevation: 4, shadowColor: "#0A84FF", shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }
  },
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