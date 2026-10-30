import React, { memo } from 'react';
import { useCountdown } from '../../hooks/useCountdown';

interface TimerRingProps {
  startedAt: number | null;
  timeLimit: number;
  size?: number;
  className?: string;
}

export const TimerRing = memo(function TimerRing({
  startedAt,
  timeLimit,
  size = 110,
  className = '',
}: TimerRingProps) {
  const { timeLeft, progress } = useCountdown(startedAt, timeLimit);

  const strokeWidth = Math.max(5, Math.round(size * 0.07));
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const isUrgent = timeLeft <= 5 && timeLeft > 0;
  const arcColor = isUrgent ? '#EF4444' : progress > 0.4 ? '#E5C158' : '#F59E0B';
  const glowColor = isUrgent ? 'rgba(239, 68, 68, 0.45)' : 'rgba(229, 193, 88, 0.3)';

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Background dial disc */}
      <div
        className="absolute inset-1 rounded-full bg-[#070D1B] border border-[#C8A752]/25 shadow-inner"
        style={{
          boxShadow: isUrgent
            ? '0 0 15px rgba(239, 68, 68, 0.3), inset 0 0 10px rgba(0, 0, 0, 0.8)'
            : '0 0 15px rgba(0, 0, 0, 0.5), inset 0 0 12px rgba(0, 0, 0, 0.8)',
        }}
      />

      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(200, 167, 82, 0.15)"
          strokeWidth={strokeWidth}
        />
        {/* Animated Arc with smooth GPU CSS transition */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={arcColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            filter: `drop-shadow(0 0 6px ${glowColor})`,
            transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.3s ease',
          }}
        />
      </svg>

      {/* Numerical display */}
      <div className="relative flex flex-col items-center justify-center z-10">
        <span
          className={`font-serif font-black leading-none tracking-tight transition-colors duration-200 ${
            isUrgent ? 'text-[#EF4444] animate-pulse' : 'text-[#FFF2C6]'
          }`}
          style={{ fontSize: size * 0.36 }}
        >
          {timeLeft}
        </span>
        <span className="text-[#C8A752]/70 font-sans font-semibold text-[10px] tracking-[0.25em] uppercase mt-0.5">
          SEC
        </span>
      </div>
    </div>
  );
});
