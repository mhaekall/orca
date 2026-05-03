import { Tabs } from "expo-router";
import { House, Calendar, Bookmark, CircleUser } from "lucide-react-native";
import { Platform, View } from "react-native";

// Helper component to handle dynamic scale and background pill
function TabIcon({ IconComponent, color, focused }: { IconComponent: any, color: string, focused: boolean }) {
  const size = focused ? 22 : 26; // Sedikit lebih kecil saat aktif

  return (
    <View 
      style={[
        { alignItems: "center", justifyContent: "center" },
        focused && {
          backgroundColor: "rgba(255, 255, 255, 0.08)", // Latar belakang (pill) saat aktif
          paddingHorizontal: 16,
          paddingVertical: 6,
          borderRadius: 16,
          marginTop: 2, // Kompensasi posisi agar sejajar dengan label
        }
      ]}
    >
      <IconComponent 
        size={size} 
        color={color} 
        strokeWidth={focused ? 2.5 : 2} 
        fill={focused ? color : "transparent"} 
      />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0a0812", // Warna dasar Beranda
          position: "absolute",
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === "ios" ? 90 : 70,
          paddingBottom: Platform.OS === "ios" ? 30 : 12,
          paddingTop: 12,
        },
        tabBarActiveTintColor: "#ffffff", // Web uses white for active
        tabBarInactiveTintColor: "rgba(255,255,255,0.4)", // Web uses white/40 for inactive
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "bold",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Beranda",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon IconComponent={House} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: "Jadwal",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon IconComponent={Calendar} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: "Koleksi",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon IconComponent={Bookmark} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon IconComponent={CircleUser} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}