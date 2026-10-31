import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { AdminLogin } from '../components/admin/AdminLogin';
import { AdminLayout } from '../components/admin/AdminLayout';
import { QuestionPreviewModal } from '../components/admin/QuestionPreviewModal';
import { Icon } from '../components/ui/Icon';
import { LeaderboardPanel } from '../components/ui/LeaderboardPanel';
import { adminSignOut } from '../services/authService';
import { getCompletedContest, getCompletedContests } from '../services/contestHistoryService';
import { buildLeaderboard } from '../utils/gameUtils';
import type { ContestSummary } from '../utils/contestHistory';
import type { GameSession, Question } from '../types/game';

const date = (timestamp: number) => new Date(timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const pageSize = 10;

export function ContestHistoryPage() {
  const { user, loading: authLoading, isAdmin, setUser } = useAdminAuth();
  const { contestId } = useParams();
  const [contests, setContests] = useState<ContestSummary[]>([]);
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<Question | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setLoading(true); setError(''); setSession(null); setPreview(null);
    const request = contestId
      ? getCompletedContest(contestId).then((saved) => { if (!cancelled) setSession(saved); })
      : getCompletedContests().then((saved) => { if (!cancelled) setContests(saved); });
    request.catch((error) => { if (!cancelled) setError(error instanceof Error ? error.message : 'Could not load contest history.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [contestId, isAdmin, retry]);

  function download(saved: GameSession) {
    const data = { ...saved, leaderboard: buildLeaderboard(saved.players || {}) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url;
    const finished = new Date(saved.endedAt ?? saved.createdAt);
    const day = [finished.getFullYear(), String(finished.getMonth() + 1).padStart(2, '0'), String(finished.getDate()).padStart(2, '0')].join('-');
    link.download = `aou-contest-${saved.joinCode}-${day}.json`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (authLoading) return <div className="empty-state">Loading…</div>;
  if (!user || !isAdmin) return <AdminLogin onLogin={(u) => { if (u) setUser(u); }} />;
  const filtered = contests.filter((contest) => `${contest.joinCode} ${date(contest.endedAt)}`.toLowerCase().includes(search.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const questions = session?.questions || [];

  return <AdminLayout sessionId={sessionStorage.getItem('aou_admin_session_id')} onSignOut={async () => { await adminSignOut(); setUser(null); }}>
    {contestId && <Link className="button button-quiet mb-5" to="/admin/history"><Icon name="back" />Contest history</Link>}
    <div className="page-heading"><div><h1>{contestId ? session ? `Contest ${session.joinCode}` : 'Contest results' : 'Contest history'}</h1><p>{session ? `Finished ${date(session.endedAt ?? session.createdAt)} · Results are saved and read-only.` : 'Reopen the results and questions from your completed contests.'}</p></div>{!contestId && <Link className="button" to="/admin"><Icon name="play" />Back to host</Link>}</div>
    {loading ? <div className="panel empty-state" role="status">Loading saved contests…</div> : error ? <div className="panel"><p role="alert" className="notice notice-error">{error}</p><button className="button" onClick={() => setRetry(retry + 1)}>Retry loading history</button></div> : contestId ? session ? <div className="host-stack">
      <section className="panel history-summary"><div><h2>Final results</h2><p className="muted mt-2">{Object.keys(session.players || {}).length} players · {questions.length} questions</p></div><div className="history-actions"><a className="button button-primary" href={`/present?session=${encodeURIComponent(session.id)}`} target="_blank" rel="noreferrer"><Icon name="monitor" />Show on projector</a><button className="button" onClick={() => download(session)}><Icon name="save" />Download contest</button></div></section>
      <section className="panel">{Object.keys(session.players || {}).length ? <LeaderboardPanel key={session.id} entries={buildLeaderboard(session.players || {})} title="Final standings" /> : <div className="empty-state">No players took part in this contest.</div>}</section>
      <section className="panel"><h2>Contest questions</h2><p className="muted mt-2 mb-5">The original questions, answers and explanations from this contest.</p>{questions.map((question, index) => <div className="setup-row" key={question.id}><span className="muted">{index + 1}.</span><div className="flex-1 min-w-0"><p>{question.text}</p><span className="muted text-xs">{index > session.currentQuestionIndex || (index === session.currentQuestionIndex && session.questionStartedAt === null) ? 'Not played' : 'Played'} · {question.timeLimit}s setup time</span></div><button className="button button-quiet" aria-label={`View question ${index + 1}`} onClick={() => setPreview(question)}>View</button></div>)}</section>
    </div> : <div className="panel empty-state"><h2>Saved contest not found</h2><p>It may not have finished yet, or it was saved on a different server.</p><Link className="button mt-4" to="/admin/history">View contest history</Link></div> : <>
      {contests.length > 0 && <div className="question-toolbar"><label className="search-field"><Icon name="search" /><input type="search" aria-label="Search contests" placeholder="Search by contest code or date…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label><span className="muted" role="status">{filtered.length} saved contest{filtered.length === 1 ? '' : 's'}</span></div>}
      {visible.length ? <><div className="history-list">{visible.map((contest) => <article className="panel history-row" key={contest.id}><div className="history-symbol"><Icon name="trophy" size={24} /></div><div className="history-copy"><h2>Contest {contest.joinCode}</h2><p className="muted mt-1">Finished {date(contest.endedAt)}</p><p className="muted text-sm mt-2">{contest.playerCount} players · {contest.questionCount} questions</p></div><Link className="button" to={`/admin/history/${encodeURIComponent(contest.id)}`} aria-label={`View results for contest ${contest.joinCode}`}>View results<Icon name="arrow" /></Link></article>)}</div><nav className="standings-pagination" aria-label="Contest history pages"><span className="muted">{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}</span><div><button className="button button-quiet" aria-label="Previous contests" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><Icon name="back" /></button><span className="page-count">Page {currentPage} of {pages}</span><button className="button button-quiet" aria-label="Next contests" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}><Icon name="arrow" /></button></div></nav></> : <div className="panel empty-state"><Icon name="history" size={36} className="mx-auto mb-4 text-amber-200" /><h2>{contests.length ? 'No matching contests' : 'Your finished contests will appear here'}</h2><p>{contests.length ? 'Try another contest code or date.' : 'Finish a contest from the host screen to save its questions, players and final scores.'}</p>{search && <button className="button mt-4" onClick={() => { setSearch(''); setPage(1); }}>Clear search</button>}</div>}
    </>}
    {preview && <QuestionPreviewModal question={preview} questionNumber={questions.findIndex((question) => question.id === preview.id) + 1} totalQuestions={questions.length} onClose={() => setPreview(null)} />}
  </AdminLayout>;
}
