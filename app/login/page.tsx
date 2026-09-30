'use client';
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase'; // Sesuaikan jumlah titik jika folder lib berbeda
import { useRouter } from 'next/navigation';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      // PROSES LOGIN
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert(error.message);
      } else {
        router.push('/'); // Lempar ke Dashboard jika sukses
      }
    } else {
      // PROSES REGISTER
      const { data, error } = await supabase.auth.signUp({ email, password });
      
      if (error) {
        alert(error.message);
      } else if (data.user) {
        // Generate Invite Code (Misal input nama "Caca" -> CACA-8F2A)
        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        const inviteCode = `${name.toUpperCase().slice(0, 4)}-${randomStr}`;

        // Masukkan data ke tabel Profiles
        const { error: profileError } = await supabase.from('profiles').insert([
          { 
            id: data.user.id, 
            name: name, 
            invite_code: inviteCode 
          }
        ]);

        if (profileError) {
          alert('Gagal membuat profil: ' + profileError.message);
        } else {
          alert('Registrasi sukses! Silakan login.');
          setIsLogin(true); // Pindah ke tampilan login
        }
      }
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4 font-sans text-gray-800">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-[#1A365D] mb-2">
          {isLogin ? 'Masuk ke Akunmu' : 'Buat Akun Baru'}
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          {isLogin ? 'Pantau tabungan bareng pasangan.' : 'Mulai perjalanan finansial bersama.'}
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Panggilan</label>
              <input 
                type="text" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1A365D]"
                placeholder="Bintang"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1A365D]"
              placeholder="contoh@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1A365D]"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#1A365D] text-white py-3 rounded-xl font-semibold hover:bg-[#1A365D]/90 transition-colors mt-2"
          >
            {loading ? 'Memproses...' : (isLogin ? 'Masuk' : 'Daftar')}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          {isLogin ? 'Belum punya akun? ' : 'Sudah punya akun? '}
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-[#4CAF50] font-semibold hover:underline"
          >
            {isLogin ? 'Daftar di sini' : 'Masuk'}
          </button>
        </p>
      </div>
    </main>
  );
}