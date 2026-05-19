import React from "react";
import { View, Text, Pressable, FlatList, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Link, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Play, ChevronRight, BookOpen } from "lucide-react-native";
import { formatDuration } from "../../../lib/utils";
import { Theme } from "../../../lib/theme";
import { ProgressBar } from "../../ProgressBar";
import { normalizeMediaItem } from "../../../lib/adapters/mediaAdapter";

const SURFACE2 = Theme.colors.surfaceAlt;
const FONT_MEDIUM = Theme.typography.weights.medium;
const FONT_BOLD = Theme.typography.weights.bold;
const FONT_SEMIBOLD = Theme.typography.weights.semibold;

export function WatchHistoryRow({ items, mediaType = 'anime' }: { items: any[], mediaType?: 'anime' | 'manga' }) {
  const router = useRouter();
  if (!items || items.length === 0) return null;

  const label = mediaType === 'manga' ? 'Lanjutkan Membaca' : 'Lanjutkan Menonton';

  return (
    <View style={{ marginBottom: 32 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 12 }}>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: FONT_SEMIBOLD, letterSpacing: -0.2 }}>{label}</Text>
        <Pressable onPress={() => router.push(mediaType === 'manga' ? "/collection?tab=all" : "/collection?tab=history")} style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ color: "#0A84FF", fontSize: 12, fontWeight: FONT_BOLD, marginRight: 2 }}>Selengkapnya</Text>
          <ChevronRight size={14} color="#0A84FF" />
        </Pressable>
      </View>
      <FlatList<any>
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        data={items.slice(0, 8)}
        keyExtractor={(item: any, index: number) => String(item.anilist_id || item.anilistId || item.animeSlug || '') + '-' + String(item.episode || '') + '-' + index}
        renderItem={({ item: rawItem }: any) => {
          const item = normalizeMediaItem(rawItem);
          const { id, title, imageUrl: img } = item;
          const ts = rawItem.timestampSec || 0;
          const dur = rawItem.durationSec || 0;
          const pct = dur > 0 ? Math.min(100, Math.max(0, (ts / dur) * 100)) : 0;

          const href = mediaType === 'manga' ? `/manga/${id}` : `/anime/${id}`;
          const epLabel = mediaType === 'manga' ? `CH ${item.episode}` : `EPS ${item.episode}`;
          const timeLeft = mediaType === 'manga' ? `${dur - ts} hal tersisa` : `Tersisa ${formatDuration(dur - ts)}`;

          return (
            <Link href={href as any} asChild>
              <Pressable style={{ width: 140 }}>
                <View style={{ height: 78, borderRadius: 10, overflow: "hidden", backgroundColor: SURFACE2, marginBottom: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }}>
                  <Image source={{ uri: img }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                  <LinearGradient colors={["transparent", "rgba(10,8,18,0.9)"]} style={StyleSheet.absoluteFillObject} />
                  
                  <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center' }]}>
                     <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                       {mediaType === 'manga' ? (
                          <BookOpen size={12} color="#fff" />
                       ) : (
                          <Play size={12} color="#fff" style={{ marginLeft: 2 }} />
                       )}
                     </View>
                  </View>

                  <View style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
                    {dur > 0 && <ProgressBar progress={pct} height={3} />}
                  </View>
                  <View style={{ position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 }}>
                     <Text style={{ color: "#fff", fontSize: 9, fontWeight: FONT_BOLD }}>{epLabel}</Text>
                  </View>
                </View>
                
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: FONT_SEMIBOLD, marginBottom: 2, lineHeight: 16 }} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: FONT_MEDIUM }}>
                   {dur > 0 ? timeLeft : "..."}
                </Text>
              </Pressable>
            </Link>
          );
        }}
      />
    </View>
  );
}
