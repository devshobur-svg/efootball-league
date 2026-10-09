'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MasterClub } from '@/lib/types';
import { generateLeagueMatches, generateCupBracketMatches } from '@/lib/tournament-generator';
import { X, Trophy, Shield, Upload, Check, Loader2, Database, Image as ImageIcon } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTournamentModal({ isOpen, onClose, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [tournamentLogo, setTournamentLogo] = useState<string | null>(null);
  const [type, setType] = useState<'league' | 'cup'>('league');
  const [homeAway, setHomeAway] = useState(true);
  const [numTeams, setNumTeams] = useState<number>(4);
  const [teams, setTeams] = useState<{ name: string; logo_url: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [masterClubs, setMasterClubs] = useState<MasterClub[]>([]);
  const [showMasterPicker, setShowMasterPicker] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      supabase.from('master_clubs').select('*').order('name').then(({ data }) => {
        if (data) setMasterClubs(data);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const updated = [...teams];
    while (updated.length < numTeams) {
      updated.push({ name: `Club ${updated.length + 1}`, logo_url: null });
    }
    while (updated.length > numTeams) {
      updated.pop();
    }
    setTeams(updated);
  }, [numTeams]);

  if (!isOpen) return null;

  const handleTournamentLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setTournamentLogo(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectMasterClub = (slotIndex: number, master: MasterClub) => {
    const updated = [...teams];
    updated[slotIndex] = {
      name: master.name,
      logo_url: master.logo_url,
    };
    setTeams(updated);
    setShowMasterPicker(null);
  };

  const handleClubLogoUpload = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const updated = [...teams];
      updated[index] = {
        ...updated[index],
        logo_url: result,
      };
      setTeams(updated);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      // 1. Simpan data Turnamen beserta Logo
      const { data: tourney, error: tErr } = await supabase
        .from('tournaments')
        .insert({
          name: name.trim(),
          logo_url: tournamentLogo || null,
          type,
          home_away: type === 'league' ? homeAway : false,
        })
        .select()
        .single();

      if (tErr) throw tErr;

      // 2. Simpan Tim Peserta
      const teamsPayload = teams.map((t) => ({
        tournament_id: tourney.id,
        name: t.name.trim(),
        logo_url: t.logo_url,
      }));

      const { data: createdTeams, error: teamsErr } = await supabase
        .from('teams')
        .insert(teamsPayload)
        .select();

      if (teamsErr) throw teamsErr;

      // 3. Simpan juga klub baru ke master_clubs jika belum ada di database
      const masterClubsToSync = teams
        .filter((t) => t.name.trim().length > 0)
        .map((t) => ({
          name: t.name.trim(),
          logo_url: t.logo_url,
        }));
      
      if (masterClubsToSync.length > 0) {
        await supabase.from('master_clubs').upsert(masterClubsToSync, { onConflict: 'name' });
      }

      // 4. Generate Match Schedule
      const teamIds = createdTeams.map((t) => t.id);
      let matchPayloads = [];

      if (type === 'league') {
        matchPayloads = generateLeagueMatches(tourney.id, teamIds, homeAway);
      } else {
        matchPayloads = generateCupBracketMatches(tourney.id, teamIds);
      }

      if (matchPayloads.length > 0) {
        const { error: mErr } = await supabase.from('matches').insert(matchPayloads);
        if (mErr) throw mErr;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Gagal membuat turnamen: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#0f1629] border border-[#1e294b] rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col p-4 sm:p-6 shadow-2xl space-y-4">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1e294b] shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
                Buat Kompetisi Baru
              </h2>
              <p className="text-xs text-[#64748b]">Format Liga atau Sistem Gugur (Cup)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#64748b] hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Section 1: Logo & Nama Turnamen */}
          <div className="bg-[#060913] p-3.5 rounded-xl border border-[#1e294b] space-y-3">
            <span className="text-[11px] font-black text-[#64748b] uppercase tracking-wider block">
              Identitas Turnamen
            </span>
            <div className="flex items-center space-x-3.5">
              {/* Upload Logo Turnamen */}
              <label className="relative w-16 h-16 rounded-xl bg-[#0f1629] border border-[#1e294b] hover:border-[#00f0ff] flex flex-col items-center justify-center overflow-hidden shrink-0 cursor-pointer group transition-all">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleTournamentLogoUpload(file);
                  }}
                />
                {tournamentLogo ? (
                  <img src={tournamentLogo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-[#64748b] group-hover:text-[#00f0ff] transition-colors">
                    <Upload className="w-5 h-5 mb-0.5" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Logo</span>
                  </div>
                )}
              </label>

              <div className="flex-1 space-y-1">
                <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider">
                  Nama Kompetisi
                </label>
                <input
                  type="text"
                  required
                  placeholder="misal: eFootball League Season 5"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0f1629] border border-[#1e294b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00f0ff] font-bold"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Format & Pilihan Home-Away */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5">
                Format Kompetisi
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('league')}
                  className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                    type === 'league'
                      ? 'bg-[#00f0ff] text-slate-950 border-[#00f0ff]'
                      : 'bg-[#060913] text-[#64748b] border-[#1e294b]'
                  }`}
                >
                  League
                </button>
                <button
                  type="button"
                  onClick={() => setType('cup')}
                  className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                    type === 'cup'
                      ? 'bg-[#00f0ff] text-slate-950 border-[#00f0ff]'
                      : 'bg-[#060913] text-[#64748b] border-[#1e294b]'
                  }`}
                >
                  Cup (Gugur)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5">
                Jumlah Tim Peserta
              </label>
              <select
                value={numTeams}
                onChange={(e) => setNumTeams(parseInt(e.target.value, 10))}
                className="w-full bg-[#060913] border border-[#1e294b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00f0ff] font-bold"
              >
                {type === 'cup' ? (
                  <>
                    <option value={4}>4 Tim (Semi Final & Final)</option>
                    <option value={8}>8 Tim (Quarter Final)</option>
                    <option value={16}>16 Tim (Babak 16 Besar)</option>
                  </>
                ) : (
                  <>
                    <option value={4}>4 Tim</option>
                    <option value={6}>6 Tim</option>
                    <option value={8}>8 Tim</option>
                    <option value={10}>10 Tim</option>
                    <option value={12}>12 Tim</option>
                    <option value={14}>14 Tim</option>
                    <option value={16}>16 Tim</option>
                    <option value={18}>18 Tim</option>
                    <option value={20}>20 Tim</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {type === 'league' && (
            <div className="flex items-center justify-between bg-[#060913] p-3 rounded-xl border border-[#1e294b]">
              <span className="text-xs font-bold text-[#94a3b8]">Home & Away (2 Putaran Bolak-Balik)</span>
              <input
                type="checkbox"
                checked={homeAway}
                onChange={(e) => setHomeAway(e.target.checked)}
                className="w-4 h-4 accent-[#00f0ff] rounded cursor-pointer"
              />
            </div>
          )}

          {/* Section 3: Daftar Slot Klub */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white uppercase tracking-wider">
                Daftar Klub ({teams.length} Slot)
              </span>
              <span className="text-[11px] text-[#00f0ff]">
                Klik logo untuk upload, atau klik ikon database untuk pilih
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {teams.map((t, idx) => (
                <div
                  key={idx}
                  className="relative flex items-center space-x-2 bg-[#060913] p-2 rounded-xl border border-[#1e294b] hover:border-[#1e294b]/80"
                >
                  <span className="text-[10px] text-[#64748b] font-mono font-bold w-4 text-center">
                    {idx + 1}.
                  </span>

                  {/* Upload Logo Klub Slot */}
                  <label
                    title="Upload Logo Klub"
                    className="relative w-8 h-8 rounded-lg bg-[#0f1629] border border-[#1e294b] hover:border-[#00f0ff] flex items-center justify-center overflow-hidden shrink-0 cursor-pointer group"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleClubLogoUpload(idx, file);
                      }}
                    />
                    {t.logo_url ? (
                      <img src={t.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-[#64748b] group-hover:text-[#00f0ff] transition-colors" />
                    )}
                  </label>

                  {/* Input Nama Klub */}
                  <input
                    type="text"
                    required
                    value={t.name}
                    onChange={(e) => {
                      const updated = [...teams];
                      updated[idx].name = e.target.value;
                      setTeams(updated);
                    }}
                    className="flex-1 bg-transparent text-xs text-white font-bold focus:outline-none min-w-0"
                  />

                  {/* Tombol Pilih dari Database Master */}
                  <button
                    type="button"
                    onClick={() => setShowMasterPicker(showMasterPicker === idx ? null : idx)}
                    className="p-1.5 rounded-lg bg-[#0f1629] border border-[#1e294b] hover:border-[#00f0ff] text-[#00f0ff] shrink-0 transition-colors"
                    title="Pilih dari Master Klub"
                  >
                    <Database className="w-3.5 h-3.5" />
                  </button>

                  {/* Popover Dropdown Katalog Master */}
                  {showMasterPicker === idx && (
                    <div className="absolute right-0 top-12 z-50 w-64 bg-[#0f1629] border border-[#00f0ff] rounded-xl shadow-2xl p-2 max-h-48 overflow-y-auto space-y-1">
                      <div className="flex items-center justify-between pb-1 border-b border-[#1e294b]">
                        <span className="text-[10px] font-black text-[#00f0ff] uppercase">
                          Pilih dari Database Klub
                        </span>
                        <button onClick={() => setShowMasterPicker(null)} className="text-[#64748b] hover:text-white">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      {masterClubs.length === 0 ? (
                        <p className="text-[11px] text-[#64748b] py-2 text-center">Belum ada klub master.</p>
                      ) : (
                        masterClubs.map((mc) => (
                          <button
                            key={mc.id}
                            type="button"
                            onClick={() => handleSelectMasterClub(idx, mc)}
                            className="w-full flex items-center space-x-2 p-1.5 rounded-lg hover:bg-[#060913] text-left text-xs font-bold text-white transition-colors"
                          >
                            <div className="w-5 h-5 rounded bg-[#060913] overflow-hidden shrink-0 flex items-center justify-center">
                              {mc.logo_url ? (
                                <img src={mc.logo_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Shield className="w-3 h-3 text-[#64748b]" />
                              )}
                            </div>
                            <span className="truncate">{mc.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#1e294b] flex justify-end space-x-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-[#060913] border border-[#1e294b] text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#0088ff] text-slate-950 font-black text-xs uppercase flex items-center space-x-1.5 shadow-md active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Membuat Kompetisi...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Generate Turnamen & Jadwal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
