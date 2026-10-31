import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LEVEL_LABELS, QUESTION_LEVELS, type QuestionLevelFilter as LevelFilter } from '../../data/questionLevels';
import { QuestionLevelFilter } from './QuestionLevelFilter';
import type { Question } from '../../types/game';
import { getQuestionBank } from '../../services/questionBankService';
import { QuestionPreviewModal } from './QuestionPreviewModal';
import { Icon } from '../ui/Icon';

export function ContestSetup({ onCreate, creating, error }: {
  onCreate: (questions: Question[]) => void; creating: boolean; error: string;
}) {
  const [bank, setBank] = useState<Question[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<LevelFilter>('all');
  const [uniform, setUniform] = useState(false);
  const [seconds, setSeconds] = useState('20');
  const [preview, setPreview] = useState<Question | null>(null);
  useEffect(() => {
    let cancelled = false;
    getQuestionBank().then((questions) => {
      if (cancelled) return;
      let draft: { order?: string[]; selected?: string[]; uniform?: boolean; seconds?: string } | null = null;
      try { draft = JSON.parse(sessionStorage.getItem('aou_contest_draft') || 'null'); } catch { /* Start fresh if the draft is invalid. */ }
      const order = Array.isArray(draft?.order) ? draft.order : [];
      const ordered = [...questions].sort((a, b) => {
        const aIndex = order.indexOf(a.id), bIndex = order.indexOf(b.id);
        return (aIndex < 0 ? order.length : aIndex) - (bIndex < 0 ? order.length : bIndex);
      });
      setBank(ordered);
      setSelected(new Set(Array.isArray(draft?.selected) ? draft.selected.filter((id) => questions.some((q) => q.id === id)) : questions.map((q) => q.id)));
      if (typeof draft?.uniform === 'boolean') setUniform(draft.uniform);
      if (typeof draft?.seconds === 'string') setSeconds(draft.seconds);
    }).catch((error: Error) => { if (!cancelled) setLoadError(error.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (loading || loadError) return;
    sessionStorage.setItem('aou_contest_draft', JSON.stringify({ order: bank.map((q) => q.id), selected: [...selected], uniform, seconds }));
  }, [bank, selected, uniform, seconds, loading, loadError]);
  const chosen = bank.filter((q) => selected.has(q.id)).map((q) => uniform ? { ...q, timeLimit: Number(seconds) } : q);
  const validTime = !uniform || (Number.isInteger(Number(seconds)) && Number(seconds) >= 5 && Number(seconds) <= 300);
  const answerTime = chosen.reduce((sum, q) => sum + q.timeLimit, 0);
  const hasFilters = Boolean(search) || level !== 'all';
  const visible = bank.filter((q) => (level === 'all' || (q.difficulty || 'unrated') === level) && `${q.text} ${q.category ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  const allVisibleSelected = visible.length > 0 && visible.every((q) => selected.has(q.id));
  function toggleVisible() {
    setSelected((previous) => {
      const next = new Set(previous);
      for (const q of visible) { if (allVisibleSelected) next.delete(q.id); else next.add(q.id); }
      return next;
    });
  }
  const placeholders = chosen.filter((q) => q.text.includes('[PLACEHOLDER]')).length;
  function toggle(id: string) {
    setSelected((previous) => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  function move(index: number, direction: -1 | 1) {
    setBank((previous) => { const next = [...previous]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; return next; });
  }
  return <>
    <div className="page-heading"><div><h1>Set up a contest</h1><p>Choose the questions, check the order, then open the lobby for players.</p></div><Link className="button" to="/admin/questions"><Icon name="plus" />Create questions</Link></div>
    {(error || loadError) && <p role="alert" className="notice notice-error">{error || loadError}</p>}
    {loadError && <button className="button mb-5" onClick={() => window.location.reload()}>Retry loading questions</button>}
    <div className="setup-grid">
      <section className="panel" aria-labelledby="setup-questions"><div className="flex items-center justify-between gap-3 mb-4"><h2 id="setup-questions">Choose questions</h2><button className="button button-quiet" disabled={creating || loading || !visible.length} onClick={toggleVisible}>{allVisibleSelected ? 'Deselect' : 'Select'} {hasFilters ? 'shown' : 'all'}</button></div>
        <div className="question-toolbar"><label className="search-field"><Icon name="search" /><input aria-label="Find a question" placeholder="Find a question or topic…" value={search} onChange={(e) => setSearch(e.target.value)} /></label><QuestionLevelFilter value={level} onChange={setLevel} /></div>
        {hasFilters && <p className="muted text-xs mb-4" role="status">Showing {visible.length} of {bank.length} questions. Selections outside this filter are kept.</p>}
        {loading && <p className="muted py-8" role="status">Loading your questions…</p>}
        {!loading && bank.length === 0 && <p className="muted py-8">Add a question to your bank to get started.</p>}
        {visible.map((q) => {
          const index = bank.findIndex((question) => question.id === q.id);
          return <div className="setup-row" key={q.id}>
            <label><input type="checkbox" checked={selected.has(q.id)} disabled={creating} onChange={() => toggle(q.id)} /><span>{q.text}<small className="question-meta"><span className={`level-badge level-${q.difficulty || 'unrated'}`}>{LEVEL_LABELS[q.difficulty || 'unrated']}</span>{q.category ? `${q.category} · ` : ''}{uniform && validTime ? seconds : q.timeLimit}s</small></span></label>
            <div className="flex items-center"><button className="icon-button" aria-label={`Preview question ${index + 1}`} title="Preview" onClick={() => setPreview(uniform && validTime ? { ...q, timeLimit: Number(seconds) } : q)}><Icon name="eye" size={16} /></button><button className="icon-button" aria-label={`Move question ${index + 1} up`} title={hasFilters ? 'Clear filters to reorder' : 'Move up'} disabled={creating || index === 0 || hasFilters} onClick={() => move(index, -1)}><Icon name="up" size={16} /></button><button className="icon-button" aria-label={`Move question ${index + 1} down`} title={hasFilters ? 'Clear filters to reorder' : 'Move down'} disabled={creating || index === bank.length - 1 || hasFilters} onClick={() => move(index, 1)}><Icon name="down" size={16} /></button></div>
          </div>;
        })}
        {bank.length > 0 && !visible.length && <p className="muted py-6">No matching questions. Try another search or knowledge level.</p>}
      </section>
      <aside className="panel setup-summary"><h2>Timing & selection</h2>
        <fieldset disabled={creating} className="space-y-4 mt-5"><legend className="sr-only">Question timing</legend>
          <label className="flex gap-3 items-center"><input type="radio" name="timing" checked={!uniform} onChange={() => setUniform(false)} />Use each question’s time</label>
          <label className="flex gap-3 items-center"><input type="radio" name="timing" checked={uniform} onChange={() => setUniform(true)} />Same time for all questions</label>
          {uniform && <label className="field">Seconds per question<input type="number" min={5} max={300} step={1} disabled={!uniform} value={seconds} onChange={(e) => setSeconds(e.target.value)} aria-invalid={!validTime} />{!validTime && <small className="text-red-300">Enter a whole number from 5 to 300.</small>}</label>}
        </fieldset>
        <dl className="setup-totals"><div><dt>Questions selected</dt><dd>{chosen.length}</dd></div><div><dt>Answer time</dt><dd>{validTime ? `${Math.floor(answerTime / 60)}m ${answerTime % 60}s` : '—'}</dd></div></dl>
        <p className="setup-level-mix muted">{[...QUESTION_LEVELS, 'unrated' as const].filter((item) => chosen.some((q) => (q.difficulty || 'unrated') === item)).map((item) => <span key={item}>{chosen.filter((q) => (q.difficulty || 'unrated') === item).length} {LEVEL_LABELS[item]}</span>)}</p>

        <div className="setup-create"><span className="mobile-selection">{chosen.length} questions selected</span><button className="button button-primary" disabled={loading || creating || !chosen.length || !validTime || Boolean(loadError)} onClick={() => onCreate(chosen)}><Icon name="arrow" />{creating ? 'Creating lobby…' : 'Create lobby'}</button></div>
        {placeholders > 0 && <p className="notice text-xs">{placeholders} selected questions contain placeholder facts. Edit them in Questions or deselect them before a real event.</p>}
        <p className="muted text-xs leading-relaxed mt-3">Players join in the lobby. You decide when to start.</p>
      </aside>
    </div>
    {preview && <QuestionPreviewModal question={preview} questionNumber={bank.findIndex((q) => q.id === preview.id) + 1} totalQuestions={bank.length} onClose={() => setPreview(null)} />}
  </>;
}
