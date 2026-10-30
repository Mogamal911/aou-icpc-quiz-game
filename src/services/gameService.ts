import { ref, set, get, push, onValue, serverTimestamp, runTransaction } from 'firebase/database';
import { db } from '../firebase/firebase';
import { isFirebaseConfigured } from '../firebase/config';
import type { GameSession, Player, PlayerAnswer, Question } from '../types/game';
import { addContestPlayer, normalizeNickname, renameContestPlayer, removeContestPlayer } from '../utils/playerManagement';
import { ANSWER_GRACE_MS, revealQuestion } from '../utils/scoring';
import { finishContest } from '../utils/contestHistory';
import { getServerTime, observeServerClock } from './clockService';
import { getQuestionBank, normalizeQuestion, validateQuestion } from './questionBankService';

// ─── Local Storage & Broadcast Channel Backup ─────────────────────────────────
let localBus: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    localBus = new BroadcastChannel('aou_quiz_realtime_bus');
  } catch (e) {
    console.warn('BroadcastChannel not available');
  }
}

function broadcastLocal(sessionId: string, session: GameSession | null) {
  if (localBus) {
    try {
      localBus.postMessage({ type: 'SESSION_UPDATE', sessionId, session });
    } catch {}
  }
}

function getLocalSession(sessionId: string): GameSession | null {
  try {
    const raw = localStorage.getItem(`aou_session_${sessionId}`);
    return raw ? (JSON.parse(raw) as GameSession) : null;
  } catch {
    return null;
  }
}

function saveLocalSession(sessionId: string, session: GameSession) {
  try {
    localStorage.setItem(`aou_session_${sessionId}`, JSON.stringify(session));
    broadcastLocal(sessionId, session);
  } catch {}
}

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Low-overhead timeout helper
function withTimeout<T>(promise: Promise<T>, ms = 4000, errorMsg = 'Operation timed out'): Promise<T> {
  let timer: any;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// ─── Game Session Management ──────────────────────────────────────────────────

export async function getActiveSessionId(): Promise<string | null> {
  if (isFirebaseConfigured) {
    try {
      const snap = await withTimeout(get(ref(db, 'activeSessionId')), 3000);
      if (snap.exists()) {
        const id = snap.val() as string;
        if (id) return id;
      }
    } catch (e) {
      console.warn('Error reading activeSessionId from Firebase:', e);
    }
  }
  return localStorage.getItem('aou_active_session_id') || null;
}

export async function createGameSession(selectedQuestions?: Question[]): Promise<string> {
  const joinCode = generateJoinCode();
  const chosen = selectedQuestions ?? await getQuestionBank();
  if (!chosen.length) throw new Error('Choose at least one question before creating a contest.');
  for (const question of chosen) {
    const result = validateQuestion(question);
    if (!result.isValid) throw new Error(result.errors.join(' '));
  }
  const questionsSnapshot = chosen.map((question, index) => normalizeQuestion(question, index));
  const initialDuration = questionsSnapshot[0]?.timeLimit || 20;

  if (isFirebaseConfigured) {
    const sessionRef = push(ref(db, 'sessions'));
    const sessionId = sessionRef.key!;

    const session: Omit<GameSession, 'id'> = {
      phase: 'lobby',
      currentQuestionIndex: 0,
      questionStartedAt: null,
      questionRevealedAt: null,
      questionDuration: initialDuration,
      nextQuestionDuration: initialDuration,
      players: {},
      questions: questionsSnapshot,
      createdAt: Date.now(),
      joinCode,
    };

    // Parallel atomic write for session, join code, and active session pointer
    await withTimeout(
      Promise.all([
        set(sessionRef, session),
        set(ref(db, `joinCodes/${joinCode}`), sessionId),
        set(ref(db, 'activeSessionId'), sessionId),
      ]),
      5000,
      'Failed to create session in Firebase'
    );
    localStorage.setItem('aou_active_session_id', sessionId);
    saveLocalSession(sessionId, { id: sessionId, ...session });
    return sessionId;
  }

  // Server-backed dev mode (cross-device & incognito sync)
  const sessionId = 'session_' + Math.random().toString(36).substring(2, 9);
  const session: GameSession = {
    id: sessionId,
    phase: 'lobby',
    currentQuestionIndex: 0,
    questionStartedAt: null,
    questionRevealedAt: null,
    questionDuration: initialDuration,
    nextQuestionDuration: initialDuration,
    players: {},
    questions: questionsSnapshot,
    createdAt: Date.now(),
    joinCode,
  };

  const response = await withTimeout(fetch('/api/quiz/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, session, joinCode }),
  }), 5000, 'Could not create the lobby. Check the local server and try again.');
  if (!response.ok) throw new Error('Could not create the lobby. Please try again.');

  localStorage.setItem('aou_active_session_id', sessionId);
  localStorage.setItem(`aou_joincode_${joinCode}`, sessionId);
  saveLocalSession(sessionId, session);
  return sessionId;
}

export async function resolveSessionByCode(code: string): Promise<string | null> {
  const cleanCode = code.trim().toUpperCase();

  if (isFirebaseConfigured) {
    try {
      const snap = await withTimeout(get(ref(db, `joinCodes/${cleanCode}`)), 4000);
      if (!snap.exists()) return null;
      return snap.val() as string;
    } catch (err) {
      console.error('Firebase lookup failed:', err);
      return null;
    }
  }

  // Check server endpoint first for multi-device support
  try {
    const res = await fetch(`/api/quiz/code?code=${encodeURIComponent(cleanCode)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.sessionId) return data.sessionId;
    }
  } catch (err) {
    console.warn('Server lookup error:', err);
  }

  return localStorage.getItem(`aou_joincode_${cleanCode}`) || null;
}

export async function joinSession(
  sessionId: string,
  nickname: string
): Promise<string> {
  const cleanNickname = normalizeNickname(nickname);

  if (isFirebaseConfigured) {
    const playerRef = push(ref(db, `sessions/${sessionId}/players`));
    const playerId = playerRef.key!;

    const player: Omit<Player, 'id'> = {
      nickname: cleanNickname,
      joinedAt: Date.now(),
      score: 0,
      answers: {},
      isConnected: true,
    };

    await changeFirebaseSession(sessionId, (session) => addContestPlayer(session, { ...player, id: playerId }));
    return playerId;
  }

  const response = await withTimeout(fetch('/api/quiz/join', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, nickname: cleanNickname }),
  }), 5000, 'Could not join. Check your connection and try again.');
  const data = await response.json();
  if (!response.ok || !data.playerId) throw new Error(data.error || 'Could not join this contest.');
  if (data.session) saveLocalSession(sessionId, data.session);
  return data.playerId;
}

// ─── Admin Game Controls & Timer Management ───────────────────────────────────

/**
 * Configure the duration for upcoming questions without resetting the active running question.
 */
async function postAdminAction(action: string, sessionId: string, fields: Record<string, unknown> = {}): Promise<void> {
  const response = await withTimeout(fetch(`/api/quiz/${action}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, ...fields }),
  }), 5000, 'The server did not respond. Check your connection before trying again.');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The contest could not be updated.');
  if (data.session) saveLocalSession(sessionId, data.session);
}

async function changeFirebaseSession(sessionId: string, change: (session: GameSession) => GameSession): Promise<GameSession> {
  // Do not race a timeout against this write: a queued transaction can still commit.
  // Returning null on the first uncached invocation lets Firebase retry with remote data.
  const result = await runTransaction(ref(db, `sessions/${sessionId}`), (current) => current === null ? null : change(current as GameSession), { applyLocally: false });
  if (!result.snapshot.exists()) throw new Error('This contest no longer exists. Ask the host for a new code.');
  return { ...result.snapshot.val(), id: sessionId } as GameSession;
}

function cleanTime(duration: number) {
  if (!Number.isFinite(duration)) throw new Error('Choose a valid question time.');
  return Math.max(5, Math.min(300, Math.round(duration)));
}

export async function renamePlayer(sessionId: string, playerId: string, nickname: string): Promise<void> {
  const name = normalizeNickname(nickname);
  if (isFirebaseConfigured) {
    await changeFirebaseSession(sessionId, (session) => renameContestPlayer(session, playerId, name));
    return;
  }
  await postAdminAction('rename-player', sessionId, { playerId, nickname: name });
}

export async function removePlayer(sessionId: string, playerId: string): Promise<void> {
  if (isFirebaseConfigured) {
    await changeFirebaseSession(sessionId, (session) => removeContestPlayer(session, playerId));
    return;
  }
  await postAdminAction('remove-player', sessionId, { playerId });
}

export async function setQuestionDuration(sessionId: string, duration: number): Promise<void> {
  const time = cleanTime(duration);
  if (isFirebaseConfigured) {
    await changeFirebaseSession(sessionId, (session) => {
      if (session.phase === 'finished') throw new Error('This contest has finished. Its results are saved.');
      return { ...session, nextQuestionDuration: time, ...(session.phase === 'lobby' ? { questionDuration: time } : {}) };
    });
    return;
  }
  await postAdminAction('duration', sessionId, { duration: time });
}

export async function startGame(sessionId: string, duration?: number): Promise<void> {
  if (isFirebaseConfigured) {
    await changeFirebaseSession(sessionId, (session) => {
      if (session.phase !== 'lobby') throw new Error('This contest has already started.');
      const questions = session.questions || [];
      if (!questions.length) throw new Error('This contest has no questions.');
      const time = cleanTime(duration ?? session.nextQuestionDuration ?? questions[0].timeLimit);
      return { ...session, phase: 'question', currentQuestionIndex: 0,
        questionStartedAt: serverTimestamp() as unknown as number, questionRevealedAt: null,
        questionDuration: time, nextQuestionDuration: questions[1]?.timeLimit ?? time };
    });
    return;
  }
  await postAdminAction('start', sessionId, duration === undefined ? {} : { duration: cleanTime(duration) });
}

export async function revealAnswer(sessionId: string, session: GameSession): Promise<void> {
  if (isFirebaseConfigured) {
    await changeFirebaseSession(sessionId, (current) => revealQuestion(current, session.currentQuestionIndex, getServerTime()));
    return;
  }
  await postAdminAction('reveal', sessionId, { currentIndex: session.currentQuestionIndex });
}

export async function nextQuestion(sessionId: string, currentIndex: number, duration?: number): Promise<void> {
  if (isFirebaseConfigured) {
    await changeFirebaseSession(sessionId, (session) => {
      if (session.currentQuestionIndex !== currentIndex || !['revealing', 'leaderboard'].includes(session.phase)) throw new Error('The question has changed. Refresh the host controls.');
      const questions = session.questions || [];
      const nextIndex = currentIndex + 1;
      if (nextIndex >= questions.length) return finishContest(session, getServerTime());
      const time = cleanTime(duration ?? session.nextQuestionDuration ?? questions[nextIndex].timeLimit);
      return { ...session, phase: 'question', currentQuestionIndex: nextIndex,
        questionStartedAt: serverTimestamp() as unknown as number, questionRevealedAt: null,
        questionDuration: time, nextQuestionDuration: questions[nextIndex + 1]?.timeLimit ?? time };
    });
    return;
  }
  await postAdminAction('next', sessionId, { currentIndex, ...(duration === undefined ? {} : { duration: cleanTime(duration) }) });
}

export async function endGame(sessionId: string): Promise<void> {
  if (isFirebaseConfigured) {
    await changeFirebaseSession(sessionId, (session) => finishContest(session, getServerTime()));
    return;
  }
  await postAdminAction('end', sessionId);
}

export async function submitAnswer(sessionId: string, playerId: string, questionId: string, answerIndex: number): Promise<PlayerAnswer> {
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) throw new Error('Choose one of the four answers.');
  if (isFirebaseConfigured) {
    observeServerClock();
    const result = await changeFirebaseSession(sessionId, (session) => {
      const player = session.players?.[playerId];
      if (!player) throw new Error('Your player is no longer in this contest. Please rejoin.');
      if (player.answers?.[questionId]) return session; // An acknowledged retry never replaces the first answer.
      const question = session.questions?.[session.currentQuestionIndex];
      if (session.phase !== 'question' || question?.id !== questionId || session.questionStartedAt === null) throw new Error('This question is no longer accepting answers.');
      const deadline = session.questionStartedAt + (session.questionDuration ?? question.timeLimit) * 1000 + ANSWER_GRACE_MS;
      if (getServerTime() > deadline) throw new Error('Your answer arrived after time ran out.');
      return { ...session, players: { ...session.players, [playerId]: { ...player, answers: { ...player.answers,
        [questionId]: { answerIndex, answeredAt: serverTimestamp() as unknown as number },
      } } } };
    });
    return result.players[playerId].answers[questionId];
  }

  const response = await withTimeout(fetch('/api/quiz/answer', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, playerId, questionId, answerIndex }),
  }), 5000, 'Answer not confirmed. Check your connection before trying again.');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Your answer was not accepted. Try again while there is time.');
  if (!data.answer) throw new Error('Answer not confirmed. Please try again.');
  return data.answer as PlayerAnswer;
}

// ─── Real-time Listeners ──────────────────────────────────────────────────────

export function subscribeToSession(
  sessionId: string,
  callback: (session: GameSession | null) => void,
  onConnection?: (connected: boolean) => void
): () => void {
  if (isFirebaseConfigured) {
    const sessionRef = ref(db, `sessions/${sessionId}`);
    const stopConnection = onValue(ref(db, '.info/connected'), (snap) => onConnection?.(snap.val() === true));
    const stopSession = onValue(sessionRef, (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      const data = snap.val();
      callback({ id: sessionId, ...data } as GameSession);
    }, () => onConnection?.(false));
    return () => { stopSession(); stopConnection(); };
  }

  // 1. Initial cached state
  const cached = getLocalSession(sessionId);
  if (cached) callback(cached);

  // 2. Fetch latest session from dev server quietly
  fetch(`/api/quiz/session?id=${encodeURIComponent(sessionId)}`)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data && 'session' in data) {
        if (data.session) saveLocalSession(sessionId, data.session);
        callback(data.session);
      }
    })
    .catch(() => {});

  // 3. Connect to SSE Real-Time Stream for live updates
  let eventSource: EventSource | null = null;
  try {
    eventSource = new EventSource(`/api/quiz/events?sessionId=${encodeURIComponent(sessionId)}`);
    eventSource.onopen = () => onConnection?.(true);
    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'SESSION_UPDATE') {
          if (payload.session) saveLocalSession(sessionId, payload.session);
          callback(payload.session);
        }
      } catch (err) {
        console.error('Failed to parse SSE payload:', err);
      }
    };
    eventSource.onerror = () => onConnection?.(false);
  } catch (err) {
    console.warn('EventSource connection failed:', err);
  }

  // 4. Local Broadcast & Storage events
  const handleMessage = (e: MessageEvent) => {
    if (e.data?.type === 'SESSION_UPDATE' && e.data?.sessionId === sessionId) {
      callback(e.data.session);
    }
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === `aou_session_${sessionId}`) {
      callback(getLocalSession(sessionId));
    }
  };

  if (localBus) localBus.addEventListener('message', handleMessage);
  window.addEventListener('storage', handleStorage);

  return () => {
    if (eventSource) eventSource.close();
    if (localBus) localBus.removeEventListener('message', handleMessage);
    window.removeEventListener('storage', handleStorage);
  };
}
