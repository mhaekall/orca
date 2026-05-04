# 🎯 Handover: Expo Mobile Native Architecture & Big Tech Standards (Termux Environment)

## 1. Context Summary
- **Strategic Pivot:** The project has definitively pivoted to be **exclusively an APK (Mobile) streaming platform**. All optimizations for Web streaming are deprecated. Our sole focus is making the Expo React Native app (`apps/mobile`) achieve Big Tech production standards (Netflix/Crunchyroll level).
- **Current State:** We have successfully resolved the critical ExoPlayer playback failures (00:00 duration and Extractor Errors). The app now successfully forces `contentType: 'hls'` for Telegram streams. 
- **Environment:** Termux/Android. Hermes JS Engine enabled. Pure React Native `StyleSheet` (no NativeWind). Native `Animated` API used for animations.

## 2. Completed Milestones
- **ExoPlayer HLS Playback Fixed:** Forced `contentType: 'hls'` and injected `User-Agent` headers for `tele-proxy` / `tg-proxy` URLs, fixing silent crashes and 400/404 errors.
- **Thin Client Architecture (Task A Done):** Moved iframe resolution logic entirely to the FastAPI backend (`apps/api/services/stream_cache.py`). The mobile app now directly consumes a clean MP4/HLS URL without needing to guess or resolve embeds on the client side.
- **Smart Edge Caching (Task B Done):** Modified the `tele-proxy` Cloudflare Worker to implement Intelligent Cache Keying. The worker now separates cache storage based on the `Range` HTTP header, preventing 200 OK vs 206 Partial Content collisions while protecting the Telegram API from rate limits.
- **UI Polish:** Converted full-screen modals to half-screen bottom sheets (for comments), added auto-rotation to landscape for fullscreen video, and fixed episode navigation screen glitches by using `router.setParams`.

## 3. Next Session Execution Directives (Big Tech Standards)
The mobile app is robust but still relies heavily on network availability for every screen load. The next agent must execute the final architectural upgrade:

### Task C: Zero-Loading Screen (Offline-First SWR)
**Goal:** Achieve 0ms cold starts where the app instantly loads cached catalogs and user data even without internet, updating silently in the background.
**Action:**
1. Install `@react-native-async-storage/async-storage` (using `npm install --legacy-peer-deps` inside `apps/mobile` to avoid Termux symlink issues).
2. Build a Custom Cache Provider for SWR in `apps/mobile/lib/swr-provider.tsx` that persists all SWR payloads to AsyncStorage.
3. Ensure the app gracefully handles `503 Service Unavailable` errors (e.g., when Hugging Face Spaces are sleeping) by relying on the persistent cache.

## 4. How to Give Context for the Next Session
When starting a new session with an AI Agent, simply copy and paste this exact prompt:
> "Read `.agents/PROTOCOLS/HANDOVER_NEXT_SESSION.md`. We have successfully stabilized ExoPlayer HLS playback for the APK and implemented a Thin Client architecture with Smart Edge Caching. Our project is now strictly focused on Mobile (ignoring Web). Your directive today is to execute Task C (Zero-Loading Screen SWR) using AsyncStorage to elevate the app to Big Tech standards."
