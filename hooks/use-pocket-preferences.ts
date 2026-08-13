import { useCallback } from 'react';
import type { Source } from '@/constants/types';
import { getStoredItem, setStoredItem } from '@/utils/key-value-storage';

export interface PromptPreset {
  id: string;
  title: string;
  prompt: string;
}

const FAVORITES_KEY = 'jules_pocket_favorite_projects';
const PRESETS_KEY = 'jules_pocket_prompt_presets';

export const DEFAULT_PROMPT_PRESETS: PromptPreset[] = [
  { id: 'bug-fix', title: 'バグを調査して修正', prompt: '発生している問題を調査し、原因を特定して修正してください。必要なテストも追加してください。' },
  { id: 'feature', title: '新機能を追加', prompt: 'このプロジェクトに新機能を追加してください。既存の設計とUIに合わせ、必要なテストも追加してください。' },
  { id: 'refactor', title: 'コードを整理', prompt: '重複や複雑さを整理し、動作を変えずに保守しやすいコードへリファクタリングしてください。' },
  { id: 'tests', title: 'テストを追加', prompt: '不足している重要なテストケースを特定し、テストを追加してください。' },
  { id: 'errors', title: 'エラー処理を改善', prompt: '失敗しやすい箇所を確認し、利用者に分かりやすいエラー処理を追加してください。' },
  { id: 'review', title: 'この実装をレビュー', prompt: '現在の実装をレビューし、問題点と改善案を優先度順にまとめてください。修正が必要なら実施してください。' },
  { id: 'todo', title: 'TODOを確認して対応', prompt: 'リポジトリ内のTODOを確認し、優先度の高いものから対応してください。' },
];

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await getStoredItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function usePocketPreferences() {
  const getFavorites = useCallback(() => readJson<Source[]>(FAVORITES_KEY, []), []);
  const saveFavorites = useCallback(async (favorites: Source[]) => {
    await setStoredItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, []);
  const getPromptPresets = useCallback(() => readJson<PromptPreset[]>(PRESETS_KEY, DEFAULT_PROMPT_PRESETS), []);
  const savePromptPresets = useCallback(async (presets: PromptPreset[]) => {
    await setStoredItem(PRESETS_KEY, JSON.stringify(presets));
  }, []);

  return { getFavorites, saveFavorites, getPromptPresets, savePromptPresets };
}
