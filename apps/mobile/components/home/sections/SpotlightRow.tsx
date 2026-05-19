import React from "react";
import { View, Text, Pressable, FlatList, StyleSheet, Dimensions } from "react-native";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Eye, Star } from "lucide-react-native";
import { formatViews, prefetchAnime } from "../../../lib/utils";
import { Theme } from "../../../lib/theme";
import { normalizeMediaItem } from "../../../lib/adapters/mediaAdapter";

const { width: W } = Dimensions.get("window");
const FONT_MEDIUM = Theme.typography.weights.medium;
const FONT_BOLD = Theme.typography.weights.bold;
const FONT_SEMIBOLD = Theme.typography.weights.semibold;

export function SpotlightRow({ items, mediaType = 'anime' }: { items: any[], mediaType?: 'anime' | 'manga' }) {
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
          const item = normalizeMediaItem(chunk.item);
          const { id, imageUrl: img, title, score, views } = item;
          return (
            <View style={{ width: BIG_W, height: 230, marginRight: 10 }}>
              <Link key={id} href={(mediaType === 'manga' ? `/manga/${id}` : `/anime/${id}`) as any} asChild>
                <Pressable style={styles.spotBig} onPressIn={() => { if(mediaType === 'anime') prefetchAnime(id); }}>
                  <Image source={{ uri: img }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={300} />
                  <LinearGradient colors={["transparent", "rgba(10,8,18,0.95)"]} style={StyleSheet.absoluteFillObject} />
                  <View style={styles.spotBigBadge}><Text style={styles.spotBigBadgeText}>#{chunk.rank} TRENDING</Text></View>
                  <Text style={styles.spotBigTitle} numberOfLines={2}>{title}</Text>
                  
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                    {score > 0 ? (
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
              {chunk.items.map((rawItem: any, i: number) => {
                const item = normalizeMediaItem(rawItem);
                const { id, imageUrl: img, title, score, views } = item;
                return (
                  <Link key={id} href={(mediaType === 'manga' ? `/manga/${id}` : `/anime/${id}`) as any} asChild>
                    <Pressable style={styles.spotSmall} onPressIn={() => { if(mediaType === 'anime') prefetchAnime(id); }}>
                      <Image source={{ uri: img }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={300} />
                      <LinearGradient colors={["transparent", "rgba(10,8,18,0.9)"]} style={StyleSheet.absoluteFillObject} />
                      <View style={styles.spotSmallBadge}><Text style={styles.spotSmallBadgeText}>#{chunk.startRank + i}</Text></View>
                      <Text style={styles.spotSmallTitle} numberOfLines={2}>{title}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                        {score > 0 ? (
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

const styles = StyleSheet.create({
  spotBig: {
    flex: 1, borderRadius: 16, overflow: "hidden",
    backgroundColor: Theme.colors.surface, justifyContent: "flex-end", padding: 14,
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
    backgroundColor: Theme.colors.surface, justifyContent: "flex-end", padding: 10,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.05)"
  },
  spotSmallBadge: {
    position: "absolute", top: 8, left: 8,
    backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4,
  },
  spotSmallBadgeText: { color: "#fff", fontSize: 9, fontWeight: FONT_BOLD },
  spotSmallTitle: { color: "#fff", fontSize: 12, fontWeight: FONT_MEDIUM, lineHeight: 16 },
});
