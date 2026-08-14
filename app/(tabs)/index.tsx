import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApiKey } from '@/constants/api-key-context';
import type { Session, Source } from '@/constants/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useJulesApi } from '@/hooks/use-jules-api';
import { usePocketPreferences } from '@/hooks/use-pocket-preferences';
import { useI18n } from '@/constants/i18n-context';
import { IconSymbol } from '@/components/ui/icon-symbol';

type TaskGroup = 'running' | 'waiting' | 'completed';
type TaskMode = 'build' | 'debug' | 'check';

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
  const { followUp } = useLocalSearchParams<{ followUp?: string }>();
  const { apiKey } = useApiKey();
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const { t } = useI18n();
  const { getFavorites, saveFavorites, getDismissedSessions, saveDismissedSessions } = usePocketPreferences();
  const [favorites, setFavorites] = useState<Source[]>([]);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [prompt, setPrompt] = useState('');
  const [taskMode, setTaskMode] = useState<TaskMode | null>(null);
  const [bugAction, setBugAction] = useState('');
  const [bugActual, setBugActual] = useState('');
  const [bugExpected, setBugExpected] = useState('');
  const [bugFrequency, setBugFrequency] = useState('毎回');
  const [protectedAreas, setProtectedAreas] = useState('既存機能と既存デザインを壊さない');
  const [doneCriteria, setDoneCriteria] = useState('Web版をビルドし、スマホ表示で問題がないことを確認する');
  const [checkItems, setCheckItems] = useState(() => new Set(['build', 'mobile', 'text', 'errors']));
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
    const [savedFavorites, dismissedSessions] = await Promise.all([getFavorites(), getDismissedSessions()]);
    setFavorites(savedFavorites);
    setDeletedSessionNames(new Set(dismissedSessions));
    const freshSources = await syncAllSources();
    const stillAvailable = savedFavorites.filter((favorite) => freshSources.some((source) => source.name === favorite.name));
    setFavorites(stillAvailable);
    if (!selectedSource && stillAvailable[0]) setSelectedSource(stillAvailable[0]);
    await fetchSessions(true);
  }, [apiKey, fetchSessions, getDismissedSessions, getFavorites, selectedSource, syncAllSources]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (followUp) setPrompt(followUp);
  }, [followUp]);
  useEffect(() => {
    if (!apiKey) return;
    const timer = setInterval(() => { void fetchSessions(true); }, 30000);
    return () => clearInterval(timer);
  }, [apiKey, fetchSessions]);

  const visibleSessions = useMemo(() => sessions.filter((session) => !deletedSessionNames.has(session.name)), [deletedSessionNames, sessions]);
  const tasks = useMemo(() => visibleSessions.filter((session) => groupFor(session) === group).sort((a, b) => Date.parse(b.updateTime) - Date.parse(a.updateTime)), [group, visibleSessions]);
  const taskCounts = useMemo(() => visibleSessions.reduce<Record<TaskGroup, number>>((counts, session) => {
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
    const checkLabels: Record<string, string> = { build: '起動・ビルド', mobile: 'スマホ表示', text: '文字化け・見切れ・未翻訳', errors: 'エラー処理', security: 'セキュリティ', performance: '処理速度', quality: 'コード品質' };
    const finalPrompt = taskMode === 'debug'
      ? `次の不具合を調査し、原因を特定して修正してください。\n\n【操作】\n${bugAction}\n\n【実際に起きたこと】\n${bugActual}\n\n【本来の動作】\n${bugExpected}\n\n【発生頻度】\n${bugFrequency}\n\n変更は必要最小限にし、再現確認と修正後の検証を行ってください。既存機能を壊さないでください。`
      : taskMode === 'check'
        ? `このリポジトリを点検してください。今回は調査専用です。ファイルの変更、コミット、PR作成は一切しないでください。\n\n【点検項目】\n${[...checkItems].map((item) => `- ${checkLabels[item]}`).join('\n')}\n\n結果は日本語で「今すぐ修正」「できれば修正」「問題なし」「判断が必要」に分類し、各問題の場所、原因、影響、推奨修正を簡潔に報告してください。推測と確認済み事実を区別してください。`
        : `次の作業を実装してください。\n\n【作るもの・変更内容】\n${prompt}\n\n【変更してはいけないもの】\n${protectedAreas}\n\n【完成条件】\n${doneCriteria}\n\n作業範囲を守り、既存機能を壊さず、完了前に検証してください。`;
    const hasInput = taskMode === 'debug' ? bugAction.trim() && bugActual.trim() && bugExpected.trim() : taskMode === 'check' ? checkItems.size > 0 : prompt.trim();
    if (!selectedSource || !taskMode || !hasInput) {
      Alert.alert('プロジェクトと必要な内容を入力してください');
      return;
    }
    const session = await createSession(selectedSource.name, finalPrompt, selectedSource.githubRepo?.defaultBranch?.displayName || 'main', [], false);
    if (!session) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPrompt('');
    setTaskMode(null);
    await fetchSessions(true);
    router.push({ pathname: '/session/id', params: { id: session.name, title: session.title || 'Jules タスク' } });
  }, [bugAction, bugActual, bugExpected, bugFrequency, checkItems, createSession, doneCriteria, fetchSessions, prompt, protectedAreas, selectedSource, taskMode]);

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
      const nextDeletedSessionNames = new Set(deletedSessionNames).add(deleteCandidate.name);
      setDeletedSessionNames(nextDeletedSessionNames);
      await saveDismissedSessions([...nextDeletedSessionNames]);
      setDeleteCandidate(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setDeleteTaskError(result.error || '削除できませんでした。もう一度お試しください。');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setIsDeletingTask(false);
  }, [deleteCandidate, deletedSessionNames, deleteSession, isDeletingTask, saveDismissedSessions]);

  if (!apiKey) {
    return <SafeAreaView style={[styles.empty, { backgroundColor: colors.background }]}><Text style={[styles.emptyTitle, { color: colors.text }]}>Jules Pocket Dev</Text><Text style={[styles.emptyText, { color: colors.icon }]}>はじめに Jules API キーを設定してください。</Text><TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={() => router.push('/settings')}><Text style={styles.primaryButtonText}>設定を開く</Text></TouchableOpacity></SafeAreaView>;
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
        <View style={styles.compactHeader}><View style={styles.brandRow}><View style={[styles.brandIcon, { backgroundColor: colors.primary }]}><IconSymbol name="chevron.left.forwardslash.chevron.right" size={16} color="#ffffff" /></View><Text style={[styles.compactTitle, { color: colors.text }]}>Pocket Dev</Text></View><TouchableOpacity accessibilityRole="button" accessibilityLabel="更新" onPress={() => void refresh()} style={[styles.refresh, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="arrow.clockwise" size={17} color={colors.primary} /></TouchableOpacity></View>
        {error ? <TouchableOpacity style={[styles.error, { backgroundColor: colors.error }]} onPress={clearError}><Text style={styles.errorText}>{error}</Text></TouchableOpacity> : null}

        <View style={styles.projectHeading}><Text style={[styles.sectionTitle, { color: colors.text }]}>{t('favoriteProjects')}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={t('addProject')} onPress={() => setIsProjectPickerVisible(true)} style={[styles.addProjectButton, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="plus" size={18} color={colors.primary} /><Text style={[styles.addProjectText, { color: colors.primary }]}>{t('addProject')}</Text></TouchableOpacity></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {favorites.map((source) => { const selected = selectedSource?.name === source.name; return <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected }} key={source.name} onPress={() => setSelectedSource(source)} style={[styles.projectChip, { backgroundColor: selected ? colors.primary : colors.surface, borderColor: selected ? colors.primary : colors.border, shadowColor: colors.primary }]}><View style={[styles.repoIcon, { backgroundColor: selected ? colors.primaryLight : colors.surfaceSecondary }]}><IconSymbol name="chevron.left.forwardslash.chevron.right" size={16} color={selected ? '#ffffff' : colors.primary} /></View><View style={styles.projectChipText}><Text numberOfLines={1} ellipsizeMode="middle" style={[styles.projectChipTitle, { color: selected ? '#ffffff' : colors.text }]}>{sourceTitle(source)}</Text><Text numberOfLines={1} ellipsizeMode="tail" style={[styles.projectChipOwner, { color: selected ? '#e0e7ff' : colors.icon }]}>{sourceOwner(source)}</Text></View>{selected ? <IconSymbol name="checkmark.circle.fill" size={17} color="#ffffff" /> : null}</TouchableOpacity>; })}
        </ScrollView>
        {selectedSource && selectedIsFavorite ? <TouchableOpacity onPress={() => void toggleFavorite(selectedSource)}><Text style={[styles.favoriteAction, { color: colors.primary }]}>{t('removeFromFavorites')}</Text></TouchableOpacity> : <Text style={[styles.hint, { color: colors.icon }]}>{isLoading ? t('loadingProjects') : favorites.length === 0 ? t('noFavoriteProjects') : t('projectPickerHint')}</Text>}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>何をしますか？</Text>
        <View style={styles.modeGrid}>
          {([{ key: 'build', title: '作る', detail: '機能追加・変更', icon: 'wrench' }, { key: 'debug', title: 'バグを直す', detail: '原因調査と修正', icon: 'terminal' }] as const).map((mode) => <TouchableOpacity key={mode.key} onPress={() => setTaskMode(mode.key)} style={[styles.modeCard, { backgroundColor: colors.surface, borderColor: taskMode === mode.key ? colors.primary : colors.border }]}><View style={[styles.modeIcon, { backgroundColor: `${colors.primary}1F` }]}><IconSymbol name={mode.icon} size={22} color={colors.primary} /></View><Text style={[styles.modeTitle, { color: colors.text }]}>{mode.title}</Text><Text style={[styles.modeDetail, { color: colors.icon }]}>{mode.detail}</Text></TouchableOpacity>)}
        </View>
        <TouchableOpacity onPress={() => setTaskMode('check')} style={[styles.checkCard, { backgroundColor: colors.surface, borderColor: taskMode === 'check' ? colors.primary : colors.border }]}><View style={[styles.modeIcon, { backgroundColor: `${colors.accent}1F` }]}><IconSymbol name="magnifyingglass" size={22} color={colors.accent} /></View><View style={{ flex: 1 }}><Text style={[styles.modeTitle, { color: colors.text }]}>全体を点検する</Text><Text style={[styles.modeDetail, { color: colors.icon }]}>変更せず、問題だけを日本語で報告</Text></View><IconSymbol name="chevron.right" size={18} color={colors.icon} /></TouchableOpacity>

        {taskMode ? <View style={[styles.composer, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
          <View style={styles.formHeader}><Text style={[styles.composerLabel, { color: colors.text }]}>{taskMode === 'build' ? '新しい作業' : taskMode === 'debug' ? 'バグを直す' : 'プロジェクトを点検'}</Text><TouchableOpacity onPress={() => setTaskMode(null)}><IconSymbol name="xmark" size={20} color={colors.icon} /></TouchableOpacity></View>
          {taskMode === 'build' ? <><Text style={[styles.fieldLabel, { color: colors.text }]}>何を作りますか？</Text><TextInput style={[styles.formInput, { color: colors.text, backgroundColor: colors.surfaceSecondary }]} value={prompt} onChangeText={setPrompt} multiline placeholder="完成した指示や変更内容" placeholderTextColor={colors.icon} /><Text style={[styles.fieldLabel, { color: colors.text }]}>変更してはいけないもの</Text><TextInput style={[styles.formInputSmall, { color: colors.text, backgroundColor: colors.surfaceSecondary }]} value={protectedAreas} onChangeText={setProtectedAreas} multiline /><Text style={[styles.fieldLabel, { color: colors.text }]}>完成条件</Text><TextInput style={[styles.formInputSmall, { color: colors.text, backgroundColor: colors.surfaceSecondary }]} value={doneCriteria} onChangeText={setDoneCriteria} multiline /></> : null}
          {taskMode === 'debug' ? <><Text style={[styles.fieldLabel, { color: colors.text }]}>何をしたとき？</Text><TextInput style={[styles.formInputSmall, { color: colors.text, backgroundColor: colors.surfaceSecondary }]} value={bugAction} onChangeText={setBugAction} placeholder="例：送信ボタンを押したとき" placeholderTextColor={colors.icon} /><Text style={[styles.fieldLabel, { color: colors.text }]}>何が起きた？</Text><TextInput style={[styles.formInput, { color: colors.text, backgroundColor: colors.surfaceSecondary }]} value={bugActual} onChangeText={setBugActual} multiline placeholder="実際の症状やエラー" placeholderTextColor={colors.icon} /><Text style={[styles.fieldLabel, { color: colors.text }]}>本来どうなるべき？</Text><TextInput style={[styles.formInputSmall, { color: colors.text, backgroundColor: colors.surfaceSecondary }]} value={bugExpected} onChangeText={setBugExpected} multiline /><Text style={[styles.fieldLabel, { color: colors.text }]}>発生頻度</Text><View style={styles.frequencyRow}>{['毎回', '時々', '一度だけ'].map((value) => <TouchableOpacity key={value} onPress={() => setBugFrequency(value)} style={[styles.frequencyChip, { backgroundColor: bugFrequency === value ? colors.primary : colors.surfaceSecondary }]}><Text style={{ color: bugFrequency === value ? '#ffffff' : colors.text, fontWeight: '700' }}>{value}</Text></TouchableOpacity>)}</View></> : null}
          {taskMode === 'check' ? <><Text style={[styles.fieldLabel, { color: colors.text }]}>点検する項目</Text>{([{ key: 'build', label: '起動・ビルド' }, { key: 'mobile', label: 'スマホ表示' }, { key: 'text', label: '文字化け・見切れ・日本語化' }, { key: 'errors', label: 'エラー処理' }, { key: 'security', label: 'セキュリティ' }, { key: 'performance', label: '処理速度' }, { key: 'quality', label: 'コード品質' }]).map((item) => <TouchableOpacity key={item.key} onPress={() => setCheckItems((current) => { const next = new Set(current); next.has(item.key) ? next.delete(item.key) : next.add(item.key); return next; })} style={styles.checkRow}><IconSymbol name={checkItems.has(item.key) ? 'checkmark.circle.fill' : 'circle'} size={21} color={checkItems.has(item.key) ? colors.primary : colors.icon} /><Text style={{ color: colors.text, fontWeight: '700' }}>{item.label}</Text></TouchableOpacity>)}<View style={[styles.auditNotice, { backgroundColor: `${colors.warning}17` }]}><Text style={{ color: colors.warning, fontSize: 12, lineHeight: 18, fontWeight: '700' }}>調査だけを依頼します。コード変更・PR作成は禁止します。</Text></View></> : null}
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: selectedSource && !isLoading ? 1 : 0.55 }]} disabled={!selectedSource || isLoading} onPress={() => void sendToJules()}><Text style={styles.primaryButtonText}>{isLoading ? 'Julesに依頼中…' : taskMode === 'check' ? '点検を開始' : taskMode === 'debug' ? '調査と修正を依頼' : 'Julesへ任せる'}</Text></TouchableOpacity>
        </View> : null}

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
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 28, gap: 10 },
  compactHeader: { minHeight: 42, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  compactTitle: { fontSize: 19, fontWeight: '900', letterSpacing: -0.4 },
  refresh: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, borderWidth: 1 },
  projectHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '900', letterSpacing: -0.25, flexShrink: 1 },
  addProjectButton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 18, paddingHorizontal: 11, paddingVertical: 8, flexShrink: 0 },
  addProjectText: { fontSize: 12, fontWeight: '800' },
  chips: { gap: 8, paddingRight: 14 },
  projectChip: { width: 205, minHeight: 56, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 15, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1 },
  repoIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  projectChipText: { flex: 1, minWidth: 0 },
  projectChipTitle: { fontWeight: '800', fontSize: 14 },
  projectChipOwner: { fontSize: 11, marginTop: 3, fontWeight: '600' },
  favoriteAction: { fontSize: 11, fontWeight: '700', alignSelf: 'flex-start', paddingVertical: 1 },
  modeGrid: { flexDirection: 'row', gap: 10 },
  modeCard: { flex: 1, minHeight: 122, borderWidth: 1.5, borderRadius: 18, padding: 14, justifyContent: 'center' },
  modeIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  modeTitle: { fontSize: 16, fontWeight: '900' },
  modeDetail: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  checkCard: { minHeight: 78, borderWidth: 1.5, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  composer: { borderWidth: 1, borderRadius: 19, padding: 14, gap: 9, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1 },
  composerLabel: { fontSize: 16, fontWeight: '900' },
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel: { fontSize: 13, fontWeight: '800', marginTop: 4 },
  formInput: { minHeight: 92, maxHeight: 220, borderRadius: 14, padding: 12, fontSize: 15, lineHeight: 21, textAlignVertical: 'top' },
  formInputSmall: { minHeight: 52, maxHeight: 120, borderRadius: 14, padding: 12, fontSize: 14, lineHeight: 20, textAlignVertical: 'top' },
  frequencyRow: { flexDirection: 'row', gap: 8 },
  frequencyChip: { flex: 1, minHeight: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  checkRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 10 },
  auditNotice: { borderRadius: 13, padding: 11 },
  prompt: { minHeight: 76, maxHeight: 210, fontSize: 15, lineHeight: 22 },
  presetRow: { gap: 8 },
  preset: { maxWidth: 190, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 15 },
  primaryButton: { minHeight: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
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
