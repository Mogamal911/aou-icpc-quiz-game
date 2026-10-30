import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Icon } from '../ui/Icon';
import { AouLogo } from '../ui/RomanDecorations';
import { CodeBlock } from '../ui/CodeBlock';
import { LeaderboardPanel } from '../ui/LeaderboardPanel';
import { useGameSession } from '../../hooks/useGameSession';
import { useCountdown } from '../../hooks/useCountdown';
import { submitAnswer } from '../../services/gameService';
import { buildLeaderboard } from '../../utils/gameUtils';
import { ANSWER_GRACE_MS, CORRECT_POINTS, MAX_SPEED_BONUS } from '../../utils/scoring';
import type { PlayerAnswer } from '../../types/game';

interface PlayerGameProps { sessionId: string; playerId: string; nickname: string; onLeave: () => void; onForget: () => void; }

export function PlayerGame({ sessionId, playerId, nickname, onLeave, onForget }: PlayerGameProps) {
  const { session, loading, error, connected } = useGameSession(sessionId);
  const [confirmed, setConfirmed] = useState<Record<string, PlayerAnswer>>({});
  const [selection, setSelection] = useState<{ questionId: string; index: number } | null>(null);
  const [sending, setSending] = useState<{ questionId: string; index: number } | null>(null);
  const [failure, setFailure] = useState<{ questionId: string; message: string } | null>(null);
  const pendingQuestion = useRef<string | null>(null);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const questions = session?.questions || [];
  const question = session ? questions[session.currentQuestionIndex] : undefined;
  const duration = session?.questionDuration ?? question?.timeLimit ?? 20;
  const { timeLeft, isExpired, progress } = useCountdown(session?.phase === 'question' ? session.questionStartedAt : null, duration);
  const player = session?.players?.[playerId];
  const [lastKnownName, setLastKnownName] = useState(nickname);
  const displayName = player?.nickname ?? lastKnownName;
  useEffect(() => {
    if (!player?.nickname) return;
    setLastKnownName(player.nickname);
    for (const key of ['localStorage', 'sessionStorage'] as const) {
      try {
        const storage = window[key];
        const saved = JSON.parse(storage.getItem('aou_player_info') || 'null');
        if (saved?.sessionId === sessionId && saved.playerId === playerId) storage.setItem('aou_player_info', JSON.stringify({ ...saved, nickname: player.nickname }));
      } catch { /* A cache failure must not prevent live updates. */ }
    }
  }, [player?.nickname, sessionId, playerId]);
  const answer = question ? player?.answers?.[question.id] ?? confirmed[question.id] : undefined;
  const pending = sending?.questionId === question?.id ? sending : null;
  const draft = selection && selection.questionId === question?.id ? selection.index : undefined;
  const submitError = failure && failure.questionId === question?.id ? failure.message : '';
  const leaderboard = useMemo(() => buildLeaderboard(session?.players || {}), [session?.players]);
  const myEntry = leaderboard.find((entry) => entry.playerId === playerId);
  const sharedRank = myEntry ? leaderboard.filter((entry) => entry.score === myEntry.score).length > 1 : false;
  const rank = myEntry ? `${sharedRank ? 'Joint ' : ''}#${myEntry.rank}` : '—';
  const score = myEntry?.score ?? 0;
  const correctCount = questions.filter((q) => player?.answers?.[q.id]?.isCorrect === true).length;

  useEffect(() => {
    if (session?.phase === 'question' || session?.phase === 'revealing' || session?.phase === 'finished') {
      window.scrollTo({ top: 0, behavior: 'auto' });
      questionHeading.current?.focus({ preventScroll: true });
    }
  }, [question?.id, session?.phase]);

  async function submit() {
    if (!question || !session || session.phase !== 'question' || draft === undefined || answer || pendingQuestion.current === question.id || isExpired || !connected) return;
    const questionId = question.id;
    pendingQuestion.current = questionId;
    setSending({ questionId, index: draft }); setFailure(null);
    try {
      const accepted = await submitAnswer(sessionId, playerId, questionId, draft);
      setConfirmed((previous) => ({ ...previous, [questionId]: accepted }));
    } catch (error) {
      setFailure({ questionId, message: error instanceof Error ? error.message : 'Answer not confirmed. Try submitting again while there is time.' });
    } finally {
      if (pendingQuestion.current === questionId) pendingQuestion.current = null;
      setSending((previous) => previous?.questionId === questionId ? null : previous);
    }
  }

  if (loading) return <PlayerShell nickname={displayName} onLeave={onLeave}><div className="player-state" role="status"><Icon name="clock" size={32} /><h1>Connecting to your contest…</h1></div></PlayerShell>;
  if (session?.removedPlayerIds?.[playerId]) return <PlayerShell nickname={displayName} onLeave={onLeave}><div className="player-state"><Icon name="users" size={32} /><h1>You’ve been removed from this contest</h1><p className="muted">Your host removed your player, answers and score. Check with them before joining again.</p><button className="button button-primary" onClick={onForget}>Back to quiz arena</button></div></PlayerShell>;
  if (error || !session || !player) return <PlayerShell nickname={displayName} onLeave={onLeave}><div className="player-state"><Icon name="alert" size={32} /><h1>Let’s get you reconnected</h1><p className="muted">{error || 'Your player could not be found in this contest.'}</p><button className="button button-primary" onClick={() => window.location.reload()}>Try again</button><button className="button button-quiet" onClick={onForget}>Enter another code</button></div></PlayerShell>;

  const connectionNotice = !connected && <p className="notice" role="status">Reconnecting… {pending ? 'Waiting for your answer confirmation.' : 'You can submit when the connection returns.'}</p>;
  const stats = <dl className="player-stats"><div><dt>Total score</dt><dd>{score.toLocaleString()} <small>pts</small></dd></div><div><dt>Rank of {leaderboard.length}</dt><dd>{rank}</dd></div></dl>;
  const standings = <section className="player-standings"><h2>{session.phase === 'finished' ? 'Final standings' : 'Leaderboard'}</h2><p className="muted text-sm mb-4">{session.phase === 'question' ? 'Current scores. This round is added when your host reveals the answer.' : 'Equal scores share the same rank.'}</p><LeaderboardPanel entries={leaderboard} highlightPlayerId={playerId} showTitle={false} /></section>;
  if (session.phase === 'lobby') return <PlayerShell nickname={displayName} onLeave={onLeave}>{connectionNotice}<section className="player-state player-lobby"><span className="player-state-icon"><Icon name="check" size={32} /></span><h1>You’re in, {displayName}.</h1><p className="muted">Waiting for your host to start. The first question will appear here.</p><p className="player-roster"><Icon name="users" />{leaderboard.length} {leaderboard.length === 1 ? 'player has' : 'players have'} joined</p></section><section className="player-scoring"><h2>How points work</h2><p>A correct answer starts at <strong>{(CORRECT_POINTS + MAX_SPEED_BONUS).toLocaleString()} points</strong> and decreases to <strong>{CORRECT_POINTS.toLocaleString()}</strong> as time runs out. Wrong or unanswered questions score zero.</p><p className="muted">Choose an answer, then press Submit answer. You can change your selection until you submit. Points use the time your submission reaches the server.</p></section></PlayerShell>;

  if (session.phase === 'finished' || session.phase === 'leaderboard') return <PlayerShell nickname={displayName} onLeave={onLeave}>{connectionNotice}<section className="player-state player-final"><Icon name="trophy" size={40} /><h1 ref={questionHeading} tabIndex={-1}>{session.phase === 'finished' ? 'Contest complete' : 'Leaderboard'}</h1><p className="muted">{session.phase === 'finished' ? `${correctCount} of ${questions.length} questions correct. Thanks for playing, ${displayName}.` : 'Your host will start the next question shortly.'}</p></section>{stats}{standings}{session.phase === 'finished' && <button className="button player-leave" onClick={onLeave}>Back to quiz arena</button>}</PlayerShell>;

  if (!question) return <PlayerShell nickname={displayName} onLeave={onLeave}><div className="player-state"><h1>Question unavailable</h1><p className="muted">Ask your host to check this contest.</p><button className="button" onClick={() => window.location.reload()}>Retry</button></div></PlayerShell>;
  const active = session.phase === 'question';
  const isLate = Boolean(answer && session.questionStartedAt !== null && answer.answeredAt > session.questionStartedAt + duration * 1000 + ANSWER_GRACE_MS);
  const points = player.answers?.[question.id]?.pointsEarned ?? 0;
  const correct = player.answers?.[question.id]?.isCorrect === true;
  const chosen = answer?.answerIndex ?? pending?.index ?? draft;
  const availablePoints = CORRECT_POINTS + Math.round(MAX_SPEED_BONUS * Math.min(1, Math.max(0, progress)));
  return <PlayerShell nickname={displayName} onLeave={onLeave}>{connectionNotice}
    <div className="player-round"><span>Question {session.currentQuestionIndex + 1} of {questions.length}</span>{active && <span className={`player-timer ${timeLeft <= 5 ? 'urgent' : ''}`} role="timer" aria-label={`${timeLeft} seconds remaining`}><Icon name="clock" />{timeLeft}s</span>}</div>
    {active && <div className="player-time-track" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} /></div>}
    {!active && <section className={`player-result ${correct ? 'correct' : answer ? 'incorrect' : ''}`} role="status"><Icon name={correct ? 'check' : answer ? 'close' : 'clock'} size={30} /><div><h1 ref={questionHeading} tabIndex={-1}>{correct ? 'Correct answer!' : isLate ? 'Answer arrived too late' : answer ? 'Not quite' : 'No answer received'}</h1><p>{correct ? `+${points.toLocaleString()} points` : '0 points this question'}</p>{correct && <small>{CORRECT_POINTS.toLocaleString()} correct + {(points - CORRECT_POINTS).toLocaleString()} speed bonus</small>}</div></section>}
    <section className="player-question"><h2 ref={active ? questionHeading : undefined} tabIndex={-1}>{question.text}</h2>{question.type === 'code' && question.code && !answer && active && <CodeBlock code={question.code} language={question.codeLanguage || 'cpp'} className="mt-4" size="md" />}</section>
    {active && !answer ? <>
      {submitError && <p className="notice notice-error" role="alert">{submitError}{!isExpired && connected && ' Press Submit answer to retry.'}</p>}
      <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <div className="player-options" aria-label="Answer choices">{question.options.map((option, index) => <button key={`${question.id}-${index}`} type="button" className={`player-option ${index === chosen ? 'selected' : ''}`} disabled={Boolean(pending) || isExpired || !connected} onClick={() => { setSelection({ questionId: question.id, index }); setFailure(null); }} aria-pressed={index === chosen}><span className="player-option-letter">{String.fromCharCode(65 + index)}</span><span className="player-option-copy">{option}{index === chosen && <small>{pending ? 'Submitting…' : 'Selected'}</small>}</span></button>)}</div>
        <div className="player-submit"><p className="muted">{pending ? 'Waiting for submission confirmation.' : isExpired ? 'Time’s up. Your selection was not submitted.' : `Up to ${availablePoints.toLocaleString()} pts if correct. Points decrease until you submit.`}</p><button className="button button-primary" type="submit" disabled={draft === undefined || Boolean(pending) || isExpired || !connected}><Icon name="check" />{pending ? 'Submitting…' : 'Submit answer'}</button></div>
      </form>
      <p className="player-answer-status" role="status">{pending ? 'Waiting for the server to confirm your answer…' : isExpired ? 'Waiting for your host to reveal the answer.' : 'Choose an option, then submit to lock it in.'}</p>
    </> : <>
      {active ? <p className="notice notice-success" role="status">Answer submitted: {String.fromCharCode(65 + answer!.answerIndex)}. {question.options[answer!.answerIndex]}. Waiting for the reveal.</p> : <section className="player-answer-review"><p><strong>Correct answer: {String.fromCharCode(65 + question.correctIndex)}.</strong> {question.options[question.correctIndex]}</p>{answer && !correct && <p className="muted">Your answer: {String.fromCharCode(65 + answer.answerIndex)}. {question.options[answer.answerIndex]}</p>}{question.type === 'code' && question.code && <CodeBlock code={question.code} language={question.codeLanguage || 'cpp'} className="mt-4" size="md" />}{question.explanation?.trim() && <p className="muted mt-3">{question.explanation}</p>}</section>}
      {stats}{standings}
      {!active && <p className="player-answer-status" role="status">{session.currentQuestionIndex + 1 === questions.length ? 'Your host will show the final results shortly.' : 'The next question starts when your host is ready.'}</p>}
    </>}
  </PlayerShell>;
}

function PlayerShell({ nickname, children, onLeave }: { nickname: string; children: React.ReactNode; onLeave: () => void }) {
  return <div className="player-app"><header className="player-header"><div className="player-brand"><AouLogo size="sm" showText={false} /><span>AOU ICPC</span></div><div className="player-header-actions"><span className="player-handle">{nickname}</span><button className="button button-quiet" onClick={onLeave}><Icon name="logout" /><span>Exit contest</span></button></div></header><main className="player-main">{children}</main></div>;
}
