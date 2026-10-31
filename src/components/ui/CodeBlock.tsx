import React, { useMemo } from 'react';
import { useTransientState } from '../../hooks/useTransientState';
import { Icon } from './Icon';
import type { CodeLanguage } from '../../types/game';
import { highlightCode, getLanguageLabel } from '../../utils/codeHighlight';

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
  const [copied, setCopied] = useTransientState(false, 2500);

  const lines = useMemo(() => highlightCode(code, language), [code, language]);
  const langLabel = getLanguageLabel(language);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
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
      : 'text-sm leading-relaxed';

  const gutterWidth = lines.length >= 100 ? 'w-10' : lines.length >= 10 ? 'w-8' : 'w-6';

  return (
    <div
      className={`rounded-xl border border-[#34425b] bg-[#0b1526] overflow-hidden font-mono ${className}`}
    >
      <div className="bg-[#0A142B] border-b border-[#34425b] px-4 py-2 flex items-center justify-between gap-3 font-sans">
        <span className="text-sm text-[#bfccde] min-w-0 truncate">{filename ? `${filename} · ${langLabel}` : langLabel}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="text-[11px] bg-[#070D1B] hover:bg-[#0E1A36] border border-[#34425b] text-[#C8BFA8] hover:text-[#F0D278] px-2.5 py-2 min-h-[40px] shrink-0 rounded-md font-sans transition-colors flex items-center gap-1 active:scale-95"
            title="Copy code snippet"
          >
            {copied ? (
              <>
                <Icon name="check" size={14} className="text-emerald-400" />
                <span className="text-emerald-300">Copied</span>
              </>
            ) : (
              <>
                <Icon name="copy" size={14} />
                <span>Copy</span>
              </>
            )}
          </button>
      </div>

      {/* Code Content Area with Line Numbers */}
      <div tabIndex={0} role="region" aria-label={`${langLabel} code`} className={`p-4 sm:p-5 overflow-x-auto ${textClass} selection:bg-[#264F78] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#94a3b8]`}>
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

