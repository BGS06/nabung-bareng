'use client'
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, TrashIcon, PencilIcon, XMarkIcon } from '@heroicons/react/24/solid';

// DAFTAR KATEGORI & IKON
const CATEGORIES: Record<string, { label: string, icon: string, color: string }> = {
  tabungan: { label: 'Tabungan', icon: '💰', color: 'bg-[#4CAF50]/10 text-[#4CAF50]' },
  makanan: { label: 'Makan & Minum', icon: '🍔', color: 'bg-orange-100 text-orange-500' },
  kencan: { label: 'Kencan & Hiburan', icon: '🍕', color: 'bg-pink-100 text-pink-500' },
  belanja: { label: 'Belanja', icon: '🛒', color: 'bg-blue-100 text-blue-500' },
  liburan: { label: 'Liburan', icon: '✈️', color: 'bg-indigo-100 text-indigo-500' },
  tagihan: { label: 'Tagihan', icon: '🧾', color: 'bg-red-100 text-red-500' },
  lainnya: { label: 'Lainnya', icon: '💵', color: 'bg-gray-100 text-gray-500' }
};

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [expenseSummary, setExpenseSummary] = useState<any[]>([]);
  const [totalExpenseMonth, setTotalExpenseMonth] = useState(0);

  // Filter States
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [monthOptions, setMonthOptions] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Edit Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTxId, setEditTxId] = useState<string | null>(null);
  const [txType, setTxType] = useState('saving');
  const [txCategory, setTxCategory] = useState('tabungan');
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { 
    fetchHistory(); 
  }, [refreshKey]);

  useEffect(() => {
    // 1. FILTER TRANSAKSI BERDASARKAN BULAN
    let filtered = allTransactions;
    if (selectedMonth !== 'all') {
      filtered = allTransactions.filter(tx => {
        const date = new Date(tx.created_at);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === selectedMonth;
      });
    }
    setFilteredTransactions(filtered);

    // 2. KALKULASI RINGKASAN PENGELUARAN (Hanya untuk bulan yang dipilih/semua)
    let totalExpense = 0;
    const summary: Record<string, number> = {};
    
    filtered.forEach(tx => {
      if (tx.type === 'expense') {
        const amount = Number(tx.amount);
        totalExpense += amount;
        const cat = tx.category || 'lainnya';
        summary[cat] = (summary[cat] || 0) + amount;
      }
    });

    const summaryArray = Object.keys(summary).map(key => ({
      category: key,
      amount: summary[key],
      percentage: totalExpense > 0 ? (summary[key] / totalExpense) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);

    setTotalExpenseMonth(totalExpense);
    setExpenseSummary(summaryArray);

  }, [selectedMonth, allTransactions]);

  const fetchHistory = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push('/login');
    setUser(session.user);

    const { data: myProfile } = await supabase.from('profiles').select('id, partner_id').eq('id', session.user.id).single();
    if (!myProfile?.partner_id) return router.push('/pairing');

    const { data: txData } = await supabase.from('transactions').select('*, profiles(name)').in('user_id', [myProfile.id, myProfile.partner_id]).order('created_at', { ascending: false });
    
    if (txData) {
      setAllTransactions(txData);
      // Buat daftar opsi bulan dari data yang ada
      const uniqueMonths = Array.from(new Set(txData.map(tx => {
        const date = new Date(tx.created_at);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      })));
      setMonthOptions(uniqueMonths);
      
      // Otomatis pilih bulan terbaru jika baru pertama kali dimuat
      if (uniqueMonths.length > 0 && selectedMonth === 'all') {
        setSelectedMonth(uniqueMonths[0]); 
      }
    }
    setLoading(false);
  };

  const openEditModal = (tx: any) => {
    setEditTxId(tx.id); 
    setTxType(tx.type); 
    setTxCategory(tx.category || 'lainnya'); 
    setTxAmount(tx.amount.toString()); 
    setTxDesc(tx.description); 
    setIsModalOpen(true);
  };

  const handleTypeChange = (e: any) => {
    const val = e.target.value;
    setTxType(val); 
    setTxCategory(val === 'saving' ? 'tabungan' : 'makanan');
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await supabase.from('transactions').update({ 
      type: txType, 
      category: txCategory, 
      amount: Number(txAmount), 
      description: txDesc 
    }).eq('id', editTxId);
    
    if (!error) { 
      setIsModalOpen(false); 
      setRefreshKey(prev => prev + 1); 
    } else {
      alert('Gagal memperbarui transaksi!');
    }
    setIsSubmitting(false);
  };

  const handleDeleteTransaction = async (id: string, description: string) => {
    if (!window.confirm(`Yakin ingin menghapus data "${description || 'Transaksi'}"?`)) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) setRefreshKey(prev => prev + 1);
  };

  const formatMonthLabel = (value: string) => {
    if (value === 'all') return 'Semua Waktu';
    const [year, month] = value.split('-');
    return new Date(Number(year), Number(month) - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Memuat Laporan...</div>;

  return (
    <main className="min-h-screen bg-[#F8F9FA] p-4 pb-12 font-sans text-gray-800 max-w-md mx-auto relative">
      
      {/* Navbar Atas */}
      <div className="flex items-center gap-4 mb-6 pt-4 sticky top-0 bg-[#F8F9FA]/90 backdrop-blur-sm z-10 py-2 border-b border-gray-100">
        <button onClick={() => router.push('/')} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors">
          <ArrowLeftIcon className="w-5 h-5 text-[#1A365D]" />
        </button>
        <h1 className="text-xl font-bold text-[#1A365D]">Laporan Bulanan</h1>
      </div>

      {/* FILTER BULAN */}
      <div className="mb-6">
        <select 
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(e.target.value)} 
          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]/50 font-bold text-[#1A365D] appearance-none"
        >
          <option value="all">📊 Tampilkan Semua Waktu</option>
          {monthOptions.map(month => (
            <option key={month} value={month}>📅 Laporan {formatMonthLabel(month)}</option>
          ))}
        </select>
      </div>

      {/* DASHBOARD RINGKASAN PENGELUARAN */}
      {expenseSummary.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-8">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Pengeluaran</p>
          <h2 className="text-2xl font-bold text-red-500 mb-5">Rp {totalExpenseMonth.toLocaleString('id-ID')}</h2>
          
          <div className="space-y-4">
            {expenseSummary.map((item) => {
              const cat = CATEGORIES[item.category] || CATEGORIES['lainnya'];
              return (
                <div key={item.category}>
                  <div className="flex justify-between text-sm mb-1.5 font-medium text-gray-700">
                    <span className="flex items-center gap-2">{cat.icon} {cat.label}</span>
                    <span>Rp {item.amount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-red-400 h-2 rounded-full transition-all duration-1000" style={{ width: `${item.percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* DAFTAR TRANSAKSI LENGKAP */}
      <h3 className="font-bold text-gray-800 mb-3 px-1">Rincian Transaksi</h3>
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Tidak ada transaksi di periode ini.</p>
        ) : (
          filteredTransactions.map((tx) => {
            const cat = CATEGORIES[tx.category] || CATEGORIES['lainnya'];
            return (
            <div key={tx.id} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center border border-gray-100 group hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                 <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg shadow-sm ${cat.color}`}>
                   {cat.icon}
                 </div>
                 <div>
                   <p className="font-semibold text-gray-800 text-sm capitalize">{tx.description || cat.label}</p>
                   <p className="text-xs text-gray-500 mt-0.5">
                     {tx.profiles?.name} • {new Date(tx.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                   </p>
                 </div>
              </div>
              
              <div className="flex items-center gap-1.5 sm:gap-2">
                <p className={`font-bold text-sm mr-2 ${tx.type === 'expense' ? 'text-red-500' : 'text-[#4CAF50]'}`}>
                  {tx.type === 'expense' ? '- ' : '+ '}Rp {Number(tx.amount).toLocaleString('id-ID')}
                </p>
                
                {/* Tombol Edit */}
                {(tx.user_id === user?.id) && (
                  <button onClick={() => openEditModal(tx)} className="p-1.5 sm:p-2 bg-blue-50 text-blue-500 hover:bg-blue-100 rounded-lg opacity-100 sm:opacity-0 group-hover:opacity-100 transition-colors">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                )}
                {/* Tombol Hapus */}
                {(tx.user_id === user?.id) && (
                  <button onClick={() => handleDeleteTransaction(tx.id, tx.description)} className="p-1.5 sm:p-2 bg-red-50 text-red-400 hover:bg-red-100 rounded-lg opacity-100 sm:opacity-0 group-hover:opacity-100 transition-colors">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )})
        )}
      </div>

      {/* MODAL EDIT TRANSAKSI */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800">Edit Transaksi</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100">
                <XMarkIcon className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jenis</label>
                  <select value={txType} onChange={handleTypeChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A365D]/50">
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
                <input type="number" required value={txAmount} onChange={(e) => setTxAmount(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-[#1A365D]/50" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                <input type="text" required value={txDesc} onChange={(e) => setTxDesc(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A365D]/50" />
              </div>
              
              <button type="submit" disabled={isSubmitting} className="w-full bg-[#1A365D] text-white py-4 rounded-xl font-bold mt-6 shadow-lg shadow-[#1A365D]/30 hover:bg-[#1A365D]/90 transition-colors">
                {isSubmitting ? 'Menyimpan...' : 'Perbarui Transaksi'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}