'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Tournament } from '@/lib/types';
import { X, Trophy, Upload, Save, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  tournament: Tournament | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditTournamentModal({ isOpen, tournament, onClose, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tournament) {
      setName(tournament.name);
      setLogo(tournament.logo_url || '');
    }
  }, [tournament]);

  if (!isOpen || !tournament) return null;

  const handleLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogo(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({
          name: name.trim(),
          logo_url: logo || null,
        })
        .eq('id', tournament.id);

      if (error) throw error;
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Gagal mengupdate turnamen: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#0f1629] border border-[#1e294b] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#1e294b]">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-[#00f0ff]" />
            <h2 className="text-base font-black text-white uppercase">Edit Detail Turnamen</h2>
          </div>
          <button onClick={onClose} className="text-[#64748b] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-2">
              Logo Turnamen
            </label>
            <div className="flex items-center space-x-3">
              <div className="w-14 h-14 rounded-xl bg-[#060913] border border-[#1e294b] flex items-center justify-center overflow-hidden shrink-0">
                {logo ? (
                  <img src={logo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Trophy className="w-6 h-6 text-[#64748b]" />
                )}
              </div>
              <label className="px-3.5 py-2 rounded-xl bg-[#060913] border border-[#1e294b] hover:border-[#00f0ff] text-xs font-bold text-white hover:text-[#00f0ff] cursor-pointer flex items-center space-x-2">
                <Upload className="w-3.5 h-3.5" />
                <span>Ganti Logo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                  }}
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1.5">
              Nama Kompetisi
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#060913] border border-[#1e294b] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#00f0ff] font-bold"
            />
          </div>

          <div className="pt-3 border-t border-[#1e294b] flex justify-end space-x-2">
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
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#0088ff] text-slate-950 font-black text-xs uppercase flex items-center space-x-1.5 shadow-md"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}