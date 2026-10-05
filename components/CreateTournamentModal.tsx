'use client';

import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { generateFixtures, generateCupBracket } from '@/lib/matchmaker';
import { TournamentType, Team } from '@/lib/types';
import { X, Plus, Trash2, Trophy, Upload, Image as ImageIcon } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface TeamInput {
  name: string;
  logo: string;
}

export default function CreateTournamentModal({ isOpen, onClose, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<TournamentType>('league');
  const [tournamentLogo, setTournamentLogo] = useState<string>('');
  const [homeAway, setHomeAway] = useState(true);

  const [teams, setTeams] = useState<TeamInput[]>([
    { name: 'Arsenal', logo: '' },
    { name: 'Barcelona', logo: '' },
    { name: 'Bayern Munchen', logo: '' },
    { name: 'Inter Milan', logo: '' },
  ]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const tourneyFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const compressImage = (file: File, maxSize: number = 200): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/webp', 0.85));
          } else {
            resolve(event.target?.result as string);
          }
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleTournamentLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Format file harus berupa gambar!');
      return;
    }
    try {
      const compressed = await compressImage(file, 250);
      setTournamentLogo(compressed);
    } catch {
      setErrorMsg('Gagal membaca gambar dari device');
    }
  };

  const handleTeamLogoUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Format file harus berupa gambar!');
      return;
    }
    try {
      const compressed = await compressImage(file, 160);
      const updated = [...teams];
      updated[index].logo = compressed;
      setTeams(updated);
    } catch {
      setErrorMsg('Gagal memproses logo tim');
    }
  };

  const handleAddTeamField = () => {
    setTeams([...teams, { name: '', logo: '' }]);
  };

  const handleRemoveTeamField = (index: number) => {
    if (teams.length <= 2) return;
    setTeams(teams.filter((_, i) => i !== index));
  };

  const handleTeamNameChange = (index: number, val: string) => {
    const updated = [...teams];
    updated[index].name = val;
    setTeams(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const validTeams = teams
      .map((t) => ({ name: t.name.trim(), logo: t.logo }))
      .filter((t) => t.name.length > 0);

    if (!name.trim()) {
      setErrorMsg('Nama kompetisi wajib diisi!');
      return;
    }
    if (validTeams.length < 2) {
      setErrorMsg('Minimal sertakan 2 tim peserta!');
      return;
    }

    setLoading(true);
    try {
      // 1. Insert Tournament
      const { data: tourney, error: tourneyErr } = await supabase
        .from('tournaments')
        .insert({
          name: name.trim(),
          type,
          logo_url: tournamentLogo || null,
          home_away: type === 'cup' ? false : homeAway,
          is_active: true,
        })
        .select()
        .single();

      if (tourneyErr || !tourney) throw new Error(tourneyErr?.message || 'Gagal menyimpan turnamen');

      // 2. Insert Teams
      const teamsToInsert = validTeams.map((t) => ({
        tournament_id: tourney.id,
        name: t.name,
        logo_url: t.logo || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(t.name)}`,
      }));

      const { data: createdTeams, error: teamsErr } = await supabase
        .from('teams')
        .insert(teamsToInsert)
        .select();

      if (teamsErr || !createdTeams) throw new Error(teamsErr?.message || 'Gagal menyimpan daftar tim');

      // 3. Generate Fixtures (League vs Cup)
      const fixtures = type === 'cup' 
        ? generateCupBracket(createdTeams as Team[])
        : generateFixtures(createdTeams as Team[], homeAway);

      const matchesToInsert = fixtures.map((f) => ({
        tournament_id: tourney.id,
        matchday: f.matchday,
        home_team_id: f.home_team_id,
        away_team_id: f.away_team_id,
        home_score: 0,
        away_score: 0,
        status: 'upcoming',
        round: f.round || (type === 'cup' ? 'Ronde 1' : 'League'),
      }));

      const { error: matchErr } = await supabase.from('matches').insert(matchesToInsert);
      if (matchErr) throw new Error(matchErr.message);

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi gangguan koneksi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#0f1629] border border-[#1e294b] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-[0_0_40px_rgba(0,240,255,0.2)]">
        <div className="flex items-center justify-between pb-4 border-b border-[#1e294b]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30">
              <Trophy className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-white tracking-wide">BUAT TURNAMEN BARU</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748b] hover:text-white transition-colors p-1 rounded-lg hover:bg-[#060913]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-[#ff0055]/15 border border-[#ff0055]/40 rounded-lg text-[#ff0055] text-sm font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Logo Upload */}
          <div>
            <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-2">
              Logo Kompetisi (Opsional)
            </label>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-xl bg-[#060913] border border-[#1e294b] flex items-center justify-center overflow-hidden shrink-0">
                {tournamentLogo ? (
                  <img src={tournamentLogo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-7 h-7 text-[#64748b]" />
                )}
              </div>
              <div className="flex flex-col space-y-1.5">
                <input
                  type="file"
                  ref={tourneyFileInputRef}
                  accept="image/*"
                  onChange={handleTournamentLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => tourneyFileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-[#060913] border border-[#1e294b] hover:border-[#00f0ff] text-xs font-bold text-white hover:text-[#00f0ff] transition-all flex items-center space-x-2"
                >
                  <Upload className="w-4 h-4 text-[#00f0ff]" />
                  <span>Pilih Logo dari Device</span>
                </button>
                {tournamentLogo && (
                  <button
                    type="button"
                    onClick={() => setTournamentLogo('')}
                    className="text-[11px] text-[#ff0055] hover:underline text-left"
                  >
                    Hapus Logo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Nama Kompetisi */}
          <div>
            <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5">
              Nama Kompetisi
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: eFootball Super League S4"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#060913] border border-[#1e294b] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00f0ff] font-bold"
            />
          </div>

          {/* Format Turnamen */}
          <div>
            <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5">
              Format Kompetisi
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TournamentType)}
              className="w-full bg-[#060913] border border-[#1e294b] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00f0ff] font-bold"
            >
              <option value="league">League (Klasemen Penuh / Round Robin)</option>
              <option value="cup">Cup (Format Gugur / Knockout Bracket)</option>
            </select>
          </div>

          {/* Home Away Checkbox (Hanya jika Liga) */}
          {type === 'league' && (
            <div className="flex items-center space-x-3 bg-[#060913]/60 p-3.5 rounded-xl border border-[#1e294b]">
              <input
                type="checkbox"
                id="homeAwayCheck"
                checked={homeAway}
                onChange={(e) => setHomeAway(e.target.checked)}
                className="w-4 h-4 accent-[#00f0ff] rounded cursor-pointer"
              />
              <label htmlFor="homeAwayCheck" className="text-sm font-semibold text-white cursor-pointer select-none">
                Gunakan Format Home & Away (2 Putaran Laga)
              </label>
            </div>
          )}

          {/* Daftar Tim */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">
                Daftar Tim Peserta ({teams.length} Tim)
              </label>
              <button
                type="button"
                onClick={handleAddTeamField}
                className="text-xs font-bold text-[#00f0ff] hover:underline flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Slot Tim</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {teams.map((team, idx) => (
                <div key={idx} className="flex items-center space-x-2 bg-[#060913] p-2 rounded-xl border border-[#1e294b]">
                  <span className="text-xs text-[#64748b] w-5 text-center font-mono font-bold">{idx + 1}.</span>

                  <label className="relative w-8 h-8 rounded-lg bg-[#0f1629] border border-[#1e294b] flex items-center justify-center cursor-pointer hover:border-[#00f0ff] overflow-hidden shrink-0">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleTeamLogoUpload(idx, e)}
                      className="hidden"
                    />
                    {team.logo ? (
                      <img src={team.logo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-[#64748b] hover:text-[#00f0ff]" />
                    )}
                  </label>

                  <input
                    type="text"
                    required
                    placeholder={`Nama Tim ${idx + 1}`}
                    value={team.name}
                    onChange={(e) => handleTeamNameChange(idx, e.target.value)}
                    className="flex-1 bg-transparent border-0 px-2 py-1 text-sm text-white focus:outline-none font-bold"
                  />

                  {teams.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTeamField(idx)}
                      className="text-[#64748b] hover:text-[#ff0055] p-1 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-[#1e294b] flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-[#060913] border border-[#1e294b] hover:bg-[#1e294b] transition-colors text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-sm font-black rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#0088ff] text-slate-950 hover:opacity-90 transition-opacity disabled:opacity-50 shadow-[0_0_15px_rgba(0,240,255,0.4)]"
            >
              {loading ? 'Memproses Jadwal...' : 'Buat Turnamen Sekarang'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
