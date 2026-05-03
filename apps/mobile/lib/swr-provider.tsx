import React, { useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { SWRConfig } from 'swr';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@app-swr-cache';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<any>(null);

  useEffect(() => {
    let appState = AppState.currentState;
    
    // Function to handle app state changes for background revalidation
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      /* 
      We don't need to manually call mutate() for everything here if we let SWR handle it, 
      but SWR's default focus doesn't track React Native AppState out of the box unless configured.
      Since SWRConfig 'provider' is what we are configuring, we also configure 'isVisible' and 'initFocus'.
      */
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    const initCache = async () => {
      try {
        const storedCache = await AsyncStorage.getItem(CACHE_KEY);
        const map = new Map<string, any>(storedCache ? JSON.parse(storedCache) : []);
        
        let saveTimeout: NodeJS.Timeout;
        const saveCache = () => {
          clearTimeout(saveTimeout);
          saveTimeout = setTimeout(() => {
            const data = JSON.stringify(Array.from(map.entries()));
            AsyncStorage.setItem(CACHE_KEY, data).catch(console.error);
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
