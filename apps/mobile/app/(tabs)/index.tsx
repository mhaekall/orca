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
} from "react-native";
import { Image } from "expo-image";
import { Link, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import useSWR from "swr";
import { Search, Play, Bell, TrendingUp, Flame, Film, Tv } from "lucide-react-native";

const { width: W } = Dimensions.get("window");
const API = "https://jonyyyyyyyu-anime-scraper-api.hf.space";
const fetcher = (url: string) => fetch(url).then((r) => r.json());

const BG = "#0a0812";
const SURFACE = "#13111a";
const SURFACE2 = "#1a1825";

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skel({ w, h, r = 12 }: { w: number; h: number; r?: number }) {
  return <View style={{ width: w, height: h, borderRadius: r, backgroundColor: "rgba(255,255,255,0.06)" }} />;
}

function LoadingState() {
  return (
    <View style={{ paddingTop: 130 }}>
      <View style={{ paddingHorizontal: 16, marginBottom: 28 }}>
        <Skel w={W - 32} h={220} r={20} />
      </View>
      {[0, 1, 2].map((s) => (
        <View key={s} style={{ marginBottom: 28 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, marginBottom: 12 }}>
            <Skel w={26} h={26} r={8} />
            <Skel w={140} h={14} r={6} />
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
  const img = item.banner || item.bannerImage || item.img || item.coverImage?.extraLarge;
  const title = item.title?.english || item.title?.romaji || item.title || "";
  return (
    <Link href={`/watch/${id}/${ep}` as any} asChild>
      <Pressable style={s.hero}>
        <Image source={{ uri: img }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={400} />
        <LinearGradient colors={["transparent", "rgba(10,8,18,0.5)", "rgba(10,8,18,0.97)"]} locations={[0.2, 0.6, 1]} style={StyleSheet.absoluteFillObject} />
        <View style={s.heroBadge}>
          <View style={s.liveDot} />
          <Text style={s.heroBadgeText}>EP {ep} TERSEDIA</Text>
        </View>
        <View style={s.heroBottom}>
          <Text style={s.heroTitle} numberOfLines={2}>{title}</Text>
          <View style={s.heroPlayBtn}>
            <Play size={13} color="#000" fill="#000" />
            <Text style={s.heroPlayText}>Tonton Sekarang</Text>
          </View>
        </View>
      </Pressable>
    </Link>
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
              <View style={{ height: ch, borderRadius: 14, overflow: "hidden", backgroundColor: SURFACE, marginBottom: 6 }}>
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
function SecHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 16, marginBottom: 12 }}>
      <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </View>
      <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: -0.3 }}>{label}</Text>
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

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar style="light" />

      {/* Fixed header */}
      <View style={s.header}>
        <Text style={s.logo}>orca</Text>
        <Pressable onPress={() => router.push("/notifications" as any)} style={s.bellBtn}>
          <Bell size={21} color="rgba(255,255,255,0.8)" />
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingState />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110, paddingTop: 116 }}
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
          {/* Search */}
          <Pressable onPress={() => router.push("/explore" as any)} style={s.search}>
            <Search size={15} color="rgba(255,255,255,0.3)" />
            <Text style={s.searchText}>Cari anime, genre, studio...</Text>
          </Pressable>

          {/* Hero */}
          {hero && (
            <View style={{ paddingHorizontal: 16, marginBottom: 28 }}>
              <HeroCard item={hero} />
            </View>
          )}

          {/* Trending — Spotlight */}
          {trending.length >= 3 && (
            <View style={{ marginBottom: 28 }}>
              <SecHeader icon={<TrendingUp size={14} color="#FF9F0A" />} label="Trending" />
              <SpotlightRow items={trending} />
            </View>
          )}

          {/* Sedang Tayang — Wide */}
          {ongoing.length > 0 && (
            <View style={{ marginBottom: 28 }}>
              <SecHeader icon={<Flame size={14} color="#FF453A" />} label="Sedang Tayang" />
              <WideRow items={ongoing} />
            </View>
          )}

          {/* Populer — Vertical with rank */}
          {popular.length > 0 && (
            <View style={{ marginBottom: 28 }}>
              <SecHeader icon={<TrendingUp size={14} color="#30D158" />} label="Terpopuler" />
              <VertRow items={popular} showRank />
            </View>
          )}

          {/* Top Rated — Vertical slightly wider */}
          {topRated.length > 0 && (
            <View style={{ marginBottom: 28 }}>
              <SecHeader icon={<TrendingUp size={14} color="#FFD60A" />} label="Skor Tertinggi" />
              <VertRow items={topRated} cw={120} ch={172} />
            </View>
          )}

          {/* Film — Wide */}
          {movies.length > 0 && (
            <View style={{ marginBottom: 28 }}>
              <SecHeader icon={<Film size={14} color="#BF5AF2" />} label="Film Anime" />
              <WideRow items={movies} />
            </View>
          )}

          {/* Tamat — Vertical compact */}
          {completed.length > 0 && (
            <View style={{ marginBottom: 28 }}>
              <SecHeader icon={<Tv size={14} color="#64D2FF" />} label="Sudah Tamat" />
              <VertRow items={completed} cw={100} ch={144} />
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 100,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 54, paddingBottom: 12,
    backgroundColor: "rgba(10,8,18,0.85)",
  },
  logo: { fontSize: 26, fontWeight: "900", color: "#fff", letterSpacing: -1 },
  bellBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  search: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginBottom: 20,
    backgroundColor: SURFACE2, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  searchText: { color: "rgba(255,255,255,0.3)", fontSize: 14, fontWeight: "500" },
  hero: { width: "100%", height: 240, borderRadius: 24, overflow: "hidden", backgroundColor: SURFACE, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  heroBadge: {
    position: "absolute", top: 16, left: 16,
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#32D74B" },
  heroBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  heroBottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20 },
  heroTitle: { color: "#fff", fontSize: 20, fontWeight: "900", letterSpacing: -0.5, marginBottom: 12, lineHeight: 26 },
  heroPlayBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, alignSelf: "flex-start",
  },
  heroPlayText: { color: "#000", fontSize: 13, fontWeight: "800" },
  spotBig: {
    flex: 1, borderRadius: 20, overflow: "hidden",
    backgroundColor: SURFACE, justifyContent: "flex-end", padding: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.05)"
  },
  spotBigBadge: {
    position: "absolute", top: 12, left: 12,
    backgroundColor: "#FF9F0A", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  spotBigBadgeText: { color: "#000", fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  spotBigTitle: { color: "#fff", fontSize: 14, fontWeight: "800", lineHeight: 18 },
  spotSmall: {
    flex: 1, borderRadius: 16, overflow: "hidden",
    backgroundColor: SURFACE, justifyContent: "flex-end", padding: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.05)"
  },
  spotSmallBadge: {
    position: "absolute", top: 8, left: 8,
    backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
  },
  spotSmallBadgeText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  spotSmallTitle: { color: "#fff", fontSize: 11, fontWeight: "700", lineHeight: 14 },
  wideCard: { height: 165, borderRadius: 20, overflow: "hidden", backgroundColor: SURFACE, marginRight: 12, justifyContent: "flex-end", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  wideContent: { padding: 14 },
  wideTitle: { color: "#fff", fontSize: 14, fontWeight: "800", marginBottom: 6 },
  wideMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  wideScore: { color: "#FFD60A", fontSize: 12, fontWeight: "700" },
  widePlayBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
  },
  widePlayText: { color: "#000", fontSize: 11, fontWeight: "800" },
  rankNum: { position: "absolute", top: 8, left: 8, color: "#fff", fontSize: 24, fontWeight: "900", opacity: 0.9, letterSpacing: -1 },
  epBadge: {
    position: "absolute", bottom: 8, right: 8,
    backgroundColor: "rgba(0,0,0,0.65)", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
  },
  epBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  cardTitle: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600", lineHeight: 16, marginTop: 8, minHeight: 32 },
});