import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { QUESTIONS, MAX_POINTS_PER_QUESTION, SPEED_BONUS_MAX } from './src/data/questions';

export interface SyncPlayer {
  id: string;
  nickname: string;
  joinedAt: number;
  score: number;
  answers: Record<string, {
    answerIndex: number;
    answeredAt: number;
    isCorrect?: boolean;
    pointsEarned?: number;
  }>;
  isConnected: boolean;
}

export interface SyncSession {
  id: string;
  joinCode: string;
  phase: 'lobby' | 'question' | 'revealing' | 'leaderboard' | 'finished';
  currentQuestionIndex: number;
  questionStartedAt: number | null;
  questionRevealedAt: number | null;
  questionDuration?: number;        // locked duration for the current question
  nextQuestionDuration?: number;    // configured duration for the next question
  players: Record<string, SyncPlayer>;
  questions?: any[];               // snapshot of question bank for this session
  createdAt: number;
  endedAt?: number;
}

// In-memory real-time state for dev server (shared across all devices/incognito tabs)
const sessions = new Map<string, SyncSession>();
const joinCodes = new Map<string, string>();
const sseClients = new Map<string, Set<ServerResponse>>();
const autoRevealTimers = new Map<string, ReturnType<typeof setTimeout>>();
let sharedQuestionBank = [...QUESTIONS];

function broadcastSession(sessionId: string) {
  const session = sessions.get(sessionId) || null;
  const clients = sseClients.get(sessionId);
  if (!clients || clients.size === 0) return;

  const payload = `data: ${JSON.stringify({ type: 'SESSION_UPDATE', sessionId, session })}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}

function clearAutoRevealTimer(sessionId: string) {
  const t = autoRevealTimers.get(sessionId);
  if (t) {
    clearTimeout(t);
    autoRevealTimers.delete(sessionId);
  }
}

function scheduleAutoReveal(sessionId: string, durationSeconds: number) {
  clearAutoRevealTimer(sessionId);
  const timer = setTimeout(() => {
    const session = sessions.get(sessionId);
    if (session && session.phase === 'question') {
      performReveal(session);
      broadcastSession(sessionId);
    }
  }, durationSeconds * 1000);
  autoRevealTimers.set(sessionId, timer);
}

function performReveal(session: SyncSession) {
  clearAutoRevealTimer(session.id);
  const qIndex = session.currentQuestionIndex;
  const qList = session.questions && session.questions.length > 0 ? session.questions : sharedQuestionBank;
  const question = qList[qIndex];
  const questionStartedAt = session.questionStartedAt || Date.now();
  const timeLimit = (session.questionDuration ?? question?.timeLimit ?? 20) * 1000;

  session.phase = 'revealing';
  session.questionRevealedAt = Date.now();

  // Calculate scores reliably using the active question's duration
  if (question) {
    for (const player of Object.values(session.players || {})) {
      const ans = player.answers?.[question.id];
      if (!ans) continue;

      const isCorrect = ans.answerIndex === question.correctIndex;
      let points = 0;
      if (isCorrect) {
        const elapsed = (ans.answeredAt || Date.now()) - questionStartedAt;
        const ratio = Math.max(0, Math.min(1, 1 - elapsed / timeLimit));
        const speedBonus = Math.round(SPEED_BONUS_MAX * ratio);
        points = MAX_POINTS_PER_QUESTION + speedBonus;
      }

      ans.isCorrect = isCorrect;
      ans.pointsEarned = points;
      player.score = (player.score || 0) + points;
    }
  }
}

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function jsonResponse(res: ServerResponse, status: number, data: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.end(JSON.stringify(data));
}

export function quizSyncPlugin(): Plugin {
  return {
    name: 'vite-plugin-quiz-sync',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost');

        // CORS preflight
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.statusCode = 204;
          res.end();
          return;
        }

        // 1. SSE Real-time Subscription: /api/quiz/events?sessionId=...
        if (url.pathname === '/api/quiz/events') {
          const sessionId = url.searchParams.get('sessionId');
          if (!sessionId) {
            jsonResponse(res, 400, { error: 'sessionId required' });
            return;
          }

          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          });

          if (!sseClients.has(sessionId)) {
            sseClients.set(sessionId, new Set());
          }
          const clientSet = sseClients.get(sessionId)!;
          clientSet.add(res);

          // Send current state immediately
          const current = sessions.get(sessionId) || null;
          res.write(`data: ${JSON.stringify({ type: 'SESSION_UPDATE', sessionId, session: current })}\n\n`);

          // Heartbeat interval
          const keepAlive = setInterval(() => {
            try {
              res.write(': keepalive\n\n');
            } catch {
              clearInterval(keepAlive);
            }
          }, 15000);

          req.on('close', () => {
            clearInterval(keepAlive);
            clientSet.delete(res);
            if (clientSet.size === 0) sseClients.delete(sessionId);
          });
          return;
        }

        // 2. Question Bank Endpoints: /api/quiz/questions
        if (url.pathname === '/api/quiz/questions' && req.method === 'GET') {
          jsonResponse(res, 200, { questions: sharedQuestionBank });
          return;
        }

        if (url.pathname === '/api/quiz/questions' && req.method === 'POST') {
          const body = await parseBody(req);
          if (Array.isArray(body.questions)) {
            sharedQuestionBank = body.questions;
            jsonResponse(res, 200, { ok: true, questions: sharedQuestionBank });
            return;
          }
          jsonResponse(res, 400, { error: 'questions must be an array' });
          return;
        }

        // 3. Lookup session by join code: /api/quiz/code?code=...
        if (url.pathname === '/api/quiz/code' && req.method === 'GET') {
          const code = (url.searchParams.get('code') || '').trim().toUpperCase();
          const sessionId = joinCodes.get(code) || null;
          jsonResponse(res, 200, { sessionId });
          return;
        }

        // 4. Get single session: /api/quiz/session?id=...
        if (url.pathname === '/api/quiz/session' && req.method === 'GET') {
          const id = url.searchParams.get('id');
          if (!id) {
            jsonResponse(res, 400, { error: 'id required' });
            return;
          }
          const session = sessions.get(id) || null;
          jsonResponse(res, 200, { session });
          return;
        }

        // 5. Create or save full session: POST /api/quiz/session
        if (url.pathname === '/api/quiz/session' && req.method === 'POST') {
          const body = await parseBody(req);
          const { sessionId, session, joinCode } = body;
          if (!sessionId || !session) {
            jsonResponse(res, 400, { error: 'Invalid session payload' });
            return;
          }

          // Ensure session takes a stable snapshot of questions
          if (!session.questions || session.questions.length === 0) {
            session.questions = sharedQuestionBank;
          }

          sessions.set(sessionId, session);
          if (joinCode) {
            joinCodes.set(joinCode.toUpperCase(), sessionId);
          }
          broadcastSession(sessionId);
          jsonResponse(res, 200, { ok: true, session });
          return;
        }

        // 6. Update configured duration for next question: POST /api/quiz/duration
        if (url.pathname === '/api/quiz/duration' && req.method === 'POST') {
          const { sessionId, duration } = await parseBody(req);
          const session = sessions.get(sessionId);
          if (!session) {
            jsonResponse(res, 404, { error: 'Session not found' });
            return;
          }

          const dur = Math.max(5, Math.min(300, Number(duration) || 20));
          session.nextQuestionDuration = dur;

          if (session.phase === 'lobby') {
            session.questionDuration = dur;
          }

          broadcastSession(sessionId);
          jsonResponse(res, 200, { ok: true, session });
          return;
        }

        // 7. Join session as player: POST /api/quiz/join
        if (url.pathname === '/api/quiz/join' && req.method === 'POST') {
          const { sessionId, nickname } = await parseBody(req);
          const session = sessions.get(sessionId);
          if (!session) {
            jsonResponse(res, 404, { error: 'Session not found' });
            return;
          }

          const playerId = 'player_' + Math.random().toString(36).substring(2, 9);
          const player: SyncPlayer = {
            id: playerId,
            nickname: (nickname || 'Gladiator').trim(),
            joinedAt: Date.now(),
            score: 0,
            answers: {},
            isConnected: true,
          };

          if (!session.players) session.players = {};
          session.players[playerId] = player;

          broadcastSession(sessionId);
          jsonResponse(res, 200, { ok: true, playerId, session });
          return;
        }

        // 8. Submit Answer: POST /api/quiz/answer
        if (url.pathname === '/api/quiz/answer' && req.method === 'POST') {
          const { sessionId, playerId, questionId, answerIndex } = await parseBody(req);
          const session = sessions.get(sessionId);
          if (!session) {
            jsonResponse(res, 404, { error: 'Session not found' });
            return;
          }

          // Enforce deadline check
          if (session.phase !== 'question') {
            jsonResponse(res, 400, { error: 'Question is no longer accepting answers' });
            return;
          }

          const durationMs = (session.questionDuration ?? 20) * 1000;
          if (session.questionStartedAt && Date.now() - session.questionStartedAt > durationMs + 1500) {
            jsonResponse(res, 400, { error: 'Trial deadline has expired' });
            return;
          }

          const player = session.players?.[playerId];
          if (!player) {
            jsonResponse(res, 404, { error: 'Player not found in session' });
            return;
          }

          if (!player.answers) player.answers = {};

          // Idempotency: first write wins
          if (player.answers[questionId] !== undefined) {
            jsonResponse(res, 200, { ok: true, alreadyAnswered: true, answer: player.answers[questionId] });
            return;
          }

          player.answers[questionId] = {
            answerIndex,
            answeredAt: Date.now(),
            isCorrect: false,
            pointsEarned: 0,
          };

          broadcastSession(sessionId);
          jsonResponse(res, 200, { ok: true, answer: player.answers[questionId] });
          return;
        }

        // 9. Start Game: POST /api/quiz/start
        if (url.pathname === '/api/quiz/start' && req.method === 'POST') {
          const { sessionId, duration } = await parseBody(req);
          const session = sessions.get(sessionId);
          if (!session) {
            jsonResponse(res, 404, { error: 'Session not found' });
            return;
          }

          if (!session.questions || session.questions.length === 0) {
            session.questions = sharedQuestionBank;
          }

          const firstQ = session.questions[0];
          const dur = duration ?? session.nextQuestionDuration ?? session.questionDuration ?? firstQ?.timeLimit ?? 20;

          session.phase = 'question';
          session.currentQuestionIndex = 0;
          session.questionStartedAt = Date.now();
          session.questionRevealedAt = null;
          session.questionDuration = dur;
          session.nextQuestionDuration = dur;

          scheduleAutoReveal(sessionId, dur);

          broadcastSession(sessionId);
          jsonResponse(res, 200, { ok: true, session });
          return;
        }

        // 10. Reveal Answer & Score: POST /api/quiz/reveal
        if (url.pathname === '/api/quiz/reveal' && req.method === 'POST') {
          const { sessionId } = await parseBody(req);
          const session = sessions.get(sessionId);
          if (!session) {
            jsonResponse(res, 404, { error: 'Session not found' });
            return;
          }

          performReveal(session);

          broadcastSession(sessionId);
          jsonResponse(res, 200, { ok: true, session });
          return;
        }

        // 11. Next Question: POST /api/quiz/next
        if (url.pathname === '/api/quiz/next' && req.method === 'POST') {
          const { sessionId, currentIndex, duration } = await parseBody(req);
          const session = sessions.get(sessionId);
          if (!session) {
            jsonResponse(res, 404, { error: 'Session not found' });
            return;
          }

          clearAutoRevealTimer(sessionId);
          const qList = session.questions && session.questions.length > 0 ? session.questions : sharedQuestionBank;
          const nextIndex = (typeof currentIndex === 'number' ? currentIndex : session.currentQuestionIndex) + 1;

          if (nextIndex >= qList.length) {
            session.phase = 'finished';
            session.endedAt = Date.now();
          } else {
            const nextQ = qList[nextIndex];
            const dur = duration ?? session.nextQuestionDuration ?? nextQ?.timeLimit ?? 20;
            session.phase = 'question';
            session.currentQuestionIndex = nextIndex;
            session.questionStartedAt = Date.now();
            session.questionRevealedAt = null;
            session.questionDuration = dur;
            scheduleAutoReveal(sessionId, dur);
          }

          broadcastSession(sessionId);
          jsonResponse(res, 200, { ok: true, session });
          return;
        }

        // 12. End Game: POST /api/quiz/end
        if (url.pathname === '/api/quiz/end' && req.method === 'POST') {
          const { sessionId } = await parseBody(req);
          const session = sessions.get(sessionId);
          if (!session) {
            jsonResponse(res, 404, { error: 'Session not found' });
            return;
          }

          clearAutoRevealTimer(sessionId);
          session.phase = 'finished';
          session.endedAt = Date.now();

          broadcastSession(sessionId);
          jsonResponse(res, 200, { ok: true, session });
          return;
        }

        next();
      });
    },
  };
}
