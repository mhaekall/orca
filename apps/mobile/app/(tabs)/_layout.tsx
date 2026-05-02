import { Tabs } from "expo-router";
import { Home, CalendarDays, Library, User } from "lucide-react-native";
import { Platform } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#13111a", // Warna web
          position: "absolute",
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.05)",
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
          tabBarIcon: ({ color }) => <Home size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: "Jadwal",
          tabBarIcon: ({ color }) => <CalendarDays size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: "Koleksi",
          tabBarIcon: ({ color }) => <Library size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => <User size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}