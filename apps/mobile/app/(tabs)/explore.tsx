import React from "react";
import { View, Text, ScrollView, TextInput } from "react-native";
import { Compass, Search } from "lucide-react-native";

export default function ExploreScreen() {
  return (
    <View className="flex-1 bg-[#13111a]">
      <ScrollView className="flex-1 px-6 pt-16" contentContainerStyle={{ paddingBottom: 120 }}>
        <Text className="text-[28px] font-black text-white tracking-tight mb-6">
          Eksplorasi
        </Text>
        
        <View className="flex-row items-center bg-[#1c1c1e] rounded-xl px-4 py-3 mb-8 border border-white/5">
          <Search size={20} color="#8e8e93" />
          <TextInput 
            className="flex-1 ml-3 text-white text-base"
            placeholder="Cari anime, genre, atau studio..."
            placeholderTextColor="#8e8e93"
          />
        </View>

        <View className="flex-1 items-center justify-center py-16 opacity-50">
          <Compass size={64} color="#8e8e93" strokeWidth={1} />
          <Text className="text-[#8e8e93] text-base mt-4 font-medium text-center">
            Jelajahi berbagai judul anime
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
