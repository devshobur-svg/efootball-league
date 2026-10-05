'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { calculateStandings } from '@/lib/standings';
import { Tournament, StandingRow, TopScorerRow } from '@/lib/types';
import { Trophy, Share2, Check, Flame } from 'lucide-react';

function StandingsContent() {
  const searchParams = useSearchParams();
  const initialTournamentId = searchParams.get('tournamentId');
  const isPublicMode = searchParams.get('mode') === 'public';

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [topScorers, setTopScorers] = useState<TopScorerRow[]>([]);
  const [activeTab, setActiveTab] = useState<'table' | 'scorers'>('table');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadTournaments() {
      let query = supabase.from('tournaments').select('*');
      if (isPublicMode && initialTournamentId) {
        query = query.eq('id', initialTournamentId);
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data } = await query;
      if (data && data.length > 0) {
        setTournaments(data);
        if (initialTournamentId && data.some((t) => t.id === initialTournamentId)) {
          setSelectedTournament(initialTournamentId);
        } else {
          setSelectedTournament(data[0].id);
        }
      } else {
        setLoading(false);
      }
    }
    loadTournaments();
  }, [initialTournamentId, isPublicMode]);

  useEffect(() => {
    async function loadTableData() {
      if (!selectedTournament) return;
      setLoading(true);
      try {
        const { data: teamData } = await supabase.from('teams').select('*').eq('tournament_id', selectedTournament);
        const { data: matchData } = await supabase.from('matches').select('*').eq('tournament_id', selectedTournament);
        const { data: goalData } = await supabase.from('match_goals').select('*').eq('tournament_id', selectedTournament);

        if (teamData && matchData) {
          const table = calculateStandings(teamData, matchData);
          setStandings(table);
        }

        // Kalkulasi Top Scorer
        if (goalData && teamData) {
          const teamMap = new Map(teamData.map((t) => [t.id, t]));
          const scorerMap: Record<string, { playerName: string; teamId: string; count: number }> = {};

          goalData.forEach((g) => {
            const key = `${g.player_name.trim().toLowerCase()}_${g.team_id}`;
            if (!scorerMap[key]) {
              scorerMap[key] = {
                playerName: g.player_name.trim(),
                teamId: g.team_id,
                count: 0,
              };
            }
            scorerMap[key].count += 1;
          });

          const scorerList: TopScorerRow[] = Object.values(scorerMap)
            .map((s) => {
              const team = teamMap.get(s.teamId);
              return {
                playerName: s.playerName,
                teamName: team?.name || 'Klub',
                teamLogo: team?.logo_url || null,
                goalsCount: s.count,
              };
            })
            .sort((a, b) => b.goalsCount - a.goalsCount);

          setTopScorers(scorerList);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadTableData();
  }, [selectedTournament]);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentTournament = tournaments.find((t) => t.id === selectedTournament);

  return (
    <div className="space-y-4 pb-28 sm:pb-12 max-w-5xl mx-auto px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#0f1629] p-4 sm:p-5 rounded-2xl border border-[#1e294b] shadow-md">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-black text-white tracking-wide truncate uppercase">
              {isPublicMode && currentTournament ? currentTournament.name : 'Klasemen Liga'}
            </h1>
            <p className="text-[11px] text-[#64748b] truncate">
              {isPublicMode ? 'Tabel Poin & Rekap Performa Tim' : 'Standar Premier League & Top Scorer Leaderboard'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0 justify-end">
          {!isPublicMode && tournaments.length > 0 && (
            <select
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              className="bg-[#060913] border border-[#1e294b] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00f0ff] font-bold"
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleShare}
            className="px-3.5 py-1.5 rounded-xl bg-[#060913] border border-[#1e294b] hover:border-[#00f0ff] text-xs font-bold transition-all flex items-center space-x-1.5 text-white active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Share2 className="w-3.5 h-3.5 text-[#00f0ff]" />}
            <span>{copied ? 'Tersalin' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Selector: Klasemen vs Top Scorer */}
      <div className="flex space-x-2 bg-[#0f1629] p-1.5 rounded-2xl border border-[#1e294b]">
        <button
          onClick={() => setActiveTab('table')}
          className={`flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'table'
              ? 'bg-[#00f0ff] text-slate-950 shadow-md'
              : 'text-[#64748b] hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Tabel Klasemen</span>
        </button>

        <button
          onClick={() => setActiveTab('scorers')}
          className={`flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'scorers'
              ? 'bg-[#ff0055] text-white shadow-md'
              : 'text-[#64748b] hover:text-white'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Top Scorer ({topScorers.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="p-10 text-center text-[#64748b] bg-[#0f1629] rounded-2xl border border-[#1e294b] text-sm">
          Memperbarui data...
        </div>
      ) : activeTab === 'table' ? (
        /* TAB 1: KLASEMEN LEAGUE DENGAN FREEZE COLUMN */
        <div className="space-y-2">
          <div className="sm:hidden flex items-center justify-between text-[11px] text-[#64748b] px-2 font-medium">
            <span>Kolom klub dikunci</span>
            <span className="text-[#00f0ff]">Geser statistik ke kiri ➔</span>
          </div>

          <div className="bg-[#0f1629] border border-[#1e294b] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto relative">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead className="bg-[#060913] text-[#64748b] uppercase font-mono tracking-wider border-b border-[#1e294b] select-none text-[11px]">
                  <tr>
                    <th className="sticky left-0 z-20 bg-[#060913] py-3 px-3 text-center w-12 shrink-0">
                      Pos
                    </th>
                    <th className="sticky left-12 z-20 bg-[#060913] py-3 px-3 min-w-[150px] sm:min-w-[200px] shadow-[3px_0_8px_rgba(0,0,0,0.6)]">
                      Klub
                    </th>
                    <th className="py-3 px-3 text-center min-w-[42px]">P</th>
                    <th className="py-3 px-3 text-center min-w-[42px] text-green-400">W</th>
                    <th className="py-3 px-3 text-center min-w-[42px] text-yellow-400">D</th>
                    <th className="py-3 px-3 text-center min-w-[42px] text-[#ff0055]">L</th>
                    <th className="py-3 px-3 text-center min-w-[44px]">GF</th>
                    <th className="py-3 px-3 text-center min-w-[44px]">GA</th>
                    <th className="py-3 px-3 text-center min-w-[48px] font-bold">GD</th>
                    <th className="py-3 px-4 text-center min-w-[54px] font-black text-[#00f0ff] bg-[#00f0ff]/5">PTS</th>
                    <th className="py-3 px-4 text-center min-w-[125px]">Form (Last 5)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e294b]/50 font-medium">
                  {standings.map((row, index) => {
                    const rank = index + 1;
                    const isLeader = rank === 1;

                    return (
                      <tr
                        key={row.team.id}
                        className={`hover:bg-[#060913]/40 transition-colors ${
                          isLeader ? 'bg-[#00f0ff]/5' : ''
                        }`}
                      >
                        <td className={`sticky left-0 z-10 py-3 px-3 text-center font-bold font-mono ${
                          isLeader ? 'bg-[#0e1933]' : 'bg-[#0f1629]'
                        }`}>
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs ${
                              rank <= 4
                                ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 font-black'
                                : 'text-[#64748b]'
                            }`}
                          >
                            {rank}
                          </span>
                        </td>

                        <td className={`sticky left-12 z-10 py-3 px-3 shadow-[3px_0_8px_rgba(0,0,0,0.6)] ${
                          isLeader ? 'bg-[#0e1933]' : 'bg-[#0f1629]'
                        }`}>
                          <div className="flex items-center space-x-2.5 max-w-[140px] sm:max-w-[200px]">
                            <div className="w-7 h-7 rounded-lg bg-[#060913] border border-[#1e294b] flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                              {row.team.logo_url ? (
                                <img src={row.team.logo_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="font-bold text-xs text-[#00f0ff]">{row.team.name.charAt(0)}</span>
                              )}
                            </div>
                            <span className="font-bold text-white text-xs sm:text-sm truncate">
                              {row.team.name}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center font-mono text-xs">{row.played}</td>
                        <td className="py-3 px-3 text-center font-mono text-xs text-green-400 font-bold">{row.won}</td>
                        <td className="py-3 px-3 text-center font-mono text-xs text-yellow-400">{row.drawn}</td>
                        <td className="py-3 px-3 text-center font-mono text-xs text-[#ff0055]">{row.lost}</td>
                        <td className="py-3 px-3 text-center font-mono text-xs text-[#94a3b8]">{row.gf}</td>
                        <td className="py-3 px-3 text-center font-mono text-xs text-[#94a3b8]">{row.ga}</td>
                        <td className="py-3 px-3 text-center font-mono text-xs font-bold text-white">
                          {row.gd > 0 ? `+${row.gd}` : row.gd}
                        </td>
                        <td className="py-3 px-4 text-center font-black font-mono text-sm text-[#00f0ff] bg-[#00f0ff]/5">
                          {row.points}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            {row.form.length === 0 ? (
                              <span className="text-xs text-[#64748b]">-</span>
                            ) : (
                              row.form.map((res, fIdx) => (
                                <span
                                  key={fIdx}
                                  className={`w-4 h-4 rounded text-[9px] font-black flex items-center justify-center shrink-0 ${
                                    res === 'W'
                                      ? 'bg-green-500 text-black shadow-sm'
                                      : res === 'D'
                                      ? 'bg-yellow-500 text-black'
                                      : 'bg-[#ff0055] text-white'
                                  }`}
                                >
                                  {res}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* TAB 2: TOP SCORER (GOLDEN BOOT) */
        <div className="bg-[#0f1629] border border-[#1e294b] rounded-2xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center space-x-2 pb-2 border-b border-[#1e294b]">
            <Flame className="w-5 h-5 text-[#ff0055]" />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              Golden Boot Leaderboard
            </h2>
          </div>

          {topScorers.length === 0 ? (
            <p className="text-center py-8 text-xs text-[#64748b]">
              Belum ada pencetak gol yang dicatat. Input nama pencetak gol di menu Match!
            </p>
          ) : (
            <div className="space-y-2">
              {topScorers.map((scorer, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#060913] border border-[#1e294b] hover:border-[#00f0ff]/40 transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <span className={`w-6 text-center font-mono font-black text-sm ${idx === 0 ? 'text-[#ffe600]' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-[#64748b]'}`}>
                      #{idx + 1}
                    </span>

                    <div className="w-8 h-8 rounded-lg bg-[#0f1629] border border-[#1e294b] flex items-center justify-center overflow-hidden shrink-0">
                      {scorer.teamLogo ? (
                        <img src={scorer.teamLogo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-[#00f0ff]">FC</span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-white">{scorer.playerName}</h4>
                      <p className="text-[10px] text-[#64748b]">{scorer.teamName}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-[#ff0055]/15 border border-[#ff0055]/30">
                    <span className="text-xs">⚽</span>
                    <span className="font-mono font-black text-sm text-[#ff0055]">
                      {scorer.goalsCount} <span className="text-[10px] uppercase">Gol</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StandingsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-[#64748b]">Memuat klasemen...</div>}>
      <StandingsContent />
    </Suspense>
  );
}
