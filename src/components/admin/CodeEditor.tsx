import React, { useState, useRef, useEffect } from 'react';
import type { CodeLanguage } from '../../types/game';
import { Icon } from '../ui/Icon';
import { CodeBlock } from '../ui/CodeBlock';

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
    <div className="code-editor">
      <div className="code-editor-toolbar">
        <div className="segmented code-editor-tabs" aria-label="Code view"><button type="button" aria-pressed={activeTab === 'edit'} onClick={() => setActiveTab('edit')}><Icon name="edit" size={15} />Editor</button><button type="button" aria-pressed={activeTab === 'preview'} onClick={() => setActiveTab('preview')}><Icon name="eye" size={15} />Preview</button></div>
        {onLanguageChange && <label className="code-editor-language" htmlFor="code-lang-select">Language<select id="code-lang-select" value={language} onChange={(event) => onLanguageChange(event.target.value as CodeLanguage)}>{SUPPORTED_LANGUAGES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>}
      </div>

      {/* Editor Body */}
      {activeTab === 'edit' ? (
        <div className="relative flex bg-[#070D1B]" style={{ minHeight }}>
          {/* Gutter with line numbers */}
          <div
            ref={gutterRef}
            className="w-9 shrink-0 py-3 bg-[#0b1526] border-r border-[#34425b] select-none overflow-hidden text-right pr-3 font-mono text-xs text-[#6E7681]"
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
            aria-label="Code snippet"
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            placeholder={placeholder}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="min-w-0 flex-1 p-3 bg-transparent text-[#F5EFE6] font-mono text-xs sm:text-sm leading-6 outline-none resize-y overflow-auto whitespace-pre caret-white selection:bg-[#264F78]"
            style={{ minHeight: '200px', maxHeight: '380px', tabSize: 2 }}
          />
        </div>
      ) : (
        <div className="p-4 bg-[#070D1B]">
          {code.trim().length > 0 ? (
            <CodeBlock code={code} language={language} size="md" />
          ) : (
            <div className="text-center py-10 text-[#C8A752]/40 font-mono text-xs italic">
              // Enter code in the editor to preview it.
            </div>
          )}
        </div>
      )}


    </div>
  );
}

