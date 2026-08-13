import { useState, useCallback } from 'react';
import type { Source } from '@/constants/types';
import { getStoredItem, setStoredItem } from '@/utils/key-value-storage';

export type SessionFilterState = 'all' | 'inProgress' | 'awaitingPlanApproval' | 'failed' | 'completed';

export interface SessionFilterPreset {
  id: string;
  name: string;
  query: string;
  state: SessionFilterState;
}

export interface LastSessionFilter {
  query: string;
  state: SessionFilterState;
}

const API_KEY_STORAGE_KEY = 'jules_api_key';
const THEME_STORAGE_KEY = 'jules_theme';
const LANGUAGE_STORAGE_KEY = 'jules_language';
const RECENT_REPOS_STORAGE_KEY = 'jules_recent_repos';
const SESSION_FILTER_PRESETS_STORAGE_KEY = 'jules_session_filter_presets';
const LAST_SESSION_FILTER_STORAGE_KEY = 'jules_last_session_filter';
const CACHED_SOURCES_STORAGE_KEY = 'jules_cached_sources';

/**
 * SecureStoreを使用したセキュアストレージフック
 */
export function useSecureStorage() {
  const [isLoading, setIsLoading] = useState(false);

  // APIキーの保存
  const saveApiKey = useCallback(async (key: string): Promise<void> => {
    setIsLoading(true);
    try {
      await setStoredItem(API_KEY_STORAGE_KEY, key);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // APIキーの取得
  const getApiKey = useCallback(async (): Promise<string | null> => {
    try {
      return await getStoredItem(API_KEY_STORAGE_KEY);
    } catch {
      return null;
    }
  }, []);

  // APIキーの削除
  const deleteApiKey = useCallback(async (): Promise<void> => {
    try {
      await setStoredItem(API_KEY_STORAGE_KEY, null);
    } catch {
      // 無視
    }
  }, []);

  // テーマの保存 (非機密情報なのでSecureStoreでもOK)
  const saveTheme = useCallback(async (theme: 'light' | 'dark'): Promise<void> => {
    try {
      await setStoredItem(THEME_STORAGE_KEY, theme);
    } catch {
      // 無視
    }
  }, []);

  // テーマの取得
  const getTheme = useCallback(async (): Promise<'light' | 'dark' | null> => {
    try {
      const theme = await getStoredItem(THEME_STORAGE_KEY);
      return theme as 'light' | 'dark' | null;
    } catch {
      return null;
    }
  }, []);

  // 言語の保存
  const saveLanguage = useCallback(async (lang: 'ja' | 'en'): Promise<void> => {
    try {
      await setStoredItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // 無視
    }
  }, []);

  // 言語の取得
  const getLanguage = useCallback(async (): Promise<'ja' | 'en' | null> => {
    try {
      const lang = await getStoredItem(LANGUAGE_STORAGE_KEY);
      return lang as 'ja' | 'en' | null;
    } catch {
      return null;
    }
  }, []);

  // 最近使用したリポジトリの保存
  const saveRecentRepo = useCallback(async (repo: Source): Promise<void> => {
    try {
      const stored = await getStoredItem(RECENT_REPOS_STORAGE_KEY);
      let recent: Source[] = stored ? JSON.parse(stored) : [];
      
      // 既存のものを削除して先頭に追加
      recent = recent.filter(r => r.name !== repo.name);
      recent.unshift(repo);
      
      // 最大5個まで保持
      recent = recent.slice(0, 5);
      
      await setStoredItem(RECENT_REPOS_STORAGE_KEY, JSON.stringify(recent));
    } catch {
      // 無視
    }
  }, []);

  // 最近使用したリポジトリの取得
  const getRecentRepos = useCallback(async (): Promise<Source[]> => {
    try {
      const stored = await getStoredItem(RECENT_REPOS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // セッション一覧のフィルタプリセット保存
  const saveSessionFilterPreset = useCallback(async (preset: SessionFilterPreset): Promise<void> => {
    try {
      const stored = await getStoredItem(SESSION_FILTER_PRESETS_STORAGE_KEY);
      let presets: SessionFilterPreset[] = stored ? JSON.parse(stored) : [];

      presets = presets.filter((p) => p.id !== preset.id);
      presets.unshift(preset);
      presets = presets.slice(0, 8);

      await setStoredItem(SESSION_FILTER_PRESETS_STORAGE_KEY, JSON.stringify(presets));
    } catch {
      // 無視
    }
  }, []);

  const getSessionFilterPresets = useCallback(async (): Promise<SessionFilterPreset[]> => {
    try {
      const stored = await getStoredItem(SESSION_FILTER_PRESETS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const saveLastSessionFilter = useCallback(async (filter: LastSessionFilter): Promise<void> => {
    try {
      await setStoredItem(LAST_SESSION_FILTER_STORAGE_KEY, JSON.stringify(filter));
    } catch {
      // 無視
    }
  }, []);

  const getLastSessionFilter = useCallback(async (): Promise<LastSessionFilter | null> => {
    try {
      const stored = await getStoredItem(LAST_SESSION_FILTER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  // キャッシュされたソースの保存
  const saveCachedSources = useCallback(async (sources: Source[]): Promise<void> => {
    try {
      await setStoredItem(CACHED_SOURCES_STORAGE_KEY, JSON.stringify(sources));
    } catch {
      // 無視
    }
  }, []);

  // キャッシュされたソースの取得
  const getCachedSources = useCallback(async (): Promise<Source[]> => {
    try {
      const stored = await getStoredItem(CACHED_SOURCES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  return {
    isLoading,
    saveApiKey,
    getApiKey,
    deleteApiKey,
    saveTheme,
    getTheme,
    saveLanguage,
    getLanguage,
    saveRecentRepo,
    getRecentRepos,
    saveSessionFilterPreset,
    getSessionFilterPresets,
    saveLastSessionFilter,
    getLastSessionFilter,
    saveCachedSources,
    getCachedSources,
  };
}
