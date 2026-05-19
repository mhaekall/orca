import React from "react";
import { View, Animated, Dimensions } from "react-native";
import { Skeleton } from "../Skeleton";

const { width: W } = Dimensions.get("window");

export function LoadingState() {
  return (
    <View style={{ paddingTop: 0 }}>
      <View style={{ marginBottom: 28 }}>
        <Skeleton w={W} h={W * (4/3)} r={0} />
      </View>
      {[0, 1, 2].map((s) => (
        <View key={s} style={{ marginBottom: 32 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, marginBottom: 16 }}>
            <Skeleton w={160} h={18} r={6} />
          </View>
          <View style={{ flexDirection: "row", gap: 12, paddingLeft: 16 }}>
            {[0, 1, 2].map((c) => (
              <View key={c} style={{ gap: 8 }}>
                <Skeleton 
                  w={s === 1 ? W * 0.55 : 110} 
                  h={s === 1 ? 230 : 158} 
                  r={16} 
                />
                <Skeleton w={s === 1 ? 120 : 85} h={12} r={6} />
                {s !== 1 && <Skeleton w={60} h={10} r={5} />}
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
