import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useGameSession } from '../../hooks/useGameSession';
import { getActiveSessionId } from '../../services/gameService';
import { QUESTIONS } from '../../data/questions';
import { buildLeaderboard } from '../../utils/gameUtils';
import { TimerRing } from '../ui/TimerRing';
import { AnswerOption } from '../ui/AnswerOption';
import { AouLogo, GoldDivider, LaurelWreath, MeanderBorder } from '../ui/RomanDecorations';
import { CodeBlock } from '../ui/CodeBlock';

const PODIUM_MEDAL_COLORS = ['#F0D278', '#D1D5DB', '#CD7F32'];

export function PresentationScreen() {
  const [params] = useSearchParams();
  const urlSessionId = params.get('session');
  const [activeId, setActiveId] = useState<string | null>(urlSessionId);

  useEffect(() => {
    if (!urlSessionId) {
      getActiveSessionId().then((id) => {
        if (id) setActiveId(id);
      });
    } else {
      setActiveId(urlSessionId);
    }
  }, [urlSessionId]);

  const { session, loading } = useGameSession(activeId);

  // Keep display awake during event
  useEffect(() => {
    if ('wakeLock' in navigator) {
      try {
        (navigator as any).wakeLock.request('screen').catch(() => { });
      } catch { }
    }
  }, []);

  if (loading) return <PresentLoading />;
  if (!activeId) return <PresentError message="No active contest found. Please start a session from the Admin Dashboard." />;
  if (!session) return <PresentError message="Session not found or has been closed." />;

  const sessionQuestions = session.questions && session.questions.length > 0 ? session.questions : QUESTIONS;
  const currentQ = sessionQuestions[session.currentQuestionIndex];
  const activeDuration = session.questionDuration ?? currentQ?.timeLimit ?? 20;
  const leaderboard = session.players ? buildLeaderboard(session.players) : [];
  const totalPlayers = Object.keys(session.players || {}).length;

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. LOBBY
  // ─────────────────────────────────────────────────────────────────────────────
  if (session.phase === 'lobby') {
    const joinUrl = `${window.location.origin}/join?session=${session.id}&code=${session.joinCode}`;
    return (
      <PresentShell>
        <div className="flex flex-col items-center justify-center h-full gap-7 px-12 z-10 my-auto">
          <AouLogo size="xl" />
          <GoldDivider className="w-full max-w-xl" />

          <div className="text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#C8A752]/20 border border-[#C8A752]/40 text-[#F0D278] text-sm font-sans font-bold uppercase tracking-[0.25em] mb-3">
              AOU ICPC COMMUNITY · ORIENTATION DAY
            </span>
            <h1 className="font-serif text-6xl xl:text-7xl font-black text-white tracking-[0.1em] uppercase leading-none">
              ENTER THE ARENA
            </h1>
          </div>

          <div className="flex flex-row items-center justify-center gap-12 mt-2 bg-[#0E1A36]/90 border-2 border-[#C8A752]/45 rounded-3xl p-9 shadow-2xl backdrop-blur-md gold-bevel-card">
            {/* QR Code */}
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-2xl shadow-xl border-2 border-[#C8A752]/40">
                <QRCodeSVG value={joinUrl} size={190} level="M" />
              </div>
              <p className="text-[#C8BFA8] text-xs font-sans uppercase tracking-widest mt-3.5 font-semibold">
                Point Phone Camera to Scan
              </p>
            </div>

            <div className="w-[1px] h-52 bg-gradient-to-b from-transparent via-[#C8A752]/40 to-transparent hidden sm:block" />

            {/* Room Code */}
            <div className="text-center flex flex-col items-center justify-center">
              <p className="text-[#C8A752]/80 text-sm uppercase tracking-widest font-sans mb-3 font-semibold">
                Or Enter Code at <span className="text-white underline font-mono">{window.location.host}/join</span>
              </p>
              <div className="bg-[#070D1B] border-3 border-[#C8A752]/70 rounded-2xl px-10 py-5 shadow-inner">
                <span className="font-serif font-black text-6xl xl:text-7xl text-[#F0D278] tracking-[0.25em]">
                  {session.joinCode}
                </span>
              </div>
              <p className="text-[#C8BFA8] text-xs mt-4 font-sans tracking-wider">
                Instant real-time entry · No app download required
              </p>
            </div>
          </div>

          <div className="mt-2 text-center">
            <p className="text-[#C8BFA8] font-sans text-xl">
              <span className="text-[#F0D278] font-serif font-black text-3xl mr-1.5">{totalPlayers}</span>
              {' '}Gladiator{totalPlayers !== 1 ? 's' : ''} have entered the arena
            </p>
          </div>
        </div>
      </PresentShell>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. ACTIVE QUESTION
  // ─────────────────────────────────────────────────────────────────────────────
  if (session.phase === 'question' && currentQ) {
    return (
      <PresentShell>
        <div className="flex flex-col h-full px-12 xl:px-20 py-8 gap-6 z-10 justify-between">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[#F0D278] text-sm uppercase tracking-widest font-sans font-bold block mb-1">
                {currentQ.category || 'AOU ICPC Orientation Quiz'}
              </span>
              <p className="font-serif text-3xl xl:text-4xl text-white font-bold">
                Question {session.currentQuestionIndex + 1} <span className="text-[#C8A752]/40 text-2xl">/ {sessionQuestions.length}</span>
              </p>
            </div>

            <TimerRing
              startedAt={session.questionStartedAt}
              timeLimit={activeDuration}
              size={120}
            />

            <div className="text-right">
              <AouLogo size="sm" showText={false} />
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[#0E1A36] h-2 rounded-full overflow-hidden border border-[#C8A752]/20">
            <div
              className="h-full bg-gradient-to-r from-[#C8A752] to-[#F0D278] rounded-full transition-all duration-300"
              style={{ width: `${((session.currentQuestionIndex + 1) / sessionQuestions.length) * 100}%` }}
            />
          </div>

          {/* Question Box */}
          <div className="bg-[#0E1A36]/95 border-2 border-[#C8A752]/40 rounded-3xl px-12 py-8 flex-1 flex flex-col items-center justify-center shadow-2xl gold-bevel-card">
            <h2 className="font-sans text-2xl xl:text-4xl font-bold text-white text-center leading-relaxed max-w-5xl">
              {currentQ.text}
            </h2>
            {currentQ.type === 'code' && currentQ.code && (
              <div className="w-full max-w-4xl mt-5">
                <CodeBlock
                  code={currentQ.code}
                  language={currentQ.codeLanguage || 'cpp'}
                  size="lg"
                  className="max-h-[38vh] overflow-y-auto"
                />
              </div>
            )}
          </div>

          {/* 2x2 Grid Choices */}
          <div className="grid grid-cols-2 gap-5">
            {currentQ.options.map((opt, i) => (
              <AnswerOption key={i} index={i} text={opt} disabled large />
            ))}
          </div>
        </div>
      </PresentShell>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. REVEALING ANSWER & LIVE LEADERBOARD
  // ─────────────────────────────────────────────────────────────────────────────
  if (session.phase === 'revealing' && currentQ) {
    const top5 = leaderboard.slice(0, 5);

    return (
      <PresentShell>
        <div className="flex flex-col h-full px-12 xl:px-20 py-8 gap-5 z-10 justify-between">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[#4ADE80] text-sm uppercase tracking-widest font-sans font-bold flex items-center gap-1.5 mb-1">
                <span>✓</span> Imperial Truth Revealed
              </span>
              <p className="font-serif text-3xl text-white font-bold">
                Question {session.currentQuestionIndex + 1} Concluded
              </p>
            </div>

            <div className="text-right">
              <AouLogo size="sm" showText={false} />
            </div>
          </div>

          {/* Question Banner */}
          <div className="bg-[#0E1A36]/90 border border-[#C8A752]/30 rounded-2xl px-8 py-4 text-center">
            <p className="font-sans font-semibold text-xl xl:text-2xl text-white">
              {currentQ.text}
            </p>
            {currentQ.type === 'code' && currentQ.code && (
              <div className="w-full max-w-3xl mx-auto mt-3">
                <CodeBlock
                  code={currentQ.code}
                  language={currentQ.codeLanguage || 'cpp'}
                  size="md"
                  className="max-h-40 overflow-y-auto"
                />
              </div>
            )}
          </div>

          {/* Main Grid: Left = Choices, Right = Current Standings */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch">
            {/* 4 Choices (7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-3.5">
              {currentQ.options.map((opt, i) => (
                <AnswerOption
                  key={i}
                  index={i}
                  text={opt}
                  correct={i === currentQ.correctIndex}
                  disabled
                  large
                  isRevealing
                />
              ))}

              {/* Optional Imperial Explanation */}
              {Boolean(currentQ.explanation?.trim()) && (
                <div className="bg-[#070D1B] border border-[#22C55E]/40 rounded-xl p-4 text-sm font-sans text-[#E8E2D5] space-y-1 animate-fade-in shadow-inner">
                  <span className="text-[#4ADE80] font-bold uppercase tracking-wider text-xs block">
                    Imperial Explanation
                  </span>
                  <p className="leading-relaxed">{currentQ.explanation}</p>
                </div>
              )}
            </div>

            {/* Standings Snippet (5 cols) */}
            <div className="lg:col-span-5 bg-[#0E1A36]/90 border border-[#C8A752]/35 rounded-2xl p-6 shadow-2xl flex flex-col justify-between gold-bevel-card">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-serif text-lg font-bold text-[#F0D278] tracking-widest uppercase">
                    Arena Standings
                  </h3>
                  <span className="text-xs text-[#C8A752]/60 font-sans">
                    Round {session.currentQuestionIndex + 1}
                  </span>
                </div>

                <div className="space-y-2">
                  {top5.map((entry) => (
                    <div
                      key={entry.playerId}
                      className="flex items-center gap-3 bg-[#081024] border border-[#C8A752]/20 rounded-xl px-4 py-2.5"
                    >
                      <span className="font-serif font-black text-sm text-[#F0D278] w-6">
                        #{entry.rank}
                      </span>
                      <span className="font-sans font-semibold text-white truncate flex-1 text-sm">
                        {entry.nickname}
                      </span>
                      <span className="font-serif font-bold text-[#F0D278] text-sm">
                        {entry.score.toLocaleString()} <span className="text-[10px] font-sans text-[#C8A752]/60">PTS</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-center text-[#C8A752]/50 font-sans text-xs uppercase tracking-widest mt-4">
                Quiz Master advancing to next round...
              </p>
            </div>
          </div>
        </div>
      </PresentShell>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. TOURNAMENT FINISHED: CHAMPIONS PODIUM
  // ─────────────────────────────────────────────────────────────────────────────
  if (session.phase === 'finished') {
    const top3 = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3, 11);

    return (
      <PresentShell>
        <div className="flex flex-col h-full px-12 xl:px-20 py-8 gap-6 z-10 justify-between">
          <div className="text-center">
            <LaurelWreath className="mx-auto mb-2" size={140} />
            <h1 className="font-serif text-5xl xl:text-6xl font-black text-[#F0D278] tracking-[0.2em] uppercase mt-2">
              CHAMPIONS OF THE ARENA
            </h1>
            <p className="font-sans text-[#C8BFA8] text-base mt-1 tracking-widest uppercase font-semibold">
              AOU ICPC Orientation Day · Final Honor Roll
            </p>
            <GoldDivider className="mt-4 max-w-lg mx-auto" />
          </div>

          {/* Grand 3-Tier Podium */}
          <div className="flex items-end justify-center gap-8 xl:gap-14 flex-1 my-4">
            {/* 2nd Place */}
            {top3[1] && <PresentationPodiumBlock entry={top3[1]} height="h-44" rank={2} />}
            {/* 1st Place */}
            {top3[0] && <PresentationPodiumBlock entry={top3[0]} height="h-60" rank={1} isWinner />}
            {/* 3rd Place */}
            {top3[2] && <PresentationPodiumBlock entry={top3[2]} height="h-36" rank={3} />}
          </div>

          {/* Runners-Up (Positions 4–10) */}
          {rest.length > 0 && (
            <div className="grid grid-cols-4 gap-3 bg-[#0E1A36]/80 border border-[#C8A752]/25 rounded-2xl p-4">
              {rest.map((entry) => (
                <div
                  key={entry.playerId}
                  className="flex items-center gap-2 bg-[#081024] border border-[#C8A752]/20 rounded-xl px-3 py-2 text-xs"
                >
                  <span className="text-[#C8A752]/70 font-serif font-black">#{entry.rank}</span>
                  <span className="font-sans font-medium text-white truncate flex-1">{entry.nickname}</span>
                  <span className="font-serif font-bold text-[#F0D278]">{entry.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-center font-sans text-[#C8A752]/40 text-xs tracking-[0.3em] uppercase">
            AOU ICPC COMMUNITY · PROBLEM SOLVING · 2025–2026
          </p>
        </div>
      </PresentShell>
    );
  }

  return null;
}

function PresentationPodiumBlock({
  entry,
  height,
  rank,
  isWinner = false,
}: {
  entry: { rank: number; nickname: string; score: number };
  height: string;
  rank: number;
  isWinner?: boolean;
}) {
  const medalColor = PODIUM_MEDAL_COLORS[rank - 1] || '#C8A752';
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="flex flex-col items-center gap-2">
      {isWinner && <div className="text-5xl animate-bounce mb-1">👑</div>}
      <div className="text-4xl">{medals[rank - 1]}</div>

      <div className="text-center">
        <p
          className={`font-serif font-black truncate max-w-[190px] ${isWinner ? 'text-3xl text-[#F0D278]' : 'text-xl text-white'
            }`}
        >
          {entry.nickname}
        </p>
        <p className="font-serif font-semibold text-[#F5EFE6] text-base">
          {entry.score.toLocaleString()} <span className="text-xs uppercase font-sans text-[#C8A752]/60">PTS</span>
        </p>
      </div>

      <div
        className={`w-36 ${height} flex items-center justify-center rounded-t-2xl shadow-2xl transition-all duration-500`}
        style={{
          background: `linear-gradient(to top, ${medalColor}44, ${medalColor}11)`,
          border: `2px solid ${medalColor}88`,
          borderBottom: 'none',
        }}
      >
        <span className="font-serif font-black text-5xl" style={{ color: medalColor }}>
          #{rank}
        </span>
      </div>
    </div>
  );
}

function PresentShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen h-screen roman-bg-canvas text-[#F5EFE6] overflow-hidden relative flex flex-col justify-between">
      <MeanderBorder className="fixed top-0 left-0 right-0 z-30 opacity-80" height={14} />
      <div className="relative z-10 h-full pt-5 pb-5">{children}</div>
      <MeanderBorder className="fixed bottom-0 left-0 right-0 z-30 opacity-80" height={14} />
    </div>
  );
}

function PresentLoading() {
  return (
    <div className="min-h-screen roman-bg-canvas flex items-center justify-center">
      <div className="text-center">
        <AouLogo size="lg" />
        <p className="text-[#F0D278] font-serif mt-4 tracking-widest uppercase animate-pulse">
          Summoning the Arena...
        </p>
      </div>
    </div>
  );
}

function PresentError({ message }: { message: string }) {
  return (
    <div className="min-h-screen roman-bg-canvas flex items-center justify-center p-6">
      <div className="text-center text-red-400 font-sans max-w-md bg-[#0E1A36] border border-red-500/40 p-8 rounded-2xl shadow-2xl">
        <p className="font-serif text-2xl mb-2 text-red-300 font-bold uppercase">Arena Display Notice</p>
        <p className="text-sm opacity-80">{message}</p>
      </div>
    </div>
  );
}
