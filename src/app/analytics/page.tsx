'use client'

import { useMemo, useEffect, useState } from 'react'
import { Gauge, Zap, AlertCircle } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { devicesAPI, consumptionAPI } from '@/lib/apiClient'
import Sidebar from '@/components/Sidebar'
import DashboardHeader from '@/components/DashboardHeader'

interface Device {
  id: number
  class_id: number
  location: string
  device_name: string
  device_type: string
  current_power: number
}

interface MonthlyPoint {
  month: string
  ac: number
  lamp: number
}

interface DailyPoint {
  day: string
  ac: number
  lamp: number
}

export default function AnalyticsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedClass, setSelectedClass] = useState('All')
  const [timeRange, setTimeRange] = useState('30d')
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState(['All'])
  const [monthlyData, setMonthlyData] = useState<MonthlyPoint[]>([])
  const [dailyTrends, setDailyTrends] = useState<DailyPoint[]>([])
  const [deviceComparison, setDeviceComparison] = useState<any[]>([])

  useEffect(() => {
    const loadDevices = async () => {
      try {
        setLoading(true)
        const devicesData = await devicesAPI.getAll()
        const list = (devicesData || []) as Device[]
        setDevices(list)

        if (list.length > 0) {
          const uniqueClasses = ['All', ...new Set(list.map((item) => item.location))]
          setClasses(uniqueClasses)
        }
      } catch (error) {
        console.error('Error loading devices:', error)
        setDevices([])
      } finally {
        setLoading(false)
      }
    }

    loadDevices()
  }, [])

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!devices.length) {
        setMonthlyData(buildMonthlySeries([], 6))
        setDailyTrends([])
        setDeviceComparison([])
        return
      }

      try {
        const classId = selectedClass === 'All'
          ? undefined
          : devices.find((item) => item.location === selectedClass)?.class_id

        const summary = await consumptionAPI.getMonthlyTrendSummary(6, classId)
        setMonthlyData(buildMonthlySeries(summary || [], 6))

        const today = getLocalIsoDate()
        const rangeDays = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
        const startDate = shiftDateByDays(today, rangeDays - 1)

        if (classId) {
          const classRows = await consumptionAPI.getByClass(classId, startDate, today)
          setDailyTrends(buildDailyFromClassRows(classRows || [], startDate, today))

          const totals = await consumptionAPI.getTotalByClass(classId, startDate, today)
          setDeviceComparison((totals || []).map((item: any) => ({
            device: item.device_name,
            efficiency: Math.round((90 - Math.min(40, Number(item.avg_consumption || 0) * 2)) * 10) / 10,
            consumption: Number(item.total_consumption || 0),
          })))
        } else {
          const classIds = [...new Set(devices.map((item) => item.class_id))]
          const perClassRows = await Promise.all(
            classIds.map((id) => consumptionAPI.getByClass(id, startDate, today).catch(() => []))
          )
          setDailyTrends(buildDailyFromClassRows(perClassRows.flat(), startDate, today))

          const locationTotals = new Map<string, number>()
          devices.forEach((item) => {
            locationTotals.set(item.location, (locationTotals.get(item.location) || 0) + Number(item.current_power || 0))
          })
          setDeviceComparison(
            [...locationTotals.entries()].map(([device, consumption]) => ({
              device,
              efficiency: Math.round((90 - Math.min(40, consumption * 2)) * 10) / 10,
              consumption,
            }))
          )
        }
      } catch (error) {
        console.error('Error loading analytics:', error)
        setMonthlyData(buildMonthlySeries([], 6))
        setDailyTrends([])
        setDeviceComparison([])
      }
    }

    loadAnalytics()
  }, [devices, selectedClass, timeRange])

  const latestMonth = useMemo(() => {
    return monthlyData.length ? monthlyData[monthlyData.length - 1] : { ac: 0, lamp: 0 }
  }, [monthlyData])

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data analitik...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50" style={{
      backgroundImage: 'url(/assets/bg_image.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      <div className="absolute inset-0 bg-white/40 pointer-events-none"></div>

      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <DashboardHeader title="Dashboard Analitik" sidebarOpen={sidebarOpen} onOpenSidebar={() => setSidebarOpen(true)} />

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto relative z-10">
          {/* Clean Modern Filter Card */}
          <div className="mx-8 mt-6 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Kelas:</span>
              <div className="flex flex-wrap gap-1.5">
                {classes.map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                      selectedClass === cls
                        ? 'bg-[#0f2d59] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded border border-slate-200">
              {['7d', '30d', '90d'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    timeRange === range
                      ? 'bg-[#0f2d59] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <AnalyticsCard title="AC Konsumsi Bulan Ini" value={`${latestMonth.ac.toFixed(2)} kWh`} change="Dinamis" icon={<Zap className="text-orange-500" />} />
              <AnalyticsCard title="Lampu Konsumsi Bulan Ini" value={`${latestMonth.lamp.toFixed(2)} kWh`} change="Dinamis" icon={<Gauge className="text-blue-500" />} />
              <AnalyticsCard title="Konsumen Teratas" value={deviceComparison[0]?.device || '-'} change={`${(deviceComparison[0]?.consumption || 0).toFixed(2)} kWh`} icon={<AlertCircle className="text-teal-500" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Tren Konsumsi Bulanan</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                    <Legend />
                    <Line type="monotone" dataKey="ac" stroke="#d8ae47" strokeWidth={2} name="AC (kWh)" />
                    <Line type="monotone" dataKey="lamp" stroke="#483688" strokeWidth={2} name="Lampu (kWh)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Puncak Penggunaan Harian</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" stroke="#6b7280" minTickGap={18} />
                    <YAxis stroke="#6b7280" />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                    <Legend />
                    <Bar dataKey="ac" fill="#d8ae47" name="AC (kWh)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="lamp" fill="#483688" name="Lampu (kWh)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Konsumen Energi Teratas</h3>
              <div className="space-y-3">
                {deviceComparison
                  .slice()
                  .sort((a, b) => b.consumption - a.consumption)
                  .map((device, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-slate-100">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{device.device}</p>
                        <p className="text-xs text-gray-500">{Number(device.consumption || 0).toFixed(2)} kWh</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{Number(device.efficiency || 0).toFixed(1)}%</p>
                        <p className="text-[10px] text-gray-500 font-bold">Efisiensi</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function AnalyticsCard({ title, value, change, icon }: any) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title}</p>
          <p className="text-xl font-black text-slate-800 mt-1">{value}</p>
          <p className="text-[10px] text-green-600 font-bold mt-1">{change}</p>
        </div>
        <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">{icon}</div>
      </div>
    </div>
  )
}

function getLocalIsoDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseLocalDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function shiftDateByDays(date: string, daysBack: number) {
  const d = parseLocalDate(date)
  d.setDate(d.getDate() - daysBack)
  return getLocalIsoDate(d)
}

function normalizeDateKey(value: any) {
  if (!value) return ''

  if (value instanceof Date) {
    return getLocalIsoDate(value)
  }

  const text = String(value)
  const isoMatch = text.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoMatch) {
    return isoMatch[1]
  }

  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? '' : getLocalIsoDate(parsed)
}

function formatShortDate(date: string) {
  return parseLocalDate(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  })
}

function buildMonthlySeries(apiRows: any[], months: number): MonthlyPoint[] {
  const monthMap: Record<string, { ac: number; lamp: number }> = {}

  ;(apiRows || []).forEach((row) => {
    if (!row?.month_key) return
    const [yearStr, monthStr] = String(row.month_key).split('-')
    const year = parseInt(yearStr, 10)
    const monthIndex = parseInt(monthStr, 10) - 1
    if (Number.isNaN(year) || Number.isNaN(monthIndex)) return

    const monthLabel = new Date(year, monthIndex, 1).toLocaleString('en-US', { month: 'short' })
    monthMap[monthLabel] = {
      ac: Number(row.ac_total || 0),
      lamp: Number(row.lamp_total || 0),
    }
  })

  const now = new Date()
  const series: MonthlyPoint[] = []
  for (let i = months - 1; i >= 0; i--) {
    const current = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const month = current.toLocaleString('en-US', { month: 'short' })
    series.push({ month, ac: monthMap[month]?.ac || 0, lamp: monthMap[month]?.lamp || 0 })
  }

  return series
}

function buildDailyFromClassRows(apiRows: any[], startDate: string, endDate: string): DailyPoint[] {
  const totals: Record<string, { ac: number; lamp: number }> = {}

  ;(apiRows || []).forEach((row) => {
    const dateKey = normalizeDateKey(row.consumption_date || row.date)
    if (!dateKey) return

    if (!totals[dateKey]) {
      totals[dateKey] = { ac: 0, lamp: 0 }
    }

    const deviceType = String(row.device_type || '').toUpperCase()
    totals[dateKey].ac += row.power_ac !== null && row.power_ac !== undefined
      ? Number(row.power_ac || 0)
      : deviceType === 'AC'
        ? Number(row.consumption || 0)
        : 0
    totals[dateKey].lamp += row.power_lamp !== null && row.power_lamp !== undefined
      ? Number(row.power_lamp || 0)
      : deviceType === 'LAMP' || deviceType === 'LIGHT' || deviceType === 'LIGHTING'
        ? Number(row.consumption || 0)
        : 0
  })

  const series: DailyPoint[] = []
  const cursor = parseLocalDate(startDate)
  const lastDate = parseLocalDate(endDate)

  while (cursor <= lastDate) {
    const dateKey = getLocalIsoDate(cursor)
    series.push({
      day: formatShortDate(dateKey),
      ac: totals[dateKey]?.ac || 0,
      lamp: totals[dateKey]?.lamp || 0,
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  return series
}
