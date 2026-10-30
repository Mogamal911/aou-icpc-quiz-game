import React, { useState, useRef, useEffect } from 'react';
import type { CodeLanguage } from '../../types/game';
import { CodeBlock } from '../ui/CodeBlock';
import { getLanguageLabel, getLanguageFileExtension } from '../../utils/codeHighlight';

interface CodeEditorProps {
  code: string;
  language: CodeLanguage;
  onChange: (newCode: string) => void;
  onLanguageChange?: (newLang: CodeLanguage) => void;
  placeholder?: string;
  minHeight?: string;
}

const SUPPORTED_LANGUAGES: { value: CodeLanguage; label: string }[] = [
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
];

export function CodeEditor({
  code,
  language,
  onChange,
  onLanguageChange,
  placeholder = '// Enter your code snippet here...',
  minHeight = '220px',
}: CodeEditorProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lines = code.split('\n');
  const lineCount = Math.max(1, lines.length);

  // Synchronize vertical scroll between textarea and line number gutter
  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Keyboard navigation & indentation handling
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Handle TAB key -> insert 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const tabSpaces = '  ';

      const updatedCode = code.substring(0, start) + tabSpaces + code.substring(end);
      onChange(updatedCode);

      // Restore cursor position after state update
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + tabSpaces.length;
      }, 0);
      return;
    }

    // Handle ENTER key -> auto-indent with previous line's whitespace
    if (e.key === 'Enter') {
      const start = textarea.selectionStart;
      const currentLine = code.substring(0, start).split('\n').pop() || '';
      const match = currentLine.match(/^\s+/);
      const leadingWhitespace = match ? match[0] : '';

      // If previous line ends with '{' or ':', indent an extra 2 spaces
      const extraIndent = /[{:]\s*$/.test(currentLine) ? '  ' : '';
      const indentToAdd = '\n' + leadingWhitespace + extraIndent;

      e.preventDefault();
      const updatedCode = code.substring(0, start) + indentToAdd + code.substring(textarea.selectionEnd);
      onChange(updatedCode);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + indentToAdd.length;
      }, 0);
      return;
    }
  };

  useEffect(() => {
    handleScroll();
  }, [code]);

  return (
    <div className="rounded-2xl border-2 border-[#C8A752]/40 bg-[#070D1B] shadow-2xl overflow-hidden font-sans">
      {/* IDE Top Bar */}
      <div className="bg-[#0A142B] border-b border-[#C8A752]/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 select-none">
        {/* Left: Window Dots & File Tab */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]/80 border border-[#E0443E]/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]/80 border border-[#DEA123]/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]/80 border border-[#1AAB29]/80 inline-block" />
          </div>

          <div className="flex items-center gap-2 bg-[#070D1B] border border-[#C8A752]/35 px-3 py-1 rounded-md text-xs text-[#E6EDF3] font-mono">
            <span className="text-amber-400">📄</span>
            <span>{getLanguageFileExtension(language)}</span>
          </div>

          {/* Edit vs Preview Toggle */}
          <div className="flex items-center bg-[#070D1B] p-0.5 rounded-lg border border-[#C8A752]/30 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1 rounded-md font-sans font-semibold transition-all ${
                activeTab === 'edit'
                  ? 'bg-[#C8A752]/25 text-[#F0D278] shadow-sm'
                  : 'text-[#C8BFA8] hover:text-white'
              }`}
            >
              ✏ Editor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 rounded-md font-sans font-semibold transition-all ${
                activeTab === 'preview'
                  ? 'bg-[#C8A752]/25 text-[#F0D278] shadow-sm'
                  : 'text-[#C8BFA8] hover:text-white'
              }`}
            >
              👁 Preview
            </button>
          </div>
        </div>

        {/* Right: Language Selector & Line Count */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#C8BFA8] font-mono">
            {lineCount} {lineCount === 1 ? 'line' : 'lines'} · {code.length} chars
          </span>

          {onLanguageChange && (
            <div className="flex items-center gap-1.5">
              <label htmlFor="code-lang-select" className="text-xs text-[#F0D278] font-bold uppercase tracking-wider">
                Language:
              </label>
              <select
                id="code-lang-select"
                value={language}
                onChange={(e) => onLanguageChange(e.target.value as CodeLanguage)}
                className="bg-[#070D1B] border border-[#C8A752]/50 focus:border-[#F0D278] text-[#F0D278] text-xs font-serif font-bold py-1 px-2.5 rounded-lg outline-none cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value} className="bg-[#0A142B] text-white">
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Editor Body */}
      {activeTab === 'edit' ? (
        <div className="relative flex bg-[#070D1B]" style={{ minHeight }}>
          {/* Gutter with line numbers */}
          <div
            ref={gutterRef}
            className="w-12 py-3 bg-[#050914] border-r border-[#C8A752]/20 select-none overflow-hidden text-right pr-3 font-mono text-xs text-[#6E7681]"
            style={{ maxHeight: '380px' }}
          >
            {Array.from({ length: lineCount }).map((_, i) => (
              <div key={i} className="leading-6">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Interactive Textarea with Monospace typography & Tab support */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            placeholder={placeholder}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="flex-1 p-3 bg-transparent text-[#F5EFE6] font-mono text-xs sm:text-sm leading-6 outline-none resize-y overflow-auto whitespace-pre caret-[#F0D278] selection:bg-[#264F78]"
            style={{ minHeight: '200px', maxHeight: '380px', tabSize: 2 }}
          />
        </div>
      ) : (
        <div className="p-4 bg-[#070D1B]">
          {code.trim().length > 0 ? (
            <CodeBlock code={code} language={language} size="md" />
          ) : (
            <div className="text-center py-10 text-[#C8A752]/40 font-mono text-xs italic">
              // No code snippet entered yet. Switch to Editor to write code.
            </div>
          )}
        </div>
      )}

      {/* Footer Helper Note */}
      <div className="bg-[#0A142B]/80 border-t border-[#C8A752]/20 px-4 py-1.5 flex items-center justify-between text-[11px] text-[#C8BFA8]/80 font-sans">
        <span>💡 Hint: Press <kbd className="px-1.5 py-0.5 bg-[#070D1B] rounded border border-[#C8A752]/30 font-mono text-[#F0D278]">Tab</kbd> to indent with 2 spaces. Enter preserves indentation.</span>
        <span className="font-mono text-[#C8A752]">{getLanguageLabel(language)} snippet</span>
      </div>
    </div>
  );
}

