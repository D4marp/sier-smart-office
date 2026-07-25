'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Zap, Activity, Gauge, Building2, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { devicesAPI, tenantsAPI } from '@/lib/apiClient'
import { useAuth } from '@/components/AuthProvider'
import Sidebar from '@/components/Sidebar'
import DashboardHeader from '@/components/DashboardHeader'

interface Device {
  id: number
  class_id: number
  device_eui: string
  device_name: string
  device_type: string
  location: string
  current_power: number
  current_temperature: number
  power_rating?: number
  iot_status: string
  status?: string
}

interface TenantMeta {
  code: string
  name: string
  campus?: string | null
}

function isDeviceOnline(d: Device) {
  const iot = String(d.iot_status || '').toLowerCase()
  const st = String(d.status || '').toLowerCase()
  return iot === 'online' || iot === 'active' || st === 'active' || st === 'idle'
}

// Dashboard fakultas generik — dipakai untuk seluruh fakultas (bukan file per-fakultas).
// Menampilkan data nyata dari database fakultas yang bersangkutan; menampilkan
// status "belum ada perangkat" bila fakultas belum punya perangkat IoT terpasang.
export default function FacultyDashboard() {
  const params = useParams<{ code: string }>()
  const code = String(params.code || '').toLowerCase()
  const router = useRouter()
  const { user, loading: authLoading, switchTenant } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [tenant, setTenant] = useState<TenantMeta | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRoom, setSelectedRoom] = useState('Semua')

  const isSuperadmin = user?.role === 'superadmin'
  const forbidden = !isSuperadmin && !!user?.tenant_code && user.tenant_code !== code

  useEffect(() => {
    if (authLoading) return
    if (forbidden) return
    switchTenant(code)
  }, [code, authLoading, forbidden, switchTenant])

  useEffect(() => {
    if (authLoading || forbidden) return

    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const [tenantList, deviceList] = await Promise.all([
          tenantsAPI.getAll(),
          devicesAPI.getAll(),
        ])
        if (cancelled) return
        const meta = tenantList.find((t: TenantMeta) => t.code === code) || null
        setTenant(meta)
        setDevices(deviceList || [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Gagal memuat data fakultas')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [code, authLoading, forbidden])

  const rooms = useMemo(() => ['Semua', ...Array.from(new Set(devices.map((d) => d.location).filter(Boolean)))], [devices])
  const filtered = useMemo(
    () => (selectedRoom === 'Semua' ? devices : devices.filter((d) => d.location === selectedRoom)),
    [devices, selectedRoom]
  )

  const stats = useMemo(() => {
    const online = filtered.filter(isDeviceOnline)
    const acDevices = filtered.filter((d) => d.device_type === 'AC')
    const lampDevices = filtered.filter((d) => d.device_type === 'LAMP')
    const acPower = acDevices.reduce((s, d) => (isDeviceOnline(d) ? s + (parseFloat(String(d.current_power)) || 0) : s), 0)
    const lampPower = lampDevices.reduce((s, d) => (isDeviceOnline(d) ? s + (parseFloat(String(d.current_power)) || 0) : s), 0)
    const temps = filtered.map((d) => parseFloat(String(d.current_temperature))).filter((t) => !Number.isNaN(t) && t > 0)
    const avgTemp = temps.length ? (temps.reduce((s, t) => s + t, 0) / temps.length).toFixed(1) : '—'
    return {
      onlineCount: online.length,
      totalCount: filtered.length,
      totalPower: acPower + lampPower,
      acPower,
      lampPower,
      avgTemp,
      roomCount: new Set(devices.map((d) => d.location)).size,
    }
  }, [filtered, devices])

  const chartData = filtered
    .filter((d) => d.device_type !== 'SENSOR')
    .map((d) => ({ name: d.device_name, power: parseFloat(String(d.current_power)) || 0 }))

  if (forbidden) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <ShieldCheck className="mx-auto text-cyan-300" size={40} />
          <h1 className="mt-4 text-2xl font-bold">Akses ditolak</h1>
          <p className="mt-2 text-sm text-white/65">Akun Anda terdaftar pada fakultas lain.</p>
          <button onClick={() => router.push('/')} className="mt-6 rounded-2xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950">
            Kembali
          </button>
        </div>
      </div>
    )
  }

  const title = tenant ? `Dashboard Energi ${tenant.name}` : `Dashboard Energi Fakultas ${code.toUpperCase()}`

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
        <DashboardHeader
          title={title}
          badge={tenant?.campus || undefined}
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto px-6 py-8 space-y-8 max-w-[1600px] w-full mx-auto">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-red-800 text-sm flex items-center space-x-3 shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {tenant?.campus && (
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <Building2 size={14} />
              <span>{tenant.campus}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard title="Total Daya Aktif" value={`${stats.totalPower.toFixed(2)} kW`} icon={<Zap size={18} />} loading={loading} />
            <KpiCard title="Perangkat Aktif" value={`${stats.onlineCount} / ${stats.totalCount}`} icon={<Activity size={18} />} loading={loading} />
            <KpiCard title="Ruang Terpantau" value={`${stats.roomCount}`} icon={<Building2 size={18} />} loading={loading} />
            <KpiCard title="Suhu Rata-rata" value={stats.avgTemp !== '—' ? `${stats.avgTemp}°C` : '—'} icon={<Gauge size={18} />} loading={loading} />
          </div>

          {!loading && devices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <Building2 className="mx-auto text-slate-300" size={40} />
              <h3 className="mt-4 text-slate-700 font-bold text-base">Belum ada perangkat IoT terpasang</h3>
              <p className="mt-1 text-slate-400 text-sm max-w-md mx-auto">
                Fakultas ini sudah terdaftar dalam sistem multi-tenant, namun belum ada perangkat AC/lampu/sensor
                yang didaftarkan ke database-nya. Hubungi admin sistem untuk instalasi perangkat.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-xl p-6 bg-white border border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <h3 className="text-slate-900 font-bold text-base tracking-tight">Daya Aktif per Perangkat</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {rooms.map((r) => (
                      <button
                        key={r}
                        onClick={() => setSelectedRoom(r)}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                          selectedRoom === r ? 'bg-[#0f2d59] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="w-full h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis stroke="#475569" tick={{ fontSize: 11 }} unit=" kW" />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6 }} formatter={(v: number) => [`${v.toFixed(2)} kW`]} />
                      <Bar dataKey="power" name="Daya (kW)" fill="#0f2d59" radius={[4, 4, 0, 0]} barSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-6 pb-0">
                  <h3 className="text-slate-900 font-bold text-base tracking-tight">Status Perangkat</h3>
                  <Link
                    href="/devices"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0f2d59] hover:underline"
                  >
                    <SlidersHorizontal size={13} />
                    <span>Kendalikan perangkat di halaman Perangkat →</span>
                  </Link>
                </div>
                <div className="overflow-x-auto p-6 pt-4">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                        {['Ruangan', 'Perangkat', 'Tipe', 'Daya (kW)', 'Status'].map((h) => (
                          <th key={h} className="py-3 px-4 font-bold text-xs uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map((d) => {
                        const online = isDeviceOnline(d)
                        return (
                          <tr key={d.id} className="hover:bg-slate-50/80">
                            <td className="py-3 px-4 font-semibold text-slate-800">{d.location}</td>
                            <td className="py-3 px-4 text-slate-600">{d.device_name}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">{d.device_type}</span>
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">{(parseFloat(String(d.current_power)) || 0).toFixed(2)}</td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${online ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${online ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                                {online ? 'Terhubung' : 'Terputus'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function KpiCard({ title, value, icon, loading }: { title: string; value: string; icon: React.ReactNode; loading: boolean }) {
  return (
    <div className="rounded-xl p-5 shadow-sm bg-white border border-slate-200 border-l-4 border-l-[#0f2d59]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</span>
        <div className="p-2 rounded bg-blue-50 text-[#0f2d59]">{icon}</div>
      </div>
      {loading ? (
        <div className="h-7 w-20 bg-slate-100 rounded animate-pulse" />
      ) : (
        <h3 className="text-xl font-extrabold text-[#0f2d59] tracking-tight leading-none">{value}</h3>
      )}
    </div>
  )
}
