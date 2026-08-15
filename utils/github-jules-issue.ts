import { CHECK_ITEM_LABELS, type CheckItemKey } from '@/utils/audit-results';

interface GitHubJulesIssueParams {
  owner: string;
  repo: string;
  branch: string;
  checkItems: Iterable<CheckItemKey>;
  notes?: string;
}

export function createGitHubJulesIssueUrl({ owner, repo, branch, checkItems, notes = '' }: GitHubJulesIssueParams): string {
  const selectedItems = [...checkItems].map((item) => `- ${CHECK_ITEM_LABELS[item]}`).join('\n');
  const extraNotes = notes.trim() ? `\n\n【追加指示】\n${notes.trim()}` : '';
  const title = 'Jules完全自動：点検・修正・最終確認';
  const body = `【完全自動タスク】
対象ブランチ: ${branch}

次の項目について、途中で利用者の回答や承認を求めず、最後まで自律的に進めてください。

【点検項目】
${selectedItems}${extraNotes}

【必須の進行順】
1. 現在の実装を点検する
2. 問題を重要度別に整理する
3. 修正が必要な問題を安全側の判断で修正する
4. テスト・型検査・ビルドなど実行可能な検証を行う
5. 同じ点検項目を最終チェックする
6. 残る問題とリスクを明記する
7. 変更をコミットし、Pull Requestを作成する

【自動進行ルール】
- 途中の進捗確認、方針承認、追加質問は行わない
- 判断が必要な場合は既存機能を壊さない安全側を選ぶ
- 秘密情報、認証情報、APIキーは変更・出力・コミットしない
- 失敗した検証は隠さず、原因と影響をPRへ記載する
- PR作成前に停止しない`;
  const query = new URLSearchParams({ title, body, labels: 'jules' });
  return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/new?${query.toString()}`;
}
