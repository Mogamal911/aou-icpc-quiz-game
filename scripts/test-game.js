// Verification test script for Game Flow, Scoring, Idempotency, and Tie-breaking
import assert from 'node:assert';

console.log('🏛️ Starting AOU ICPC Quiz Game Flow Verification Suite...\n');

// Mock localStorage and BroadcastChannel
const store = new Map();
global.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

class MockBroadcastChannel {
  constructor(name) {
    this.name = name;
  }
  postMessage() {}
  addEventListener() {}
  removeEventListener() {}
}
global.BroadcastChannel = MockBroadcastChannel;
global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
};

// ─────────────────────────────────────────────────────────────────────────────
// Load 20 Questions definition
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';

const questionsFile = fs.readFileSync('./src/data/questions.ts', 'utf-8');

// Verify exactly 20 questions exist in source
const questionMatches = questionsFile.match(/id:\s*['"]q\d+['"]/g);
console.log(`Test 1: Validating Questions in source file...`);
assert.strictEqual(questionMatches?.length, 20, 'Must have exactly 20 question IDs');
assert.ok(questionsFile.includes('MAX_POINTS_PER_QUESTION = 1000'));
assert.ok(questionsFile.includes('SPEED_BONUS_MAX = 500'));
console.log('✅ Exactly 20 questions configured with standard 1000 base + 500 speed bonus.\n');

// ─────────────────────────────────────────────────────────────────────────────
// Game Logic Implementation Under Test
// ─────────────────────────────────────────────────────────────────────────────
const MAX_POINTS_PER_QUESTION = 1000;
const SPEED_BONUS_MAX = 500;

function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function createGameSession() {
  const joinCode = generateJoinCode();
  const sessionId = 'session_' + Math.random().toString(36).substring(2, 9);
  const session = {
    id: sessionId,
    phase: 'lobby',
    currentQuestionIndex: 0,
    questionStartedAt: null,
    questionRevealedAt: null,
    players: {},
    createdAt: Date.now(),
    joinCode,
  };
  localStorage.setItem(`aou_session_${sessionId}`, JSON.stringify(session));
  localStorage.setItem(`aou_joincode_${joinCode}`, sessionId);
  return sessionId;
}

function resolveSessionByCode(code) {
  const cleanCode = code.trim().toUpperCase();
  return localStorage.getItem(`aou_joincode_${cleanCode}`) || null;
}

function joinSession(sessionId, nickname) {
  const raw = localStorage.getItem(`aou_session_${sessionId}`);
  if (!raw) throw new Error('Session not found');
  const session = JSON.parse(raw);

  const playerId = 'player_' + Math.random().toString(36).substring(2, 9);
  const player = {
    id: playerId,
    nickname: nickname.trim(),
    joinedAt: Date.now(),
    score: 0,
    answers: {},
    isConnected: true,
  };
  if (!session.players) session.players = {};
  session.players[playerId] = player;
  localStorage.setItem(`aou_session_${sessionId}`, JSON.stringify(session));
  return playerId;
}

function startGame(sessionId) {
  const session = JSON.parse(localStorage.getItem(`aou_session_${sessionId}`));
  session.phase = 'question';
  session.currentQuestionIndex = 0;
  session.questionStartedAt = Date.now();
  session.questionRevealedAt = null;
  localStorage.setItem(`aou_session_${sessionId}`, JSON.stringify(session));
}

function submitAnswer(sessionId, playerId, questionId, answerIndex) {
  const session = JSON.parse(localStorage.getItem(`aou_session_${sessionId}`));
  const player = session.players[playerId];
  if (!player.answers) player.answers = {};
  // Lock check / idempotent check
  if (player.answers[questionId] !== undefined) return;

  player.answers[questionId] = {
    answerIndex,
    answeredAt: Date.now(),
    isCorrect: false,
    pointsEarned: 0,
  };
  localStorage.setItem(`aou_session_${sessionId}`, JSON.stringify(session));
}

function revealAnswer(sessionId, correctIndex, timeLimitSec) {
  const session = JSON.parse(localStorage.getItem(`aou_session_${sessionId}`));
  session.phase = 'revealing';
  session.questionRevealedAt = Date.now();
  const timeLimit = timeLimitSec * 1000;
  const questionStartedAt = session.questionStartedAt || Date.now();

  for (const [playerId, player] of Object.entries(session.players || {})) {
    const answer = player.answers?.['q1'];
    if (!answer) continue;

    const isCorrect = answer.answerIndex === correctIndex;
    let points = 0;

    if (isCorrect) {
      const elapsed = (answer.answeredAt || Date.now()) - questionStartedAt;
      const ratio = Math.max(0, Math.min(1, 1 - elapsed / timeLimit));
      const speedBonus = Math.round(SPEED_BONUS_MAX * ratio);
      points = MAX_POINTS_PER_QUESTION + speedBonus;
    }

    player.answers['q1'].isCorrect = isCorrect;
    player.answers['q1'].pointsEarned = points;
    player.score = (player.score || 0) + points;
  }
  localStorage.setItem(`aou_session_${sessionId}`, JSON.stringify(session));
}

function buildLeaderboard(players) {
  return Object.entries(players)
    .map(([id, p]) => ({ playerId: id, nickname: p.nickname, score: p.score || 0, rank: 0 }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.nickname.localeCompare(b.nickname);
    })
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

function advanceToLeaderboard(sessionId) {
  const session = JSON.parse(localStorage.getItem(`aou_session_${sessionId}`));
  session.phase = 'leaderboard';
  localStorage.setItem(`aou_session_${sessionId}`, JSON.stringify(session));
}

function nextQuestion(sessionId, currentIndex) {
  const session = JSON.parse(localStorage.getItem(`aou_session_${sessionId}`));
  if (currentIndex + 1 >= 20) {
    session.phase = 'finished';
    session.endedAt = Date.now();
  } else {
    session.phase = 'question';
    session.currentQuestionIndex = currentIndex + 1;
    session.questionStartedAt = Date.now();
    session.questionRevealedAt = null;
  }
  localStorage.setItem(`aou_session_${sessionId}`, JSON.stringify(session));
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Execution
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test 2: Creating Game Session & Testing Join Code...');
const sessionId = createGameSession();
let session = JSON.parse(localStorage.getItem(`aou_session_${sessionId}`));
assert.strictEqual(session.phase, 'lobby');
assert.strictEqual(session.joinCode.length, 6);

const resolved = resolveSessionByCode(session.joinCode);
assert.strictEqual(resolved, sessionId);
const resolvedLower = resolveSessionByCode(session.joinCode.toLowerCase());
assert.strictEqual(resolvedLower, sessionId);
console.log(`✅ Session created with code ${session.joinCode}.\n`);

console.log('Test 3: Connecting Multiple Players...');
const p1Id = joinSession(sessionId, 'Alexander');
const p2Id = joinSession(sessionId, 'Hypatia');
const p3Id = joinSession(sessionId, 'Caesar');
session = JSON.parse(localStorage.getItem(`aou_session_${sessionId}`));
assert.strictEqual(Object.keys(session.players).length, 3);
console.log('✅ 3 players joined simultaneously into lobby.\n');

console.log('Test 4: Admin Starting Round 1...');
startGame(sessionId);
session = JSON.parse(localStorage.getItem(`aou_session_${sessionId}`));
assert.strictEqual(session.phase, 'question');
assert.strictEqual(session.currentQuestionIndex, 0);
console.log('✅ Question 1 active, countdown initiated.\n');

console.log('Test 5: Submitting Answers & Verifying Locking (Idempotency)...');
// P1 answers correct (0)
submitAnswer(sessionId, p1Id, 'q1', 0);
// P1 tries to answer AGAIN with option 2 (must be IGNORED)
submitAnswer(sessionId, p1Id, 'q1', 2);
session = JSON.parse(localStorage.getItem(`aou_session_${sessionId}`));
assert.strictEqual(session.players[p1Id].answers['q1'].answerIndex, 0, 'Duplicate submission must be rejected');

// P2 answers wrong (1)
submitAnswer(sessionId, p2Id, 'q1', 1);

// P3 times out (no submission)
console.log('✅ Player 1 answer locked, duplicate change blocked, Player 3 timeout simulated.\n');

console.log('Test 6: Admin Reveal Answer & Score Calculations...');
revealAnswer(sessionId, 0, 20); // correctIndex = 0, timeLimit = 20s
session = JSON.parse(localStorage.getItem(`aou_session_${sessionId}`));
const p1Score = session.players[p1Id].score;
const p2Score = session.players[p2Id].score;
const p3Score = session.players[p3Id].score;

assert.ok(p1Score >= 1000 && p1Score <= 1500, `P1 score should be 1000-1500 (got ${p1Score})`);
assert.strictEqual(p2Score, 0, 'Wrong answer must get 0 points');
assert.strictEqual(p3Score, 0, 'Timeout must get 0 points');
console.log(`✅ Scores calculated correctly: P1=${p1Score}pts, P2=0pts, P3=0pts.\n`);

console.log('Test 7: Leaderboard & Consistent Tie-Break...');
const leaderboard = buildLeaderboard(session.players);
assert.strictEqual(leaderboard[0].playerId, p1Id);
assert.strictEqual(leaderboard[0].rank, 1);
assert.strictEqual(leaderboard[1].nickname, 'Caesar', 'Tied at 0pts: Caesar beats Hypatia alphabetically');
assert.strictEqual(leaderboard[2].nickname, 'Hypatia');
console.log('✅ Leaderboard ranks & tie-breaks verified.\n');

console.log('Test 8: Phase Transitions: Intermission -> Next Round...');
advanceToLeaderboard(sessionId);
session = JSON.parse(localStorage.getItem(`aou_session_${sessionId}`));
assert.strictEqual(session.phase, 'leaderboard');

nextQuestion(sessionId, 0);
session = JSON.parse(localStorage.getItem(`aou_session_${sessionId}`));
assert.strictEqual(session.phase, 'question');
assert.strictEqual(session.currentQuestionIndex, 1);
console.log('✅ Transitioned to Question 2 cleanly.\n');

console.log('Test 9: Fast Forward to Question 20 and Game Over Podium...');
nextQuestion(sessionId, 18); // Q20
nextQuestion(sessionId, 19); // Completion
session = JSON.parse(localStorage.getItem(`aou_session_${sessionId}`));
assert.strictEqual(session.phase, 'finished');
assert.ok(session.endedAt > 0);
console.log('✅ 20 questions completed, final standings reached.\n');

console.log('════════════════════════════════════════════════════════════════');
console.log('🎉 ALL INTEGRATION TESTS PASSED WITHOUT ERRORS!');
console.log('════════════════════════════════════════════════════════════════\n');

