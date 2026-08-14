import React, { useMemo, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Activity } from '@/constants/types';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { createFixRequest, createOneClickFixRequest, parseAuditFindings } from '@/utils/audit-results';
import { useI18n } from '@/constants/i18n-context';

interface AuditResultPanelProps {
  activities: Activity[];
  isDark: boolean;
  isCreatingFix: boolean;
  onCreateFix: (prompt: string) => void;
}

export function AuditResultPanel({ activities, isDark, isCreatingFix, onCreateFix }: AuditResultPanelProps) {
  const colors = isDark ? Colors.dark : Colors.light;
  const { t } = useI18n();
  const findings = useMemo(() => parseAuditFindings(activities), [activities]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [showCopyText, setShowCopyText] = useState(false);

  if (findings.length === 0) return null;
  const selectedFindings = findings.filter((finding) => selected.has(finding.id));
  const request = createFixRequest(selectedFindings, notes, comments);
  const selectAll = () => setSelected(new Set(findings.map((finding) => finding.id)));

  return <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.heading}><View style={[styles.headingIcon, { backgroundColor: `${colors.accent}20` }]}><IconSymbol name="magnifyingglass" size={18} color={colors.accent} /></View><View style={styles.headingCopy}><Text style={[styles.title, { color: colors.text }]}>{t('auditFixTitle')}</Text><Text style={[styles.description, { color: colors.icon }]}>{t('auditFixDescription')}</Text></View></View>
    <View style={styles.actionRow}><TouchableOpacity onPress={selectAll} style={[styles.secondaryButton, { borderColor: colors.border }]}><Text style={[styles.secondaryText, { color: colors.primary }]}>{t('auditSelectAll')}</Text></TouchableOpacity><TouchableOpacity onPress={() => setSelected(new Set())} style={[styles.secondaryButton, { borderColor: colors.border }]}><Text style={[styles.secondaryText, { color: colors.icon }]}>{t('auditClearSelection')}</Text></TouchableOpacity></View>
    {findings.map((finding, index) => { const checked = selected.has(finding.id); const severityColor = finding.severity === 'urgent' ? colors.error : finding.severity === 'decision' ? colors.warning : colors.accent; const severity = finding.severity === 'urgent' ? t('auditUrgent') : finding.severity === 'decision' ? t('auditDecision') : t('auditRecommended'); return <View key={finding.id} style={[styles.finding, { borderColor: checked ? colors.primary : colors.border, backgroundColor: colors.surfaceSecondary }]}><TouchableOpacity onPress={() => setSelected((current) => { const next = new Set(current); checked ? next.delete(finding.id) : next.add(finding.id); return next; })} style={styles.findingHeader} accessibilityRole="checkbox" accessibilityState={{ checked }}><IconSymbol name={checked ? 'checkmark.circle.fill' : 'circle'} size={22} color={checked ? colors.primary : colors.icon} /><View style={styles.findingTitleWrap}><Text style={[styles.findingTitle, { color: colors.text }]}>{index + 1}. {finding.title}</Text><Text style={[styles.severity, { color: severityColor }]}>{severity}</Text></View></TouchableOpacity><Text style={[styles.detail, { color: colors.icon }]}>{t('auditLocation')}: {finding.location}</Text><Text style={[styles.detail, { color: colors.icon }]}>{t('auditRecommendation')}: {finding.recommendation}</Text>{checked && <View style={styles.inputs}><TextInput value={notes[finding.id] ?? ''} onChangeText={(value) => setNotes((current) => ({ ...current, [finding.id]: value }))} placeholder={t('auditExtraNotePlaceholder')} placeholderTextColor={colors.icon} multiline style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} /><TextInput value={comments[finding.id] ?? ''} onChangeText={(value) => setComments((current) => ({ ...current, [finding.id]: value }))} placeholder={t('auditCommentPlaceholder')} placeholderTextColor={colors.icon} multiline style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} /></View>}</View>; })}
    <TouchableOpacity disabled={findings.length === 0 || isCreatingFix} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onCreateFix(createOneClickFixRequest(findings, notes, comments)); }} style={[styles.primaryButton, { backgroundColor: colors.success, opacity: findings.length > 0 && !isCreatingFix ? 1 : 0.5 }]} accessibilityRole="button" accessibilityLabel={t('auditFixAllThrough')}><IconSymbol name="bolt.fill" size={18} color={styles.primaryText.color} /><Text style={styles.primaryText}>{isCreatingFix ? t('auditCreatingAll') : t('auditFixAllThrough')}</Text></TouchableOpacity>
    <TouchableOpacity disabled={selectedFindings.length === 0 || isCreatingFix} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onCreateFix(request); }} style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: selectedFindings.length > 0 && !isCreatingFix ? 1 : 0.5 }]}><IconSymbol name="wrench" size={18} color={styles.primaryText.color} /><Text style={styles.primaryText}>{isCreatingFix ? t('auditCreatingFix') : t('auditFixSelected').replace('{{count}}', String(selectedFindings.length))}</Text></TouchableOpacity>
    <TouchableOpacity onPress={() => setShowCopyText((value) => !value)} style={styles.copyButton}><IconSymbol name="doc.text" size={17} color={colors.primary} /><Text style={[styles.copyText, { color: colors.primary }]}>{t('auditHandoff')}</Text></TouchableOpacity>
    {showCopyText && <Text selectable style={[styles.copyArea, { color: colors.text, backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>{request}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 12, marginBottom: 16 }, heading: { flexDirection: 'row', gap: 10 }, headingIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, headingCopy: { flex: 1 }, title: { fontSize: 16, fontWeight: '900' }, description: { marginTop: 3, fontSize: 12, lineHeight: 18 }, actionRow: { flexDirection: 'row', gap: 8 }, secondaryButton: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 }, secondaryText: { fontSize: 12, fontWeight: '800' }, finding: { borderWidth: 1, borderRadius: 13, padding: 11, gap: 5 }, findingHeader: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' }, findingTitleWrap: { flex: 1 }, findingTitle: { fontSize: 14, lineHeight: 20, fontWeight: '800' }, severity: { marginTop: 2, fontSize: 11, fontWeight: '800' }, detail: { fontSize: 12, lineHeight: 18 }, inputs: { gap: 8, marginTop: 5 }, input: { minHeight: 52, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, fontSize: 13, textAlignVertical: 'top' }, primaryButton: { minHeight: 48, borderRadius: 13, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }, primaryText: { color: '#ffffff', fontSize: 14, fontWeight: '900' }, copyButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, paddingVertical: 8 }, copyText: { fontSize: 13, fontWeight: '800' }, copyArea: { borderWidth: 1, borderRadius: 11, padding: 10, fontSize: 12, lineHeight: 18 },
});
