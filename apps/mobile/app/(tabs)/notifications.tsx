import React from "react";
import { View, Text, ScrollView } from "react-native";
import { Bell } from "lucide-react-native";

export default function NotificationsScreen() {
  return (
    <View className="flex-1 bg-[#13111a]">
      <ScrollView className="flex-1 px-6 pt-16" contentContainerStyle={{ paddingBottom: 120 }}>
        <Text className="text-[28px] font-black text-white tracking-tight mb-8">
          Notifikasi
        </Text>
        
        <View className="flex-1 items-center justify-center py-32 opacity-50">
          <Bell size={64} color="#8e8e93" strokeWidth={1} />
          <Text className="text-white text-lg mt-6 font-bold">
            Belum Ada Pemberitahuan
          </Text>
          <Text className="text-[#8e8e93] text-base mt-2 font-medium text-center px-4">
            Informasi tayangan baru dari anime favoritmu akan muncul di sini.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
