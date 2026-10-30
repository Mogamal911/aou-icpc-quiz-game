import { ANSWER_GRACE_MS } from '../../utils/scoring';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ExpandableQr } from '../ui/ExpandableQr';
import { useTransientState } from '../../hooks/useTransientState';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useGameSession } from '../../hooks/useGameSession';
import { useCountdown } from '../../hooks/useCountdown';
import { AdminLogin } from './AdminLogin';
import { AdminLayout } from './AdminLayout';
import { ContestSetup } from './ContestSetup';
import { QuestionPreviewModal } from './QuestionPreviewModal';
import { adminSignOut } from '../../services/authService';
import { getActiveSessionId, createGameSession, startGame, revealAnswer, nextQuestion, endGame, setQuestionDuration } from '../../services/gameService';
import { isFirebaseConfigured } from '../../firebase/config';
import { QUESTIONS } from '../../data/questions';
import type { Question } from '../../types/game';
import { countAnsweredPlayers } from '../../utils/gameUtils';
import { TimerRing } from '../ui/TimerRing';
import { PlayerManagement } from './PlayerManagement';
import { AnswerOption } from '../ui/AnswerOption';
import { CodeBlock } from '../ui/CodeBlock';
import { Icon } from '../ui/Icon';
import { Dialog } from '../ui/Dialog';

const SESSION_KEY = 'aou_admin_session_id';

export function AdminDashboard() {
  const { user, loading: authLoading, isAdmin, setUser } = useAdminAuth();
  const [sessionId, setSessionId] = useState<string | null>(() => sessionStorage.getItem(SESSION_KEY));
  const { session, loading: sessionLoading } = useGameSession(sessionId);
  const [resolving, setResolving] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [preview, setPreview] = useState<Question | null>(null);
  const [copied, setCopied] = useTransientState<'code' | 'link' | ''>('');
  const [timerInput, setTimerInput] = useState('20');
  const actionRef = useRef(false);
  const autoReveal = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (sessionStorage.getItem(SESSION_KEY) || sessionStorage.getItem('aou_admin_preparing')) { setResolving(false); return; }
    getActiveSessionId().then((id) => { if (!cancelled && id) setSessionId(id); }).finally(() => { if (!cancelled) setResolving(false); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (sessionId) sessionStorage.setItem(SESSION_KEY, sessionId);
    else sessionStorage.removeItem(SESSION_KEY);
  }, [sessionId]);
  const questions = session?.questions?.length ? session.questions : QUESTIONS;
  const current = session ? questions[session.currentQuestionIndex] : null;
  const duration = session?.questionDuration ?? current?.timeLimit ?? 20;
  const nextDuration = session?.nextQuestionDuration ?? questions[(session?.currentQuestionIndex ?? -1) + 1]?.timeLimit ?? 20;
  useEffect(() => { setTimerInput(String(nextDuration)); }, [nextDuration, session?.currentQuestionIndex]);
  const { isExpired } = useCountdown(session?.phase === 'question' ? session.questionStartedAt : null, duration + ANSWER_GRACE_MS / 1000);
  const players = Object.values(session?.players || {});
  const answered = session && current ? countAnsweredPlayers(session.players || {}, current.id) : 0;
  const run = useCallback(async (action: () => Promise<void>) => {
    if (actionRef.current) return;
    actionRef.current = true; setBusy(true); setError('');
    try { await action(); }
    catch (error) { setError(error instanceof Error ? error.message : 'The action could not be completed. Try again.'); }
    finally { actionRef.current = false; setBusy(false); }
  }, []);
  // The local server already owns automatic reveal. Firebase mode still needs its host.
  useEffect(() => {
    if (!isFirebaseConfigured || !session || session.phase !== 'question' || !isExpired) return;
    const key = `${session.id}:${session.currentQuestionIndex}`;
    if (autoReveal.current === key || actionRef.current) return;
    autoReveal.current = key;
    void run(() => revealAnswer(session.id, session));
  }, [session, isExpired, run]);

  async function create(questions: Question[]) {
    if (creating) return;
    setCreating(true); setError('');
    try { const id = await createGameSession(questions); sessionStorage.removeItem('aou_admin_preparing'); sessionStorage.removeItem('aou_contest_draft'); setSessionId(id); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not create the lobby. Try again.'); }
    finally { setCreating(false); }
  }
  function newContest() {
    if (session && session.phase !== 'finished' && !window.confirm('Leave this contest and set up another? Its existing join code will still work.')) return;
    sessionStorage.setItem('aou_admin_preparing', 'true');
    sessionStorage.removeItem('aou_contest_draft');
    setSessionId(null); setError(''); setCopied('');
  }
  if (authLoading) return <div className="empty-state">Loading…</div>;
  if (!isAdmin || !user) return <AdminLogin onLogin={(u) => { if (u) setUser(u); }} />;
  const joinUrl = session ? `${window.location.origin}/join?session=${session.id}&code=${session.joinCode}` : '';
  const validTimer = Number.isInteger(Number(timerInput)) && Number(timerInput) >= 5 && Number(timerInput) <= 300;
  const hasNext = Boolean(session && session.currentQuestionIndex + 1 < questions.length);

  return <AdminLayout sessionId={sessionId} busy={busy || creating} onSignOut={async () => { await adminSignOut(); setUser(null); }}>
    {resolving || (sessionId && sessionLoading) ? <div className="empty-state" role="status">Loading your contest…</div> : !sessionId || !session ? <ContestSetup onCreate={create} creating={creating} error={error} /> : <>
      <div className="page-heading"><div><span className="eyebrow">Contest · {session.joinCode}</span><h1>{session.phase === 'lobby' ? 'Contest lobby' : session.phase === 'finished' ? 'Final results' : `Question ${session.currentQuestionIndex + 1} of ${questions.length}`}</h1><p>{session.phase === 'lobby' ? 'Share the code, welcome your players, then start the quiz.' : session.phase === 'finished' ? 'Saved to contest history. The final results are ready to share.' : session.phase === 'revealing' ? 'Answer revealed. Take a moment to discuss it.' : 'Players are answering now.'}</p></div><button className="button button-quiet" disabled={busy} onClick={newContest}><Icon name="plus" />New contest</button></div>
      {error && <p role="alert" className="notice notice-error">{error}</p>}
      {session.phase === 'lobby' ? <div className="lobby-grid">
        <div className="space-y-6"><section className="panel join-card"><div className="min-w-0"><h2>Invite players</h2><p className="muted mt-2">Enter this code on the join screen</p><p className="join-code">{session.joinCode}</p><div className="invite-copy-actions"><button className="button" onClick={async () => { try { await navigator.clipboard.writeText(session.joinCode); setCopied('code'); } catch { setError('Could not copy the code. Select it above and copy it manually.'); } }}><Icon name={copied === 'code' ? 'check' : 'copy'} />{copied === 'code' ? 'Code copied' : 'Copy code'}</button><button className="button button-quiet" onClick={async () => { try { await navigator.clipboard.writeText(joinUrl); setCopied('link'); } catch { setError('Could not copy the link. Select it below and copy it manually.'); } }}><Icon name={copied === 'link' ? 'check' : 'copy'} />{copied === 'link' ? 'Link copied' : 'Copy join link'}</button></div><p className="muted text-xs mt-3 break-all select-all">{joinUrl}</p></div><ExpandableQr value={joinUrl} code={session.joinCode} /></section>
          <PlayerManagement key={session.id} session={session} disabled={busy} />
        </div>
        <aside className="panel lobby-controls"><h2>Ready to start</h2><div className="lobby-summary"><p className="muted">{questions.length} questions · First question {duration}s</p><button className="button button-quiet" onClick={() => setReviewing(true)}><Icon name="eye" />Review</button></div><button className="button button-primary w-full" disabled={busy} onClick={() => run(() => startGame(session.id, duration))}><Icon name="play" />{busy ? 'Starting…' : 'Start quiz'}</button><p className="muted text-xs leading-relaxed mt-3">{players.length ? `${players.length} player${players.length === 1 ? '' : 's'} joined. More can join while you play.` : 'No players yet. Wait for players or start a practice run.'}</p></aside>
      </div> : session.phase === 'finished' ? <div className="host-stack"><section className="panel host-finish"><div className="host-finish-heading"><Icon name="trophy" size={36} className="text-amber-200" /><div><h2>Contest saved</h2><p className="muted mt-2">{players.length} player{players.length === 1 ? '' : 's'} · {questions.length} questions</p></div></div><div className="action-group"><a className="button button-primary" href={`/present?session=${sessionId}`} target="_blank" rel="noreferrer"><Icon name="monitor" />Show final results</a><Link className="button" to={`/admin/history/${session.id}`}><Icon name="history" />View saved contest</Link><button className="button button-quiet" onClick={newContest}>Set up another contest</button></div></section><PlayerManagement key={session.id} session={session} disabled={busy} /></div> : current ? <div className="host-stack">
        <section className="panel"><div className="flex items-center justify-between"><p className="muted">{current.category || 'Quiz question'}</p><TimerRing startedAt={session.phase === 'question' ? session.questionStartedAt : null} timeLimit={duration} size={72} /></div><h2 className="host-question">{current.text}</h2>{current.type === 'code' && current.code && <CodeBlock code={current.code} language={current.codeLanguage || 'cpp'} size="md" className="mb-5" />}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{current.options.map((option, i) => <AnswerOption key={i} index={i} text={option} correct={session.phase === 'revealing' && i === current.correctIndex} disabled isRevealing={session.phase === 'revealing'} />)}</div>
          <div className="mt-6"><div className="flex justify-between muted"><span>{answered} of {players.length} answered</span><span>{session.phase === 'revealing' ? 'Answer revealed' : isExpired ? 'Time is up' : `${duration}s round`}</span></div><div className="progress-track"><div style={{ width: `${players.length ? answered / players.length * 100 : 0}%` }} /></div></div>
          {session.phase === 'revealing' && current.explanation && <p className="notice notice-success mt-5"><strong>Explanation: </strong>{current.explanation}</p>}
          {hasNext && <form className="flex flex-wrap items-end gap-3 mt-6" onSubmit={(event) => { event.preventDefault(); if (validTimer) void run(() => setQuestionDuration(session.id, Number(timerInput))); }}><label className="field">Next question time (seconds)<input className="max-w-[180px]" type="number" min={5} max={300} step={1} value={timerInput} required onChange={(e) => setTimerInput(e.target.value)} /></label><button className="button" disabled={busy || !validTimer || Number(timerInput) === nextDuration}>Apply time</button></form>}
          <div className="host-actions">{session.phase === 'question' ? <button className="button button-primary" disabled={busy} onClick={() => run(() => revealAnswer(session.id, session))}><Icon name="eye" />Reveal answer</button> : hasNext ? <button className="button button-primary" disabled={busy} onClick={() => run(() => nextQuestion(session.id, session.currentQuestionIndex, nextDuration))}><Icon name="arrow" />Next question · {nextDuration}s</button> : <button className="button button-primary" disabled={busy} onClick={() => run(() => endGame(session.id))}><Icon name="trophy" />Finish & show results</button>}{busy && <span role="status" className="muted self-center">Updating…</span>}</div>
        </section><PlayerManagement key={session.id} session={session} disabled={busy} />
      </div> : <p role="alert" className="notice notice-error">This contest has no question at the current position. Create a new contest from the question bank.</p>}
    </>}
    {reviewing && session && <Dialog title={`Contest questions (${questions.length})`} wide onClose={() => setReviewing(false)}><div className="dialog-body"><p className="muted mb-4">These questions and timings are fixed for this contest.</p>{questions.map((question, i) => <div key={question.id} className="setup-row"><span className="muted">{i + 1}.</span><div className="flex-1"><p>{question.text}</p><span className="muted text-xs">{question.timeLimit}s</span></div><button className="button button-quiet" onClick={() => { setReviewing(false); setPreview(question); }}>Preview</button></div>)}</div></Dialog>}
    {preview && <QuestionPreviewModal question={preview} questionNumber={questions.findIndex((question) => question.id === preview.id) + 1} totalQuestions={questions.length} onClose={() => setPreview(null)} />}
  </AdminLayout>;
}
