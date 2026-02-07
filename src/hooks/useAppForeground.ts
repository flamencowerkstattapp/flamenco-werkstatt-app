import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';

/**
 * Hook that calls a callback when the app returns to the foreground.
 * Works on both mobile (AppState) and web (visibilitychange / focus).
 * 
 * @param onForeground - Callback to invoke when the app becomes active again
 */
export const useAppForeground = (onForeground: () => void) => {
  const callbackRef = useRef(onForeground);
  callbackRef.current = onForeground;

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Web: listen for tab visibility changes and window focus
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          callbackRef.current();
        }
      };

      const handleFocus = () => {
        callbackRef.current();
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
      };
    } else {
      // Mobile: listen for AppState changes
      const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          callbackRef.current();
        }
      };

      const subscription = AppState.addEventListener('change', handleAppStateChange);

      return () => {
        subscription.remove();
      };
    }
  }, []);
};
