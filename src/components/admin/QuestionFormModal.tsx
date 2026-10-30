import React, { useState, useEffect } from 'react';
import type { Question, QuestionType, CodeLanguage } from '../../types/game';
import { validateQuestion } from '../../services/questionBankService';
import { CodeEditor } from './CodeEditor';

interface QuestionFormModalProps {
  initialQuestion?: Question | null;
  questionNumber: number;
  onSave: (question: Question) => void;
  onCancel: () => void;
}

const PRESET_DURATIONS = [10, 15, 20, 30, 45, 60];

export function QuestionFormModal({
  initialQuestion,
  questionNumber,
  onSave,
  onCancel,
}: QuestionFormModalProps) {
  const isEditing = Boolean(initialQuestion);

  // Question Type & Code states
  const [type, setType] = useState<QuestionType>(initialQuestion?.type || 'text');
  const [code, setCode] = useState<string>(initialQuestion?.code || '');
  const [codeLanguage, setCodeLanguage] = useState<CodeLanguage>(initialQuestion?.codeLanguage || 'cpp');

  const [text, setText] = useState(initialQuestion?.text || '');
  const [category, setCategory] = useState(
    initialQuestion?.category || (initialQuestion?.type === 'code' ? 'Code Analysis' : 'General ICPC')
  );
  const [options, setOptions] = useState<[string, string, string, string]>([
    initialQuestion?.options[0] || '',
    initialQuestion?.options[1] || '',
    initialQuestion?.options[2] || '',
    initialQuestion?.options[3] || '',
  ]);
  const [correctIndex, setCorrectIndex] = useState<number>(
    typeof initialQuestion?.correctIndex === 'number' ? initialQuestion.correctIndex : 0
  );
  const [timeLimit, setTimeLimit] = useState<number>(initialQuestion?.timeLimit || 20);
  const [customTime, setCustomTime] = useState(
    !PRESET_DURATIONS.includes(initialQuestion?.timeLimit || 20)
      ? String(initialQuestion?.timeLimit || 20)
      : ''
  );
  const [isCustomMode, setIsCustomMode] = useState(
    !PRESET_DURATIONS.includes(initialQuestion?.timeLimit || 20)
  );
  const [explanation, setExplanation] = useState(initialQuestion?.explanation || '');

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Validate on change if submitted once
  useEffect(() => {
    if (hasAttemptedSubmit) {
      const result = validateQuestion({
        type,
        text,
        code,
        codeLanguage,
        options,
        correctIndex,
        timeLimit,
      });
      setValidationErrors(result.errors);
    }
  }, [type, text, code, codeLanguage, options, correctIndex, timeLimit, hasAttemptedSubmit]);

  function handleOptionChange(index: number, val: string) {
    setOptions((prev) => {
      const copy = [...prev] as [string, string, string, string];
      copy[index] = val;
      return copy;
    });
  }

  function handlePresetSelect(sec: number) {
    setIsCustomMode(false);
    setCustomTime('');
    setTimeLimit(sec);
  }

  function handleCustomTimeChange(val: string) {
    setCustomTime(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 5 && parsed <= 300) {
      setTimeLimit(parsed);
    }
  }

  function handleTypeSwitch(newType: QuestionType) {
    setType(newType);
    // If category is default for the previous type, gently adjust to match
    if (newType === 'code' && (category === 'General ICPC' || category === '')) {
      setCategory('Code Analysis');
    } else if (newType === 'text' && category === 'Code Analysis') {
      setCategory('General ICPC');
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setHasAttemptedSubmit(true);

    const questionData: Question = {
      id: initialQuestion?.id || `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      text: text.trim(),
      category: category.trim() || (type === 'code' ? 'Code Analysis' : 'General ICPC'),
      options: [
        options[0].trim(),
        options[1].trim(),
        options[2].trim(),
        options[3].trim(),
      ] as [string, string, string, string],
      correctIndex,
      timeLimit: Number(timeLimit) || 20,
      explanation: explanation.trim() || '',
    };

    if (type === 'code') {
      questionData.code = code;
      questionData.codeLanguage = codeLanguage;
    }

    const result = validateQuestion(questionData);
    if (!result.isValid) {
      setValidationErrors(result.errors);
      return;
    }

    onSave(questionData);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0A142B] border-2 border-[#C8A752]/45 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative gold-bevel-card flex flex-col max-h-[94vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#C8A752]/20 mb-5">
          <div>
            <span className="text-xs bg-[#C8A752]/20 text-[#F0D278] border border-[#C8A752]/40 px-2.5 py-0.5 rounded-full font-sans font-bold uppercase tracking-wider">
              {isEditing ? `Edit Question #${questionNumber}` : 'Create New Trial'}
            </span>
            <h2 className="font-serif text-2xl font-black text-white mt-1">
              {isEditing ? 'Modify Question Details' : 'Add Question to Question Bank'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="text-[#C8BFA8] hover:text-white text-xl font-bold p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* Question Type Selector: Text vs Code */}
        <div className="mb-6 p-1.5 bg-[#070D1B] rounded-2xl border border-[#C8A752]/35 flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleTypeSwitch('text')}
            className={`flex-1 py-3 px-4 rounded-xl font-serif text-xs sm:text-sm font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2.5 ${
              type === 'text'
                ? 'bg-gradient-to-r from-[#C8A752] to-[#F0D278] text-[#070D1B] shadow-lg shadow-[#C8A752]/20 scale-[1.01]'
                : 'text-[#C8BFA8] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <span className="text-base">📝</span>
            <span>Text Question</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeSwitch('code')}
            className={`flex-1 py-3 px-4 rounded-xl font-serif text-xs sm:text-sm font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2.5 ${
              type === 'code'
                ? 'bg-gradient-to-r from-[#C8A752] to-[#F0D278] text-[#070D1B] shadow-lg shadow-[#C8A752]/20 scale-[1.01]'
                : 'text-[#C8BFA8] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <span className="text-base">💻</span>
            <span>Code Question</span>
          </button>
        </div>

        {/* Validation Errors Box */}
        {validationErrors.length > 0 && (
          <div className="bg-red-950/80 border border-red-500 rounded-xl p-4 mb-5 text-red-200 text-xs font-sans space-y-1">
            <span className="font-bold uppercase tracking-wider block text-red-300">
              Please resolve the following:
            </span>
            <ul className="list-disc pl-5 space-y-0.5">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Question Text / Description */}
          <div>
            <label className="block text-xs font-sans font-bold uppercase tracking-wider text-[#F0D278] mb-1.5">
              {type === 'code' ? 'Question Description / Prompt *' : 'Question Text *'}
            </label>
            <textarea
              rows={type === 'code' ? 2 : 3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                type === 'code'
                  ? 'e.g. What is the output of the following code snippet?'
                  : 'e.g. What does ICPC stand for?'
              }
              className="w-full bg-[#070D1B] border border-[#C8A752]/35 focus:border-[#F0D278] rounded-xl p-3 text-white text-sm font-sans placeholder-[#C8A752]/30 outline-none focus:ring-1 focus:ring-[#F0D278]"
              required
            />
          </div>

          {/* Code Question Area: Language & IDE Code Editor */}
          {type === 'code' && (
            <div>
              <label className="block text-xs font-sans font-bold uppercase tracking-wider text-[#F0D278] mb-1.5">
                Code Snippet *
              </label>
              <CodeEditor
                code={code}
                language={codeLanguage}
                onChange={setCode}
                onLanguageChange={setCodeLanguage}
                placeholder={`// Enter ${codeLanguage.toUpperCase()} code snippet here...`}
              />
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-xs font-sans font-bold uppercase tracking-wider text-[#F0D278] mb-1.5">
              Category / Topic
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Algorithms, Data Structures, Code Analysis"
              className="w-full bg-[#070D1B] border border-[#C8A752]/35 focus:border-[#F0D278] rounded-xl p-2.5 text-white text-sm font-sans placeholder-[#C8A752]/30 outline-none focus:ring-1 focus:ring-[#F0D278]"
            />
          </div>

          {/* 4 Choices & Correct Answer Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-sans font-bold uppercase tracking-wider text-[#F0D278]">
                Answer Options & Correct Choice *
              </label>
              <span className="text-[11px] text-[#C8BFA8]/80 font-sans">
                Click the circle to select the single correct answer
              </span>
            </div>

            <div className="space-y-2.5">
              {[0, 1, 2, 3].map((i) => {
                const label = String.fromCharCode(65 + i);
                const isSelectedCorrect = correctIndex === i;

                return (
                  <div
                    key={i}
                    onClick={() => setCorrectIndex(i)}
                    className={`
                      flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer
                      ${
                        isSelectedCorrect
                          ? 'bg-[#092B1A]/80 border-[#22C55E] ring-1 ring-[#22C55E]'
                          : 'bg-[#070D1B] border-[#C8A752]/25 hover:border-[#C8A752]/50'
                      }
                    `}
                  >
                    {/* Select Correct Radio Button */}
                    <div
                      className={`
                        w-8 h-8 rounded-lg flex items-center justify-center font-serif font-black text-xs shrink-0 border transition-all
                        ${
                          isSelectedCorrect
                            ? 'bg-[#22C55E] border-[#22C55E] text-[#051C10]'
                            : 'bg-[#0E1A36] border-[#C8A752]/40 text-[#F0D278]'
                        }
                      `}
                    >
                      {label}
                    </div>

                    <input
                      type="text"
                      value={options[i]}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleOptionChange(i, e.target.value);
                      }}
                      placeholder={`Enter option ${label} text`}
                      className="flex-1 bg-transparent text-white text-sm font-sans placeholder-[#C8A752]/30 outline-none"
                      required
                    />

                    {isSelectedCorrect && (
                      <span className="text-xs bg-[#22C55E]/20 text-[#4ADE80] font-sans font-bold px-2.5 py-1 rounded-md shrink-0">
                        ✓ Correct Answer
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time Limit Setting */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-sans font-bold uppercase tracking-wider text-[#F0D278]">
                Trial Time Limit *
              </label>
              <span className="text-xs font-mono font-bold text-[#F0D278] bg-[#C8A752]/15 px-2.5 py-0.5 rounded-md border border-[#C8A752]/30">
                {timeLimit}s
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {PRESET_DURATIONS.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => handlePresetSelect(sec)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-sans font-bold transition-all
                    ${
                      !isCustomMode && timeLimit === sec
                        ? 'bg-[#F0D278] text-[#070D1B] shadow-[0_0_12px_rgba(240,210,120,0.4)] scale-105'
                        : 'bg-[#070D1B] text-[#C8BFA8] hover:text-white border border-[#C8A752]/25'
                    }
                  `}
                >
                  {sec}s
                </button>
              ))}

              {!isCustomMode ? (
                <button
                  type="button"
                  onClick={() => setIsCustomMode(true)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-sans text-[#C8A752]/70 hover:text-[#F0D278] border border-dashed border-[#C8A752]/40"
                >
                  Custom...
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={customTime}
                    onChange={(e) => handleCustomTimeChange(e.target.value)}
                    placeholder="sec"
                    className="w-16 bg-[#081024] border border-[#F0D278] text-white text-xs px-2 py-1 rounded-lg text-center font-mono outline-none"
                    autoFocus
                  />
                  <span className="text-xs text-[#C8BFA8] font-sans">sec</span>
                </div>
              )}
            </div>
          </div>

          {/* Explanation (Optional) */}
          <div>
            <label className="block text-xs font-sans font-bold uppercase tracking-wider text-[#F0D278] mb-1.5">
              Imperial Explanation <span className="text-[#C8BFA8]/60 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Will be revealed on screens after time expires..."
              className="w-full bg-[#070D1B] border border-[#C8A752]/35 focus:border-[#F0D278] rounded-xl p-2.5 text-white text-sm font-sans placeholder-[#C8A752]/30 outline-none focus:ring-1 focus:ring-[#F0D278]"
            />
          </div>

          {/* Buttons Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#C8A752]/20">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl border border-[#C8A752]/30 text-[#C8BFA8] hover:text-white text-xs font-sans uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="gold-button-primary px-8 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-lg"
            >
              {isEditing ? 'Save Changes' : 'Add to Bank'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
