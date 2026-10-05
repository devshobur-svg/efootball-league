'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, Swords, Trophy, History, LogIn, LogOut, ShieldCheck, Eye } from 'lucide-react';

function NavbarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. Cek sesi saat mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(!!session);
      setAuthLoading(false);
    });

    // 2. Dengarkan perubahan sesi
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    router.push('/standings');
    router.refresh();
  };

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard, adminOnly: true },
    { href: '/matches', label: 'Match', icon: Swords, adminOnly: false },
    { href: '/standings', label: 'Standing', icon: Trophy, adminOnly: false },
    { href: '/history', label: 'History', icon: History, adminOnly: true },
  ];

  const visibleLinks = isAdmin ? navLinks : navLinks.filter((l) => !l.adminOnly);

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-[#060913]/95 backdrop-blur-md border-b border-[#1e294b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <Link href={isAdmin ? '/' : '/standings'} className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00f0ff] to-[#ff0055] flex items-center justify-center font-black text-black text-sm italic shadow-[0_0_12px_rgba(0,240,255,0.4)]">
                eF
              </div>
              <span className="font-black text-base sm:text-lg tracking-wider text-white">
                TOURNAMENT <span className="text-[#00f0ff]">HUB</span>
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden sm:flex space-x-2">
              {visibleLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;

                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-[#0f1629] text-[#00f0ff] border border-[#00f0ff]/40 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                        : 'text-[#94a3b8] hover:text-white hover:bg-[#0f1629]/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right Action: Admin Status / Login / Logout */}
            <div className="flex items-center space-x-2">
              {!authLoading && (
                <>
                  {isAdmin ? (
                    <div className="flex items-center space-x-2">
                      <span className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-bold font-mono">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>ADMIN</span>
                      </span>
                      <button
                        onClick={handleLogout}
                        className="px-3 py-1.5 rounded-xl bg-[#060913] border border-[#1e294b] hover:border-[#ff0055] text-[#ff0055] text-xs font-bold flex items-center space-x-1.5 transition-all"
                        title="Keluar dari akun admin"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Logout</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] text-[10px] font-bold font-mono">
                        <Eye className="w-3 h-3" />
                        <span>PENONTON</span>
                      </span>
                      <Link
                        href="/login"
                        className="px-3 py-1.5 rounded-xl bg-[#0f1629] border border-[#1e294b] hover:border-[#00f0ff] text-[#00f0ff] text-xs font-bold flex items-center space-x-1.5 transition-all"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Login</span>
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#060913]/95 backdrop-blur-lg border-t border-[#1e294b] px-3 py-1.5 shadow-[0_-5px_20px_rgba(0,0,0,0.6)]">
        <div className={`grid ${visibleLinks.length === 2 ? 'grid-cols-2' : visibleLinks.length === 3 ? 'grid-cols-3' : 'grid-cols-4'} gap-2`}>
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.label}
                href={link.href}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
                  isActive
                    ? 'text-[#00f0ff] bg-[#00f0ff]/10 font-black'
                    : 'text-[#64748b] hover:text-white font-medium'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                <span className="text-[11px] mt-1 tracking-tight font-bold">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export default function Navbar() {
  return (
    <Suspense fallback={
      <header className="sticky top-0 z-40 bg-[#060913]/95 h-14 sm:h-16 border-b border-[#1e294b] flex items-center px-4 max-w-7xl mx-auto" />
    }>
      <NavbarContent />
    </Suspense>
  );
}
