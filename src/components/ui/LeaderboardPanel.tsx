import React, { memo } from 'react';
import type { LeaderboardEntry } from '../../types/game';
import { LaurelWreath, GoldDivider } from './RomanDecorations';

interface LeaderboardPanelProps {
  entries: LeaderboardEntry[];
  maxRows?: number;
  highlightPlayerId?: string;
  showTitle?: boolean;
  className?: string;
}

const MEDAL_STYLES = [
  { border: '#F0D278', bg: 'rgba(240, 210, 120, 0.15)', text: '#F0D278', label: '1ST' },
  { border: '#D1D5DB', bg: 'rgba(209, 213, 219, 0.12)', text: '#E5E7EB', label: '2ND' },
  { border: '#CD7F32', bg: 'rgba(205, 127, 50, 0.12)', text: '#E0A96D', label: '3RD' },
];

export const LeaderboardPanel = memo(function LeaderboardPanel({
  entries,
  maxRows = 10,
  highlightPlayerId,
  showTitle = true,
  className = '',
}: LeaderboardPanelProps) {
  const visible = entries.slice(0, maxRows);

  return (
    <div className={`w-full ${className}`}>
      {showTitle && (
        <div className="text-center mb-5">
          <LaurelWreath className="mx-auto mb-2 opacity-90" size={80} />
          <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-[0.2em] uppercase text-[#F0D278]">
            Imperial Standings
          </h2>
          <p className="font-sans text-[11px] uppercase tracking-widest text-[#C8A752]/60 mt-0.5">
            Leaderboard
          </p>
          <GoldDivider className="mt-3 max-w-xs mx-auto" />
        </div>
      )}

      <div className="space-y-2">
        {visible.map((entry) => {
          const isHighlighted = entry.playerId === highlightPlayerId;
          const isPodium = entry.rank <= 3;
          const medal = isPodium ? MEDAL_STYLES[entry.rank - 1] : null;

          return (
            <div
              key={entry.playerId}
              className={`
                flex items-center gap-3.5 px-4 py-2.5 sm:py-3 rounded-xl border
                transition-colors duration-100
                ${
                  isHighlighted
                    ? 'border-[#F0D278] bg-[#1A2E59] shadow-[0_0_20px_rgba(240,210,120,0.25)] ring-1 ring-[#F0D278]/50'
                    : isPodium
                    ? 'border-[#C8A752]/40 bg-[#0F1E3D]/80 hover:border-[#C8A752]/70'
                    : 'border-[#C8A752]/20 bg-[#0B1630]/60 hover:border-[#C8A752]/40'
                }
              `}
            >
              {/* Rank Medallion */}
              <div
                className={`
                  w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-serif font-black text-sm border
                  ${
                    medal
                      ? 'shadow-sm'
                      : 'border-[#C8A752]/25 bg-[#060D1E] text-[#C8A752]/70'
                  }
                `}
                style={{
                  backgroundColor: medal ? medal.bg : undefined,
                  borderColor: medal ? medal.border : undefined,
                  color: medal ? medal.text : undefined,
                }}
              >
                {entry.rank}
              </div>

              {/* Name & Details */}
              <div className="flex-1 min-w-0">
                <p
                  className={`font-sans font-semibold text-sm sm:text-base truncate leading-tight ${
                    isHighlighted
                      ? 'text-[#FFF2C6] font-bold'
                      : isPodium
                      ? 'text-white'
                      : 'text-[#E8E2D5]'
                  }`}
                >
                  {entry.nickname}
                  {isHighlighted && (
                    <span className="ml-2 text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-[#F0D278]/20 text-[#F0D278] border border-[#F0D278]/40 uppercase tracking-wider">
                      You
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-[#C8A752]/60 font-sans mt-0.5">
                  Gladiator #{entry.rank}
                </p>
              </div>

              {/* Score Display */}
              <div className="text-right flex-shrink-0 pl-2">
                <span className="font-serif font-black text-base sm:text-lg text-[#F0D278] tracking-tight">
                  {entry.score.toLocaleString()}
                </span>
                <span className="text-[10px] font-sans font-semibold text-[#C8A752]/70 ml-1 uppercase">
                  PTS
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
