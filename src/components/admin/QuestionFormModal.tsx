import React, { useEffect, useState } from 'react';
import type { Question, QuestionType, CodeLanguage, QuestionDifficulty } from '../../types/game';
import { createQuestionId, validateQuestion } from '../../services/questionBankService';
import { QUESTION_LEVELS, LEVEL_LABELS, LEVEL_DESCRIPTIONS } from '../../data/questionLevels';
import { CodeEditor } from './CodeEditor';
import { Dialog } from '../ui/Dialog';
import { Icon } from '../ui/Icon';

export function QuestionFormModal({ initialQuestion, onSave, onCancel }: {
  initialQuestion?: Question | null; onSave: (question: Question) => Promise<void>; onCancel: () => void;
}) {
  const [type, setType] = useState<QuestionType>(initialQuestion?.type || 'text');
  const [text, setText] = useState(initialQuestion?.text || '');
  const [code, setCode] = useState(initialQuestion?.code || '');
  const [language, setLanguage] = useState<CodeLanguage>(initialQuestion?.codeLanguage || 'cpp');
  const [options, setOptions] = useState<[string, string, string, string]>(initialQuestion?.options || ['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(initialQuestion?.correctIndex ?? -1);
  const [time, setTime] = useState(String(initialQuestion?.timeLimit || 20));
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | ''>(initialQuestion ? initialQuestion.difficulty || '' : 'beginner');
  const [category, setCategory] = useState(initialQuestion?.category || '');
  const [explanation, setExplanation] = useState(initialQuestion?.explanation || '');
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const draft = JSON.stringify({ type, text, code, language, options, correctIndex, time, category, difficulty, explanation });
  const [original] = useState(draft);
  const dirty = draft !== original;
  useEffect(() => {
    if (!dirty && !saving) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, saving]);

  function close() {
    if (saving) return;
    if (dirty) setConfirmDiscard(true);
    else onCancel();
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    const question: Question = {
      id: initialQuestion?.id || createQuestionId(), type, text: text.trim(),
      options: options.map((option) => option.trim()) as Question['options'], correctIndex,
      ...(difficulty ? { difficulty } : {}),
      timeLimit: Number(time), category: category.trim(), explanation: explanation.trim(),
      ...(type === 'code' ? { code, codeLanguage: language } : {}),
    };
    const validation = validateQuestion(question);
    if (!Number.isInteger(question.timeLimit)) validation.errors.push('Use a whole number of seconds.');
    if (validation.errors.length) { setErrors(validation.errors); return; }
    setErrors([]); setSaving(true);
    try { await onSave(question); }
    catch (error) { setErrors([error instanceof Error ? error.message : 'Could not save the question. Try again.']); }
    finally { setSaving(false); }
  }

  return <Dialog title={initialQuestion ? 'Edit question' : 'New question'} wide busy={saving} onClose={close}>
    {confirmDiscard ? <div>
      <div className="dialog-body"><h3 className="text-lg font-semibold mb-2">Discard your changes?</h3><p className="muted">This question has unsaved changes. Keep editing to save them.</p></div>
      <div className="dialog-actions"><button type="button" className="button button-primary" autoFocus onClick={() => setConfirmDiscard(false)}>Keep editing</button><button type="button" className="button button-danger" onClick={onCancel}>Discard changes</button></div>
    </div> : <form onSubmit={submit}>
      <fieldset disabled={saving} className="dialog-body form-stack">
        {errors.length > 0 && <div className="notice notice-error" role="alert"><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
        <div className="segmented" aria-label="Question type">
          <button type="button" aria-pressed={type === 'text'} onClick={() => setType('text')}><Icon name="text" />Text</button>
          <button type="button" aria-pressed={type === 'code'} onClick={() => setType('code')}><Icon name="code" />Code</button>
        </div>
        <label className="field">Question<textarea data-autofocus required rows={3} placeholder="What would you like to ask?" value={text} onChange={(e) => setText(e.target.value)} /></label>
        {type === 'code' && <div><p className="mb-2 font-medium">Code snippet</p><CodeEditor code={code} language={language} onChange={setCode} onLanguageChange={setLanguage} /></div>}
        <fieldset className="space-y-3"><legend className="font-medium mb-1">Answers</legend><p className="muted text-xs mb-3">Enter four choices and select the one correct answer.</p>
          {options.map((option, index) => <div key={index} className={`answer-editor ${correctIndex === index ? 'selected' : ''}`}>
            <label><input type="radio" name="correct-answer" aria-label={`Answer ${String.fromCharCode(65 + index)} is correct`} checked={correctIndex === index} onChange={() => setCorrectIndex(index)} required />{String.fromCharCode(65 + index)}</label>
            <input className="input" aria-label={`Answer ${String.fromCharCode(65 + index)}`} required placeholder={`Answer ${String.fromCharCode(65 + index)}`} value={option} onChange={(e) => setOptions((prev) => prev.map((value, i) => i === index ? e.target.value : value) as Question['options'])} />
            {correctIndex === index && <Icon name="check" className="text-emerald-300" />}
          </div>)}
        </fieldset>
        <label className="field">Knowledge level<select value={difficulty} onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty | '')}><option value="">Unrated</option>{QUESTION_LEVELS.map((level) => <option key={level} value={level}>{LEVEL_LABELS[level]}</option>)}</select><small>{difficulty ? LEVEL_DESCRIPTIONS[difficulty] : 'Choose a level when you have assessed this question.'}</small></label>
        <div className="form-grid"><label className="field">Time limit (seconds)<input type="number" min={5} max={300} step={1} required value={time} onChange={(e) => setTime(e.target.value)} /><small>5–300 seconds. Used unless overridden in contest setup.</small></label><label className="field">Topic (optional)<input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Algorithms" /></label></div>
        <label className="field">Explanation (optional)<textarea rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Explain why the answer is correct." /><small>Shown after the answer is revealed.</small></label>
      </fieldset>
      <div className="dialog-actions"><button type="button" className="button" disabled={saving} onClick={close}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}><Icon name="check" />{saving ? 'Saving…' : 'Save question'}</button></div>
    </form>}
  </Dialog>;
}
