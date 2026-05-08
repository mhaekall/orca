import React, { useState, useEffect, useRef } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimeCard } from "../components/AnimeCard";

const { width: W } = Dimensions.get("window");
import { API_URL } from "../lib/config";
const API = API_URL;
const BG = "#0a0812";
const SURFACE = "#13111a";
const SURFACE2 = "#1f1c29";

// Genre data based on web implementation
const GENRES = [
  { name: "Action", bg: "rgba(255,59,48,0.1)", text: "#FF3B30", border: "rgba(255,59,48,0.2)" },
  { name: "Romance", bg: "rgba(255,45,85,0.1)", text: "#FF2D55", border: "rgba(255,45,85,0.2)" },
  { name: "Fantasy", bg: "rgba(88,86,214,0.1)", text: "#5856D6", border: "rgba(88,86,214,0.2)" },
  { name: "Sci-Fi", bg: "rgba(0,122,255,0.1)", text: "#007AFF", border: "rgba(0,122,255,0.2)" },
  { name: "Comedy", bg: "rgba(255,204,0,0.1)", text: "#FFCC00", border: "rgba(255,204,0,0.2)" },
  { name: "Drama", bg: "rgba(255,149,0,0.1)", text: "#FF9500", border: "rgba(255,149,0,0.2)" },
  { name: "Horror", bg: "rgba(255,69,58,0.1)", text: "#FF453A", border: "rgba(255,69,58,0.2)" },
  { name: "Sports", bg: "rgba(52,199,89,0.1)", text: "#34C759", border: "rgba(52,199,89,0.2)" },
  { name: "Mecha", bg: "rgba(100,210,255,0.1)", text: "#64D2FF", border: "rgba(100,210,255,0.2)" },
  { name: "Slice of Life", bg: "rgba(175,82,222,0.1)", text: "#AF52DE", border: "rgba(175,82,222,0.2)" },
  { name: "Mystery", bg: "rgba(94,92,230,0.1)", text: "#5E5CE6", border: "rgba(94,92,230,0.2)" },
  { name: "Psychological", bg: "rgba(255,55,95,0.1)", text: "#FF375F", border: "rgba(255,55,95,0.2)" },
];

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function ExploreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const [query, setQuery] = useState((params.q as string) || "");
  const [genre, setGenre] = useState((params.genre as string) || "");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);

  const debouncedQuery = useDebounce(query, 600);

  useEffect(() => {
    loadHistory();
    // Auto focus if no genre is set
    if (!params.genre) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, []);

  const loadHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem("@search_history");
      if (stored) setHistory(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }
  };

  const saveHistory = async (newHistory: string[]) => {
    try {
      await AsyncStorage.setItem("@search_history", JSON.stringify(newHistory.slice(0, 10)));
      setHistory(newHistory.slice(0, 10));
    } catch (e) {
      console.error(e);
    }
  };

  const addSearchTerm = (term: string) => {
    if (!term.trim()) return;
    const updated = [term.trim(), ...history.filter((t) => t.toLowerCase() !== term.toLowerCase())];
    saveHistory(updated);
  };

  const clearHistory = () => saveHistory([]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedQuery && !genre) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let url = `${API}/api/v2/browse?page=1&sort=popularity`;
        if (debouncedQuery) url += `&q=${encodeURIComponent(debouncedQuery)}`;
        if (genre) url += `&genre=${encodeURIComponent(genre)}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data?.success && data.data) {
          setResults(data.data);
          if (debouncedQuery && data.data.length > 0) {
            addSearchTerm(debouncedQuery);
          }
        } else {
          setResults([]);
        }
      } catch (e) {
        console.error("Search fetch error", e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery, genre]);

  const clearSearch = () => {
    setQuery("");
    setGenre("");
    setResults([]);
    Keyboard.dismiss();
  };

  const CARD_WIDTH = (W - 32 - 16) / 3; // 3 columns, 16px padding each side, 8px gap

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      
      {/* Header & Search Bar */}
      <View style={{ paddingTop: insets.top, backgroundColor: "rgba(19,17,26,0.9)", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)", zIndex: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={{ padding: 4 }}>
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
              onSubmitEditing={() => { if(query) addSearchTerm(query); Keyboard.dismiss(); }}
            />
            {(query.length > 0 || genre.length > 0) && (
              <Pressable onPress={clearSearch} style={s.clearBtn}>
                <X size={14} color="rgba(255,255,255,0.8)" />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Content */}
      {(query || genre) ? (
        // Search Results
        loading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color="#0A84FF" />
            <Text style={{ color: "rgba(255,255,255,0.5)", marginTop: 12, fontSize: 14 }}>Mencari...</Text>
          </View>
        ) : results.length > 0 ? (
          <FlatList
            showsVerticalScrollIndicator={false}
            data={results}
            keyExtractor={(item) => String(item.anilistId || item.id)}
            numColumns={3}
            contentContainerStyle={{ padding: 16 }}
            columnWrapperStyle={{ gap: 8, marginBottom: 16 }}
            ListHeaderComponent={
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>
                  {genre ? `GENRE: ${genre}` : "HASIL PENCARIAN"}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "600" }}>{results.length} ITEM</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={{ width: CARD_WIDTH }}>
                <AnimeCard 
                  id={String(item.anilistId || item.id)} 
                  title={item.cleanTitle || item.title?.english || item.title?.romaji || item.title || ""} 
                  img={item.coverImage || item.img} 
                  score={item.score || item.averageScore} 
                  color={item.color} 
                  totalEps={item.latestEpisode || item.totalEpisodes || item.episodes} 
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
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>Terakhir dicari</Text>
                <Pressable onPress={clearHistory} hitSlop={10}>
                  <Text style={{ color: "#0A84FF", fontSize: 13, fontWeight: "600" }}>Hapus Semua</Text>
                </Pressable>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {history.map((term, i) => (
                  <Pressable 
                    key={i} 
                    onPress={() => { setQuery(term); setGenre(""); }} 
                    style={{ flexDirection: "row", alignItems: "center", backgroundColor: SURFACE2, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }}
                  >
                    <Clock size={12} color="rgba(255,255,255,0.4)" style={{ marginRight: 6 }} />
                    <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "500" }}>{term}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 16 }}>Eksplorasi Genre</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {GENRES.map((g) => (
                <Pressable
                  key={g.name}
                  onPress={() => { setGenre(g.name); setQuery(""); }}
                  style={{ width: (W - 32 - 12) / 2, backgroundColor: g.bg, borderColor: g.border, borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                >
                  <Text style={{ color: g.text, fontSize: 14, fontWeight: "800" }}>{g.name}</Text>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(19,17,26,0.3)", alignItems: "center", justifyContent: "center" }}>
                    <ChevronRight size={14} color={g.text} />
                  </View>
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
    backgroundColor: SURFACE2,
    borderRadius: 16,
    height: 48,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
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
  }
});
