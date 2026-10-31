import React, { useState } from 'react';
import { adminSignIn } from '../../services/authService';
import { AouLogo } from '../ui/RomanDecorations';
import { Link } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { ADMIN_EMAIL, isFirebaseConfigured } from '../../firebase/config';

interface AdminLoginProps {
  onLogin: (user?: any) => void;
}

export function AdminLogin({ onLogin }: AdminLoginProps) {
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const u = await adminSignIn(email, password);
      onLogin(u);
    } catch (err: any) {
      setError(err?.message || 'Invalid credentials or not authorized as admin.');
    } finally {
      setLoading(false);
    }
  }

  return <div className="player-app auth-page"><main className="auth-main">
    <Link to="/join" className="auth-brand player-brand" aria-label="AOU ICPC quiz arena"><AouLogo size="md" showText={false} /><span>AOU ICPC<span className="player-brand-sub">Quiz host</span></span></Link>
    <div className="auth-heading"><h1>Admin sign in</h1><p className="muted">Prepare questions and host your contest.</p></div>
    {!isFirebaseConfigured && <p className="auth-demo">Local demo · Use the admin email below and any password with at least 3 characters.</p>}
    <form onSubmit={handleSubmit} className="form-stack">
      <label className="field" htmlFor="admin-email">Admin email<input id="admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required disabled={loading} /></label>
      <label className="field" htmlFor="admin-password">Password<input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required disabled={loading} /></label>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <button className="button button-primary" disabled={loading}><Icon name="arrow" />{loading ? 'Signing in…' : 'Sign in'}</button>
    </form>
    <Link className="button button-quiet auth-back" to="/join"><Icon name="back" />Back to quiz arena</Link>
  </main></div>;
}
