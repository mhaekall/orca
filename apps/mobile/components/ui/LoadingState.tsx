import React from "react";
import { View, Animated, Dimensions } from "react-native";
import { Skeleton } from "../Skeleton";

const { width: W } = Dimensions.get("window");

export function LoadingState() {
  return (
    <View style={{ paddingTop: 0 }}>
      <View style={{ marginBottom: 28 }}>
        <Skeleton w={W} h={W * 1.4} r={0} />
      </View>
      {[0, 1, 2].map((s) => (
        <View key={s} style={{ marginBottom: 28 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, marginBottom: 12 }}>
            <Skeleton w={140} h={16} r={6} />
          </View>
          <View style={{ flexDirection: "row", gap: 10, paddingLeft: 16 }}>
            {[0, 1, 2, 3].map((c) => (
              <View key={c} style={{ gap: 6 }}>
                <Skeleton w={s === 1 ? W * 0.72 : 110} h={s === 1 ? 155 : 158} r={14} />
                {s !== 1 && <Skeleton w={85} h={10} r={5} />}
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
