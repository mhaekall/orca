import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Play, Eye, Star, BookOpen } from "lucide-react-native";
import { formatViews, prefetchAnime } from "../../../lib/utils";
import { Theme } from "../../../lib/theme";
import { normalizeMediaItem } from "../../../lib/adapters/mediaAdapter";

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
          <View style={{ alignSelf: 'flex-start', marginBottom: 12, marginLeft: -20, position: 'relative' }}>
            <View style={{
              position: 'absolute',
              top: 0, bottom: 0, left: 0, right: 0,
              transform: [{ rotate: '-3deg' }, { skewX: '-18deg' }],
              shadowColor: '#FF2D55', shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6,
            }}>
              <View style={{ 
                flex: 1, 
                backgroundColor: '#FF2D55',
                borderTopRightRadius: 4, borderBottomRightRadius: 12,
                overflow: 'hidden'
              }}>
                <View style={{ position: 'absolute', width: 2, height: 60, backgroundColor: 'rgba(255,255,255,0.2)', transform: [{rotate: '45deg'}], left: 10, top: -10 }} />
                <View style={{ position: 'absolute', width: 4, height: 60, backgroundColor: 'rgba(255,255,255,0.15)', transform: [{rotate: '45deg'}], left: 30, top: -10 }} />
                <View style={{ position: 'absolute', width: 1, height: 60, backgroundColor: 'rgba(255,255,255,0.3)', transform: [{rotate: '45deg'}], left: 50, top: -10 }} />
                <View style={{ position: 'absolute', width: 6, height: 80, backgroundColor: 'rgba(0,0,0,0.1)', transform: [{rotate: '-30deg'}], left: 70, top: -20 }} />
                <View style={{ position: 'absolute', width: 2, height: 60, backgroundColor: 'rgba(255,255,255,0.2)', transform: [{rotate: '45deg'}], left: 100, top: -10 }} />
                <View style={{ position: 'absolute', width: 3, height: 60, backgroundColor: 'rgba(0,0,0,0.15)', transform: [{rotate: '45deg'}], left: 120, top: 0 }} />
                <View style={{ position: 'absolute', width: 1, height: 60, backgroundColor: 'rgba(255,255,255,0.25)', transform: [{rotate: '-45deg'}], left: 140, top: -10 }} />
              </View>
            </View>
            
            <Text style={{
              color: '#fff', fontSize: 24, 
              paddingHorizontal: 16, paddingVertical: 2,
              fontWeight: 'bold', fontStyle: 'italic',
              textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4,
              transform: [{ rotate: '-4deg' }]
            }}>
              {badgeText}
            </Text>
          </View>

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
