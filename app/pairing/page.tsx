'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase'; // Pastikan path lib/supabase benar
import { useRouter } from 'next/navigation';

export default function Pairing() {
  const [myCode, setMyCode] = useState('');
  const [partnerCode, setPartnerCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      
      // Ambil data profil kita untuk melihat kode invite
      const { data: profile } = await supabase
        .from('profiles')
        .select('invite_code, partner_id')
        .eq('id', session.user.id)
        .single();
        
      if (profile?.partner_id) {
        router.push('/'); // Jika sudah punya pasangan, lempar ke Dashboard
      } else {
        setMyCode(profile?.invite_code || '');
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);

  const handlePairing = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Cari profil pasangan berdasarkan kode yang diinput
    const { data: partnerProfile, error: searchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('invite_code', partnerCode.toUpperCase())
      .single();
      
    if (searchError || !partnerProfile) {
      alert('Kode Invite tidak ditemukan atau salah!');
      setSaving(false);
      return;
    }

    if (partnerProfile.id === user.id) {
      alert('Tidak bisa memasukkan kode milik sendiri!');
      setSaving(false);
      return;
    }

    // Update partner_id agar saling bertaut (Saling simpan ID)
    await supabase.from('profiles').update({ partner_id: partnerProfile.id }).eq('id', user.id);
    await supabase.from('profiles').update({ partner_id: user.id }).eq('id', partnerProfile.id);

    alert('Berhasil terhubung dengan pasangan!');
    router.push('/');
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Memuat...</div>;

  return (
    <main className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4 font-sans text-gray-800">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
        <h1 className="text-2xl font-bold text-[#1A365D] mb-2">Tautkan Akun</h1>
        <p className="text-gray-500 text-sm mb-8">
          Aplikasi ini dirancang untuk berdua. Silakan masukkan kode invite pasanganmu, atau berikan kodemu ke pasangan.
        </p>

        <div className="bg-[#1A365D]/5 p-4 rounded-xl border border-[#1A365D]/20 mb-8">
          <p className="text-sm text-gray-600 mb-1">Kode Invite Kamu:</p>
          <p className="text-3xl font-extrabold text-[#1A365D] tracking-widest">{myCode}</p>
        </div>

        <form onSubmit={handlePairing} className="space-y-4">
          <div>
            <label className="block text-left text-sm font-medium text-gray-700 mb-1">Kode Invite Pasangan</label>
            <input 
              type="text" 
              required 
              value={partnerCode}
              onChange={(e) => setPartnerCode(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-[#1A365D] uppercase tracking-widest font-bold"
              placeholder="XXXX-XXXX"
            />
          </div>
          <button 
            type="submit" 
            disabled={saving}
            className="w-full bg-[#1A365D] text-white py-3 rounded-xl font-semibold hover:bg-[#1A365D]/90 transition-colors"
          >
            {saving ? 'Menghubungkan...' : 'Hubungkan Sekarang'}
          </button>
        </form>

        <button onClick={handleLogout} className="mt-6 text-sm text-red-500 font-semibold hover:underline">
          Keluar (Logout)
        </button>
      </div>
    </main>
  );
}