'use client'

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Zap, Activity, Building2, ShieldCheck, Cpu, AlertTriangle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { tenantsAPI } from '@/lib/apiClient'
import { useAuth } from '@/components/AuthProvider'
import Sidebar from '@/components/Sidebar'
import DashboardHeader from '@/components/DashboardHeader'

interface FacultyOverview {
  code: string
  name: string
  campus: string | null
  classes: number
  rooms: number
  devices: { total: number; active: number; offline: number; maintenance: number }
  live_kw: number
  consumption_today_kwh: number
  active_alerts: number
  reachable: boolean
}

interface OverviewData {
  date: string
  total_faculties: number
  reachable_faculties: number
  total_live_kw: number
  total_consumption_today_kwh: number
  total_devices: number
  total_active_devices: number
  total_classes: number
  total_active_alerts: number
  faculties: FacultyOverview[]
}

const PALETTE = ['#0f2d59', '#0d9488', '#d8ae47', '#7c3aed', '#dc2626', '#0284c7', '#65a30d', '#c026d3', '#ea580c', '#0891b2', '#4338ca', '#65a30d']

// Dashboard rektorat: agregasi nyata lintas seluruh fakultas via /tenants/overview
// (fan-out ke setiap database fakultas). Hanya superadmin yang melihat halaman ini;
// user fakultas diarahkan langsung ke dashboard fakultasnya sendiri.
export default function RektoratDashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCampus, setSelectedCampus] = useState<string | null>(null)

  const isSuperadmin = user?.role === 'superadmin'

  useEffect(() => {
    if (authLoading) return
    if (user && !isSuperadmin) {
      router.replace(`/fakultas/${user.tenant_code}`)
    }
  }, [authLoading, user, isSuperadmin, router])

  useEffect(() => {
    if (!isSuperadmin) return
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const data = await tenantsAPI.overview()
        if (!cancelled) setOverview(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Gagal memuat data rektorat')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
  }, [isSuperadmin])

  const campuses = useMemo(() => {
    if (!overview) return []
    const map = new Map<string, FacultyOverview[]>()
    overview.faculties.forEach((f) => {
      const key = f.campus || 'Lainnya'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(f)
    })
    return Array.from(map.entries()).map(([name, faculties]) => ({
      name,
      faculties,
      live_kw: faculties.reduce((s, f) => s + (f.reachable ? f.live_kw : 0), 0),
      devicesActive: faculties.reduce((s, f) => s + (f.reachable ? f.devices.active : 0), 0),
      devicesTotal: faculties.reduce((s, f) => s + (f.reachable ? f.devices.total : 0), 0),
      rooms: faculties.reduce((s, f) => s + (f.reachable ? f.rooms : 0), 0),
    }))
  }, [overview])

  const pieData = useMemo(() => {
    if (!overview) return []
    return overview.faculties
      .filter((f) => f.reachable && f.live_kw > 0)
      .map((f, i) => ({ name: f.name, value: parseFloat(f.live_kw.toFixed(2)), fill: PALETTE[i % PALETTE.length] }))
  }, [overview])

  const barData = useMemo(() => {
    if (!overview) return []
    return [...overview.faculties]
      .filter((f) => f.reachable)
      .sort((a, b) => b.live_kw - a.live_kw)
      .map((f) => ({ name: f.name.replace('Fakultas ', ''), kw: parseFloat(f.live_kw.toFixed(2)) }))
  }, [overview])

  if (authLoading || (!isSuperadmin && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/30 border-t-white" />
      </div>
    )
  }

  return (
    <div
      className="flex h-screen overflow-hidden text-slate-800"
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        backgroundImage: "linear-gradient(to bottom, rgba(248, 250, 252, 0.95), rgba(248, 250, 252, 0.97)), url('/bg_unesa2.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <DashboardHeader title="Dashboard Energi Rektorat" badge="Rektorat" sidebarOpen={sidebarOpen} onOpenSidebar={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto px-6 py-8 space-y-8 max-w-[1600px] w-full mx-auto">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-red-800 text-sm flex items-center space-x-3 shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3 md:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-600 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
              <div>
                <p className="text-slate-900 text-sm font-bold">Status Jaringan Multi-Tenant UNESA</p>
                <p className="text-slate-500 text-xs">
                  {overview ? `${overview.reachable_faculties} dari ${overview.total_faculties} database fakultas terhubung` : 'Memuat status jaringan...'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck size={14} className="text-emerald-700" />
                <span>Sistem Aktif</span>
              </span>
              <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold uppercase tracking-wider">
                <Cpu size={14} className="text-blue-700" />
                <span>Registry Sinkron</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard
              title="Total Beban Universitas"
              value={`${(overview?.total_live_kw ?? 0).toFixed(2)} kW`}
              sub="Agregasi Waktu Nyata"
              icon={<Zap size={18} />}
              colorClass="border-l-4 border-l-[#0f2d59]"
              iconBg="bg-blue-50 text-[#0f2d59]"
              loading={loading}
            />
            <KpiCard
              title="Fakultas Terintegrasi"
              value={`${overview?.reachable_faculties ?? 0} / ${overview?.total_faculties ?? 0}`}
              sub="Database Multi-Tenant Aktif"
              icon={<Building2 size={18} />}
              colorClass="border-l-4 border-l-indigo-600"
              iconBg="bg-indigo-50 text-indigo-700"
              loading={loading}
            />
            <KpiCard
              title="Perangkat Aktif"
              value={`${overview?.total_active_devices ?? 0} / ${overview?.total_devices ?? 0}`}
              sub="Instalasi AC & Penerangan"
              icon={<Activity size={18} />}
              colorClass="border-l-4 border-l-emerald-600"
              iconBg="bg-emerald-50 text-emerald-700"
              loading={loading}
            />
            <KpiCard
              title="Peringatan Aktif"
              value={`${overview?.total_active_alerts ?? 0}`}
              sub="Seluruh Fakultas"
              icon={<AlertTriangle size={18} />}
              colorClass="border-l-4 border-l-amber-600"
              iconBg="bg-amber-50 text-amber-700"
              loading={loading}
            />
          </div>

          <div>
            <h2 className="text-slate-900 font-extrabold text-base tracking-tight mb-4 flex items-center space-x-2">
              <span className="w-1.5 h-5 bg-[#0f2d59]" />
              <span className="uppercase tracking-wider text-xs font-bold text-slate-500">Pemantauan Tingkat Kampus</span>
            </h2>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {[0, 1, 2].map((i) => <div key={i} className="h-40 rounded-xl bg-white border border-slate-200 animate-pulse" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {campuses.map((c) => (
                  <CampusCard key={c.name} campus={c} isSelected={selectedCampus === c.name} onClick={() => setSelectedCampus(selectedCampus === c.name ? null : c.name)} />
                ))}
              </div>
            )}
          </div>

          {selectedCampus && (
            <div className="mt-8">
              <h2 className="text-slate-900 font-extrabold text-base tracking-tight mb-4 flex items-center space-x-2">
                <span className="w-1.5 h-5 bg-amber-500" />
                <span className="uppercase tracking-wider text-xs font-bold text-slate-500">Daftar Fakultas: {selectedCampus}</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {campuses.find((c) => c.name === selectedCampus)?.faculties.map((f) => (
                  <FacultyCard key={f.code} faculty={f} />
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-xl p-6 bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="mb-6">
                <h3 className="text-slate-900 font-bold text-base tracking-tight">Distribusi Beban Aktif per Fakultas</h3>
                <p className="text-slate-500 text-xs">Daya aktif waktu nyata (kW), diurutkan dari yang tertinggi</p>
              </div>
              <div className="flex-1 w-full min-h-[260px]">
                {loading ? (
                  <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0f2d59]" /></div>
                ) : barData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">Belum ada perangkat aktif di seluruh fakultas</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 10, fontWeight: 600 }} angle={-30} textAnchor="end" interval={0} />
                      <YAxis stroke="#475569" tick={{ fontSize: 11, fontWeight: 600 }} unit=" kW" />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6 }} formatter={(v: number) => [`${v} kW`]} />
                      <Bar dataKey="kw" name="Daya Aktif" fill="#0f2d59" radius={[4, 4, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rounded-xl p-6 bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-slate-900 font-bold text-base tracking-tight">Proporsi Distribusi Beban</h3>
                <p className="text-slate-500 text-xs">Persentase daya aktif terdistribusi saat ini</p>
              </div>
              {loading ? (
                <div className="flex-1 flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0f2d59]" />
                </div>
              ) : pieData.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm py-12">Belum ada beban aktif</div>
              ) : (
                <div className="flex-1 flex flex-col justify-center">
                  <div className="w-full h-[180px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} stroke="#ffffff" strokeWidth={2} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6 }} formatter={(v: number) => [`${v} kW`]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
                      <span className="text-lg font-extrabold text-[#0f2d59] mt-0.5">{(overview?.total_live_kw ?? 0).toFixed(1)} kW</span>
                    </div>
                  </div>
                  <div className="space-y-2 mt-2 bg-slate-50 p-4 rounded border border-slate-200 max-h-[140px] overflow-y-auto">
                    {pieData.map((p) => (
                      <div key={p.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: p.fill }} />
                          <span className="text-slate-700 text-xs font-bold">{p.name}</span>
                        </div>
                        <span className="text-slate-900 font-extrabold text-xs">{p.value} kW</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function KpiCard({ title, value, sub, icon, colorClass, iconBg, loading }: {
  title: string; value: string; sub: string; icon: React.ReactNode; colorClass: string; iconBg: string; loading: boolean
}) {
  return (
    <div className={`rounded-xl p-5 shadow-sm bg-white border border-slate-200 transition-all ${colorClass}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded ${iconBg}`}>{icon}</div>
      </div>
      {loading ? (
        <div className="h-8 w-24 bg-slate-100 rounded animate-pulse" />
      ) : (
        <h3 className="text-xl font-extrabold text-[#0f2d59] tracking-tight leading-none">{value}</h3>
      )}
      <p className="text-slate-400 text-xs mt-2 font-medium">{sub}</p>
    </div>
  )
}

function CampusCard({ campus, isSelected, onClick }: {
  campus: { name: string; faculties: FacultyOverview[]; live_kw: number; devicesActive: number; devicesTotal: number; rooms: number }
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl p-5 shadow-sm bg-white border transition-all duration-300 relative overflow-hidden border-t-4 border-t-[#0f2d59] ${
        isSelected ? 'ring-2 ring-[#0f2d59] border-transparent shadow-md transform scale-[1.02]' : 'border-slate-200 hover:shadow-md hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-3xl">🏛️</span>
        <span className="px-2.5 py-1 rounded text-[10px] font-bold tracking-wider border bg-emerald-50 text-emerald-800 border-emerald-200">
          {campus.faculties.length} FAKULTAS
        </span>
      </div>
      <h3 className="text-slate-800 font-extrabold text-base mb-1.5 leading-tight">{campus.name}</h3>
      <div className="space-y-2 mt-3 text-xs text-slate-500">
        <div className="flex justify-between border-b border-slate-100 pb-1.5">
          <span>Total Daya Aktif</span>
          <span className="text-slate-900 font-extrabold">{campus.live_kw.toFixed(2)} kW</span>
        </div>
        <div className="flex justify-between border-b border-slate-100 pb-1.5">
          <span>Rasio Perangkat Aktif</span>
          <span className="text-slate-800 font-semibold">{campus.devicesActive} / {campus.devicesTotal} Alat</span>
        </div>
        <div className="flex justify-between pb-0.5">
          <span>Jumlah Ruang</span>
          <span className="text-slate-800 font-semibold">{campus.rooms} Ruangan</span>
        </div>
      </div>
      <div className="mt-4 w-full flex items-center justify-center space-x-1 py-2 bg-[#0f2d59]/5 hover:bg-[#0f2d59]/10 text-[#0f2d59] rounded text-center text-xs font-bold transition-all">
        <span>{isSelected ? 'Tutup Detail ↑' : 'Buka Detail ↓'}</span>
      </div>
    </button>
  )
}

function FacultyCard({ faculty: f }: { faculty: FacultyOverview }) {
  if (!f.reachable) {
    return (
      <div className="rounded-xl p-5 shadow-sm bg-white border border-slate-200 border-t-4 border-t-red-300 opacity-70">
        <div className="flex items-center justify-between mb-4">
          <span className="text-3xl">⚠️</span>
          <span className="px-2.5 py-1 rounded text-[10px] font-bold tracking-wider border bg-red-50 text-red-700 border-red-200">TIDAK TERHUBUNG</span>
        </div>
        <h3 className="text-slate-800 font-extrabold text-base mb-1.5 leading-tight">{f.name}</h3>
        <p className="text-slate-400 text-xs">Database fakultas tidak dapat dijangkau</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl p-5 shadow-sm bg-white border border-slate-200 border-t-4 border-t-[#0f2d59] hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-4">
        <span className="text-3xl">🎓</span>
        <span className="px-2.5 py-1 rounded text-[10px] font-bold tracking-wider border bg-emerald-50 text-emerald-800 border-emerald-200">TERKONEKSI</span>
      </div>
      <h3 className="text-slate-800 font-extrabold text-base mb-1.5 leading-tight">{f.name}</h3>
      <div className="space-y-2 mt-3 text-xs text-slate-500">
        <div className="flex justify-between border-b border-slate-100 pb-1.5">
          <span>Total Daya Aktif</span>
          <span className="text-slate-900 font-extrabold">{f.live_kw.toFixed(2)} kW</span>
        </div>
        <div className="flex justify-between border-b border-slate-100 pb-1.5">
          <span>Rasio Perangkat Aktif</span>
          <span className="text-slate-800 font-semibold">{f.devices.active} / {f.devices.total} Alat</span>
        </div>
        <div className="flex justify-between pb-0.5">
          <span>Jumlah Ruang Kelas</span>
          <span className="text-slate-800 font-semibold">{f.classes} Ruangan</span>
        </div>
      </div>
      <Link
        href={`/fakultas/${f.code}`}
        className="mt-4 w-full flex items-center justify-center space-x-1 py-2.5 rounded text-xs font-bold transition-all shadow-sm text-white hover:opacity-95 bg-[#0f2d59]"
      >
        <span>Buka Dashboard Monitor →</span>
      </Link>
    </div>
  )
}
