import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
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

function sourceTitle(source: Source): string {
  return source.githubRepo?.repo || source.displayName || source.name.replace(/^sources\//, '');
}

function sourceOwner(source: Source): string {
  return source.githubRepo?.owner || 'Jules';
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
  const [deleteCandidate, setDeleteCandidate] = useState<Session | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [deleteTaskError, setDeleteTaskError] = useState<string | null>(null);
  const [deletedSessionNames, setDeletedSessionNames] = useState<Set<string>>(() => new Set());
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

  const visibleSessions = useMemo(() => sessions.filter((session) => !deletedSessionNames.has(session.name)), [deletedSessionNames, sessions]);
  const tasks = useMemo(() => visibleSessions.filter((session) => groupFor(session) === group).sort((a, b) => Date.parse(b.updateTime) - Date.parse(a.updateTime)), [group, visibleSessions]);
  const taskCounts = useMemo(() => sessions.reduce<Record<TaskGroup, number>>((counts, session) => {
    counts[groupFor(session)] += 1;
    return counts;
  }, { running: 0, waiting: 0, completed: 0 }), [visibleSessions]);
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
    clearError();
    setDeleteTaskError(null);
    setDeleteCandidate(session);
  }, [clearError]);

  const deleteSelectedTask = useCallback(async () => {
    if (!deleteCandidate || isDeletingTask) return;
    setIsDeletingTask(true);
    setDeleteTaskError(null);
    const result = await deleteSession(deleteCandidate.name);
    if (result.deleted) {
      setDeletedSessionNames((current) => new Set(current).add(deleteCandidate.name));
      setDeleteCandidate(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setDeleteTaskError(result.error || '削除できませんでした。もう一度お試しください。');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setIsDeletingTask(false);
  }, [deleteCandidate, deleteSession, isDeletingTask]);

  if (!apiKey) {
    return <SafeAreaView style={[styles.empty, { backgroundColor: colors.background }]}><Text style={[styles.emptyTitle, { color: colors.text }]}>Jules Pocket Dev</Text><Text style={[styles.emptyText, { color: colors.icon }]}>はじめに Jules API キーを設定してください。</Text><TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={() => router.push('/settings')}><Text style={styles.primaryButtonText}>設定を開く</Text></TouchableOpacity></SafeAreaView>;
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
        <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.kicker}>JULES POCKET DEV</Text><Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.82} style={styles.title}>今日は何を任せますか？</Text><Text style={styles.heroSubtitle}>思いついたら、ここからすぐJulesへ。</Text></View><TouchableOpacity accessibilityRole="button" accessibilityLabel="更新" onPress={() => void refresh()} style={styles.refresh}><IconSymbol name="arrow.clockwise" size={18} color="#ffffff" /></TouchableOpacity></View>
        </LinearGradient>
        {error ? <TouchableOpacity style={[styles.error, { backgroundColor: colors.error }]} onPress={clearError}><Text style={styles.errorText}>{error}</Text></TouchableOpacity> : null}

        <View style={styles.projectHeading}><Text style={[styles.sectionTitle, { color: colors.text }]}>{t('favoriteProjects')}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={t('addProject')} onPress={() => setIsProjectPickerVisible(true)} style={[styles.addProjectButton, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="plus" size={18} color={colors.primary} /><Text style={[styles.addProjectText, { color: colors.primary }]}>{t('addProject')}</Text></TouchableOpacity></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {favorites.map((source) => { const selected = selectedSource?.name === source.name; return <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected }} key={source.name} onPress={() => setSelectedSource(source)} style={[styles.projectChip, { backgroundColor: selected ? colors.primary : colors.surface, borderColor: selected ? colors.primary : colors.border, shadowColor: colors.primary }]}><View style={[styles.repoIcon, { backgroundColor: selected ? colors.primaryLight : colors.surfaceSecondary }]}><IconSymbol name="chevron.left.forwardslash.chevron.right" size={16} color={selected ? '#ffffff' : colors.primary} /></View><View style={styles.projectChipText}><Text numberOfLines={1} ellipsizeMode="middle" style={[styles.projectChipTitle, { color: selected ? '#ffffff' : colors.text }]}>{sourceTitle(source)}</Text><Text numberOfLines={1} ellipsizeMode="tail" style={[styles.projectChipOwner, { color: selected ? '#e0e7ff' : colors.icon }]}>{sourceOwner(source)}</Text></View>{selected ? <IconSymbol name="checkmark.circle.fill" size={17} color="#ffffff" /> : null}</TouchableOpacity>; })}
        </ScrollView>
        {selectedSource && selectedIsFavorite ? <TouchableOpacity onPress={() => void toggleFavorite(selectedSource)}><Text style={[styles.favoriteAction, { color: colors.primary }]}>{t('removeFromFavorites')}</Text></TouchableOpacity> : <Text style={[styles.hint, { color: colors.icon }]}>{isLoading ? t('loadingProjects') : favorites.length === 0 ? t('noFavoriteProjects') : t('projectPickerHint')}</Text>}

        <View style={[styles.composer, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.composerLabel, { color: colors.text }]}>Julesへの指示</Text><TextInput style={[styles.prompt, { color: colors.text }]} value={prompt} onChangeText={setPrompt} multiline textAlignVertical="top" placeholder="日本語で、そのまま任せたいことを書いてください" placeholderTextColor={colors.icon} accessibilityLabel="Julesへの指示" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>{presets.map((preset) => <TouchableOpacity key={preset.id} onPress={() => setPrompt(preset.prompt)} style={[styles.preset, { backgroundColor: colors.surfaceSecondary }]}><Text style={{ color: colors.text }}>{preset.title}</Text></TouchableOpacity>)}</ScrollView>
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: selectedSource && prompt.trim() ? 1 : 0.55 }]} disabled={!selectedSource || !prompt.trim() || isLoading} onPress={() => void sendToJules()}><Text style={styles.primaryButtonText}>{isLoading ? 'Julesに依頼中…' : 'Julesに任せる'}</Text></TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>タスク状態</Text><View style={[styles.tabs, { backgroundColor: colors.surfaceSecondary }]}>{([{ key: 'running', label: '実行中' }, { key: 'waiting', label: '確認待ち' }, { key: 'completed', label: '完了' }] as { key: TaskGroup; label: string }[]).map((tab) => { const selected = group === tab.key; return <TouchableOpacity accessibilityRole="tab" accessibilityState={{ selected }} key={tab.key} onPress={() => setGroup(tab.key)} style={[styles.tab, selected && { backgroundColor: colors.surface, shadowColor: colors.primary }]}><Text numberOfLines={1} style={{ color: selected ? colors.primary : colors.icon, fontWeight: '800', fontSize: 13 }}>{tab.label}</Text><View style={[styles.tabCount, { backgroundColor: selected ? colors.primary : colors.border }]}><Text style={styles.tabCountText}>{taskCounts[tab.key]}</Text></View></TouchableOpacity>; })}</View>
        {tasks.length === 0 ? <View style={[styles.emptyTasks, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="checkmark.circle.fill" size={28} color={colors.success} /><Text style={[styles.emptyTasksTitle, { color: colors.text }]}>ここは空です</Text><Text style={[styles.hint, { color: colors.icon }]}>この分類のタスクはありません。</Text></View> : tasks.map((task) => <View key={task.name} style={[styles.task, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.primary }]}><TouchableOpacity accessibilityRole="button" onPress={() => openTask(task)} style={styles.taskMain}><View style={styles.taskTop}><Text numberOfLines={2} ellipsizeMode="tail" style={[styles.taskTitle, { color: colors.text }]}>{task.title || 'Jules タスク'}</Text><View style={[styles.stateBadge, { backgroundColor: group === 'waiting' ? `${colors.warning}1F` : group === 'completed' ? `${colors.success}1F` : `${colors.primary}1F` }]}><Text numberOfLines={1} style={{ color: group === 'waiting' ? colors.warning : group === 'completed' ? colors.success : colors.primary, fontWeight: '800', fontSize: 11 }}>{stateLabel(task)}</Text></View></View><Text numberOfLines={1} ellipsizeMode="middle" style={[styles.taskProject, { color: colors.icon }]}>{task.name.replace(/^sessions\//, '')}</Text><View style={styles.taskFooter}><Text numberOfLines={1} style={[styles.taskTime, { color: colors.icon }]}>更新 {formatTime(task.updateTime)}</Text><IconSymbol name="chevron.right" size={17} color={colors.icon} /></View></TouchableOpacity>{group === 'waiting' ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('deleteTask')} onPress={() => confirmDeleteTask(task)} style={[styles.deleteTaskButton, { borderTopColor: colors.border }]}><IconSymbol name="trash" size={17} color={colors.error} /><Text style={{ color: colors.error, fontWeight: '700', fontSize: 13 }}>{t('deleteTask')}</Text></TouchableOpacity> : null}</View>)}
      </ScrollView>
      <Modal visible={isProjectPickerVisible} animationType="slide" transparent onRequestClose={() => setIsProjectPickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.projectPicker, { backgroundColor: colors.background }]}>
            <View style={styles.pickerHeader}><Text style={[styles.pickerTitle, { color: colors.text }]}>{t('addProject')}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={t('close')} onPress={() => setIsProjectPickerVisible(false)} style={styles.closeButton}><IconSymbol name="xmark" size={22} color={colors.icon} /></TouchableOpacity></View>
            <Text style={[styles.hint, { color: colors.icon }]}>{t('projectPickerHint')}</Text>
            <TextInput value={projectQuery} onChangeText={setProjectQuery} placeholder={t('searchProjects')} placeholderTextColor={colors.icon} autoCapitalize="none" autoCorrect={false} style={[styles.projectSearch, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityLabel={t('searchProjects')} />
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.projectList}>
              {availableProjects.map((source) => { const isFavorite = favorites.some((favorite) => favorite.name === source.name); return <TouchableOpacity key={source.name} accessibilityRole="button" onPress={() => void addFavorite(source)} style={[styles.projectRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.repoIcon, { backgroundColor: colors.surfaceSecondary }]}><IconSymbol name="chevron.left.forwardslash.chevron.right" size={17} color={colors.primary} /></View><View style={styles.projectRowText}><Text numberOfLines={2} ellipsizeMode="middle" style={[styles.projectName, { color: colors.text }]}>{sourceTitle(source)}</Text><Text numberOfLines={1} ellipsizeMode="tail" style={[styles.projectStatus, { color: colors.icon }]}>{sourceOwner(source)} · {isFavorite ? t('alreadyFavorite') : t('addToFavorites')}</Text></View><IconSymbol name={isFavorite ? 'checkmark.circle.fill' : 'plus'} size={22} color={isFavorite ? colors.success : colors.primary} /></TouchableOpacity>; })}
              {availableProjects.length === 0 ? <Text style={[styles.hint, { color: colors.icon }]}>{t('noMatchingProjects')}</Text> : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal visible={deleteCandidate !== null} animationType="fade" transparent onRequestClose={() => { if (!isDeletingTask) setDeleteCandidate(null); }}>
        <View style={styles.confirmBackdrop}>
          <View style={[styles.confirmCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.confirmIcon, { backgroundColor: `${colors.error}1F` }]}><IconSymbol name="trash" size={24} color={colors.error} /></View>
            <Text style={[styles.confirmTitle, { color: colors.text }]}>{t('deleteTaskTitle')}</Text>
            <Text style={[styles.confirmMessage, { color: colors.icon }]}>{t('deleteTaskMessage')}</Text>
            <Text numberOfLines={2} style={[styles.confirmTaskName, { color: colors.text, backgroundColor: colors.surfaceSecondary }]}>{deleteCandidate?.title || 'Jules タスク'}</Text>
            {deleteTaskError ? <View style={[styles.confirmError, { backgroundColor: `${colors.error}17` }]}><Text selectable style={[styles.confirmErrorText, { color: colors.error }]}>{deleteTaskError}</Text></View> : null}
            <View style={styles.confirmActions}>
              <TouchableOpacity accessibilityRole="button" disabled={isDeletingTask} onPress={() => setDeleteCandidate(null)} style={[styles.confirmButton, { borderColor: colors.border }]}><Text style={{ color: colors.text, fontWeight: '800' }}>{t('cancel')}</Text></TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" disabled={isDeletingTask} onPress={() => void deleteSelectedTask()} style={[styles.confirmButton, { backgroundColor: colors.error, opacity: isDeletingTask ? 0.6 : 1 }]}><Text style={styles.confirmDeleteText}>{isDeletingTask ? t('processing') : t('deleteTask')}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: 16, paddingBottom: 42, gap: 15 },
  hero: { borderRadius: 24, padding: 20, overflow: 'hidden', minHeight: 146, justifyContent: 'center' },
  heroGlow: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.13)', right: -45, top: -70 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  headerCopy: { flex: 1, minWidth: 0 },
  kicker: { color: '#ffffff', fontWeight: '900', fontSize: 10, letterSpacing: 1.6, opacity: 0.84 },
  title: { color: '#ffffff', fontSize: 27, lineHeight: 34, fontWeight: '900', marginTop: 8, letterSpacing: -0.7 },
  heroSubtitle: { color: '#eef2ff', fontSize: 13, marginTop: 8, fontWeight: '600' },
  refresh: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)' },
  projectHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.25, flexShrink: 1 },
  addProjectButton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 18, paddingHorizontal: 11, paddingVertical: 8, flexShrink: 0 },
  addProjectText: { fontSize: 12, fontWeight: '800' },
  chips: { gap: 10, paddingRight: 18, paddingVertical: 3 },
  projectChip: { width: 218, minHeight: 66, paddingHorizontal: 11, paddingVertical: 10, borderRadius: 17, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 9, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  repoIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  projectChipText: { flex: 1, minWidth: 0 },
  projectChipTitle: { fontWeight: '800', fontSize: 14 },
  projectChipOwner: { fontSize: 11, marginTop: 3, fontWeight: '600' },
  favoriteAction: { fontSize: 12, fontWeight: '700', alignSelf: 'flex-start', paddingVertical: 3 },
  composer: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 12, shadowColor: '#000000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.05, shadowRadius: 14, elevation: 2 },
  composerLabel: { fontSize: 17, fontWeight: '900' },
  prompt: { minHeight: 118, maxHeight: 260, fontSize: 16, lineHeight: 24 },
  presetRow: { gap: 8 },
  preset: { maxWidth: 210, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 16 },
  primaryButton: { minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#ffffff', fontSize: 17, fontWeight: '900' },
  tabs: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 16 },
  tab: { flex: 1, minWidth: 0, minHeight: 42, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderRadius: 13 },
  tabCount: { minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabCountText: { color: '#ffffff', fontSize: 10, fontWeight: '900' },
  task: { borderWidth: 1, borderRadius: 18, overflow: 'hidden', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 9, elevation: 2 },
  taskMain: { padding: 15, gap: 8 },
  taskTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stateBadge: { maxWidth: 116, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, flexShrink: 0 },
  taskTitle: { flex: 1, minWidth: 0, fontWeight: '800', fontSize: 15, lineHeight: 21 },
  taskProject: { fontSize: 11, fontFamily: 'monospace' },
  taskFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskTime: { fontSize: 11, flexShrink: 1 },
  deleteTaskButton: { borderTopWidth: 1, minHeight: 42, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  emptyTasks: { borderWidth: 1, borderRadius: 18, alignItems: 'center', padding: 24, gap: 5 },
  emptyTasksTitle: { fontSize: 15, fontWeight: '800' },
  hint: { fontSize: 13, lineHeight: 20, flexShrink: 1 },
  error: { borderRadius: 14, padding: 13 },
  errorText: { color: '#ffffff', fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 },
  emptyTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  emptyText: { textAlign: 'center', lineHeight: 22 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,6,23,0.52)' },
  projectPicker: { width: '100%', maxWidth: 680, alignSelf: 'center', maxHeight: '86%', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, gap: 14 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  pickerTitle: { fontSize: 21, fontWeight: '900', flexShrink: 1 },
  closeButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  projectSearch: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  projectList: { gap: 9, paddingBottom: 20 },
  projectRow: { minHeight: 70, borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  projectRowText: { flex: 1, minWidth: 0, gap: 4 },
  projectName: { fontSize: 15, lineHeight: 20, fontWeight: '800' },
  projectStatus: { fontSize: 12 },
  confirmBackdrop: { flex: 1, backgroundColor: 'rgba(2,6,23,0.62)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  confirmCard: { width: '100%', maxWidth: 390, borderWidth: 1, borderRadius: 24, padding: 22, alignItems: 'center', gap: 11, shadowColor: '#000000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.22, shadowRadius: 24, elevation: 10 },
  confirmIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  confirmTitle: { fontSize: 19, fontWeight: '900', textAlign: 'center' },
  confirmMessage: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
  confirmTaskName: { width: '100%', borderRadius: 12, padding: 11, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  confirmError: { width: '100%', borderRadius: 12, padding: 11 },
  confirmErrorText: { fontSize: 12, lineHeight: 18, fontWeight: '700', textAlign: 'center' },
  confirmActions: { width: '100%', flexDirection: 'row', gap: 10, marginTop: 5 },
  confirmButton: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  confirmDeleteText: { color: '#ffffff', fontWeight: '900' },
});
