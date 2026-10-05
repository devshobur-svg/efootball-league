'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Tournament, Match, Team } from '@/lib/types';
import CreateTournamentModal from '@/components/CreateTournamentModal';
import ManageTournamentModal from '@/components/ManageTournamentModal';
import { Trophy, Plus, Shield, Swords, Calendar, Share2, Check, ArrowRight, Settings2 } from 'lucide-react';

export default function DashboardPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [manageTarget, setManageTarget] = useState<Tournament | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: tourneyData } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: teamData } = await supabase.from('teams').select('*');

      const { data: matchData } = await supabase
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
        .eq('status', 'upcoming')
        .order('matchday', { ascending: true })
        .limit(5);

      if (tourneyData) setTournaments(tourneyData);
      if (teamData) setTeams(teamData);
      if (matchData) setUpcomingMatches(matchData as any);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // LINK SHARE DILENGKAPI DENGAN mode=public
  const handleShare = (tournamentId: string) => {
    const url = `${window.location.origin}/standings?tournamentId=${tournamentId}&mode=public`;
    navigator.clipboard.writeText(url);
    setCopiedId(tournamentId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeTournaments = tournaments.filter((t) => t.is_active);

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Banner Header */}
      <div className="relative rounded-2xl bg-[#0f1629] p-6 sm:p-8 border border-[#1e294b] shadow-[0_10px_35px_rgba(0,0,0,0.5)] overflow-hidden">
        <div className="absolute -right-10 -top-10 w-72 h-72 bg-[#00f0ff] opacity-10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] text-xs font-bold uppercase tracking-wider mb-2">
              <span>eFootball Pro Manager</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-wider uppercase">
              eFootball <span className="text-[#00f0ff]">League</span> Hub
            </h1>
            <p className="text-sm text-[#94a3b8] mt-1.5 max-w-xl">
              Platform manajemen turnamen esport lengkap. Atur jadwal otomatis, kelola klub peserta, dan pantau standing secara real-time.
            </p>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #00f0ff 0%, #0088ff 100%)',
              boxShadow: '0 0 25px rgba(0, 240, 255, 0.45)',
            }}
            className="flex items-center space-x-2.5 px-6 py-3.5 rounded-xl text-slate-950 font-black text-sm uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0 border border-cyan-200"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>+ Buat Turnamen Baru</span>
          </button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0f1629] border border-[#1e294b] p-5 rounded-2xl flex items-center space-x-4 shadow-md">
          <div className="p-3.5 rounded-xl bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase font-extrabold text-[#64748b] tracking-wider">Kompetisi Aktif</p>
            <p className="text-2xl font-black text-white mt-0.5">{activeTournaments.length}</p>
          </div>
        </div>

        <div className="bg-[#0f1629] border border-[#1e294b] p-5 rounded-2xl flex items-center space-x-4 shadow-md">
          <div className="p-3.5 rounded-xl bg-[#ff0055]/10 text-[#ff0055] border border-[#ff0055]/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase font-extrabold text-[#64748b] tracking-wider">Total Tim Terdaftar</p>
            <p className="text-2xl font-black text-white mt-0.5">{teams.length}</p>
          </div>
        </div>

        <div className="bg-[#0f1629] border border-[#1e294b] p-5 rounded-2xl flex items-center space-x-4 shadow-md">
          <div className="p-3.5 rounded-xl bg-[#ffe600]/10 text-[#ffe600] border border-[#ffe600]/20">
            <Swords className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase font-extrabold text-[#64748b] tracking-wider">Laga Menanti</p>
            <p className="text-2xl font-black text-white mt-0.5">{upcomingMatches.length}</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Active Tournaments & Upcoming Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white uppercase tracking-wide flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-[#00f0ff]" />
              <span>Daftar Turnamen Berjalan</span>
            </h2>
          </div>

          {loading ? (
            <div className="p-10 text-center text-[#64748b] bg-[#0f1629] rounded-2xl border border-[#1e294b]">
              Memuat data turnamen...
            </div>
          ) : activeTournaments.length === 0 ? (
            <div className="p-10 text-center bg-[#0f1629] rounded-2xl border border-[#1e294b]">
              <p className="text-[#94a3b8] mb-3 text-sm">Belum ada turnamen yang sedang berjalan.</p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="text-xs text-[#00f0ff] font-bold hover:underline"
              >
                + Mulai buat kompetisi sekarang
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTournaments.map((t) => (
                <div
                  key={t.id}
                  className="bg-[#0f1629] border border-[#1e294b] hover:border-[#00f0ff]/50 transition-all p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2.5">
                      <h3 className="font-black text-white text-lg tracking-wide uppercase">{t.name}</h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#00f0ff]/15 border border-[#00f0ff]/40 text-[#00f0ff] text-[10px] font-black uppercase tracking-wider">
                        {t.type}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-[#64748b] font-medium">
                      <span className="text-[#94a3b8]">{t.home_away ? 'Format Home & Away' : 'Single Round'}</span>
                      <span>•</span>
                      <span>Dibuat: {new Date(t.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5 shrink-0">
                    <button
                      onClick={() => setManageTarget(t)}
                      className="px-3.5 py-2 rounded-xl bg-[#060913] border border-[#00f0ff]/40 hover:border-[#00f0ff] hover:bg-[#00f0ff]/10 text-xs font-bold flex items-center space-x-1.5 transition-all text-[#00f0ff] cursor-pointer shadow-sm"
                    >
                      <Settings2 className="w-4 h-4 text-[#00f0ff]" />
                      <span>Manage</span>
                    </button>

                    <button
                      onClick={() => handleShare(t.id)}
                      className="px-3.5 py-2 rounded-xl bg-[#060913] border border-[#1e294b] hover:border-[#00f0ff] text-xs font-semibold flex items-center space-x-1.5 transition-colors text-white"
                      title="Salin Link Share Mode Publik (Hanya Lihat)"
                    >
                      {copiedId === t.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-green-400 font-bold">Link Publik Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5 text-[#64748b]" />
                          <span>Share</span>
                        </>
                      )}
                    </button>

                    <Link
                      href={`/matches?tournamentId=${t.id}`}
                      className="px-4 py-2 rounded-xl bg-[#00f0ff] hover:bg-cyan-300 text-slate-950 text-xs font-black transition-all flex items-center space-x-1 shadow-[0_0_12px_rgba(0,240,255,0.3)]"
                    >
                      <span>Match</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Matches */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white uppercase tracking-wide flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-[#ff0055]" />
              <span>Upcoming Matches</span>
            </h2>
            <Link href="/matches" className="text-xs font-bold text-[#00f0ff] hover:underline">
              Lihat Semua
            </Link>
          </div>

          <div className="bg-[#0f1629] border border-[#1e294b] rounded-2xl p-4 space-y-3 shadow-lg">
            {upcomingMatches.length === 0 ? (
              <p className="text-xs text-[#64748b] text-center py-6">Tidak ada laga mendatang yang aktif.</p>
            ) : (
              upcomingMatches.map((m) => (
                <div key={m.id} className="p-3.5 bg-[#060913] border border-[#1e294b] rounded-xl text-xs space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-[#64748b] font-mono border-b border-[#1e294b]/60 pb-1.5">
                    <span className="font-bold text-[#94a3b8]">MATCHDAY {m.matchday}</span>
                    <span className="text-[#00f0ff] font-extrabold uppercase bg-[#00f0ff]/10 px-2 py-0.5 rounded">
                      {m.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-white pt-0.5">
                    <span className="truncate w-5/12 text-left">{m.home_team?.name || 'Home'}</span>
                    <span className="px-2 py-0.5 rounded bg-[#0f1629] border border-[#1e294b] text-[10px] text-[#64748b] font-mono">
                      VS
                    </span>
                    <span className="truncate w-5/12 text-right">{m.away_team?.name || 'Away'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <CreateTournamentModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={fetchData}
      />

      <ManageTournamentModal
        tournament={manageTarget}
        isOpen={!!manageTarget}
        onClose={() => setManageTarget(null)}
        onUpdated={fetchData}
      />
    </div>
  );
}
