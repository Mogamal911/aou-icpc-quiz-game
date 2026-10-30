import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { useGameSession } from '../hooks/useGameSession';
import { AdminLogin } from '../components/admin/AdminLogin';
import { adminSignOut } from '../services/authService';
import {
  getQuestionBank,
  saveQuestionBank,
  resetQuestionBankToDefault,
  normalizeQuestion,
} from '../services/questionBankService';
import type { Question } from '../types/game';
import { QuestionFormModal } from '../components/admin/QuestionFormModal';
import { QuestionPreviewModal } from '../components/admin/QuestionPreviewModal';
import { AouLogo, LaurelWreath, MeanderBorder } from '../components/ui/RomanDecorations';
import { CodeBlock } from '../components/ui/CodeBlock';

const ADMIN_SESSION_STORAGE_KEY = 'aou_admin_session_id';

export function QuestionManagementPage() {
  const { user, loading: authLoading, isAdmin, setUser } = useAdminAuth();
  const [sessionId] = useState<string | null>(() =>
    sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY)
  );
  const { session } = useGameSession(sessionId);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals state
  const [editingQuestion, setEditingQuestion] = useState<{ q: Question | null; index: number } | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<{ q: Question; index: number } | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  // Load question bank on mount
  useEffect(() => {
    let isMounted = true;
    getQuestionBank()
      .then((loaded) => {
        if (isMounted) {
          setQuestions(loaded);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load questions:', err);
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Alert before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (authLoading) {
    return <LoadingView message="Authenticating Quiz Master..." />;
  }

  if (!isAdmin || !user) {
    return <AdminLogin onLogin={(u) => { if (u) setUser(u); }} />;
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async function handleSaveQuestionBank() {
    if (questions.length === 0) {
      setStatusMessage({ text: 'Question bank cannot be empty. Add at least one question.', type: 'error' });
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      await saveQuestionBank(questions);
      setHasUnsavedChanges(false);
      setStatusMessage({ text: 'Imperial Question Bank saved successfully!', type: 'success' });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error('Save failed:', err);
      setStatusMessage({ text: err.message || 'Failed to save question bank.', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleResetToDefault() {
    if (confirm('Reset all questions to the default verified 20 AOU ICPC questions? Current edits will be replaced.')) {
      setSaving(true);
      try {
        const defaults = await resetQuestionBankToDefault();
        setQuestions(defaults);
        setHasUnsavedChanges(false);
        setStatusMessage({ text: 'Question bank reset to default 20 questions.', type: 'success' });
        setTimeout(() => setStatusMessage(null), 4000);
      } catch (err: any) {
        setStatusMessage({ text: 'Failed to reset question bank.', type: 'error' });
      } finally {
        setSaving(false);
      }
    }
  }

  function handleSaveQuestionFromModal(savedQ: Question) {
    if (!editingQuestion) return;

    const normalized = normalizeQuestion(
      savedQ,
      editingQuestion.index === -1 ? questions.length : editingQuestion.index
    );

    setQuestions((prev) => {
      const copy = [...prev];
      if (editingQuestion.index === -1) {
        // Adding new question
        copy.push(normalized);
      } else {
        // Editing existing question
        copy[editingQuestion.index] = normalized;
      }
      return copy;
    });

    setHasUnsavedChanges(true);
    setEditingQuestion(null);
  }

  function handleDeleteQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
    setDeletingIndex(null);
  }

  function handleDuplicateQuestion(index: number) {
    const target = questions[index];
    if (!target) return;

    const duplicated = normalizeQuestion(
      {
        ...target,
        id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        text: `${target.text} (Copy)`,
      },
      index + 1
    );

    setQuestions((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, duplicated);
      return copy;
    });
    setHasUnsavedChanges(true);
  }

  function handleMoveQuestion(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    setQuestions((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
    setHasUnsavedChanges(true);
  }

  const isGameRunning = session && session.phase !== 'lobby' && session.phase !== 'finished';

  return (
    <div className="min-h-screen roman-bg-canvas text-[#F5EFE6] font-sans relative flex flex-col justify-between">
      <MeanderBorder className="fixed top-0 left-0 right-0 z-30 opacity-80" height={12} />

      {/* Top Header Console Bar */}
      <header className="bg-[#0A142B]/95 border-b border-[#C8A752]/30 px-6 py-4 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <AouLogo size="sm" showText={false} />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-serif text-lg font-bold text-[#F0D278] tracking-widest uppercase">
                Question Management
              </h1>
              <span className="text-xs bg-[#C8A752]/15 text-[#F0D278] border border-[#C8A752]/40 px-2.5 py-0.5 rounded-full font-mono font-bold tracking-wider">
                {questions.length} Trials
              </span>
            </div>
            <p className="text-[11px] text-[#C8BFA8] font-sans tracking-wider uppercase">
              AOU ICPC Orientation Day · Imperial Question Bank
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Back to Live Admin Console */}
          <Link
            to="/admin"
            className="text-xs bg-[#C8A752]/15 hover:bg-[#C8A752]/25 border border-[#C8A752]/40 text-[#F0D278] px-4 py-2 rounded-xl font-serif font-bold tracking-wider uppercase transition-all flex items-center gap-2 shadow-sm"
          >
            <span>⚔</span>
            <span>Arena Console</span>
          </Link>

          {sessionId && (
            <a
              href={`/present?session=${sessionId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-[#0E1A36] hover:bg-[#152B5C] border border-[#C8A752]/30 text-[#C8BFA8] hover:text-white px-3 py-2 rounded-xl font-serif font-semibold uppercase transition-colors flex items-center gap-1.5"
            >
              <span>📺</span>
              <span>Projector</span>
            </a>
          )}

          <button
            type="button"
            onClick={async () => {
              await adminSignOut();
              setUser(null);
            }}
            className="text-xs text-red-400/80 hover:text-red-300 font-sans uppercase tracking-wider px-2 py-1"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="p-6 max-w-7xl mx-auto w-full flex-1 z-10">
        {/* Active Session Warning Banner */}
        {isGameRunning && (
          <div className="bg-amber-950/80 border border-amber-500/60 rounded-2xl p-4 mb-6 shadow-xl flex items-center gap-3 text-xs font-sans text-amber-200">
            <span className="text-xl">🛡</span>
            <div>
              <strong className="text-[#F0D278] font-serif uppercase tracking-wider block text-sm">
                Active Arena Session in Progress ({session.joinCode})
              </strong>
              <span>
                A live game is currently being conducted. Question bank updates saved here will take effect for future arena sessions, preserving the integrity and submissions of the ongoing trials.
              </span>
            </div>
          </div>
        )}

        {/* Status Message Banner */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl border mb-6 text-xs font-sans font-semibold flex items-center justify-between shadow-lg animate-fade-in ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
                : 'bg-red-950/90 border-red-500 text-red-200'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-white hover:opacity-75 font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Top Control Bar */}
        <div className="bg-[#0E1A36]/90 border border-[#C8A752]/35 rounded-2xl p-5 mb-6 shadow-2xl gold-bevel-card flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-black text-[#F0D278] tracking-widest uppercase">
              Trials Repository
            </h2>
            <p className="text-[#C8BFA8] text-xs font-sans mt-0.5">
              Create, edit, duplicate, and arrange the questions presented during the orientation contest.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Add Question Button */}
            <button
              type="button"
              onClick={() => setEditingQuestion({ q: null, index: -1 })}
              className="px-5 py-2.5 rounded-xl bg-[#092B1A] hover:bg-[#0E3D25] border border-[#22C55E]/60 text-[#4ADE80] font-serif font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-md active:scale-95"
            >
              <span>＋</span>
              <span>Add Question</span>
            </button>

            {/* Reset to Default */}
            <button
              type="button"
              onClick={handleResetToDefault}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-[#C8A752]/30 text-[#C8BFA8] hover:text-white text-xs font-sans uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              Reset to Defaults
            </button>

            {/* Save Question Bank Button */}
            <button
              type="button"
              onClick={handleSaveQuestionBank}
              disabled={saving}
              className={`
                px-6 py-2.5 rounded-xl font-serif font-bold text-xs uppercase tracking-wider transition-all shadow-xl active:scale-95
                ${
                  hasUnsavedChanges
                    ? 'gold-button-primary animate-pulse'
                    : 'bg-[#C8A752]/20 border border-[#C8A752]/40 text-[#F0D278] hover:bg-[#C8A752]/30'
                }
              `}
            >
              {saving
                ? 'Saving Repository...'
                : hasUnsavedChanges
                ? '💾 SAVE CHANGES (UNSAVED)'
                : '✓ ALL CHANGES SAVED'}
            </button>
          </div>
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="text-center py-16">
            <LaurelWreath className="mx-auto mb-3" size={80} />
            <p className="font-serif text-[#F0D278] uppercase tracking-widest text-sm animate-pulse">
              Retrieving Question Repository...
            </p>
          </div>
        ) : questions.length === 0 ? (
          <div className="bg-[#0E1A36]/80 border border-[#C8A752]/30 rounded-2xl p-12 text-center shadow-xl">
            <LaurelWreath className="mx-auto mb-3" size={100} />
            <h3 className="font-serif text-2xl font-bold text-[#F0D278] uppercase tracking-wider mb-2">
              The Question Vault is Empty
            </h3>
            <p className="text-[#C8BFA8] text-xs font-sans mb-6 max-w-md mx-auto">
              There are currently no questions in the repository. Add a question or restore the default orientation trials.
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setEditingQuestion({ q: null, index: -1 })}
                className="gold-button-primary px-6 py-3 rounded-xl text-xs uppercase tracking-wider"
              >
                ＋ Add First Question
              </button>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="px-6 py-3 rounded-xl border border-[#C8A752]/40 text-[#F0D278] text-xs font-sans uppercase tracking-wider"
              >
                Restore 20 Default Questions
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === questions.length - 1;

              return (
                <div
                  key={q.id || idx}
                  className="bg-[#0E1A36]/90 border border-[#C8A752]/30 hover:border-[#C8A752]/60 rounded-2xl p-5 shadow-lg transition-all gold-bevel-card"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Number, Category, Question Text */}
                    <div className="flex items-start gap-4 flex-1">
                      {/* Reorder Buttons */}
                      <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleMoveQuestion(idx, 'up')}
                          disabled={isFirst}
                          title="Move question up"
                          className="w-7 h-7 rounded-lg bg-[#070D1B] border border-[#C8A752]/20 hover:border-[#F0D278] text-[#F0D278] flex items-center justify-center text-xs disabled:opacity-20 disabled:hover:border-[#C8A752]/20 transition-colors"
                        >
                          ▲
                        </button>
                        <span className="text-[11px] font-serif font-black text-[#F0D278]">
                          #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMoveQuestion(idx, 'down')}
                          disabled={isLast}
                          title="Move question down"
                          className="w-7 h-7 rounded-lg bg-[#070D1B] border border-[#C8A752]/20 hover:border-[#F0D278] text-[#F0D278] flex items-center justify-center text-xs disabled:opacity-20 disabled:hover:border-[#C8A752]/20 transition-colors"
                        >
                          ▼
                        </button>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          {/* Question Type Badge */}
                          {q.type === 'code' ? (
                            <span className="text-[10px] bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-1 shadow-sm">
                              <span>💻</span>
                              <span>Code: {q.codeLanguage ? (q.codeLanguage === 'cpp' ? 'C++' : q.codeLanguage.toUpperCase()) : 'C++'}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] bg-[#0E1A36] text-[#C8BFA8] border border-[#C8A752]/25 px-2 py-0.5 rounded-full font-sans font-medium flex items-center gap-1">
                              <span>📝</span>
                              <span>Text</span>
                            </span>
                          )}

                          {q.category && (
                            <span className="text-[10px] bg-[#C8A752]/15 text-[#C8A752] border border-[#C8A752]/30 px-2 py-0.5 rounded-full font-sans uppercase tracking-wider font-semibold">
                              {q.category}
                            </span>
                          )}

                          <span className="text-[10px] bg-[#070D1B] text-[#F0D278] border border-[#C8A752]/30 px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                            <span>⏱</span>
                            <span>{q.timeLimit || 20}s</span>
                          </span>

                          {Boolean(q.explanation?.trim()) && (
                            <span className="text-[10px] bg-blue-950/60 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-sans font-medium">
                              Has Explanation
                            </span>
                          )}
                        </div>

                        <h4 className="font-sans text-base sm:text-lg font-bold text-white leading-snug">
                          {q.text}
                        </h4>

                        {/* Code Snippet in list item */}
                        {q.type === 'code' && q.code && (
                          <div className="mt-2.5">
                            <CodeBlock
                              code={q.code}
                              language={q.codeLanguage || 'cpp'}
                              size="sm"
                              className="max-h-48 overflow-y-auto"
                            />
                          </div>
                        )}

                        {/* Options preview with correct answer indicated */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                          {q.options.map((opt, optIdx) => {
                            const isCorrect = optIdx === q.correctIndex;
                            return (
                              <div
                                key={optIdx}
                                className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-2 font-sans truncate ${
                                  isCorrect
                                    ? 'bg-[#092B1A] border-[#22C55E]/60 text-[#4ADE80] font-semibold'
                                    : 'bg-[#070D1B]/70 border-[#C8A752]/15 text-[#C8BFA8]'
                                }`}
                              >
                                <span
                                  className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-serif font-black shrink-0 ${
                                    isCorrect
                                      ? 'bg-[#22C55E] text-[#051C10]'
                                      : 'bg-[#0E1A36] text-[#C8A752]'
                                  }`}
                                >
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className="truncate">{opt}</span>
                                {isCorrect && <span className="ml-auto text-[10px]">✓</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Right Action Buttons */}
                    <div className="flex md:flex-col items-center justify-end gap-2 border-t md:border-t-0 md:border-l border-[#C8A752]/20 pt-3 md:pt-0 md:pl-4 shrink-0">
                      {/* Preview Button */}
                      <button
                        type="button"
                        onClick={() => setPreviewQuestion({ q, index: idx })}
                        className="p-2 rounded-xl bg-[#070D1B] border border-[#C8A752]/30 hover:border-[#F0D278] text-[#F0D278] text-xs font-sans font-semibold flex items-center gap-1.5 transition-colors w-full justify-center"
                        title="Preview gameplay look"
                      >
                        <span>👁</span>
                        <span>Preview</span>
                      </button>

                      {/* Duplicate Button */}
                      <button
                        type="button"
                        onClick={() => handleDuplicateQuestion(idx)}
                        className="p-2 rounded-xl bg-[#070D1B] border border-[#C8A752]/30 hover:border-[#F0D278] text-[#C8BFA8] hover:text-white text-xs font-sans flex items-center gap-1.5 transition-colors w-full justify-center"
                        title="Duplicate this question"
                      >
                        <span>📋</span>
                        <span>Duplicate</span>
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => setEditingQuestion({ q, index: idx })}
                        className="p-2 rounded-xl bg-[#C8A752]/20 border border-[#C8A752]/40 hover:bg-[#C8A752]/30 text-[#F0D278] text-xs font-serif font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors w-full justify-center"
                      >
                        <span>✏</span>
                        <span>Edit</span>
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => setDeletingIndex(idx)}
                        className="p-2 rounded-xl bg-red-950/30 border border-red-500/30 hover:border-red-500 text-red-400 text-xs font-sans flex items-center gap-1.5 transition-colors w-full justify-center"
                      >
                        <span>🗑</span>
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deletingIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A142B] border-2 border-red-500/50 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-950 border border-red-500/60 text-red-400 flex items-center justify-center mx-auto text-xl mb-3">
              🗑
            </div>
            <h3 className="font-serif text-xl font-bold text-white mb-2">
              Delete Question #{deletingIndex + 1}?
            </h3>
            <p className="text-xs text-[#C8BFA8] font-sans mb-6">
              Are you sure you want to delete this trial? This action cannot be undone once saved.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingIndex(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#C8A752]/30 text-[#C8BFA8] text-xs font-sans uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteQuestion(deletingIndex)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-serif font-bold text-xs uppercase tracking-wider"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Form Modal (Create or Edit) */}
      {editingQuestion !== null && (
        <QuestionFormModal
          initialQuestion={editingQuestion.q}
          questionNumber={editingQuestion.index === -1 ? questions.length + 1 : editingQuestion.index + 1}
          onSave={handleSaveQuestionFromModal}
          onCancel={() => setEditingQuestion(null)}
        />
      )}

      {/* Question Live Preview Modal */}
      {previewQuestion !== null && (
        <QuestionPreviewModal
          question={previewQuestion.q}
          questionNumber={previewQuestion.index + 1}
          totalQuestions={questions.length}
          onClose={() => setPreviewQuestion(null)}
        />
      )}

      <footer className="py-4 text-center text-[#C8A752]/40 text-xs font-sans tracking-widest uppercase border-t border-[#C8A752]/15 mt-8">
        AOU ICPC Orientation Day · Imperial Question Bank System
      </footer>
    </div>
  );
}

function LoadingView({ message }: { message: string }) {
  return (
    <div className="min-h-screen roman-bg-canvas flex items-center justify-center p-6 text-center">
      <div className="space-y-4">
        <AouLogo size="md" />
        <p className="font-serif text-[#F0D278] tracking-widest uppercase text-sm animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
}

