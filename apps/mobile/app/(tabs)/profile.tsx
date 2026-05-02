import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { User, Settings, ChevronRight, Bookmark } from "lucide-react-native";

export default function ProfileScreen() {
  return (
    <View className="flex-1 bg-[#13111a]">
      <ScrollView className="flex-1 px-6 pt-16" contentContainerStyle={{ paddingBottom: 120 }}>
        <Text className="text-[28px] font-black text-white tracking-tight mb-8">
          Profil
        </Text>
        
        <View className="flex-row items-center mb-10">
          <View className="w-16 h-16 rounded-full bg-[#1c1c1e] items-center justify-center border border-white/10 mr-4">
            <User size={32} color="#8e8e93" />
          </View>
          <View>
            <Text className="text-xl font-bold text-white mb-1">Guest</Text>
            <Text className="text-[#8e8e93] text-sm font-medium">Masuk untuk simpan progres</Text>
          </View>
        </View>

        <View className="bg-[#1c1c1e] rounded-2xl overflow-hidden border border-white/5 mb-6">
          <Pressable className="flex-row items-center justify-between p-4 border-b border-white/5 active:bg-white/5">
            <View className="flex-row items-center">
              <Bookmark size={20} color="#0a84ff" />
              <Text className="text-white text-base ml-3 font-medium">Koleksi Saya</Text>
            </View>
            <ChevronRight size={20} color="#8e8e93" />
          </Pressable>
          <Pressable className="flex-row items-center justify-between p-4 active:bg-white/5">
            <View className="flex-row items-center">
              <Settings size={20} color="#8e8e93" />
              <Text className="text-white text-base ml-3 font-medium">Pengaturan</Text>
            </View>
            <ChevronRight size={20} color="#8e8e93" />
          </Pressable>
        </View>

        <Pressable className="bg-[#0a84ff] rounded-xl py-3.5 items-center mt-2 active:opacity-80">
          <Text className="text-white font-bold text-base">Masuk (Login)</Text>
        </Pressable>

      </ScrollView>
    </View>
  );
}
