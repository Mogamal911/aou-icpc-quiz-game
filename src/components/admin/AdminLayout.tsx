import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { AouLogo } from '../ui/RomanDecorations';
import { Icon } from '../ui/Icon';

export function AdminLayout({ children, onSignOut, busy = false, sessionId }: {
  children: React.ReactNode; onSignOut: () => void; busy?: boolean; sessionId?: string | null;
}) {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return <div className="admin-app min-h-screen">
    <header className="admin-header">
      <div className="admin-brand"><AouLogo size="sm" showText={false} /><div><strong>AOU ICPC</strong><span>Quiz host</span></div></div>
      <nav aria-label="Admin navigation" className="admin-nav">
        <NavLink to="/admin" end onClick={(e) => { if (busy) e.preventDefault(); }}><Icon name="play" />Contest</NavLink>
        <NavLink to="/admin/questions" onClick={(e) => { if (busy) e.preventDefault(); }}><Icon name="questions" />Questions</NavLink>
        <NavLink to="/admin/history" onClick={(e) => { if (busy) e.preventDefault(); }}><Icon name="history" />History</NavLink>
      </nav>
      <div className="admin-header-actions">
        {sessionId && <a aria-label="Open projector" className="button button-quiet" href={`/present?session=${sessionId}`} target="_blank" rel="noreferrer"><Icon name="monitor" /><span>Projector</span></a>}
        <button type="button" aria-label="Sign out" className="button button-quiet" disabled={busy} onClick={onSignOut}><Icon name="logout" /><span>Sign out</span></button>
      </div>
    </header>
    <main className="admin-main">{children}</main>
  </div>;
}
