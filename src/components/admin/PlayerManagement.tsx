import React, { useMemo, useState } from 'react';
import type { GameSession, LeaderboardEntry } from '../../types/game';
import { buildLeaderboard } from '../../utils/gameUtils';
import { renamePlayer, removePlayer } from '../../services/gameService';
import { LeaderboardPanel } from '../ui/LeaderboardPanel';
import { useTransientState } from '../../hooks/useTransientState';
import { Dialog } from '../ui/Dialog';
import { Icon } from '../ui/Icon';

export function PlayerManagement({ session, disabled = false }: { session: GameSession; disabled?: boolean }) {
  const entries = useMemo(() => buildLeaderboard(session.players || {}), [session.players]);
  const [editing, setEditing] = useState<LeaderboardEntry | null>(null);
  const [removing, setRemoving] = useState<LeaderboardEntry | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useTransientState('');
  async function save(action: () => Promise<void>, success: string) {
    if (saving) return;
    setSaving(true); setError(''); setMessage('');
    try { await action(); setEditing(null); setRemoving(null); setMessage(success); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not update the player. Try again.'); }
    finally { setSaving(false); }
  }
  return <section className="panel player-management">
    {message && <p className="notice notice-success" role="status">{message}</p>}
    <LeaderboardPanel entries={entries} title={session.phase === 'lobby' ? 'Players' : 'Leaderboard'} showScores={session.phase !== 'lobby'} renderActions={session.phase === 'finished' ? undefined : (entry) => <div className="player-row-actions">
      <button className="icon-button" aria-label={`Rename ${entry.nickname}`} title="Rename player" disabled={disabled || saving} onClick={() => { setEditing(entry); setName(entry.nickname); setError(''); }}><Icon name="edit" /></button>
      <button className="icon-button" aria-label={`Remove ${entry.nickname}`} title="Remove player" disabled={disabled || saving} onClick={() => { setRemoving(entry); setError(''); }}><Icon name="trash" /></button>
    </div>} />
    {editing && <Dialog title="Rename player" busy={saving} onClose={() => setEditing(null)}><form onSubmit={(event) => { event.preventDefault(); void save(() => renamePlayer(session.id, editing.playerId, name), 'Player renamed. Their score and answers are kept.'); }}><div className="dialog-body form-stack"><label className="field">Player name<input data-autofocus value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={20} required disabled={saving} /><small>2–20 characters. Names must be unique in this contest, regardless of case.</small></label>{error && <p className="notice notice-error" role="alert">{error}</p>}</div><div className="dialog-actions"><button type="button" className="button" disabled={saving} onClick={() => setEditing(null)}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save name'}</button></div></form></Dialog>}
    {removing && <Dialog title={`Remove ${removing.nickname}?`} busy={saving} onClose={() => setRemoving(null)}><div className="dialog-body"><p>This removes their answers and score from this contest. Their device will show that they have been removed.</p><p className="muted mt-3">They can join again as a new player.</p>{error && <p className="notice notice-error mt-3" role="alert">{error}</p>}</div><div className="dialog-actions"><button className="button" disabled={saving} onClick={() => setRemoving(null)}>Cancel</button><button className="button button-danger" disabled={saving} onClick={() => void save(() => removePlayer(session.id, removing.playerId), 'Player removed from the contest.')}><Icon name="trash" />{saving ? 'Removing…' : 'Remove player'}</button></div></Dialog>}
  </section>;
}
