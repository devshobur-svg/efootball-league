'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Tournament, Match, Team, MasterClub } from '@/lib/types';
import CreateTournamentModal from '@/components/CreateTournamentModal';
import EditTournamentModal from '@/components/EditTournamentModal';
import ManageTeamsModal from '@/components/ManageTeamsModal';
import MasterClubsModal from '@/components/MasterClubsModal';
import { Trophy, Swords, Users, PlusCircle, ArrowRight, Edit, Trash2, ShieldCheck, Database, Loader2 } from 'lucide-react';

export default function HomePage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [masterClubsCount, setMasterClubsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // States Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMasterClubsOpen, setIsMasterClubsOpen] = useState(false);
  const [editTourney, setEditTourney] = useState<Tournament | null>(null);
  const [manageTeamsTourney, setManageTeamsTourney] = useState<Tournament | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(!!session);
      setCheckingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session);
      setCheckingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: tourneys } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false });
      const { data: mList } = await supabase.from('matches').select('*');
      const { data: tList } = await supabase.from('teams').select('*');
      const { count: mcCount } = await supabase.from('master_clubs').select('*', { count: 'exact', head: true });

      if (tourneys) setTournaments(tourneys);
      if (mList) setMatches(mList);
      if (tList) setTeams(tList);
      if (mcCount !== null) setMasterClubsCount(mcCount);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const handleDeleteTournament = async (t: Tournament) => {
    const confirmDel = window.confirm(`Apakah Anda yakin ingin MENGHAPUS turnamen "${t.name}"?`);
    if (!confirmDel) return;

    setDeletingId(t.id);
    try {
      const { error } = await supabase.from('tournaments').delete().eq('id', t.id);
      if (error) throw error;
      await loadData();
    } catch (err: any) {
      alert(`Gagal menghapus turnamen: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center space-x-2 text-[#64748b]">
        <Loader2 className="w-5 h-5 animate-spin text-[#00f0ff]" />
        <span>Memeriksa sesi...</span>
      </div>
    );
  }

  // Pengunjung Publik
  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#0f1629] border border-[#1e294b] rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(0,240,255,0.2)]">
            <Trophy className="w-7 h-7 text-[#00f0ff]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">eFootball Tournament Hub</h2>
            <p className="text-xs text-[#64748b] mt-1.5 leading-relaxed">
              Pantau jadwal pertandingan, skor langsung, dan update klasemen kompetisi secara real-time.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <Link
              href="/standings"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#0088ff] text-slate-950 font-black text-xs uppercase tracking-wider shadow-md hover:opacity-95 transition-opacity flex items-center justify-center"
            >
              Lihat Klasemen
            </Link>
            <Link
              href="/login"
              className="flex-1 py-2.5 rounded-xl bg-[#060913] border border-[#1e294b] hover:border-[#00f0ff] text-white font-bold text-xs flex items-center justify-center transition-colors"
            >
              Login Admin
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Admin
  return (
    <div className="space-y-6 pb-20 sm:pb-10 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-[#0f1629] border border-[#1e294b] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase">
              Admin Tournament Hub
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 text-[10px] font-black uppercase font-mono">
              ADMIN
            </span>
          </div>
          <p className="text-xs text-[#64748b]">
            Kelola kompetisi, jadwal laga, dan database klub.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#0088ff] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center space-x-2 shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:opacity-95 transition-all active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Buat Turnamen Baru</span>
        </button>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-[#0f1629] border border-[#1e294b] p-4 rounded-2xl flex items-center space-x-3.5 shadow-md">
          <div className="w-11 h-11 rounded-xl bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[#64748b] font-bold block uppercase tracking-wider">Total Turnamen</span>
            {loading ? (
              <div className="h-6 w-10 bg-[#1e294b] animate-pulse rounded mt-1" />
            ) : (
              <span className="text-xl font-black text-white font-mono">{tournaments.length}</span>
            )}
          </div>
        </div>

        {/* Card TOTAL KLUB: Klik untuk Buka Manajemen Master Database */}
        <div
          onClick={() => setIsMasterClubsOpen(true)}
          className="bg-[#0f1629] border border-[#1e294b] hover:border-[#ff0055] p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all shadow-md group"
          title="Klik untuk kelola database master klub"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#ff0055]/10 text-[#ff0055] border border-[#ff0055]/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-[#64748b] group-hover:text-[#ff0055] font-bold block uppercase tracking-wider transition-colors">
                Database Klub Master
              </span>
              {loading ? (
                <div className="h-6 w-10 bg-[#1e294b] animate-pulse rounded mt-1" />
              ) : (
                <span className="text-xl font-black text-white font-mono">
                  {masterClubsCount || teams.length}
                </span>
              )}
            </div>
          </div>
          <span className="text-[10px] text-[#ff0055] font-bold hidden sm:inline-block">
            Kelola ➔
          </span>
        </div>

        <div className="bg-[#0f1629] border border-[#1e294b] p-4 rounded-2xl flex items-center space-x-3.5 shadow-md">
          <div className="w-11 h-11 rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 flex items-center justify-center shrink-0">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[#64748b] font-bold block uppercase tracking-wider">Total Laga Terjadwal</span>
            {loading ? (
              <div className="h-6 w-10 bg-[#1e294b] animate-pulse rounded mt-1" />
            ) : (
              <span className="text-xl font-black text-white font-mono">{matches.length}</span>
            )}
          </div>
        </div>
      </div>

      {/* List Turnamen dengan CRUD Control Lengkap */}
      <div className="space-y-3">
        <h2 className="text-sm font-black text-white uppercase tracking-wider px-1">
          Daftar Turnamen
        </h2>

        {loading ? (
          <div className="p-12 text-center bg-[#0f1629] rounded-2xl border border-[#1e294b] flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#00f0ff]" />
            <span className="text-xs text-[#64748b]">Memuat data turnamen & klub...</span>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="p-8 text-center text-[#64748b] bg-[#0f1629] rounded-2xl border border-[#1e294b] text-xs">
            Belum ada turnamen. Klik tombol di atas untuk membuat turnamen baru.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tournaments.map((t) => (
              <div
                key={t.id}
                className="bg-[#0f1629] border border-[#1e294b] hover:border-[#00f0ff]/40 p-4 rounded-2xl shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#060913] border border-[#1e294b] flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {t.logo_url ? (
                      <img src={t.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Trophy className="w-5 h-5 text-[#00f0ff]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-white truncate">{t.name}</h3>
                    <div className="flex items-center space-x-2 text-[10px] text-[#64748b] font-mono mt-0.5">
                      <span className="uppercase text-[#00f0ff] font-bold">{t.type}</span>
                      <span>•</span>
                      <span>{t.home_away ? 'Home & Away' : 'Single Round / Gugur'}</span>
                    </div>
                  </div>
                </div>

                {/* CRUD ACTIONS BAR */}
                <div className="flex items-center space-x-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#1e294b]/50 justify-end shrink-0">
                  <button
                    onClick={() => setEditTourney(t)}
                    className="p-2 rounded-xl bg-[#060913] border border-[#1e294b] hover:border-[#00f0ff] text-[#94a3b8] hover:text-[#00f0ff] transition-all"
                    title="Edit Nama / Logo Turnamen"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setManageTeamsTourney(t)}
                    className="p-2 rounded-xl bg-[#060913] border border-[#1e294b] hover:border-[#00f0ff] text-[#94a3b8] hover:text-[#00f0ff] transition-all"
                    title="Kelola Klub & Logo Peserta"
                  >
                    <Users className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteTournament(t)}
                    disabled={deletingId === t.id}
                    className="p-2 rounded-xl bg-[#060913] border border-[#1e294b] hover:border-[#ff0055] text-[#64748b] hover:text-[#ff0055] transition-all disabled:opacity-50"
                    title="Hapus Turnamen Ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <Link
                    href={`/matches?tournamentId=${t.id}`}
                    className="px-3.5 py-2 rounded-xl bg-[#00f0ff]/15 border border-[#00f0ff]/40 hover:bg-[#00f0ff] text-[#00f0ff] hover:text-slate-950 text-xs font-black transition-all flex items-center space-x-1"
                  >
                    <span>Laga</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Buat Turnamen */}
      <CreateTournamentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadData}
      />

      {/* Modal Manajemen Database Master Klub */}
      <MasterClubsModal
        isOpen={isMasterClubsOpen}
        onClose={() => setIsMasterClubsOpen(false)}
        onUpdated={loadData}
      />

      {/* Modal Edit Detail Turnamen */}
      <EditTournamentModal
        isOpen={!!editTourney}
        tournament={editTourney}
        onClose={() => setEditTourney(null)}
        onSuccess={loadData}
      />

      {/* Modal Kelola Klub Turnamen */}
      {manageTeamsTourney && (
        <ManageTeamsModal
          isOpen={!!manageTeamsTourney}
          tournamentId={manageTeamsTourney.id}
          tournamentName={manageTeamsTourney.name}
          onClose={() => setManageTeamsTourney(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}