import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Dimensions,
  FlatList,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, Stack } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MediaCard } from "../components/MediaCard";

const { width: W } = Dimensions.get("window");
import { API_URL } from "../lib/config";
import { fetchWithAuth } from "../lib/fetcher";
import { hasEps } from "../lib/utils";
import { Theme } from "../lib/theme";
const API = API_URL;
const BG = Theme.colors.background;
const SURFACE = Theme.colors.surface2;

export default function TrendingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      setLoading(true);
      try {
        const url = `${API}/api/v2/browse?page=1&sort=trending&limit=30&_t=${Date.now()}`;
        const res = await fetchWithAuth(url, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        const data = await res.json();

        if (data?.success && data.data) {
          setResults(data.data.filter(hasEps));
        } else {
          setResults([]);
        }
      } catch (e) {
        console.error("Trending fetch error", e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, []);

  const CARD_WIDTH = (W - 32 - 16) / 3; // 3 columns, 16px padding each side, 8px gap

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingTop: insets.top + 10, 
        paddingBottom: 16, 
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)'
      }}>
        <Pressable 
          onPress={() => router.back()} 
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft color="white" size={20} />
        </Pressable>
        <View style={{ marginLeft: 16 }}>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold', letterSpacing: -0.5 }}>Trending Sekarang</Text>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500' }}>Paling banyak dibicarakan</Text>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#0A84FF" />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.anilistId || item.id)}
          numColumns={3}
          contentContainerStyle={{ padding: 16 }}
          columnWrapperStyle={{ gap: 8, marginBottom: 16 }}
          renderItem={({ item, index }) => (
             <View style={{ width: CARD_WIDTH }}>
                <View style={{ 
                   position: 'absolute', top: -6, left: -6, zIndex: 10, 
                   backgroundColor: index < 3 ? '#FF2D55' : 'rgba(0,0,0,0.6)', 
                   width: 24, height: 24, borderRadius: 12, 
                   alignItems: 'center', justifyContent: 'center',
                   borderWidth: 2, borderColor: BG
                }}>
                   <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>{index + 1}</Text>
                </View>
                <MediaCard 
                  item={item}
                  variant="vertical"
                />
             </View>
          )}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: "center" }}>
              <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
                Gagal memuat data trending.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}