import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig, RuntimeCaching } from "serwist";
import { Serwist, NetworkOnly } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: any;

// Filter out /api/auth/ from default caching
const customCache: RuntimeCaching[] = defaultCache.filter(
  (cacheRule) => {
    if (typeof cacheRule.matcher === 'object' && 'source' in cacheRule.matcher) {
      if ((cacheRule.matcher as RegExp).source.includes('api')) {
        return false; 
      }
    }
    return true;
  }
);

// Add an explicit NetworkOnly rule for /api/
customCache.unshift({
  matcher: /^\/api\//,
  handler: new NetworkOnly(),
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: customCache,
});

serwist.addEventListeners();
