import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, Stack } from "expo-router";
import { Bell, ArrowLeft, CheckCircle } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useSWR from "swr";
import { useAuth } from "../lib/auth";

import { API_URL } from "../lib/config";
const API = API_URL;
import { fetcher } from "../lib/fetcher";
const BG = "#0a0812";
const SURFACE = "#1f1c29";

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isLoading: authLoading } = useAuth();

  const { data, isLoading, isValidating, mutate } = useSWR(
    user ? `${API}/api/v2/social/notifications` : null,
    fetcher,
    { refreshInterval: 60000 }
  );

  useEffect(() => {
    // If auth is loaded and user is not logged in, redirect to profile/login
    if (!authLoading && !user) {
      router.replace("/profile" as any);
    }
  }, [user, authLoading]);

  const notifications = data?.data || [];

  if (authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0A84FF" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={{ paddingTop: insets.top, backgroundColor: "rgba(19,17,26,0.9)", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)", zIndex: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={{ padding: 4, marginLeft: -4 }}>
              <ArrowLeft size={24} color="#fff" />
            </Pressable>
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800", letterSpacing: -0.5 }}>Notifikasi</Text>
          </View>
          {notifications.length > 0 && (
            <Pressable style={s.readAllBtn}>
              <CheckCircle size={14} color="#0A84FF" />
              <Text style={s.readAllText}>Baca Semua</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={isValidating && !!data}
            onRefresh={() => mutate()}
            tintColor="#fff"
            colors={["#0A84FF"]}
          />
        }
      >
        {isLoading ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={{ color: "rgba(255,255,255,0.4)", marginTop: 12, fontSize: 13, fontWeight: "600" }}>Memuat notifikasi...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={{ paddingVertical: 80, alignItems: "center", paddingHorizontal: 40 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: SURFACE, justifyContent: "center", alignItems: "center", marginBottom: 20 }}>
              <Bell size={28} color="rgba(255,255,255,0.2)" />
            </View>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 8 }}>Belum ada notifikasi</Text>
            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, textAlign: "center", lineHeight: 20 }}>Update episode baru untuk anime favorit Anda akan muncul di sini.</Text>
          </View>
        ) : (
          notifications.map((notif: any, i: number) => (
            <Pressable
              key={notif.id || i}
              style={[
                s.notifCard,
                notif.isUnread ? { backgroundColor: SURFACE, borderColor: "rgba(255,255,255,0.1)" } : { backgroundColor: "transparent", borderColor: "transparent" }
              ]}
              onPress={() => {
                 if (notif.link) {
                    // Assume link format is /anime/[id] or /watch/[id]/[ep]
                    router.push(notif.link as any);
                 }
              }}
            >
              {notif.isUnread && <View style={s.unreadDot} />}
              
              <View style={[s.iconBox, notif.isUnread ? { borderColor: "rgba(10,132,255,0.3)" } : {}]}>
                <Bell size={20} color={notif.isUnread ? "#0A84FF" : "rgba(255,255,255,0.4)"} />
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={[s.title, notif.isUnread ? { color: "#fff", fontWeight: "700" } : { color: "rgba(255,255,255,0.7)", fontWeight: "500" }]} numberOfLines={1}>
                  {notif.title}
                </Text>
                <Text style={s.message} numberOfLines={2}>
                  {notif.message}
                </Text>
                <Text style={s.time}>
                  {notif.time || "Beberapa saat lalu"}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  readAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(10,132,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  readAllText: {
    color: "#0A84FF",
    fontSize: 12,
    fontWeight: "700",
  },
  notifCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    position: "relative",
    overflow: "hidden",
  },
  unreadDot: {
    position: "absolute",
    top: 16,
    left: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#0A84FF",
    shadowColor: "#0A84FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.02)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  title: {
    fontSize: 15,
    marginBottom: 4,
    lineHeight: 20,
  },
  message: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  time: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});