import React, { useEffect, useState } from 'react';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { AdminLogin } from '../components/admin/AdminLogin';
import { AdminLayout } from '../components/admin/AdminLayout';
import { adminSignOut } from '../services/authService';
import { getQuestionBank, saveQuestionBank } from '../services/questionBankService';
import { QUESTIONS } from '../data/questions';
import { LEVEL_LABELS, type QuestionLevelFilter as LevelFilter } from '../data/questionLevels';
import { QuestionLevelFilter } from '../components/admin/QuestionLevelFilter';
import type { Question } from '../types/game';
import { QuestionFormModal } from '../components/admin/QuestionFormModal';
import { QuestionPreviewModal } from '../components/admin/QuestionPreviewModal';
import { Dialog } from '../components/ui/Dialog';
import { Icon } from '../components/ui/Icon';

export function QuestionManagementPage() {
  const { user, loading: authLoading, isAdmin, setUser } = useAdminAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<LevelFilter>('all');
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [editing, setEditing] = useState<Question | 'new' | null>(null);
  const [preview, setPreview] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState<Question | null>(null);
  const sessionId = sessionStorage.getItem('aou_admin_session_id');

  useEffect(() => {
    let cancelled = false;
    getQuestionBank().then((bank) => { if (!cancelled) setQuestions(bank); })
      .catch((error: Error) => { if (!cancelled) { setLoadFailed(true); setMessage({ text: error.message, error: true }); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!message || message.error) return;
    const timer = setTimeout(() => setMessage(null), 4500);
    return () => clearTimeout(timer);
  }, [message]);

  async function persist(next: Question[], text: string) {
    setSaving(true);
    setMessage(null);
    try {
      await saveQuestionBank(next);
      setQuestions(next);
      setMessage({ text });
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Could not save. Please try again.';
      setMessage({ text, error: true });
      throw error;
    } finally { setSaving(false); }
  }

  async function saveQuestion(question: Question) {
    const next = editing === 'new' ? [...questions, question] : questions.map((q) => q.id === question.id ? question : q);
    await persist(next, 'Question saved. It is ready to use in a new contest.');
    setEditing(null);
  }

  async function move(index: number, direction: -1 | 1) {
    const next = [...questions];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    try { await persist(next, 'Question order saved.'); } catch { /* Error stays visible. */ }
  }

  async function duplicate(question: Question) {
    const copy = { ...question, id: `q_${crypto.randomUUID()}`, text: `${question.text} (copy)` };
    const next = [...questions];
    next.splice(questions.findIndex((q) => q.id === question.id) + 1, 0, copy);
    try { await persist(next, 'Question duplicated.'); setEditing(copy); } catch { /* Error stays visible. */ }
  }

  if (authLoading) return <div className="empty-state">Loading…</div>;
  if (!user || !isAdmin) return <AdminLogin onLogin={(u) => { if (u) setUser(u); }} />;
  const missingStarters = QUESTIONS.filter((starter) => !questions.some((q) => q.id === starter.id));
  const hasFilters = Boolean(search) || level !== 'all';
  const filtered = questions.filter((q) => (level === 'all' || (q.difficulty || 'unrated') === level) && `${q.text} ${q.category ?? ''}`.toLowerCase().includes(search.toLowerCase()));

  return <AdminLayout sessionId={sessionId} busy={saving} onSignOut={async () => { await adminSignOut(); setUser(null); }}>
    <div className="page-heading">
      <div><h1>Question bank</h1><p>Create and manage questions for your next contest.</p></div>
      <button className="button button-primary" disabled={saving || loading || loadFailed} onClick={() => setEditing('new')}><Icon name="plus" />Add question</button>
    </div>
    {sessionId && <p className="muted text-sm mb-5">Changes apply to new contests.</p>}
    {message && <p role={message.error ? 'alert' : 'status'} className={`notice ${message.error ? 'notice-error' : 'notice-success'}`}>{message.text}</p>}
    {!loading && !loadFailed && missingStarters.length > 0 && <div className="starter-bank-notice"><p>Add {missingStarters.length} starter questions across beginner, intermediate and advanced levels. Your saved questions stay in the bank.</p><button className="button" disabled={saving} onClick={async () => { try { await persist([...questions, ...missingStarters], 'Starter questions added. Filter by level to explore them.'); } catch { /* Error stays visible. */ } }}>Add starter questions</button></div>}
    <div className="question-toolbar">
      <label className="search-field"><Icon name="search" /><input aria-label="Search questions" placeholder="Search questions or topics…" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
      <QuestionLevelFilter value={level} onChange={setLevel} />
      <span className="muted" role="status">{loading ? 'Loading questions…' : `${filtered.length} ${hasFilters ? 'matching ' : ''}question${filtered.length === 1 ? '' : 's'}`}{saving ? ' · Saving…' : ''}</span>
    </div>
    {loadFailed ? <button className="button" onClick={() => window.location.reload()}>Retry loading questions</button> : !loading && filtered.length === 0 ? <div className="panel empty-state"><h2>{hasFilters ? 'No matching questions' : 'Add your first question'}</h2><p>{hasFilters ? 'Try a different word or knowledge level.' : 'Write a prompt, add four choices, and choose the correct answer.'}</p>{hasFilters && <button className="button" onClick={() => { setSearch(''); setLevel('all'); }}>Clear filters</button>}</div> :
      <div className="question-list">{filtered.map((q) => {
        const index = questions.findIndex((item) => item.id === q.id);
        return <article className="question-row" key={q.id}>
          <div className="question-order">
            <button className="icon-button" aria-label={`Move question ${index + 1} up`} title={hasFilters ? 'Clear filters to reorder' : 'Move up'} disabled={saving || index === 0 || hasFilters} onClick={() => move(index, -1)}><Icon name="up" size={16} /></button>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <button className="icon-button" aria-label={`Move question ${index + 1} down`} title={hasFilters ? 'Clear filters to reorder' : 'Move down'} disabled={saving || index === questions.length - 1 || hasFilters} onClick={() => move(index, 1)}><Icon name="down" size={16} /></button>
          </div>
          <div className="question-copy"><h3>{q.text}</h3>
            <div className="question-meta"><span className={`level-badge level-${q.difficulty || 'unrated'}`}>{LEVEL_LABELS[q.difficulty || 'unrated']}</span>{q.category && <span>{q.category}</span>}<span><Icon name="clock" size={14} />{q.timeLimit}s</span>{q.type === 'code' && <span><Icon name="code" size={14} />{q.codeLanguage === 'cpp' ? 'C++' : q.codeLanguage}</span>}</div>
            <p className="correct-summary">Correct answer: {String.fromCharCode(65 + q.correctIndex)}. {q.options[q.correctIndex]}</p>
          </div>
          <div className="question-actions">
            <button className="icon-button" aria-label={`Preview question ${index + 1}`} title="Preview" onClick={() => setPreview(q)}><Icon name="eye" /></button>
            <button className="icon-button" aria-label={`Duplicate question ${index + 1}`} title="Duplicate" disabled={saving} onClick={() => duplicate(q)}><Icon name="copy" /></button>
            <button className="button" disabled={saving} onClick={() => setEditing(q)} aria-label={`Edit question ${index + 1}`}><Icon name="edit" />Edit</button>
            <button className="icon-button" aria-label={`Delete question ${index + 1}`} title={questions.length === 1 ? 'Keep at least one question' : 'Delete'} disabled={saving || questions.length === 1} onClick={() => setDeleting(q)}><Icon name="trash" /></button>
          </div>
        </article>;
      })}</div>}
    {editing && <QuestionFormModal initialQuestion={editing === 'new' ? null : editing} onSave={saveQuestion} onCancel={() => setEditing(null)} />}
    {preview && <QuestionPreviewModal question={preview} questionNumber={questions.findIndex((q) => q.id === preview.id) + 1} totalQuestions={questions.length} onClose={() => setPreview(null)} />}
    {deleting && <Dialog title="Delete this question?" busy={saving} onClose={() => setDeleting(null)}>
      <div className="dialog-body"><p>{deleting.text}</p><p className="muted mt-3">This removes it from the question bank. Existing contests keep their copy.</p>{message?.error && <p role="alert" className="notice notice-error mt-4">{message.text}</p>}</div>
      <div className="dialog-actions"><button className="button" disabled={saving} onClick={() => setDeleting(null)}>Cancel</button><button className="button button-danger" disabled={saving} onClick={async () => { try { await persist(questions.filter((q) => q.id !== deleting.id), 'Question deleted.'); setDeleting(null); } catch { /* Keep dialog open. */ } }}>{saving ? 'Deleting…' : 'Delete question'}</button></div>
    </Dialog>}
  </AdminLayout>;
}
