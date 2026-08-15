import { describe, expect, it } from 'bun:test';
import { createGitHubJulesIssueUrl } from './github-jules-issue';

describe('createGitHubJulesIssueUrl', () => {
  it('prefills the repository issue, jules label, checks, and notes', () => {
    const value = createGitHubJulesIssueUrl({
      owner: 'Alicetel-u',
      repo: 'jules-pocket-dev',
      branch: 'main',
      checkItems: ['build', 'security'],
      notes: '既存UIを維持する',
    });
    const url = new URL(value);
    expect(url.origin + url.pathname).toBe('https://github.com/Alicetel-u/jules-pocket-dev/issues/new');
    expect(url.searchParams.get('labels')).toBe('jules');
    expect(url.searchParams.get('title')).toContain('Jules完全自動');
    expect(url.searchParams.get('body')).toContain('起動・ビルド');
    expect(url.searchParams.get('body')).toContain('セキュリティ');
    expect(url.searchParams.get('body')).toContain('既存UIを維持する');
    expect(url.searchParams.get('body')).toContain('PR作成前に停止しない');
  });
});
