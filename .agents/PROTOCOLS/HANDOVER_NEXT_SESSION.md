# 🎯 Handover: Expo Mobile Native Architecture & Performance (Termux Environment)

## 1. Context Summary
- **Current State:** The project operates as a fully Native React Native application (`apps/mobile`) utilizing Expo, completely detaching from the web wrapper approach. We have successfully completed the core UI implementation and initial performance tuning phases.
- **Development Environment Constraints (Termux/Android):**
  - **Hermes Enabled:** The app uses `jsEngine: "hermes"` and `newArchEnabled: false`.
  - **Reanimated & Tailwind Disabled:** We use pure React Native `StyleSheet` for styling (no NativeWind/Tailwind). All complex animations rely purely on the native React Native `Animated` API with `useNativeDriver: true`.
  - **ENOSPC Watcher Limit:** Extreme caution is required with Metro bundler background processes. Dependencies must be installed via `npm install --legacy-peer-deps` within the isolated `apps/mobile` directory to prevent symlink watcher crashes.
  - **Flexbox Limits:** Dynamic flex bounds can sometimes collapse. We enforce explicit dimensioning (e.g., `width: W * 0.55`) for complex nested lists to ensure stability.

## 2. Completed Milestones (UI Polish & 0ms Latency Tuning)
- **Unified Flat Architecture:** Eliminated spatial elevation layers. The entire app (Bottom Nav, Root Layout, Backgrounds) utilizes a unified deep dark aesthetic (`#0a0812` and `#13111a`), with dynamic absolute positioning used for striking UI accents (e.g., the highlighter-stroke "Tayang Terbaru" badge).
- **Navigation Transition Hardening:** Resolved React Navigation white flashes by wrapping the Root Layout in a `@react-navigation/native` `ThemeProvider` with a dark schema, and configuring `app.json` Android backgrounds to dark mode.
- **0ms Navigation Latency:** Implemented Aggressive Prefetching. Background fetching (`mutate` via SWR) triggers immediately on `onPressIn` across all Anime cards, ensuring payload hydration finishes before navigation animations conclude.
- **Native Skeleton Hydration:** Deprecated blocking `ActivityIndicator` spinners. Implemented a globally reusable, hardware-accelerated `Animated.loop` pulsing skeleton component that mirrors final layout geometries across Home, Detail, Schedule, and Collection screens.
- **Robust Error Boundaries:** Replaced crash-prone null states with graceful degradation UI (Empty States and Network Error screens with integrated "Retry" logic).

## 3. Next Session Priority (Offline-First, CI/CD, & Telemetry)
The next phase moves into Production-Readiness, treating the codebase with strict Big Tech engineering discipline.

### Engineering Directives:
1. **Offline-First Architecture & Caching Strategy:**
   - Implement persistent global storage (`@react-native-async-storage/async-storage`) to aggressively cache SWR payloads (especially the User Collection and Home Layout).
   - Ensure the app renders cached views immediately on Cold Start (Offline Mode) while silently revalidating data in the background upon connection recovery.
2. **CI/CD Pipeline Automation (EAS Build):**
   - Finalize `eas.json` configuration for remote build orchestration. To ensure stable compilation without overloading the local Termux environment, we must transition to Expo Application Services (EAS) to compile the Android `.apk` and iOS `.ipa` in the cloud seamlessly.
3. **Production Telemetry & Bundle Optimization:**
   - Establish logging protocols (e.g., Sentry or minimal custom crash reporting) that respect our environment limits.
   - Audit the `assets/` directory and unused packages to minimize the final APK bundle size.

## 4. How to Give Context for the Next Session
When starting a new session with an AI Agent, simply copy and paste this exact prompt:
> "Read `.agents/PROTOCOLS/HANDOVER_NEXT_SESSION.md`. We have completed the UI and 0ms SWR Prefetching phases using Hermes and pure StyleSheet. Today's directive focuses on Big Tech production standards: Offline-First AsyncStorage caching, EAS Build CI/CD automation, and Bundle Optimization."
