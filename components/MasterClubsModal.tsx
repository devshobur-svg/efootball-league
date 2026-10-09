'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MasterClub } from '@/lib/types';
import { X, Shield, Plus, Upload, Trash2, Edit3, Save, Search, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export default function MasterClubsModal({ isOpen, onClose, onUpdated }: Props) {
  const [clubs, setClubs] = useState<MasterClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newClubLogo, setNewClubLogo] = useState('');
  const [savingNew, setSavingNew] = useState(false);

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchClubs = async () => {
    setLoading(true);
    const { data } = await supabase.from('master_clubs').select('*').order('name');
    if (data) setClubs(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchClubs();
      setIsAdding(false);
      setEditingId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogoUpload = (file: File, callback: (url: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      callback(result);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClubName.trim()) return;
    setSavingNew(true);

    try {
      const { error } = await supabase.from('master_clubs').insert({
        name: newClubName.trim(),
        logo_url: newClubLogo || null,
      });

      if (error) throw error;
      setNewClubName('');
      setNewClubLogo('');
      setIsAdding(false);
      await fetchClubs();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(`Gagal menambah klub: ${err.message}`);
    } finally {
      setSavingNew(false);
    }
  };

  const handleUpdateClub = async (id: string) => {
    if (!editName.trim()) return;
    setSavingEdit(true);

    try {
      const { error } = await supabase
        .from('master_clubs')
        .update({
          name: editName.trim(),
          logo_url: editLogo || null,
        })
        .eq('id', id);

      if (error) throw error;
      setEditingId(null);
      await fetchClubs();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(`Gagal update klub: ${err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteClub = async (club: MasterClub) => {
    const confirmDel = window.confirm(`Hapus master klub "${club.name}"?`);
    if (!confirmDel) return;

    try {
      const { error } = await supabase.from('master_clubs').delete().eq('id', club.id);
      if (error) throw error;
      await fetchClubs();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(`Gagal menghapus klub: ${err.message}`);
    }
  };

  const filteredClubs = clubs.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#0f1629] border border-[#1e294b] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col p-4 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1e294b] shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#ff0055]/10 text-[#ff0055] border border-[#ff0055]/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
                Database Master Klub
              </h2>
              <p className="text-xs text-[#64748b]">
                Gudang klub tersimpan untuk generate turnamen ({clubs.length} Klub)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#64748b] hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search & Add Club */}
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#64748b] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari klub master..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#060913] border border-[#1e294b] rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#00f0ff]"
            />
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#0088ff] text-slate-950 font-black text-xs uppercase flex items-center justify-center space-x-1.5 shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{isAdding ? 'Batal Tambah' : 'Tambah Klub Master'}</span>
          </button>
        </div>

        {/* Form Tambah Klub Baru */}
        {isAdding && (
          <form onSubmit={handleCreateClub} className="bg-[#060913] p-3.5 rounded-xl border border-[#00f0ff]/30 space-y-3 shrink-0">
            <span className="text-[11px] font-black text-[#00f0ff] uppercase tracking-wider block">
              Input Klub Baru ke Master
            </span>
            <div className="flex items-center space-x-3">
              <label className="relative w-12 h-12 rounded-xl bg-[#0f1629] border border-[#1e294b] hover:border-[#00f0ff] flex items-center justify-center overflow-hidden shrink-0 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file, setNewClubLogo);
                  }}
                />
                {newClubLogo ? (
                  <img src={newClubLogo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-4 h-4 text-[#64748b]" />
                )}
              </label>

              <input
                type="text"
                required
                placeholder="Nama Klub (contoh: Real Madrid)"
                value={newClubName}
                onChange={(e) => setNewClubName(e.target.value)}
                className="flex-1 bg-[#0f1629] border border-[#1e294b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00f0ff] font-bold"
              />

              <button
                type="submit"
                disabled={savingNew}
                className="px-4 py-2 rounded-xl bg-[#00f0ff] text-slate-950 font-black text-xs uppercase flex items-center space-x-1"
              >
                {savingNew ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Simpan</span>
              </button>
            </div>
          </form>
        )}

        {/* List Klub Master */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="p-8 text-center text-[#64748b] text-xs">Memuat katalog klub...</div>
          ) : filteredClubs.length === 0 ? (
            <div className="p-8 text-center text-[#64748b] text-xs">
              {searchQuery ? 'Klub tidak ditemukan.' : 'Belum ada klub di database master.'}
            </div>
          ) : (
            filteredClubs.map((club) => {
              const isEditing = editingId === club.id;

              return (
                <div
                  key={club.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#060913] border border-[#1e294b] hover:border-[#1e294b]/80 gap-2"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    {/* Logo Klub */}
                    {isEditing ? (
                      <label className="relative w-10 h-10 rounded-xl bg-[#0f1629] border border-[#00f0ff] flex items-center justify-center overflow-hidden shrink-0 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleLogoUpload(file, setEditLogo);
                          }}
                        />
                        {editLogo ? (
                          <img src={editLogo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Upload className="w-4 h-4 text-[#00f0ff]" />
                        )}
                      </label>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#0f1629] border border-[#1e294b] flex items-center justify-center overflow-hidden shrink-0">
                        {club.logo_url ? (
                          <img src={club.logo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Shield className="w-5 h-5 text-[#64748b]" />
                        )}
                      </div>
                    )}

                    {/* Nama Klub */}
                    {isEditing ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 bg-[#0f1629] border border-[#00f0ff] rounded-lg px-2.5 py-1 text-xs text-white font-bold focus:outline-none"
                      />
                    ) : (
                      <div className="min-w-0">
                        <span className="font-bold text-xs sm:text-sm text-white truncate block">
                          {club.name}
                        </span>
                        <span className="text-[10px] text-[#64748b]">Tersimpan di Katalog</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1.5 shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleUpdateClub(club.id)}
                          disabled={savingEdit}
                          className="p-1.5 rounded-lg bg-[#00f0ff] text-slate-950 text-xs font-bold"
                          title="Simpan"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-lg bg-[#0f1629] text-[#64748b] hover:text-white text-xs"
                          title="Batal"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(club.id);
                            setEditName(club.name);
                            setEditLogo(club.logo_url || '');
                          }}
                          className="p-1.5 rounded-lg bg-[#0f1629] border border-[#1e294b] text-[#94a3b8] hover:text-[#00f0ff] hover:border-[#00f0ff]"
                          title="Edit Klub"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClub(club)}
                          className="p-1.5 rounded-lg bg-[#0f1629] border border-[#1e294b] text-[#64748b] hover:text-[#ff0055] hover:border-[#ff0055]"
                          title="Hapus dari Master"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#1e294b] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-[#060913] border border-[#1e294b] text-white hover:border-[#00f0ff]"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
