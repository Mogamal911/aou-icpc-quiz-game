import React, { useState } from 'react';
import type { Question } from '../../types/game';
import { AnswerOption } from '../ui/AnswerOption';
import { TimerRing } from '../ui/TimerRing';
import { LaurelWreath } from '../ui/RomanDecorations';
import { CodeBlock } from '../ui/CodeBlock';

interface QuestionPreviewModalProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onClose: () => void;
}

export function QuestionPreviewModal({
  question,
  questionNumber,
  totalQuestions,
  onClose,
}: QuestionPreviewModalProps) {
  const [isRevealing, setIsRevealing] = useState(false);
  const [selectedPreviewChoice, setSelectedPreviewChoice] = useState<number | null>(null);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0A142B] border-2 border-[#C8A752]/40 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative gold-bevel-card flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#C8A752]/20 mb-6">
          <div className="flex items-center gap-3">
            <LaurelWreath size={36} />
            <div>
              <span className="text-xs bg-[#C8A752]/20 text-[#F0D278] border border-[#C8A752]/40 px-2.5 py-0.5 rounded-full font-sans font-bold uppercase tracking-wider">
                Live Trial Preview
              </span>
              <p className="text-white text-xs font-sans mt-0.5">
                Simulated appearance during gameplay
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[#C8BFA8] hover:text-white text-xl font-bold p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* Simulated Question Card */}
        <div className="bg-[#0E1A36]/90 border border-[#C8A752]/30 rounded-2xl p-5 mb-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[#F0D278] text-xs uppercase tracking-widest font-sans font-bold">
                Question {questionNumber} of {totalQuestions}
              </span>
              <p className="text-[#C8BFA8] text-xs font-sans mt-0.5">
                {question.category || 'General ICPC'}
              </p>
            </div>

            <TimerRing
              startedAt={Date.now()}
              timeLimit={question.timeLimit || 20}
              size={68}
            />
          </div>

          <div className="bg-[#070D1B] border border-[#C8A752]/25 rounded-xl p-4 shadow-inner">
            <h3 className="font-sans text-base sm:text-lg font-bold text-white text-center leading-relaxed">
              {question.text}
            </h3>
          </div>

          {/* Code Question Snippet Display */}
          {question.type === 'code' && question.code && (
            <CodeBlock
              code={question.code}
              language={question.codeLanguage || 'cpp'}
              size="md"
              className="my-3"
            />
          )}

          {/* 4 Choices */}
          <div className="grid grid-cols-1 gap-2.5">
            {question.options.map((opt, i) => (
              <AnswerOption
                key={i}
                index={i}
                text={opt}
                selected={selectedPreviewChoice === i}
                correct={isRevealing && i === question.correctIndex}
                incorrect={isRevealing && selectedPreviewChoice === i && i !== question.correctIndex}
                disabled={isRevealing}
                isRevealing={isRevealing}
                onClick={() => {
                  if (!isRevealing) setSelectedPreviewChoice(i);
                }}
              />
            ))}
          </div>

          {/* Post-Reveal Explanation Box (if provided) */}
          {isRevealing && Boolean(question.explanation?.trim()) && (
            <div className="bg-[#070D1B] border border-[#22C55E]/40 rounded-xl p-4 text-xs font-sans text-[#E8E2D5] space-y-1 animate-fade-in">
              <span className="text-[#4ADE80] font-bold uppercase tracking-wider text-[11px] block">
                Imperial Explanation
              </span>
              <p>{question.explanation}</p>
            </div>
          )}
        </div>

        {/* Interactive Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#C8A752]/20">
          <button
            type="button"
            onClick={() => setIsRevealing(!isRevealing)}
            className={`px-4 py-2 rounded-xl text-xs font-serif font-bold uppercase tracking-wider transition-all ${
              isRevealing
                ? 'bg-amber-600 text-white'
                : 'bg-[#C8A752]/20 text-[#F0D278] border border-[#C8A752]/40 hover:bg-[#C8A752]/30'
            }`}
          >
            {isRevealing ? '👁 Mode: Revealing (Showing Correct Answer)' : '▶ Mode: Active Question'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="gold-button-primary px-6 py-2 rounded-xl text-xs uppercase tracking-wider ml-auto"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

