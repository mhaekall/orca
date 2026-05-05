# 🎯 Handover: Expo Mobile Native Architecture & Big Tech Standards (Termux Environment)

## 1. Context Summary
- **Strategic Pivot:** The project is exclusively an **APK (Mobile) streaming platform**. All Web streaming optimizations are deprecated. Our sole focus is making the Expo React Native app (`apps/mobile`) achieve Big Tech production standards (Netflix/Crunchyroll level).
- **Architecture:** We are using SWR for data fetching, Expo Router for navigation, and `expo-video` for playback.
- **Environment:** Termux/Android. Hermes JS Engine enabled. Pure React Native `StyleSheet` (no NativeWind or Tailwind). Native `Animated` API used for animations.
- **Backend:** FastAPI running on Hugging Face Spaces, communicating with Neon Serverless Postgres and Upstash Redis. Telegram API is used for video storage via a Cloudflare Worker proxy (`tele-proxy`).

## 2. Completed Milestones (Fase 1-4)
- **Thin Client Architecture (Task A):** Moved all iframe resolution logic to the FastAPI backend. The mobile app directly consumes clean MP4/HLS URLs without guessing source types.
- **Smart Edge Caching (Task B):** Modified the `tele-proxy` Cloudflare Worker to implement Intelligent Cache Keying based on the `Range` HTTP header. This prevents 200 OK vs 206 Partial Content collisions and protects the Telegram API from 429 Rate Limits without needing client-side cache busters.
- **Proactive Social ChatOps:** 
  - Wired up all social features (Comments, Likes, Collections, Real Views) to real FastAPI endpoints backed by Postgres.
  - Built a berjenjang (threaded) comment system with replies.
  - Upgraded the "Lapor" (Report) button into a proactive Telegram pipeline: it captures the `video_url` and `player_error`, sends them to the Telegram Bot, and provides an **Inline Keyboard Button ("Triage & Re-Ingest Video")**. Clicking this button hits our webhook, clears Redis error locks, and automatically re-queues the episode for syncing (Self-Healing).
- **Resume Video (Netflix-style) & History Sync Fix:** 
  - Implemented a background `watch-session` ping every 15 seconds, and a lifecycle hook to instantly save progress when the video unmounts. 
  - Fixed a critical bug where `user.id` vs `user.email` caused the backend to reject watch history payload. 
  - Sent progress updates redundantly to both `/api/v2/social/watch-session` and `/api/v2/social/progress` to instantly reflect the latest watched episode in the "Lanjutkan Menonton" history timeline across Home and Collection tabs.
- **Apple HIG & Premium UI Overhaul:**
  - Redesigned Home Screen ("Lanjutkan Menonton") with compact 140x78 history cards, restricted to max 8 latest episodes. SWR revalidation triggered via `useFocusEffect` guarantees realtime updates.
  - Overhauled Anime Detail Screen: `aspectRatio: 3/4` for Hero Image, Animated Header Top Bar (like Home), moved MetaPill stats directly under titles, removed duplicate tags, repositioned Action buttons (Share, Bookmark, Play) in a horizontal flex layout above the genres, and created a native-feeling inline "Baca Selengkapnya" expander for synopsis. Typescript compilation errors related to `StyleSheet` and deep `FlatList` component rendering have been strictly handled with localized `useCallback` renders and proper styling arrays.

## 3. Next Session Execution Directives (Big Tech Standards)
The application logic and backend are highly robust, but the frontend still lacks offline resilience and seamless episode transitions. The next agent must execute the following:

### Task C: Zero-Loading Screen (Offline-First SWR)
**Goal:** Achieve 0ms cold starts where the app instantly loads cached catalogs and user collections even without internet, updating silently in the background when connectivity returns.
**Action:**
1. Install `@react-native-async-storage/async-storage` (using `pnpm install` inside `apps/mobile` to avoid Termux symlink issues).
2. Build a Custom Cache Provider for SWR in `apps/mobile/lib/swr-provider.tsx` that persists all SWR payloads (especially the Home feed and User Collection) to AsyncStorage.
3. Ensure the app gracefully handles `503 Service Unavailable` or `ReadTimeout` errors (which happen when Hugging Face Spaces are sleeping) by relying on this persistent cache.

### Task D: Auto-Play Next Episode
**Goal:** Seamless binge-watching experience.
**Action:**
1. Implement a countdown or automatic transition logic in the video player when the current playback reaches >95% completion.
2. Automatically load and play the next episode in the series without requiring the user to tap "Next" manually.

## 4. How to Give Context for the Next Session
When starting a new session with an AI Agent, simply copy and paste this exact prompt:
> "Read `.agents/PROTOCOLS/HANDOVER_NEXT_SESSION.md`. We have successfully stabilized the backend, implemented a Thin Client architecture, Smart Edge Caching, Resume Video functionality, History Sync, and a Premium Apple HIG UI overhaul. Our project is strictly focused on Mobile (APK). Your directive today is to execute Task C (Offline-First SWR Storage) to make the app resilient to Hugging Face sleep states, followed by Task D (Auto-Play Next Episode)."