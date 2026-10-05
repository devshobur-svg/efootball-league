'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Team } from '@/lib/types';
import { X, Users, Upload, Save, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  tournamentId: string;
  tournamentName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManageTeamsModal({ isOpen, tournamentId, tournamentName, onClose, onSuccess }: Props) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [teamNames, setTeamNames] = useState<Record<string, string>>({});
  const [teamLogos, setTeamLogos] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen || !tournamentId) return;

    async function loadTeams() {
      setLoading(true);
      const { data } = await supabase.from('teams').select('*').eq('tournament_id', tournamentId).order('name');
      if (data) {
        setTeams(data);
        const nameMap: Record<string, string> = {};
        const logoMap: Record<string, string> = {};
        data.forEach((t) => {
          nameMap[t.id] = t.name;
          logoMap[t.id] = t.logo_url || '';
        });
        setTeamNames(nameMap);
        setTeamLogos(logoMap);
      }
      setLoading(false);
    }
    loadTeams();
  }, [isOpen, tournamentId]);

  if (!isOpen) return null;

  const handleLogoUpload = (teamId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setTeamLogos((prev) => ({ ...prev, [teamId]: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateTeam = async (teamId: string) => {
    setSavingId(teamId);
    try {
      const { error } = await supabase
        .from('teams')
        .update({
          name: teamNames[teamId],
          logo_url: teamLogos[teamId] || null,
        })
        .eq('id', teamId);

      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      alert(`Gagal mengupdate klub: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#0f1629] border border-[#1e294b] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-[#1e294b] shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide uppercase">
                Kelola Klub Peserta
              </h2>
              <p className="text-xs text-[#64748b]">{tournamentName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#64748b] hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {loading ? (
            <div className="p-10 text-center text-[#64748b] text-xs">Memuat daftar klub...</div>
          ) : teams.length === 0 ? (
            <div className="p-10 text-center text-[#64748b] text-xs">Tidak ada tim terdaftar.</div>
          ) : (
            teams.map((t, idx) => (
              <div key={t.id} className="flex items-center space-x-3 bg-[#060913] p-3 rounded-xl border border-[#1e294b]">
                <span className="text-xs text-[#64748b] w-6 text-center font-mono font-bold">{idx + 1}.</span>

                <label className="relative w-10 h-10 rounded-xl bg-[#0f1629] border border-[#1e294b] hover:border-[#00f0ff] flex items-center justify-center overflow-hidden shrink-0 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(t.id, file);
                    }}
                  />
                  {teamLogos[t.id] ? (
                    <img src={teamLogos[t.id]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-4 h-4 text-[#64748b] hover:text-[#00f0ff]" />
                  )}
                </label>

                <input
                  type="text"
                  value={teamNames[t.id] || ''}
                  onChange={(e) => setTeamNames({ ...teamNames, [t.id]: e.target.value })}
                  className="flex-1 bg-transparent border-0 px-2 py-1 text-sm text-white focus:outline-none font-bold"
                />

                <button
                  onClick={() => handleUpdateTeam(t.id)}
                  disabled={savingId === t.id}
                  className="px-3 py-1.5 rounded-lg bg-[#00f0ff]/15 hover:bg-[#00f0ff] border border-[#00f0ff]/40 text-[#00f0ff] hover:text-slate-950 text-xs font-bold transition-all flex items-center space-x-1"
                >
                  {savingId === t.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{savingId === t.id ? 'Menyimpan...' : 'Simpan'}</span>
                </button>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-[#1e294b] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-[#060913] border border-[#1e294b] text-white hover:border-[#00f0ff]"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}