import React, { useState, useEffect } from 'react';

interface TimerControlProps {
  currentDuration: number;
  nextDuration: number;
  isQuestionActive: boolean;
  onDurationChange: (duration: number) => void;
  label?: string;
  className?: string;
}

const PRESET_DURATIONS = [10, 15, 20, 30, 45, 60];

export function TimerControl({
  currentDuration,
  nextDuration,
  isQuestionActive,
  onDurationChange,
  label = 'Question Duration',
  className = '',
}: TimerControlProps) {
  const activeValue = isQuestionActive ? nextDuration : (nextDuration || currentDuration || 20);
  const [customInput, setCustomInput] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(
    !PRESET_DURATIONS.includes(activeValue)
  );

  useEffect(() => {
    if (!PRESET_DURATIONS.includes(activeValue)) {
      setIsCustomMode(true);
      setCustomInput(String(activeValue));
    } else {
      setIsCustomMode(false);
    }
  }, [activeValue]);

  function handlePresetSelect(sec: number) {
    setIsCustomMode(false);
    setCustomInput('');
    onDurationChange(sec);
  }

  function handleCustomSubmit() {
    const val = parseInt(customInput, 10);
    if (!isNaN(val) && val >= 5 && val <= 300) {
      onDurationChange(val);
    }
  }

  return (
    <div className={`bg-[#070D1B]/90 border border-[#C8A752]/30 rounded-xl p-4 shadow-inner ${className}`}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[#F0D278] text-sm">⏱</span>
          <span className="text-white text-xs font-sans font-bold uppercase tracking-wider">
            {isQuestionActive ? 'Next Question Duration' : label}
          </span>
        </div>

        <span className="text-xs bg-[#C8A752]/20 border border-[#C8A752]/40 text-[#F0D278] px-2.5 py-0.5 rounded-full font-mono font-bold">
          {activeValue} SEC
        </span>
      </div>

      {isQuestionActive && (
        <p className="text-[11px] text-[#C8BFA8]/80 font-sans mb-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
          <span>Active trial is locked at <strong className="text-white font-mono">{currentDuration}s</strong>. Changes apply to the next question.</span>
        </p>
      )}

      {/* Preset Duration Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {PRESET_DURATIONS.map((sec) => {
          const isSelected = !isCustomMode && activeValue === sec;
          return (
            <button
              key={sec}
              type="button"
              onClick={() => handlePresetSelect(sec)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-sans font-bold transition-all duration-75 select-none
                ${
                  isSelected
                    ? 'bg-[#F0D278] text-[#070D1B] shadow-[0_0_12px_rgba(240,210,120,0.4)] scale-105'
                    : 'bg-[#0E1A36] text-[#C8BFA8] hover:text-white hover:border-[#C8A752]/60 border border-[#C8A752]/25'
                }
                active:scale-95
              `}
            >
              {sec}s
            </button>
          );
        })}

        {/* Custom Input Toggle / Field */}
        {!isCustomMode ? (
          <button
            type="button"
            onClick={() => setIsCustomMode(true)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-sans font-semibold text-[#C8A752]/70 hover:text-[#F0D278] border border-dashed border-[#C8A752]/40 hover:border-[#C8A752] transition-colors"
          >
            Custom...
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="5"
              max="300"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onBlur={handleCustomSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomSubmit();
              }}
              placeholder="sec"
              className="w-16 bg-[#081024] border border-[#F0D278] text-white text-xs px-2 py-1 rounded-lg text-center font-mono outline-none shadow-sm focus:ring-1 focus:ring-[#F0D278]"
              autoFocus
            />
            <button
              type="button"
              onClick={handleCustomSubmit}
              className="px-2.5 py-1 rounded-lg bg-[#C8A752]/30 hover:bg-[#C8A752]/50 text-[#F0D278] text-xs font-bold transition-colors"
            >
              Set
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

