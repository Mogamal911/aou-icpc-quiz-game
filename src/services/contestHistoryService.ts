import { equalTo, get, orderByChild, query, ref } from 'firebase/database';
import { db } from '../firebase/firebase';
import { isFirebaseConfigured } from '../firebase/config';
import type { GameSession } from '../types/game';
import { summarizeContest, type ContestSummary } from '../utils/contestHistory';

async function load<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Contest history did not respond. Check your connection and retry.')), 8000);
    })]);
  } finally { clearTimeout(timer); }
}

async function localHistory(id?: string) {
  const response = await load(fetch(`/api/quiz/history${id ? `?id=${encodeURIComponent(id)}` : ''}`));
  if (!response.ok) throw new Error('Could not load saved contests. Check your connection and server storage, then retry.');
  return response.json();
}

export async function getCompletedContests(): Promise<ContestSummary[]> {
  if (!isFirebaseConfigured) return (await localHistory()).contests;
  const snapshot = await load(get(query(ref(db, 'sessions'), orderByChild('phase'), equalTo('finished'))));
  return Object.entries(snapshot.val() || {}).map(([id, value]) => ({ ...(value as GameSession), id }))
    .filter((session) => session.phase === 'finished').map(summarizeContest).sort((a, b) => b.endedAt - a.endedAt);
}

export async function getCompletedContest(id: string): Promise<GameSession | null> {
  if (!isFirebaseConfigured) return (await localHistory(id)).session;
  const snapshot = await load(get(ref(db, `sessions/${id}`)));
  const session = snapshot.val() as GameSession | null;
  return session?.phase === 'finished' ? { ...session, id } : null;
}
