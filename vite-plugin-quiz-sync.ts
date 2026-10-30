import { resolve } from 'node:path';
import { ContestArchive } from './server/contestArchive';
import { finishContest, summarizeContest } from './src/utils/contestHistory';
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { addContestPlayer, normalizeNickname, renameContestPlayer, removeContestPlayer } from './src/utils/playerManagement';
import { QUESTIONS } from './src/data/questions';
import { ANSWER_GRACE_MS, revealQuestion } from './src/utils/scoring';
import type { GameSession, Player } from './src/types/game';

export type SyncPlayer = Player;
export type SyncSession = GameSession;

export function quizSyncPlugin({ dataDirectory = process.env.AOU_QUIZ_DATA_DIR || resolve(process.cwd(), '.quiz-data/contests') }: { dataDirectory?: string } = {}): Plugin {
  const archive = new ContestArchive(dataDirectory);
  // Live state is shared across devices; completed contests are stored on disk.
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
    const expectedIndex = sessions.get(sessionId)?.currentQuestionIndex;
    const timer = setTimeout(() => {
      const session = sessions.get(sessionId);
      if (session && session.phase === 'question' && session.currentQuestionIndex === expectedIndex) {
        performReveal(session);
        broadcastSession(sessionId);
      }
    }, durationSeconds * 1000 + ANSWER_GRACE_MS);
    autoRevealTimers.set(sessionId, timer);
  }

  function performReveal(session: SyncSession, expectedIndex = session.currentQuestionIndex) {
    const revealed = revealQuestion(session, expectedIndex, Date.now());
    clearAutoRevealTimer(session.id);
    Object.assign(session, revealed);
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

  return {
    name: 'vite-plugin-quiz-sync',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost');
        try {

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

            const current = sessions.get(sessionId) || archive.get(sessionId);
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

          if (url.pathname === '/api/quiz/time' && req.method === 'GET') {
            jsonResponse(res, 200, { now: Date.now() });
            return;
          }

          if (url.pathname === '/api/quiz/history' && req.method === 'GET') {
            const id = url.searchParams.get('id');
            if (id) jsonResponse(res, 200, { session: archive.get(id) });
            else jsonResponse(res, 200, { contests: archive.list().map(summarizeContest).sort((a, b) => b.endedAt - a.endedAt) });
            return;
          }

          // 3. Lookup session by join code: /api/quiz/code?code=...
          if (url.pathname === '/api/quiz/code' && req.method === 'GET') {
            const code = (url.searchParams.get('code') || '').trim().toUpperCase();
            const sessionId = joinCodes.get(code) || archive.list().find((session) => session.joinCode === code)?.id || null;
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
            const session = sessions.get(id) || archive.get(id);
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

            if (typeof sessionId !== 'string' || session.phase !== 'lobby' || sessions.has(sessionId) || archive.get(sessionId)) {
              jsonResponse(res, 409, { error: 'Create a new lobby with a new contest ID.' }); return;
            }
            session.id = sessionId;
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
            const session = sessions.get(sessionId) || archive.get(sessionId);
            if (!session) {
              jsonResponse(res, 404, { error: 'Session not found' });
              return;
            }

            if (session.phase === 'finished') { jsonResponse(res, 409, { error: 'This contest has finished. Its results are saved.' }); return; }
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
            const session = sessions.get(sessionId) || archive.get(sessionId);
            if (!session) {
              jsonResponse(res, 404, { error: 'Session not found' });
              return;
            }

            let cleanName: string;
            try { cleanName = normalizeNickname(nickname); }
            catch (error) { jsonResponse(res, 400, { error: (error as Error).message }); return; }
            const playerId = 'player_' + Math.random().toString(36).substring(2, 9);
            const player: SyncPlayer = {
              id: playerId,
              nickname: cleanName,
              joinedAt: Date.now(),
              score: 0,
              answers: {},
              isConnected: true,
            };

            try { Object.assign(session, addContestPlayer(session, player)); }
            catch (error) { jsonResponse(res, 409, { error: (error as Error).message }); return; }

            broadcastSession(sessionId);
            jsonResponse(res, 200, { ok: true, playerId, session });
            return;
          }

          if (['/api/quiz/rename-player', '/api/quiz/remove-player'].includes(url.pathname) && req.method === 'POST') {
            const { sessionId, playerId, nickname } = await parseBody(req);
            const session = sessions.get(sessionId) || archive.get(sessionId);
            if (!session) { jsonResponse(res, 404, { error: 'Session not found' }); return; }
            if (typeof playerId !== 'string' || !playerId) { jsonResponse(res, 400, { error: 'Choose a player.' }); return; }
            try {
              Object.assign(session, url.pathname === '/api/quiz/rename-player'
                ? renameContestPlayer(session, playerId, nickname)
                : removeContestPlayer(session, playerId));
              broadcastSession(sessionId);
              jsonResponse(res, 200, { ok: true, session });
            } catch (error) { jsonResponse(res, 409, { error: (error as Error).message }); }
            return;
          }

          // 8. Submit Answer: POST /api/quiz/answer
          if (url.pathname === '/api/quiz/answer' && req.method === 'POST') {
            const { sessionId, playerId, questionId, answerIndex } = await parseBody(req);
            const session = sessions.get(sessionId) || archive.get(sessionId);
            if (!session) {
              jsonResponse(res, 404, { error: 'Session not found' });
              return;
            }

            const player = session.players?.[playerId];
            const question = session.questions?.[session.currentQuestionIndex];
            if (!player) { jsonResponse(res, 404, { error: 'Player not found. Please rejoin.' }); return; }
            if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) {
              jsonResponse(res, 400, { error: 'Choose one of the four answers.' }); return;
            }
            // Retrying an acknowledged answer always returns the first choice.
            if (player.answers?.[questionId]) {
              jsonResponse(res, 200, { ok: true, alreadyAnswered: true, answer: player.answers[questionId] }); return;
            }
            if (session.phase !== 'question' || question?.id !== questionId || session.questionStartedAt === null) {
              jsonResponse(res, 400, { error: 'This question is no longer accepting answers.' }); return;
            }
            const receivedAt = Date.now();
            if (receivedAt > session.questionStartedAt + (session.questionDuration ?? question.timeLimit) * 1000 + ANSWER_GRACE_MS) {
              jsonResponse(res, 400, { error: 'Your answer arrived after time ran out.' }); return;
            }
            if (!player.answers) player.answers = {};
            player.answers[questionId] = { answerIndex, answeredAt: receivedAt };

            broadcastSession(sessionId);
            jsonResponse(res, 200, { ok: true, answer: player.answers[questionId] });
            return;
          }

          // 9. Start Game: POST /api/quiz/start
          if (url.pathname === '/api/quiz/start' && req.method === 'POST') {
            const { sessionId, duration } = await parseBody(req);
            const session = sessions.get(sessionId) || archive.get(sessionId);
            if (!session) {
              jsonResponse(res, 404, { error: 'Session not found' });
              return;
            }

            if (session.phase !== 'lobby') {
              jsonResponse(res, 409, { error: 'This contest has already started.' }); return;
            }
            if (!session.questions || session.questions.length === 0) {
              session.questions = sharedQuestionBank;
            }

            const firstQ = session.questions[0];
            const dur = Math.max(5, Math.min(300, Math.round(Number(duration ?? session.nextQuestionDuration ?? firstQ?.timeLimit) || 20)));

            session.phase = 'question';
            session.currentQuestionIndex = 0;
            session.questionStartedAt = Date.now();
            session.questionRevealedAt = null;
            session.questionDuration = dur;
            session.nextQuestionDuration = session.questions[1]?.timeLimit ?? dur;

            scheduleAutoReveal(sessionId, dur);

            broadcastSession(sessionId);
            jsonResponse(res, 200, { ok: true, session });
            return;
          }

          // 10. Reveal Answer & Score: POST /api/quiz/reveal
          if (url.pathname === '/api/quiz/reveal' && req.method === 'POST') {
            const { sessionId, currentIndex } = await parseBody(req);
            const session = sessions.get(sessionId) || archive.get(sessionId);
            if (!session) {
              jsonResponse(res, 404, { error: 'Session not found' });
              return;
            }

            if (!Number.isInteger(currentIndex) || currentIndex !== session.currentQuestionIndex || !['question', 'revealing'].includes(session.phase)) {
              jsonResponse(res, 409, { error: 'The question has changed. Refresh the host controls.' }); return;
            }
            performReveal(session, currentIndex);

            broadcastSession(sessionId);
            jsonResponse(res, 200, { ok: true, session });
            return;
          }

          // 11. Next Question: POST /api/quiz/next
          if (url.pathname === '/api/quiz/next' && req.method === 'POST') {
            const { sessionId, currentIndex, duration } = await parseBody(req);
            const session = sessions.get(sessionId) || archive.get(sessionId);
            if (!session) {
              jsonResponse(res, 404, { error: 'Session not found' });
              return;
            }

            if (!Number.isInteger(currentIndex) || currentIndex !== session.currentQuestionIndex || !['revealing', 'leaderboard'].includes(session.phase)) {
              jsonResponse(res, 409, { error: 'The question has changed. Refresh the host controls.' }); return;
            }
            clearAutoRevealTimer(sessionId);
            const qList = session.questions && session.questions.length > 0 ? session.questions : sharedQuestionBank;
            const nextIndex = (typeof currentIndex === 'number' ? currentIndex : session.currentQuestionIndex) + 1;

            if (nextIndex >= qList.length) {
              const finished = finishContest(session, Date.now());
              archive.save(finished);
              Object.assign(session, finished);
            } else {
              const nextQ = qList[nextIndex];
              const dur = Math.max(5, Math.min(300, Math.round(Number(duration ?? session.nextQuestionDuration ?? nextQ?.timeLimit) || 20)));
              session.phase = 'question';
              session.currentQuestionIndex = nextIndex;
              session.questionStartedAt = Date.now();
              session.questionRevealedAt = null;
              session.questionDuration = dur;
              session.nextQuestionDuration = qList[nextIndex + 1]?.timeLimit ?? dur;
              scheduleAutoReveal(sessionId, dur);
            }

            broadcastSession(sessionId);
            jsonResponse(res, 200, { ok: true, session });
            return;
          }

          // 12. End Game: POST /api/quiz/end
          if (url.pathname === '/api/quiz/end' && req.method === 'POST') {
            const { sessionId } = await parseBody(req);
            const session = sessions.get(sessionId) || archive.get(sessionId);
            if (!session) {
              jsonResponse(res, 404, { error: 'Session not found' });
              return;
            }

            const finished = finishContest(session, Date.now());
            archive.save(finished); // A failed write leaves the live session available for retry.
            clearAutoRevealTimer(sessionId);
            Object.assign(session, finished);
            sessions.set(sessionId, session);

            broadcastSession(sessionId);
            jsonResponse(res, 200, { ok: true, session });
            return;
          }

          next();
        } catch (error) {
          console.error('Contest history storage failed:', error);
          jsonResponse(res, 500, { error: 'Could not read or save contest history. Check the server storage and try again.' });
        }
      });
    },
  };
}
