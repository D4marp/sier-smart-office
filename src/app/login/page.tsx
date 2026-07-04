'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import Image from 'next/image'
import { ShieldCheck, Zap, Activity } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('admin@unesa.ac.id')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await login(email, password)
      router.replace('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kombinasi email atau password salah.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-stretch" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      
      {/* Split Layout: Left side (Campus Wallpaper & Welcome Banner) */}
      <div className="hidden lg:flex lg:w-3/5 relative items-center justify-center text-white overflow-hidden" style={{
        backgroundImage: "url('/bg_unesa2.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        {/* Solid Navy Blue overlay with high opacity for official institutional styling */}
        <div className="absolute inset-0 bg-[#0f2d59]/90" />
        
        {/* Yellow-Gold Accent Top Border in Left Pane */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-[#d8ae47]" />

        <div className="relative z-10 p-16 max-w-2xl space-y-12">
          {/* Institution Header Tag */}
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/10 border border-white/20 rounded text-xs font-bold uppercase tracking-widest text-[#f1c40f]">
              <ShieldCheck size={14} />
              <span>Portal Terproteksi</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Sistem Manajemen Energi Terpadu UNESA
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Direktorat Perencanaan, Fasilitas, dan Sarana Prasarana Universitas Negeri Surabaya.
            </p>
          </div>

          <div className="w-16 h-1 bg-[#d8ae47] rounded" />

          {/* Features Checklist */}
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 rounded bg-white/10 border border-white/15 flex items-center justify-center text-[#f1c40f] shrink-0 mt-0.5">
                <Zap size={16} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Pemantauan Daya Real-Time</h4>
                <p className="text-xs text-slate-300 mt-1">Membaca data konsumsi daya peralatan listrik aktif di setiap ruang kelas per fakultas secara langsung.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 rounded bg-white/10 border border-white/15 flex items-center justify-center text-[#f1c40f] shrink-0 mt-0.5">
                <Activity size={16} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Sentralisasi Kendali Saklar</h4>
                <p className="text-xs text-slate-300 mt-1">Mengendalikan operasional lampu dan pendingin udara (AC) kelas langsung dari pusat kendali Rektorat.</p>
              </div>
            </div>
          </div>

          {/* Footer inside Left Pane */}
          <div className="pt-12 text-xs text-slate-400 border-t border-white/10">
            <p>© 2026 Universitas Negeri Surabaya. Hak Cipta Dilindungi Undang-Undang.</p>
          </div>
        </div>
      </div>

      {/* Split Layout: Right side (Clean White Login Card) */}
      <div className="w-full lg:w-2/5 flex flex-col justify-center bg-white p-8 sm:p-12 md:p-16 relative">
        {/* Yellow-Gold Accent Top Border in Right Pane (Mobile visual consistency) */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-[#d8ae47] lg:hidden" />

        <div className="max-w-md w-full mx-auto space-y-8">
          
          {/* Logo and Greeting */}
          <div className="space-y-4">
            <Image src="/logo_unesa.png" alt="Logo UNESA" width={110} height={40} className="object-contain" />
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">Masuk Sistem</h2>
              <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                Silakan masukkan email dan password administrator untuk mengakses dashboard kendali eksekutif Rektorat.
              </p>
            </div>
          </div>

          {/* Demo Login Notice Alert Box (Professional University Info Box style) */}
          <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 text-xs space-y-2 text-blue-900">
            <p className="font-bold uppercase tracking-wider text-blue-800 flex items-center space-x-1.5">
              <span>📌 Informasi Kredensial Uji Coba</span>
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-blue-100/50">
              <div>
                <p className="text-slate-500 font-semibold">Email Pengguna:</p>
                <p className="font-mono font-bold text-slate-800">admin@unesa.ac.id</p>
              </div>
              <div>
                <p className="text-slate-500 font-semibold">Kata Sandi:</p>
                <p className="font-mono font-bold text-slate-800">admin123</p>
              </div>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-600 uppercase tracking-wider">Alamat Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none ring-0 placeholder:text-slate-400 focus:border-[#0f2d59] focus:ring-1 focus:ring-[#0f2d59] transition text-sm"
                placeholder="nama@unesa.ac.id"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-slate-600 uppercase tracking-wider">Kata Sandi</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none ring-0 placeholder:text-slate-400 focus:border-[#0f2d59] focus:ring-1 focus:ring-[#0f2d59] transition text-sm"
                placeholder="Masukkan kata sandi"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 font-semibold flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#0f2d59] hover:bg-[#163f73] px-4 py-3 font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-70 shadow shadow-[#0f2d59]/15 text-sm uppercase tracking-wider"
            >
              {loading ? 'Memproses Masuk...' : 'Masuk Dashboard'}
            </button>
          </form>

          {/* Support and Safety Policy Footer */}
          <div className="pt-6 text-[10px] text-slate-400 border-t border-slate-100 flex justify-between">
            <span>Direktorat TI UNESA</span>
            <span>Kebijakan Keamanan TI</span>
          </div>

        </div>
      </div>

    </div>
  )
}
