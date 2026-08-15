const BASE_URL = 'https://jules.googleapis.com/v1alpha';
const ONE_CLICK_MARKER = '【ワンボタン完結】';
const CONTINUE_MARKER = '【バックグラウンド自動継続】';
const RETRY_INTERVAL_MS = 4 * 60 * 1000;

interface JulesSession {
  name: string;
  title?: string;
  prompt?: string;
  state: string;
}

interface JulesActivity {
  name: string;
  createTime: string;
  userMessaged?: { userMessage?: string };
  agentMessaged?: { agentMessage?: string };
}

interface SessionPage {
  sessions?: JulesSession[];
  nextPageToken?: string;
}

interface ActivityPage {
  activities?: JulesActivity[];
  nextPageToken?: string;
}

const CONTINUE_MESSAGE = `${CONTINUE_MARKER}はい、この進捗で問題ありません。現在の方針を承認します。追加の質問や確認は不要です。安全側で判断して作業を続行し、点検結果の修正、自己チェック、コミット、PR作成まで一気に完了してください。完了前に確認待ちで停止しないでください。`;

function hasMarker(value: string | undefined, marker: string): boolean {
  return value?.includes(marker) ?? false;
}

export function isOneClickSession(session: JulesSession, activities: JulesActivity[]): boolean {
  return hasMarker(session.prompt, ONE_CLICK_MARKER)
    || hasMarker(session.title, ONE_CLICK_MARKER)
    || activities.some((activity) => hasMarker(activity.userMessaged?.userMessage, ONE_CLICK_MARKER));
}

export function shouldAutoContinue(
  session: JulesSession,
  activities: JulesActivity[],
  now = Date.now(),
): boolean {
  if (session.state !== 'AWAITING_USER_FEEDBACK' || !isOneClickSession(session, activities)) return false;
  const latest = [...activities].sort((a, b) => Date.parse(a.createTime) - Date.parse(b.createTime)).at(-1);
  if (!latest || !hasMarker(latest.userMessaged?.userMessage, CONTINUE_MARKER)) return true;
  const sentAt = Date.parse(latest.createTime);
  return Number.isNaN(sentAt) || now - sentAt >= RETRY_INTERVAL_MS;
}

async function apiFetch<T>(apiKey: string, endpoint: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      ...init.headers,
    },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Jules API ${response.status}: ${body.slice(0, 500)}`);
  return body ? JSON.parse(body) as T : {} as T;
}

async function listSessions(apiKey: string): Promise<JulesSession[]> {
  const sessions: JulesSession[] = [];
  let pageToken: string | undefined;
  do {
    const query = new URLSearchParams({ pageSize: '100' });
    if (pageToken) query.set('pageToken', pageToken);
    const page = await apiFetch<SessionPage>(apiKey, `/sessions?${query.toString()}`);
    sessions.push(...(page.sessions ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return sessions;
}

async function listActivities(apiKey: string, sessionName: string): Promise<JulesActivity[]> {
  const activities: JulesActivity[] = [];
  let pageToken: string | undefined;
  do {
    const query = new URLSearchParams({ pageSize: '100' });
    if (pageToken) query.set('pageToken', pageToken);
    const page = await apiFetch<ActivityPage>(apiKey, `/${sessionName}/activities?${query.toString()}`);
    activities.push(...(page.activities ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return activities;
}

export async function runAutoContinue(apiKey: string): Promise<number> {
  const sessions = await listSessions(apiKey);
  const waiting = sessions.filter((session) => session.state === 'AWAITING_USER_FEEDBACK');
  let continued = 0;

  for (const session of waiting) {
    const activities = await listActivities(apiKey, session.name);
    if (!shouldAutoContinue(session, activities)) continue;
    await apiFetch(apiKey, `/${session.name}:sendMessage`, {
      method: 'POST',
      body: JSON.stringify({ prompt: CONTINUE_MESSAGE }),
    });
    continued += 1;
    console.log(`Continued ${session.name}`);
  }

  console.log(`Checked ${sessions.length} sessions; continued ${continued}.`);
  return continued;
}

if (import.meta.main) {
  const apiKey = process.env.JULES_API_KEY?.trim();
  if (!apiKey) {
    console.warn('::warning::GitHub Actions secret JULES_API_KEY is not configured; background continuation is inactive.');
  } else {
    await runAutoContinue(apiKey);
  }
}
