'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Zap, Activity, Gauge, Building2, ShieldCheck, Power, RefreshCw } from 'lucide-react'
import { devicesAPI, consumptionAPI, tenantsAPI, nodeRedControlAPI } from '@/lib/apiClient'
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

interface ChartDataPoint {
  time: string
  ac: number
  lamp: number
}

interface MonthlyTrendPoint {
  month: string
  ac: number
  lamp: number
  sensorTemp: number
  sensorHumidity: number
}

type EnergyRange = 'day' | 'week' | 'month'

const monthNamesMap: Record<string, string> = {
  Jan: 'Jan', Feb: 'Feb', Mar: 'Mar', Apr: 'Apr', May: 'Mei', Jun: 'Jun',
  Jul: 'Jul', Aug: 'Ags', Sep: 'Sep', Oct: 'Okt', Nov: 'Nov', Dec: 'Des',
}

// Ikon & label kontrol dikenal untuk tipe perangkat yang bisa dikendalikan lewat
// Node-RED (lamp/ac/projector). Tipe lain (mis. SENSOR) tidak ditampilkan tombolnya.
const CONTROLLABLE_TYPES: Record<string, { label: string; icon: string; controlType: 'lamp' | 'ac' | 'projector' }> = {
  AC: { label: 'AC', icon: '❄️', controlType: 'ac' },
  LAMP: { label: 'Lampu', icon: '💡', controlType: 'lamp' },
  PROJECTOR: { label: 'Proyektor', icon: '📽️', controlType: 'projector' },
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getConsumptionDate(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') {
    return value.includes('T') ? value.split('T')[0] : value.slice(0, 10)
  }
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? '' : formatLocalDate(date)
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map((item) => parseInt(item, 10))
  return new Date(year, month - 1, day)
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  next.setDate(next.getDate() + days)
  return next
}

function formatShortDate(value: string): string {
  return parseLocalDate(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function getIsoDay(date: Date): number {
  const day = date.getDay()
  return day === 0 ? 7 : day
}

function buildDateWindow(anchor: Date, days: number): string[] {
  const dates: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    dates.push(formatLocalDate(addDays(anchor, -i)))
  }
  return dates
}

function buildMonthWorkWeekPeriods(anchor: Date) {
  const monthIndex = anchor.getMonth()
  const firstDayOfMonth = new Date(anchor.getFullYear(), monthIndex, 1)
  const firstWeekMonday = addDays(firstDayOfMonth, -(getIsoDay(firstDayOfMonth) - 1))

  return Array.from({ length: 4 }, (_, index) => {
    const weekStart = addDays(firstWeekMonday, index * 7)
    const dates: string[] = []
    for (let offset = 0; offset < 4; offset++) {
      const current = addDays(weekStart, offset)
      if (current.getMonth() === monthIndex) {
        dates.push(formatLocalDate(current))
      }
    }
    return { label: `Minggu ke ${index + 1}`, dates }
  })
}

function formatMonthlyTrendSummary(summary: any[] = []): MonthlyTrendPoint[] {
  return summary.map((row: any) => {
    const [yearStr, monthStr] = String(row.month_key).split('-')
    const monthIndex = parseInt(monthStr, 10) - 1
    const monthLabel = new Date(parseInt(yearStr, 10), monthIndex, 1).toLocaleString('en-US', { month: 'short' })
    return {
      month: monthNamesMap[monthLabel] || monthLabel,
      ac: parseFloat(row.ac_total) || 0,
      lamp: parseFloat(row.lamp_total) || 0,
      sensorTemp: parseFloat(row.avg_temperature) || 0,
      sensorHumidity: parseFloat(row.avg_humidity) || 0,
    }
  })
}

function isDeviceOnline(d: Device) {
  const iot = String(d.iot_status || '').toLowerCase()
  const st = String(d.status || '').toLowerCase()
  return iot === 'online' || iot === 'active' || st === 'active' || st === 'idle'
}

const CustomTooltip = ({ active, payload, label, unit = 'kW' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-800 p-3.5 rounded-lg shadow-xl text-white">
        <p className="text-xs font-bold text-amber-400 mb-2 tracking-wider uppercase">{label}</p>
        <div className="space-y-1.5 text-xs font-semibold">
          {payload.map((pld: any) => (
            <div key={pld.name} className="flex items-center justify-between gap-6">
              <span className="flex items-center gap-1.5 text-slate-350">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pld.color || pld.stroke }} />
                {pld.name}
              </span>
              <span className="font-mono text-white text-right font-bold">
                {Number(pld.value).toFixed(2)} {unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

// Dashboard fakultas generik — dipakai untuk seluruh fakultas (bukan file per-fakultas).
// Menyamai kelengkapan dashboard Psikologi (tren konsumsi, grafik bulanan, kontrol
// ON/OFF per ruangan) namun sepenuhnya parametrik terhadap tenant/ruangan aktif,
// sehingga satu file ini melayani semua fakultas — hanya beda kode ruangan & datanya.
export default function FacultyDashboard() {
  const params = useParams<{ code: string }>()
  const code = String(params.code || '').toLowerCase()
  const router = useRouter()
  const { user, loading: authLoading, switchTenant } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [tenant, setTenant] = useState<TenantMeta | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRoom, setSelectedRoom] = useState('Semua')
  const [timeRange, setTimeRange] = useState<EnergyRange>('day')

  const isSuperadmin = user?.role === 'superadmin'
  const forbidden = !isSuperadmin && !!user?.tenant_code && user.tenant_code !== code

  useEffect(() => {
    if (authLoading) return
    if (forbidden) return
    switchTenant(code)
  }, [code, authLoading, forbidden, switchTenant])

  const loadDevices = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true)
    else setLoading(true)
    try {
      setError(null)
      const [tenantList, deviceList] = await Promise.all([
        tenantsAPI.getAll(),
        devicesAPI.getAll(),
      ])
      const meta = tenantList.find((t: TenantMeta) => t.code === code) || null
      setTenant(meta)
      setDevices(deviceList || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data fakultas')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (authLoading || forbidden) return
    loadDevices()
  }, [code, authLoading, forbidden])

  const rooms = useMemo(
    () => ['Semua', ...Array.from(new Set(devices.map((d) => d.location).filter(Boolean)))],
    [devices]
  )
  const filtered = useMemo(
    () => (selectedRoom === 'Semua' ? devices : devices.filter((d) => d.location === selectedRoom)),
    [devices, selectedRoom]
  )

  // ── Konsumsi historis (harian/mingguan/bulanan) — identik dengan logika Psikologi,
  // hanya classId-nya diambil dari ruangan tenant aktif, bukan hardcode.
  const [energyData, setEnergyData] = useState<ChartDataPoint[]>([])
  const [energyChartLabel, setEnergyChartLabel] = useState('7 HARI TERAKHIR')
  const [totalConsumption, setTotalConsumption] = useState(0)
  const [consumptionChange, setConsumptionChange] = useState(0)
  const [monthlyTrendData, setMonthlyTrendData] = useState<MonthlyTrendPoint[]>([])

  useEffect(() => {
    const loadConsumptionData = async () => {
      if (!devices || devices.length === 0) return
      try {
        const classId = selectedRoom === 'Semua'
          ? undefined
          : devices.find((item) => item.location === selectedRoom)?.class_id

        const fetchConsumptionRange = async (startDate: string, endDate: string) => {
          if (selectedRoom === 'Semua') {
            const classIds = [...new Set(devices.map((item) => item.class_id).filter(Boolean))]
            const perClassData = await Promise.all(
              classIds.map((id) => consumptionAPI.getByClass(id, startDate, endDate).catch(() => []))
            )
            return perClassData.flat()
          }
          return classId ? consumptionAPI.getByClass(classId, startDate, endDate) : []
        }

        const getRowValues = (row: any) => ({
          ac: Number(row.power_ac ?? (row.device_type === 'AC' ? row.consumption : 0)) || 0,
          lamp: Number(row.power_lamp ?? (row.device_type === 'LAMP' ? row.consumption : 0)) || 0,
        })

        if (timeRange === 'month') {
          const summary = await consumptionAPI.getMonthlyTrendSummary(6, classId)
          const monthlyData = formatMonthlyTrendSummary(summary || [])
          const total = monthlyData.reduce((sum, item) => sum + item.ac + item.lamp, 0)
          const currentMonthTotal = monthlyData.length > 0
            ? monthlyData[monthlyData.length - 1].ac + monthlyData[monthlyData.length - 1].lamp
            : 0
          const previousMonthTotal = monthlyData.length > 1
            ? monthlyData[monthlyData.length - 2].ac + monthlyData[monthlyData.length - 2].lamp
            : 0

          setEnergyChartLabel('6 BULAN TERAKHIR')
          setTotalConsumption(total)
          setConsumptionChange(previousMonthTotal > 0 ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100 : 0)
          setEnergyData(monthlyData.map((item) => ({
            time: item.month,
            ac: Math.round(item.ac * 100) / 100,
            lamp: Math.round(item.lamp * 100) / 100,
          })))
          return
        }

        const today = new Date()

        if (timeRange === 'week') {
          const currentPeriods = buildMonthWorkWeekPeriods(today)
          const previousPeriods = buildMonthWorkWeekPeriods(new Date(today.getFullYear(), today.getMonth() - 1, 1))
          const allPeriodDates = [...currentPeriods, ...previousPeriods].flatMap((period) => period.dates)
          const startDateStr = allPeriodDates.sort()[0]
          const endDateStr = allPeriodDates.sort()[allPeriodDates.length - 1]
          const rawData = startDateStr && endDateStr ? await fetchConsumptionRange(startDateStr, endDateStr) : []
          const weeklyChartMap = new Map<string, { time: string; ac: number; lamp: number }>()
          const currentDateToWeekLabel = new Map<string, string>()
          const previousDateSet = new Set(previousPeriods.flatMap((period) => period.dates))

          currentPeriods.forEach((period) => {
            weeklyChartMap.set(period.label, { time: period.label, ac: 0, lamp: 0 })
            period.dates.forEach((date) => currentDateToWeekLabel.set(date, period.label))
          })

          let currentAcTotal = 0, currentLampTotal = 0, previousAcTotal = 0, previousLampTotal = 0

          rawData.forEach((row: any) => {
            const rowDate = getConsumptionDate(row.consumption_date)
            const values = getRowValues(row)
            const currentWeekLabel = currentDateToWeekLabel.get(rowDate)
            if (currentWeekLabel) {
              currentAcTotal += values.ac
              currentLampTotal += values.lamp
              const entry = weeklyChartMap.get(currentWeekLabel) || { time: currentWeekLabel, ac: 0, lamp: 0 }
              entry.ac += values.ac
              entry.lamp += values.lamp
              weeklyChartMap.set(currentWeekLabel, entry)
            } else if (previousDateSet.has(rowDate)) {
              previousAcTotal += values.ac
              previousLampTotal += values.lamp
            }
          })

          const currentSum = currentAcTotal + currentLampTotal
          const prevSum = previousAcTotal + previousLampTotal

          setEnergyChartLabel('MINGGU KE 1 SAMPAI KE 4 BULAN INI')
          setTotalConsumption(currentSum)
          setConsumptionChange(prevSum > 0 ? ((currentSum - prevSum) / prevSum) * 100 : 0)
          setEnergyData([...weeklyChartMap.values()].map((item) => ({
            time: item.time,
            ac: Math.round(item.ac * 100) / 100,
            lamp: Math.round(item.lamp * 100) / 100,
          })))
          return
        }

        {
          const currentPeriodDates = buildDateWindow(today, 7)
          const previousPeriodDates = buildDateWindow(addDays(today, -7), 7)
          const rawData = await fetchConsumptionRange(previousPeriodDates[0], currentPeriodDates[currentPeriodDates.length - 1])
          const dailyChartMap = new Map<string, { time: string; ac: number; lamp: number }>()
          const currentDateSet = new Set(currentPeriodDates)
          const previousDateSet = new Set(previousPeriodDates)
          let currentAcTotal = 0, currentLampTotal = 0, previousAcTotal = 0, previousLampTotal = 0

          currentPeriodDates.forEach((date) => {
            dailyChartMap.set(date, { time: formatShortDate(date), ac: 0, lamp: 0 })
          })

          rawData.forEach((row: any) => {
            const rowDate = getConsumptionDate(row.consumption_date)
            const values = getRowValues(row)
            if (currentDateSet.has(rowDate)) {
              currentAcTotal += values.ac
              currentLampTotal += values.lamp
              const entry = dailyChartMap.get(rowDate) || { time: rowDate, ac: 0, lamp: 0 }
              entry.ac += values.ac
              entry.lamp += values.lamp
              dailyChartMap.set(rowDate, entry)
            } else if (previousDateSet.has(rowDate)) {
              previousAcTotal += values.ac
              previousLampTotal += values.lamp
            }
          })

          const currentSum = currentAcTotal + currentLampTotal
          const prevSum = previousAcTotal + previousLampTotal

          setTotalConsumption(currentSum)
          setConsumptionChange(prevSum > 0 ? ((currentSum - prevSum) / prevSum) * 100 : 0)
          setEnergyChartLabel('7 HARI TERAKHIR')
          setEnergyData([...dailyChartMap.values()].map((item) => ({
            time: item.time,
            ac: Math.round(item.ac * 100) / 100,
            lamp: Math.round(item.lamp * 100) / 100,
          })))
        }
      } catch (err) {
        console.error('Error loading consumption data:', err)
      }
    }

    loadConsumptionData()
  }, [devices, selectedRoom, timeRange])

  useEffect(() => {
    const fetchMonthlyTrend = async () => {
      try {
        const classId = selectedRoom === 'Semua'
          ? undefined
          : devices.find((d) => d.location === selectedRoom)?.class_id
        const summary = await consumptionAPI.getMonthlyTrendSummary(6, classId)
        setMonthlyTrendData(formatMonthlyTrendSummary(summary || []))
      } catch (e) {
        console.warn('Could not load monthly trend:', e)
      }
    }
    fetchMonthlyTrend()
  }, [devices, selectedRoom])

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

  // ── Kontrol ON/OFF per perangkat & per tipe perangkat (ruangan) ──
  const [controlLoading, setControlLoading] = useState<Record<string, boolean>>({})

  const handleDeviceControl = async (deviceId: number, currentStatus: string) => {
    const action = currentStatus === 'active' || currentStatus === 'online' ? 'off' : 'on'
    const key = `device-${deviceId}`
    try {
      setControlLoading((prev) => ({ ...prev, [key]: true }))
      await devicesAPI.control(deviceId, action)
      await loadDevices(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mengontrol perangkat')
    } finally {
      setControlLoading((prev) => ({ ...prev, [key]: false }))
    }
  }

  const handleRoomTypeControl = async (room: string, controlType: 'lamp' | 'ac' | 'projector', action: 'on' | 'off') => {
    const key = `${room}-${controlType}-${action}`
    try {
      setControlLoading((prev) => ({ ...prev, [key]: true }))
      if (controlType === 'lamp') await nodeRedControlAPI.controlLamp(room, action)
      else if (controlType === 'ac') await nodeRedControlAPI.controlAC(room, action)
      else await nodeRedControlAPI.controlProjector(room, action)

      const targetDbStatus = action === 'on' ? 'active' : 'idle'
      const typeKey = Object.entries(CONTROLLABLE_TYPES).find(([, v]) => v.controlType === controlType)?.[0]
      const matched = devices.filter((d) => d.location === room && d.device_type === typeKey)
      await Promise.all(matched.map((d) => devicesAPI.updateStatus(d.id, targetDbStatus)))
      await loadDevices(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : `Gagal mengontrol ${controlType} di ${room}`)
    } finally {
      setControlLoading((prev) => ({ ...prev, [key]: false }))
    }
  }

  // Kontrol unit individual — dipakai ruangan dengan >1 perangkat per tipe
  // (mis. FISIPOL: 2 AC + 2 Lampu per ruangan). Unit ditentukan dari urutan
  // device_eui (…-001 = unit 1, …-002 = unit 2), sama seperti backend.
  const handleUnitControl = async (room: string, type: 'ac' | 'lamp', unit: 1 | 2, action: 'on' | 'off') => {
    const key = `${room}-${type}${unit}-${action}`
    try {
      setControlLoading((prev) => ({ ...prev, [key]: true }))
      if (type === 'ac') await nodeRedControlAPI.controlAcUnit(room, unit, action)
      else await nodeRedControlAPI.controlLampUnit(room, unit, action)

      const targetDbStatus = action === 'on' ? 'active' : 'idle'
      const typeKey = type === 'ac' ? 'AC' : 'LAMP'
      const sorted = devices
        .filter((d) => d.location === room && d.device_type === typeKey)
        .sort((a, b) => a.device_eui.localeCompare(b.device_eui))
      const target = sorted[unit - 1]
      if (target) await devicesAPI.updateStatus(target.id, targetDbStatus)
      await loadDevices(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : `Gagal mengontrol ${type.toUpperCase()} unit ${unit} di ${room}`)
    } finally {
      setControlLoading((prev) => ({ ...prev, [key]: false }))
    }
  }

  // Master control — menyalakan/mematikan SEMUA tipe perangkat yang bisa
  // dikendalikan di satu ruangan sekaligus (mis. AC + Lampu bareng).
  const handleAllControl = async (room: string, action: 'on' | 'off') => {
    const key = `${room}-all-${action}`
    try {
      setControlLoading((prev) => ({ ...prev, [key]: true }))
      const roomDevices = devices.filter((d) => d.location === room)
      const typesPresent = Array.from(new Set(roomDevices.map((d) => d.device_type))).filter((t) => CONTROLLABLE_TYPES[t])

      await Promise.all(typesPresent.map((t) => {
        const controlType = CONTROLLABLE_TYPES[t].controlType
        if (controlType === 'lamp') return nodeRedControlAPI.controlLamp(room, action)
        if (controlType === 'ac') return nodeRedControlAPI.controlAC(room, action)
        return nodeRedControlAPI.controlProjector(room, action)
      }))

      const targetDbStatus = action === 'on' ? 'active' : 'idle'
      const matched = roomDevices.filter((d) => CONTROLLABLE_TYPES[d.device_type])
      await Promise.all(matched.map((d) => devicesAPI.updateStatus(d.id, targetDbStatus)))
      await loadDevices(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : `Gagal mengontrol semua perangkat di ${room}`)
    } finally {
      setControlLoading((prev) => ({ ...prev, [key]: false }))
    }
  }

  const controlRooms = useMemo(
    () => rooms.filter((r) => r !== 'Semua' && (selectedRoom === 'Semua' || r === selectedRoom)),
    [rooms, selectedRoom]
  )

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

  if (loading) {
    return (
      <div className="flex h-screen bg-[#0f2d59] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#d8ae47] mx-auto mb-6" />
          <p className="text-white font-bold tracking-wider animate-pulse">MEMUAT DASHBOARD ENERGI...</p>
        </div>
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
        <DashboardHeader
          title={title}
          badge={tenant?.campus || undefined}
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto px-6 py-8 space-y-6 max-w-[1600px] w-full mx-auto">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-red-800 text-sm flex items-center space-x-3 shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {tenant?.campus && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <Building2 size={14} />
                <span>{tenant.campus}</span>
              </div>
              <button
                onClick={() => loadDevices(true)}
                disabled={refreshing}
                className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[#0f2d59] transition-all disabled:opacity-50 shadow-sm"
                title="Refresh Data"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          )}

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
              {/* Total Consumption Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-teal-50 text-teal-700 rounded-lg">
                    <Zap size={24} />
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Konsumsi {tenant?.name || ''}</p>
                    <h3 className="text-2xl font-extrabold text-[#0f2d59] mt-0.5">
                      {totalConsumption.toFixed(2)} <span className="text-sm font-bold text-slate-400">kWh</span>
                    </h3>
                    <span className={`text-xs font-bold inline-flex items-center px-2 py-0.5 rounded-full mt-1.5 ${
                      consumptionChange <= 0
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                        : 'bg-rose-50 text-rose-800 border border-rose-100'
                    }`}>
                      {consumptionChange <= 0 ? '↓' : '↑'} {Math.abs(consumptionChange).toFixed(1)}% vs {
                        timeRange === 'day' ? '7 hari sebelumnya' : timeRange === 'week' ? 'bulan sebelumnya (Senin-Kamis)' : 'bulan sebelumnya'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Pilih Ruangan */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pilih Ruangan</span>
                  <div className="flex flex-wrap gap-1.5">
                    {rooms.map((r) => (
                      <button
                        key={r}
                        onClick={() => setSelectedRoom(r)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          selectedRoom === r
                            ? 'bg-[#0f2d59] text-white border-[#d8ae47]/30 shadow-md'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* KPI Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="AC — Daya Saat Ini" value={`${stats.acPower.toFixed(2)} kW`} icon={<Zap className="text-orange-500" size={20} />} />
                <KpiCard title="Lampu — Daya Saat Ini" value={`${stats.lampPower.toFixed(2)} kW`} icon={<Zap className="text-yellow-500" size={20} />} />
                <KpiCard title="Suhu Rata-rata" value={stats.avgTemp !== '—' ? `${stats.avgTemp}°C` : '—'} icon={<Gauge className="text-teal-500" size={20} />} />
                <KpiCard title="Perangkat Aktif" value={`${stats.onlineCount} / ${stats.totalCount}`} icon={<Activity className="text-purple-500" size={20} />} />
              </div>

              {/* Graphs Area */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col hover:shadow-md transition-all duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 tracking-wider uppercase">
                        KONSUMSI DAYA AC & LAMPU ({energyChartLabel})
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {timeRange === 'week' ? 'Akumulasi Senin-Kamis per minggu di bulan berjalan' : 'Grafik perbandingan beban energi sektoral'}
                      </p>
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-center">
                      {[
                        { key: 'day' as const, label: 'Hari' },
                        { key: 'week' as const, label: 'Minggu' },
                        { key: 'month' as const, label: 'Bulan' },
                      ].map((range) => (
                        <button
                          key={range.key}
                          onClick={() => setTimeRange(range.key)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            timeRange === range.key ? 'bg-[#0f2d59] text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 w-full min-h-[280px]">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={energyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="time" stroke="#475569" fontSize={11} fontWeight={600} tickLine={false} />
                        <YAxis stroke="#475569" fontSize={11} fontWeight={600} tickLine={false} unit=" kWh" />
                        <Tooltip content={<CustomTooltip unit="kWh" />} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10, fontWeight: 700 }} />
                        <Bar dataKey="ac" fill="#d8ae47" radius={[4, 4, 0, 0]} name="Air Conditioner" />
                        <Bar dataKey="lamp" fill="#483688" radius={[4, 4, 0, 0]} name="Lighting System" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col hover:shadow-md transition-all duration-300">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-800 tracking-wider uppercase">TREN BULANAN AKUMULATIF</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Akumulasi penggunaan energi 6 bulan terakhir (kWh)</p>
                  </div>
                  <div className="flex-1 w-full min-h-[280px]">
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={monthlyTrendData}>
                        <defs>
                          <linearGradient id="colorAc" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#d8ae47" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#d8ae47" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorLamp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#483688" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#483688" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="month" stroke="#475569" fontSize={11} fontWeight={600} tickLine={false} />
                        <YAxis stroke="#475569" fontSize={11} fontWeight={600} tickLine={false} unit=" kWh" />
                        <Tooltip content={<CustomTooltip unit="kWh" />} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10, fontWeight: 700 }} />
                        <Area type="monotone" dataKey="ac" stroke="#d8ae47" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAc)" name="Total AC" />
                        <Area type="monotone" dataKey="lamp" stroke="#483688" strokeWidth={2.5} fillOpacity={1} fill="url(#colorLamp)" name="Total Lampu" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Kontrol ON/OFF per Ruangan */}
              {controlRooms.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-800 tracking-wider uppercase">🕹️ KONTROL ON/OFF {tenant?.name || ''}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Nyalakan/matikan perangkat per tipe di setiap ruangan</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {controlRooms.map((room) => {
                      const roomDevices = devices.filter((d) => d.location === room)
                      const isAnyActive = roomDevices.some((d) => d.status === 'active' || d.status === 'online')
                      const typesPresent = Array.from(new Set(roomDevices.map((d) => d.device_type))).filter((t) => CONTROLLABLE_TYPES[t])

                      return (
                        <div key={room} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-300">
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                            <div>
                              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">{room}</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{roomDevices.length} Perangkat Terdaftar</p>
                            </div>
                            <span className={`inline-flex items-center w-2.5 h-2.5 rounded-full ${isAnyActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                          </div>
                          <div className="space-y-2">
                            {typesPresent.length === 0 && (
                              <p className="text-[10px] text-slate-400 text-center py-2">Tidak ada perangkat yang bisa dikendalikan</p>
                            )}
                            {typesPresent.map((typeKey) => {
                              const meta = CONTROLLABLE_TYPES[typeKey]
                              const unitDevices = roomDevices
                                .filter((d) => d.device_type === typeKey)
                                .sort((a, b) => a.device_eui.localeCompare(b.device_eui))
                              const hasTwoUnits = (meta.controlType === 'ac' || meta.controlType === 'lamp') && unitDevices.length >= 2

                              if (!hasTwoUnits) {
                                const onKey = `${room}-${meta.controlType}-on`
                                const offKey = `${room}-${meta.controlType}-off`
                                return (
                                  <ControlRow
                                    key={typeKey}
                                    icon={meta.icon}
                                    label={meta.label}
                                    onLoading={controlLoading[onKey]}
                                    offLoading={controlLoading[offKey]}
                                    onClickOn={() => handleRoomTypeControl(room, meta.controlType, 'on')}
                                    onClickOff={() => handleRoomTypeControl(room, meta.controlType, 'off')}
                                  />
                                )
                              }

                              const unitType = meta.controlType as 'ac' | 'lamp'
                              const bothOnKey = `${room}-${unitType}-on`
                              const bothOffKey = `${room}-${unitType}-off`
                              return (
                                <div key={typeKey} className="space-y-1.5 rounded-lg bg-slate-50 border border-slate-100 p-2">
                                  <ControlRow
                                    compact
                                    icon={meta.icon}
                                    label={`${meta.label} 1`}
                                    onLoading={controlLoading[`${room}-${unitType}1-on`]}
                                    offLoading={controlLoading[`${room}-${unitType}1-off`]}
                                    onClickOn={() => handleUnitControl(room, unitType, 1, 'on')}
                                    onClickOff={() => handleUnitControl(room, unitType, 1, 'off')}
                                  />
                                  <ControlRow
                                    compact
                                    icon={meta.icon}
                                    label={`${meta.label} 2`}
                                    onLoading={controlLoading[`${room}-${unitType}2-on`]}
                                    offLoading={controlLoading[`${room}-${unitType}2-off`]}
                                    onClickOn={() => handleUnitControl(room, unitType, 2, 'on')}
                                    onClickOff={() => handleUnitControl(room, unitType, 2, 'off')}
                                  />
                                  <ControlRow
                                    compact
                                    icon={meta.icon}
                                    label={`${meta.label} (Keduanya)`}
                                    bold
                                    onLoading={controlLoading[bothOnKey]}
                                    offLoading={controlLoading[bothOffKey]}
                                    onClickOn={() => handleRoomTypeControl(room, unitType, 'on')}
                                    onClickOff={() => handleRoomTypeControl(room, unitType, 'off')}
                                  />
                                </div>
                              )
                            })}
                            {typesPresent.length >= 2 && (
                              <ControlRow
                                icon="🔌"
                                label="Semua Perangkat"
                                bold
                                onLoading={controlLoading[`${room}-all-on`]}
                                offLoading={controlLoading[`${room}-all-off`]}
                                onClickOn={() => handleAllControl(room, 'on')}
                                onClickOff={() => handleAllControl(room, 'off')}
                              />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Device Status Table */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm overflow-hidden">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-slate-800 tracking-wider uppercase">DAFTAR STATUS PERANGKAT TERKONEKSI</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Daftar live telemetri status daya dan suhu perangkat</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                        <th className="pb-3 px-4 pt-3">Ruangan</th>
                        <th className="pb-3 px-4 pt-3">Nama Perangkat</th>
                        <th className="pb-3 px-4 pt-3">Tipe</th>
                        <th className="pb-3 px-4 pt-3 text-right">Daya Aktif (kW)</th>
                        <th className="pb-3 px-4 pt-3 text-right">Suhu (°C)</th>
                        <th className="pb-3 px-4 pt-3">Device EUI</th>
                        <th className="pb-3 px-4 pt-3">Status</th>
                        <th className="pb-3 px-4 pt-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                      {filtered.map((device) => {
                        const online = isDeviceOnline(device)
                        const active = device.status === 'active' || device.status === 'online'
                        const livePower = active
                          ? (parseFloat(String(device.current_power)) || parseFloat(String(device.power_rating)) || 0)
                          : 0
                        const controllable = !!CONTROLLABLE_TYPES[device.device_type]
                        const deviceKey = `device-${device.id}`

                        return (
                          <tr key={device.id} className="hover:bg-slate-50/50 transition-all odd:bg-white even:bg-slate-50/20">
                            <td className="py-3.5 px-4 font-bold text-slate-900">{device.location}</td>
                            <td className="py-3.5 px-4 text-slate-600">{device.device_name}</td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                                device.device_type === 'AC'
                                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                                  : device.device_type === 'LAMP'
                                    ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                    : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                              }`}>
                                {device.device_type}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">{livePower.toFixed(2)} kW</td>
                            <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                              {device.current_temperature && parseFloat(String(device.current_temperature)) > 0
                                ? `${parseFloat(String(device.current_temperature)).toFixed(1)}°C`
                                : '—'}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-400 text-[10px]">{device.device_eui}</td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                online ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'}`} />
                                {online ? 'Online' : 'Offline'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {controllable && (
                                <button
                                  onClick={() => handleDeviceControl(device.id, device.status || 'offline')}
                                  disabled={controlLoading[deviceKey]}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black border transition-all disabled:opacity-50 ${
                                    active
                                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                  }`}
                                >
                                  <Power size={11} />
                                  {controlLoading[deviceKey] ? '...' : active ? 'MATIKAN' : 'NYALAKAN'}
                                </button>
                              )}
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

function ControlRow({
  icon, label, onLoading, offLoading, onClickOn, onClickOff, compact, bold,
}: {
  icon: string
  label: string
  onLoading?: boolean
  offLoading?: boolean
  onClickOn: () => void
  onClickOff: () => void
  compact?: boolean
  bold?: boolean
}) {
  return (
    <div className={`flex items-center justify-between rounded-lg px-3 py-2 border ${bold ? 'bg-white border-slate-200' : compact ? 'bg-white border-slate-100' : 'bg-slate-50 border-slate-100'}`}>
      <div className="flex items-center space-x-2">
        <span className="text-sm">{icon}</span>
        <span className={`text-[10px] font-bold uppercase tracking-wider ${bold ? 'text-slate-900' : 'text-slate-700'}`}>{label}</span>
      </div>
      <div className="flex items-center space-x-1.5">
        <button
          onClick={onClickOn}
          disabled={onLoading}
          className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-all text-center disabled:opacity-50"
        >
          {onLoading ? '...' : 'ON'}
        </button>
        <button
          onClick={onClickOff}
          disabled={offLoading}
          className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-all text-center disabled:opacity-50"
        >
          {offLoading ? '...' : 'OFF'}
        </button>
      </div>
    </div>
  )
}

function KpiCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-extrabold text-slate-900 leading-none">{value}</p>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg border border-slate-100 flex items-center justify-center">{icon}</div>
      </div>
    </div>
  )
}
