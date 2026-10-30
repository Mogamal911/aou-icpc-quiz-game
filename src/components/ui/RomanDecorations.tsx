import React from 'react';

// ─── Meander / Greek Key Border ───────────────────────────────────────────────
export function MeanderBorder({ className = '', height = 12 }: { className?: string; height?: number }) {
  return (
    <div
      className={`w-full overflow-hidden select-none pointer-events-none ${className}`}
      style={{
        height: `${height}px`,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='12' viewBox='0 0 24 12'%3E%3Cpath d='M0 11h8V3H4v6h2V5h4v8H2V1h8V0H0v11zm12 0h8V3h-4v6h2V5h4v8h-8V1h8V0h-10v11z' fill='%23C8A752' fill-opacity='0.65'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat-x',
        backgroundPosition: 'center',
      }}
    />
  );
}

// ─── Laurel Wreath (Symmetrical Roman branches) ──────────────────────────────
export function LaurelWreath({
  className = '',
  small = false,
  size,
}: {
  className?: string;
  small?: boolean;
  size?: number;
}) {
  const width = size ?? (small ? 64 : 110);
  const height = width * 0.32;

  return (
    <svg
      className={`inline-block ${className}`}
      width={width}
      height={height}
      viewBox="0 0 120 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left branch */}
      <g fill="#E5C158">
        <path d="M12 20C16 16 22 17 22 21C22 25 16 24 12 20Z" opacity="0.95" />
        <path d="M24 14C28 10 34 11 34 15C34 19 28 18 24 14Z" opacity="0.95" />
        <path d="M38 10C42 6 48 7 48 11C48 15 42 14 38 10Z" opacity="0.95" />
        <path d="M16 26C20 22 26 23 26 27C26 31 20 30 16 26Z" opacity="0.75" />
        <path d="M30 22C34 18 40 19 40 23C40 27 34 26 30 22Z" opacity="0.75" />
        <path d="M46 18C50 14 56 15 56 19C56 23 50 22 46 18Z" opacity="0.75" />
        {/* Main stem */}
        <path d="M10 22C25 18 40 18 56 25" stroke="#C8A752" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* Center diamond knot */}
      <polygon points="60,21 64,25 60,29 56,25" fill="#F0D278" />

      {/* Right branch (mirrored) */}
      <g fill="#E5C158">
        <path d="M108 20C104 16 98 17 98 21C98 25 104 24 108 20Z" opacity="0.95" />
        <path d="M96 14C92 10 86 11 86 15C86 19 92 18 96 14Z" opacity="0.95" />
        <path d="M82 10C78 6 72 7 72 11C72 15 78 14 82 10Z" opacity="0.95" />
        <path d="M104 26C100 22 94 23 94 27C94 31 100 30 104 26Z" opacity="0.75" />
        <path d="M90 22C86 18 80 19 80 23C80 27 86 26 90 22Z" opacity="0.75" />
        <path d="M74 18C70 14 64 15 64 19C64 23 70 22 74 18Z" opacity="0.75" />
        {/* Main stem */}
        <path d="M110 22C95 18 80 18 64 25" stroke="#C8A752" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// ─── Classical Diamond Divider ───────────────────────────────────────────────
export function GoldDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 select-none ${className}`}>
      <div className="flex-1 max-w-xs h-[1px] bg-gradient-to-r from-transparent via-[#C8A752]/50 to-[#C8A752]" />
      <span className="text-[#F0D278] text-xs leading-none font-serif">◆</span>
      <div className="flex-1 max-w-xs h-[1px] bg-gradient-to-l from-transparent via-[#C8A752]/50 to-[#C8A752]" />
    </div>
  );
}

// ─── Official AOU ICPC Logo ──────────────────────────────────────────────────
export function AouLogo({
  className = '',
  size = 'md',
  showText = true,
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}) {
  const pixelSizes = {
    sm: 40,
    md: 56,
    lg: 84,
    xl: 120,
  };

  const px = pixelSizes[size];

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <div
        className="relative rounded-full p-[2.5px] bg-gradient-to-b from-[#F0D278] via-[#C8A752] to-[#8C7335] shadow-[0_0_25px_rgba(200,167,82,0.35)]"
        style={{ width: px, height: px }}
      >
        <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center border border-[#C8A752]/50 shadow-inner">
          <img
            src="/aou-icpc-logo.jpg"
            alt="AOU ICPC Logo"
            className="w-full h-full object-cover rounded-full"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
              const fallback = target.parentElement?.querySelector('.logo-svg-fallback');
              if (fallback) (fallback as HTMLElement).style.display = 'flex';
            }}
          />
          <div className="logo-svg-fallback hidden w-full h-full items-center justify-center bg-[#0B1630]">
            <span className="font-serif font-black text-[#F0D278] text-xl">A</span>
          </div>
        </div>
      </div>

      {showText && (
        <div className="text-center mt-2.5">
          <p className="font-serif font-bold text-[#F0D278] tracking-[0.25em] text-xs sm:text-sm uppercase leading-tight">
            AOU ICPC COMMUNITY
          </p>
          <p className="font-sans text-[#C8BFA8] tracking-[0.3em] text-[10px] uppercase font-semibold mt-0.5">
            PROBLEM SOLVING
          </p>
        </div>
      )}
    </div>
  );
}
