# Session Snapshot & Handover

## Last Active Topic
Admin Panel Code Review & Performance Handover

## Current State
- `apps/admin/src/App.tsx` has architectural bottlenecks common in MVP-level code that need to be resolved to hit "Big Tech" standards.
- API ingestion python scripts have had path imports fixed and pushed.
- Repository is clean (untracked testing scripts remain) and synced with remote (origin/master and hf/main).

## Immediate Next Steps (For Frontend / React Agent)
1. **Refactor Data Fetching**: Implement a structured waterfall instead of parallel blind fetching. High-priority data (stats) first, low-priority/heavy data (analytics) deferred/lazy-loaded.
2. **Implement AbortControllers**: Ensure all search and debounced fetches (specifically `DatabaseTab`) use `AbortController` to cancel stale requests and prevent UI race conditions.
3. **Fix Global State & Loading**: Move away from a single global `loading` state. Use localized/per-button loading states so the entire app doesn't lock during background syncs.
4. **Terminal Feed Performance**: Replace the `!newLogs.includes(log)` string-comparison bottleneck with a robust, performant logging state (use stable keys, don't re-render large arrays unnecessarily). Remove fake "proactive" UI dots if the data is just polling.
5. **Mobile Experience**: Add the missing `pb-safe` (safe-area-inset) to the mobile dock to support iOS home indicators. Ensure all 7 desktop tabs are accessible on mobile.

## Known Issues
- Untracked testing scripts in `apps/api/` and root directory are kept for debugging purposes. Do not delete them without asking.