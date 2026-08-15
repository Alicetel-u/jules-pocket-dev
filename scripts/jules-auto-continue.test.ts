import { describe, expect, it } from 'bun:test';
import { isOneClickSession, shouldAutoContinue } from './jules-auto-continue';

const session = { name: 'sessions/one', state: 'AWAITING_USER_FEEDBACK', prompt: '【ワンボタン完結】全部行う' };
const agentQuestion = { name: 'activities/question', createTime: '2026-08-15T00:00:00.000Z', agentMessaged: { agentMessage: '続けますか？' } };

describe('Jules background auto-continue', () => {
  it('recognizes one-click sessions and continues an agent question', () => {
    expect(isOneClickSession(session, [agentQuestion])).toBe(true);
    expect(shouldAutoContinue(session, [agentQuestion], Date.parse('2026-08-15T00:01:00.000Z'))).toBe(true);
  });

  it('ignores ordinary sessions and non-feedback states', () => {
    expect(shouldAutoContinue({ ...session, prompt: 'ordinary task' }, [agentQuestion])).toBe(false);
    expect(shouldAutoContinue({ ...session, state: 'IN_PROGRESS' }, [agentQuestion])).toBe(false);
  });

  it('rate-limits retries but retries a stuck feedback state', () => {
    const continued = {
      name: 'activities/continue',
      createTime: '2026-08-15T00:00:00.000Z',
      userMessaged: { userMessage: '【バックグラウンド自動継続】続行' },
    };
    expect(shouldAutoContinue(session, [continued], Date.parse('2026-08-15T00:03:59.000Z'))).toBe(false);
    expect(shouldAutoContinue(session, [continued], Date.parse('2026-08-15T00:04:00.000Z'))).toBe(true);
  });
});
