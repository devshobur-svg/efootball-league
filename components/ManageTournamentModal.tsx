'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Tournament, Team } from '@/lib/types';
import { X, Trash2, Edit3, Save, Upload, Shield, AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  tournament: Tournament | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export default function ManageTournamentModal({ tournament, isOpen, onClose, onUpdated }: Props) {
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'teams' | 'danger'>('info');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tournament && isOpen) {
      setName(tournament.name);
      setLogoUrl(tournament.logo_url || '');
      setIsActive(tournament.is_active);
      setErrorMsg('');
      setActiveTab('info');
      fetchTeams(tournament.id);
    }
  }, [tournament, isOpen]);

  const fetchTeams = async (tournamentId: string) => {
    setLoading(true);
    const { data } = await supabase.from('teams').select('*').eq('tournament_id', tournamentId);
    if (data) setTeams(data);
    setLoading(false);
  };

  if (!isOpen || !tournament) return null;

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 250);
      setLogoUrl(compressed);
    } catch {
      setErrorMsg('Gagal memproses gambar logo');
    }
  };

  const handleTeamLogoUpload = async (teamId: string, file: File) => {
    try {
      const compressed = await compressImage(file, 160);
      setTeams((prev) =>
        prev.map((t) => (t.id === teamId ? { ...t, logo_url: compressed } : t))
      );
    } catch {
      setErrorMsg('Gagal memproses logo tim');
    }
  };

  const handleTeamNameChange = (teamId: string, newName: string) => {
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, name: newName } : t))
    );
  };

  // UPDATE DATA TURNAMEN & TIM
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Nama kompetisi tidak boleh kosong');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      const { error: tourneyErr } = await supabase
        .from('tournaments')
        .update({
          name: name.trim(),
          logo_url: logoUrl || null,
          is_active: isActive,
        })
        .eq('id', tournament.id);

      if (tourneyErr) throw tourneyErr;

      for (const t of teams) {
        await supabase
          .from('teams')
          .update({
            name: t.name.trim(),
            logo_url: t.logo_url,
          })
          .eq('id', t.id);
      }

      onUpdated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  };

  // DELETE TURNAMEN PERMANEN
  const handleDeleteTournament = async () => {
    const confirmDelete = window.confirm(
      `Hapus kompetisi "${tournament.name}" secara permanen? Semua data tim, jadwal, dan klasemen akan terhapus!`
    );
    if (!confirmDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase.from('tournaments').delete().eq('id', tournament.id);
      if (error) throw error;

      onUpdated();
      onClose();
    } catch (err: any) {
      alert(`Gagal menghapus kompetisi: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  // RESET SKOR JADWAL KE AWAL
  const handleResetScores = async () => {
    const confirmReset = window.confirm(
      'Reset seluruh hasil pertandingan menjadi 0-0 dan status upcoming?'
    );
    if (!confirmReset) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          home_score: 0,
          away_score: 0,
          status: 'upcoming',
          played_at: null,
        })
        .eq('tournament_id', tournament.id);

      if (error) throw error;
      alert('Semua laga berhasil di-reset!');
      onUpdated();
    } catch (err: any) {
      alert(`Gagal mereset laga: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-ef-card border border-ef-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-[0_0_40px_rgba(0,240,255,0.2)]">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-ef-border">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-ef-cyan/15 text-ef-cyan border border-ef-cyan/30">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wide">KELOLA KOMPETISI</h2>
              <p className="text-xs text-ef-cyan font-bold font-mono">{tournament.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ef-muted hover:text-white transition-colors p-1.5 rounded-lg hover:bg-ef-bg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex space-x-2 border-b border-ef-border mt-4 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'info'
                ? 'bg-ef-cyan text-black'
                : 'text-ef-muted hover:text-white hover:bg-ef-bg'
            }`}
          >
            Informasi Liga
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'teams'
                ? 'bg-ef-cyan text-black'
                : 'text-ef-muted hover:text-white hover:bg-ef-bg'
            }`}
          >
            Kelola Tim ({teams.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('danger')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'danger'
                ? 'bg-ef-magenta text-white'
                : 'text-ef-muted hover:text-ef-magenta hover:bg-ef-bg'
            }`}
          >
            Opsi Lanjutan
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-ef-magenta/15 border border-ef-magenta/40 rounded-lg text-ef-magenta text-sm font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleUpdate} className="mt-5 space-y-5">
          {/* TAB 1: INFORMASI LIGA */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ef-muted uppercase tracking-wider mb-2">
                  Logo Kompetisi
                </label>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-xl bg-ef-bg border border-ef-border flex items-center justify-center overflow-hidden shrink-0">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Shield className="w-7 h-7 text-ef-muted" />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-lg bg-ef-bg border border-ef-border hover:border-ef-cyan text-xs font-bold text-ef-text hover:text-ef-cyan transition-all flex items-center space-x-1.5"
                    >
                      <Upload className="w-3.5 h-3.5 text-ef-cyan" />
                      <span>Ubah Logo dari Device</span>
                    </button>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="text-[11px] text-ef-magenta hover:underline block"
                      >
                        Hapus Logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ef-muted uppercase tracking-wider mb-1.5">
                  Nama Kompetisi
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-ef-bg border border-ef-border rounded-xl px-4 py-2.5 text-sm text-ef-text focus:outline-none focus:border-ef-cyan font-bold"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-ef-bg/60 border border-ef-border">
                <div>
                  <p className="text-sm font-bold text-white">Status Kompetisi</p>
                  <p className="text-xs text-ef-muted">
                    {isActive ? 'Aktif (Sedang Berjalan di Dashboard)' : 'Selesai / Masuk ke Arsip Riwayat'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-extrabold uppercase transition-all ${
                    isActive
                      ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                      : 'bg-ef-muted/20 text-ef-muted border border-ef-border'
                  }`}
                >
                  {isActive ? 'Aktif' : 'Archived'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: KELOLA TIM */}
          {activeTab === 'teams' && (
            <div className="space-y-3">
              <p className="text-xs text-ef-muted">
                Ubah nama atau klik avatar untuk memperbarui logo masing-masing klub dari perangkat:
              </p>
              {loading ? (
                <div className="text-center py-6 text-xs text-ef-muted">Memuat daftar tim...</div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {teams.map((t, idx) => (
                    <div
                      key={t.id}
                      className="flex items-center space-x-2 bg-ef-bg/40 p-2 rounded-xl border border-ef-border"
                    >
                      <span className="text-xs text-ef-muted w-6 text-center font-mono font-bold">
                        {idx + 1}.
                      </span>
                      <label className="relative w-8 h-8 rounded-lg bg-ef-bg border border-ef-border flex items-center justify-center cursor-pointer hover:border-ef-cyan overflow-hidden shrink-0 group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleTeamLogoUpload(t.id, file);
                          }}
                          className="hidden"
                        />
                        {t.logo_url ? (
                          <img src={t.logo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 text-ef-muted group-hover:text-ef-cyan" />
                        )}
                      </label>
                      <input
                        type="text"
                        value={t.name}
                        onChange={(e) => handleTeamNameChange(t.id, e.target.value)}
                        className="flex-1 bg-transparent border-0 px-2 py-1 text-sm text-ef-text focus:outline-none font-bold"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: OPSI LANJUTAN */}
          {activeTab === 'danger' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-start space-x-3">
                <RotateCcw className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-yellow-400">Reset Semua Skor Laga</h4>
                  <p className="text-xs text-ef-muted mt-0.5">
                    Kembalikan semua skor ke 0-0 dan ubah status kembali menjadi upcoming.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetScores}
                    disabled={saving}
                    className="mt-2.5 px-3 py-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 text-xs font-bold transition-all"
                  >
                    Reset Skor Pertandingan
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-ef-magenta/10 border border-ef-magenta/30 flex items-start space-x-3">
                <Trash2 className="w-5 h-5 text-ef-magenta shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-ef-magenta">Hapus Kompetisi Permanen</h4>
                  <p className="text-xs text-ef-muted mt-0.5">
                    Menghapus seluruh data turnamen, daftar tim, jadwal matchday, dan klasemen selamanya.
                  </p>
                  <button
                    type="button"
                    onClick={handleDeleteTournament}
                    disabled={deleting}
                    className="mt-2.5 px-3.5 py-1.5 rounded-lg bg-ef-magenta hover:bg-red-600 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(255,0,85,0.4)]"
                  >
                    {deleting ? 'Menghapus...' : 'Hapus Turnamen Ini'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-ef-border flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-ef-bg border border-ef-border hover:bg-ef-border transition-colors"
            >
              Tutup
            </button>
            {activeTab !== 'danger' && (
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 text-sm font-bold rounded-xl bg-ef-cyan hover:bg-cyan-300 text-slate-950 transition-all disabled:opacity-50 flex items-center space-x-1.5 shadow-[0_0_15px_rgba(0,240,255,0.4)]"
              >
                <Save className="w-4 h-4 stroke-[2.5]" />
                <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
