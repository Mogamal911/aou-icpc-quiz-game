import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useGameSession } from '../../hooks/useGameSession';
import { useCountdown } from '../../hooks/useCountdown';
import { AdminLogin } from './AdminLogin';
import { adminSignOut } from '../../services/authService';
import {
  getActiveSessionId,
  createGameSession,
  startGame,
  revealAnswer,
  nextQuestion,
  endGame,
  setQuestionDuration,
} from '../../services/gameService';
import { QUESTIONS } from '../../data/questions';
import { buildLeaderboard, countAnsweredPlayers } from '../../utils/gameUtils';
import { TimerRing } from '../ui/TimerRing';
import { TimerControl } from './TimerControl';
import { LeaderboardPanel } from '../ui/LeaderboardPanel';
import { AouLogo, GoldDivider, LaurelWreath, MeanderBorder } from '../ui/RomanDecorations';
import { AnswerOption } from '../ui/AnswerOption';
import { CodeBlock } from '../ui/CodeBlock';

const SESSION_STORAGE_KEY = 'aou_admin_session_id';

export function AdminDashboard() {
  const { user, loading: authLoading, isAdmin, setUser } = useAdminAuth();
  const [sessionId, setSessionId] = useState<string | null>(
    () => sessionStorage.getItem(SESSION_STORAGE_KEY)
  );
  const { session, setSession, loading: sessionLoading } = useGameSession(sessionId);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  // When true, the user explicitly requested a NEW session — skip auto-connect
  const [wantsNewSession, setWantsNewSession] = useState(false);

  // On mount only: if no session in sessionStorage, auto-connect to the last active session.
  // This never re-runs, so "New Session" → setSessionId(null) won't trigger a reconnect loop.
  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) {
      getActiveSessionId().then((activeId) => {
        if (activeId) {
          setSessionId(activeId);
        }
      });
    }
  }, []);
  // Persist session id across refreshes
  useEffect(() => {
    if (sessionId) sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    else sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }, [sessionId]);

  // Active questions (loaded from session snapshot or default question bank)
  const sessionQuestions = useMemo(
    () => (session?.questions && session.questions.length > 0 ? session.questions : QUESTIONS),
    [session?.questions]
  );

  const currentQ = useMemo(
    () => (session ? sessionQuestions[session.currentQuestionIndex] : null),
    [session, sessionQuestions]
  );

  const activeQuestionDuration = session?.questionDuration ?? currentQ?.timeLimit ?? 20;
  const nextQuestionDuration = session?.nextQuestionDuration ?? activeQuestionDuration;

  // Synchronized countdown for active question
  const { timeLeft, isExpired } = useCountdown(
    session?.phase === 'question' ? session.questionStartedAt : null,
    activeQuestionDuration
  );

  // Memoized expensive derivations
  const leaderboard = useMemo(
    () => (session?.players ? buildLeaderboard(session.players) : []),
    [session?.players]
  );

  const totalPlayers = useMemo(
    () => (session?.players ? Object.keys(session.players).length : 0),
    [session?.players]
  );

  const answeredCount = useMemo(
    () => (session && currentQ ? countAnsweredPlayers(session.players || {}, currentQ.id) : 0),
    [session, currentQ]
  );

  const allAnswered = totalPlayers > 0 && answeredCount >= totalPlayers;

  // Optimistic action runner with immediate UI transition
  const handleAction = useCallback(async (
    optimisticUpdate: () => void,
    remoteCall: () => Promise<void>
  ) => {
    if (actionLoading) return;
    setActionLoading(true);

    // Apply immediate local feedback in <16ms
    optimisticUpdate();

    try {
      await remoteCall();
    } catch (err) {
      console.error('Admin action remote error:', err);
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading]);

  // Requirement 6: When timer reaches zero during an active question, automatically trigger answer reveal
  const hasAutoRevealedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!session || session.phase !== 'question' || !currentQ) {
      hasAutoRevealedRef.current = null;
      return;
    }

    const roundKey = `${session.id}_${session.currentQuestionIndex}`;
    if (isExpired && hasAutoRevealedRef.current !== roundKey && !actionLoading) {
      hasAutoRevealedRef.current = roundKey;
      handleAction(
        () =>
          setSession((prev) =>
            prev ? { ...prev, phase: 'revealing', questionRevealedAt: Date.now() } : null
          ),
        () => revealAnswer(session.id, session)
      );
    }
  }, [isExpired, session, currentQ, actionLoading, handleAction, setSession]);

  if (authLoading) return <LoadingScreen />;
  if (!isAdmin || !user) return <AdminLogin onLogin={(u) => { if (u) setUser(u); }} />;

  async function handleCreateSession() {
    if (creating) return;
    setCreating(true);
    try {
      const id = await createGameSession();
      setWantsNewSession(false);
      setSessionId(id);
    } finally {
      setCreating(false);
    }
  }

  function handleDurationChange(duration: number) {
    if (!session) return;
    setSession((prev) =>
      prev
        ? {
            ...prev,
            nextQuestionDuration: duration,
            ...(prev.phase === 'lobby' ? { questionDuration: duration } : {}),
          }
        : null
    );
    setQuestionDuration(session.id, duration);
  }

  const joinUrl = session
    ? `${window.location.origin}/join?session=${session.id}&code=${session.joinCode}`
    : '';

  return (
    <div className="min-h-screen roman-bg-canvas text-[#F5EFE6] font-sans relative flex flex-col justify-between">
      <MeanderBorder className="fixed top-0 left-0 right-0 z-30 opacity-80" height={12} />

      {/* Top Header Console Bar */}
      <header className="bg-[#0A142B]/95 border-b border-[#C8A752]/30 px-6 py-4 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <AouLogo size="sm" showText={false} />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-serif text-lg font-bold text-[#F0D278] tracking-widest uppercase">
                Admin Console
              </h1>
              {session && (
                <span className="text-xs bg-[#F0D278]/15 text-[#F0D278] border border-[#F0D278]/40 px-2.5 py-0.5 rounded-full font-mono font-bold tracking-wider">
                  {session.joinCode}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#C8BFA8] font-sans tracking-wider uppercase">
              AOU ICPC Orientation Day · Quiz Master
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/questions"
            className="text-xs bg-[#C8A752]/20 hover:bg-[#C8A752]/35 border border-[#C8A752]/50 text-[#F0D278] px-3.5 py-2 rounded-xl font-serif font-bold tracking-wider uppercase transition-all flex items-center gap-2 shadow-sm active:scale-95"
          >
            <span>📜</span>
            <span>Question Management</span>
          </Link>

          {sessionId && (
            <>
              <a
                href={`/present?session=${sessionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-[#C8A752]/15 hover:bg-[#C8A752]/25 active:scale-95 border border-[#C8A752]/40 text-[#F0D278] px-4 py-2 rounded-xl font-serif font-bold tracking-wider uppercase transition-[transform,background-color] duration-75 flex items-center gap-2 shadow-sm"
              >
                <span>📺</span>
                <span>Open Projector View</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Create a new game session? The current session will be detached.')) {
                    sessionStorage.removeItem(SESSION_STORAGE_KEY);
                    setWantsNewSession(true);
                    setSessionId(null);
                  }
                }}
                className="text-xs text-[#C8A752]/70 hover:text-[#F0D278] active:scale-95 px-2 py-1 font-sans uppercase tracking-wider transition-colors duration-75"
              >
                New Session
              </button>
            </>
          )}

          <button
            type="button"
            onClick={async () => {
              await adminSignOut();
              setUser(null);
            }}
            className="text-xs text-red-400/80 hover:text-red-300 active:scale-95 font-sans transition-colors duration-75 uppercase tracking-wider px-2 py-1"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="p-6 max-w-7xl mx-auto w-full flex-1 z-10">
        {/* State 1: No Session */}
        {!sessionId || wantsNewSession || (!session && !sessionLoading) ? (
          <div className="flex flex-col items-center justify-center min-h-[65vh] gap-6 text-center">
            <LaurelWreath size={120} />
            <h2 className="font-serif text-4xl sm:text-5xl font-black text-[#F0D278] tracking-widest uppercase">
              Prepare the Arena
            </h2>
            <p className="text-[#C8BFA8] font-sans max-w-md text-sm leading-relaxed">
              Create an official real-time multiplayer contest session for Orientation Day.
              Attendees will join instantly from their smartphones.
            </p>
            <button
              type="button"
              onClick={handleCreateSession}
              disabled={creating}
              className="gold-button-primary px-12 py-5 rounded-xl text-xl tracking-[0.2em] shadow-2xl active:scale-95 disabled:opacity-50 transition-[transform,filter] duration-75"
            >
              {creating ? 'Initializing Session...' : '⚔ CREATE GAME SESSION'}
            </button>
          </div>
        ) : sessionLoading ? (
          <LoadingScreen />
        ) : session ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ─── Left Column (2 spans): Game Controls ─── */}
            <div className="lg:col-span-2 space-y-6">

              {/* 1. LOBBY PHASE */}
              {session.phase === 'lobby' && (
                <div className="bg-[#0E1A36]/90 border border-[#C8A752]/35 rounded-2xl p-7 sm:p-8 shadow-2xl gold-bevel-card">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="font-serif text-2xl sm:text-3xl font-black text-[#F0D278] tracking-widest uppercase">
                        Waiting Room
                      </h2>
                      <p className="text-[#C8BFA8] text-xs font-sans tracking-wider uppercase mt-1">
                        Share the join code or QR code with attendees
                      </p>
                    </div>
                    <span className="bg-[#C8A752]/20 text-[#F0D278] border border-[#C8A752]/40 text-xs px-3.5 py-1.5 rounded-full uppercase font-sans font-bold tracking-wider">
                      Phase: Lobby
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-[#070D1B]/80 border border-[#C8A752]/25 rounded-2xl p-6">
                    {/* Join Code */}
                    <div className="text-center">
                      <p className="text-[#C8A752]/70 text-xs uppercase tracking-widest mb-2 font-sans font-semibold">
                        Game Join Code
                      </p>
                      <div className="bg-[#0B1630] border-2 border-[#C8A752]/60 rounded-2xl py-4 px-6 inline-block shadow-inner">
                        <span className="font-serif font-black text-5xl xl:text-6xl text-[#F0D278] tracking-[0.25em]">
                          {session.joinCode}
                        </span>
                      </div>
                      <p className="text-[#C8BFA8] text-xs mt-3 font-mono">{joinUrl}</p>
                    </div>

                    {/* QR Code */}
                    <div className="flex flex-col items-center">
                      <p className="text-[#C8A752]/70 text-xs uppercase tracking-widest mb-2 font-sans font-semibold">
                        Scan to Join
                      </p>
                      <div className="bg-white p-3.5 rounded-2xl shadow-xl border border-[#C8A752]/40">
                        <QRCodeSVG value={joinUrl} size={150} level="M" />
                      </div>
                    </div>
                  </div>

                  <GoldDivider className="my-6" />

                  {/* Joined Players Roster */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-white font-sans font-semibold text-sm">
                        <span className="text-[#F0D278] font-bold text-2xl mr-1">{totalPlayers}</span>
                        {' '}Player{totalPlayers !== 1 ? 's' : ''} Connected
                      </p>
                      <span className="text-[#C8A752]/60 text-xs font-sans">
                        Auto-updates as attendees join
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-3.5 bg-[#070D1B]/60 border border-[#C8A752]/20 rounded-xl">
                      {totalPlayers === 0 ? (
                        <p className="text-[#C8A752]/50 text-xs font-serif italic py-2">
                          No players have entered the arena yet. Project or share the join code above!
                        </p>
                      ) : (
                        Object.values(session.players || {}).map((p) => (
                          <span
                            key={p.nickname + p.joinedAt}
                            className="bg-[#C8A752]/15 border border-[#C8A752]/35 text-[#F5EFE6] text-xs px-3 py-1.5 rounded-full font-serif font-semibold"
                          >
                            {p.nickname}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Timer Duration Control (Configures Question 1 & Default) */}
                  <div className="mb-6">
                    <TimerControl
                      currentDuration={activeQuestionDuration}
                      nextDuration={nextQuestionDuration}
                      isQuestionActive={false}
                      onDurationChange={handleDurationChange}
                      label="Trial Duration (Question 1)"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleAction(
                        () =>
                          setSession((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  phase: 'question',
                                  currentQuestionIndex: 0,
                                  questionStartedAt: Date.now(),
                                  questionDuration: nextQuestionDuration,
                                }
                              : null
                          ),
                        () => startGame(session.id, nextQuestionDuration)
                      )
                    }
                    disabled={actionLoading}
                    className="gold-button-primary w-full py-4 rounded-xl text-xl tracking-[0.2em] shadow-xl active:scale-[0.98] transition-[transform,filter] duration-75"
                  >
                    {actionLoading ? 'Commencing Trial...' : '▶ COMMENCE THE QUIZ'}
                  </button>
                  {totalPlayers === 0 && (
                    <p className="text-center text-[#C8A752]/50 text-xs mt-2 font-sans">
                      Tip: Attendees can join at any time before or during the quiz
                    </p>
                  )}
                </div>
              )}

              {/* 2. ACTIVE QUESTION & REVEAL PHASES */}
              {(session.phase === 'question' || session.phase === 'revealing') && currentQ && (
                <div className="bg-[#0E1A36]/90 border border-[#C8A752]/35 rounded-2xl p-7 sm:p-8 shadow-2xl gold-bevel-card">
                  {/* Question Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#F0D278] text-xs uppercase tracking-widest font-sans font-bold">
                          Question {session.currentQuestionIndex + 1} of {sessionQuestions.length}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#C8A752]/15 border border-[#C8A752]/30 text-[#C8A752] font-mono font-semibold">
                          Limit: {activeQuestionDuration}s
                        </span>
                      </div>
                      <p className="text-[#C8BFA8] text-sm font-sans font-medium mt-0.5">
                        {currentQ.category || 'ICPC Question'}
                      </p>
                    </div>

                    <TimerRing
                      startedAt={session.phase === 'question' ? session.questionStartedAt : null}
                      timeLimit={activeQuestionDuration}
                      size={80}
                    />
                  </div>

                  {/* Question Text Box */}
                  <div className="bg-[#070D1B] border border-[#C8A752]/30 rounded-2xl p-6 mb-6 shadow-inner">
                    <h3 className="font-sans text-xl sm:text-2xl font-bold text-white leading-relaxed">
                      {currentQ.text}
                    </h3>
                    {currentQ.type === 'code' && currentQ.code && (
                      <div className="mt-4">
                        <CodeBlock
                          code={currentQ.code}
                          language={currentQ.codeLanguage || 'cpp'}
                          size="md"
                          className="max-h-64 overflow-y-auto"
                        />
                      </div>
                    )}
                  </div>

                  {/* 4 Choices Display */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
                    {currentQ.options.map((opt, i) => (
                      <AnswerOption
                        key={i}
                        index={i}
                        text={opt}
                        correct={session.phase === 'revealing' && i === currentQ.correctIndex}
                        disabled
                        isRevealing={session.phase === 'revealing'}
                      />
                    ))}
                  </div>

                  {/* Real-time Response Progress Bar */}
                  <div className="bg-[#070D1B]/80 border border-[#C8A752]/25 rounded-2xl p-5 mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[#C8A752]/80 font-sans text-xs uppercase tracking-wider font-semibold">
                        Gladiator Responses
                      </span>
                      <span className="text-[#F0D278] font-sans text-sm font-bold">
                        {answeredCount} of {totalPlayers} answered
                      </span>
                    </div>

                    <div className="w-full bg-[#050914] rounded-full h-3 overflow-hidden border border-[#C8A752]/20">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          allAnswered ? 'bg-[#22C55E]' : 'bg-gradient-to-r from-[#C8A752] to-[#F0D278]'
                        }`}
                        style={{ width: `${totalPlayers > 0 ? (answeredCount / totalPlayers) * 100 : 0}%` }}
                      />
                    </div>

                    {session.phase === 'question' && (
                      <div className="mt-3 flex items-center justify-between text-xs font-sans">
                        {allAnswered ? (
                          <span className="text-[#4ADE80] font-bold flex items-center gap-1.5">
                            <span>✓</span> All gladiators have answered! Ready to reveal.
                          </span>
                        ) : isExpired ? (
                          <span className="text-[#EF4444] font-bold flex items-center gap-1.5">
                            <span>⏱</span> Time expired! Finalizing answers...
                          </span>
                        ) : (
                          <span className="text-[#C8BFA8]">
                            Waiting for remaining gladiators or timer to expire ({timeLeft}s left)...
                          </span>
                        )}
                      </div>
                    )}

                    {session.phase === 'revealing' && (
                      <p className="text-[#4ADE80] font-sans text-xs font-bold mt-2.5 flex items-center gap-1.5">
                        <span>✓</span> Answer revealed. Scores and speed bonuses calculated.
                      </p>
                    )}
                  </div>

                  {/* Timer Duration Controller for Next Question */}
                  <div className="mb-6">
                    <TimerControl
                      currentDuration={activeQuestionDuration}
                      nextDuration={nextQuestionDuration}
                      isQuestionActive={session.phase === 'question'}
                      onDurationChange={handleDurationChange}
                      label={`Duration for Question ${(session.currentQuestionIndex + 2) <= QUESTIONS.length ? session.currentQuestionIndex + 2 : 20}`}
                    />
                  </div>

                  {/* ─────────────────────────────────────────────────────────────
                      ADMIN QUESTION CONTROLS
                     ───────────────────────────────────────────────────────────── */}
                  <div className="space-y-3">
                    {session.phase === 'question' && (
                      <button
                        type="button"
                        onClick={() =>
                          handleAction(
                            () =>
                              setSession((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      phase: 'revealing',
                                      questionRevealedAt: Date.now(),
                                    }
                                  : null
                              ),
                            () => revealAnswer(session.id, session)
                          )
                        }
                        disabled={actionLoading}
                        className={`
                          w-full py-4 rounded-xl text-lg font-serif font-black tracking-wider uppercase transition-[transform,background-color] duration-75 shadow-xl active:scale-[0.98]
                          ${allAnswered
                            ? 'gold-button-primary animate-pulse'
                            : 'bg-amber-600 hover:bg-amber-500 text-white border border-amber-400/50'
                          }
                        `}
                      >
                        {actionLoading ? 'Calculating Scores...' : '👁 REVEAL ANSWER & SCORE'}
                      </button>
                    )}

                    {session.phase === 'revealing' && (
                      <div>
                        {session.currentQuestionIndex + 1 < sessionQuestions.length ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleAction(
                                () =>
                                  setSession((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          phase: 'question',
                                          currentQuestionIndex: prev.currentQuestionIndex + 1,
                                          questionStartedAt: Date.now(),
                                          questionRevealedAt: null,
                                          questionDuration: nextQuestionDuration,
                                        }
                                      : null
                                  ),
                                () =>
                                  nextQuestion(
                                    session.id,
                                    session.currentQuestionIndex,
                                    nextQuestionDuration
                                  )
                              )
                            }
                            disabled={actionLoading}
                            className="gold-button-primary w-full py-4 rounded-xl text-xl tracking-[0.15em] shadow-2xl active:scale-[0.98] transition-[transform,filter] duration-75"
                          >
                            {actionLoading
                              ? 'Loading Next Trial...'
                              : `▶ NEXT QUESTION (Advance with ${nextQuestionDuration}s Timer)`}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleAction(
                                () =>
                                  setSession((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          phase: 'finished',
                                          endedAt: Date.now(),
                                        }
                                      : null
                                  ),
                                () => endGame(session.id)
                              )
                            }
                            disabled={actionLoading}
                            className="w-full bg-gradient-to-r from-red-700 via-red-600 to-amber-700 hover:opacity-95 active:scale-[0.98] text-white font-serif font-black text-xl py-4 rounded-xl tracking-[0.15em] uppercase transition-[transform,opacity] duration-75 shadow-2xl border border-amber-300/40"
                          >
                            {actionLoading ? 'Finalizing Champions...' : '🏁 VIEW FINAL RESULTS & CHAMPIONS PODIUM'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. FINISHED PHASE */}
              {session.phase === 'finished' && (
                <div className="bg-[#0E1A36]/90 border border-[#C8A752]/35 rounded-2xl p-8 text-center shadow-2xl gold-bevel-card">
                  <LaurelWreath className="mx-auto mb-3" size={130} />
                  <h2 className="font-serif text-4xl font-black text-[#F0D278] tracking-widest uppercase mb-2">
                    Contest Completed!
                  </h2>
                  <p className="text-[#C8BFA8] font-sans text-sm mb-6 max-w-md mx-auto">
                    The ceremony has concluded. Final rankings and champion honors are live on the presentation projector.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Start a new session from the beginning?')) {
                        sessionStorage.removeItem(SESSION_STORAGE_KEY);
                        setWantsNewSession(true);
                        setSessionId(null);
                      }
                    }}
                    className="gold-button-primary px-10 py-4 rounded-xl text-base tracking-widest uppercase active:scale-95 transition-transform duration-75"
                  >
                    Start New Contest
                  </button>
                </div>
              )}
            </div>

            {/* ─── Right Column (1 span): Live Leaderboard ─── */}
            <div className="space-y-6">
              <div className="bg-[#0E1A36]/90 border border-[#C8A752]/35 rounded-2xl p-6 shadow-2xl gold-bevel-card">
                <LeaderboardPanel
                  entries={leaderboard}
                  maxRows={15}
                  showTitle={true}
                />
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <footer className="py-4 text-center text-[#C8A752]/40 text-xs font-sans tracking-widest uppercase border-t border-[#C8A752]/15 mt-8">
        AOU ICPC Orientation Day · Quiz Master System
      </footer>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen roman-bg-canvas flex items-center justify-center p-6 text-center">
      <div className="space-y-4">
        <AouLogo size="md" />
        <p className="font-serif text-[#F0D278] tracking-widest uppercase text-sm animate-pulse">
          Opening Imperial Records...
        </p>
      </div>
    </div>
  );
}
