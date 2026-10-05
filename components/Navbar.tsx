'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LayoutDashboard, Swords, Trophy, History, Eye } from 'lucide-react';

function NavbarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isPublicMode = searchParams.get('mode') === 'public';
  const tournamentId = searchParams.get('tournamentId');

  const querySuffix = isPublicMode
    ? `?mode=public${tournamentId ? `&tournamentId=${tournamentId}` : ''}`
    : '';

  const allLinks = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard, publicVisible: false },
    { href: `/matches${querySuffix}`, label: 'Match', icon: Swords, publicVisible: true },
    { href: `/standings${querySuffix}`, label: 'Standing', icon: Trophy, publicVisible: true },
    { href: '/history', label: 'History', icon: History, publicVisible: false },
  ];

  const visibleLinks = isPublicMode
    ? allLinks.filter((l) => l.publicVisible)
    : allLinks;

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-[#060913]/95 backdrop-blur-md border-b border-[#1e294b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <Link
              href={isPublicMode ? `/standings${querySuffix}` : '/'}
              className="flex items-center space-x-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00f0ff] to-[#ff0055] flex items-center justify-center font-black text-black text-sm italic shadow-[0_0_12px_rgba(0,240,255,0.4)]">
                eF
              </div>
              <span className="font-black text-base sm:text-lg tracking-wider text-white">
                TOURNAMENT <span className="text-[#00f0ff]">HUB</span>
              </span>
            </Link>

            {/* Public Mode Indicator Badge */}
            {isPublicMode && (
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] text-xs font-bold font-mono">
                <Eye className="w-3.5 h-3.5" />
                <span>VIEW ONLY</span>
              </div>
            )}

            {/* Desktop Navigation */}
            <nav className="hidden sm:flex space-x-2">
              {visibleLinks.map((link) => {
                const Icon = link.icon;
                const pathWithoutQuery = link.href.split('?')[0];
                const isActive = pathname === pathWithoutQuery;

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
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#060913]/95 backdrop-blur-lg border-t border-[#1e294b] px-3 py-1.5 shadow-[0_-5px_20px_rgba(0,0,0,0.6)]">
        <div className={`grid ${isPublicMode ? 'grid-cols-2' : 'grid-cols-4'} gap-2`}>
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            const pathWithoutQuery = link.href.split('?')[0];
            const isActive = pathname === pathWithoutQuery;

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
