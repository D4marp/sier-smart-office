'use client'

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import {
  Zap, Activity, Building2, Menu, Settings, LogOut, TrendingDown, Power, Clock, ShieldCheck, Cpu, X
} from 'lucide-react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { devicesAPI } from '@/lib/apiClient'
import { useAuth } from '@/components/AuthProvider'

// ─── Types ───────────────────────────────────────────────────────────────────

interface LiveDevice {
  id: number
  class_id: number
  device_eui: string
  device_name: string
  device_type: string
  location: string
  current_power: number
  current_temperature: number
  iot_status: string
  status?: string
}

interface FacultyCard {
  id: string
  name: string
  shortName: string
  mode: 'live' | 'soon'
  totalPower: number
  deviceCount: number
  activeDevices: number
  rooms: number
  href: string
  accentColor: string
  icon: string
  statusText: string
}

interface ChartPoint {
  label: string
  psikologi: number
  fbs: number
  total: number
}

interface RoomRow {
  faculty: string
  room: string
  device: string
  type: string
  power: number
  status: 'online' | 'offline'
  deviceId?: number
  location?: string
}

// ─── Dummy FBS data ───────────────────────────────────────────────────────────

const FBS_DEVICES: RoomRow[] = [
  { faculty: 'FBS', room: 'U5.02.01', device: 'AC U5.02.01 Unit 1', type: 'AC', power: 2.4, status: 'online' },
  { faculty: 'FBS', room: 'U5.02.01', device: 'Lampu U5.02.01', type: 'LAMP', power: 0.8, status: 'online' },
  { faculty: 'FBS', room: 'U5.02.02', device: 'AC U5.02.02 Unit 1', type: 'AC', power: 2.1, status: 'online' },
  { faculty: 'FBS', room: 'U5.02.02', device: 'Lampu U5.02.02', type: 'LAMP', power: 0.6, status: 'offline' },
  { faculty: 'FBS', room: 'U5.02.03', device: 'AC U5.02.03 Unit 1', type: 'AC', power: 1.8, status: 'online' },
  { faculty: 'FBS', room: 'U5.02.03', device: 'Lampu U5.02.03', type: 'LAMP', power: 0.7, status: 'online' },
  { faculty: 'FBS', room: 'U5.02.04', device: 'AC U5.02.04', type: 'AC', power: 3.2, status: 'online' },
  { faculty: 'FBS', room: 'U5.02.04', device: 'Lampu U5.02.04', type: 'LAMP', power: 1.2, status: 'online' },
  { faculty: 'FBS', room: 'U5.03.05', device: 'AC U5.03.05', type: 'AC', power: 2.8, status: 'online' },
  { faculty: 'FBS', room: 'U5.03.05', device: 'Lampu U5.03.05', type: 'LAMP', power: 2.1, status: 'online' },
]

const FBS_TOTAL_POWER = FBS_DEVICES.reduce((s, d) => s + (d.status === 'online' ? d.power : 0), 0)

function generateMonthlyComparison(): ChartPoint[] {
  const now = new Date()
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des']
  return Array.from({ length: 6 }, (_, i) => {
    const mIdx = (now.getMonth() - 5 + i + 12) % 12
    const base = 380 + Math.sin(i * 0.8) * 60
    const psi = Math.round((base + Math.random() * 50) * 10) / 10
    
    // FBS starts in May (Mei). Months are indexed: Jan=0, Feb=1, Mar=2, Apr=3, Mei=4, Jun=5, etc.
    const fbs = mIdx >= 4
      ? Math.round((base * 0.9 + Math.random() * 40) * 10) / 10
      : 0
      
    return { label: months[mIdx], psikologi: psi, fbs, total: Math.round((psi + fbs) * 10) / 10 }
  })
}

function generateDailyComparison(): ChartPoint[] {
  const hours = ['06:00','08:00','10:00','12:00','14:00','16:00','18:00','20:00']
  return hours.map((h, i) => {
    const peak = Math.sin((i - 1) * Math.PI / 6) * 20
    const psi = Math.max(10, Math.round((30 + peak + Math.random() * 8) * 10) / 10)
    const fbs = Math.max(8, Math.round((26 + peak * 0.9 + Math.random() * 7) * 10) / 10)
    return { label: h, psikologi: psi, fbs, total: Math.round((psi + fbs) * 10) / 10 }
  })
}

function isDeviceOnline(d: LiveDevice) {
  const iot = String(d.iot_status || '').toLowerCase()
  const st = String(d.status || '').toLowerCase()
  return iot === 'online' || iot === 'active' || st === 'active' || st === 'idle'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RektoratDashboard() {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [liveDevices, setLiveDevices] = useState<LiveDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())
  const [monthlyData] = useState<ChartPoint[]>(generateMonthlyComparison())
  const [dailyData] = useState<ChartPoint[]>(generateDailyComparison())

  const efficiencyPct = useMemo(() => {
    if (monthlyData.length < 2) return 18.4
    const prevMonth = monthlyData[monthlyData.length - 2].total
    const currMonth = monthlyData[monthlyData.length - 1].total
    if (prevMonth <= 0) return 0
    return ((prevMonth - currMonth) / prevMonth) * 100
  }, [monthlyData])
  const [fbsRows, setFbsRows] = useState<RoomRow[]>(FBS_DEVICES)
  const [classControlLoading, setClassControlLoading] = useState<Record<string, boolean>>({})
  const [deviceControlLoading, setDeviceControlLoading] = useState<Record<number, boolean>>({})
  const [chartMode, setChartMode] = useState<'daily' | 'monthly'>('daily')
  const [controlError, setControlError] = useState<string | null>(null)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [selectedCampus, setSelectedCampus] = useState<string | null>('lidah-wetan')
  const [controlModalOpen, setControlModalOpen] = useState(false)

  // Clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Load live Psikologi data
  const loadLiveData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await devicesAPI.getAll()
      setLiveDevices(data || [])
    } catch {
      setLiveDevices([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadLiveData() }, [loadLiveData])

  // Computed Psikologi stats
  const psiOnline = liveDevices.filter(isDeviceOnline)
  const psiTotalPower = psiOnline.reduce((s, d) => s + (parseFloat(String(d.current_power)) || 0), 0)
  const psiRooms = new Set(liveDevices.map(d => d.location).filter(Boolean)).size

  // Faculty data structure linked to campuses
  const facultyDataList = [
    {
      id: 'psikologi',
      name: 'Fakultas Psikologi',
      shortName: 'Psikologi',
      mode: 'live' as const,
      totalPower: psiTotalPower,
      deviceCount: liveDevices.length,
      activeDevices: psiOnline.length,
      rooms: psiRooms,
      href: '/psikologi',
      accentColor: '#3b82f6', // Institutional Blue
      icon: '🧠',
      statusText: 'TERKONEKSI',
      campusId: 'lidah-wetan'
    },
    {
      id: 'fbs',
      name: 'Fakultas Bahasa dan Seni',
      shortName: 'FBS',
      mode: 'live' as const,
      totalPower: FBS_TOTAL_POWER,
      deviceCount: FBS_DEVICES.length,
      activeDevices: fbsRows.filter(d => d.status === 'online').length,
      rooms: new Set(FBS_DEVICES.map(d => d.room)).size,
      href: '/fbs',
      accentColor: '#0d9488', // Teal
      icon: '🎨',
      statusText: 'TERKONEKSI',
      campusId: 'lidah-wetan'
    },
    {
      id: 'ft',
      name: 'Fakultas Teknik',
      shortName: 'FT',
      mode: 'soon' as const,
      totalPower: 0, deviceCount: 0, activeDevices: 0, rooms: 0,
      href: '#', accentColor: '#94a3b8', icon: '⚙️',
      statusText: 'INTEGRASI TAHAP II',
      campusId: 'ketintang'
    },
    {
      id: 'fe',
      name: 'Fakultas Ekonomi',
      shortName: 'FE',
      mode: 'soon' as const,
      totalPower: 0, deviceCount: 0, activeDevices: 0, rooms: 0,
      href: '#', accentColor: '#94a3b8', icon: '📈',
      statusText: 'INTEGRASI TAHAP II',
      campusId: 'ketintang'
    },
    {
      id: 'magetan',
      name: 'PSDKU Unesa Magetan',
      shortName: 'PSDKU Magetan',
      mode: 'soon' as const,
      totalPower: 0, deviceCount: 0, activeDevices: 0, rooms: 0,
      href: '#', accentColor: '#94a3b8', icon: '🏢',
      statusText: 'INTEGRASI TAHAP II',
      campusId: 'magetan'
    },
    {
      id: 'pascasarjana',
      name: 'Pascasarjana / Mustopo',
      shortName: 'Pascasarjana',
      mode: 'soon' as const,
      totalPower: 0, deviceCount: 0, activeDevices: 0, rooms: 0,
      href: '#', accentColor: '#eab308', icon: '🎓',
      statusText: 'INTEGRASI TAHAP II',
      campusId: 'mustopo'
    }
  ]

  // Campus cards config
  const campuses = [
    {
      id: 'lidah-wetan',
      name: 'Kampus Lidah Wetan',
      icon: '🏛️',
      accentColor: '#0f2d59',
      mode: 'live' as const,
      totalPower: psiTotalPower + FBS_TOTAL_POWER,
      deviceCount: liveDevices.length + FBS_DEVICES.length,
      activeDevices: psiOnline.length + fbsRows.filter(d => d.status === 'online').length,
      rooms: psiRooms + new Set(FBS_DEVICES.map(d => d.room)).size,
    },
    {
      id: 'ketintang',
      name: 'Kampus Ketintang',
      icon: '🏫',
      accentColor: '#0d9488',
      mode: 'soon' as const,
      totalPower: 0,
      deviceCount: 0,
      activeDevices: 0,
      rooms: 0,
    },
    {
      id: 'magetan',
      name: 'Kampus Magetan',
      icon: '🏢',
      accentColor: '#94a3b8',
      mode: 'soon' as const,
      totalPower: 0,
      deviceCount: 0,
      activeDevices: 0,
      rooms: 0,
    },
    {
      id: 'mustopo',
      name: 'Kampus Mustopo',
      icon: '🏘️',
      accentColor: '#eab308',
      mode: 'soon' as const,
      totalPower: 0,
      deviceCount: 0,
      activeDevices: 0,
      rooms: 0,
    }
  ]

  const totalUniversityPower = psiTotalPower + FBS_TOTAL_POWER
  const totalDevices = liveDevices.length + fbsRows.length
  const totalActive = psiOnline.length + fbsRows.filter(d => d.status === 'online').length

  // Live rows from Psikologi (excluding sensors)
  const liveRows: RoomRow[] = liveDevices
    .filter(d => d.device_type !== 'SENSOR')
    .map(d => ({
      faculty: 'Psikologi',
      room: d.location,
      device: d.device_name,
      type: d.device_type,
      power: parseFloat(String(d.current_power)) || 0,
      status: isDeviceOnline(d) ? 'online' : 'offline',
      deviceId: d.id,
      location: d.location,
    }))

  // Convert FBS rows to match RoomRow
  const fbsRowsMapped: RoomRow[] = fbsRows.map(r => ({
    faculty: 'FBS',
    room: r.room,
    device: r.device,
    type: r.type,
    power: r.status === 'online' ? r.power : 0,
    status: r.status,
    location: r.room
  }))

  const allRows = [...liveRows, ...fbsRowsMapped]

  // Unique live class locations for batch control
  const liveClassCodes = Array.from(new Set(liveRows.map(r => r.location).filter(Boolean))) as string[]

  const handleLiveClassControl = async (classCode: string, action: 'on' | 'off') => {
    try {
      setClassControlLoading(prev => ({ ...prev, [classCode]: true }))
      setControlError(null)
      await devicesAPI.controlByClass(classCode, action)
      setLiveDevices(prev => prev.map(d =>
        d.location === classCode
          ? { ...d, status: action === 'on' ? 'active' : 'idle', iot_status: action === 'on' ? 'active' : 'inactive' }
          : d
      ))
    } catch {
      setControlError(`Gagal mengirim perintah ke ruangan ${classCode}`)
    } finally {
      setClassControlLoading(prev => ({ ...prev, [classCode]: false }))
    }
  }


  const handleDeviceControl = async (deviceId: number, action: 'on' | 'off') => {
    try {
      setDeviceControlLoading(prev => ({ ...prev, [deviceId]: true }))
      setControlError(null)
      await devicesAPI.control(deviceId, action)
      // Update local state immediately for fast feedback
      setLiveDevices(prev => prev.map(d =>
        d.id === deviceId
          ? { ...d, status: action === 'on' ? 'active' : 'offline', iot_status: action === 'on' ? 'active' : 'offline' }
          : d
      ))
    } catch (err) {
      console.error('Failed to control device:', err)
      setControlError(err instanceof Error ? err.message : 'Gagal mengontrol perangkat')
    } finally {
      setDeviceControlLoading(prev => ({ ...prev, [deviceId]: false }))
    }
  }

  const handleFbsDeviceToggle = (deviceName: string) => {
    setFbsRows(prev => prev.map(r =>
      r.device === deviceName
        ? { ...r, status: r.status === 'online' ? 'offline' : 'online' }
        : r
    ))
  }

  const pieData = [
    { name: 'Psikologi', value: parseFloat(psiTotalPower.toFixed(2)), fill: '#1e3a8a' }, // Navy
    { name: 'FBS', value: parseFloat(FBS_TOTAL_POWER.toFixed(2)), fill: '#0d9488' }, // Teal
  ]

  const chartData = chartMode === 'daily' ? dailyData : monthlyData
  const chartKey = 'label'

  return (
    <div className="flex h-screen overflow-hidden text-slate-800" style={{
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      backgroundImage: "linear-gradient(to bottom, rgba(248, 250, 252, 0.95), rgba(248, 250, 252, 0.97)), url('/bg_unesa2.png')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-[#0f2d59] text-white transition-all duration-300 flex flex-col shadow-xl relative z-20 border-r-4 border-r-[#d8ae47]`}
      >
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          {sidebarOpen && (
            <div className="flex-1 w-full h-auto">
              <Image 
                src="/logo_unesa.png" 
                alt="UNESA Logo" 
                width={240} 
                height={80}
                priority
                className="w-full h-auto object-contain brightness-110"
              />
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/10 rounded transition-all ml-auto"
          >
            <Menu size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-2">
          <Link href="/" className="flex items-center space-x-3 px-4 py-3 rounded text-white bg-white/10 font-bold transition-all">
            <Building2 size={20} className="text-[#f1c40f]" />
            {sidebarOpen && <span className="text-sm">Dasbor Rektorat</span>}
          </Link>
          <Link href="/psikologi" className="flex items-center space-x-3 px-4 py-3 rounded text-white/70 hover:bg-white/5 hover:text-white transition-all">
            <Activity size={20} />
            {sidebarOpen && <span className="text-sm">Fakultas Psikologi</span>}
          </Link>
          <Link href="/fbs" className="flex items-center space-x-3 px-4 py-3 rounded text-white/70 hover:bg-white/5 hover:text-white transition-all">
            <Activity size={20} />
            {sidebarOpen && <span className="text-sm">Fakultas Bahasa & Seni</span>}
          </Link>
        </nav>

        <div className="px-3 pb-6 space-y-2 border-t border-white/10 pt-4">
          <Link href="/settings" className="flex items-center space-x-3 px-4 py-3 rounded text-white/70 hover:bg-white/5 hover:text-white transition-all">
            <Settings size={20} />
            {sidebarOpen && <span className="text-sm">Pengaturan</span>}
          </Link>
          <button onClick={logout} className="w-full flex items-center space-x-3 px-4 py-3 rounded text-white/70 hover:bg-white/5 hover:text-white transition-all text-left">
            <LogOut size={20} />
            {sidebarOpen && <span className="text-sm">Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Header */}
        <header className="bg-[#0f2d59] text-white shadow-md border-b-4 border-[#d8ae47] z-10 shrink-0">
          <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Sidebar toggle for mobile or simple branding when sidebar collapsed */}
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-1.5 hover:bg-white/10 rounded transition-all mr-2 lg:hidden"
                >
                  <Menu size={20} />
                </button>
              )}
              <div>
                <h1 className="text-white font-extrabold text-base tracking-tight leading-tight uppercase">Dashboard Energi Rektorat</h1>
                <p className="text-[#f1c40f] font-bold text-xs tracking-wider uppercase">Universitas Negeri Surabaya</p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              {/* Clock and Calendar */}
              <div className="text-right border-r border-white/20 pr-6 hidden md:block">
                <div className="flex items-center justify-end space-x-1.5 text-white">
                  <Clock size={13} className="text-[#f1c40f]" />
                  <span className="font-bold text-sm tracking-wide">{now.toLocaleTimeString('id-ID')}</span>
                </div>
                <p className="text-slate-300 text-xs mt-0.5">{now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>

              {/* User Profile Badge with Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center space-x-2.5 hover:bg-white/10 p-1.5 rounded-lg transition-all focus:outline-none"
                >
                  <div className="w-9 h-9 rounded-full bg-[#d8ae47] text-[#0f2d59] font-black text-sm flex items-center justify-center border-2 border-white shadow-md">
                    {user?.full_name ? user.full_name[0].toUpperCase() : 'A'}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-bold text-white leading-none">{user?.full_name || 'Administrator'}</p>
                    <p className="text-[10px] text-[#f1c40f] font-bold leading-none mt-1 uppercase">Rektorat</p>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {profileMenuOpen && (
                  <>
                    {/* Backdrop to close dropdown on click outside */}
                    <div className="fixed inset-0 z-30" onClick={() => setProfileMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-1 z-40 border border-slate-200 divide-y divide-slate-100 text-slate-800">
                      <div className="px-4 py-2">
                        <p className="text-xs font-semibold text-slate-400">Masuk sebagai</p>
                        <p className="text-xs font-bold text-slate-800 truncate mt-0.5">{user?.email}</p>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/settings"
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-medium transition-all"
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          <Settings size={16} className="text-slate-500" />
                          <span>Pengaturan</span>
                        </Link>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setProfileMenuOpen(false)
                            logout()
                          }}
                          className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-semibold transition-all text-left"
                        >
                          <LogOut size={16} className="text-red-500" />
                          <span>Keluar</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <main className="flex-1 overflow-y-auto px-6 py-8 space-y-8 max-w-[1600px] w-full mx-auto">
          
          {controlError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-red-800 text-sm flex items-center space-x-3 shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <span className="font-semibold">{controlError}</span>
            </div>
          )}

          {/* Top Information Strip */}
          <div className="flex flex-col md:flex-row md:items-center justify-between bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3 md:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-600 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
              <div>
                <p className="text-slate-900 text-sm font-bold">Status Jaringan Sensor & IoT Kampus</p>
                <p className="text-slate-500 text-xs">Node monitoring pada gedung Fakultas terhubung penuh ke sistem pusat</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck size={14} className="text-emerald-700" />
                <span>Sistem Aktif</span>
              </span>
              <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold uppercase tracking-wider">
                <Cpu size={14} className="text-blue-700" />
                <span>Gateway Sinkron</span>
              </span>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard
              title="Total Beban Universitas"
              value={`${totalUniversityPower.toFixed(2)} kW`}
              sub="Agregasi Waktu Nyata"
              icon={<Zap size={18} />}
              colorClass="border-l-4 border-l-[#0f2d59]"
              iconBg="bg-blue-50 text-[#0f2d59]"
              loading={loading}
            />
            <KpiCard
              title="Fakultas Terintegrasi"
              value="2 / 10"
              sub="Fase Pemantauan Kampus"
              icon={<Building2 size={18} />}
              colorClass="border-l-4 border-l-indigo-600"
              iconBg="bg-indigo-50 text-indigo-700"
              loading={false}
            />
            <KpiCard
              title="Total Perangkat Terbaca"
              value={`${totalActive} / ${totalDevices}`}
              sub="Instalasi AC & Penerangan"
              icon={<Activity size={18} />}
              colorClass="border-l-4 border-l-emerald-600"
              iconBg="bg-emerald-50 text-emerald-700"
              loading={loading}
            />
            <KpiCard
              title="Potensi Efisiensi Daya"
              value={`${efficiencyPct.toFixed(1)}%`}
              sub={efficiencyPct >= 0 ? "Penurunan vs Bulan Lalu" : "Peningkatan vs Bulan Lalu"}
              icon={<TrendingDown size={18} />}
              colorClass="border-l-4 border-l-amber-600"
              iconBg="bg-amber-50 text-amber-700"
              loading={loading}
            />
          </div>

          {/* Campus Grid */}
          <div>
            <h2 className="text-slate-900 font-extrabold text-base tracking-tight mb-4 flex items-center space-x-2">
              <span className="w-1.5 h-5 bg-[#0f2d59]" />
              <span className="uppercase tracking-wider text-xs font-bold text-slate-500">Pemantauan Tingkat Kampus</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {campuses.map(c => (
                <CampusCard key={c.id} campus={c} isSelected={selectedCampus === c.id} onClick={() => setSelectedCampus(selectedCampus === c.id ? null : c.id)} />
              ))}
            </div>
          </div>

          {/* Faculty List for Selected Campus */}
          {selectedCampus && (
            <div className="mt-8 transition-all duration-300">
              <h2 className="text-slate-900 font-extrabold text-base tracking-tight mb-4 flex items-center space-x-2">
                <span className="w-1.5 h-5 bg-amber-500" />
                <span className="uppercase tracking-wider text-xs font-bold text-slate-500">
                  Daftar Fakultas: {campuses.find(c => c.id === selectedCampus)?.name}
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {facultyDataList
                  .filter(f => f.campusId === selectedCampus)
                  .map(f => (
                    <FacultyCard key={f.id} faculty={f as any} loading={f.id === 'psikologi' && loading} />
                  ))}
              </div>
            </div>
          )}

          {/* Charts & Analytics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Bar Chart Container */}
            <div className="lg:col-span-2 rounded-xl p-6 bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-slate-900 font-bold text-base tracking-tight">Konsumsi Energi Fakultatif</h3>
                  <p className="text-slate-500 text-xs">Perbandingan pemakaian beban listrik aktif antarfakultas saat ini</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded border border-slate-200">
                  {(['daily', 'monthly'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setChartMode(m)}
                      className={`px-4 py-1 rounded text-xs font-bold transition-all ${
                        chartMode === m 
                          ? 'bg-[#0f2d59] text-white shadow-sm' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {m === 'daily' ? 'Harian' : 'Bulanan'}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex-1 w-full min-h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey={chartKey} stroke="#475569" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                    <YAxis stroke="#475569" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} unit=" kW" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                      labelStyle={{ color: '#64748b', fontWeight: 700, fontSize: 12 }}
                      itemStyle={{ fontSize: 12, padding: 0 }}
                    />
                    <Legend iconType="square" wrapperStyle={{ fontSize: 11, fontWeight: 700, color: '#475569', paddingTop: 15 }} />
                    <Bar dataKey="psikologi" name="Fakultas Psikologi" fill="#0f2d59" radius={0} barSize={20} />
                    <Bar dataKey="fbs" name="Fakultas Bahasa & Seni" fill="#0d9488" radius={0} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distribution Pie Chart Container */}
            <div className="rounded-xl p-6 bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-slate-900 font-bold text-base tracking-tight">Proporsi Distribusi Beban</h3>
                <p className="text-slate-500 text-xs">Persentase daya aktif terdistribusi hari ini</p>
              </div>
              
              {loading ? (
                <div className="flex-1 flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0f2d59]" />
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center">
                  <div className="w-full h-[180px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} stroke="#ffffff" strokeWidth={2} />)}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6 }}
                          formatter={(v: number) => [`${v} kW`]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
                      <span className="text-lg font-extrabold text-[#0f2d59] mt-0.5">{totalUniversityPower.toFixed(1)} kW</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mt-2 bg-slate-50 p-4 rounded border border-slate-200">
                    {pieData.map(p => (
                      <div key={p.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-sm" style={{ background: p.fill }} />
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

          {/* 6-Month Trend Line Chart */}
          <div className="rounded-xl p-6 bg-white border border-slate-200 shadow-sm">
            <div className="mb-6">
              <h3 className="text-slate-900 font-bold text-base tracking-tight">Tren Akumulasi Penggunaan Bulanan (kWh)</h3>
              <p className="text-slate-500 text-xs">Statistik pemakaian daya historis dalam kurun waktu 6 bulan terakhir</p>
            </div>
            
            <div className="w-full h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" stroke="#475569" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                  <YAxis stroke="#475569" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} unit=" kWh" />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6 }} />
                  <Legend iconType="square" wrapperStyle={{ fontSize: 11, fontWeight: 700, color: '#475569', paddingTop: 15 }} />
                  <Line type="monotone" dataKey="psikologi" name="Fakultas Psikologi" stroke="#0f2d59" strokeWidth={3} dot={{ fill: '#0f2d59', r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="fbs" name="Fakultas Bahasa & Seni" stroke="#0d9488" strokeWidth={3} dot={{ fill: '#0d9488', r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="total" name="Total Universitas" stroke="#eab308" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Access Control Banner */}
          <div className="rounded-xl p-6 bg-gradient-to-r from-[#0f2d59] to-[#1e3a8a] text-white border border-slate-200 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center space-x-4 z-10">
              <div className="p-3.5 bg-white/10 rounded-xl border border-white/10 text-[#f1c40f]">
                <Cpu size={24} className="badge-live" />
              </div>
              <div>
                <h3 className="text-white font-extrabold text-lg tracking-tight">Pusat Kendali Perangkat Kampus</h3>
                <p className="text-slate-200 text-xs mt-0.5">Akses cepat saklar IoT (AC & Penerangan) untuk seluruh ruangan kelas terhubung</p>
              </div>
            </div>
            <button
              onClick={() => setControlModalOpen(true)}
              className="z-10 px-6 py-3 bg-[#d8ae47] hover:bg-[#c59e3c] active:scale-95 text-[#0f2d59] font-black text-sm rounded-xl transition-all shadow-md flex items-center space-x-2"
            >
              <Power size={16} />
              <span>Buka Panel Kontrol</span>
            </button>
          </div>

          {/* Device Control Modal */}
          {controlModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <div className="fixed inset-0 bg-[#06142c]/75 backdrop-blur-sm transition-opacity" onClick={() => setControlModalOpen(false)} />
              
              {/* Modal Content */}
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[85vh] overflow-hidden relative z-10 flex flex-col transition-all duration-300">
                <div className="p-6 border-b border-slate-200 bg-[#0f2d59] text-white flex items-center justify-between shadow-sm">
                  <div>
                    <h3 className="text-white font-extrabold text-lg tracking-tight">Panel Saklar & Kontrol Perangkat Kampus</h3>
                    <p className="text-slate-300 text-xs mt-0.5">Sentralisasi kontrol saklar perangkat beban (AC & Lampu) per fakultas</p>
                  </div>
                  <button 
                    onClick={() => setControlModalOpen(false)}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all focus:outline-none"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Kontrol Cepat Kelas:</span>
                    {liveClassCodes.map(code => (
                      <div key={code} className="flex items-center space-x-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                        <span className="text-slate-700 text-xs font-bold px-2">{code}</span>
                        <button
                          onClick={() => handleLiveClassControl(code, 'on')}
                          disabled={classControlLoading[code]}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-all disabled:opacity-50"
                        >
                          ON
                        </button>
                        <button
                          onClick={() => handleLiveClassControl(code, 'off')}
                          disabled={classControlLoading[code]}
                          className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold transition-all disabled:opacity-50"
                        >
                          OFF
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100 text-slate-600 sticky top-0 z-10">
                        {['Fakultas', 'Gedung / Ruang', 'Nama Alat', 'Tipe', 'Daya Aktif', 'Koneksi', 'Aksi Kendali'].map(h => (
                          <th key={h} className="py-3.5 px-6 font-bold text-xs uppercase tracking-wider border-b border-slate-200">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allRows.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/80 transition-all odd:bg-white even:bg-slate-50/30">
                          <td className="py-3.5 px-6 font-bold text-slate-800">{row.faculty}</td>
                          <td className="py-3.5 px-6 text-slate-700 font-semibold">{row.room}</td>
                          <td className="py-3.5 px-6 text-slate-600 font-medium">{row.device}</td>
                          <td className="py-3.5 px-6">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                              row.type === 'AC' 
                                ? 'bg-orange-50 text-orange-700 border-orange-200' 
                                : row.type === 'LAMP' 
                                ? 'bg-yellow-50 text-yellow-700 border-yellow-200' 
                                : row.type === 'PROJECTOR'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>{row.type}</span>
                          </td>
                          <td className="py-3.5 px-6 text-slate-900 font-bold">
                            {row.power.toFixed(2)} kW
                          </td>
                          <td className="py-3.5 px-6">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${
                              row.status === 'online' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${row.status === 'online' ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                              {row.status === 'online' ? 'Terhubung' : 'Terputus'}
                            </span>
                          </td>
                          <td className="py-3.5 px-6">
                            {row.faculty === 'FBS' ? (
                              <button
                                onClick={() => handleFbsDeviceToggle(row.device)}
                                className={`flex items-center justify-center space-x-1 px-3 py-1.5 rounded text-xs font-bold transition-all ${
                                  row.status === 'online'
                                    ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                }`}
                              >
                                <Power size={11} />
                                <span>{row.status === 'online' ? 'Matikan' : 'Nyalakan'}</span>
                              </button>
                            ) : row.type === 'SENSOR' ? (
                              <span className="text-slate-400 text-xs font-medium">—</span>
                            ) : (
                              <div className="flex items-center space-x-1.5">
                                <button
                                  onClick={() => row.deviceId && handleDeviceControl(row.deviceId, 'on')}
                                  disabled={(row.deviceId ? deviceControlLoading[row.deviceId] : false) || row.status === 'online'}
                                  className={`px-2 py-1 rounded text-white text-xs font-bold transition-all shadow-sm active:scale-95 duration-200 ${
                                    row.status === 'online'
                                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                      : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-md'
                                  }`}
                                >
                                  {row.deviceId && deviceControlLoading[row.deviceId] ? '...' : 'ON'}
                                </button>
                                <button
                                  onClick={() => row.deviceId && handleDeviceControl(row.deviceId, 'off')}
                                  disabled={(row.deviceId ? deviceControlLoading[row.deviceId] : false) || row.status !== 'online'}
                                  className={`px-2 py-1 rounded text-white text-xs font-bold transition-all shadow-sm active:scale-95 duration-200 ${
                                    row.status !== 'online'
                                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                      : 'bg-red-600 hover:bg-red-700 hover:shadow-md'
                                  }`}
                                >
                                  {row.deviceId && deviceControlLoading[row.deviceId] ? '...' : 'OFF'}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                  <button
                    onClick={() => setControlModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-all"
                  >
                    Tutup Panel
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ title, value, sub, icon, colorClass, iconBg, loading }: {
  title: string; value: string; sub: string; icon: React.ReactNode; colorClass: string; iconBg: string; loading: boolean
}) {
  return (
    <div className={`rounded-xl p-5 shadow-sm bg-white border border-slate-200 transition-all ${colorClass}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded ${iconBg}`}>
          {icon}
        </div>
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

function FacultyCard({ faculty: f, loading }: { faculty: FacultyCard; loading: boolean }) {
  const isSoon = f.mode === 'soon'
  return (
    <div
      className={`rounded-xl p-5 shadow-sm bg-white border border-slate-200 relative overflow-hidden transition-all ${
        !isSoon ? 'hover:shadow-md border-t-4' : 'border-t-4 border-t-slate-300 opacity-60'
      }`}
      style={!isSoon ? { borderTopColor: f.accentColor } : {}}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-3xl filter">{f.icon}</span>
        <span className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wider border ${
          !isSoon 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-slate-100 text-slate-500 border-slate-200'
        }`}>
          {!isSoon ? 'TERKONEKSI' : 'SEGERA'}
        </span>
      </div>
      
      <h3 className="text-slate-800 font-extrabold text-base mb-1.5 leading-tight">{f.name}</h3>
      
      {isSoon ? (
        <div className="mt-3">
          <p className="text-slate-400 text-xs font-semibold tracking-wider">{f.statusText}</p>
          <div className="mt-4 w-full py-2 bg-slate-50 border border-slate-200 text-slate-400 rounded text-center text-xs font-bold">
            Tahap Perencanaan
          </div>
        </div>
      ) : (
        <div>
          {loading ? (
            <div className="space-y-2 mt-3">
              <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-slate-100 rounded animate-pulse w-1/2" />
            </div>
          ) : (
            <div className="space-y-2 mt-3 text-xs text-slate-500">
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span>Total Daya Aktif</span>
                <span className="text-slate-900 font-extrabold">{f.totalPower.toFixed(2)} kW</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span>Rasio Perangkat Aktif</span>
                <span className="text-slate-800 font-semibold">{f.activeDevices} / {f.deviceCount} Alat</span>
              </div>
              <div className="flex justify-between pb-0.5">
                <span>Jumlah Ruang Kelas</span>
                <span className="text-slate-800 font-semibold">{f.rooms} Ruangan</span>
              </div>
            </div>
          )}
          <Link
            href={f.href}
            className="mt-4 w-full flex items-center justify-center space-x-1 py-2.5 rounded text-xs font-bold transition-all shadow-sm text-white hover:opacity-95"
            style={{ 
              backgroundColor: f.accentColor
            }}
          >
            <span>Buka Dashboard Monitor →</span>
          </Link>
        </div>
      )}
    </div>
  )
}

function CampusCard({ campus: c, isSelected, onClick }: { campus: any; isSelected: boolean; onClick: () => void }) {
  const isSoon = c.mode === 'soon'
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl p-5 shadow-sm bg-white border transition-all duration-300 relative overflow-hidden ${
        isSelected 
          ? 'ring-2 ring-[#0f2d59] border-transparent shadow-md transform scale-[1.02]' 
          : 'border-slate-200 hover:shadow-md hover:border-slate-300'
      } border-t-4`}
      style={{ borderTopColor: c.accentColor }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-3xl filter">{c.icon}</span>
        <span className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wider border ${
          !isSoon 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-slate-100 text-slate-500 border-slate-200'
        }`}>
          {!isSoon ? 'TERKONEKSI' : 'SEGERA'}
        </span>
      </div>
      
      <h3 className="text-slate-800 font-extrabold text-base mb-1.5 leading-tight">{c.name}</h3>
      
      {isSoon ? (
        <div className="mt-3">
          <p className="text-slate-400 text-xs font-semibold tracking-wider">INTEGRASI TAHAP II</p>
          <div className="mt-4 w-full py-2 bg-slate-50 border border-slate-200 text-slate-400 rounded text-center text-xs font-bold">
            Hubungkan Kampus
          </div>
        </div>
      ) : (
        <div>
          <div className="space-y-2 mt-3 text-xs text-slate-500">
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span>Total Daya Aktif</span>
              <span className="text-slate-900 font-extrabold">{c.totalPower.toFixed(2)} kW</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span>Rasio Perangkat Aktif</span>
              <span className="text-slate-800 font-semibold">{c.activeDevices} / {c.deviceCount} Alat</span>
            </div>
            <div className="flex justify-between pb-0.5">
              <span>Jumlah Ruang Kelas</span>
              <span className="text-slate-800 font-semibold">{c.rooms} Ruangan</span>
            </div>
          </div>
          <div className="mt-4 w-full flex items-center justify-center space-x-1 py-2 bg-[#0f2d59]/5 hover:bg-[#0f2d59]/10 text-[#0f2d59] rounded text-center text-xs font-bold transition-all">
            <span>{isSelected ? 'Tutup Detail ↑' : 'Buka Detail ↓'}</span>
          </div>
        </div>
      )}
    </button>
  )
}
