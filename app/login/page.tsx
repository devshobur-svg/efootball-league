'use client';

import React, { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, Lock, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

function LoginContent() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
      if (data.session) {
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login gagal. Periksa kembali email dan password!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#0f1629] border border-[#1e294b] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-white tracking-wide uppercase">
            ADMIN PORTAL
          </h1>
          <p className="text-xs text-[#64748b]">
            Masuk untuk mengelola kompetisi, update skor, dan input jadwal.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-[#ff0055]/15 border border-[#ff0055]/40 rounded-xl text-[#ff0055] text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5">
              Email Admin
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#64748b] absolute left-3.5 top-3" />
              <input
                type="email"
                required
                placeholder="admin@efootball.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#060913] border border-[#1e294b] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#00f0ff] font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#64748b] absolute left-3.5 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#060913] border border-[#1e294b] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#00f0ff] font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#0088ff] text-slate-950 font-black text-xs uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 shadow-[0_0_15px_rgba(0,240,255,0.3)] flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memverifikasi...</span>
              </>
            ) : (
              <span>Masuk Sebagai Admin</span>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-[#1e294b] text-center">
          <Link
            href="/standings"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#64748b] hover:text-[#00f0ff] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Papan Klasemen</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-[#64748b]">Memuat form login...</div>}>
      <LoginContent />
    </Suspense>
  );
}