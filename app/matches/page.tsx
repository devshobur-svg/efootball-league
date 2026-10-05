'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Tournament, Match, Team } from '@/lib/types';
import CupBracketView from '@/components/CupBracketView';
import { Swords, ChevronLeft, ChevronRight, Save, Edit3, RotateCcw, Trophy, Trash2, X, BarChart2, Award, Search, LayoutGrid, ListFilter } from 'lucide-react';
import confetti from 'canvas-confetti';

function MatchesContent() {
  const searchParams = useSearchParams();
  const initialTournamentId = searchParams.get('tournamentId');

  const [isAdmin, setIsAdmin] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [allMatchesForH2H, setAllMatchesForH2H] = useState<Match[]>([]);
  const [tournamentTeams, setTournamentTeams] = useState<Team[]>([]);
  const [currentMatchday, setCurrentMatchday] = useState<number>(1);
  const [totalMatchdays, setTotalMatchdays] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Record<string, { home: number; away: number }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // States Filter Klub & Switch Tampilan Bagan
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [searchClubKeyword, setSearchClubKeyword] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'bracket'>('list');

  // States Modal Pencetak Gol & H2H
  const [scorerModalMatch, setScorerModalMatch] = useState<Match | null>(null);
  const [goalInputs, setGoalInputs] = useState<{ teamId: string; playerName: string }[]>([]);
  const [h2hMatch, setH2hMatch] = useState<Match | null>(null);
  const [cupChampion, setCupChampion] = useState<{ name: string; logo: string | null } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function loadTournaments() {
      let query = supabase.from('tournaments').select('*');
      if (initialTournamentId) {
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
  }, [initialTournamentId]);

  const loadMatches = async () => {
    if (!selectedTournament) return;
    setLoading(true);
    try {
      // Ambil daftar tim turnamen ini
      const { data: teamsData } = await supabase
        .from('teams')
        .select('*')
        .eq('tournament_id', selectedTournament)
        .order('name');
      if (teamsData) setTournamentTeams(teamsData);

      const { data } = await supabase
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
        .eq('tournament_id', selectedTournament)
        .order('matchday', { ascending: true });

      if (data) {
        setMatches(data as any);
        setAllMatchesForH2H(data as any);
        const maxMatchday = Math.max(...data.map((m) => m.matchday), 1);
        setTotalMatchdays(maxMatchday);

        const initialScoreMap: Record<string, { home: number; away: number }> = {};
        data.forEach((m) => {
          initialScoreMap[m.id] = {
            home: m.home_score ?? 0,
            away: m.away_score ?? 0,
          };
        });
        setScores(initialScoreMap);

        const currentTourney = tournaments.find((t) => t.id === selectedTournament);
        if (currentTourney?.type === 'cup') {
          const finalMatch = data.find((m) => m.round === 'Final' && m.status === 'completed');
          if (finalMatch) {
            const winner = finalMatch.home_score > finalMatch.away_score ? finalMatch.home_team : finalMatch.away_team;
            if (winner) {
              setCupChampion({ name: winner.name, logo: winner.logo_url });
            }
          } else {
            setCupChampion(null);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [selectedTournament, tournaments]);

  const handleScoreChange = (matchId: string, side: 'home' | 'away', val: string) => {
    if (!isAdmin) return;
    const num = Math.max(0, parseInt(val, 10) || 0);
    setScores((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [side]: num,
      },
    }));
  };

  const adjustScore = (matchId: string, side: 'home' | 'away', delta: number) => {
    if (!isAdmin) return;
    const current = scores[matchId] || { home: 0, away: 0 };
    const newVal = Math.max(0, current[side] + delta);
    setScores((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [side]: newVal,
      },
    }));
  };

  const checkAndAdvanceCupStage = async (updatedMatches: Match[], activeTourney: Tournament) => {
    if (activeTourney.type !== 'cup') return;

    const currentRoundMatches = updatedMatches.filter((m) => m.matchday === currentMatchday);
    const allCompleted = currentRoundMatches.every((m) => m.status === 'completed');
    if (!allCompleted) return;

    const hasDraw = currentRoundMatches.some((m) => m.home_score === m.away_score);
    if (hasDraw) {
      alert('Babak sistem gugur tidak boleh imbang! Tentukan pemenang via Extra Time atau Penalti.');
      return;
    }

    const winners = currentRoundMatches.map((m) =>
      m.home_score > m.away_score ? m.home_team_id : m.away_team_id
    );

    if (winners.length === 1) {
      const champId = winners[0];
      const { data: champTeam } = await supabase.from('teams').select('*').eq('id', champId).single();
      if (champTeam) {
        setCupChampion({ name: champTeam.name, logo: champTeam.logo_url });
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      }
      return;
    }

    const nextMatchdayNumber = currentMatchday + 1;
    const existingNextMatches = updatedMatches.filter((m) => m.matchday === nextMatchdayNumber);
    if (existingNextMatches.length > 0) return;

    const nextRoundName = winners.length === 2 ? 'Final' : winners.length <= 4 ? 'Semi Final' : 'Babak Gugur';
    const nextMatchesToInsert = [];

    for (let i = 0; i < winners.length; i += 2) {
      if (winners[i + 1]) {
        nextMatchesToInsert.push({
          tournament_id: activeTourney.id,
          matchday: nextMatchdayNumber,
          home_team_id: winners[i],
          away_team_id: winners[i + 1],
          home_score: 0,
          away_score: 0,
          status: 'upcoming',
          round: nextRoundName,
        });
      }
    }

    if (nextMatchesToInsert.length > 0) {
      const { error } = await supabase.from('matches').insert(nextMatchesToInsert);
      if (!error) {
        alert(`⚡ Babak ${nextRoundName} berhasil dibuat otomatis!`);
        setCurrentMatchday(nextMatchdayNumber);
        await loadMatches();
      }
    }
  };

  const handleSaveResult = async (match: Match) => {
    if (!isAdmin) return;
    const score = scores[match.id] || { home: 0, away: 0 };
    const currentTourney = tournaments.find((t) => t.id === selectedTournament);

    if (currentTourney?.type === 'cup' && score.home === score.away) {
      alert('Babak sistem gugur (Cup) tidak boleh imbang/seri!');
      return;
    }

    setSavingId(match.id);
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          home_score: score.home,
          away_score: score.away,
          status: 'completed',
          played_at: new Date().toISOString(),
        })
        .eq('id', match.id);

      if (error) throw error;

      const updatedList = matches.map((m) =>
        m.id === match.id
          ? { ...m, home_score: score.home, away_score: score.away, status: 'completed' as const }
          : m
      );

      setMatches(updatedList);
      if (currentTourney) {
        await checkAndAdvanceCupStage(updatedList, currentTourney);
      }
      await loadMatches();
    } catch (err: any) {
      alert(`Gagal menyimpan skor: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleResetMatch = async (matchId: string) => {
    if (!isAdmin) return;
    const confirmReset = window.confirm('Kembalikan status laga ini menjadi Belum Dimainkan?');
    if (!confirmReset) return;

    setSavingId(matchId);
    try {
      await supabase.from('matches').update({
        home_score: 0,
        away_score: 0,
        status: 'upcoming',
        played_at: null,
      }).eq('id', matchId);

      await supabase.from('match_goals').delete().eq('match_id', matchId);
      await loadMatches();
    } catch (err: any) {
      alert(`Gagal mereset laga: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const openScorerModal = async (match: Match) => {
    setScorerModalMatch(match);
    const { data } = await supabase.from('match_goals').select('*').eq('match_id', match.id);
    if (data && data.length > 0) {
      setGoalInputs(data.map((g) => ({ teamId: g.team_id, playerName: g.player_name })));
    } else {
      setGoalInputs([]);
    }
  };

  const addGoalInput = (teamId: string) => {
    setGoalInputs([...goalInputs, { teamId, playerName: '' }]);
  };

  const removeGoalInput = (index: number) => {
    setGoalInputs(goalInputs.filter((_, i) => i !== index));
  };

  const saveGoals = async () => {
    if (!scorerModalMatch || !isAdmin) return;
    try {
      await supabase.from('match_goals').delete().eq('match_id', scorerModalMatch.id);
      const validGoals = goalInputs
        .filter((g) => g.playerName.trim().length > 0)
        .map((g) => ({
          tournament_id: scorerModalMatch.tournament_id,
          match_id: scorerModalMatch.id,
          team_id: g.teamId,
          player_name: g.playerName.trim(),
        }));

      if (validGoals.length > 0) {
        await supabase.from('match_goals').insert(validGoals);
      }
      setScorerModalMatch(null);
      alert('Pencetak gol berhasil disimpan!');
    } catch (err: any) {
      alert(`Gagal menyimpan pencetak gol: ${err.message}`);
    }
  };

  const getH2HStats = (teamAId: string, teamBId: string) => {
    const directMatches = allMatchesForH2H.filter(
      (m) =>
        m.status === 'completed' &&
        ((m.home_team_id === teamAId && m.away_team_id === teamBId) ||
          (m.home_team_id === teamBId && m.away_team_id === teamAId))
    );

    let aWins = 0;
    let bWins = 0;
    let draws = 0;

    directMatches.forEach((m) => {
      const isAHome = m.home_team_id === teamAId;
      const scoreA = isAHome ? m.home_score : m.away_score;
      const scoreB = isAHome ? m.away_score : m.home_score;
      if (scoreA > scoreB) aWins++;
      else if (scoreB > scoreA) bWins++;
      else draws++;
    });

    return { total: directMatches.length, aWins, bWins, draws };
  };

  const activeTournamentInfo = tournaments.find((t) => t.id === selectedTournament);

  // Filter Match Logika: Matchday ATAU Filter Klub Tertentu
  const isFilteringByClub = selectedTeamFilter !== 'all' || searchClubKeyword.trim().length > 0;

  const filteredMatches = matches.filter((m) => {
    if (isFilteringByClub) {
      const matchTeamFilter =
        selectedTeamFilter === 'all' ||
        m.home_team_id === selectedTeamFilter ||
        m.away_team_id === selectedTeamFilter;

      const keyword = searchClubKeyword.toLowerCase();
      const matchKeyword =
        !keyword ||
        (m.home_team?.name && m.home_team.name.toLowerCase().includes(keyword)) ||
        (m.away_team?.name && m.away_team.name.toLowerCase().includes(keyword));

      return matchTeamFilter && matchKeyword;
    }

    return m.matchday === currentMatchday;
  });

  return (
    <div className="space-y-3.5 pb-28 sm:pb-12 max-w-5xl mx-auto px-1 sm:px-0">
      {/* Header Turnamen & Dropdown */}
      <div className="bg-[#0f1629] p-4 sm:p-5 rounded-2xl border border-[#1e294b] shadow-md flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30 flex items-center justify-center shrink-0">
            <Swords className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-xl font-black text-white tracking-wide truncate uppercase">
                {activeTournamentInfo ? activeTournamentInfo.name : 'Jadwal & Hasil'}
              </h1>
              {activeTournamentInfo && (
                <span className="px-2 py-0.5 rounded-full bg-[#00f0ff]/15 border border-[#00f0ff]/30 text-[#00f0ff] text-[10px] font-black uppercase">
                  {activeTournamentInfo.type}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#64748b] truncate">
              {isAdmin ? 'Mode Admin: Input skor & pencetak gol' : 'Papan Skor Resmi (Mode Penonton)'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {/* Switch View Bracket (Khusus Turnamen Cup) */}
          {activeTournamentInfo?.type === 'cup' && (
            <div className="flex bg-[#060913] p-1 rounded-xl border border-[#1e294b]">
              <button
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'list' ? 'bg-[#00f0ff] text-slate-950 shadow-sm' : 'text-[#64748b] hover:text-white'
                }`}
                title="Tampilan List"
              >
                List
              </button>
              <button
                onClick={() => setViewMode('bracket')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'bracket' ? 'bg-[#00f0ff] text-slate-950 shadow-sm' : 'text-[#64748b] hover:text-white'
                }`}
                title="Tampilan Bagan Gugur"
              >
                Bagan
              </button>
            </div>
          )}

          {tournaments.length > 0 && (
            <select
              value={selectedTournament}
              onChange={(e) => {
                setSelectedTournament(e.target.value);
                setCurrentMatchday(1);
                setSelectedTeamFilter('all');
                setSearchClubKeyword('');
              }}
              className="bg-[#060913] border border-[#1e294b] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00f0ff] font-bold"
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* FILTER & PENCARIAN KLUB (Poin 3) */}
      <div className="bg-[#0f1629] p-3 rounded-2xl border border-[#1e294b] flex flex-col sm:flex-row items-center gap-2.5 shadow-sm">
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 text-[#64748b] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari klub... (misal: Chelsea, Depok FC)"
            value={searchClubKeyword}
            onChange={(e) => setSearchClubKeyword(e.target.value)}
            className="w-full bg-[#060913] border border-[#1e294b] rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#00f0ff] font-medium"
          />
          {searchClubKeyword && (
            <button onClick={() => setSearchClubKeyword('')} className="absolute right-3 top-2.5 text-[#64748b] hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="w-full sm:w-auto flex items-center space-x-2">
          <ListFilter className="w-4 h-4 text-[#00f0ff] shrink-0" />
          <select
            value={selectedTeamFilter}
            onChange={(e) => setSelectedTeamFilter(e.target.value)}
            className="w-full sm:w-56 bg-[#060913] border border-[#1e294b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00f0ff] font-bold"
          >
            <option value="all">Semua Klub ({tournamentTeams.length})</option>
            {tournamentTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TAMPILAN BAGAN KHUSUS CUP (Poin 4) */}
      {viewMode === 'bracket' && activeTournamentInfo?.type === 'cup' ? (
        <div className="bg-[#0f1629] p-4 sm:p-5 rounded-2xl border border-[#1e294b] shadow-xl">
          <div className="flex items-center space-x-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              Bagan Visual Sistem Gugur
            </h2>
          </div>
          <CupBracketView matches={matches} />
        </div>
      ) : (
        /* TAMPILAN LIST STANDAR */
        <div className="space-y-3">
          {/* Matchday Slider (Hanya tampil jika tidak sedang memfilter klub) */}
          {!isFilteringByClub ? (
            <div className="flex items-center justify-between bg-[#0f1629] px-3 py-2 rounded-xl border border-[#1e294b]">
              <button
                disabled={currentMatchday <= 1}
                onClick={() => setCurrentMatchday((prev) => Math.max(prev - 1, 1))}
                className="w-9 h-9 rounded-lg bg-[#060913] border border-[#1e294b] hover:border-[#00f0ff] disabled:opacity-30 text-white flex items-center justify-center transition-all active:scale-90"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center">
                <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider block leading-none">
                  {activeTournamentInfo?.type === 'cup' ? 'Ronde Turnamen' : 'Jadwal Laga'}
                </span>
                <span className="font-black text-sm sm:text-base text-[#00f0ff] tracking-wide">
                  MATCHDAY {currentMatchday} <span className="text-[#64748b] font-normal text-xs">/ {totalMatchdays}</span>
                </span>
              </div>

              <button
                disabled={currentMatchday >= totalMatchdays}
                onClick={() => setCurrentMatchday((prev) => Math.min(prev + 1, totalMatchdays))}
                className="w-9 h-9 rounded-lg bg-[#060913] border border-[#1e294b] hover:border-[#00f0ff] disabled:opacity-30 text-white flex items-center justify-center transition-all active:scale-90"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-[#00f0ff]/10 px-4 py-2 rounded-xl border border-[#00f0ff]/30 text-xs">
              <span className="text-[#00f0ff] font-bold">
                Menampilkan hasil filter klub ({filteredMatches.length} laga ditemukan)
              </span>
              <button
                onClick={() => {
                  setSelectedTeamFilter('all');
                  setSearchClubKeyword('');
                }}
                className="text-xs text-white hover:text-[#ff0055] font-bold underline"
              >
                Reset Filter
              </button>
            </div>
          )}

          {/* List Kartu Pertandingan */}
          {filteredMatches.length === 0 ? (
            <div className="p-8 text-center text-[#64748b] bg-[#0f1629] rounded-2xl border border-[#1e294b] text-xs">
              Tidak ada pertandingan yang cocok dengan filter klub ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredMatches.map((m) => {
                const currentScore = scores[m.id] || { home: m.home_score, away: m.away_score };
                const isCompleted = m.status === 'completed';

                return (
                  <div
                    key={m.id}
                    className="bg-[#0f1629] border border-[#1e294b] hover:border-[#00f0ff]/30 rounded-2xl p-3.5 space-y-3 shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between text-[11px] border-b border-[#1e294b]/50 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[#64748b]">Match #{m.id.substring(0, 5)}</span>
                        <span className="text-[10px] text-[#00f0ff] font-bold font-mono">
                          MD {m.matchday} {m.round ? `• ${m.round}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setH2hMatch(m)}
                          className="px-2 py-0.5 rounded bg-[#060913] border border-[#1e294b] hover:border-[#00f0ff] text-[#94a3b8] hover:text-[#00f0ff] text-[10px] font-bold flex items-center space-x-1"
                        >
                          <BarChart2 className="w-3 h-3" />
                          <span>H2H</span>
                        </button>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isCompleted
                              ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                              : 'bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30'
                          }`}
                        >
                          {isCompleted ? 'Selesai' : 'Upcoming'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-11 items-center gap-2 pt-0.5">
                      {/* HOME TEAM */}
                      <div className="col-span-4 flex items-center space-x-2 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#060913] border border-[#1e294b] flex items-center justify-center overflow-hidden shrink-0">
                          {m.home_team?.logo_url ? (
                            <img src={m.home_team.logo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-black text-xs text-[#00f0ff]">H</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs sm:text-sm text-white truncate leading-tight">
                            {m.home_team?.name || 'Home'}
                          </p>
                          <span className="text-[9px] font-semibold text-[#64748b] block">Tuan Rumah</span>
                        </div>
                      </div>

                      {/* SCORE */}
                      <div className="col-span-3 flex justify-center">
                        {!isAdmin ? (
                          <div className="px-2.5 py-1 rounded-xl bg-[#060913] border border-[#1e294b] text-center min-w-[56px]">
                            {isCompleted ? (
                              <div className="flex items-center justify-center space-x-1 font-mono text-sm sm:text-base font-black text-[#00f0ff]">
                                <span>{m.home_score}</span>
                                <span className="text-[#64748b] text-xs">:</span>
                                <span>{m.away_score}</span>
                              </div>
                            ) : (
                              <span className="text-[11px] font-black text-[#64748b] tracking-wider">VS</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 bg-[#060913] p-1 rounded-xl border border-[#1e294b]">
                            <div className="flex flex-col items-center">
                              <button
                                type="button"
                                onClick={() => adjustScore(m.id, 'home', 1)}
                                className="w-6 h-4 text-[9px] text-[#64748b] hover:text-[#00f0ff] flex items-center justify-center font-bold"
                              >
                                ▲
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={currentScore.home}
                                onChange={(e) => handleScoreChange(m.id, 'home', e.target.value)}
                                className="w-7 h-5 text-center bg-transparent text-xs font-black text-[#00f0ff] focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => adjustScore(m.id, 'home', -1)}
                                className="w-6 h-4 text-[9px] text-[#64748b] hover:text-[#00f0ff] flex items-center justify-center font-bold"
                              >
                                ▼
                              </button>
                            </div>

                            <span className="text-[#64748b] font-bold text-[10px]">:</span>

                            <div className="flex flex-col items-center">
                              <button
                                type="button"
                                onClick={() => adjustScore(m.id, 'away', 1)}
                                className="w-6 h-4 text-[9px] text-[#64748b] hover:text-[#ff0055] flex items-center justify-center font-bold"
                              >
                                ▲
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={currentScore.away}
                                onChange={(e) => handleScoreChange(m.id, 'away', e.target.value)}
                                className="w-7 h-5 text-center bg-transparent text-xs font-black text-[#00f0ff] focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => adjustScore(m.id, 'away', -1)}
                                className="w-6 h-4 text-[9px] text-[#64748b] hover:text-[#ff0055] flex items-center justify-center font-bold"
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* AWAY TEAM */}
                      <div className="col-span-4 flex items-center justify-end space-x-2 min-w-0 text-right">
                        <div className="min-w-0">
                          <p className="font-bold text-xs sm:text-sm text-white truncate leading-tight">
                            {m.away_team?.name || 'Away'}
                          </p>
                          <span className="text-[9px] font-semibold text-[#64748b] block">Tamu</span>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-[#060913] border border-[#1e294b] flex items-center justify-center overflow-hidden shrink-0">
                          {m.away_team?.logo_url ? (
                            <img src={m.away_team.logo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-black text-xs text-[#ff0055]">A</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ADMIN ACTION FOOTER */}
                    {isAdmin && (
                      <div className="pt-2 border-t border-[#1e294b]/50 flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-1.5">
                          {isCompleted && (
                            <button
                              type="button"
                              onClick={() => handleResetMatch(m.id)}
                              disabled={savingId === m.id}
                              className="px-2.5 py-1.5 rounded-lg bg-[#060913] border border-[#1e294b] hover:border-yellow-500/50 text-[#64748b] hover:text-yellow-400 text-[11px] font-bold flex items-center space-x-1 transition-all"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reset</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openScorerModal(m)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#060913] border border-[#1e294b] hover:border-[#00f0ff] text-[#94a3b8] hover:text-[#00f0ff] text-[11px] font-bold flex items-center space-x-1 transition-all"
                          >
                            <span>⚽ Pencetak Gol</span>
                          </button>
                        </div>

                        <button
                          onClick={() => handleSaveResult(m)}
                          disabled={savingId === m.id}
                          className={`px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center space-x-1.5 transition-all active:scale-95 ${
                            isCompleted
                              ? 'bg-[#00f0ff]/15 hover:bg-[#00f0ff] border border-[#00f0ff]/40 text-[#00f0ff] hover:text-slate-950'
                              : 'bg-gradient-to-r from-[#00f0ff] to-[#0088ff] text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                          }`}
                        >
                          {isCompleted ? <Edit3 className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                          <span>
                            {savingId === m.id ? 'Saving...' : isCompleted ? 'Update' : 'Simpan'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL INPUT PENCETAK GOL */}
      {scorerModalMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0f1629] border border-[#1e294b] rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e294b]">
              <h3 className="font-black text-white text-base">⚽ PENCETAK GOL PERTANDINGAN</h3>
              <button onClick={() => setScorerModalMatch(null)} className="text-[#64748b] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#94a3b8]">
              {scorerModalMatch.home_team?.name} vs {scorerModalMatch.away_team?.name}
            </p>

            {isAdmin && (
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => addGoalInput(scorerModalMatch.home_team_id)}
                  className="flex-1 py-1.5 rounded-xl bg-[#060913] border border-[#00f0ff]/40 hover:bg-[#00f0ff]/10 text-[#00f0ff] text-xs font-bold"
                >
                  + Gol {scorerModalMatch.home_team?.name}
                </button>
                <button
                  type="button"
                  onClick={() => addGoalInput(scorerModalMatch.away_team_id)}
                  className="flex-1 py-1.5 rounded-xl bg-[#060913] border border-[#ff0055]/40 hover:bg-[#ff0055]/10 text-[#ff0055] text-xs font-bold"
                >
                  + Gol {scorerModalMatch.away_team?.name}
                </button>
              </div>
            )}

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {goalInputs.length === 0 ? (
                <p className="text-center py-4 text-xs text-[#64748b]">Belum ada pencetak gol ditambahkan.</p>
              ) : (
                goalInputs.map((item, idx) => {
                  const isHome = item.teamId === scorerModalMatch.home_team_id;
                  return (
                    <div key={idx} className="flex items-center space-x-2 bg-[#060913] p-2 rounded-xl border border-[#1e294b]">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${isHome ? 'bg-[#00f0ff]/20 text-[#00f0ff]' : 'bg-[#ff0055]/20 text-[#ff0055]'}`}>
                        {isHome ? 'HOME' : 'AWAY'}
                      </span>
                      <input
                        type="text"
                        disabled={!isAdmin}
                        placeholder="Nama pemain (misal: Mbappe)"
                        value={item.playerName}
                        onChange={(e) => {
                          const updated = [...goalInputs];
                          updated[idx].playerName = e.target.value;
                          setGoalInputs(updated);
                        }}
                        className="flex-1 bg-transparent text-xs text-white focus:outline-none font-bold"
                      />
                      {isAdmin && (
                        <button onClick={() => removeGoalInput(idx)} className="text-[#64748b] hover:text-[#ff0055]">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#1e294b]">
              <button
                onClick={() => setScorerModalMatch(null)}
                className="px-4 py-2 rounded-xl bg-[#060913] text-xs font-bold text-white"
              >
                Tutup
              </button>
              {isAdmin && (
                <button
                  onClick={saveGoals}
                  className="px-5 py-2 rounded-xl bg-[#00f0ff] text-slate-950 font-black text-xs shadow-md"
                >
                  Simpan Pencetak Gol
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL HEAD-TO-HEAD PREVIEW */}
      {h2hMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0f1629] border border-[#1e294b] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e294b]">
              <div className="flex items-center space-x-2">
                <BarChart2 className="w-5 h-5 text-[#00f0ff]" />
                <h3 className="font-black text-white text-base">HEAD-TO-HEAD PREVIEW</h3>
              </div>
              <button onClick={() => setH2hMatch(null)} className="text-[#64748b] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between bg-[#060913] p-3 rounded-xl border border-[#1e294b]">
              <div className="text-center w-5/12">
                <p className="font-bold text-xs text-white truncate">{h2hMatch.home_team?.name}</p>
              </div>
              <span className="text-xs font-black text-[#64748b]">VS</span>
              <div className="text-center w-5/12">
                <p className="font-bold text-xs text-white truncate">{h2hMatch.away_team?.name}</p>
              </div>
            </div>

            {(() => {
              const stats = getH2HStats(h2hMatch.home_team_id, h2hMatch.away_team_id);
              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-[#060913] p-2.5 rounded-xl border border-[#1e294b]">
                      <span className="text-[10px] text-[#64748b] block font-bold">Menang</span>
                      <span className="text-base font-black text-[#00f0ff]">{stats.aWins}</span>
                    </div>
                    <div className="bg-[#060913] p-2.5 rounded-xl border border-[#1e294b]">
                      <span className="text-[10px] text-[#64748b] block font-bold">Imbang</span>
                      <span className="text-base font-black text-yellow-400">{stats.draws}</span>
                    </div>
                    <div className="bg-[#060913] p-2.5 rounded-xl border border-[#1e294b]">
                      <span className="text-[10px] text-[#64748b] block font-bold">Menang</span>
                      <span className="text-base font-black text-[#ff0055]">{stats.bWins}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#64748b] text-center">
                    Total pertemuan selesai di turnamen ini: {stats.total} laga
                  </p>
                </div>
              );
            })()}

            <div className="flex justify-end pt-2 border-t border-[#1e294b]">
              <button
                onClick={() => setH2hMatch(null)}
                className="w-full py-2 rounded-xl bg-[#060913] border border-[#1e294b] text-xs font-bold text-white hover:border-[#00f0ff]"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MatchesPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-[#64748b]">Memuat modul match...</div>}>
      <MatchesContent />
    </Suspense>
  );
}
