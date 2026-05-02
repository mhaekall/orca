import React from "react";
import { View, Text, ScrollView } from "react-native";
import { Calendar } from "lucide-react-native";

export default function ScheduleScreen() {
  return (
    <View className="flex-1 bg-[#13111a]">
      <ScrollView className="flex-1 px-6 pt-16" contentContainerStyle={{ paddingBottom: 120 }}>
        <Text className="text-[28px] font-black text-white tracking-tight mb-2">
          Jadwal Rilis
        </Text>
        <Text className="text-[#8e8e93] text-sm mb-8 font-medium">
          Episode terbaru minggu ini
        </Text>
        
        <View className="flex-1 items-center justify-center py-20 opacity-50">
          <Calendar size={64} color="#8e8e93" strokeWidth={1} />
          <Text className="text-[#8e8e93] text-base mt-4 font-medium text-center">
            Memuat jadwal tayang...
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
