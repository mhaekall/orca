import React from "react";
import { View, Text, ScrollView, Pressable, Alert, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LogOut, ChevronRight, Crown, Shield, FileText, RefreshCw, Bell, Users, Settings, Activity } from "lucide-react-native";
import { useAuth } from "../../lib/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ProfileScreen() {
  const { user, isLoading, signInWithGoogle, signOut } = useAuth();

  // Placeholder for future SWR hooks in mobile
  const stats = { completed: 0, totalEps: 0, days: "0.0" };

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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        
        {/* Header Profile Section */}
        <View style={styles.headerSection}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarContainer}>
              <Image 
                source={{ uri: user?.image || user?.picture || "https://api.dicebear.com/7.x/notionists/svg?seed=OrcaUser" }} 
                style={StyleSheet.absoluteFillObject}
                contentFit="cover" 
              />
            </View>
            {user && (
              <View style={styles.crownBadge}>
                <Crown size={16} color="white" />
              </View>
            )}
          </View>

          {user ? (
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {user.name || "Orca User"}
              </Text>
              <Text style={styles.userHandle}>@{user.email?.split('@')[0]}</Text>
              
              <View style={styles.userStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>0</Text>
                  <Text style={styles.statLabel}>Pengikut</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>0</Text>
                  <Text style={styles.statLabel}>Mengikuti</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.completed}</Text>
                  <Text style={styles.statLabel}>Tamat</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.guestInfo}>
              <Text style={styles.guestTitle}>Guest Mode</Text>
              <Text style={styles.guestDescription}>Masuk untuk melacak riwayat tontonan, mengelola koleksi, dan berinteraksi dengan komunitas.</Text>
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

        {/* Social / Action Buttons */}
        {user && (
          <View style={styles.actionButtons}>
            <Pressable style={({pressed}) => [styles.actionButton, pressed && styles.actionButtonPressed]}>
              <Bell size={24} color="white" style={styles.actionIcon} />
              <Text style={styles.actionText}>Notifikasi</Text>
            </Pressable>
            <Pressable 
              onPress={() => Alert.alert("Segera Hadir", "Fitur Teman sedang dalam pengembangan!")}
              style={({pressed}) => [styles.actionButton, pressed && styles.actionButtonPressed]}
            >
              <Users size={24} color="white" style={styles.actionIcon} />
              <Text style={styles.actionText}>Teman</Text>
            </Pressable>
          </View>
        )}

        {/* Watch Stats */}
        <View style={styles.watchStatsCard}>
          <View style={styles.watchStatsHeader}>
            <Activity size={16} color="rgba(255,255,255,0.5)" />
            <Text style={styles.watchStatsTitle}>
              Aktivitas Menonton
            </Text>
          </View>
          <View style={styles.watchStatsRow}>
            <View style={[styles.watchStatItem, styles.watchStatItemBorder]}>
              <Text style={styles.watchStatValueWhite}>{stats.totalEps}</Text>
              <Text style={styles.watchStatLabel}>Eps Ditonton</Text>
            </View>
            <View style={[styles.watchStatItem, styles.watchStatItemBorder]}>
              <Text style={styles.watchStatValueOrange}>{stats.days}</Text>
              <Text style={styles.watchStatLabel}>Hari Dihabiskan</Text>
            </View>
            <View style={styles.watchStatItem}>
              <Text style={styles.watchStatValueGreen}>0</Text>
              <Text style={styles.watchStatLabel}>Sedang Aktif</Text>
            </View>
          </View>
        </View>

        {/* Menu / Links */}
        <View style={styles.menuSection}>
          <View style={styles.menuHeader}>
            <Settings size={16} color="rgba(255,255,255,0.5)" />
            <Text style={styles.menuTitle}>
              Sistem & Pengaturan
            </Text>
          </View>
          
          <View style={styles.menuCard}>
            <Pressable style={({pressed}) => [styles.menuItem, styles.menuItemBorder, pressed && styles.menuItemPressed]}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, styles.menuIconOrange]}>
                  <Crown size={16} color="#FF9F0A" />
                </View>
                <View>
                  <Text style={styles.menuItemTitle}>Orca Premium</Text>
                  <Text style={styles.menuItemSubtitle}>Dukung kreator & hilangkan batasan</Text>
                </View>
              </View>
              <ChevronRight size={20} color="rgba(255,255,255,0.2)" />
            </Pressable>

            <Pressable style={({pressed}) => [styles.menuItem, styles.menuItemBorder, pressed && styles.menuItemPressed]}>
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <FileText size={16} color="white" />
                </View>
                <Text style={styles.menuItemTitle}>Ketentuan Layanan</Text>
              </View>
              <ChevronRight size={20} color="rgba(255,255,255,0.2)" />
            </Pressable>

            <Pressable style={({pressed}) => [styles.menuItem, pressed && styles.menuItemPressed]}>
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Shield size={16} color="white" />
                </View>
                <Text style={styles.menuItemTitle}>Kebijakan Privasi</Text>
              </View>
              <ChevronRight size={20} color="rgba(255,255,255,0.2)" />
            </Pressable>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <View style={styles.dangerCard}>
            {user && (
              <Pressable
                onPress={signOut}
                style={({pressed}) => [styles.dangerItem, styles.dangerItemBorder, pressed && styles.dangerItemPressed]}
              >
                <View style={styles.dangerIconContainer}>
                  <LogOut size={16} color="#FF453A" />
                </View>
                <Text style={styles.dangerTitle}>Keluar Akun</Text>
              </Pressable>
            )}
            
            <Pressable 
              onPress={handleClearCache}
              style={({pressed}) => [styles.dangerItem, pressed && styles.dangerItemPressed]}
            >
              <View style={styles.dangerIconContainer}>
                <Shield size={16} color="#FF453A" />
              </View>
              <View>
                <Text style={styles.dangerTitle}>Hapus Cache Lokal</Text>
                <Text style={styles.dangerSubtitle}>Reset total data perangkat ini</Text>
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerVersion}>Orca v3.0.0 (Social Ready)</Text>
          <Text style={styles.footerSlogan}>Didesain untuk efisiensi maksimal </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0812',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  headerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
    marginBottom: 24,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: '#1f1c29',
  },
  crownBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    backgroundColor: '#0A84FF',
    padding: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'black',
    zIndex: 20,
  },
  userInfo: {
    alignItems: 'center',
    gap: 4, // space-y-1 roughly
  },
  userName: {
    fontSize: 24,
    fontWeight: '900', // black
    color: 'white',
    letterSpacing: -0.5,
  },
  userHandle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
  },
  userStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: 'white',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  guestInfo: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: 'white',
    marginBottom: 8,
  },
  guestDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'white',
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
    color: 'black',
    fontWeight: 'bold',
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#1f1c29',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  actionButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  actionIcon: {
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.8)',
  },
  watchStatsCard: {
    backgroundColor: '#1f1c29',
    borderRadius: 24, // 3xl
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 24,
  },
  watchStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  watchStatsTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1, // tracking-widest
  },
  watchStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  watchStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  watchStatItemBorder: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
  },
  watchStatValueWhite: {
    fontSize: 24,
    fontWeight: '900',
    color: 'white',
  },
  watchStatValueOrange: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FF9F0A',
  },
  watchStatValueGreen: {
    fontSize: 24,
    fontWeight: '900',
    color: '#32D74B',
  },
  watchStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  menuSection: {
    marginBottom: 24,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 4,
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  menuCard: {
    backgroundColor: '#1f1c29',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
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
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  menuItemPressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  menuIconOrange: {
    backgroundColor: 'rgba(255, 159, 10, 0.1)',
  },
  menuItemTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    color: 'white',
  },
  menuItemSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  dangerZone: {
    marginBottom: 24,
  },
  dangerCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    overflow: 'hidden',
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  dangerItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(239, 68, 68, 0.1)',
  },
  dangerItemPressed: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  dangerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  dangerTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#FF453A',
  },
  dangerSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 69, 58, 0.6)',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },
  footerVersion: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  footerSlogan: {
    color: 'rgba(255,255,255,0.1)',
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 4,
  },
});