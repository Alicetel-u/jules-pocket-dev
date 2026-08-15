import { describe, expect, it } from 'bun:test';
import {
  countOneClickContinues,
  createCheckPrompt,
  createFixRequest,
  createOneClickCompletePrompt,
  createOneClickContinueMessage,
  createOneClickFixRequest,
  detectPipelineProgress,
  getSessionFailureReason,
  isAuditOnlySession,
  isOneClickCompleteSession,
  lastActivityIsOneClickContinue,
  ONE_CLICK_CONTINUE_MARKER,
  ONE_CLICK_MARKER,
  parseAuditFindings,
  parseSelfCheckResult,
} from './audit-results';
import type { Activity } from '@/constants/types';

function activity(partial: Partial<Activity> & Pick<Activity, 'originator'>): Activity {
  return {
    name: partial.name ?? 'a',
    id: partial.id ?? 'a',
    createTime: partial.createTime ?? '2026-01-01T00:00:00Z',
    originator: partial.originator,
    agentMessaged: partial.agentMessaged,
    userMessaged: partial.userMessaged,
    sessionFailed: partial.sessionFailed,
  };
}

const auditMessage = `[ISSUE]
分類: 今すぐ修正
問題: 入力値の検証不足
場所: app/login.tsx:24
原因: 空文字を許可している
影響: 不正なリクエストを送信する
推奨修正: 送信前に入力値を検証する
[/ISSUE]`;

describe('audit results', () => {
  it('extracts structured findings from agent messages', () => {
    const activities: Activity[] = [{ name: 'a', id: 'a', createTime: '2026-01-01T00:00:00Z', originator: 'agent', agentMessaged: { agentMessage: auditMessage } }];
    const findings = parseAuditFindings(activities);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ severity: 'urgent', title: '入力値の検証不足', location: 'app/login.tsx:24' });
  });

  it('includes selected finding instructions and comments in a fix request', () => {
    const [finding] = parseAuditFindings([{ name: 'a', id: 'a', createTime: '2026-01-01T00:00:00Z', originator: 'agent', agentMessaged: { agentMessage: auditMessage } }]);
    const request = createFixRequest([finding], { [finding.id]: '既存のUIを変えない' }, { [finding.id]: 'ログイン画面で再確認' });
    expect(request).toContain('既存のUIを変えない');
    expect(request).toContain('ログイン画面で再確認');
    expect(request).toContain('PRを作成してください');
    expect(request).toContain('[SELF_CHECK]');
  });

  it('reads the final self-check result', () => {
    const activities: Activity[] = [{ name: 'a', id: 'a', createTime: '2026-01-01T00:00:00Z', originator: 'agent', agentMessaged: { agentMessage: '[SELF_CHECK]\n確認済み: bun test は成功\n未確認: なし\n残るリスク: 実機未確認\n[/SELF_CHECK]' } }];
    expect(parseSelfCheckResult(activities)).toEqual({ verified: 'bun test は成功', unverified: 'なし', risks: '実機未確認' });
  });

  it('builds an audit-only prompt that forbids implementation', () => {
    const prompt = createCheckPrompt(['build', 'security']);
    expect(prompt).toContain('調査専用');
    expect(prompt).toContain('起動・ビルド');
    expect(prompt).toContain('セキュリティ');
    expect(prompt).toContain('[ISSUE]');
    expect(prompt).not.toContain(ONE_CLICK_MARKER);
  });

  it('builds a one-click prompt that goes from audit through PR', () => {
    const prompt = createOneClickCompletePrompt(['mobile', 'quality'], '既存デザインは変えない');
    expect(prompt.startsWith(ONE_CLICK_MARKER)).toBe(true);
    expect(prompt).toContain('スマホ表示');
    expect(prompt).toContain('コード品質');
    expect(prompt).toContain('既存デザインは変えない');
    expect(prompt).toContain('[ISSUE]');
    expect(prompt).toContain('[SELF_CHECK]');
    expect(prompt).toContain('PRを作成');
    expect(prompt).not.toContain('調査専用');
  });

  it('wraps selected findings in a one-click fix request', () => {
    const [finding] = parseAuditFindings([activity({ originator: 'agent', agentMessaged: { agentMessage: auditMessage } })]);
    const request = createOneClickFixRequest([finding], {}, {});
    expect(request.startsWith(ONE_CLICK_MARKER)).toBe(true);
    expect(request).toContain(finding.title);
    expect(request).toContain('[SELF_CHECK]');
  });

  it('distinguishes audit-only sessions from one-click complete sessions', () => {
    const audit = [activity({ originator: 'user', userMessaged: { userMessage: createCheckPrompt(['build']) } })];
    const oneClick = [activity({ originator: 'user', userMessaged: { userMessage: createOneClickCompletePrompt(['build']) } })];
    expect(isAuditOnlySession(audit)).toBe(true);
    expect(isOneClickCompleteSession(audit)).toBe(false);
    expect(isAuditOnlySession(oneClick)).toBe(false);
    expect(isOneClickCompleteSession(oneClick)).toBe(true);
  });

  it('recognizes one-click sessions from the session prompt before activities arrive', () => {
    expect(isOneClickCompleteSession([], { prompt: createOneClickCompletePrompt(['build']) })).toBe(true);
    expect(isOneClickCompleteSession([], { title: ONE_CLICK_MARKER })).toBe(true);
    expect(isOneClickCompleteSession([], { title: 'Fix login' })).toBe(false);
  });

  it('builds a continue message and counts previous auto-continues', () => {
    const continueMessage = createOneClickContinueMessage();
    expect(continueMessage.startsWith(ONE_CLICK_CONTINUE_MARKER)).toBe(true);
    expect(continueMessage).toContain('この進捗で問題ありません');
    expect(continueMessage).toContain('PR作成まで一気に完了');
    const continued = [activity({ originator: 'user', userMessaged: { userMessage: continueMessage } })];
    expect(countOneClickContinues(continued)).toBe(1);
    expect(lastActivityIsOneClickContinue(continued)).toBe(true);
    expect(lastActivityIsOneClickContinue([activity({ originator: 'agent', agentMessaged: { agentMessage: '質問です' } })])).toBe(false);
  });

  it('reads the latest session failure reason', () => {
    const activities = [
      activity({ originator: 'agent', sessionFailed: { reason: 'first' } }),
      activity({ originator: 'agent', sessionFailed: { reason: 'sandbox crashed' } }),
    ];
    expect(getSessionFailureReason(activities)).toBe('sandbox crashed');
    expect(getSessionFailureReason([])).toBeNull();
  });

  it('advances pipeline progress from check through implementation', () => {
    const start = detectPipelineProgress([], 'QUEUED', false);
    expect(start).toEqual({
      steps: { check: 'active', fix: 'waiting', review: 'waiting', implement: 'waiting' },
      current: 'check',
    });

    const afterFindings = detectPipelineProgress(
      [activity({ originator: 'agent', agentMessaged: { agentMessage: auditMessage } })],
      'IN_PROGRESS',
      false,
    );
    expect(afterFindings.current).toBe('fix');
    expect(afterFindings.steps.check).toBe('done');
    expect(afterFindings.steps.fix).toBe('active');

    const afterSelfCheck = detectPipelineProgress(
      [activity({
        originator: 'agent',
        agentMessaged: { agentMessage: `${auditMessage}\n[SELF_CHECK]\n確認済み: bun test\n未確認: なし\n残るリスク: なし\n[/SELF_CHECK]` },
      })],
      'IN_PROGRESS',
      false,
    );
    expect(afterSelfCheck.current).toBe('implement');
    expect(afterSelfCheck.steps.review).toBe('done');
    expect(afterSelfCheck.steps.implement).toBe('active');

    const done = detectPipelineProgress([], 'COMPLETED', true);
    expect(done).toEqual({
      steps: { check: 'done', fix: 'done', review: 'done', implement: 'done' },
      current: 'implement',
    });

    const stoppedAfterAudit = detectPipelineProgress(
      [activity({ originator: 'agent', agentMessaged: { agentMessage: auditMessage } })],
      'COMPLETED',
      false,
    );
    expect(stoppedAfterAudit.steps.check).toBe('done');
    expect(stoppedAfterAudit.steps.fix).toBe('done');
    expect(stoppedAfterAudit.steps.implement).toBe('waiting');

    const failedDuringFix = detectPipelineProgress(
      [activity({ originator: 'agent', agentMessaged: { agentMessage: auditMessage } })],
      'FAILED',
      false,
    );
    expect(failedDuringFix.steps.check).toBe('done');
    expect(failedDuringFix.steps.fix).toBe('active');
    expect(failedDuringFix.steps.implement).toBe('waiting');
  });
});
