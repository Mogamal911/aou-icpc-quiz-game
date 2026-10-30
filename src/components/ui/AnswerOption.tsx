import React, { memo } from 'react';
import { OPTION_LABELS } from '../../utils/gameUtils';

interface AnswerOptionProps {
  index: number;
  text: string;
  selected?: boolean;
  correct?: boolean;
  incorrect?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  large?: boolean;
  isRevealing?: boolean;
}

export const AnswerOption = memo(function AnswerOption({
  index,
  text,
  selected = false,
  correct = false,
  incorrect = false,
  disabled = false,
  onClick,
  large = false,
  isRevealing = false,
}: AnswerOptionProps) {
  const label = OPTION_LABELS[index] || ['A', 'B', 'C', 'D'][index];

  // Determine appearance classes based on state
  // Use [@media(hover:hover)] so mobile touch devices never get stuck in :hover styles
  let containerStyles = 'bg-[#0D1A36] border-[#C8A752]/35 text-[#F5EFE6] [@media(hover:hover)]:hover:border-[#F0D278]/70 [@media(hover:hover)]:hover:bg-[#12234A]';
  let badgeStyles = 'bg-[#081024] border-[#C8A752]/50 text-[#F0D278] shadow-inner';

  if (correct) {
    containerStyles = 'bg-[#092B1A] border-[#22C55E] text-white shadow-[0_0_25px_rgba(34,197,94,0.4)] ring-1 ring-[#22C55E]';
    badgeStyles = 'bg-[#22C55E] border-[#22C55E] text-[#051C10] font-black';
  } else if (incorrect) {
    containerStyles = 'bg-[#2B0E14] border-[#EF4444] text-[#FCA5A5] shadow-[0_0_20px_rgba(239,68,68,0.3)] ring-1 ring-[#EF4444]';
    badgeStyles = 'bg-[#EF4444] border-[#EF4444] text-white font-black';
  } else if (isRevealing && !correct) {
    containerStyles = 'bg-[#0A1329]/60 border-[#C8A752]/15 text-[#F5EFE6]/40 opacity-45';
    badgeStyles = 'bg-[#060D1E]/60 border-[#C8A752]/20 text-[#C8A752]/40';
  } else if (selected) {
    containerStyles = 'bg-[#152B5C] border-[#F0D278] text-white shadow-[0_0_22px_rgba(240,210,120,0.35)] ring-2 ring-[#F0D278]/50 scale-[1.01]';
    badgeStyles = 'bg-[#F0D278] border-[#F0D278] text-[#070D1B] font-black shadow-md';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full group relative flex items-center gap-4 rounded-xl border
        transition-[transform,background-color,border-color,box-shadow] duration-75 text-left select-none outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F0D278]
        ${large ? 'px-6 py-5 text-xl' : 'px-4 py-3.5 sm:px-5 sm:py-4 text-base'}
        ${disabled ? 'cursor-default opacity-85' : 'cursor-pointer active:scale-[0.96] active:brightness-110 active:border-[#F0D278]'}
        ${containerStyles}
      `}
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Roman Emblem Badge */}
      <div
        className={`
          flex-shrink-0 flex items-center justify-center rounded-lg border font-serif font-bold transition-all duration-75
          ${large ? 'w-12 h-12 text-xl' : 'w-9 h-9 sm:w-10 sm:h-10 text-base'}
          ${badgeStyles}
        `}
      >
        {correct ? '✓' : incorrect ? '✗' : label}
      </div>

      {/* Answer Text */}
      <span
        className={`
          flex-1 font-sans leading-snug tracking-normal
          ${large ? 'font-semibold text-lg sm:text-xl' : 'font-medium text-sm sm:text-base'}
          ${selected || correct ? 'text-white' : 'text-[#F5EFE6]'}
        `}
      >
        {text}
      </span>

      {/* Status Indicators */}
      {selected && !correct && !incorrect && !isRevealing && (
        <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F0D278]/20 border border-[#F0D278]/50 text-[#F0D278] text-xs font-semibold uppercase tracking-wider">
          <span>Sealed</span>
        </div>
      )}

      {correct && (
        <div className="flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full bg-[#22C55E]/25 border border-[#22C55E]/70 text-[#4ADE80] text-xs font-bold uppercase tracking-wider">
          <span>Correct</span>
        </div>
      )}
    </button>
  );
});
