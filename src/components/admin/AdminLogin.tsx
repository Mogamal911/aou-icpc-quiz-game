import React, { useState } from 'react';
import { adminSignIn } from '../../services/authService';
import { AouLogo, GoldDivider, MeanderBorder } from '../ui/RomanDecorations';
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

  return (
    <div className="min-h-screen roman-bg-canvas flex items-center justify-center p-4 relative">
      <MeanderBorder className="fixed top-0 left-0 right-0 z-20 opacity-80" height={12} />

      <div className="relative z-10 w-full max-w-md my-auto py-6">
        {/* Card */}
        <div className="bg-[#0E1A36]/95 border border-[#C8A752]/35 rounded-3xl p-8 sm:p-10 shadow-2xl gold-bevel-card">
          {/* Logo & Heading */}
          <div className="text-center mb-6">
            <AouLogo size="lg" className="mb-3" />
            <GoldDivider className="my-3 max-w-xs mx-auto" />
            <h1 className="font-serif text-2xl sm:text-3xl font-black text-white tracking-[0.15em] uppercase">
              QUIZ MASTER ACCESS
            </h1>
            <p className="font-sans text-[#F0D278] text-xs mt-1 tracking-widest uppercase font-semibold">
              Imperial Arena Control Console
            </p>
          </div>

          {!isFirebaseConfigured && (
            <div className="bg-[#C8A752]/15 border border-[#C8A752]/40 rounded-xl p-3 mb-5 text-center text-xs text-[#F0D278] font-sans">
              <span className="font-bold">⚡ Demo / Local Mode Active:</span>
              <p className="opacity-90 mt-0.5">
                Use email <span className="font-mono underline">{ADMIN_EMAIL}</span> with any password.
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-sans text-[#F0D278] text-xs uppercase tracking-widest mb-1.5 font-bold">
                Admin Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#070D1B] border border-[#C8A752]/40 focus:border-[#F0D278] text-white rounded-xl px-4 py-3 font-sans text-sm focus:outline-none transition-colors"
                placeholder={ADMIN_EMAIL}
                required
              />
            </div>

            <div>
              <label className="block font-sans text-[#F0D278] text-xs uppercase tracking-widest mb-1.5 font-bold">
                Master Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#070D1B] border border-[#C8A752]/40 focus:border-[#F0D278] text-white rounded-xl px-4 py-3 font-sans text-sm focus:outline-none transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-950/80 border border-red-500/70 text-red-200 text-xs rounded-xl px-4 py-3 font-sans leading-relaxed text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="gold-button-primary w-full py-4 rounded-xl text-lg tracking-widest uppercase shadow-xl mt-2"
            >
              {loading ? 'Verifying Oath...' : 'ENTER THE ARENA'}
            </button>
          </form>

          <GoldDivider className="mt-8 max-w-xs mx-auto" />
          <p className="text-center font-sans text-[#C8A752]/40 text-[11px] mt-4 tracking-wider uppercase">
            AOU ICPC COMMUNITY · ORIENTATION DAY 2025–2026
          </p>
        </div>
      </div>

      <MeanderBorder className="fixed bottom-0 left-0 right-0 z-20 opacity-80" height={12} />
    </div>
  );
}
