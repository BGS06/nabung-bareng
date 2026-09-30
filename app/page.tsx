'use client'
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
// 1. TAMBAHAN: Mengimpor PencilIcon untuk tombol edit
import { EyeIcon, EyeSlashIcon, PlusIcon, XMarkIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon, CameraIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/solid';
import confetti from 'canvas-confetti';

// 2. TAMBAHAN: Daftar kategori dan ikon untuk mempercantik list transaksi
export const CATEGORIES: Record<string, { label: string, icon: string, color: string }> = {
  tabungan: { label: 'Tabungan', icon: '💰', color: 'bg-[#4CAF50]/10 text-[#4CAF50]' },
  makanan: { label: 'Makan & Minum', icon: '🍔', color: 'bg-orange-100 text-orange-500' },
  kencan: { label: 'Kencan & Hiburan', icon: '🍕', color: 'bg-pink-100 text-pink-500' },
  belanja: { label: 'Belanja', icon: '🛒', color: 'bg-blue-100 text-blue-500' },
  liburan: { label: 'Liburan', icon: '✈️', color: 'bg-indigo-100 text-indigo-500' },
  tagihan: { label: 'Tagihan', icon: '🧾', color: 'bg-red-100 text-red-500' },
  lainnya: { label: 'Lainnya', icon: '💵', color: 'bg-gray-100 text-gray-500' }
};

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  
  // TRIGGER AJAIB (Anti-Nyangkut)
  const [refreshKey, setRefreshKey] = useState(0); 
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Data States
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [partner, setPartner] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  
  // Data Kontribusi
  const [myContribution, setMyContribution] = useState(0);
  const [partnerContribution, setPartnerContribution] = useState(0);

  // Gamifikasi & Notifikasi
  const [notification, setNotification] = useState<{show: boolean, message: string}>({ show: false, message: '' });
  
  // Settings & Form States
  const [settingTitle, setSettingTitle] = useState('');
  const [settingAmount, setSettingAmount] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // 3. TAMBAHAN: State untuk menangani Edit & Kategori
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editTxId, setEditTxId] = useState<string | null>(null);
  const [txCategory, setTxCategory] = useState('tabungan');
  
  const [txType, setTxType] = useState('saving');
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Perhitungan Target Dinamis
  const targetTabungan = profile?.target_amount || 50000000;
  const progressPercentage = Math.min((totalBalance / targetTabungan) * 100, 100);

  // Perhitungan Bar Kontribusi
  const safeMyContrib = Math.max(0, myContribution);
  const safePartnerContrib = Math.max(0, partnerContribution);
  const totalContrib = safeMyContrib + safePartnerContrib;
  const myContribPercent = totalContrib > 0 ? (safeMyContrib / totalContrib) * 100 : 50;
  const partnerContribPercent = totalContrib > 0 ? (safePartnerContrib / totalContrib) * 100 : 50;

  // FETCH DATA DIPICU OLEH refreshKey
  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  // REAL-TIME LISTENER (ANTI-TABRAKAN)
  useEffect(() => {
    if (!profile || !partner) return;
    
    // Memberikan ID unik pada channel agar tidak bentrok
    const channel = supabase
      .channel(`realtime-tx-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, 
      (payload) => {
        // Tarik data baru dengan menaikkan angka trigger
        setRefreshKey(prev => prev + 1); 
        
        // Cek notifikasi gamifikasi (HANYA untuk Insert & dari Pasangan)
        if (payload.eventType === 'INSERT') {
          const newTx = payload.new;
          if (newTx && newTx.user_id === partner.id && newTx.type === 'saving') {
            triggerConfetti();
            showNotification(`${partner.name} baru aja menabung Rp ${Number(newTx.amount).toLocaleString('id-ID')}! 🎉`);
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, 
      () => {
        setRefreshKey(prev => prev + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile, partner]);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }
    setUser(session.user);

    const { data: myProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (!myProfile?.partner_id) {
      router.push('/pairing');
      return;
    }
    setProfile(myProfile);
    setSettingTitle(myProfile.target_title || 'Tabungan Bersama');
    setSettingAmount(myProfile.target_amount || '50000000');

    const { data: partnerProfile } = await supabase.from('profiles').select('*').eq('id', myProfile.partner_id).single();
    setPartner(partnerProfile);

    const { data: txData } = await supabase
      .from('transactions')
      .select('*, profiles(name)')
      .in('user_id', [myProfile.id, myProfile.partner_id])
      .order('created_at', { ascending: false });

    if (txData) {
      setTransactions(txData);
      let balance = 0;
      let myTotal = 0;
      let partnerTotal = 0;

      txData.forEach(tx => {
        const amount = Number(tx.amount);
        const netAmount = tx.type === 'expense' ? -amount : amount;
        balance += netAmount;
        if (tx.user_id === myProfile.id) myTotal += netAmount;
        else if (tx.user_id === partnerProfile.id) partnerTotal += netAmount;
      });

      setTotalBalance(balance);
      setMyContribution(myTotal);
      setPartnerContribution(partnerTotal);
    }
    setLoading(false);
  };

  const showNotification = (message: string) => {
    setNotification({ show: true, message });
    setTimeout(() => setNotification({ show: false, message: '' }), 4000);
  };

  const triggerConfetti = () => {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#4CAF50', '#1A365D', '#ffffff'] });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // 4. TAMBAHAN: Fungsi untuk membuka form Tambah Transaksi yang bersih
  const openAddModal = () => {
    setModalMode('add');
    setTxType('saving');
    setTxCategory('tabungan');
    setTxAmount('');
    setTxDesc('');
    setIsModalOpen(true);
  };

  // 5. TAMBAHAN: Fungsi untuk membuka form Edit berdasarkan data lama
  const openEditModal = (tx: any) => {
    setModalMode('edit');
    setEditTxId(tx.id);
    setTxType(tx.type);
    setTxCategory(tx.category || 'lainnya');
    setTxAmount(tx.amount.toString());
    setTxDesc(tx.description);
    setIsModalOpen(true);
  };

  // 6. TAMBAHAN: Mengubah kategori otomatis saat jenis diganti
  const handleTypeChange = (e: any) => {
    const val = e.target.value;
    setTxType(val);
    setTxCategory(val === 'saving' ? 'tabungan' : 'makanan');
  };

  // 7. MODIFIKASI: Menyesuaikan agar bisa Update (Edit) dan menyimpan kategori
  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const savedAmount = Number(txAmount);
    
    // Data yang akan disimpan/diupdate
    const txData = { user_id: user.id, type: txType, category: txCategory, amount: savedAmount, description: txDesc };

    let error;
    if (modalMode === 'add') {
      const { error: insertError } = await supabase.from('transactions').insert([txData]);
      error = insertError;
    } else {
      const { error: updateError } = await supabase.from('transactions').update(txData).eq('id', editTxId);
      error = updateError;
    }

    if (!error) {
      setIsModalOpen(false);
      if (modalMode === 'add' && txType === 'saving') {
        triggerConfetti();
        showNotification(`Kamu berhasil menabung Rp ${savedAmount.toLocaleString('id-ID')}!`);
      } else if (modalMode === 'edit') {
        showNotification('Transaksi berhasil diperbarui ✏️');
      }
      setTxAmount('');
      setTxDesc('');
      setRefreshKey(prev => prev + 1); // Trigger render ulang
    } else {
      alert('Gagal menyimpan transaksi!');
    }
    setIsSubmitting(false);
  };

  const handleDeleteTransaction = async (id: string, description: string) => {
    if (!window.confirm(`Yakin ingin menghapus data "${description || 'Transaksi'}"?`)) return;
    
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
      setRefreshKey(prev => prev + 1); // Trigger render ulang otomatis
      showNotification('Transaksi berhasil dihapus 🗑️');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await supabase.from('profiles').update({ 
      target_title: settingTitle, target_amount: Number(settingAmount) 
    }).in('id', [profile.id, partner.id]);
    setIsSettingsOpen(false);
    setIsSubmitting(false);
    setRefreshKey(prev => prev + 1);
  };

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
    if (!uploadError) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id);
      setRefreshKey(prev => prev + 1);
    }
    setIsUploading(false);
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Memuat Dashboard...</div>;

  return (
    <main className="min-h-screen bg-[#F8F9FA] p-4 pb-24 font-sans text-gray-800 max-w-md mx-auto relative shadow-sm overflow-x-hidden">
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        .font-retro { font-family: 'Press Start 2P', cursive; }
      `}</style>

      {/* NOTIFIKASI GLASSMORPHISM RETRO */}
      <div className="fixed top-4 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
        <div className={`w-full max-w-sm pointer-events-auto 
          bg-white/40 backdrop-blur-md border border-white/50 
          shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] rounded-2xl p-4 
          flex items-center gap-4 transition-all duration-500 transform origin-top
          ${notification.show ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-16 opacity-0 scale-90'}`}>
          
          <div className="w-12 h-12 flex-shrink-0 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center shadow-[inset_0_-3px_6px_rgba(0,0,0,0.3)] animate-bounce border-2 border-yellow-600">
            <span className="text-xl drop-shadow-md">💰</span>
          </div>
          
          <div className="pt-1">
            <p className="font-retro text-[10px] text-[#1A365D] tracking-widest drop-shadow-[1px_1px_0_rgba(255,255,255,1)] mb-2">
              ACHIEVEMENT UNLOCKED!
            </p>
            <p className="text-sm font-semibold text-gray-800 leading-tight">
              {notification.message}
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-6 pt-4">
        <div>
          <h1 className="text-xl font-bold text-[#1A365D]">Halo, {profile?.name} 👋</h1>
          <p className="text-sm text-gray-500">Semangat terus nabungnya!</p>
        </div>
        <div className="flex -space-x-2 items-center">
          <img className="w-10 h-10 rounded-full border-2 border-white shadow-sm z-10 object-cover" src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.name}&background=1A365D&color=fff`} alt="Me" />
          <img className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover" src={partner?.avatar_url || `https://ui-avatars.com/api/?name=${partner?.name}&background=4CAF50&color=fff`} alt="Partner" />
          
          <button onClick={() => setIsSettingsOpen(true)} className="ml-3 text-gray-400 hover:text-gray-600 transition-colors">
            <Cog6ToothIcon className="w-6 h-6" />
          </button>
          <button onClick={handleLogout} className="ml-2 pl-2 border-l border-gray-300 text-red-500 hover:text-red-700">
            <ArrowRightOnRectangleIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-[#1A365D] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <p className="text-sm opacity-80 mb-1 font-medium">{profile?.target_title || 'Tabungan Bersama'}</p>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold tracking-tight">
            {showBalance ? `Rp ${totalBalance.toLocaleString('id-ID')}` : 'Rp ••••••••'}
          </h2>
          <button onClick={() => setShowBalance(!showBalance)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            {showBalance ? <EyeSlashIcon className="w-6 h-6" /> : <EyeIcon className="w-6 h-6" />}
          </button>
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-xs font-medium mb-1 opacity-90">
            <span>Progres Target</span>
            <span>{progressPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-black/20 rounded-full h-2.5 backdrop-blur-sm">
            <div className="bg-[#4CAF50] h-2.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPercentage}%` }}></div>
          </div>
          <p className="text-xs text-right mt-1.5 opacity-70">Target: Rp {targetTabungan.toLocaleString('id-ID')}</p>
        </div>
      </div>

      {/* STATISTIK KONTRIBUSI */}
      <div className="mt-6 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">📊 Statistik Kontribusi</h3>
        <div className="flex justify-between text-xs mb-1.5 px-1">
          <span className="font-semibold" style={{ color: profile?.name?.toLowerCase().includes('caca') ? '#EC4899' : '#3B82F6' }}>
            {profile?.name} ({myContribPercent.toFixed(0)}%)
          </span>
          <span className="font-semibold" style={{ color: partner?.name?.toLowerCase().includes('caca') ? '#EC4899' : '#3B82F6' }}>
            {partner?.name} ({partnerContribPercent.toFixed(0)}%)
          </span>
        </div>
        
        <div className="flex h-3 w-full rounded-full overflow-hidden bg-gray-100 shadow-inner">
          <div style={{ width: `${myContribPercent}%`, backgroundColor: profile?.name?.toLowerCase().includes('caca') ? '#EC4899' : '#3B82F6' }} className="transition-all duration-1000"></div>
          <div style={{ width: `${partnerContribPercent}%`, backgroundColor: partner?.name?.toLowerCase().includes('caca') ? '#EC4899' : '#3B82F6' }} className="transition-all duration-1000"></div>
        </div>
        
        <div className="flex justify-between text-xs mt-2 text-gray-500 px-1">
          <span>Rp {myContribution.toLocaleString('id-ID')}</span>
          <span>Rp {partnerContribution.toLocaleString('id-ID')}</span>
        </div>
      </div>

      {/* Histori Transaksi (Maksimal 5) */}
      <div className="mt-8">
        <div className="flex justify-between items-end mb-4">
          <h3 className="font-semibold text-gray-800">Transaksi Terakhir</h3>
          {transactions.length > 5 && (
            <button onClick={() => router.push('/history')} className="text-xs font-bold text-[#1A365D] hover:underline">
              Lihat Semua
            </button>
          )}
        </div>
        
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Belum ada transaksi.</p>
          ) : (
            // HANYA TAMPILKAN 5 TRANSAKSI TERBARU DENGAN .slice(0, 5)
            transactions.slice(0, 5).map((tx) => {
              // 8. MODIFIKASI: Menarik ikon dan warna dari objek CATEGORIES
              const cat = CATEGORIES[tx.category] || CATEGORIES['lainnya'];
              
              return (
              <div key={tx.id} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center border border-gray-100 hover:shadow-md transition-shadow group">
                <div className="flex items-center gap-4">
                   <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg shadow-sm ${cat.color}`}>
                     {cat.icon}
                   </div>
                   <div>
                     <p className="font-semibold text-gray-800 text-sm capitalize">{tx.description || cat.label}</p>
                     <p className="text-xs text-gray-500 mt-0.5">
                       {tx.profiles?.name} • {new Date(tx.created_at).toLocaleDateString('id-ID')}
                     </p>
                   </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <p className={`font-bold text-sm mr-2 ${tx.type === 'expense' ? 'text-red-500' : 'text-[#4CAF50]'}`}>
                    {tx.type === 'expense' ? '- ' : '+ '}Rp {Number(tx.amount).toLocaleString('id-ID')}
                  </p>
                  
                  {/* 9. TAMBAHAN: Tombol Edit Pensil (Hanya muncul untuk pemilik transaksi) */}
                  {(tx.user_id === user?.id) && (
                    <button onClick={() => openEditModal(tx)} className="p-1.5 sm:p-2 bg-blue-50 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100" title="Edit Transaksi">
                      <PencilIcon className="w-4 h-4" />
                    </button>
                  )}
                  {/* Tombol Hapus */}
                  {(tx.user_id === user?.id) && (
                    <button onClick={() => handleDeleteTransaction(tx.id, tx.description)} className="p-1.5 sm:p-2 bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100" title="Hapus Transaksi">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )})
          )}
        </div>

        {/* Tombol Lihat Semua Riwayat di Bawah */}
        {transactions.length > 5 && (
          <button 
            onClick={() => router.push('/history')} 
            className="w-full mt-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-[#1A365D] transition-colors shadow-sm"
          >
            Lihat Semua Riwayat ({transactions.length})
          </button>
        )}
      </div>

      {/* 10. MODIFIKASI FAB: Menjalankan fungsi openAddModal */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <button onClick={openAddModal} className="w-14 h-14 bg-[#1A365D] text-white rounded-full flex items-center justify-center shadow-2xl shadow-[#1A365D]/50 hover:scale-110 active:scale-95 transition-all duration-300">
          <PlusIcon className="w-7 h-7" />
        </button>
      </div>

      {/* MODAL PENGATURAN */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800">Pengaturan</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <img className="w-20 h-20 rounded-full border-4 border-gray-100 object-cover shadow-sm" src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.name}&background=1A365D&color=fff`} alt="Me" />
                <label className="absolute bottom-0 right-0 bg-[#4CAF50] p-1.5 rounded-full text-white cursor-pointer hover:bg-[#45a049] shadow-md">
                  <CameraIcon className="w-4 h-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleUploadAvatar} disabled={isUploading} />
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">{isUploading ? 'Mengunggah...' : 'Ubah Foto Profil'}</p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Judul Tabungan</label>
                <input type="text" required value={settingTitle} onChange={(e) => setSettingTitle(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A365D]/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nominal Target (Rp)</label>
                <input type="number" required value={settingAmount} onChange={(e) => setSettingAmount(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A365D]/50 font-bold" />
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-[#1A365D] text-white py-4 rounded-xl font-bold hover:bg-[#1A365D]/90 mt-6 shadow-lg shadow-[#1A365D]/30">
                {isSubmitting ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 11. MODIFIKASI: MODAL TRANSAKSI (Bisa untuk Tambah & Edit Kategori) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800">
                {modalMode === 'add' ? 'Catat Transaksi' : 'Edit Transaksi'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmitTransaction} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jenis</label>
                  <select value={txType} onChange={handleTypeChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A365D]/50 font-semibold">
                    <option value="saving">Tabungan</option>
                    <option value="expense">Pengeluaran</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                  <select value={txCategory} onChange={(e) => setTxCategory(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A365D]/50">
                    {txType === 'saving' ? (
                      <option value="tabungan">💰 Tabungan</option>
                    ) : (
                      <>
                        <option value="makanan">🍔 Makanan</option>
                        <option value="belanja">🛒 Belanja</option>
                        <option value="kencan">🍕 Kencan</option>
                        <option value="liburan">✈️ Liburan</option>
                        <option value="tagihan">🧾 Tagihan</option>
                        <option value="lainnya">📦 Lainnya</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah (Rp)</label>
                <input type="number" required value={txAmount} onChange={(e) => setTxAmount(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A365D]/50 font-bold" placeholder="50000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                <input type="text" required value={txDesc} onChange={(e) => setTxDesc(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A365D]/50" placeholder={txType === 'saving' ? 'Nabung Dana Darurat' : 'Makan Malam / Nonton'} />
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-[#1A365D] text-white py-4 rounded-xl font-bold hover:bg-[#1A365D]/90 mt-6 shadow-lg shadow-[#1A365D]/30">
                {isSubmitting ? 'Menyimpan...' : (modalMode === 'add' ? 'Simpan & Lihat Hasilnya!' : 'Perbarui Transaksi')}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}