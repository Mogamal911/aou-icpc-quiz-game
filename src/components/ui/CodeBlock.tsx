import React, { useState, useMemo } from 'react';
import type { CodeLanguage } from '../../types/game';
import { highlightCode, getLanguageLabel, getLanguageFileExtension } from '../../utils/codeHighlight';

interface CodeBlockProps {
  code: string;
  language?: CodeLanguage;
  size?: 'sm' | 'md' | 'lg';
  showLineNumbers?: boolean;
  className?: string;
  filename?: string;
}

export function CodeBlock({
  code,
  language = 'cpp',
  size = 'md',
  showLineNumbers = true,
  className = '',
  filename,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const lines = useMemo(() => highlightCode(code, language), [code, language]);
  const langLabel = getLanguageLabel(language);
  const displayFile = filename || getLanguageFileExtension(language);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Size styling configurations
  const textClass =
    size === 'lg'
      ? 'text-base sm:text-lg xl:text-xl leading-relaxed sm:leading-loose'
      : size === 'sm'
      ? 'text-xs leading-normal'
      : 'text-xs sm:text-sm leading-relaxed';

  const gutterWidth = lines.length >= 100 ? 'w-10' : lines.length >= 10 ? 'w-8' : 'w-6';

  return (
    <div
      className={`rounded-2xl border border-[#C8A752]/35 bg-[#070D1B] shadow-2xl overflow-hidden font-mono ${className}`}
    >
      {/* IDE Header Bar */}
      <div className="bg-[#0A142B] border-b border-[#C8A752]/25 px-4 py-2.5 flex items-center justify-between select-none">
        {/* Left: Window Dots & File Tab */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]/80 border border-[#E0443E]/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]/80 border border-[#DEA123]/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]/80 border border-[#1AAB29]/80 inline-block" />
          </div>

          <div className="flex items-center gap-2 bg-[#070D1B] border border-[#C8A752]/30 px-3 py-1 rounded-md text-xs text-[#E6EDF3] font-sans font-medium">
            <span className="text-amber-400">📄</span>
            <span>{displayFile}</span>
          </div>
        </div>

        {/* Right: Language Indicator Badge & Copy Button */}
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] bg-[#C8A752]/15 text-[#F0D278] border border-[#C8A752]/35 px-2.5 py-0.5 rounded-full font-sans font-bold uppercase tracking-wider">
            {langLabel}
          </span>

          <button
            type="button"
            onClick={handleCopy}
            className="text-[11px] bg-[#070D1B] hover:bg-[#0E1A36] border border-[#C8A752]/30 text-[#C8BFA8] hover:text-[#F0D278] px-2.5 py-1 rounded-md font-sans transition-colors flex items-center gap-1 active:scale-95"
            title="Copy code snippet"
          >
            {copied ? (
              <>
                <span className="text-emerald-400">✓</span>
                <span className="text-emerald-300">Copied</span>
              </>
            ) : (
              <>
                <span>📋</span>
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Content Area with Line Numbers */}
      <div className={`p-4 sm:p-5 overflow-x-auto ${textClass} selection:bg-[#264F78]`}>
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line) => (
              <tr key={line.lineNumber} className="hover:bg-white/[0.03] transition-colors">
                {showLineNumbers && (
                  <td
                    className={`${gutterWidth} text-right pr-4 text-[#6E7681] select-none text-[11px] sm:text-xs font-mono align-top pt-0.5 border-r border-[#C8A752]/15`}
                  >
                    {line.lineNumber}
                  </td>
                )}
                <td className="pl-4 whitespace-pre font-mono align-top text-[#D4D4D4]">
                  {line.tokens.length === 0 ? (
                    '\u00A0'
                  ) : (
                    line.tokens.map((token, tIdx) => {
                      let colorClass = 'text-[#D4D4D4]'; // plain

                      switch (token.type) {
                        case 'keyword':
                          colorClass = 'text-[#C586C0] font-semibold'; // purple/magenta
                          break;
                        case 'type':
                          colorClass = 'text-[#4EC9B0] font-medium'; // teal
                          break;
                        case 'string':
                          colorClass = 'text-[#CE9178]'; // orange/terracotta
                          break;
                        case 'number':
                          colorClass = 'text-[#B5CEA8]'; // soft green
                          break;
                        case 'comment':
                          colorClass = 'text-[#6A9955] italic'; // green
                          break;
                        case 'preprocessor':
                          colorClass = 'text-[#C586C0] font-semibold'; // purple
                          break;
                        case 'function':
                          colorClass = 'text-[#DCDCAA] font-medium'; // yellow
                          break;
                        case 'operator':
                          colorClass = 'text-[#D4D4D4]';
                          break;
                        case 'punctuation':
                          colorClass = 'text-[#808080]';
                          break;
                        default:
                          colorClass = 'text-[#D4D4D4]';
                      }

                      return (
                        <span key={tIdx} className={colorClass}>
                          {token.value}
                        </span>
                      );
                    })
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

