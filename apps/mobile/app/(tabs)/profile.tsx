import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Alert, StyleSheet, Dimensions, Platform, TextInput, Modal, KeyboardAvoidingView, FlatList } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { LogOut, ChevronRight, Crown, Shield, Activity, Sparkles, Swords, Trophy, Medal, Edit2, X, Save } from "lucide-react-native";
import { useAuth } from "../../lib/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Theme } from "../../lib/theme";

const { width: W } = Dimensions.get("window");

const PRESET_AVATARS = [
  "https://api.dicebear.com/7.x/notionists/svg?seed=OrcaUser",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Samurai",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Ninja",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Mage",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Knight",
  "https://api.dicebear.com/7.x/notionists/svg?seed=King",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Queen",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Jester"
];

const PRESET_BANNERS = [
  { name: "Goku Ultra Instinct (GIF)", url: "https://media.tenor.com/H1SHzuTI4QYAAAAC/goku-ultra-instinct.gif" },
  { name: "Goku Ultra Instinct 2 (GIF)", url: "https://media.tenor.com/GKLim-KbuboAAAAC/dragon-ball-super-goku.gif" },
  { name: "Goku Ultra Instinct 3 (GIF)", url: "https://media.tenor.com/zGvM3Xvqy4sAAAAC/goku-goku-warmup.gif" },
  { name: "Goku Ultra Instinct 4 (GIF)", url: "https://media.tenor.com/ur3RdKDfR9EAAAAC/ui-manga-dragon-ball-super.gif" },
  { name: "Goku Ultra Instinct 5 (GIF)", url: "https://media.tenor.com/NjL1v_fAdesAAAAC/goku-ultra.gif" },
  { name: "Naruto Vs Sasuke (GIF)", url: "https://media.tenor.com/aOztgwpQZ1sAAAAC/owen-and-dyar-fight.gif" },
  { name: "Naruto Vs Sasuke 2 (GIF)", url: "https://media.tenor.com/h8zhePdwO-cAAAAC/kcorp-karmine.gif" },
  { name: "Naruto Vs Sasuke 3 (GIF)", url: "https://media.tenor.com/BagU-JmzQfkAAAAC/naruto.gif" },
  { name: "Naruto Vs Sasuke 4 (GIF)", url: "https://media.tenor.com/PMTqavIafgYAAAAC/naruto-y-sasuke-naruto.gif" },
  { name: "Naruto Vs Sasuke 5 (GIF)", url: "https://media.tenor.com/vDer7kIfypUAAAAC/naruto-sasuke.gif" },
  { name: "Luffy Gear 5 (GIF)", url: "https://media.tenor.com/-u7ZED9-uPQAAAAC/luffy-one-piece.gif" },
  { name: "Luffy Gear 5 2 (GIF)", url: "https://media.tenor.com/wA4P6uv0UbcAAAAC/luffy-luffy-gear-5.gif" },
  { name: "Luffy Gear 5 3 (GIF)", url: "https://media.tenor.com/qanLZ89oReAAAAAC/gear-5-gear-5-luffy.gif" },
  { name: "Luffy Gear 5 4 (GIF)", url: "https://media.tenor.com/FbWiFKa8RU4AAAAC/egghead-one-piece.gif" },
  { name: "Luffy Gear 5 5 (GIF)", url: "https://media.tenor.com/0oH_oZ43RxEAAAAC/luffy-gear-5.gif" },
  { name: "Tengen Vs Gyutaro (GIF)", url: "https://media.tenor.com/AB3KVHx3-iUAAAAC/gyutaro.gif" },
  { name: "Tengen Vs Gyutaro 2 (GIF)", url: "https://media.tenor.com/z2uTsNU-AgkAAAAC/tengen-uzui.gif" },
  { name: "Tengen Vs Gyutaro 3 (GIF)", url: "https://media.tenor.com/dAQwuc1yVkYAAAAC/demon-slayer-tengen-uzui.gif" },
  { name: "Tengen Vs Gyutaro 4 (GIF)", url: "https://media.tenor.com/sEeV12Mzd-wAAAAC/katsura-zura.gif" },
  { name: "Tengen Vs Gyutaro 5 (GIF)", url: "https://media.tenor.com/A9-iF8TRGycAAAAC/tengen-toppa-gurren-laggan.gif" },
  { name: "Satoru Gojo Fight (GIF)", url: "https://media.tenor.com/C-yk7Vi16W4AAAAC/gojo-gojo-satoru.gif" },
  { name: "Satoru Gojo Fight 2 (GIF)", url: "https://media.tenor.com/hFBHiu0Bs5YAAAAC/gojo-gojo-satoru.gif" },
  { name: "Satoru Gojo Fight 3 (GIF)", url: "https://media.tenor.com/wk_m4mHsll0AAAAC/gojo-satoru-sukuna.gif" },
  { name: "Satoru Gojo Fight 4 (GIF)", url: "https://media.tenor.com/_klXJD3gGbIAAAAC/223-jjk.gif" },
  { name: "Satoru Gojo Fight 5 (GIF)", url: "https://media.tenor.com/0X3k5nX33ccAAAAC/gojo-satoru-gojo.gif" },
  { name: "Ichigo Bankai (GIF)", url: "https://media.tenor.com/gMs1rJC0UEwAAAAC/grimmjow-bleach.gif" },
  { name: "Ichigo Bankai 2 (GIF)", url: "https://media.tenor.com/cgm7Zu_lKc4AAAAC/ichigo-kurosaki-ichigo.gif" },
  { name: "Ichigo Bankai 3 (GIF)", url: "https://media.tenor.com/_4EP4iGn0j0AAAAC/bleach-bleach-anime.gif" },
  { name: "Ichigo Bankai 4 (GIF)", url: "https://media.tenor.com/qZkS79vmE4EAAAAC/bleach-bleach-anime.gif" },
  { name: "Ichigo Bankai 5 (GIF)", url: "https://media.tenor.com/47vjZezRWGwAAAAC/ichigo-kurosaki-ichigo.gif" },
  { name: "Saber Alter Fight (GIF)", url: "https://media.tenor.com/uI8oAgroF60AAAAC/anime-fate.gif" },
  { name: "Saber Alter Fight 2 (GIF)", url: "https://media.tenor.com/VPuOIpYsgdgAAAAC/saber-alter-fate-stay-night.gif" },
  { name: "Saber Alter Fight 3 (GIF)", url: "https://media.tenor.com/Pb0hXap8098AAAAC/saber-saber-alter.gif" },
  { name: "Saber Alter Fight 4 (GIF)", url: "https://media.tenor.com/N5VTTClVHtgAAAAC/fate-saber.gif" },
  { name: "Saber Alter Fight 5 (GIF)", url: "https://media.tenor.com/c6lBymsAsIwAAAAC/%E3%83%95%E3%82%A7%E3%82%A4%E3%83%88-fate.gif" },
  { name: "Saitama Serious Punch (GIF)", url: "https://media.tenor.com/Nu7_3DRUgd8AAAAC/angry-power.gif" },
  { name: "Saitama Serious Punch 2 (GIF)", url: "https://media.tenor.com/UFqOCNTRJoYAAAAC/serious-saitama.gif" },
  { name: "Saitama Serious Punch 3 (GIF)", url: "https://media.tenor.com/ecP2ObBoeD8AAAAC/saitama-onepunchman.gif" },
  { name: "Saitama Serious Punch 4 (GIF)", url: "https://media.tenor.com/dIcma4IEqzgAAAAC/saitama-one-punch-man.gif" },
  { name: "Saitama Serious Punch 5 (GIF)", url: "https://media.tenor.com/ZTU55HQaVWIAAAAC/one-punch-man-opm.gif" },
  { name: "Mob Psycho 100 Fight (GIF)", url: "https://media.tenor.com/09DQEf0Rm9AAAAAC/mob-psycho100-mob-psycho.gif" },
  { name: "Mob Psycho 100 Fight 2 (GIF)", url: "https://media.tenor.com/OPIrbyZ8-UMAAAAC/mob-psycho-mob-psycho-100.gif" },
  { name: "Mob Psycho 100 Fight 3 (GIF)", url: "https://media.tenor.com/0z989iO5FoIAAAAC/mob-psycho100.gif" },
  { name: "Mob Psycho 100 Fight 4 (GIF)", url: "https://media.tenor.com/WnRXXLRlXvIAAAAC/mob-psycho-mob-psycho-season3.gif" },
  { name: "Mob Psycho 100 Fight 5 (GIF)", url: "https://media.tenor.com/424V02yEVSwAAAAC/mob-mob-psycho.gif" },
  { name: "Levi Vs Beast Titan (GIF)", url: "https://media.tenor.com/oldQIP9-NJoAAAAC/outer-heaven-sanji.gif" },
  { name: "Levi Vs Beast Titan 2 (GIF)", url: "https://media.tenor.com/m77qrIJ67ygAAAAC/levi-ackerman.gif" },
  { name: "Levi Vs Beast Titan 3 (GIF)", url: "https://media.tenor.com/Wgx_-aIR2e8AAAAC/levi-ackerman-levi-ackerman-no.gif" },
  { name: "Levi Vs Beast Titan 4 (GIF)", url: "https://media.tenor.com/W6gZ_vIYD6UAAAAC/aot-levi.gif" },
  { name: "Levi Vs Beast Titan 5 (GIF)", url: "https://media.tenor.com/1JK0oYDpf4oAAAAC/levi-ackerman-attack-on-titan-levi.gif" }
];

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
  };

  // Orca/Ocean-themed ranking based on watched episodes
  const getRank = (eps: number) => {
    if (eps >= 5000) return "Ocean Sovereign";
    if (eps >= 2500) return "Leviathan";
    if (eps >= 1000) return "Apex Orca";
    if (eps >= 500) return "Great White Shark";
    if (eps >= 250) return "Dolphin";
    if (eps >= 100) return "Sea Turtle";
    if (eps >= 50) return "Jellyfish";
    return "Plankton";
  };

  const currentRank = getRank(stats.totalEps);

  // Custom User Profile State
  const [customProfile, setCustomProfile] = useState({
    name: "",
    bio: "Pecinta anime musiman yang sedang mencari harta karun di lautan internet.",
    avatar: "",
    banner: PRESET_BANNERS[0].url
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ ...customProfile });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const stored = await AsyncStorage.getItem("@custom_profile");
        if (stored) {
          setCustomProfile(JSON.parse(stored));
        } else if (user) {
          // Initialize with Google data if no custom data exists
          setCustomProfile(prev => ({
            ...prev,
            name: user.name || "Orca User",
            avatar: user.image || user.picture || "https://api.dicebear.com/7.x/notionists/svg?seed=OrcaUser"
          }));
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    try {
      await AsyncStorage.setItem("@custom_profile", JSON.stringify(editForm));
      setCustomProfile(editForm);
      setIsEditing(false);
    } catch (e) {
      Alert.alert("Error", "Gagal menyimpan profil");
    }
  };

  const openEditModal = () => {
    setEditForm({
      name: customProfile.name || user?.name || "Orca User",
      bio: customProfile.bio,
      avatar: customProfile.avatar || user?.image || user?.picture || "https://api.dicebear.com/7.x/notionists/svg?seed=OrcaUser",
      banner: customProfile.banner
    });
    setIsEditing(true);
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
            source={{ uri: customProfile.banner }} 
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
          <LinearGradient 
            colors={["rgba(10,8,18,0.1)", "rgba(10,8,18,0.8)", Theme.colors.background]} 
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          {user && (
            <Pressable onPress={openEditModal} style={styles.editBannerBtn}>
              <Edit2 size={16} color="white" />
            </Pressable>
          )}
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
                    source={{ uri: customProfile.avatar || user?.image || user?.picture || "https://api.dicebear.com/7.x/notionists/svg?seed=OrcaUser" }} 
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Text style={styles.userName}>
                    {customProfile.name || user.name || "Orca User"}
                  </Text>
                  <Pressable onPress={openEditModal} style={styles.editNameBtn}>
                    <Edit2 size={14} color={Theme.colors.textDim} />
                  </Pressable>
                </View>
                
                {/* Auto-calculated Rank */}
                <View style={styles.titleBadge}>
                  <Sparkles size={12} color={Theme.colors.warning} />
                  <Text style={styles.titleText}>{currentRank}</Text>
                  <Sparkles size={12} color={Theme.colors.warning} />
                </View>

                {/* User Bio */}
                <Text style={styles.userBio}>
                  {customProfile.bio}
                </Text>

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

      {/* Edit Profile Modal */}
      <Modal visible={isEditing} animationType="slide" transparent={true} onRequestClose={() => setIsEditing(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profil</Text>
              <Pressable onPress={() => setIsEditing(false)} style={styles.closeModalBtn}>
                <X size={24} color={Theme.colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Nama Tampilan</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.name}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
                placeholder="Masukkan nama"
                placeholderTextColor={Theme.colors.textDim}
              />

              <Text style={styles.inputLabel}>Bio Singkat</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.bio}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, bio: text }))}
                placeholder="Tulis bio singkat..."
                placeholderTextColor={Theme.colors.textDim}
              />

              <Text style={styles.inputLabel}>Pilih Avatar</Text>
              <View style={styles.gridContainer}>
                {PRESET_AVATARS.map((url, i) => (
                  <Pressable 
                    key={i} 
                    onPress={() => setEditForm(prev => ({...prev, avatar: url}))}
                    style={[styles.avatarOption, editForm.avatar === url && styles.avatarOptionSelected]}
                  >
                    <Image source={{ uri: url }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                  </Pressable>
                ))}
              </View>

              <Text style={styles.inputLabel}>Pilih Banner Profile</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={PRESET_BANNERS}
                keyExtractor={(_, index) => String(index)}
                style={styles.bannerScroll}
                contentContainerStyle={styles.bannerScrollContent}
                renderItem={({ item: banner }) => (
                  <Pressable 
                    onPress={() => setEditForm(prev => ({...prev, banner: banner.url}))}
                    style={[styles.bannerOption, editForm.banner === banner.url && styles.bannerOptionSelected]}
                  >
                    <Image source={{ uri: banner.url }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFillObject} />
                    <View style={styles.bannerOptionLabel}>
                       <Text style={styles.bannerOptionText}>{banner.name}</Text>
                    </View>
                  </Pressable>
                )}
              />
              <View style={{ height: 40 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable onPress={handleSaveProfile} style={styles.saveButton}>
                <Save size={18} color={Theme.colors.background} />
                <Text style={styles.saveButtonText}>Simpan Profil</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
  userBio: {
    color: Theme.colors.textDim,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
    lineHeight: 18,
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
  editBannerBtn: {
    position: 'absolute',
    top: 48,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  editNameBtn: {
    padding: 4,
    backgroundColor: Theme.colors.surface2,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  modalTitle: {
    color: Theme.colors.text,
    fontSize: 18,
    fontWeight: Theme.typography.weights.bold,
  },
  closeModalBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: Theme.typography.weights.semibold,
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: Theme.colors.surface2,
    color: Theme.colors.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    fontSize: 14,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  saveButton: {
    backgroundColor: Theme.colors.text,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  saveButtonText: {
    color: Theme.colors.background,
    fontSize: 16,
    fontWeight: Theme.typography.weights.bold,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  avatarOption: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface2,
  },
  avatarOptionSelected: {
    borderColor: Theme.colors.primary,
  },
  bannerScroll: {
    marginHorizontal: -20,
  },
  bannerScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  bannerOption: {
    width: 160,
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface2,
  },
  bannerOptionSelected: {
    borderColor: Theme.colors.primary,
  },
  bannerOptionLabel: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    right: 8,
  },
  bannerOptionText: {
    color: 'white',
    fontSize: 10,
    fontWeight: Theme.typography.weights.bold,
  },
});
