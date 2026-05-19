import { Tabs } from "expo-router";
import { House, Calendar, Bookmark, CircleUser } from "lucide-react-native";
import { Platform, View } from "react-native";
import { Image } from "expo-image";
import { useAuth } from "../../lib/auth";
import { Theme } from "../../lib/theme";

// Refined TabIcon: Zero-scale, full opacity icons with purely pill-based focus
function TabIcon({ IconComponent, color, focused, isProfile, userImg }: { IconComponent: any, color: string, focused: boolean, isProfile?: boolean, userImg?: string }) {
  const size = 24; 

  return (
    <View style={{ width: 60, height: 40, alignItems: "center", justifyContent: "center", marginTop: Theme.layout.tabBar.iconMarginTop }}>
      {/* Absolute Pill Layer to prevent layout shifts */}
      {focused && (
        <View 
          style={{
            position: 'absolute',
            width: Theme.layout.tabBar.pillWidth, 
            height: Theme.layout.tabBar.pillHeight,
            backgroundColor: "rgba(255, 255, 255, 0.08)", 
            borderRadius: Theme.layout.tabBar.pillHeight / 2,
          }} 
        />
      )}
      
      {isProfile && userImg ? (
        <Image 
          source={{ uri: userImg }} 
          style={{ 
            width: size, 
            height: size, 
            borderRadius: size / 2, 
            borderWidth: focused ? 1.5 : 0, 
            borderColor: color 
          }} 
          contentFit="cover"
        />
      ) : (
        <IconComponent 
          size={size} 
          color="#ffffff" // Always full white
          strokeWidth={2} // Strictly consistent
          fill="none" 
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
          backgroundColor: "#0a0812",
          position: "absolute",
          borderTopWidth: 0,
          elevation: 0,
          height: Theme.layout.tabBar.height,
          paddingBottom: Theme.layout.tabBar.paddingBottom,
        },
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "#ffffff", // All icons "light up" fully
        tabBarLabelStyle: {
          fontSize: Theme.layout.tabBar.fontSize,
          fontWeight: Theme.layout.tabBar.fontWeight,
          marginTop: 14, // Lowered significantly
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