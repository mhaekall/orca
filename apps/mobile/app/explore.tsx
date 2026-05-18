import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Dimensions,
  FlatList,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { Search, X, Clock, ChevronRight, ArrowLeft } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useSWRInfinite from "swr/infinite";

import { AnimeCard } from "../components/AnimeCard";
import { Skeleton } from "../components/Skeleton";
import { API_URL } from "../lib/config";
import { fetcher } from "../lib/fetcher";
import { hasEps } from "../lib/utils";
import { Theme } from "../lib/theme";

import { useDebounce } from "../lib/hooks/useDebounce";
import { useSearchHistory } from "../lib/hooks/useSearchHistory";
import { MangaEngine } from "../lib/manga/engine";
import { MANGA_SOURCES } from "../lib/manga/sources";
import { MangaItem } from "../lib/manga/types";

const { width: W } = Dimensions.get("window");
const API = API_URL;
const BG = Theme.colors.background;
const SURFACE = Theme.colors.surface;
const SURFACE2 = Theme.colors.surface2;

const GENRES = [
  { name: "Action" },
  { name: "Adventure" },
  { name: "Comedy" },
  { name: "Drama" },
  { name: "Fantasy" },
  { name: "Horror" },
  { name: "Isekai" },
  { name: "Magic" },
  { name: "Mecha" },
  { name: "Music" },
  { name: "Mystery" },
  { name: "Psychological" },
  { name: "Romance" },
  { name: "School" },
  { name: "Sci-Fi" },
  { name: "Seinen" },
  { name: "Shounen" },
  { name: "Slice of Life" },
  { name: "Sports" },
  { name: "Supernatural" },
  { name: "Thriller" },
];

export default function ExploreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const mediaType = (params.mediaType as string) || "anime";
  
  const [query, setQuery] = useState((params.q as string) || "");
  const [genre, setGenre] = useState((params.genre as string) || "");
  const [sort, setSort] = useState("popularity");
  const inputRef = useRef<TextInput>(null);

  const debouncedQuery = useDebounce(query, 600);
  const { history, addSearchTerm, clearHistory } = useSearchHistory();

  const isSearchActive = !!debouncedQuery || !!genre || sort !== "popularity";

  // Manga Search State
  const [mangaResults, setMangaResults] = useState<MangaItem[]>([]);
  const [mangaLoading, setMangaLoading] = useState(false);

  // SWR Infinite Pagination (For Anime)
  const getKey = (pageIndex: number, previousPageData: any) => {
    if (mediaType === "manga" || !isSearchActive) return null;
    if (previousPageData && (!previousPageData.data || previousPageData.data.length === 0)) return null;
    
    let url = `${API}/api/v2/browse?page=${pageIndex + 1}&sort=${sort}`;
    if (debouncedQuery) url += `&q=${encodeURIComponent(debouncedQuery)}`;
    if (genre) url += `&genre=${encodeURIComponent(genre)}`;
    return url;
  };

  const { data, error, size, setSize, isValidating } = useSWRInfinite(getKey, fetcher, {
    revalidateOnFocus: false,
    revalidateFirstPage: false,
  });

  useEffect(() => {
    if (mediaType === "manga" && isSearchActive && debouncedQuery) {
      const fetchMangaSearch = async () => {
        setMangaLoading(true);
        try {
          // Fallback to first source for search. Ideally we could let user select source.
          const source = MANGA_SOURCES[0];
          const results = await MangaEngine.getSearchList(source, debouncedQuery);
          setMangaResults(results);
        } catch (e) {
          console.error(e);
          setMangaResults([]);
        } finally {
          setMangaLoading(false);
        }
      };
      fetchMangaSearch();
    } else if (mediaType === "manga") {
      setMangaResults([]);
    }
  }, [debouncedQuery, mediaType, isSearchActive]);

  const results = mediaType === "manga" ? mangaResults : (data ? data.flatMap(d => d.data || []).filter(hasEps) : []);
  const isLoadingInitialData = mediaType === "manga" ? mangaLoading : (!data && !error && isSearchActive);
  const isLoadingMore = mediaType === "anime" && (isLoadingInitialData || (size > 0 && data && typeof data[size - 1] === "undefined"));
  const isEmpty = mediaType === "manga" ? (mangaResults.length === 0 && !mangaLoading) : (data?.[0]?.data?.length === 0);
  const isReachingEnd = mediaType === "manga" ? true : (isEmpty || (data && data[data.length - 1]?.data?.length < 20));

  useEffect(() => {
    // Add to history only on first page load of a successful new query
    if (debouncedQuery && results.length > 0) {
      if ((mediaType === "anime" && size === 1) || mediaType === "manga") {
        addSearchTerm(debouncedQuery);
      }
    }
  }, [results.length, debouncedQuery, size, mediaType, addSearchTerm]);

  useEffect(() => {
    if (!params.genre) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, []);

  const handleSortChange = useCallback((newSort: string) => {
    setSort(newSort);
    // Resetting size to 1 implicitly handled by SWR when key changes
  }, []);

  const handleGenreSelect = useCallback((selectedGenre: string) => {

    setGenre(selectedGenre);
    setQuery("");
  }, []);

  const handleHistoryTap = useCallback((term: string) => {

    setQuery(term);
    setGenre("");
  }, []);

  const clearSearch = useCallback(() => {

    setQuery("");
    setGenre("");
    Keyboard.dismiss();
  }, []);

  const CARD_WIDTH = (W - 32 - 16) / 3;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      
      {/* Header & Search Bar */}
      <View 
        style={{ paddingTop: insets.top, backgroundColor: "rgba(19,17,26,0.9)", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)", zIndex: 10 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => { router.back(); }} hitSlop={10} style={{ padding: 4 }}>
            <ArrowLeft size={24} color="#fff" />
          </Pressable>
          <View style={s.searchContainer}>
            <Search size={18} color="rgba(255,255,255,0.4)" style={{ marginLeft: 12 }} />
            <TextInput
              ref={inputRef}
              style={s.input}
              placeholder="Ketik judul anime..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => { 
                if(query) {
                  addSearchTerm(query);
                }
                Keyboard.dismiss(); 
              }}
            />
            {(query.length > 0 || genre.length > 0) && (
              <Pressable onPress={clearSearch} style={s.clearBtn}>
                <X size={14} color="rgba(255,255,255,0.8)" />
              </Pressable>
            )}
          </View>
        </View>
        
        {/* Sort Filter Pills */}
        <View style={{ paddingBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {[
              { id: "popularity", label: "Populer" },
              { id: "trending", label: "Sedang Tren" },
              { id: "score", label: "Tertinggi" },
              { id: "a-z", label: "A-Z" },
              { id: "z-a", label: "Z-A" },
            ].map((sObj) => (
              <Pressable 
                key={sObj.id} 
                onPress={() => handleSortChange(sObj.id)}
                style={({ pressed }) => [
                  s.sortPill,
                  sort === sObj.id && s.sortPillActive,
                  pressed && s.sortPillPressed
                ]}
              >
                <Text style={[
                  s.sortPillText,
                  sort === sObj.id && s.sortPillTextActive
                ]}>{sObj.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Content */}
      {isSearchActive ? (
        // Search Results
        isLoadingInitialData ? (
          <View style={s.skeletonGrid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <View key={i} style={{ width: CARD_WIDTH, marginBottom: 16 }}>
                 <Skeleton w="100%" h={CARD_WIDTH * 1.5} r={12} style={{ marginBottom: 8 }} />
                 <Skeleton w="80%" h={14} r={6} style={{ marginBottom: 4 }} />
                 <Skeleton w="40%" h={12} r={4} />
              </View>
            ))}
          </View>
        ) : results.length > 0 ? (
          <FlatList
            showsVerticalScrollIndicator={false}
            data={results}
            keyExtractor={(item, index) => String(item.anilistId || item.id) + '-' + index}
            numColumns={3}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            columnWrapperStyle={{ gap: 8, marginBottom: 16 }}
            onEndReached={() => {
              if (!isReachingEnd && !isLoadingMore) {
                setSize(size + 1);
              }
            }}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>
                  {genre ? `GENRE: ${genre}` : (query ? "HASIL PENCARIAN" : "SEMUA ANIME")}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "600" }}>{results.length} ITEM</Text>
              </View>
            }
            ListFooterComponent={
              isLoadingMore ? (
                <View style={{ paddingVertical: 20, alignItems: "center" }}>
                   <Skeleton w={32} h={32} r={16} />
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <View style={{ width: CARD_WIDTH }}>
                <AnimeCard 
                  id={String(item.anilistId || item.id)} 
                  title={item.cleanTitle || item.title?.english || item.title?.romaji || item.title || ""} 
                  img={item.coverImage?.large || item.coverImage?.extraLarge || item.coverImage || item.img} 
                  score={item.score || item.averageScore} 
                  color={item.color} 
                  totalEps={item.latestEpisode || item.totalEpisodes || item.episodes || item.latestChapter} 
                  mediaType={mediaType as "anime" | "manga"}
                />
              </View>
            )}
          />
        ) : (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: SURFACE2, justifyContent: "center", alignItems: "center", marginBottom: 20 }}>
              <Search size={32} color="rgba(255,255,255,0.2)" />
            </View>
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 8 }}>Tidak Ditemukan</Text>
            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, textAlign: "center", lineHeight: 20 }}>Coba gunakan kata kunci atau filter genre yang berbeda.</Text>
          </View>
        )
      ) : (
        // Explore Default State
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
          
          {history.length > 0 && (
            <View style={{ marginBottom: 32 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", letterSpacing: -0.5 }}>Terakhir Dicari</Text>
                <Pressable onPress={() => { clearHistory(); }} hitSlop={10}>
                  <Text style={{ color: "#0A84FF", fontSize: 13, fontWeight: "600" }}>Hapus Semua</Text>
                </Pressable>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {history.map((term, i) => (
                  <Pressable 
                    key={i} 
                    onPress={() => handleHistoryTap(term)} 
                    style={({pressed}) => [
                      s.historyChip,
                      pressed && s.historyChipPressed
                    ]}
                  >
                    <Clock size={12} color="rgba(255,255,255,0.4)" style={{ marginRight: 6 }} />
                    <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "500" }}>{term}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 16, letterSpacing: -0.5 }}>Eksplorasi Genre</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {GENRES.map((g) => (
                <Pressable
                  key={g.name}
                  onPress={() => handleGenreSelect(g.name)}
                  style={({pressed}) => [
                    { width: Math.floor((W - 32 - 24) / 3), backgroundColor: SURFACE2, borderColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 4, alignItems: "center", justifyContent: "center" },
                    pressed && { opacity: 0.7, transform: [{scale: 0.95}] }
                  ]}
                >
                  <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "700", textAlign: "center" }} numberOfLines={1}>{g.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)", // Apple-like translucent input
    borderRadius: 22,
    height: 44,
  },
  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 12,
    color: "#fff",
    fontSize: 16,
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sortPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: SURFACE2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  sortPillActive: {
    backgroundColor: "rgba(10, 132, 255, 0.15)",
    borderColor: "rgba(10, 132, 255, 0.5)",
  },
  sortPillPressed: {
    opacity: 0.8,
  },
  sortPillText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "600",
  },
  sortPillTextActive: {
    color: "#0A84FF",
  },
  historyChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE2,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  historyChipPressed: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 8,
  }
});
