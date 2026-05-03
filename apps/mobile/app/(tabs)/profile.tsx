import React from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
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
    <View className="flex-1 bg-[#0a0812]">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100, paddingTop: 60, paddingHorizontal: 16 }}>
        
        {/* Header Profile Section */}
        <View className="items-center justify-center pt-8 pb-6 border-b border-white/10 relative mb-6">
          <View className="relative mb-4">
            <View className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/20 bg-[#1f1c29]">
              <Image 
                source={{ uri: user?.image || user?.picture || "https://api.dicebear.com/7.x/notionists/svg?seed=OrcaUser" }} 
                style={{ width: '100%', height: '100%' }}
                contentFit="cover" 
              />
            </View>
            {user && (
              <View className="absolute -bottom-2 -right-2 bg-[#0A84FF] p-1.5 rounded-full border-2 border-black z-20">
                <Crown size={16} color="white" />
              </View>
            )}
          </View>

          {user ? (
            <View className="items-center space-y-1">
              <Text className="text-2xl font-black text-white tracking-tight">
                {user.name || "Orca User"}
              </Text>
              <Text className="text-sm font-medium text-white/60">@{user.email?.split('@')[0]}</Text>
              
              <View className="flex-row items-center justify-center pt-3 mt-2">
                <View className="items-center px-4 py-1.5">
                  <Text className="text-lg font-black text-white">0</Text>
                  <Text className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Pengikut</Text>
                </View>
                <View className="w-[1px] h-8 bg-white/10" />
                <View className="items-center px-4 py-1.5">
                  <Text className="text-lg font-black text-white">0</Text>
                  <Text className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Mengikuti</Text>
                </View>
                <View className="w-[1px] h-8 bg-white/10" />
                <View className="items-center px-4 py-1.5">
                  <Text className="text-lg font-black text-white">{stats.completed}</Text>
                  <Text className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Tamat</Text>
                </View>
              </View>
            </View>
          ) : (
            <View className="items-center py-2">
              <Text className="text-2xl font-black text-white mb-2">Guest Mode</Text>
              <Text className="text-sm text-white/50 mb-4 text-center px-4">Masuk untuk melacak riwayat tontonan, mengelola koleksi, dan berinteraksi dengan komunitas.</Text>
              <Pressable 
                onPress={signInWithGoogle}
                disabled={isLoading}
                className={`flex-row items-center justify-center gap-2 bg-white px-6 py-3 rounded-full ${isLoading ? 'opacity-50' : 'active:opacity-80'}`}
              >
                <Text className="text-black font-bold text-sm">
                  {isLoading ? "Memproses..." : "Lanjutkan dengan Google"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Social / Action Buttons */}
        {user && (
          <View className="flex-row gap-3 mb-6">
            <Pressable className="flex-1 flex-col items-center justify-center p-4 bg-[#1f1c29] rounded-2xl border border-white/5 active:bg-white/5">
              <Bell size={24} color="white" className="mb-2" />
              <Text className="text-xs font-bold text-white/80">Notifikasi</Text>
            </Pressable>
            <Pressable 
              onPress={() => Alert.alert("Segera Hadir", "Fitur Teman sedang dalam pengembangan!")}
              className="flex-1 flex-col items-center justify-center p-4 bg-[#1f1c29] rounded-2xl border border-white/5 active:bg-white/5"
            >
              <Users size={24} color="white" className="mb-2" />
              <Text className="text-xs font-bold text-white/80">Teman</Text>
            </Pressable>
          </View>
        )}

        {/* Watch Stats */}
        <View className="bg-[#1f1c29] rounded-3xl p-5 border border-white/5 mb-6">
          <View className="flex-row items-center gap-2 mb-4">
            <Activity size={16} color="rgba(255,255,255,0.5)" />
            <Text className="text-[13px] font-black text-white/50 uppercase tracking-widest">
              Aktivitas Menonton
            </Text>
          </View>
          <View className="flex-row justify-between">
            <View className="flex-1 items-center border-r border-white/10">
              <Text className="text-2xl font-black text-white">{stats.totalEps}</Text>
              <Text className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-1">Eps Ditonton</Text>
            </View>
            <View className="flex-1 items-center border-r border-white/10">
              <Text className="text-2xl font-black text-[#FF9F0A]">{stats.days}</Text>
              <Text className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-1">Hari Dihabiskan</Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-2xl font-black text-[#32D74B]">0</Text>
              <Text className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-1">Sedang Aktif</Text>
            </View>
          </View>
        </View>

        {/* Menu / Links */}
        <View className="mb-6">
          <View className="flex-row items-center gap-2 ml-1 mb-3">
            <Settings size={16} color="rgba(255,255,255,0.5)" />
            <Text className="text-[13px] font-black text-white/50 uppercase tracking-widest">
              Sistem & Pengaturan
            </Text>
          </View>
          
          <View className="bg-[#1f1c29] rounded-3xl border border-white/5 overflow-hidden">
            <Pressable className="flex-row items-center justify-between p-4 border-b border-white/5 active:bg-white/5">
              <View className="flex-row items-center gap-3">
                <View className="w-9 h-9 rounded-full items-center justify-center bg-[#FF9F0A]/10">
                  <Crown size={16} color="#FF9F0A" />
                </View>
                <View>
                  <Text className="font-bold text-[14px] text-white">Orca Premium</Text>
                  <Text className="text-[11px] text-white/40">Dukung kreator & hilangkan batasan</Text>
                </View>
              </View>
              <ChevronRight size={20} color="rgba(255,255,255,0.2)" />
            </Pressable>

            <Pressable className="flex-row items-center justify-between p-4 border-b border-white/5 active:bg-white/5">
              <View className="flex-row items-center gap-3">
                <View className="w-9 h-9 rounded-full items-center justify-center bg-white/5">
                  <FileText size={16} color="white" />
                </View>
                <Text className="font-bold text-[14px] text-white">Ketentuan Layanan</Text>
              </View>
              <ChevronRight size={20} color="rgba(255,255,255,0.2)" />
            </Pressable>

            <Pressable className="flex-row items-center justify-between p-4 active:bg-white/5">
              <View className="flex-row items-center gap-3">
                <View className="w-9 h-9 rounded-full items-center justify-center bg-white/5">
                  <Shield size={16} color="white" />
                </View>
                <Text className="font-bold text-[14px] text-white">Kebijakan Privasi</Text>
              </View>
              <ChevronRight size={20} color="rgba(255,255,255,0.2)" />
            </Pressable>
          </View>
        </View>

        {/* Danger Zone */}
        <View className="mb-6">
          <View className="bg-red-500/10 rounded-3xl border border-red-500/20 overflow-hidden">
            {user && (
              <Pressable
                onPress={signOut}
                className="flex-row items-center gap-3 p-4 border-b border-red-500/10 active:bg-red-500/20"
              >
                <View className="w-9 h-9 rounded-full items-center justify-center bg-red-500/20">
                  <LogOut size={16} color="#FF453A" />
                </View>
                <Text className="font-bold text-[14px] text-[#FF453A]">Keluar Akun</Text>
              </Pressable>
            )}
            
            <Pressable 
              onPress={handleClearCache}
              className="flex-row items-center gap-3 p-4 active:bg-red-500/20"
            >
              <View className="w-9 h-9 rounded-full items-center justify-center bg-red-500/20">
                <Shield size={16} color="#FF453A" />
              </View>
              <View>
                <Text className="font-bold text-[14px] text-[#FF453A]">Hapus Cache Lokal</Text>
                <Text className="text-[11px] text-[#FF453A]/60">Reset total data perangkat ini</Text>
              </View>
            </Pressable>
          </View>
        </View>

        <View className="items-center pt-2 pb-4">
          <Text className="text-white/20 text-[10px] font-black tracking-widest uppercase">Orca v3.0.0 (Social Ready)</Text>
          <Text className="text-white/10 text-[9px] font-bold mt-1">Didesain untuk efisiensi maksimal </Text>
        </View>

      </ScrollView>
    </View>
  );
}
