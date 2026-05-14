import React from "react";
import { View, Text, ScrollView, Pressable, Alert, StyleSheet, Dimensions, Platform } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { LogOut, ChevronRight, Crown, Shield, Activity, Sparkles, Swords, Trophy, Medal } from "lucide-react-native";
import { useAuth } from "../../lib/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Theme } from "../../lib/theme";

const { width: W } = Dimensions.get("window");

export default function ProfileScreen() {
  const { user, isLoading, signInWithGoogle, signOut } = useAuth();

  // Placeholder stats for Gamification
  const stats = { 
    completed: 12, 
    totalEps: 245, 
    days: "4.2",
    level: 14,
    exp: 3450,
    nextExp: 5000,
    title: "Isekai Survivor" // User's equipped title
  };

  const handleClearCache = () => {
    Alert.alert(
      "Hapus Cache Lokal",
      "Hapus semua riwayat dan koleksi secara permanen dari perangkat ini?",
      [
        { text: "Batal", style: "cancel" },
        { 
          text: "Hapus", 
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.clear();
            Alert.alert("Cache Dihapus", "Silakan muat ulang aplikasi.");
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView} bounces={false}>
        
        {/* Banner Profile (Top Background) */}
        <View style={styles.bannerContainer}>
          <Image 
            source={{ uri: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/145545-XbOaDpm14W63.jpg" }} // Placeholder Banner
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
          <LinearGradient 
            colors={["rgba(10,8,18,0.1)", "rgba(10,8,18,0.8)", Theme.colors.background]} 
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFillObject}
          />
        </View>

        <View style={styles.contentContainer}>
          
          {/* Avatar & Title Section */}
          <View style={styles.headerSection}>
            <View style={styles.avatarWrapper}>
              {/* Premium Avatar Border (Gacha Item Placeholder) */}
              <LinearGradient
                colors={["#FFD60A", "#FF3B30", "#AF52DE"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.avatarBorderGlow}
              >
                <View style={styles.avatarContainer}>
                  <Image 
                    source={{ uri: user?.image || user?.picture || "https://api.dicebear.com/7.x/notionists/svg?seed=OrcaUser" }} 
                    style={StyleSheet.absoluteFillObject}
                    contentFit="cover" 
                  />
                </View>
              </LinearGradient>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>Lv {stats.level}</Text>
              </View>
            </View>

            {user ? (
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {user.name || "Orca User"}
                </Text>
                
                {/* Equipped Title */}
                <View style={styles.titleBadge}>
                  <Sparkles size={12} color={Theme.colors.warning} />
                  <Text style={styles.titleText}>{stats.title}</Text>
                  <Sparkles size={12} color={Theme.colors.warning} />
                </View>

                {/* EXP Bar */}
                <View style={styles.expContainer}>
                  <View style={styles.expBarBg}>
                    <LinearGradient 
                      colors={[Theme.colors.primary, "#64D2FF"]} 
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={[styles.expBarFill, { width: `${(stats.exp / stats.nextExp) * 100}%` }]} 
                    />
                  </View>
                  <Text style={styles.expText}>{stats.exp} / {stats.nextExp} EXP</Text>
                </View>
              </View>
            ) : (
              <View style={styles.guestInfo}>
                <Text style={styles.userName}>Guest Mode</Text>
                <Text style={styles.guestDescription}>Masuk untuk melacak progress dan mendapatkan Trophy.</Text>
                <Pressable 
                  onPress={signInWithGoogle}
                  disabled={isLoading}
                  style={({pressed}) => [
                    styles.loginButton, 
                    isLoading && styles.loginButtonDisabled,
                    pressed && !isLoading && styles.loginButtonPressed
                  ]}
                >
                  <Text style={styles.loginButtonText}>
                    {isLoading ? "Memproses..." : "Lanjutkan dengan Google"}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {user && (
            <>
              {/* RPG-Style Stats Showcase */}
              <View style={styles.statsShowcase}>
                <View style={styles.statCard}>
                  <View style={[styles.statIconBox, { backgroundColor: 'rgba(10, 132, 255, 0.15)' }]}>
                    <Activity size={20} color={Theme.colors.primary} />
                  </View>
                  <Text style={styles.statValue}>{stats.totalEps}</Text>
                  <Text style={styles.statLabel}>Eps Ditonton</Text>
                </View>

                <View style={styles.statCard}>
                  <View style={[styles.statIconBox, { backgroundColor: 'rgba(255, 159, 10, 0.15)' }]}>
                    <Trophy size={20} color={Theme.colors.warningAlt} />
                  </View>
                  <Text style={styles.statValue}>{stats.completed}</Text>
                  <Text style={styles.statLabel}>Anime Tamat</Text>
                </View>

                <View style={styles.statCard}>
                  <View style={[styles.statIconBox, { backgroundColor: 'rgba(48, 209, 88, 0.15)' }]}>
                    <Medal size={20} color={Theme.colors.success} />
                  </View>
                  <Text style={styles.statValue}>{stats.days}</Text>
                  <Text style={styles.statLabel}>Hari (Jam)</Text>
                </View>
              </View>

              {/* Action Buttons (Social / Friends Placeholder) */}
              <View style={styles.actionButtons}>
                <Pressable 
                  onPress={() => Alert.alert("Segera Hadir", "Leaderboard antar teman sedang dalam pengembangan!")}
                  style={({pressed}) => [styles.actionButton, pressed && styles.actionButtonPressed]}
                >
                  <Swords size={22} color={Theme.colors.text} style={styles.actionIcon} />
                  <Text style={styles.actionText}>Leaderboard</Text>
                </Pressable>
              </View>
            </>
          )}

          {/* Menu / Settings */}
          <View style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>Pengaturan Aplikasi</Text>
            
            <View style={styles.menuCard}>
              <Pressable 
                onPress={handleClearCache}
                style={({pressed}) => [styles.menuItem, styles.menuItemBorder, pressed && styles.menuItemPressed]}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIconContainer}>
                    <Shield size={16} color={Theme.colors.text} />
                  </View>
                  <View>
                    <Text style={styles.menuItemTitle}>Hapus Cache Lokal</Text>
                    <Text style={styles.menuItemSubtitle}>Reset data perangkat untuk performa</Text>
                  </View>
                </View>
                <ChevronRight size={20} color={Theme.colors.textDim} />
              </Pressable>

              {user && (
                <Pressable
                  onPress={signOut}
                  style={({pressed}) => [styles.menuItem, pressed && styles.menuItemPressed]}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                      <LogOut size={16} color={Theme.colors.danger} />
                    </View>
                    <Text style={[styles.menuItemTitle, { color: Theme.colors.danger }]}>Keluar Akun</Text>
                  </View>
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerVersion}>Orca v3.1.0 (Gamification Beta)</Text>
            <Text style={styles.footerSlogan}>Didesain untuk efisiensi maksimal </Text>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  bannerContainer: {
    width: "100%",
    height: 220,
    position: "absolute",
    top: 0,
  },
  contentContainer: {
    paddingTop: 140, // Overlaps the banner
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarBorderGlow: {
    width: 106,
    height: 106,
    borderRadius: 53,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: Theme.colors.surface2,
    borderWidth: 3,
    borderColor: Theme.colors.background,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    backgroundColor: Theme.colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Theme.colors.primary,
  },
  levelBadgeText: {
    color: Theme.colors.text,
    fontSize: 12,
    fontWeight: Theme.typography.weights.black,
  },
  userInfo: {
    alignItems: 'center',
    width: '100%',
  },
  userName: {
    fontSize: 26,
    fontWeight: Theme.typography.weights.black,
    color: Theme.colors.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 214, 10, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 10, 0.3)',
  },
  titleText: {
    color: Theme.colors.warning,
    fontSize: 13,
    fontWeight: Theme.typography.weights.bold,
    letterSpacing: 0.5,
  },
  expContainer: {
    width: '70%',
    alignItems: 'center',
  },
  expBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: Theme.colors.surface2,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  expBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  expText: {
    fontSize: 11,
    color: Theme.colors.textDim,
    fontWeight: Theme.typography.weights.semibold,
  },
  statsShowcase: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 22,
    fontWeight: Theme.typography.weights.black,
    color: Theme.colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: Theme.colors.textDim,
    fontWeight: Theme.typography.weights.bold,
    textTransform: 'uppercase',
  },
  guestInfo: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  guestDescription: {
    fontSize: 14,
    color: Theme.colors.textDim,
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  loginButton: {
    backgroundColor: Theme.colors.text,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  loginButtonDisabled: {
    opacity: 0.5,
  },
  loginButtonPressed: {
    opacity: 0.8,
  },
  loginButtonText: {
    color: Theme.colors.background,
    fontWeight: Theme.typography.weights.bold,
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: Theme.colors.surface2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: 10,
  },
  actionButtonPressed: {
    backgroundColor: Theme.colors.borderHighlight,
  },
  actionIcon: {
    opacity: 0.9,
  },
  actionText: {
    fontSize: 14,
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.text,
  },
  menuSection: {
    marginBottom: 24,
  },
  menuSectionTitle: {
    fontSize: 14,
    fontWeight: Theme.typography.weights.bold,
    color: Theme.colors.text,
    marginBottom: 12,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  menuItemPressed: {
    backgroundColor: Theme.colors.borderHighlight,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.surface2,
  },
  menuItemTitle: {
    fontWeight: Theme.typography.weights.bold,
    fontSize: 14,
    color: Theme.colors.text,
  },
  menuItemSubtitle: {
    fontSize: 11,
    color: Theme.colors.textDim,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  footerVersion: {
    color: Theme.colors.textDim,
    fontSize: 10,
    fontWeight: Theme.typography.weights.black,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  footerSlogan: {
    color: 'rgba(255,255,255,0.15)',
    fontSize: 10,
    fontWeight: Theme.typography.weights.bold,
    marginTop: 6,
  },
});
