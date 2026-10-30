import React, { useState, useEffect } from 'react';
import { resolveSessionByCode, joinSession, getActiveSessionId } from '../../services/gameService';
import { AouLogo, GoldDivider, MeanderBorder } from '../ui/RomanDecorations';

const STORAGE_KEY = 'aou_player_info';

interface PlayerInfo {
  sessionId: string;
  playerId: string;
  nickname: string;
  joinCode: string;
}

interface JoinScreenProps {
  initialCode?: string;
  initialSessionId?: string;
  onJoined: (info: PlayerInfo) => void;
}

export function JoinScreen({ initialCode = '', initialSessionId = '', onJoined }: JoinScreenProps) {
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
    }
  }, [initialCode]);

  // Restore saved session only if it matches current URL parameters
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const info = JSON.parse(saved) as PlayerInfo;
        // If user scanned a different code or session, clear old state
        if (initialCode && info.joinCode !== initialCode.toUpperCase()) {
          sessionStorage.removeItem(STORAGE_KEY);
          return;
        }
        if (initialSessionId && info.sessionId !== initialSessionId) {
          sessionStorage.removeItem(STORAGE_KEY);
          return;
        }
        onJoined(info);
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [initialCode, initialSessionId, onJoined]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const cleanCode = code.trim().toUpperCase();
    const cleanNick = nickname.trim();

    if (cleanCode.length < 6 && !initialSessionId) {
      setError('Please enter the full 6-character arena code.');
      return;
    }
    if (cleanNick.length < 2) {
      setError('Gladiator name must be at least 2 characters.');
      return;
    }
    if (cleanNick.length > 20) {
      setError('Gladiator name must be 20 characters or less.');
      return;
    }

    setLoading(true);
    try {
      let resolvedId = initialSessionId;
      if (!resolvedId && cleanCode) {
        resolvedId = (await resolveSessionByCode(cleanCode)) || '';
      }
      if (!resolvedId) {
        resolvedId = (await getActiveSessionId()) || '';
      }

      if (!resolvedId) {
        setError('Arena session not found. Verify the code on the screen or scan the QR code.');
        return;
      }

      const playerId = await joinSession(resolvedId, cleanNick);
      const info: PlayerInfo = {
        sessionId: resolvedId,
        playerId,
        nickname: cleanNick,
        joinCode: cleanCode || 'ARENA',
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(info));
      onJoined(info);
    } catch (err: any) {
      console.error('Join error:', err);
      setError('Failed to enter the arena. Please retry.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen roman-bg-canvas flex flex-col items-center justify-between p-4 relative">
      <MeanderBorder className="fixed top-0 left-0 right-0 z-20 opacity-80" height={10} />

      <div className="relative z-10 w-full max-w-sm my-auto py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <AouLogo size="lg" className="mb-3" />
          <GoldDivider className="my-3 max-w-xs mx-auto" />
          <h1 className="font-serif text-3xl font-black text-white tracking-[0.1em] uppercase">
            ENTER THE ARENA
          </h1>
          <p className="font-sans text-[#F0D278] text-xs mt-1 tracking-widest uppercase font-semibold">
            Orientation Day 2025–2026
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0E1A36]/95 border border-[#C8A752]/35 rounded-2xl p-7 shadow-2xl gold-bevel-card">
          <form onSubmit={handleJoin} className="space-y-4">
            {/* Game Code */}
            <div>
              <label className="block font-sans text-[#F0D278] text-xs uppercase tracking-widest mb-1.5 font-bold">
                Arena Game Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
                }
                className="w-full bg-[#070D1B] border-2 border-[#C8A752]/40 focus:border-[#F0D278] text-[#F0D278] text-3xl font-serif font-black text-center rounded-xl py-3.5 tracking-[0.35em] uppercase transition-all focus:outline-none shadow-inner"
                placeholder="ABCDEF"
                maxLength={6}
                autoComplete="off"
                autoCapitalize="characters"
                required
              />
            </div>

            {/* Nickname */}
            <div>
              <label className="block font-sans text-[#F0D278] text-xs uppercase tracking-widest mb-1.5 font-bold">
                Your Gladiator Name / Handle
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full bg-[#070D1B] border border-[#C8A752]/40 focus:border-[#F0D278] text-white rounded-xl px-4 py-3 font-sans text-base transition-all focus:outline-none shadow-inner"
                placeholder="e.g. Archimedes"
                maxLength={20}
                autoComplete="off"
                required
              />
            </div>

            {error && (
              <div className="bg-red-950/80 border border-red-500/70 text-red-200 text-xs rounded-xl px-4 py-3 font-sans leading-relaxed text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="gold-button-primary w-full py-4 rounded-xl text-lg tracking-[0.15em] shadow-xl mt-2"
            >
              {loading ? 'Joining the Arena...' : '⚔ JOIN CONTEST'}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center font-sans text-[#C8A752]/40 text-[11px] mt-6 tracking-widest uppercase">
          AOU ICPC COMMUNITY · PROBLEM SOLVING
        </p>
      </div>

      <MeanderBorder className="fixed bottom-0 left-0 right-0 z-20 opacity-80" height={10} />
    </div>
  );
}
