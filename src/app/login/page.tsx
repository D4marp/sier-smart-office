'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    <div className="min-h-screen bg-white flex items-stretch" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Left: gedung SIER, judul, deskripsi singkat */}
      <div className="hidden lg:flex lg:w-3/5 relative items-end text-white overflow-hidden" style={{
        backgroundImage: "url('/sier-building-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        <div className="absolute inset-0 bg-gradient-to-t from-[#1c2c66] via-[#1c2c66]/60 to-transparent" />

        <div className="relative z-10 p-16 max-w-xl">
          <p className="text-sm text-white/70 mb-3">PT SIER (Persero)</p>
          <h1 className="text-4xl font-semibold tracking-tight leading-[1.15]">
            Energi gedung kantor SIER, dipantau dan dikendalikan dari satu tempat.
          </h1>
          <p className="mt-5 text-sm text-white/70 leading-relaxed max-w-md">
            Konsumsi daya, lampu, dan AC di setiap ruangan — terhubung lewat gateway Milesight dan ATEN.
          </p>
        </div>
      </div>

      {/* Right: form login */}
      <div className="w-full lg:w-2/5 flex flex-col justify-center px-8 sm:px-16">
        <div className="max-w-sm w-full mx-auto">

          <div className="flex items-center gap-3 mb-10">
            <Image src="/sier-logo.jpg" alt="Logo SIER" width={40} height={53} className="object-contain" />
            <div className="h-8 w-px bg-slate-200" />
            <Image src="/danantara-logo.webp" alt="Logo Danantara Indonesia" width={126} height={33} className="object-contain" />
          </div>

          <h2 className="text-xl font-semibold text-slate-900">Masuk ke dashboard</h2>
          <p className="text-slate-500 text-sm mt-1">Gunakan akun administrator gedung SIER.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-600">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border border-slate-300 px-3.5 py-2.5 text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#2f46a3] focus:ring-1 focus:ring-[#2f46a3] transition text-sm"
                placeholder="nama@sier.id"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-slate-600">Kata sandi</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-md border border-slate-300 px-3.5 py-2.5 text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#2f46a3] focus:ring-1 focus:ring-[#2f46a3] transition text-sm"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-[#2f46a3] hover:bg-[#26397f] px-4 py-2.5 font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 text-sm"
            >
              {loading ? 'Memproses…' : 'Masuk'}
            </button>
          </form>

          <p className="mt-10 text-xs text-slate-400">© 2026 PT SIER (Persero)</p>
        </div>
      </div>

    </div>
  )
}
