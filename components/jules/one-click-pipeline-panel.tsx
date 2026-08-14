import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useI18n } from '@/constants/i18n-context';
import type { Activity } from '@/constants/types';
import { detectPipelineProgress, type PipelineStepId, type PipelineStepStatus } from '@/utils/audit-results';

interface OneClickPipelinePanelProps {
  activities: Activity[];
  sessionState: string | null;
  hasPullRequest: boolean;
  isDark: boolean;
}

const STEP_KEYS: PipelineStepId[] = ['check', 'fix', 'review', 'implement'];

function stepLabel(step: PipelineStepId, t: (key: 'pipelineCheck' | 'pipelineFix' | 'pipelineReview' | 'pipelineImplement') => string): string {
  if (step === 'check') return t('pipelineCheck');
  if (step === 'fix') return t('pipelineFix');
  if (step === 'review') return t('pipelineReview');
  return t('pipelineImplement');
}

function statusLabel(status: PipelineStepStatus, t: (key: 'pipelineWaiting' | 'pipelineActive' | 'pipelineDone') => string): string {
  if (status === 'done') return t('pipelineDone');
  if (status === 'active') return t('pipelineActive');
  return t('pipelineWaiting');
}

export function OneClickPipelinePanel({ activities, sessionState, hasPullRequest, isDark }: OneClickPipelinePanelProps) {
  const colors = isDark ? Colors.dark : Colors.light;
  const { t } = useI18n();
  const progress = useMemo(
    () => detectPipelineProgress(activities, sessionState, hasPullRequest),
    [activities, hasPullRequest, sessionState],
  );

  return (
    <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.heading}>
        <View style={[styles.icon, { backgroundColor: `${colors.success}20` }]}>
          <IconSymbol name="bolt.fill" size={18} color={colors.success} />
        </View>
        <View style={styles.headingCopy}>
          <Text style={[styles.title, { color: colors.text }]}>{t('pipelineTitle')}</Text>
          <Text style={[styles.description, { color: sessionState === 'FAILED' ? colors.error : colors.icon }]}>
            {sessionState === 'FAILED' ? t('jobFailedAction') : t('pipelineDescription')}
          </Text>
        </View>
      </View>
      <View style={styles.steps}>
        {STEP_KEYS.map((step, index) => {
          const status = progress.steps[step];
          const tone = status === 'done' ? colors.success : status === 'active' ? colors.primary : colors.border;
          const labelColor = status === 'waiting' ? colors.icon : colors.text;
          return (
            <View key={step} style={styles.step}>
              {index > 0 ? <View style={[styles.connector, { backgroundColor: progress.steps[STEP_KEYS[index - 1]] === 'done' ? colors.success : colors.border }]} /> : null}
              <View style={[styles.dot, { backgroundColor: tone }]} />
              <Text style={[styles.stepLabel, { color: labelColor }]}>{stepLabel(step, t)}</Text>
              <Text style={[styles.stepStatus, { color: tone }]}>{statusLabel(status, t)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 12, marginBottom: 16 },
  heading: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headingCopy: { flex: 1 },
  title: { fontSize: 16, fontWeight: '900' },
  description: { marginTop: 3, fontSize: 12, lineHeight: 18 },
  steps: { flexDirection: 'row', gap: 6 },
  step: { flex: 1, alignItems: 'center', gap: 5, position: 'relative' },
  connector: { position: 'absolute', left: -8, right: '50%', top: 5, height: 2 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  stepLabel: { fontSize: 11, fontWeight: '800', textAlign: 'center' },
  stepStatus: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
});
