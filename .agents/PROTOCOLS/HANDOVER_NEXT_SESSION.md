# 🎯 Handover: Expo Mobile Native Migration (Termux Environment)

## 1. Context Summary
- **Current State:** The project has officially migrated its frontend focus from the Next.js/Capacitor web wrapper (`apps/web`) to a fully Native React Native application using Expo (`apps/mobile`).
- **Development Environment Constraints (Termux/Android):**
  - **Hermes Compiler Disabled:** Termux ARM64 cannot compile Hermes. The app strictly uses `jsEngine: "jsc"` and `newArchEnabled: false` in `app.json`.
  - **NativeWind v2:** Because NativeWind v4 strictly requires Reanimated (which requires Hermes), the mobile app is downgraded to NativeWind v2 + Tailwind 3.3.2.
  - **ENOSPC Watcher Crash:** Running multiple Metro background servers in Termux exhausts the Android file watcher limit (`ENOSPC`), causing `npx expo start` to crash. **Solution:** Use static exports (`npx expo export -p android`) to verify compilation and UI layouts without relying on Metro file watchers, or explicitly kill Termux (swipe up) to free up memory before restarting the server.
  - **Pnpm Symlink Explosion:** `apps/mobile` is deliberately excluded from `pnpm-workspace.yaml`. It must use `npm install --legacy-peer-deps` to avoid file watcher crashes.
- **Recent Mobile Milestones:**
  - **Video Player:** Integrated `expo-video`. Replaced `player.replace()` with `player.replaceAsync()` to prevent UI freezes on iOS. Added a strict filter to discard `iframe` sources, as `expo-video` only supports direct `.mp4` and `.m3u8` streams. Bound a `useEffect` hook to aggressively replace the source as soon as the async SWR data resolves.
  - **Comments UI:** Built a native React Native `Modal` combined with `KeyboardAvoidingView` and `SafeAreaView` in `apps/mobile/components/CommentSection.tsx` to handle nested comments seamlessly (replicating the web experience).
  - **Custom Home UI (Apple HIG Focus):** Abandoned uniform NativeWind grids for the Home Screen (`apps/mobile/app/(tabs)/index.tsx`). Implemented a highly engaging, asymmetrical layout using pure React Native `StyleSheet`. The layout features:
    - A massive full-screen poster Hero (`aspectRatio: 3/4`, extending behind a transparent Animated Header).
    - An asymmetrical `SpotlightRow` (`flex: 1.5` / `flex: 1`) for Trending.
    - An integrated Search Bar nestled directly between the Logo and Notification Bell in the header.
    - Subtle `rgba(255,255,255,0.05)` borders mimicking premium glassmorphism.
    - Note: The Hero Carousel experiment was reverted due to performance and clipping issues; the Hero is currently a static, single poster with a round Play icon at the bottom right.
  - **Auth Session Validation Bypass:** Local Google OAuth testing in Expo Go blocks redirect URIs. We implemented a mocked session fallback. In `app.json` (and `auth.tsx`), the `iosClientId` is deliberately mirrored to `androidClientId` and `webClientId` to bypass strict validation in the `expo-auth-session` library while developing in Termux.

## 2. Next Session Priority
Focus on extending the Mobile UI into the remaining tabs and refining the player layout.

### Step-by-Step Task:
1. **Complete Mobile Tabs:** Migrate the Web `ScheduleView` logic into `apps/mobile/app/(tabs)/schedule.tsx` and the `CollectionView` into `apps/mobile/app/(tabs)/collection.tsx`.
2. **Video Player Refinements:** Consider adding double-tap to seek (forward/backward) overlays using React Native gesture handlers over the `VideoView` component.
3. **P2P/Bandwidth Saving (Stretch Goal):** Investigate if a lightweight native WebRTC library or a caching proxy proxy pattern can be integrated into the mobile app to save bandwidth, similar to `p2p-media-loader` on the web.

## 3. How to Give Context for the Next Session
When starting a new session with an AI Agent, simply copy and paste this exact prompt:
> "Read `.agents/PROTOCOLS/HANDOVER_NEXT_SESSION.md` to understand the complex Termux limitations (ENOSPC, JSC Engine) and the current state of our Expo Native Mobile Migration. We are focusing on finishing the Mobile UI."
