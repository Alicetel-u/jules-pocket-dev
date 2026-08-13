import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Persists app settings without putting user secrets in the web bundle.
 * Native builds use the OS secure store; web builds retain values only in the
 * current browser's local storage because browsers do not provide a Keychain
 * equivalent.
 */
export async function getStoredItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setStoredItem(key: string, value: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window === 'undefined') return;
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch {
      // Storage can be disabled by the browser or private-browsing policy.
    }
    return;
  }

  try {
    if (value === null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    // Keep the UI usable when the device storage is temporarily unavailable.
  }
}
