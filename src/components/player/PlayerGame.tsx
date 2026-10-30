import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useGameSession } from '../../hooks/useGameSession';
import { useCountdown } from '../../hooks/useCountdown';
import { submitAnswer } from '../../services/gameService';
import { QUESTIONS } from '../../data/questions';
import { buildLeaderboard, countAnsweredPlayers } from '../../utils/gameUtils';
import { AnswerOption } from '../ui/AnswerOption';
import { TimerRing } from '../ui/TimerRing';
import { LeaderboardPanel } from '../ui/LeaderboardPanel';
import { AouLogo, GoldDivider, LaurelWreath, MeanderBorder } from '../ui/RomanDecorations';
import { CodeBlock } from '../ui/CodeBlock';

interface PlayerGameProps {
  sessionId: string;
  playerId: string;
  nickname: string;
  onLeave: () => void;
}

export function PlayerGame({ sessionId, playerId, nickname, onLeave }: PlayerGameProps) {
  const { session, loading, error } = useGameSession(sessionId);

  // Local record of answered questions { [questionId]: answerIndex }
  // Guarantees instant (<16ms) transition without waiting for network round trips
  const [localAnswers, setLocalAnswers] = useState<Record<string, number>>({});
  const [submittingState, setSubmittingState] = useState<{ questionId: string; index: number } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const sessionQuestions = useMemo(
    () => (session?.questions && session.questions.length > 0 ? session.questions : QUESTIONS),
    [session?.questions]
  );

  const currentQ = useMemo(
    () => (session ? sessionQuestions[session.currentQuestionIndex] : null),
    [session, sessionQuestions]
  );

  const activeDuration = session?.questionDuration ?? currentQ?.timeLimit ?? 20;

  // Synchronized countdown for active question (1Hz low-overhead updates)
  const { timeLeft, isExpired } = useCountdown(
    session?.phase === 'question' ? session.questionStartedAt : null,
    activeDuration
  );

  const myPlayer = session?.players?.[playerId];
  const myRecordedAnswer = currentQ ? myPlayer?.answers?.[currentQ.id] : undefined;
  const localRecordedChoice = currentQ ? localAnswers[currentQ.id] : undefined;

  // Player has submitted if recorded in session OR recorded locally
  const hasAnsweredCurrentQuestion = Boolean(
    myRecordedAnswer !== undefined || localRecordedChoice !== undefined
  );

  const myAnswerChoice = myRecordedAnswer?.answerIndex ?? localRecordedChoice;

  // Memoized expensive derivations
  const leaderboard = useMemo(
    () => (session?.players ? buildLeaderboard(session.players) : []),
    [session?.players]
  );

  const myRank = useMemo(
    () => leaderboard.find((e) => e.playerId === playerId)?.rank ?? 1,
    [leaderboard, playerId]
  );

  const myScore = myPlayer?.score ?? 0;

  const totalPlayers = useMemo(
    () => (session?.players ? Object.keys(session.players).length : 0),
    [session?.players]
  );

  const answeredCount = useMemo(
    () => (session && currentQ ? countAnsweredPlayers(session.players || {}, currentQ.id) : 0),
    [session, currentQ]
  );

  // Reset transient submitting state, errors, focus, and scroll on question change
  useEffect(() => {
    setSubmittingState(null);
    setSubmitError(null);
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [currentQ?.id, session?.currentQuestionIndex]);

  // Submit Answer handler with instant visual feedback and parallel network sync
  const handleSelectAnswer = useCallback(async (index: number) => {
    if (
      hasAnsweredCurrentQuestion ||
      submittingState !== null ||
      !currentQ ||
      !session ||
      session.phase !== 'question' ||
      isExpired
    ) {
      return;
    }

    const targetQId = currentQ.id;

    // Instant haptic response
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(35);
      } catch {}
    }

    setSubmittingState({ questionId: targetQId, index });
    setSubmitError(null);

    // Optimistically record choice immediately (0ms transition to waiting screen)
    setLocalAnswers((prev) => ({ ...prev, [targetQId]: index }));

    try {
      await submitAnswer(sessionId, playerId, targetQId, index);
    } catch (err: any) {
      console.error('Answer submission failed:', err);
      // Revert optimistic transition on network failure
      setLocalAnswers((prev) => {
        const copy = { ...prev };
        delete copy[targetQId];
        return copy;
      });
      setSubmitError(err?.message || 'Connection interrupted. Please tap your answer again.');
    } finally {
      setSubmittingState((prev) => (prev?.questionId === targetQId ? null : prev));
    }
  }, [hasAnsweredCurrentQuestion, submittingState, currentQ, session, isExpired, sessionId, playerId]);

  if (loading) return <PlayerLoadingScreen nickname={nickname} />;

  if (error || !session) {
    return (
      <div className="min-h-screen roman-bg-canvas flex items-center justify-center p-6 text-center">
        <div className="bg-[#0E1A36] border border-red-500/50 p-8 rounded-2xl max-w-sm shadow-2xl">
          <p className="text-red-400 font-serif text-xl font-bold mb-3">Arena Disconnected</p>
          <p className="text-[#C8BFA8] text-xs font-sans mb-6">
            Could not synchronize with the arena session.
          </p>
          <button
            onClick={() => {
              sessionStorage.removeItem('aou_player_info');
              onLeave();
            }}
            className="gold-button-primary w-full py-3 rounded-xl text-sm active:scale-95 transition-transform duration-75"
          >
            Return to Gates
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 1: LOBBY (Waiting for game to begin)
  // ─────────────────────────────────────────────────────────────────────────────
  if (session.phase === 'lobby') {
    return (
      <PhoneShell>
        <div className="flex flex-col items-center justify-center min-h-[82vh] gap-6 text-center px-6">
          <AouLogo size="lg" />
          <GoldDivider className="w-full max-w-xs" />

          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-[#C8A752]/15 border border-[#C8A752]/40 text-[#F0D278] text-[11px] font-sans font-bold uppercase tracking-widest mb-2">
              Arena Entrance Granted
            </span>
            <h2 className="font-serif text-3xl font-black text-[#F5EFE6] tracking-wide">
              Ave, {nickname}!
            </h2>
            <p className="text-[#C8A752]/70 font-sans text-xs mt-1 uppercase tracking-wider">
              AOU ICPC Orientation Day Quiz
            </p>
          </div>

          {/* Roster Badge */}
          <div className="bg-[#0E1A36]/90 border border-[#C8A752]/30 rounded-2xl p-6 shadow-2xl w-full max-w-xs gold-bevel-card">
            <p className="text-[#C8A752]/70 text-[11px] uppercase tracking-widest font-sans font-semibold mb-1">
              Gladiators Assembled
            </p>
            <p className="font-serif text-5xl font-black text-[#F0D278]">
              {totalPlayers}
            </p>
            <div className="w-12 h-0.5 bg-[#C8A752]/30 mx-auto my-3" />
            <p className="text-[12px] text-[#C8BFA8] font-sans">
              Stand by. The Quiz Master will commence the trials shortly.
            </p>
          </div>

          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#C8A752]/10 border border-[#C8A752]/30 animate-pulse">
            <div className="w-2.5 h-2.5 rounded-full bg-[#F0D278]" />
            <span className="text-[#F0D278] font-sans text-xs font-semibold tracking-wider">
              Awaiting First Trial...
            </span>
          </div>
        </div>
      </PhoneShell>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 2A: PLAYER WAITING & LEADERBOARD SCREEN (Answer Submitted, awaiting reveal)
  // ─────────────────────────────────────────────────────────────────────────────
  if (session.phase === 'question' && hasAnsweredCurrentQuestion && currentQ) {
    const chosenOptionText = typeof myAnswerChoice === 'number' ? currentQ.options[myAnswerChoice] : null;

    return (
      <PhoneShell>
        <div className="flex flex-col min-h-[88vh] justify-between px-4 py-4 gap-4">
          {/* Top Status Bar */}
          <div className="flex items-center justify-between">
            <span className="text-[#C8A752]/80 font-sans text-xs uppercase tracking-widest font-semibold">
              Question {session.currentQuestionIndex + 1} of {sessionQuestions.length}
            </span>
            <span className="px-3 py-1 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#4ADE80] text-xs font-bold font-sans uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <span>✓</span> Answer Locked
            </span>
          </div>

          {/* Hero Waiting & Sealed Choice Card */}
          <div className="bg-[#0E1A36]/95 border border-[#C8A752]/40 rounded-2xl p-5 text-center shadow-2xl gold-bevel-card">
            <LaurelWreath className="mx-auto mb-2" size={72} />
            <h2 className="font-serif text-2xl font-black text-[#F0D278] uppercase tracking-wider">
              Choice Sealed
            </h2>
            <p className="text-[#C8BFA8] font-sans text-xs mt-0.5 mb-4">
              Your answer has been logged in the imperial registry.
            </p>

            {/* Display Locked Answer */}
            {chosenOptionText && (
              <div className="bg-[#070D1B] border border-[#C8A752]/30 rounded-xl p-3 text-left mb-4">
                <span className="text-[#C8A752]/60 text-[10px] font-sans uppercase tracking-widest font-semibold block mb-1">
                  Your Locked Answer
                </span>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-[#C8A752]/20 border border-[#C8A752]/40 text-[#F0D278] font-serif font-black text-xs flex items-center justify-center shrink-0">
                    {String.fromCharCode(65 + (myAnswerChoice ?? 0))}
                  </span>
                  <span className="text-white font-sans text-xs font-semibold leading-tight line-clamp-2">
                    {chosenOptionText}
                  </span>
                </div>
              </div>
            )}

            {/* Current Gladiator Stats */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="bg-[#070D1B] border border-[#C8A752]/20 rounded-xl p-3">
                <p className="text-[#C8A752]/60 text-[10px] font-sans uppercase tracking-widest font-semibold">
                  Current Rank
                </p>
                <p className="font-serif text-2xl font-black text-[#F0D278] mt-0.5">
                  #{myRank}
                </p>
              </div>

              <div className="bg-[#070D1B] border border-[#C8A752]/20 rounded-xl p-3">
                <p className="text-[#C8A752]/60 text-[10px] font-sans uppercase tracking-widest font-semibold">
                  Total Score
                </p>
                <p className="font-serif text-2xl font-black text-white mt-0.5">
                  {myScore.toLocaleString()} <span className="text-xs text-[#C8A752]/60 font-sans font-normal">PTS</span>
                </p>
              </div>
            </div>

            {/* Arena Progress Meter */}
            <div className="bg-[#070D1B]/80 border border-[#C8A752]/20 rounded-xl p-3 text-left">
              <div className="flex items-center justify-between text-xs font-sans mb-1.5">
                <span className="text-[#C8BFA8]">Gladiators Answered:</span>
                <span className="text-[#F0D278] font-bold">
                  {answeredCount} / {totalPlayers}
                </span>
              </div>
              <div className="w-full bg-[#050914] h-2 rounded-full overflow-hidden border border-[#C8A752]/15">
                <div
                  className="h-full bg-gradient-to-r from-[#C8A752] to-[#F0D278] rounded-full transition-all duration-300"
                  style={{ width: `${totalPlayers > 0 ? (answeredCount / totalPlayers) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Leaderboard Standings Preview */}
          <div className="bg-[#0E1A36]/80 border border-[#C8A752]/25 rounded-2xl p-4 flex-1 overflow-hidden flex flex-col">
            <p className="text-[#C8A752]/80 text-[11px] font-serif uppercase tracking-widest font-bold mb-2 text-center">
              Current Arena Standings
            </p>
            <div className="flex-1 overflow-y-auto max-h-[28vh] pr-1">
              <LeaderboardPanel
                entries={leaderboard}
                maxRows={8}
                highlightPlayerId={playerId}
                showTitle={false}
              />
            </div>
          </div>

          {/* Bottom Countdown & Status */}
          <div className="text-center space-y-1.5 pt-1">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0E1A36] border border-[#C8A752]/30 text-[#C8A752] text-xs font-sans font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#F0D278] animate-ping" />
              <span>Time Remaining: <strong className="text-white font-mono">{timeLeft}s</strong></span>
            </div>
            <p className="text-[#C8A752]/50 font-sans text-[11px] uppercase tracking-wider block">
              Waiting for the Quiz Master to conclude the trial...
            </p>
          </div>
        </div>
      </PhoneShell>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 2B: ACTIVE QUESTION SCREEN (Player has not yet answered)
  // ─────────────────────────────────────────────────────────────────────────────
  if (session.phase === 'question' && currentQ) {
    return (
      <PhoneShell>
        <div className="flex flex-col min-h-[92vh] justify-between px-4 py-4 gap-4">
          {/* Top Progress Line */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-[#C8A752]/80 font-sans text-xs uppercase tracking-widest font-bold">
                  Question {session.currentQuestionIndex + 1} <span className="text-[#C8A752]/40">/ {sessionQuestions.length}</span>
                </span>
                {currentQ.category && (
                  <p className="text-[#C8BFA8] text-[11px] font-sans font-medium">{currentQ.category}</p>
                )}
              </div>

              <TimerRing
                startedAt={session.questionStartedAt}
                timeLimit={activeDuration}
                size={74}
              />
            </div>

            <div className="w-full bg-[#0E1A36] h-1.5 rounded-full overflow-hidden border border-[#C8A752]/20">
              <div
                className="h-full bg-gradient-to-r from-[#C8A752] to-[#F0D278] rounded-full transition-all duration-300"
                style={{ width: `${((session.currentQuestionIndex + 1) / QUESTIONS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Text Box */}
          <div className="bg-[#0E1A36]/95 border border-[#C8A752]/35 rounded-2xl p-4 sm:p-5 shadow-2xl gold-bevel-card">
            <h2 className="font-sans text-base sm:text-lg font-bold text-white text-center leading-relaxed">
              {currentQ.text}
            </h2>
            {currentQ.type === 'code' && currentQ.code && (
              <CodeBlock
                code={currentQ.code}
                language={currentQ.codeLanguage || 'cpp'}
                size="md"
                className="mt-3.5 max-h-64 overflow-y-auto"
              />
            )}
          </div>

          {/* Error Message with Tap to Retry */}
          {submitError && (
            <div className="bg-red-950/90 border border-red-500 text-red-200 text-xs px-4 py-3 rounded-xl text-center font-sans shadow-lg flex flex-col items-center gap-1.5 animate-shake">
              <span>{submitError}</span>
              <span className="text-amber-300 font-bold uppercase tracking-wider text-[11px]">Tap an option below to retry</span>
            </div>
          )}

          {/* 4 Choices with Immediate Touch Response */}
          <div className="grid grid-cols-1 gap-2.5 sm:gap-3 my-auto">
            {currentQ.options.map((opt, i) => (
              <AnswerOption
                key={`${currentQ.id}_opt_${i}`}
                index={i}
                text={opt}
                selected={submittingState?.questionId === currentQ.id && submittingState?.index === i}
                disabled={Boolean(submittingState && submittingState.questionId === currentQ.id) || isExpired}
                onClick={() => handleSelectAnswer(i)}
              />
            ))}
          </div>

          {/* Status footer */}
          <div className="text-center py-1">
            {submittingState && submittingState.questionId === currentQ.id ? (
              <p className="text-[#F0D278] font-sans text-xs font-semibold uppercase tracking-wider animate-pulse">
                Sealing your choice in the imperial registry...
              </p>
            ) : isExpired ? (
              <p className="text-[#EF4444] font-sans text-xs font-bold uppercase tracking-wider">
                Time expired! Awaiting trial reveal...
              </p>
            ) : (
              <p className="text-[#C8A752]/60 font-sans text-xs uppercase tracking-wider">
                Tap your answer to seal your score
              </p>
            )}
          </div>
        </div>
      </PhoneShell>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 3: REVEALING ANSWER (Correct answer unveiled, scores awarded)
  // ─────────────────────────────────────────────────────────────────────────────
  if (session.phase === 'revealing' && currentQ) {
    const isCorrect = myRecordedAnswer?.isCorrect === true;
    const points = myRecordedAnswer?.pointsEarned ?? 0;
    const didSubmit = myRecordedAnswer !== undefined || localRecordedChoice !== undefined;
    const playerChosenIndex = myRecordedAnswer?.answerIndex ?? localRecordedChoice;

    return (
      <PhoneShell>
        <div className="flex flex-col min-h-[90vh] justify-between px-4 py-5 gap-4">
          {/* Result Outcome Header */}
          <div
            className={`rounded-2xl p-5 text-center border shadow-2xl transition-all duration-300 ${
              isCorrect
                ? 'bg-[#0A2E1C]/90 border-[#22C55E] shadow-[0_0_30px_rgba(34,197,94,0.3)]'
                : didSubmit
                ? 'bg-[#2D0D14]/90 border-[#EF4444] shadow-[0_0_25px_rgba(239,68,68,0.25)]'
                : 'bg-[#0E1A36]/90 border-[#C8A752]/30'
            }`}
          >
            <div className="text-4xl mb-1">{isCorrect ? '⚡' : didSubmit ? '✗' : '⏱'}</div>
            <h2
              className={`font-serif text-2xl sm:text-3xl font-black uppercase tracking-wider ${
                isCorrect ? 'text-[#4ADE80]' : didSubmit ? 'text-[#F87171]' : 'text-[#C8BFA8]'
              }`}
            >
              {isCorrect ? 'VICTORY!' : didSubmit ? 'DEFEAT' : 'TIME EXPIRED'}
            </h2>

            {isCorrect ? (
              <div className="mt-1">
                <p className="font-serif font-black text-2xl sm:text-3xl text-[#F0D278]">
                  +{points.toLocaleString()} <span className="text-xs uppercase font-sans text-[#F0D278]/70">PTS</span>
                </p>
                <p className="text-[#4ADE80] font-sans text-[11px] font-semibold mt-0.5">
                  1,000 Base + Speed Bonus Awarded!
                </p>
              </div>
            ) : (
              <p className="text-[#C8BFA8] font-sans text-xs mt-1">
                0 points awarded for this trial
              </p>
            )}
          </div>

          {/* Question Text */}
          <div className="bg-[#0E1A36]/80 border border-[#C8A752]/25 rounded-xl px-4 py-3 text-center">
            <p className="font-sans font-medium text-sm text-[#F5EFE6]">
              {currentQ.text}
            </p>
            {currentQ.type === 'code' && currentQ.code && (
              <CodeBlock
                code={currentQ.code}
                language={currentQ.codeLanguage || 'cpp'}
                size="sm"
                className="mt-2.5 max-h-48 overflow-y-auto"
              />
            )}
          </div>

          {/* Highlighted Choices with Revealed Answer */}
          <div className="space-y-2.5 my-auto">
            {currentQ.options.map((opt, i) => (
              <AnswerOption
                key={`${currentQ.id}_rev_${i}`}
                index={i}
                text={opt}
                correct={i === currentQ.correctIndex}
                incorrect={playerChosenIndex === i && i !== currentQ.correctIndex}
                disabled
                isRevealing
              />
            ))}
          </div>

          {/* Imperial Explanation during Reveal */}
          {Boolean(currentQ.explanation?.trim()) && (
            <div className="bg-[#070D1B] border border-[#22C55E]/40 rounded-xl p-3 text-xs font-sans text-[#E8E2D5] space-y-1 animate-fade-in shadow-inner">
              <span className="text-[#4ADE80] font-bold uppercase tracking-wider text-[10px] block">
                Imperial Explanation
              </span>
              <p className="leading-relaxed">{currentQ.explanation}</p>
            </div>
          )}

          {/* Current Ranking Bar */}
          <div className="bg-[#0E1A36] border border-[#C8A752]/30 rounded-xl p-3.5 flex items-center justify-between px-6 shadow-md">
            <div>
              <span className="text-[#C8A752]/60 text-[10px] font-sans uppercase tracking-widest font-semibold block">
                Current Standing
              </span>
              <span className="font-serif text-2xl font-black text-[#F0D278]">
                #{myRank} <span className="text-xs font-sans text-[#C8BFA8] font-normal">of {totalPlayers}</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[#C8A752]/60 text-[10px] font-sans uppercase tracking-widest font-semibold block">
                Total Score
              </span>
              <span className="font-serif text-2xl font-black text-white">
                {myScore.toLocaleString()} <span className="text-xs font-sans text-[#C8A752]/60 font-normal">PTS</span>
              </span>
            </div>
          </div>

          <p className="text-center text-[#F0D278]/70 text-xs font-sans font-semibold uppercase tracking-widest animate-pulse py-1">
            Standing by for the Next Trial...
          </p>
        </div>
      </PhoneShell>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 4: LEADERBOARD INTERMISSION
  // ─────────────────────────────────────────────────────────────────────────────
  if (session.phase === 'leaderboard') {
    return (
      <PhoneShell>
        <div className="flex flex-col min-h-[90vh] justify-between px-4 py-5 gap-4">
          <div className="text-center">
            <LaurelWreath small className="mx-auto mb-1" />
            <h2 className="font-serif text-2xl font-black text-[#F0D278] uppercase tracking-widest">
              Imperial Standings
            </h2>
            <p className="text-[#F5EFE6] font-sans text-xs mt-1">
              You are currently placed <strong className="text-[#F0D278] font-bold">#{myRank}</strong> with <strong className="text-white">{myScore.toLocaleString()} pts</strong>
            </p>
          </div>

          <GoldDivider />

          <div className="flex-1 overflow-y-auto max-h-[55vh] pr-1">
            <LeaderboardPanel
              entries={leaderboard}
              maxRows={12}
              highlightPlayerId={playerId}
              showTitle={false}
            />
          </div>

          <p className="text-center text-[#F0D278]/70 text-xs font-sans font-semibold uppercase tracking-widest animate-pulse mt-auto py-2">
            The next trial will commence shortly...
          </p>
        </div>
      </PhoneShell>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 5: TOURNAMENT FINISHED / FINAL RANKINGS
  // ─────────────────────────────────────────────────────────────────────────────
  if (session.phase === 'finished') {
    const myEntry = leaderboard.find((e) => e.playerId === playerId);
    return (
      <PhoneShell>
        <div className="flex flex-col min-h-[92vh] justify-between px-4 py-6 gap-5 text-center">
          <LaurelWreath className="mx-auto" size={90} />

          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-[#C8A752]/20 border border-[#C8A752]/40 text-[#F0D278] text-[11px] font-sans font-bold uppercase tracking-widest mb-1.5">
              Arena Closed
            </span>
            <h1 className="font-serif text-3xl font-black text-white uppercase tracking-wider">
              Final Honor Roll
            </h1>
            <p className="text-[#C8BFA8] font-sans text-xs mt-0.5">
              AOU ICPC Orientation Day Champions
            </p>
          </div>

          {myEntry && (
            <div className="bg-[#0E1A36]/90 border border-[#C8A752]/40 rounded-2xl p-5 shadow-2xl gold-bevel-card">
              <p className="text-[#C8A752]/70 text-xs uppercase tracking-widest font-sans font-semibold mb-1">
                Your Final Placement
              </p>
              <p className="font-serif text-5xl font-black text-[#F0D278]">
                #{myEntry.rank}
              </p>
              <GoldDivider className="my-2 max-w-xs mx-auto" />
              <p className="font-serif text-2xl font-bold text-white">
                {myEntry.score.toLocaleString()} <span className="text-xs uppercase font-sans text-[#C8A752]/60 font-normal">PTS</span>
              </p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto max-h-[38vh] pr-1">
            <LeaderboardPanel
              entries={leaderboard}
              maxRows={10}
              highlightPlayerId={playerId}
              showTitle={false}
            />
          </div>

          <button
            onClick={() => {
              sessionStorage.removeItem('aou_player_info');
              onLeave();
            }}
            className="text-[#C8A752]/60 hover:text-[#F0D278] active:scale-95 text-xs font-sans uppercase tracking-widest underline mt-auto py-2 transition-transform duration-75"
          >
            Leave the Arena
          </button>
        </div>
      </PhoneShell>
    );
  }

  return null;
}

function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen roman-bg-canvas text-[#F5EFE6] relative overflow-hidden flex flex-col justify-between">
      <MeanderBorder className="fixed top-0 left-0 right-0 z-20 opacity-80" height={10} />
      <div className="relative z-10 flex-1 pt-3 pb-3 max-w-md mx-auto w-full">{children}</div>
      <MeanderBorder className="fixed bottom-0 left-0 right-0 z-20 opacity-80" height={10} />
    </div>
  );
}

function PlayerLoadingScreen({ nickname }: { nickname: string }) {
  return (
    <div className="min-h-screen roman-bg-canvas flex items-center justify-center p-4">
      <div className="text-center space-y-3">
        <AouLogo size="md" />
        <p className="text-[#F0D278] font-serif tracking-widest uppercase text-sm animate-pulse">
          Entering the Gates, {nickname}...
        </p>
      </div>
    </div>
  );
}
