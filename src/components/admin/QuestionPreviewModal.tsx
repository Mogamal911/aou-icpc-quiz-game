import React, { useState } from 'react';
import type { Question } from '../../types/game';
import { LEVEL_LABELS } from '../../data/questionLevels';
import { AnswerOption } from '../ui/AnswerOption';
import { CodeBlock } from '../ui/CodeBlock';
import { Dialog } from '../ui/Dialog';
import { Icon } from '../ui/Icon';

export function QuestionPreviewModal({ question, questionNumber, totalQuestions, onClose }: {
  question: Question; questionNumber: number; totalQuestions: number; onClose: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  return <Dialog title="Question preview" onClose={onClose}>
    <div className="dialog-body form-stack">
      <div className="flex items-center justify-between muted"><span>Question {questionNumber} of {totalQuestions}</span><span className="inline-flex gap-2 items-center"><Icon name="clock" />{question.timeLimit}s</span></div>
      <p className="question-meta"><span className={`level-badge level-${question.difficulty || 'unrated'}`}>{LEVEL_LABELS[question.difficulty || 'unrated']}</span>{question.category}</p>
      <h3 className="text-xl font-semibold leading-relaxed">{question.text}</h3>
      {question.type === 'code' && question.code && <CodeBlock code={question.code} language={question.codeLanguage || 'cpp'} size="md" />}
      <div className="space-y-3">{question.options.map((option, i) => <AnswerOption key={i} index={i} text={option} selected={selected === i} correct={revealed && i === question.correctIndex} incorrect={revealed && selected === i && i !== question.correctIndex} disabled={revealed} isRevealing={revealed} onClick={() => setSelected(i)} />)}</div>
      {revealed && question.explanation && <p className="notice notice-success"><strong>Explanation: </strong>{question.explanation}</p>}
    </div>
    <div className="dialog-actions"><button className="button" onClick={() => { setRevealed(!revealed); setSelected(null); }}><Icon name="eye" />{revealed ? 'Try again' : 'Reveal answer'}</button><button className="button button-primary" onClick={onClose}>Done</button></div>
  </Dialog>;
}
