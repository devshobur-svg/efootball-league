'use client';

import React from 'react';
import { Match } from '@/lib/types';
import { Trophy, Swords } from 'lucide-react';

interface Props {
  matches: Match[];
}

export default function CupBracketView({ matches }: Props) {
  // Kelompokkan laga berdasarkan matchday / tahapan ronde
  const roundsMap = matches.reduce((acc, match) => {
    const roundName = match.round || `Matchday ${match.matchday}`;
    if (!acc[roundName]) {
      acc[roundName] = [];
    }
    acc[roundName].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  const roundEntries = Object.entries(roundsMap);

  if (roundEntries.length === 0) {
    return (
      <div className="p-8 text-center text-[#64748b] bg-[#0f1629] rounded-2xl border border-[#1e294b]">
        Belum ada bagan gugur yang tersedia.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-6 pt-2">
      <div className="flex items-stretch space-x-6 min-w-max px-2">
        {roundEntries.map(([roundName, roundMatches], roundIdx) => (
          <div key={roundName} className="flex flex-col justify-around w-64 space-y-4">
            {/* Header Nama Babak */}
            <div className="text-center py-2 px-3 bg-[#060913] rounded-xl border border-[#1e294b] shadow-sm">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#00f0ff]">
                {roundName}
              </span>
              <span className="block text-[10px] text-[#64748b] font-medium">
                {roundMatches.length} Laga
              </span>
            </div>

            {/* List Match Cards di Babak Ini */}
            <div className="flex flex-col justify-around flex-1 space-y-6 my-auto">
              {roundMatches.map((m) => {
                const isCompleted = m.status === 'completed';
                const homeWin = isCompleted && m.home_score > m.away_score;
                const awayWin = isCompleted && m.away_score > m.home_score;

                return (
                  <div
                    key={m.id}
                    className="relative bg-[#0f1629] border border-[#1e294b] rounded-xl p-3 shadow-md hover:border-[#00f0ff]/40 transition-all space-y-2"
                  >
                    {/* Home Team Row */}
                    <div
                      className={`flex items-center justify-between p-1.5 rounded-lg transition-colors ${
                        homeWin ? 'bg-[#00f0ff]/10 text-white font-black' : 'text-[#94a3b8]'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate pr-2">
                        <div className="w-5 h-5 rounded bg-[#060913] border border-[#1e294b] flex items-center justify-center shrink-0 overflow-hidden">
                          {m.home_team?.logo_url ? (
                            <img src={m.home_team.logo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[9px] text-[#00f0ff]">H</span>
                          )}
                        </div>
                        <span className="text-xs truncate">{m.home_team?.name || 'TBD'}</span>
                      </div>
                      <span className={`text-xs font-mono font-bold ${homeWin ? 'text-[#00f0ff]' : ''}`}>
                        {isCompleted ? m.home_score : '-'}
                      </span>
                    </div>

                    <div className="h-[1px] bg-[#1e294b]" />

                    {/* Away Team Row */}
                    <div
                      className={`flex items-center justify-between p-1.5 rounded-lg transition-colors ${
                        awayWin ? 'bg-[#ff0055]/10 text-white font-black' : 'text-[#94a3b8]'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate pr-2">
                        <div className="w-5 h-5 rounded bg-[#060913] border border-[#1e294b] flex items-center justify-center shrink-0 overflow-hidden">
                          {m.away_team?.logo_url ? (
                            <img src={m.away_team.logo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[9px] text-[#ff0055]">A</span>
                          )}
                        </div>
                        <span className="text-xs truncate">{m.away_team?.name || 'TBD'}</span>
                      </div>
                      <span className={`text-xs font-mono font-bold ${awayWin ? 'text-[#ff0055]' : ''}`}>
                        {isCompleted ? m.away_score : '-'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
