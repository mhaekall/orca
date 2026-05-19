import React, { useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { SWRConfig } from 'swr';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { fetcher } from './fetcher';

const CACHE_KEY = '@app-swr-cache-v2';
const MAX_CACHE_KEYS = 50; 

export function SWRProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<any>(null);
  const isHydrating = useRef(true);

  useEffect(() => {
    const initCache = async () => {
      try {
        const storedCache = await AsyncStorage.getItem(CACHE_KEY);
        const map = new Map<string, any>(storedCache ? JSON.parse(storedCache) : []);
        
        let saveTimeout: NodeJS.Timeout;
        const saveCache = () => {
          if (isHydrating.current) return;
          clearTimeout(saveTimeout);
          saveTimeout = setTimeout(() => {
            const entries = Array.from(map.entries()).slice(-MAX_CACHE_KEYS);
            
            try {
              const data = JSON.stringify(entries);
              AsyncStorage.setItem(CACHE_KEY, data).catch(() => {});
            } catch (err) {}
          }, 2000);
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
        isHydrating.current = false;
      } catch (e) {
        setProvider(() => new Map());
        isHydrating.current = false;
      } finally {
        await SplashScreen.hideAsync().catch(() => {});
      }
    };

    initCache();
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
