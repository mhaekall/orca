import React, { useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { SWRConfig } from 'swr';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { fetcher } from './fetcher';

const CACHE_KEY = '@app-swr-cache';
const MAX_CACHE_KEYS = 30; // Limit cache keys to avoid JSON stringify bloat

export function SWRProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<any>(null);

  useEffect(() => {
    let appState = AppState.currentState;
    
    // Function to handle app state changes for background revalidation
    const handleAppStateChange = (nextAppState: AppStateStatus) => {};

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    const initCache = async () => {
      try {
        const storedCache = await AsyncStorage.getItem(CACHE_KEY);
        const map = new Map<string, any>(storedCache ? JSON.parse(storedCache) : []);
        
        let saveTimeout: NodeJS.Timeout;
        const saveCache = () => {
          clearTimeout(saveTimeout);
          saveTimeout = setTimeout(() => {
            // Convert to array, slice to keep latest, to avoid massive JSON limits
            const entries = Array.from(map.entries()).slice(-MAX_CACHE_KEYS);
            
            const getCircularReplacer = () => {
              const seen = new WeakSet();
              return (key: string, value: any) => {
                if (typeof value === "object" && value !== null) {
                  if (seen.has(value)) return; // Discard circular reference
                  seen.add(value);
                }
                if (value instanceof Error) return value.message;
                return value;
              };
            };

            try {
              const data = JSON.stringify(entries, getCircularReplacer());
              AsyncStorage.setItem(CACHE_KEY, data).catch(console.error);
            } catch (err) {
              console.warn('Failed to serialize SWR cache:', err);
            }
          }, 1000);
        };

        const customProvider = {
          keys: () => map.keys(),
          get: (key: string) => map.get(key),
          set: (key: string, value: any) => {
            map.set(key, value);
            saveCache();
          },
          delete: (key: string) => {
            map.delete(key);
            saveCache();
          }
        };
        
        setProvider(() => customProvider);
      } catch (e) {
        console.error('Failed to init SWR cache', e);
        setProvider(() => new Map()); // Fallback to memory
      } finally {
        await SplashScreen.hideAsync().catch(() => {});
      }
    };

    initCache();

    return () => {
      subscription.remove();
    };
  }, []);

  if (!provider) {
    return null; // Await async storage hydration
  }

  return (
    <SWRConfig
      value={{
        provider: () => provider,
        fetcher, // Set global fetcher
        isVisible: () => {
          return AppState.currentState === 'active';
        },
        initFocus(callback) {
          let appState = AppState.currentState;
          const onAppStateChange = (nextAppState: AppStateStatus) => {
            if (appState.match(/inactive|background/) && nextAppState === 'active') {
              callback();
            }
            appState = nextAppState;
          };
          const subscription = AppState.addEventListener('change', onAppStateChange);
          return () => subscription.remove();
        }
      }}
    >
      {children}
    </SWRConfig>
  );
}
