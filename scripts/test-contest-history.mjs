// Real HTTP + filesystem + separate server processes. No browser cache or database mocks.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'aou-history-test-'));
const directory = path.join(scratch, 'contests');
let processHandle;
let base;
await build({ entryPoints: [path.join(root, 'vite-plugin-quiz-sync.ts')], outfile: path.join(scratch, 'plugin.mjs'), bundle: true, format: 'esm', platform: 'node', logLevel: 'silent' });
await fs.writeFile(path.join(scratch, 'server.mjs'), `
import http from 'node:http';
import { quizSyncPlugin } from './plugin.mjs';
let middleware;
quizSyncPlugin({dataDirectory:process.argv[2]}).configureServer({middlewares:{use(fn){middleware=fn;}}});
const server=http.createServer((req,res)=>middleware(req,res,()=>{res.statusCode=404;res.end();}));
server.listen(0,'127.0.0.1',()=>console.log(server.address().port));
`);
async function start() {
  processHandle = spawn(process.execPath, [path.join(scratch, 'server.mjs'), directory], { stdio: ['ignore', 'pipe', 'pipe'] });
  processHandle.stderr.on('data', () => {}); // Deliberate storage faults are asserted through HTTP.
  const [output] = await once(processHandle.stdout, 'data');
  base = `http://127.0.0.1:${Number(output.toString().trim())}`;
}
async function stop() {
  if (processHandle && processHandle.exitCode === null) {
    const done = once(processHandle, 'exit'); processHandle.kill(); await done;
  }
}
async function request(route, body, status = 200) {
  const response = await fetch(`${base}/api/quiz/${route}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  const data = await response.json(); assert.equal(response.status, status, JSON.stringify(data)); return data;
}
const question = { id: 'history-q', text: 'What is 2 + 2?', options: ['4', '3', '2', '1'], correctIndex: 0, timeLimit: 30, difficulty: 'beginner', explanation: 'Two pairs make four.' };
async function create(id, code = id.toUpperCase()) {
  await request('session', { sessionId: id, joinCode: code, session: { id, joinCode: code, createdAt: Date.now(), phase: 'lobby', currentQuestionIndex: 0, questionStartedAt: null, questionRevealedAt: null, players: {}, questions: [question] } });
}
try {
  await start();
  assert.deepEqual((await request('history')).contests, []);
  await create('saved', 'SAVED1');
  const { playerId } = await request('join', { sessionId: 'saved', nickname: 'Ada' });
  await request('start', { sessionId: 'saved' });
  await request('answer', { sessionId: 'saved', playerId, questionId: question.id, answerIndex: 0 });
  const completed = (await request('end', { sessionId: 'saved' })).session;
  assert.equal(completed.phase, 'finished');
  assert.ok(completed.players[playerId].score >= 1000 && completed.players[playerId].score <= 1500);
  assert.equal(completed.players[playerId].answers[question.id].pointsEarned, completed.players[playerId].score);
  assert.deepEqual((await request('end', { sessionId: 'saved' })).session, completed);
  await request('rename-player', { sessionId: 'saved', playerId, nickname: 'Other' }, 409);
  await request('remove-player', { sessionId: 'saved', playerId }, 409);
  await request('duration', { sessionId: 'saved', duration: 40 }, 409);
  await request('join', { sessionId: 'saved', nickname: 'Late' }, 409);
  await request('session', { sessionId: 'saved', session: { ...completed, phase: 'lobby' } }, 409);
  await request('questions', { questions: [{ ...question, text: 'Changed later' }] });
  await create('unfinished');
  let listing = (await request('history')).contests;
  assert.deepEqual(listing.map((contest) => contest.id), ['saved']);
  assert.equal(listing[0].questionCount, 1); assert.equal(listing[0].playerCount, 1);
  assert.deepEqual((await request('history?id=saved')).session, completed);
  assert.equal((await request('history?id=unfinished')).session, null);
  console.log('PASS: Finishing saves scores, answers and original questions; retry is idempotent; completed data resists host mutations; unfinished games stay out of history.');

  // Restart a different process with an empty JS heap and the same real directory.
  await stop(); await start();
  assert.deepEqual((await request('history?id=saved')).session, completed);
  assert.deepEqual((await request('session?id=saved')).session, completed);
  assert.equal((await request('code?code=SAVED1')).sessionId, 'saved');
  const stream = await fetch(`${base}/api/quiz/events?sessionId=saved`);
  const reader = stream.body.getReader(); const { value } = await reader.read();
  const event = JSON.parse(new TextDecoder().decode(value).trim().replace(/^data: /, ''));
  assert.deepEqual(event.session, completed); await reader.cancel();
  console.log('PASS: New server process recovers identical history, session, code lookup and projector/player SSE state without browser cache.');

  await create('next-finish');
  await request('start', { sessionId: 'next-finish' });
  await request('reveal', { sessionId: 'next-finish', currentIndex: 0 });
  await request('next', { sessionId: 'next-finish', currentIndex: 0 });
  assert.equal((await request('history?id=next-finish')).session.phase, 'finished');
  await create('retry-save'); await request('start', { sessionId: 'retry-save' });
  await fs.rename(directory, `${directory}-held`); await fs.writeFile(directory, 'Deliberate storage obstruction');
  await request('end', { sessionId: 'retry-save' }, 500);
  assert.equal((await request('session?id=retry-save')).session.phase, 'question');
  await request('history', undefined, 500);
  await fs.unlink(directory); await fs.rename(`${directory}-held`, directory);
  await request('end', { sessionId: 'retry-save' });
  assert.equal((await request('history?id=retry-save')).session.phase, 'finished');
  await fs.writeFile(path.join(directory, 'corrupt.json'), '{');
  await request('history', undefined, 500);
  await fs.unlink(path.join(directory, 'corrupt.json'));
  listing = (await request('history')).contests;
  assert.deepEqual(listing.map((contest) => contest.id), ['retry-save', 'next-finish', 'saved']);
  assert.deepEqual((await request('history?id=saved')).session, completed);
  await stop(); await start();
  assert.equal((await request('history')).contests.length, 3);
  console.log('PASS: End and last-next both persist; disk write failure leaves a retryable live contest; corruption is reported; repaired storage and another restart retain all three contests.');
} finally { await stop(); await fs.rm(scratch, { recursive: true, force: true }); }
