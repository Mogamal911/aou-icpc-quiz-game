import { ref, set, update, get, push, onValue, serverTimestamp } from 'firebase/database';
import { db } from '../firebase/firebase';
import { isFirebaseConfigured } from '../firebase/config';
import type { GameSession, Player, PlayerAnswer, GamePhase } from '../types/game';
import { QUESTIONS, MAX_POINTS_PER_QUESTION, SPEED_BONUS_MAX } from '../data/questions';
import { getQuestionBank } from './questionBankService';

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

export async function createGameSession(): Promise<string> {
  const joinCode = generateJoinCode();
  const questionsSnapshot = await getQuestionBank();
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

  fetch('/api/quiz/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, session, joinCode }),
  }).catch((err) => console.warn('Dev sync server unreachable:', err));

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
  const cleanNickname = nickname.trim();

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

    await withTimeout(set(playerRef, player), 4000, 'Failed to join game in Firebase');
    return playerId;
  }

  // Server-backed sync
  try {
    const res = await fetch('/api/quiz/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, nickname: cleanNickname }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.session) saveLocalSession(sessionId, data.session);
      return data.playerId;
    }
  } catch (err) {
    console.warn('Server join failed, falling back to local storage:', err);
  }

  // Local fallback
  const session = getLocalSession(sessionId);
  if (!session) throw new Error('Game session not found. Please verify the join code.');

  const playerId = 'player_' + Math.random().toString(36).substring(2, 9);
  const player: Player = {
    id: playerId,
    nickname: cleanNickname,
    joinedAt: Date.now(),
    score: 0,
    answers: {},
    isConnected: true,
  };

  if (!session.players) session.players = {};
  session.players[playerId] = player;
  saveLocalSession(sessionId, session);
  return playerId;
}

// ─── Admin Game Controls & Timer Management ───────────────────────────────────

/**
 * Configure the duration for upcoming questions without resetting the active running question.
 */
export async function setQuestionDuration(sessionId: string, duration: number): Promise<void> {
  const cleanDuration = Math.max(5, Math.min(300, Math.round(duration)));

  if (isFirebaseConfigured) {
    const updates: Record<string, unknown> = {
      nextQuestionDuration: cleanDuration,
    };
    // If session is still in lobby, also initialize the questionDuration
    const s = getLocalSession(sessionId);
    if (s?.phase === 'lobby') {
      updates.questionDuration = cleanDuration;
    }
    await withTimeout(
      update(ref(db, `sessions/${sessionId}`), updates),
      4000,
      'Failed to update duration in Firebase'
    );
    return;
  }

  try {
    const res = await fetch('/api/quiz/duration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, duration: cleanDuration }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.session) saveLocalSession(sessionId, data.session);
      return;
    }
  } catch (e) {
    console.warn('Server duration error:', e);
  }

  const session = getLocalSession(sessionId);
  if (!session) return;
  session.nextQuestionDuration = cleanDuration;
  if (session.phase === 'lobby') {
    session.questionDuration = cleanDuration;
  }
  saveLocalSession(sessionId, session);
}

export async function startGame(sessionId: string, duration?: number): Promise<void> {
  const s = getLocalSession(sessionId);
  const dur = duration ?? s?.nextQuestionDuration ?? s?.questionDuration ?? 20;

  if (isFirebaseConfigured) {
    await withTimeout(
      update(ref(db, `sessions/${sessionId}`), {
        phase: 'question' as GamePhase,
        currentQuestionIndex: 0,
        questionStartedAt: serverTimestamp(),
        questionRevealedAt: null,
        questionDuration: dur,
        nextQuestionDuration: dur,
      }),
      4000,
      'Failed to start game in Firebase'
    );
    return;
  }

  try {
    const res = await fetch('/api/quiz/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, duration: dur }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.session) saveLocalSession(sessionId, data.session);
      return;
    }
  } catch (e) {
    console.warn('Server start error:', e);
  }

  const session = getLocalSession(sessionId);
  if (!session) return;
  session.phase = 'question';
  session.currentQuestionIndex = 0;
  session.questionStartedAt = Date.now();
  session.questionRevealedAt = null;
  session.questionDuration = dur;
  session.nextQuestionDuration = dur;
  saveLocalSession(sessionId, session);
}

export async function revealAnswer(sessionId: string, session: GameSession): Promise<void> {
  const qList = session.questions && session.questions.length > 0 ? session.questions : QUESTIONS;
  const questionIndex = session.currentQuestionIndex;
  const question = qList[questionIndex];
  const questionStartedAt = session.questionStartedAt || Date.now();
  // Use admin-configured duration for speed bonus calculation
  const timeLimit = (session.questionDuration ?? question?.timeLimit ?? 20) * 1000;

  if (isFirebaseConfigured) {
    const sessionUpdates: Record<string, unknown> = {
      phase: 'revealing' as GamePhase,
      questionRevealedAt: serverTimestamp(),
    };

    const players = session.players || {};
    for (const [playerId, player] of Object.entries(players)) {
      const answer = player.answers?.[question.id];
      if (!answer) continue;

      const isCorrect = answer.answerIndex === question.correctIndex;
      let points = 0;

      if (isCorrect) {
        const elapsed = (answer.answeredAt || Date.now()) - questionStartedAt;
        const ratio = Math.max(0, Math.min(1, 1 - elapsed / timeLimit));
        const speedBonus = Math.round(SPEED_BONUS_MAX * ratio);
        points = MAX_POINTS_PER_QUESTION + speedBonus;
      }

      sessionUpdates[`players/${playerId}/answers/${question.id}/isCorrect`] = isCorrect;
      sessionUpdates[`players/${playerId}/answers/${question.id}/pointsEarned`] = points;
      sessionUpdates[`players/${playerId}/score`] = (player.score || 0) + points;
    }

    await withTimeout(
      update(ref(db, `sessions/${sessionId}`), sessionUpdates),
      4000,
      'Failed to reveal answer in Firebase'
    );
    return;
  }

  // Server-backed reveal
  try {
    const res = await fetch('/api/quiz/reveal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.session) saveLocalSession(sessionId, data.session);
      return;
    }
  } catch (e) {
    console.warn('Server reveal error:', e);
  }

  // Local fallback
  const s = getLocalSession(sessionId);
  if (!s) return;
  s.phase = 'revealing';
  s.questionRevealedAt = Date.now();

  const players = s.players || {};
  for (const player of Object.values(players)) {
    const answer = player.answers?.[question.id];
    if (!answer) continue;

    const isCorrect = answer.answerIndex === question.correctIndex;
    let points = 0;

    if (isCorrect) {
      const elapsed = (answer.answeredAt || Date.now()) - questionStartedAt;
      const ratio = Math.max(0, Math.min(1, 1 - elapsed / timeLimit));
      const speedBonus = Math.round(SPEED_BONUS_MAX * ratio);
      points = MAX_POINTS_PER_QUESTION + speedBonus;
    }

    player.answers[question.id].isCorrect = isCorrect;
    player.answers[question.id].pointsEarned = points;
    player.score = (player.score || 0) + points;
  }

  saveLocalSession(sessionId, s);
}

export async function advanceToLeaderboard(sessionId: string): Promise<void> {
  if (isFirebaseConfigured) {
    await withTimeout(
      update(ref(db, `sessions/${sessionId}`), {
        phase: 'leaderboard' as GamePhase,
      }),
      4000
    );
    return;
  }

  const s = getLocalSession(sessionId);
  if (!s) return;
  s.phase = 'leaderboard';
  saveLocalSession(sessionId, s);
}

export async function nextQuestion(
  sessionId: string,
  currentIndex: number,
  duration?: number
): Promise<void> {
  const nextIndex = currentIndex + 1;
  const s = getLocalSession(sessionId);
  const qList = s?.questions && s.questions.length > 0 ? s.questions : QUESTIONS;
  const dur = duration ?? s?.nextQuestionDuration ?? qList[nextIndex]?.timeLimit ?? 20;

  if (isFirebaseConfigured) {
    if (nextIndex >= qList.length) {
      await withTimeout(
        update(ref(db, `sessions/${sessionId}`), {
          phase: 'finished' as GamePhase,
          endedAt: Date.now(),
        }),
        4000
      );
    } else {
      await withTimeout(
        update(ref(db, `sessions/${sessionId}`), {
          phase: 'question' as GamePhase,
          currentQuestionIndex: nextIndex,
          questionStartedAt: serverTimestamp(),
          questionRevealedAt: null,
          questionDuration: dur,
        }),
        4000
      );
    }
    return;
  }

  // Server-backed next question
  try {
    const res = await fetch('/api/quiz/next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, currentIndex, duration: dur }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.session) saveLocalSession(sessionId, data.session);
      return;
    }
  } catch (e) {
    console.warn('Server next question error:', e);
  }

  if (!s) return;

  if (nextIndex >= qList.length) {
    s.phase = 'finished';
    s.endedAt = Date.now();
  } else {
    s.phase = 'question';
    s.currentQuestionIndex = nextIndex;
    s.questionStartedAt = Date.now();
    s.questionRevealedAt = null;
    s.questionDuration = dur;
  }

  saveLocalSession(sessionId, s);
}

export async function endGame(sessionId: string): Promise<void> {
  if (isFirebaseConfigured) {
    await withTimeout(
      update(ref(db, `sessions/${sessionId}`), {
        phase: 'finished' as GamePhase,
        endedAt: Date.now(),
      }),
      4000
    );
    return;
  }

  try {
    const res = await fetch('/api/quiz/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.session) saveLocalSession(sessionId, data.session);
      return;
    }
  } catch (e) {}

  const s = getLocalSession(sessionId);
  if (!s) return;
  s.phase = 'finished';
  s.endedAt = Date.now();
  saveLocalSession(sessionId, s);
}

// ─── Player Answer Submission ─────────────────────────────────────────────────

export async function submitAnswer(
  sessionId: string,
  playerId: string,
  questionId: string,
  answerIndex: number
): Promise<void> {
  const answerPayload: Omit<PlayerAnswer, 'isCorrect' | 'pointsEarned'> = {
    answerIndex,
    answeredAt: Date.now(),
  };

  if (isFirebaseConfigured) {
    const answerPath = `sessions/${sessionId}/players/${playerId}/answers/${questionId}`;
    await withTimeout(set(ref(db, answerPath), answerPayload), 3500, 'Failed to save answer');
    return;
  }

  // Server-backed answer submission
  try {
    const res = await withTimeout(
      fetch('/api/quiz/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, playerId, questionId, answerIndex }),
      }),
      3500,
      'Submission request timed out'
    );

    if (res.ok) {
      const data = await res.json();
      if (data.session) saveLocalSession(sessionId, data.session);
      return;
    }
  } catch (err: any) {
    console.warn('Server answer failed, attempting local fallback:', err);
  }

  // Local fallback
  const s = getLocalSession(sessionId);
  if (!s) throw new Error('Arena session not found. Please refresh or rejoin.');
  const p = s.players?.[playerId];
  if (!p) throw new Error('Player not found in active session.');

  if (!p.answers) p.answers = {};
  if (p.answers[questionId] !== undefined) return; // Already locked

  p.answers[questionId] = {
    answerIndex,
    answeredAt: Date.now(),
    isCorrect: false,
    pointsEarned: 0,
  };

  saveLocalSession(sessionId, s);
}

// ─── Real-time Listeners ──────────────────────────────────────────────────────

export function subscribeToSession(
  sessionId: string,
  callback: (session: GameSession | null) => void
): () => void {
  if (isFirebaseConfigured) {
    const sessionRef = ref(db, `sessions/${sessionId}`);
    return onValue(sessionRef, (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      const data = snap.val();
      callback({ id: sessionId, ...data } as GameSession);
    });
  }

  // 1. Initial cached state
  const cached = getLocalSession(sessionId);
  if (cached) callback(cached);

  // 2. Fetch latest session from dev server quietly
  fetch(`/api/quiz/session?id=${encodeURIComponent(sessionId)}`)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data?.session) {
        saveLocalSession(sessionId, data.session);
        callback(data.session);
      }
    })
    .catch(() => {});

  // 3. Connect to SSE Real-Time Stream for live updates
  let eventSource: EventSource | null = null;
  try {
    eventSource = new EventSource(`/api/quiz/events?sessionId=${encodeURIComponent(sessionId)}`);
    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'SESSION_UPDATE' && payload.session) {
          saveLocalSession(sessionId, payload.session);
          callback(payload.session);
        }
      } catch (err) {
        console.error('Failed to parse SSE payload:', err);
      }
    };
    eventSource.onerror = () => {};
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
