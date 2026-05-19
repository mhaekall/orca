import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Eye, Star } from "lucide-react-native";
import { formatViews, prefetchAnime } from "../../../lib/utils";
import { Theme } from "../../../lib/theme";
import { normalizeMediaItem } from "../../../lib/adapters/mediaAdapter";

const BG = Theme.colors.background;
const SURFACE2 = Theme.colors.surfaceAlt;
const FONT_MEDIUM = Theme.typography.weights.medium;
const FONT_BOLD = Theme.typography.weights.bold;
const FONT_SEMIBOLD = Theme.typography.weights.semibold;

export function WideRow({ items, mediaType = 'anime' }: { items: any[], mediaType?: 'anime' | 'manga' }) {
  return (
    <View style={{ paddingHorizontal: 16, gap: 16 }}>
      {items.slice(0, 5).map((rawItem, i) => {
        const item = normalizeMediaItem(rawItem);
        const { id, imageUrl: img, title, score, views, genres } = item;
        const firstGenre = genres.length > 0 ? genres[0] : "";

        return (
          <View key={String(id || i)} style={{ width: "100%", height: 130 }}>
            <Link href={(mediaType === 'manga' ? `/manga/${id}` : `/anime/${id}`) as any} asChild>
              <Pressable style={{ flex: 1, flexDirection: "row", backgroundColor: SURFACE2, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }} onPressIn={() => { if(mediaType === 'anime') prefetchAnime(id); }}>
                <View style={{ width: 100, height: "100%", backgroundColor: BG }}>
                  <Image source={{ uri: img }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={300} />
                  <LinearGradient colors={["transparent", "rgba(10,8,18,0.8)"]} style={StyleSheet.absoluteFillObject} />
                  <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={["transparent", "transparent", SURFACE2]} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFillObject} />
                </View>
                
                <View style={{ flex: 1, padding: 14, justifyContent: "center", paddingLeft: 4 }}>
                  <Text style={{ color: "#fff", fontSize: 14, fontWeight: FONT_SEMIBOLD, marginBottom: 6, lineHeight: 20 }} numberOfLines={2}>
                    {title}
                  </Text>
                  
                  <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                     {score > 0 ? (
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
