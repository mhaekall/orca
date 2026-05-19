import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Play, Eye, Star, BookOpen } from "lucide-react-native";
import { formatViews, prefetchAnime } from "../../../lib/utils";
import { Theme } from "../../../lib/theme";
import { normalizeMediaItem } from "../../../lib/adapters/mediaAdapter";
import { AbstractBadge } from "../../AbstractBadge";

const BG = Theme.colors.background;
const FONT_BOLD = Theme.typography.weights.bold;

export function HeroCard({ item: rawItem, mediaType = 'anime' }: { item: any, mediaType?: 'anime' | 'manga' }) {
  const item = normalizeMediaItem(rawItem);
  const { id, title, imageUrl: img, score, views } = item;
  
  const href = mediaType === 'manga' ? `/manga/${id}` : `/anime/${id}`;
  const badgeText = mediaType === 'manga' ? 'Rilis Terbaru' : 'Tayang Terbaru';
  const epsText = mediaType === 'manga' ? `CH ${item.episode}` : `EPS ${item.episode}`;

  return (
    <Link href={href as any} asChild>
      <Pressable style={styles.hero} onPressIn={() => { if (mediaType === 'anime') prefetchAnime(id); }}>
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
        
        <View style={styles.heroBottom}>
          <AbstractBadge 
            text={badgeText}
            color="#FF2D55"
          />

          <Text style={styles.heroTitle} numberOfLines={2}>{title}</Text>
          
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: -4 }}>
            {views > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Eye size={12} color="rgba(255,255,255,0.7)" />
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: Theme.typography.weights.medium }}>
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
                {epsText}
              </Text>
            </View>
          </View>

          <View style={styles.heroPlayBtn}>
            {mediaType === 'manga' ? (
              <BookOpen size={16} color="#fff" />
            ) : (
              <Play size={16} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
            )}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
  );
}

const styles = StyleSheet.create({
  hero: { width: "100%", aspectRatio: 3/4, overflow: "hidden", backgroundColor: Theme.colors.surface },
  heroBottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingTop: 40 },
  heroTitle: { color: "#fff", fontSize: 24, fontWeight: '900', letterSpacing: -0.5, marginBottom: 8, lineHeight: 28, paddingRight: 60 },
  heroPlayBtn: {
    position: "absolute", bottom: 16, right: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#0A84FF", alignItems: "center", justifyContent: "center",
    elevation: 4, shadowColor: "#0A84FF", shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }
  },
});
