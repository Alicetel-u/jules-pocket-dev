import React, { useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import type { Activity, PullRequest } from '@/constants/types';
import { useI18n } from '@/constants/i18n-context';
import { parseSelfCheckResult } from '@/utils/audit-results';

interface FinalReviewPanelProps {
  pullRequest: string | PullRequest;
  activities: Activity[];
  isDark: boolean;
}

export function FinalReviewPanel({ pullRequest, activities, isDark }: FinalReviewPanelProps) {
  const colors = isDark ? Colors.dark : Colors.light;
  const { t } = useI18n();
  const [codexReviewed, setCodexReviewed] = useState(false);
  const [testsReviewed, setTestsReviewed] = useState(false);
  const [risksReviewed, setRisksReviewed] = useState(false);
  const [showHandoff, setShowHandoff] = useState(false);
  const url = typeof pullRequest === 'string' ? pullRequest : pullRequest.url;
  const ready = codexReviewed && testsReviewed && risksReviewed;
  const selfCheck = parseSelfCheckResult(activities);
  const handoff = `このPRを最終チェックしてください。\n\n確認してほしいこと:\n- 変更差分が点検・修正依頼の範囲に収まるか\n- テスト結果と未検証のリスク\n- 既存機能への副作用・セキュリティ・回帰\n- マージ可 / 追加修正が必要 / 判断保留 の結論と理由\n\nPR: ${url}`;

  const Check = ({ checked, label, onPress }: { checked: boolean; label: string; onPress: () => void }) => <TouchableOpacity onPress={onPress} style={styles.checkRow} accessibilityRole="checkbox" accessibilityState={{ checked }}><IconSymbol name={checked ? 'checkmark.circle.fill' : 'circle'} size={21} color={checked ? colors.success : colors.icon} /><Text style={[styles.checkText, { color: colors.text }]}>{label}</Text></TouchableOpacity>;
  return <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.heading}><View style={[styles.icon, { backgroundColor: `${colors.success}20` }]}><IconSymbol name="checkmark.circle.fill" size={18} color={colors.success} /></View><View style={{ flex: 1 }}><Text style={[styles.title, { color: colors.text }]}>{t('finalReviewTitle')}</Text><Text style={[styles.description, { color: colors.icon }]}>{t('finalReviewDescription')}</Text></View></View>
    <View style={[styles.selfCheck, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}><Text style={[styles.selfCheckTitle, { color: colors.text }]}>{selfCheck ? t('finalReviewSelfCheckDone') : t('finalReviewSelfCheckPending')}</Text>{selfCheck ? <><Text style={[styles.selfCheckText, { color: colors.icon }]}>{t('finalReviewVerified')}: {selfCheck.verified}</Text><Text style={[styles.selfCheckText, { color: colors.icon }]}>{t('finalReviewUnverified')}: {selfCheck.unverified}</Text><Text style={[styles.selfCheckText, { color: colors.icon }]}>{t('finalReviewRisksLabel')}: {selfCheck.risks}</Text></> : <Text style={[styles.selfCheckText, { color: colors.icon }]}>{t('finalReviewSelfCheckWaiting')}</Text>}</View>
    <Check checked={codexReviewed} onPress={() => setCodexReviewed((value) => !value)} label={t('finalReviewCodex')} />
    <Check checked={testsReviewed} onPress={() => setTestsReviewed((value) => !value)} label={t('finalReviewTests')} />
    <Check checked={risksReviewed} onPress={() => setRisksReviewed((value) => !value)} label={t('finalReviewRisks')} />
    <TouchableOpacity onPress={() => setShowHandoff((value) => !value)} style={styles.handoff}><IconSymbol name="doc.text" size={17} color={colors.primary} /><Text style={[styles.handoffText, { color: colors.primary }]}>{t('finalReviewHandoff')}</Text></TouchableOpacity>
    {showHandoff && <Text selectable style={[styles.handoffArea, { color: colors.text, backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>{handoff}</Text>}
    <TouchableOpacity disabled={!ready} onPress={() => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); if (url) void Linking.openURL(url); }} style={[styles.mergeButton, { backgroundColor: colors.success, opacity: ready ? 1 : 0.48 }]}><IconSymbol name="arrow.triangle.pull" size={18} color="#ffffff" /><Text style={styles.mergeText}>{ready ? t('finalReviewMerge') : t('finalReviewIncomplete')}</Text></TouchableOpacity>
  </View>;
}

const styles = StyleSheet.create({ panel: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 10, marginBottom: 16 }, heading: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' }, icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 16, fontWeight: '900' }, description: { marginTop: 3, fontSize: 12, lineHeight: 18 }, selfCheck: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 4 }, selfCheckTitle: { fontSize: 13, fontWeight: '900' }, selfCheckText: { fontSize: 12, lineHeight: 17 }, checkRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 3 }, checkText: { flex: 1, fontSize: 13, fontWeight: '700' }, handoff: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 7 }, handoffText: { fontSize: 13, fontWeight: '800' }, handoffArea: { borderWidth: 1, borderRadius: 11, padding: 10, fontSize: 12, lineHeight: 18 }, mergeButton: { minHeight: 48, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, mergeText: { color: '#ffffff', fontSize: 14, fontWeight: '900' } });
