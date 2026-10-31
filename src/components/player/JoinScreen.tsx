import React, { useState, useEffect } from 'react';
import { resolveSessionByCode, joinSession } from '../../services/gameService';
import { AouLogo } from '../ui/RomanDecorations';
import { normalizeNickname } from '../../utils/playerManagement';
import { Icon } from '../ui/Icon';

import type { PlayerInfo } from '../../services/playerIdentityService';
interface JoinScreenProps { initialCode?: string; initialSessionId?: string; onJoined: (info: PlayerInfo) => void; savedPlayer: PlayerInfo | null; onResume: () => void; }

export function JoinScreen({ initialCode = '', initialSessionId = '', onJoined, savedPlayer, onResume }: JoinScreenProps) {
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => { setCode(initialCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)); }, [initialCode]);

  async function handleJoin(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError('');
    const cleanCode = code.trim().toUpperCase();
    let cleanName: string;
    try { cleanName = normalizeNickname(nickname); }
    catch (error) { setError((error as Error).message); return; }
    if (!initialSessionId && cleanCode.length !== 6) { setError('Enter the 6-character code shown by your host.'); return; }
    if (cleanName.length < 2 || cleanName.length > 20) { setError('Enter a name between 2 and 20 characters.'); return; }
    setLoading(true);
    try {
      const sessionId = initialSessionId || await resolveSessionByCode(cleanCode);
      if (!sessionId) { setError('That code was not found. Check it with your host and try again.'); return; }
      const playerId = await joinSession(sessionId, cleanName);
      onJoined({ sessionId, playerId, nickname: cleanName, joinCode: cleanCode });
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not join. Check your connection and try again.'); }
    finally { setLoading(false); }
  }

  return <div className="player-app"><main className="player-join">
    <div className="player-brand"><AouLogo size="md" showText={false} /><span>AOU ICPC<span className="player-brand-sub">Quiz arena</span></span></div>
    <h1>Ready to play?</h1><p className="muted">Join your host’s contest with a code and a name.</p>
    {savedPlayer && <section className="player-resume"><h2>Welcome back, {savedPlayer.nickname}</h2><p className="muted">{savedPlayer.joinCode ? `Contest ${savedPlayer.joinCode}` : 'Your saved contest'} · Your submitted answers and score are kept. The contest continues while you’re away.</p><button className="button button-primary" onClick={onResume}><Icon name="play" />Return to contest</button></section>}
    <form onSubmit={handleJoin} className="player-join-form">
      {!initialSessionId && <label className="field" htmlFor="join-code">Contest code<input id="join-code" className="player-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="ABCDEF" maxLength={6} autoComplete="off" autoCapitalize="characters" spellCheck={false} required disabled={loading} aria-describedby="join-help" /></label>}
      <label className="field" htmlFor="player-name">Your name or handle<input id="player-name" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="How you’ll appear on the leaderboard" minLength={2} maxLength={20} autoComplete="nickname" required disabled={loading} aria-describedby="name-help" /><small id="name-help">2–20 characters. Choose a unique name; everyone in the contest can see it.</small></label>
      {error && <p role="alert" className="notice notice-error">{error}</p>}
      <button className="button button-primary" type="submit" disabled={loading}><Icon name="arrow" />{loading ? 'Joining…' : 'Join contest'}</button>
      <p id="join-help" className="muted text-sm">Your host will start the questions once everyone is ready.</p>
    </form>
  </main></div>;
}
