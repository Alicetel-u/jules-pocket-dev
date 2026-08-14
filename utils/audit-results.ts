import type { Activity } from '@/constants/types';

export type AuditSeverity = 'urgent' | 'recommended' | 'decision';
export type CheckItemKey = 'build' | 'mobile' | 'text' | 'errors' | 'security' | 'performance' | 'quality';
export type PipelineStepId = 'check' | 'fix' | 'review' | 'implement';
export type PipelineStepStatus = 'waiting' | 'active' | 'done';

export interface AuditFinding {
  id: string;
  severity: AuditSeverity;
  title: string;
  location: string;
  cause: string;
  impact: string;
  recommendation: string;
}

export interface PipelineProgress {
  steps: Record<PipelineStepId, PipelineStepStatus>;
  current: PipelineStepId;
}

/** Marker used in prompts so the client can recognize a one-click complete session. */
export const ONE_CLICK_MARKER = '【ワンボタン完結】';

export const CHECK_ITEM_LABELS: Record<CheckItemKey, string> = {
  build: '起動・ビルド',
  mobile: 'スマホ表示',
  text: '文字化け・見切れ・未翻訳',
  errors: 'エラー処理',
  security: 'セキュリティ',
  performance: '処理速度',
  quality: 'コード品質',
};

export const CHECK_ITEM_KEYS: CheckItemKey[] = [
  'build',
  'mobile',
  'text',
  'errors',
  'security',
  'performance',
  'quality',
];

const SEVERITY_BY_LABEL: Record<string, AuditSeverity> = {
  '今すぐ修正': 'urgent',
  'できれば修正': 'recommended',
  '判断が必要': 'decision',
  urgent: 'urgent',
  recommended: 'recommended',
  decision: 'decision',
};

function field(block: string, label: string): string {
  const match = block.match(new RegExp(`^${label}[：:]\\s*(.+)$`, 'mi'));
  return match?.[1]?.trim() ?? '';
}

/** Extracts the structured audit blocks requested from Jules. */
export function parseAuditFindings(activities: Activity[]): AuditFinding[] {
  const messages = activities
    .filter((activity) => activity.originator === 'agent')
    .map((activity) => activity.agentMessaged?.agentMessage ?? '')
    .join('\n');
  const blocks = messages.match(/\[ISSUE\][\s\S]*?\[\/ISSUE\]/g) ?? [];

  return blocks.map((block, index) => {
    const severityLabel = field(block, '分類').toLowerCase();
    return {
      id: `finding-${index}-${field(block, '場所')}`,
      severity: SEVERITY_BY_LABEL[severityLabel] ?? 'recommended',
      title: field(block, '問題') || `点検項目 ${index + 1}`,
      location: field(block, '場所') || '未指定',
      cause: field(block, '原因') || '未記載',
      impact: field(block, '影響') || '未記載',
      recommendation: field(block, '推奨修正') || '未記載',
    };
  });
}

export function createFixRequest(findings: AuditFinding[], notes: Record<string, string>, comments: Record<string, string>): string {
  const items = findings.map((finding, index) => [
    `## 修正 ${index + 1}: ${finding.title}`,
    `- 場所: ${finding.location}`,
    `- 点検で確認された原因: ${finding.cause}`,
    `- 影響: ${finding.impact}`,
    `- 推奨修正: ${finding.recommendation}`,
    notes[finding.id] ? `- 追加の修正指示: ${notes[finding.id]}` : '',
    comments[finding.id] ? `- コメント: ${comments[finding.id]}` : '',
  ].filter(Boolean).join('\n')).join('\n\n');

  return `以下の点検結果について修正してください。点検結果の推測ではなく、実際のコードを確認してから対応してください。\n\n${items}\n\n変更は必要最小限にしてください。修正後、PRを作成する前に必ず自己チェックを実施してください。自己チェックでは、修正対象の再現確認、関連テストまたはビルド、変更箇所の副作用確認を行い、問題が見つかれば先に追加修正してください。最後に、結果を必ず次の形式で報告してからPRを作成してください。\n\n[SELF_CHECK]\n確認済み: 実施した確認・テストと結果\n未確認: 実行できなかった確認（なければ「なし」）\n残るリスク: 既知のリスク（なければ「なし」）\n[/SELF_CHECK]`;
}

export interface SelfCheckResult {
  verified: string;
  unverified: string;
  risks: string;
}

export function parseSelfCheckResult(activities: Activity[]): SelfCheckResult | null {
  const messages = activities
    .filter((activity) => activity.originator === 'agent')
    .map((activity) => activity.agentMessaged?.agentMessage ?? '')
    .join('\n');
  const blocks = messages.match(/\[SELF_CHECK\][\s\S]*?\[\/SELF_CHECK\]/g);
  const block = blocks?.at(-1);
  if (!block) return null;
  return { verified: field(block, '確認済み') || '未記載', unverified: field(block, '未確認') || '未記載', risks: field(block, '残るリスク') || '未記載' };
}

function userMessages(activities: Activity[]): string {
  return activities
    .filter((activity) => activity.originator === 'user')
    .map((activity) => activity.userMessaged?.userMessage ?? '')
    .join('\n');
}

export function isOneClickCompleteSession(activities: Activity[]): boolean {
  return userMessages(activities).includes(ONE_CLICK_MARKER);
}

export function isAuditOnlySession(activities: Activity[]): boolean {
  const text = userMessages(activities);
  return /調査専用/.test(text) && !text.includes(ONE_CLICK_MARKER);
}

function formatCheckItems(checkItems: Iterable<string>): string {
  return [...checkItems]
    .map((item) => `- ${CHECK_ITEM_LABELS[item as CheckItemKey] ?? item}`)
    .join('\n');
}

const ISSUE_FORMAT = `[ISSUE]
分類: 今すぐ修正 / できれば修正 / 判断が必要
問題: 短い件名
場所: ファイルパスと該当箇所
原因: 確認済みの原因
影響: 利用者またはコードへの影響
推奨修正: 実施案
[/ISSUE]`;

const SELF_CHECK_FORMAT = `[SELF_CHECK]
確認済み: 実施した確認・テストと結果
未確認: 実行できなかった確認（なければ「なし」）
残るリスク: 既知のリスク（なければ「なし」）
[/SELF_CHECK]`;

/** Audit-only prompt: report issues, do not change files. */
export function createCheckPrompt(checkItems: Iterable<string>): string {
  return `このリポジトリを点検してください。今回は調査専用です。ファイルの変更、コミット、PR作成は一切しないでください。\n\n【点検項目】\n${formatCheckItems(checkItems)}\n\n問題がある場合は、必ず問題ごとに次の形式だけで出力してください。\n${ISSUE_FORMAT}\n\n問題なしは最後に通常の文章でまとめてください。推測と確認済み事実を区別してください。`;
}

/** One-button prompt: audit, fix everything, self-check, then open a PR. */
export function createOneClickCompletePrompt(checkItems: Iterable<string>, extraNotes = ''): string {
  const notes = extraNotes.trim()
    ? `\n\n【追加の指示】\n${extraNotes.trim()}`
    : '';

  return `${ONE_CLICK_MARKER}このリポジトリを点検し、見つかった問題をすべて修正し、自己チェックしたうえで実装を完了してPRを作成してください。途中で承認や追加の質問を待たず、最後まで一気に進めてください。「判断が必要」な項目も、既存機能を壊さない安全側の実装で対応してください。失敗してもGitで元に戻せます。調査だけで止めないでください。ファイル変更・コミット・PR作成を行ってください。${notes}

【点検項目】
${formatCheckItems(checkItems)}

必ず次の順番で進めてください。

1. 点検
実際のコードを確認し、問題がある場合は問題ごとに次の形式で出力してください。
${ISSUE_FORMAT}

2. 修正
出力した点検結果の全件を、必要最小限の変更で修正してください。推測ではなく実際のコードを確認してから対応してください。

3. 最終自己チェック
修正対象の再現確認、関連テストまたはビルド、変更箇所の副作用確認を行い、問題が見つかれば先に追加修正してください。

4. 実装完了
結果を必ず次の形式で報告してからPRを作成してください。
${SELF_CHECK_FORMAT}`;
}

/** Wraps a selected-finding fix request so Jules does not stop before the PR. */
export function createOneClickFixRequest(
  findings: AuditFinding[],
  notes: Record<string, string>,
  comments: Record<string, string>,
): string {
  return `${ONE_CLICK_MARKER}途中で止めず、次の点検項目をすべて修正し、自己チェックのあとPR作成まで一気に完了してください。「判断が必要」な項目も安全側に倒して実装してください。失敗してもGitで元に戻せます。\n\n${createFixRequest(findings, notes, comments)}`;
}

export function detectPipelineProgress(
  activities: Activity[],
  sessionState: string | null,
  hasPullRequest: boolean,
): PipelineProgress {
  if (hasPullRequest) {
    return {
      steps: { check: 'done', fix: 'done', review: 'done', implement: 'done' },
      current: 'implement',
    };
  }

  const findings = parseAuditFindings(activities);
  const selfCheck = parseSelfCheckResult(activities);
  const working = sessionState === 'IN_PROGRESS' || sessionState === 'PLANNING' || sessionState === 'QUEUED';
  const completed = sessionState === 'COMPLETED' || sessionState === 'FAILED';
  const hasFindings = findings.length > 0;

  const check: PipelineStepStatus = hasFindings || completed ? 'done' : working ? 'active' : 'waiting';
  const fix: PipelineStepStatus = selfCheck || (completed && hasFindings)
    ? 'done'
    : check === 'done' && working
      ? 'active'
      : 'waiting';
  const review: PipelineStepStatus = selfCheck
    ? 'done'
    : fix === 'done' && working
      ? 'active'
      : 'waiting';
  const implement: PipelineStepStatus = review === 'done' && working ? 'active' : 'waiting';

  const current: PipelineStepId = implement !== 'waiting'
    ? 'implement'
    : review !== 'waiting'
      ? 'review'
      : fix !== 'waiting'
        ? 'fix'
        : 'check';

  return { steps: { check, fix, review, implement }, current };
}
