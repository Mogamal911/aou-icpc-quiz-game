// Exercises actual admin/player services, scoring and Vite backend; Firebase SDK boundaries are stubbed.
// Uses a disposable loopback server and never connects to the deployed database.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'aou-admin-test-'));
const cache = new Map();
globalThis.localStorage = { getItem: (key) => cache.get(key) ?? null, setItem: (key, value) => cache.set(key, String(value)), removeItem: (key) => cache.delete(key) };
globalThis.window = { addEventListener() {}, removeEventListener() {} };
globalThis.EventSource = class { constructor() { globalThis.testEventSource = this; } close() {} };
globalThis.adminTestWrites = [];
const rawFetch = globalThis.fetch;
const realDateNow = Date.now;
// This stub models only the SDK boundary, including uncached invocation and retry.
// The callback, scoring, validation and transitions are the actual app code.
const dbStub = `
export const ref=(_db,p)=>p;
export const query=(p,...constraints)=>({p,constraints});
export const orderByChild=(key)=>({orderBy:key});
export const equalTo=(value)=>({equalTo:value});
export const update=async(p,v)=>globalThis.adminTestWrites.push({path:p,value:v});
export const set=async(p,v)=>globalThis.adminTestWrites.push({path:p,value:v});
export const get=async()=>{if(globalThis.adminTestReadError)throw Error('Read unavailable');return {exists:()=>true,val:()=>globalThis.adminTestRemote};};
let nextId=0;
export const push=()=>({key:'test_id_'+(++nextId)});
export const serverTimestamp=()=>({'.sv':'timestamp'});
export const onValue=()=>()=>{};
export const runTransaction=async(path,edit)=>{
 const invoke=(value)=>{try{return edit(structuredClone(value));}catch{throw Error('Transaction callback threw instead of returning undefined to abort.');}};
 if(invoke(null)!==null)throw Error('Cold-cache null must be preserved for SDK retry.');
 let result=invoke(globalThis.adminTestRemote);
 if(result!==undefined&&globalThis.adminTestRetryRemote){globalThis.adminTestRemote=globalThis.adminTestRetryRemote;globalThis.adminTestRetryRemote=null;result=invoke(globalThis.adminTestRemote);}
 if(result===undefined)return {committed:false,snapshot:{exists:()=>globalThis.adminTestRemote!==null,val:()=>globalThis.adminTestRemote}};
 result=JSON.parse(JSON.stringify(result,(_key,value)=>value?.['.sv']==='timestamp'?Date.now():value));
 globalThis.adminTestRemote=result;
 globalThis.adminTestWrites.push({path,value:result});
 return {committed:true,snapshot:{exists:()=>result!==null,val:()=>result}};
};`;

async function bundle(entry, firebase = false) {
  const output = path.join(scratch, entry.replaceAll('/', '-') + '-' + firebase + '.mjs');
  await build({ entryPoints: [path.join(root, entry)], outfile: output, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent', plugins: [{ name: 'firebase-boundary', setup(bundler) {
    bundler.onResolve({ filter: /firebase/ }, ({ path: request }) => {
      if (request === 'firebase/database') return { path: 'db', namespace: 'test' };
      if (request.endsWith('firebase/config')) return { path: 'config', namespace: 'test' };
      if (request.endsWith('firebase/firebase')) return { path: 'instance', namespace: 'test' };
    });
    bundler.onLoad({ filter: /.*/, namespace: 'test' }, ({ path: request }) => ({ contents: request === 'db' ? dbStub : request === 'config' ? `export const isFirebaseConfigured=${firebase};` : 'export const db={};', loader: 'js' }));
  } }] });
  return import(pathToFileURL(output));
}
let middleware;
const { quizSyncPlugin } = await bundle('vite-plugin-quiz-sync.ts');
quizSyncPlugin({ dataDirectory: path.join(scratch, 'contests') }).configureServer({ middlewares: { use(fn) { middleware = fn; } } });
const server = http.createServer((req, res) => middleware(req, res, () => { res.statusCode = 404; res.end(); }));
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let rejectWrites = false;
globalThis.fetch = (url, options = {}) => rejectWrites && options.method === 'POST'
  ? Promise.resolve(new Response(JSON.stringify({ error: 'Deliberate rejection' }), { status: 503, headers: { 'Content-Type': 'application/json' } }))
  : rawFetch(new URL(url, base), options);
const sessions = [];
const read = async (id) => (await (await fetch(`/api/quiz/session?id=${id}`)).json()).session;
const evidence = [];
try {
  const service = await bundle('src/services/gameService.ts');
  const bank = await bundle('src/services/questionBankService.ts');
  const original = await bank.getQuestionBank();
  const browserCrypto = globalThis.crypto;
  // HTTP origins expose getRandomValues but not randomUUID.
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { getRandomValues: browserCrypto.getRandomValues.bind(browserCrypto) } });
  let questionId;
  try {
    questionId = bank.createQuestionId();
    assert.match(questionId, /^q_[a-f0-9]{32}$/);
    assert.notEqual(bank.createQuestionId(), questionId);
  } finally { Object.defineProperty(globalThis, 'crypto', { configurable: true, value: browserCrypto }); }
  const goodFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('{}', { status: 503 });
  await assert.rejects(bank.getQuestionBank(), /Could not load/);
  globalThis.fetch = goodFetch;
  const authored = { ...original[0], id: questionId, text: 'Saved authoring test', timeLimit: 35, difficulty: 'advanced' };
  await bank.saveQuestionBank([...original, authored]);
  assert.equal((await bank.getQuestionBank()).at(-1).text, authored.text);
  assert.equal((await bank.getQuestionBank()).at(-1).id, questionId);
  assert.equal((await bank.getQuestionBank()).at(-1).difficulty, 'advanced');
  const legacy = { ...authored }; delete legacy.difficulty;
  assert.equal(bank.normalizeQuestion(legacy).difficulty, undefined);
  assert.equal(bank.normalizeQuestion(authored).difficulty, 'advanced');
  assert.equal(bank.validateQuestion({ ...authored, difficulty: 'expert' }).isValid, false);
  const selected = [{ ...original[1], timeLimit: 15 }, { ...original[0], timeLimit: 20 }, { ...original[2], timeLimit: 25 }];
  const id = await service.createGameSession(selected); sessions.push(id);
  let session = await read(id);
  assert.deepEqual(session.questions.map((q) => q.id), selected.map((q) => q.id));
  assert.equal(session.questionDuration, 15);
  assert.deepEqual(session.questions.map((q) => q.difficulty), selected.map((q) => q.difficulty));
  await bank.saveQuestionBank([authored]);
  assert.equal((await read(id)).questions.length, 3);
  evidence.push('HTTP-compatible question IDs work without randomUUID and persist through the real bank service.');
  evidence.push('Saved authoring round-trip and selected ordered session snapshot survive later bank edits.');
  await service.startGame(id);
  session = await read(id);
  assert.equal(session.questionDuration, 15); assert.equal(session.nextQuestionDuration, 20);
  await service.setQuestionDuration(id, 40);
  await service.revealAnswer(id, session);
  await service.nextQuestion(id, 0);
  session = await read(id);
  assert.equal(session.questionDuration, 40); assert.equal(session.nextQuestionDuration, 25);
  await service.revealAnswer(id, session);
  await service.nextQuestion(id, 1);
  session = await read(id);
  assert.equal(session.questionDuration, 25);
  await service.endGame(id);
  assert.equal((await read(id)).phase, 'finished');
  evidence.push('Saved times 15/20/25: first round 15; live override applies 40 to second only; third restores 25.');
  const uniformId = await service.createGameSession(selected.map((q) => ({ ...q, timeLimit: 30 }))); sessions.push(uniformId);
  assert.deepEqual((await read(uniformId)).questions.map((q) => q.timeLimit), [30, 30, 30]);
  await assert.rejects(service.createGameSession([]), /at least one/);
  rejectWrites = true;
  const beforeBank = localStorage.getItem('aou_question_bank');
  await assert.rejects(bank.saveQuestionBank(original), /Could not save/);
  assert.equal(localStorage.getItem('aou_question_bank'), beforeBank);
  await assert.rejects(service.createGameSession(selected), /Could not create/);
  await assert.rejects(service.startGame(uniformId), /Deliberate rejection/);
  await assert.rejects(service.setQuestionDuration(uniformId, 60), /Deliberate rejection/);
  rejectWrites = false;
  assert.equal((await read(uniformId)).phase, 'lobby');
  evidence.push('Uniform timing persists; empty creation and rejected save/create/start/timing changes fail without false success.');
  cache.clear();
  const received = [];
  const unsubscribe = service.subscribeToSession('missing', (session) => received.push(session));
  await new Promise((resolve) => setImmediate(resolve));
  globalThis.testEventSource.onmessage({ data: JSON.stringify({ type: 'SESSION_UPDATE', session: null }) });
  assert.equal(received.at(-1), null); unsubscribe();
  const firebase = await bundle('src/services/gameService.ts', true);
  globalThis.adminTestRemote = { phase: 'revealing', currentQuestionIndex: 19, questions: Array.from({ length: 25 }, (_, i) => ({ ...authored, id: `remote${i}`, timeLimit: 10 + i })), players: {} };
  await firebase.nextQuestion('remote', 19, 40);
  const update = globalThis.adminTestWrites.at(-1).value;
  assert.equal(update.phase, 'question'); assert.equal(update.currentQuestionIndex, 20);
  assert.equal(update.questionDuration, 40); assert.equal(update.nextQuestionDuration, 31);
  globalThis.adminTestRemote = { ...globalThis.adminTestRemote, phase: 'lobby', questions: selected };
  await firebase.startGame('remote');
  assert.equal(globalThis.adminTestWrites.at(-1).value.nextQuestionDuration, 20);
  globalThis.adminTestRemote = { ...globalThis.adminTestRemote, phase: 'question', questionDuration: 17 };
  cache.set('aou_session_remote', JSON.stringify({ phase: 'lobby' }));
  await firebase.setQuestionDuration('remote', 50);
  assert.equal(globalThis.adminTestWrites.at(-1).value.questionDuration, 17);
  const firebaseBank = await bundle('src/services/questionBankService.ts', true);
  globalThis.adminTestRemote = [authored, legacy];
  const remoteBank = await firebaseBank.getQuestionBank();
  assert.equal(remoteBank[0].difficulty, 'advanced');
  assert.equal(remoteBank[1].difficulty, undefined);
  evidence.push('Knowledge levels round-trip through real local services/session snapshots and Firebase normalization; legacy questions remain unrated.');
  globalThis.adminTestReadError = true;
  await assert.rejects(firebaseBank.getQuestionBank(), /Could not load/);
  globalThis.adminTestReadError = false;
  evidence.push('Failed local/Firebase bank reads reject without stale defaults; next-time edits do not change the running Firebase timer.');
  evidence.push('Missing sessions complete with null; Firebase controls read the authoritative snapshot after host refresh.');
  const { scoreAnswer, revealQuestion } = await bundle('src/utils/scoring.ts');
  const { buildLeaderboard } = await bundle('src/utils/gameUtils.ts');
  for (const [answerIndex, elapsed, duration, expected] of [
    [0, 0, 20, 1500], [0, 10000, 20, 1250], [0, 20000, 20, 1000],
    [0, 21500, 20, 1000], [0, 21501, 20, 0], [0, -1, 20, 0],
    [1, 0, 20, 0], [5, 0, 20, 0], [0, 5000, 10, 1250], [0, 30000, 60, 1250],
  ]) {
    assert.equal(scoreAnswer({ answerIndex, answeredAt: 100000 + elapsed }, 0, 100000, duration, 200000).pointsEarned, expected);
  }
  evidence.push('Score contract: 1500 at start, 1250 halfway, 1000 at deadline/grace; zero for wrong, early, invalid and late answers across durations.');
  let now = 1000000;
  Date.now = () => now;
  const scoreQuestions = [{ ...original[0], id: 'score1', correctIndex: 0, timeLimit: 20 }, { ...original[1], id: 'score2', correctIndex: 1, timeLimit: 30 }];
  const scoreId = await service.createGameSession(scoreQuestions); sessions.push(scoreId);
  const ids = {};
  for (const name of ['Fast', 'Halfway', 'Deadline', 'Grace', 'Wrong', 'Missing', 'TooLate']) ids[name] = await service.joinSession(scoreId, name);
  await service.startGame(scoreId);
  await assert.rejects(service.startGame(scoreId), /already started/);
  await assert.rejects(service.submitAnswer(scoreId, ids.Fast, 'score2', 1), /no longer/);
  await assert.rejects(service.submitAnswer(scoreId, ids.Fast, 'score1', 4), /four answers/);
  await service.submitAnswer(scoreId, ids.Fast, 'score1', 0);
  const retry = await service.submitAnswer(scoreId, ids.Fast, 'score1', 2);
  assert.equal(retry.answerIndex, 0);
  await service.submitAnswer(scoreId, ids.Wrong, 'score1', 1);
  now += 10000; await service.submitAnswer(scoreId, ids.Halfway, 'score1', 0);
  now += 10000; await service.submitAnswer(scoreId, ids.Deadline, 'score1', 0);
  now += 1500; await service.submitAnswer(scoreId, ids.Grace, 'score1', 0);
  now += 1;
  await assert.rejects(service.submitAnswer(scoreId, ids.TooLate, 'score1', 0), /time ran out/);
  const beforeReveal = await read(scoreId);
  await service.revealAnswer(scoreId, beforeReveal);
  let scored = await read(scoreId);
  for (const [name, points] of Object.entries({ Fast: 1500, Halfway: 1250, Deadline: 1000, Grace: 1000, Wrong: 0, Missing: 0, TooLate: 0 })) assert.equal(scored.players[ids[name]].score, points, name);
  await service.revealAnswer(scoreId, beforeReveal);
  assert.deepEqual((await read(scoreId)).players, scored.players);
  const records = await service.submitAnswer(scoreId, ids.Fast, 'score1', 3);
  assert.equal(records.answerIndex, 0);
  await service.nextQuestion(scoreId, 0);
  await assert.rejects(service.nextQuestion(scoreId, 0), /question has changed/);
  await assert.rejects(service.revealAnswer(scoreId, beforeReveal), /question has changed/);
  assert.equal((await read(scoreId)).currentQuestionIndex, 1);
  now += 15000; await service.submitAnswer(scoreId, ids.Fast, 'score2', 1);
  await service.endGame(scoreId);
  scored = await read(scoreId);
  assert.equal(scored.players[ids.Fast].score, 2750);
  assert.equal(scored.players[ids.Fast].score, Object.values(scored.players[ids.Fast].answers).reduce((sum, answer) => sum + answer.pointsEarned, 0));
  evidence.push('Real HTTP flow: invalid/future/late answers rejected; first answer retained; duplicate reveal and stale start/next/reveal cannot change scores; finishing scores the active round.');
  const rankings = buildLeaderboard({ b: { nickname: 'Bob', score: 1500 }, a: { nickname: 'Alice', score: 1500 }, c: { nickname: 'Chris', score: 1000 } });
  assert.deepEqual(rankings.map((entry) => [entry.nickname, entry.rank]), [['Alice', 1], ['Bob', 1], ['Chris', 3]]);
  evidence.push('Tied scores share competition ranks 1,1,3, independent of alphabetical display order.');

  // Real Firebase service callback is retried against a newer server snapshot containing another answer.
  now = 2000000;
  const basePlayer = { id: 'a', nickname: 'Alice', score: 0, joinedAt: now, answers: {}, isConnected: true };
  globalThis.adminTestRemote = { id: 'firebase-score', phase: 'question', currentQuestionIndex: 0, questionStartedAt: now, questionRevealedAt: null, questionDuration: 20, questions: scoreQuestions, players: { a: basePlayer }, createdAt: now, joinCode: 'SCORES' };
  await assert.rejects(firebase.submitAnswer('firebase-score', 'a', 'score2', 1), /no longer/);
  const answering = structuredClone(globalThis.adminTestRemote);
  globalThis.adminTestRetryRemote = { ...answering, phase: 'revealing' };
  const writesBeforeRetry = globalThis.adminTestWrites.length;
  await assert.rejects(firebase.submitAnswer('firebase-score', 'a', 'score1', 0), /no longer/);
  assert.equal(globalThis.adminTestRemote.phase, 'revealing');
  assert.equal(globalThis.adminTestRemote.players.a.answers.score1, undefined);
  assert.equal(globalThis.adminTestWrites.length, writesBeforeRetry);
  globalThis.adminTestRemote = answering;
  await firebase.submitAnswer('firebase-score', 'a', 'score1', 0);
  assert.equal(globalThis.adminTestRemote.players.a.answers.score1.answeredAt, now);
  now += 10000;
  await firebase.submitAnswer('firebase-score', 'a', 'score1', 3);
  assert.equal(globalThis.adminTestRemote.players.a.answers.score1.answerIndex, 0);
  const staleHost = { ...globalThis.adminTestRemote, players: {} };
  globalThis.adminTestRetryRemote = structuredClone(globalThis.adminTestRemote);
  globalThis.adminTestRetryRemote.players.b = { ...basePlayer, id: 'b', nickname: 'Bob', answers: { score1: { answerIndex: 0, answeredAt: now } } };
  await firebase.revealAnswer('firebase-score', staleHost);
  assert.equal(globalThis.adminTestRemote.players.a.score, 1500);
  assert.equal(globalThis.adminTestRemote.players.b.score, 1250);
  await firebase.revealAnswer('firebase-score', staleHost);
  assert.equal(globalThis.adminTestRemote.players.a.score, 1500);
  await firebase.nextQuestion('firebase-score', 0);
  await assert.rejects(firebase.revealAnswer('firebase-score', staleHost), /question has changed/);
  await assert.rejects(firebase.nextQuestion('firebase-score', 0), /question has changed/);
  now += 31501;
  await assert.rejects(firebase.submitAnswer('firebase-score', 'a', 'score2', 1), /time ran out/);
  evidence.push('Firebase guard failures abort explicitly, including phase changes on retry, without accepting an answer or preventing a later write.');
  evidence.push('Firebase service + SDK stub: server timestamps, first-write wins, cold-cache/retry handling, authoritative scores and stale-action guards pass (not an emulator test).');
  // Unique names and host controls go through the real HTTP service boundary.
  const rosterId = await service.createGameSession(scoreQuestions); sessions.push(rosterId);
  const aliceId = await service.joinSession(rosterId, '  Alice  ');
  assert.equal((await read(rosterId)).players[aliceId].nickname, 'Alice');
  for (const duplicate of ['alice', ' ALICE ', 'Ａlice']) await assert.rejects(service.joinSession(rosterId, duplicate), /already in use/);
  const racingJoins = await Promise.allSettled([service.joinSession(rosterId, 'Bob'), service.joinSession(rosterId, ' bob ')]);
  assert.equal(racingJoins.filter((result) => result.status === 'fulfilled').length, 1);
  assert.match(racingJoins.find((result) => result.status === 'rejected').reason.message, /already in use/);
  assert.equal(Object.keys((await read(rosterId)).players).length, 2);
  await service.renamePlayer(rosterId, aliceId, 'ALICE');
  await assert.rejects(service.renamePlayer(rosterId, aliceId, 'bOb'), /already in use/);
  await service.startGame(rosterId);
  await service.submitAnswer(rosterId, aliceId, 'score1', 0);
  await service.revealAnswer(rosterId, await read(rosterId));
  const earned = (await read(rosterId)).players[aliceId].score;
  assert.equal(earned, 1500);
  await service.renamePlayer(rosterId, aliceId, '  Ada   Lovelace  ');
  let roster = await read(rosterId);
  assert.equal(roster.players[aliceId].nickname, 'Ada Lovelace');
  assert.equal(roster.players[aliceId].score, earned);
  assert.equal(roster.players[aliceId].answers.score1.answerIndex, 0);
  rejectWrites = true;
  await assert.rejects(service.renamePlayer(rosterId, aliceId, 'New name'), /Deliberate rejection/);
  await assert.rejects(service.removePlayer(rosterId, aliceId), /Deliberate rejection/);
  rejectWrites = false;
  await service.removePlayer(rosterId, aliceId);
  await service.removePlayer(rosterId, aliceId); // An acknowledged removal is safe to retry.
  roster = await read(rosterId);
  assert.equal(roster.players[aliceId], undefined);
  assert.equal(roster.removedPlayerIds[aliceId], true);
  assert.equal(buildLeaderboard(roster.players).length, 1);
  await assert.rejects(service.submitAnswer(rosterId, aliceId, 'score1', 0), /Player not found/);
  await assert.rejects(service.renamePlayer(rosterId, aliceId, 'Resurrected'), /no longer/);
  await service.revealAnswer(rosterId, roster);
  assert.equal((await read(rosterId)).players[aliceId], undefined);
  evidence.push('Real HTTP roster: case/spacing/Unicode duplicates and racing joins rejected; rename preserves answers/score; removal updates rank inputs, rejects old devices, and cannot resurrect on reveal.');

  // A Firebase retry must re-check uniqueness against the newer snapshot.
  globalThis.adminTestRemote = { ...roster, id: 'firebase-roster', phase: 'lobby', players: { a: { ...basePlayer, nickname: 'Alice', score: 1200, answers: { score1: { answerIndex: 0, answeredAt: now, isCorrect: true, pointsEarned: 1200 } } } } };
  globalThis.adminTestRetryRemote = structuredClone(globalThis.adminTestRemote);
  globalThis.adminTestRetryRemote.players.rival = { ...basePlayer, id: 'rival', nickname: 'Racer' };
  await assert.rejects(firebase.joinSession('firebase-roster', 'RACER'), /already in use/);
  assert.equal(Object.keys(globalThis.adminTestRemote.players).length, 2);
  globalThis.adminTestRetryRemote = structuredClone(globalThis.adminTestRemote);
  globalThis.adminTestRetryRemote.players.third = { ...basePlayer, id: 'third', nickname: 'Clara' };
  await assert.rejects(firebase.renamePlayer('firebase-roster', 'a', 'clara'), /already in use/);
  assert.equal(globalThis.adminTestRemote.players.a.nickname, 'Alice');
  await firebase.renamePlayer('firebase-roster', 'a', '  Alice   Cooper  ');
  assert.equal(globalThis.adminTestRemote.players.a.nickname, 'Alice Cooper');
  assert.equal(globalThis.adminTestRemote.players.a.score, 1200);
  await firebase.removePlayer('firebase-roster', 'a');
  assert.equal(globalThis.adminTestRemote.players.a, undefined);
  assert.equal(globalThis.adminTestRemote.removedPlayerIds.a, true);
  await assert.rejects(firebase.submitAnswer('firebase-roster', 'a', 'score1', 0), /no longer/);
  evidence.push('Firebase transaction callbacks re-check join/rename uniqueness on retry and preserve removed-player state (SDK stub, not deployed database rules).');

  // Saved Firebase sessions use the persisted finished state, including on repeated finish.
  await firebase.endGame('firebase-roster');
  const completed = structuredClone(globalThis.adminTestRemote);
  now += 10000;
  await firebase.endGame('firebase-roster');
  assert.deepEqual(globalThis.adminTestRemote, completed);
  await assert.rejects(firebase.renamePlayer('firebase-roster', 'rival', 'Changed'), /finished/);
  await assert.rejects(firebase.removePlayer('firebase-roster', 'rival'), /finished/);
  const history = await bundle('src/services/contestHistoryService.ts', true);
  globalThis.adminTestRemote = { ...completed, createdAt: 1000, joinCode: 'HISTORY' };
  const savedFirebase = await history.getCompletedContest('firebase-roster');
  assert.equal(savedFirebase.phase, 'finished');
  globalThis.adminTestRemote = { done: { ...savedFirebase, endedAt: 2000 }, live: { ...savedFirebase, phase: 'lobby' }, newer: { ...savedFirebase, endedAt: 3000 } };
  assert.deepEqual((await history.getCompletedContests()).map((contest) => contest.id), ['newer', 'done']);
  globalThis.adminTestReadError = true;
  await assert.rejects(history.getCompletedContests(), /Read unavailable/);
  globalThis.adminTestReadError = false;
  evidence.push('Firebase completed contests: repeat finish preserves completion time/results; history lists finished sessions newest first; read failures surface; completed roster is read-only (SDK boundary stub).');

  Date.now = realDateNow;
  // Real automatic timer: still accepts during its allowance, then reveals once.
  const autoId = await service.createGameSession([{ ...scoreQuestions[0], timeLimit: 5 }]); sessions.push(autoId);
  const autoPlayer = await service.joinSession(autoId, 'Auto player');
  await service.startGame(autoId);
  await new Promise((resolve) => setTimeout(resolve, 5200));
  assert.equal((await read(autoId)).phase, 'question');
  await service.submitAnswer(autoId, autoPlayer, 'score1', 0);
  await new Promise((resolve) => setTimeout(resolve, 1600));
  const auto = await read(autoId);
  assert.equal(auto.phase, 'revealing'); assert.equal(auto.players[autoPlayer].score, 1000);
  assert.equal(revealQuestion(auto, 0, Date.now()).players[autoPlayer].score, 1000);
  evidence.push('Actual auto-reveal waits the 1.5s allowance and awards 1000, without an extra speed bonus.');
  console.log(evidence.map((item) => `PASS: ${item}`).join('\n'));
} finally {
  Date.now = realDateNow;
  rejectWrites = false;
  for (const sessionId of sessions) await rawFetch(`${base}/api/quiz/end`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) }).catch(() => {});
  await new Promise((resolve) => server.close(resolve));
  globalThis.fetch = rawFetch;
  await fs.rm(scratch, { recursive: true, force: true });
}
