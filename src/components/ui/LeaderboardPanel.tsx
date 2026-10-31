import React, { memo, useEffect, useId, useMemo, useState } from 'react';
import type { LeaderboardEntry } from '../../types/game';
import { Icon } from './Icon';

interface LeaderboardPanelProps {
  entries: LeaderboardEntry[];
  pageSize?: number;
  highlightPlayerId?: string;
  showTitle?: boolean;
  showScores?: boolean;
  title?: string;
  className?: string;
  renderActions?: (entry: LeaderboardEntry) => React.ReactNode;
}

export const LeaderboardPanel = memo(function LeaderboardPanel({
  entries, pageSize = 10, highlightPlayerId, showTitle = true, showScores = true,
  title = 'Leaderboard', className = '', renderActions,
}: LeaderboardPanelProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const searchId = useId();
  const query = search.normalize('NFKC').trim().toLowerCase();
  const filtered = useMemo(() => entries.filter((entry) => entry.nickname.normalize('NFKC').toLowerCase().includes(query)), [entries, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);
  const myIndex = entries.findIndex((entry) => entry.playerId === highlightPlayerId);
  useEffect(() => { setPage((previous) => Math.min(previous, pageCount)); }, [pageCount]);

  return <div className={`standings ${className}`}>
    {showTitle && <div className="standings-heading"><h2><Icon name={showScores ? 'trophy' : 'users'} />{title}</h2><span className="muted">{entries.length} {entries.length === 1 ? 'player' : 'players'}</span></div>}
    <div className="standings-toolbar">
      <label className="search-field" htmlFor={searchId}><Icon name="search" /><span className="sr-only">Search players</span><input id={searchId} type="search" value={search} placeholder="Search players…" onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
      {myIndex >= 0 && <button className="button button-quiet" onClick={() => { setSearch(''); setPage(Math.floor(myIndex / pageSize) + 1); }}>Find my rank</button>}
    </div>
    <div className="standings-table-wrap"><table className="standings-table">
      <caption className="sr-only">{title}{showScores ? '. Ranks are for the whole contest, including when searching.' : ''}</caption>
      <thead><tr>{showScores && <th scope="col" className="standings-rank">Rank</th>}<th scope="col">Player</th>{showScores && <th scope="col" className="standings-score">Points</th>}{renderActions && <th scope="col" className="standings-actions"><span className="sr-only">Player actions</span></th>}</tr></thead>
      <tbody>{visible.map((entry) => <tr key={entry.playerId} className={entry.playerId === highlightPlayerId ? 'is-you' : ''}>
        {showScores && <td className="standings-rank">{entry.score > 0 && entry.rank <= 3 && <Icon name="trophy" size={16} />}<span>{entry.rank}</span></td>}
        <th scope="row"><span className="standings-name">{entry.nickname}</span>{entry.playerId === highlightPlayerId && <span className="standings-you">You</span>}</th>
        {showScores && <td className="standings-score">{entry.score.toLocaleString()}</td>}
        {renderActions && <td className="standings-actions">{renderActions(entry)}</td>}
      </tr>)}</tbody>
    </table>
    {!visible.length && <div className="standings-empty"><p>{entries.length ? 'No players match your search.' : 'Waiting for players to join.'}</p>{search && <button className="button button-quiet" onClick={() => { setSearch(''); setPage(1); }}>Clear search</button>}</div>}
    </div>
    <nav className="standings-pagination" aria-label={`${title} pages`}>
      <span className="muted" role="status">{filtered.length ? `${start + 1}–${Math.min(start + pageSize, filtered.length)} of ${filtered.length}` : '0 players'}{query && filtered.length > 0 ? ' matching' : ''}</span>
      <div><button className="button button-quiet" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><Icon name="back" /></button><span className="page-count">Page {currentPage} of {pageCount}</span><button className="button button-quiet" aria-label="Next page" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}><Icon name="arrow" /></button></div>
    </nav>
  </div>;
});
