import { Tabs } from "expo-router";
import { House, Calendar, Bookmark, CircleUser } from "lucide-react-native";
import { Platform, View } from "react-native";
import { Image } from "expo-image";
import { useAuth } from "../../lib/auth";

// Helper component to handle dynamic scale and background pill
function TabIcon({ IconComponent, color, focused, isProfile, userImg }: { IconComponent: any, color: string, focused: boolean, isProfile?: boolean, userImg?: string }) {
  const size = 26; // Ukuran tetap sama (ukuran saat ada pill bg)

  return (
    <View 
      style={[
        { alignItems: "center", justifyContent: "center" },
        focused ? {
          backgroundColor: "rgba(255, 255, 255, 0.08)", // Latar belakang (pill) saat aktif
          paddingHorizontal: 18,
          paddingVertical: 8,
          borderRadius: 18,
          marginTop: -2, // Naikkan posisi icon (kompensasi padding)
        } : {
          marginTop: -6, // Naikkan posisi icon saat tidak aktif
        }
      ]}
    >
      {isProfile && userImg ? (
        <Image 
          source={{ uri: userImg }} 
          style={{ width: size, height: size, borderRadius: size / 2, borderWidth: focused ? 1.5 : 0, borderColor: color }} 
          contentFit="cover"
        />
      ) : (
        <IconComponent 
          size={size} 
          color={color} 
          strokeWidth={focused ? 2.5 : 2} 
          fill={focused ? color : "transparent"} 
        />
      )}
    </View>
  );
}

export default function TabLayout() {
  const { user } = useAuth();
  const userImg = user?.image || user?.picture || user?.avatarUrl || user?.avatar;

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
          paddingTop: 8, // Mengurangi padding top agar ikon lebih naik
        },
        tabBarActiveTintColor: "#ffffff", // Web uses white for active
        tabBarInactiveTintColor: "rgba(255,255,255,0.4)", // Web uses white/40 for inactive
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "bold",
          marginTop: 6, // Jarak teks dengan ikon tetap proporsional
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
            <TabIcon IconComponent={CircleUser} color={color} focused={focused} isProfile={true} userImg={userImg} />
          ),
        }}
      />
    </Tabs>
  );
}