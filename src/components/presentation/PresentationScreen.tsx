import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ExpandableQr } from '../ui/ExpandableQr';
import { useGameSession } from '../../hooks/useGameSession';
import { getActiveSessionId } from '../../services/gameService';
import { buildLeaderboard, countAnsweredPlayers } from '../../utils/gameUtils';
import { TimerRing } from '../ui/TimerRing';
import { AouLogo } from '../ui/RomanDecorations';
import { CodeBlock } from '../ui/CodeBlock';
import { LeaderboardPanel } from '../ui/LeaderboardPanel';
import { Icon } from '../ui/Icon';

export function PresentationScreen() {
  const [params] = useSearchParams();
  const requestedId = params.get('session');
  const [activeId, setActiveId] = useState<string | null>(requestedId);
  const [resolving, setResolving] = useState(!requestedId);
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [screenError, setScreenError] = useState('');
  const [pageSize, setPageSize] = useState(5);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const boardRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const { session, loading, error, connected } = useGameSession(activeId);
  const entries = useMemo(() => buildLeaderboard(session?.players || {}), [session?.players]);
  useEffect(() => {
    let cancelled = false;
    if (requestedId) { setActiveId(requestedId); setResolving(false); return; }
    setResolving(true);
    getActiveSessionId().then((id) => { if (!cancelled) setActiveId(id); }).finally(() => { if (!cancelled) setResolving(false); });
    return () => { cancelled = true; };
  }, [requestedId]);
  useEffect(() => {
    const resized = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    const changed = () => setFullscreen(Boolean(document.fullscreenElement));
    window.addEventListener('resize', resized);
    document.addEventListener('fullscreenchange', changed);
    return () => { window.removeEventListener('resize', resized); document.removeEventListener('fullscreenchange', changed); };
  }, []);
  useEffect(() => {
    let lock: { release: () => Promise<void> } | undefined;
    let disposed = false;
    async function keepAwake() {
      if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
      try {
        await lock?.release();
        const acquired = await (navigator as any).wakeLock.request('screen');
        if (disposed) await acquired.release(); else lock = acquired;
      } catch { /* Projecting still works if wake lock is unavailable. */ }
    }
    void keepAwake();
    document.addEventListener('visibilitychange', keepAwake);
    return () => { disposed = true; document.removeEventListener('visibilitychange', keepAwake); void lock?.release(); };
  }, []);
  async function toggleFullscreen() {
    setScreenError('');
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { setScreenError('Full screen is unavailable here. Use your browser’s full-screen control.'); }
  }
  const question = session?.questions?.[session.currentQuestionIndex];
  const active = session?.phase === 'question';
  const lobby = session?.phase === 'lobby';
  const finished = session?.phase === 'finished';
  const revealed = session?.phase === 'revealing' || session?.phase === 'leaderboard';
  const duration = session?.questionDuration ?? question?.timeLimit ?? 20;
  const answered = session && question ? countAnsweredPlayers(session.players || {}, question.id) : 0;
  const joinUrl = session ? `${window.location.origin}/join?session=${session.id}&code=${session.joinCode}` : '';
  useEffect(() => {
    const content = mainRef.current?.querySelector('.projector-question, .projector-invite, .projector-finish');
    if (!content) return;
    const observer = new ResizeObserver(() => setViewport({ width: window.innerWidth, height: window.innerHeight }));
    observer.observe(content);
    return () => observer.disconnect();
  }, [session?.phase, question?.id]);
  // Fit complete rows and the page controls below the question at projector sizes.
  useLayoutEffect(() => {
    const board = boardRef.current;
    const main = mainRef.current;
    const firstRow = board?.querySelector('tbody tr');
    const navigation = board?.querySelector('.standings-pagination');
    if (!board || !main || !firstRow || !navigation) return;
    if (viewport.width < 800) { setPageSize(5); return; }
    const row = firstRow.getBoundingClientRect();
    const note = board.querySelector('.projector-score-note');
    const noteHeight = note ? note.getBoundingClientRect().height + parseFloat(getComputedStyle(note).marginTop) : 0;
    const rowGap = parseFloat(getComputedStyle(board.querySelector('.standings')!).rowGap) || 0;
    const bottomSpace = navigation.getBoundingClientRect().height + noteHeight + rowGap
      + parseFloat(getComputedStyle(board).paddingBottom) + parseFloat(getComputedStyle(main).paddingBottom) + 3;
    const fittingRows = Math.max(1, Math.min(8, Math.floor((viewport.height - row.top - bottomSpace) / row.height)));
    setPageSize(fittingRows);
  }, [entries, pageSize, viewport, session?.phase, question?.id]);

  return <div className="projector-screen">
    <header className="projector-header"><div className="player-brand"><AouLogo size="sm" showText={false} /><span>AOU ICPC<span className="player-brand-sub">{finished ? 'Final results' : 'Live quiz'}</span></span></div><div className="projector-header-actions">{session && <span className={`projector-room ${lobby ? 'is-lobby' : ''}`}>Join code <strong>{session.joinCode}</strong></span>}<button className="button button-quiet projector-fullscreen" aria-label={fullscreen ? 'Exit full screen' : 'Full screen'} onClick={() => void toggleFullscreen()}><Icon name="expand" /><span>{fullscreen ? 'Exit full screen' : 'Full screen'}</span></button></div></header>
    <main className="projector-main" ref={mainRef}>
      {screenError && <p className="notice" role="status">{screenError}</p>}
      {resolving || loading ? <div className="projector-empty" role="status"><Icon name="clock" size={40} /><h1>Connecting to the contest…</h1></div> : !activeId || !session || error ? <div className="projector-empty"><Icon name="monitor" size={40} /><h1>{activeId ? 'Contest unavailable' : 'Ready for the big screen'}</h1><p className="muted">{error || 'Create a contest in the host controls, then open its projector.'}</p><Link className="button button-primary" to="/admin">Open host controls</Link><button className="button" onClick={() => window.location.reload()}>Retry</button></div> : <>
        {!connected && <p className="notice" role="status">Reconnecting to the host… These are the last received standings.</p>}
        {lobby ? <section className="projector-invite"><div><p className="eyebrow">Join the contest</p><h1>Ready when you are.</h1><p className="muted">Scan the QR code, choose a unique name and wait for your host.</p><p className="projector-join-code">{session.joinCode}</p><p className="muted projector-join-link">{window.location.host}/join</p></div><ExpandableQr value={joinUrl} code={session.joinCode} size={160} /></section> : finished ? <section className="projector-finish"><Icon name="trophy" size={44} /><div><p className="eyebrow">Contest complete</p><h1>Final standings</h1><p className="muted">{entries.length} players · {session.questions?.length ?? 0} questions · Equal scores share a rank</p></div></section> : question ? <section className="projector-question">
          <div className="projector-round"><div><p className="eyebrow">Question {session.currentQuestionIndex + 1} of {session.questions?.length} · {question.category || 'Quiz'}</p><h1>{question.text}</h1></div>{active && <TimerRing startedAt={session.questionStartedAt} timeLimit={duration} size={76} />}</div>
          <div className={`projector-details ${question.type === 'code' && question.code ? 'has-code' : ''}`}>
          {(active || revealed) && question.type === 'code'  && question.code && <CodeBlock code={question.code} language={question.codeLanguage || 'cpp'} size="lg" className="projector-code" />}
          {active && <div className="projector-options">{question.options.map((option, index) => <div key={index}><span>{String.fromCharCode(65 + index)}</span><p>{option}</p></div>)}</div>}
          {revealed && <div className="projector-answer"><Icon name="check" size={22} /><div><p><strong>Correct answer: {String.fromCharCode(65 + question.correctIndex)}.</strong> {question.options[question.correctIndex]}</p>{question.explanation && <p className="projector-explanation">{question.explanation}</p>}</div></div>}
          </div>
          <p className="projector-round-status">{active ? `${answered} of ${entries.length} submitted · Choose and submit on your device` : 'Answer revealed · Your host starts the next round'}</p>
        </section> : <p className="notice notice-error" role="alert">Question unavailable. Ask the host to check the contest.</p>}
        <section className="projector-board" ref={boardRef}><LeaderboardPanel key={session.id} entries={entries} pageSize={pageSize} title={lobby ? 'Players in the lobby' : finished ? 'Final leaderboard' : 'Leaderboard'} showScores={!lobby} />{active && <p className="projector-score-note">Scores update when the answer is revealed.</p>}</section>
      </>}
    </main>
  </div>;
}
