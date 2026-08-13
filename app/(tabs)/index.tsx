import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApiKey } from '@/constants/api-key-context';
import type { Session, Source } from '@/constants/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useJulesApi } from '@/hooks/use-jules-api';
import { usePocketPreferences, type PromptPreset } from '@/hooks/use-pocket-preferences';
import { useI18n } from '@/constants/i18n-context';
import { IconSymbol } from '@/components/ui/icon-symbol';

type TaskGroup = 'running' | 'waiting' | 'completed';

function groupFor(session: Session): TaskGroup {
  if (session.state === 'COMPLETED' || session.state === 'FAILED') return 'completed';
  if (session.state === 'AWAITING_PLAN_APPROVAL' || session.state === 'AWAITING_USER_FEEDBACK') return 'waiting';
  return 'running';
}

function sourceLabel(source: Source): string {
  return source.githubRepo ? `${source.githubRepo.owner}/${source.githubRepo.repo}` : source.displayName || source.name;
}

function stateLabel(session: Session): string {
  if (session.state === 'AWAITING_PLAN_APPROVAL') return 'プラン確認待ち';
  if (session.state === 'AWAITING_USER_FEEDBACK') return 'Julesからの質問';
  if (session.state === 'COMPLETED') return '完了';
  if (session.state === 'FAILED') return '停止';
  if (session.state === 'PLANNING') return 'プラン作成中';
  if (session.state === 'QUEUED') return '順番待ち';
  return '作業中';
}

function formatTime(value: string): string {
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? '—' : time.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PocketHomeScreen() {
  const { apiKey } = useApiKey();
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const { t } = useI18n();
  const { getFavorites, saveFavorites, getPromptPresets } = usePocketPreferences();
  const [favorites, setFavorites] = useState<Source[]>([]);
  const [presets, setPresets] = useState<PromptPreset[]>([]);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [prompt, setPrompt] = useState('');
  const [group, setGroup] = useState<TaskGroup>('running');
  const [refreshing, setRefreshing] = useState(false);
  const [isProjectPickerVisible, setIsProjectPickerVisible] = useState(false);
  const [projectQuery, setProjectQuery] = useState('');
  const { sources, sessions, isLoading, error, clearError, syncAllSources, fetchSessions, createSession, deleteSession } = useJulesApi({ apiKey });

  const load = useCallback(async () => {
    if (!apiKey) return;
    const [savedFavorites, loadedPresets] = await Promise.all([getFavorites(), getPromptPresets()]);
    setFavorites(savedFavorites);
    setPresets(loadedPresets);
    const freshSources = await syncAllSources();
    const stillAvailable = savedFavorites.filter((favorite) => freshSources.some((source) => source.name === favorite.name));
    setFavorites(stillAvailable);
    if (!selectedSource && stillAvailable[0]) setSelectedSource(stillAvailable[0]);
    await fetchSessions(true);
  }, [apiKey, fetchSessions, getFavorites, getPromptPresets, selectedSource, syncAllSources]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!apiKey) return;
    const timer = setInterval(() => { void fetchSessions(true); }, 30000);
    return () => clearInterval(timer);
  }, [apiKey, fetchSessions]);

  const tasks = useMemo(() => sessions.filter((session) => groupFor(session) === group).sort((a, b) => Date.parse(b.updateTime) - Date.parse(a.updateTime)), [group, sessions]);
  const selectedIsFavorite = !!selectedSource && favorites.some((source) => source.name === selectedSource.name);
  const availableProjects = useMemo(() => {
    const query = projectQuery.trim().toLowerCase();
    return query ? sources.filter((source) => sourceLabel(source).toLowerCase().includes(query)) : sources;
  }, [projectQuery, sources]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const toggleFavorite = useCallback(async (source: Source) => {
    const next = favorites.some((item) => item.name === source.name)
      ? favorites.filter((item) => item.name !== source.name)
      : [source, ...favorites];
    setFavorites(next);
    await saveFavorites(next);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [favorites, saveFavorites]);

  const addFavorite = useCallback(async (source: Source) => {
    const alreadyFavorite = favorites.some((item) => item.name === source.name);
    const next = alreadyFavorite ? favorites : [source, ...favorites];
    setFavorites(next);
    setSelectedSource(source);
    setIsProjectPickerVisible(false);
    setProjectQuery('');
    if (!alreadyFavorite) await saveFavorites(next);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [favorites, saveFavorites]);

  const sendToJules = useCallback(async () => {
    if (!selectedSource || !prompt.trim()) {
      Alert.alert('プロジェクトと指示を選んでください');
      return;
    }
    const session = await createSession(selectedSource.name, prompt, selectedSource.githubRepo?.defaultBranch?.displayName || 'main', [], true);
    if (!session) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPrompt('');
    await fetchSessions(true);
    router.push({ pathname: '/session/id', params: { id: session.name, title: session.title || 'Jules タスク' } });
  }, [createSession, fetchSessions, prompt, selectedSource]);

  const openTask = useCallback((session: Session) => {
    router.push({ pathname: '/session/id', params: { id: session.name, title: session.title || 'Jules タスク', submittedPr: session.submittedPr || '' } });
  }, []);

  const confirmDeleteTask = useCallback((session: Session) => {
    Alert.alert(t('deleteTaskTitle'), t('deleteTaskMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('deleteTask'),
        style: 'destructive',
        onPress: () => {
          void deleteSession(session.name).then((deleted) => {
            if (deleted) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          });
        },
      },
    ]);
  }, [deleteSession, t]);

  if (!apiKey) {
    return <SafeAreaView style={[styles.empty, { backgroundColor: colors.background }]}><Text style={[styles.emptyTitle, { color: colors.text }]}>Jules Pocket Dev</Text><Text style={[styles.emptyText, { color: colors.icon }]}>はじめに Jules API キーを設定してください。</Text><TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={() => router.push('/settings')}><Text style={styles.primaryButtonText}>設定を開く</Text></TouchableOpacity></SafeAreaView>;
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
        <View style={styles.header}><View><Text style={[styles.kicker, { color: colors.primary }]}>JULES POCKET DEV</Text><Text style={[styles.title, { color: colors.text }]}>今日は何を任せますか？</Text></View><TouchableOpacity onPress={() => void refresh()} style={[styles.refresh, { borderColor: colors.border }]}><Text style={{ color: colors.primary }}>更新</Text></TouchableOpacity></View>
        {error ? <TouchableOpacity style={[styles.error, { backgroundColor: colors.error }]} onPress={clearError}><Text style={styles.errorText}>{error}</Text></TouchableOpacity> : null}

        <View style={styles.projectHeading}><Text style={[styles.sectionTitle, { color: colors.text }]}>{t('favoriteProjects')}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={t('addProject')} onPress={() => setIsProjectPickerVisible(true)} style={[styles.addProjectButton, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="plus" size={18} color={colors.primary} /><Text style={[styles.addProjectText, { color: colors.primary }]}>{t('addProject')}</Text></TouchableOpacity></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {favorites.map((source) => <TouchableOpacity key={source.name} onPress={() => setSelectedSource(source)} style={[styles.projectChip, { backgroundColor: selectedSource?.name === source.name ? colors.primary : colors.surface, borderColor: colors.border }]}><Text numberOfLines={1} style={{ color: selectedSource?.name === source.name ? '#fff' : colors.text, fontWeight: '700' }}>{sourceLabel(source)}</Text></TouchableOpacity>)}
        </ScrollView>
        {selectedSource && selectedIsFavorite ? <TouchableOpacity onPress={() => void toggleFavorite(selectedSource)}><Text style={[styles.favoriteAction, { color: colors.primary }]}>{t('removeFromFavorites')}</Text></TouchableOpacity> : <Text style={[styles.hint, { color: colors.icon }]}>{isLoading ? t('loadingProjects') : favorites.length === 0 ? t('noFavoriteProjects') : t('projectPickerHint')}</Text>}

        <View style={[styles.composer, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.composerLabel, { color: colors.text }]}>Julesへの指示</Text><TextInput style={[styles.prompt, { color: colors.text }]} value={prompt} onChangeText={setPrompt} multiline textAlignVertical="top" placeholder="日本語で、そのまま任せたいことを書いてください" placeholderTextColor={colors.icon} accessibilityLabel="Julesへの指示" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>{presets.map((preset) => <TouchableOpacity key={preset.id} onPress={() => setPrompt(preset.prompt)} style={[styles.preset, { backgroundColor: colors.surfaceSecondary }]}><Text style={{ color: colors.text }}>{preset.title}</Text></TouchableOpacity>)}</ScrollView>
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: selectedSource && prompt.trim() ? 1 : 0.55 }]} disabled={!selectedSource || !prompt.trim() || isLoading} onPress={() => void sendToJules()}><Text style={styles.primaryButtonText}>{isLoading ? 'Julesに依頼中…' : 'Julesに任せる'}</Text></TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>タスク状態</Text><View style={styles.tabs}>{([{ key: 'running', label: '実行中' }, { key: 'waiting', label: '確認待ち' }, { key: 'completed', label: '完了' }] as { key: TaskGroup; label: string }[]).map((tab) => <TouchableOpacity key={tab.key} onPress={() => setGroup(tab.key)} style={[styles.tab, group === tab.key && { borderBottomColor: colors.primary }]}><Text style={{ color: group === tab.key ? colors.primary : colors.icon, fontWeight: '700' }}>{tab.label}</Text></TouchableOpacity>)}</View>
        {tasks.length === 0 ? <Text style={[styles.hint, { color: colors.icon }]}>この分類のタスクはありません。</Text> : tasks.map((task) => <TouchableOpacity key={task.name} onPress={() => openTask(task)} style={[styles.task, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.taskTop}><Text numberOfLines={1} style={[styles.taskTitle, { color: colors.text }]}>{task.title || 'Jules タスク'}</Text><View style={styles.taskActions}><Text style={{ color: group === 'waiting' ? colors.warning : group === 'completed' ? colors.success : colors.primary, fontWeight: '700', fontSize: 12 }}>{stateLabel(task)}</Text>{group === 'waiting' ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('deleteTask')} onPress={() => confirmDeleteTask(task)} hitSlop={8}><IconSymbol name="trash" size={18} color={colors.error} /></TouchableOpacity> : null}</View></View><Text numberOfLines={1} style={[styles.taskProject, { color: colors.icon }]}>{task.name.replace(/^sessions\//, '')}</Text><Text style={[styles.taskTime, { color: colors.icon }]}>開始 {formatTime(task.createTime)}　更新 {formatTime(task.updateTime)}</Text></TouchableOpacity>)}
      </ScrollView>
      <Modal visible={isProjectPickerVisible} animationType="slide" transparent onRequestClose={() => setIsProjectPickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.projectPicker, { backgroundColor: colors.background }]}>
            <View style={styles.pickerHeader}><Text style={[styles.pickerTitle, { color: colors.text }]}>{t('addProject')}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={t('close')} onPress={() => setIsProjectPickerVisible(false)} style={styles.closeButton}><IconSymbol name="xmark" size={22} color={colors.icon} /></TouchableOpacity></View>
            <Text style={[styles.hint, { color: colors.icon }]}>{t('projectPickerHint')}</Text>
            <TextInput value={projectQuery} onChangeText={setProjectQuery} placeholder={t('searchProjects')} placeholderTextColor={colors.icon} autoCapitalize="none" autoCorrect={false} style={[styles.projectSearch, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityLabel={t('searchProjects')} />
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.projectList}>
              {availableProjects.map((source) => { const isFavorite = favorites.some((favorite) => favorite.name === source.name); return <TouchableOpacity key={source.name} accessibilityRole="button" onPress={() => void addFavorite(source)} style={[styles.projectRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.projectRowText}><Text numberOfLines={1} style={[styles.projectName, { color: colors.text }]}>{sourceLabel(source)}</Text><Text style={[styles.projectStatus, { color: colors.icon }]}>{isFavorite ? t('alreadyFavorite') : t('addToFavorites')}</Text></View><IconSymbol name={isFavorite ? 'checkmark.circle.fill' : 'plus'} size={22} color={isFavorite ? colors.success : colors.primary} /></TouchableOpacity>; })}
              {availableProjects.length === 0 ? <Text style={[styles.hint, { color: colors.icon }]}>{t('noMatchingProjects')}</Text> : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: 18, paddingBottom: 36, gap: 14 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, kicker: { fontWeight: '800', fontSize: 11, letterSpacing: 1.3 }, title: { fontSize: 25, fontWeight: '800', marginTop: 4 }, refresh: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 18 }, projectHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }, sectionTitle: { fontSize: 17, fontWeight: '800' }, addProjectButton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7 }, addProjectText: { fontSize: 13, fontWeight: '800' }, chips: { gap: 8, paddingRight: 18 }, projectChip: { maxWidth: 220, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 13, borderWidth: 1 }, favoriteAction: { fontSize: 13, fontWeight: '700' }, composer: { borderWidth: 1, borderRadius: 18, padding: 15, gap: 12 }, composerLabel: { fontSize: 16, fontWeight: '800' }, prompt: { minHeight: 125, fontSize: 16, lineHeight: 24 }, presetRow: { gap: 8 }, preset: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 16 }, primaryButton: { minHeight: 54, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '800' }, tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#cbd5e1' }, tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' }, task: { borderWidth: 1, borderRadius: 15, padding: 14, gap: 7 }, taskTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, taskActions: { flexDirection: 'row', alignItems: 'center', gap: 10 }, taskTitle: { flex: 1, fontWeight: '800', fontSize: 16 }, taskProject: { fontSize: 12 }, taskTime: { fontSize: 12 }, hint: { fontSize: 13, lineHeight: 20 }, error: { borderRadius: 12, padding: 12 }, errorText: { color: '#fff', fontWeight: '700' }, empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 }, emptyTitle: { fontSize: 26, fontWeight: '800' }, emptyText: { textAlign: 'center', lineHeight: 22 }, modalBackdrop: { flex: 1, justifyContent: 'flex-end' }, projectPicker: { maxHeight: '82%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14 }, pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, pickerTitle: { fontSize: 20, fontWeight: '800' }, closeButton: { padding: 6 }, projectSearch: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 }, projectList: { gap: 8, paddingBottom: 16 }, projectRow: { borderWidth: 1, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, projectRowText: { flex: 1, gap: 4 }, projectName: { fontSize: 16, fontWeight: '700' }, projectStatus: { fontSize: 13 },
});
