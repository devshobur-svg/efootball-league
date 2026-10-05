'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { calculateStandings } from '@/lib/standings';
import { Tournament, StandingRow } from '@/lib/types';
import { History, Trophy, Award, Calendar, CheckCircle } from 'lucide-react';

interface HistoryItem {
  tournament: Tournament;
  champion: StandingRow | null;
  runnerUp: StandingRow | null;
  totalMatches: number;
}

export default function HistoryPage() {
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      try {
        const { data: tourneys } = await supabase
          .from('tournaments')
          .select('*')
          .order('created_at', { ascending: false });

        if (tourneys) {
          const results: HistoryItem[] = [];

          for (const t of tourneys) {
            const { data: teams } = await supabase.from('teams').select('*').eq('tournament_id', t.id);
            const { data: matches } = await supabase.from('matches').select('*').eq('tournament_id', t.id);

            if (teams && matches) {
              const standings = calculateStandings(teams, matches);
              results.push({
                tournament: t,
                champion: standings[0] || null,
                runnerUp: standings[1] || null,
                totalMatches: matches.length,
              });
            }
          }
          setHistoryList(results);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-ef-card p-6 rounded-xl border border-ef-border">
        <h1 className="text-xl sm:text-2xl font-black text-white flex items-center space-x-2">
          <History className="w-6 h-6 text-ef-cyan" />
          <span>RIWAYAT & ARSIP KOMPETISI</span>
        </h1>
        <p className="text-xs text-ef-muted mt-1">Daftar juara dan rekap performa kompetisi yang telah dibuat</p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-ef-muted bg-ef-card rounded-xl border border-ef-border">
          Memuat riwayat kompetisi...
        </div>
      ) : historyList.length === 0 ? (
        <div className="p-12 text-center text-ef-muted bg-ef-card rounded-xl border border-ef-border">
          Belum ada riwayat turnamen.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {historyList.map((item) => (
            <div
              key={item.tournament.id}
              className="bg-ef-card border border-ef-border rounded-xl p-5 space-y-4 shadow-lg hover:border-ef-cyan/40 transition-all"
            >
              <div className="flex justify-between items-start border-b border-ef-border/50 pb-3">
                <div>
                  <h3 className="font-extrabold text-base text-white">{item.tournament.name}</h3>
                  <div className="flex items-center space-x-2 text-xs text-ef-muted mt-1">
                    <span className="uppercase font-bold text-ef-cyan">{item.tournament.type}</span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(item.tournament.created_at).toLocaleDateString('id-ID')}</span>
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded bg-ef-bg border border-ef-border text-[11px] font-mono text-ef-muted">
                  {item.totalMatches} Matches
                </span>
              </div>

              {/* Champion & Runner up cards */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Champion */}
                <div className="bg-ef-bg/70 border border-yellow-500/30 rounded-lg p-3 relative overflow-hidden">
                  <div className="flex items-center space-x-1.5 text-yellow-400 font-bold text-xs uppercase mb-1">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Peringkat 1</span>
                  </div>
                  <p className="font-black text-sm text-white truncate">
                    {item.champion ? item.champion.team.name : '-'}
                  </p>
                  <p className="text-[11px] text-ef-muted mt-0.5 font-mono">
                    {item.champion ? `${item.champion.points} Pts | GD ${item.champion.gd}` : '-'}
                  </p>
                </div>

                {/* Runner Up */}
                <div className="bg-ef-bg/70 border border-ef-border rounded-lg p-3 relative overflow-hidden">
                  <div className="flex items-center space-x-1.5 text-slate-300 font-bold text-xs uppercase mb-1">
                    <Award className="w-3.5 h-3.5" />
                    <span>Runner-up</span>
                  </div>
                  <p className="font-black text-sm text-white truncate">
                    {item.runnerUp ? item.runnerUp.team.name : '-'}
                  </p>
                  <p className="text-[11px] text-ef-muted mt-0.5 font-mono">
                    {item.runnerUp ? `${item.runnerUp.points} Pts | GD ${item.runnerUp.gd}` : '-'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
