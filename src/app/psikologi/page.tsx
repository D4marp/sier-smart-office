'use client'

import { 
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer
} from 'recharts'
import { 
  Zap, Settings, LogOut, Menu, 
  Activity, Clock, Building2, Power, RefreshCw
} from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { devicesAPI, consumptionAPI, nodeRedControlAPI } from '@/lib/apiClient'
import { useAuth } from '@/components/AuthProvider'

interface Device {
  id: number
  class_id: number
  device_eui: string
  device_name: string
  device_type: string
  application_type: string
  location: string
  current_power: number
  current_temperature: number
  iot_status: string
  status?: string
  power_rating?: number
}

interface ChartDataPoint {
  time: string
  ac: number
  lamp: number
}

function isDeviceOnline(device: Device): boolean {
  const iot = String(device.iot_status || '').toLowerCase()
  const status = String(device.status || '').toLowerCase()
  return iot === 'online' || iot === 'active' || status === 'active' || status === 'idle'
}

// Custom Tooltip for Recharts
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

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [timeRange, setTimeRange] = useState('24h')
  const [selectedClass, setSelectedClass] = useState('All')
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Real aggregated energy states
  const [energyData, setEnergyData] = useState<ChartDataPoint[]>([])
  const [totalConsumption, setTotalConsumption] = useState(0)
  const [consumptionChange, setConsumptionChange] = useState(0)
  
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [now, setNow] = useState(new Date())

  // Clock effect
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Extract unique classes from devices
  const classes = useMemo(() => {
    if (!devices || devices.length === 0) return ['All']
    const unique = Array.from(new Set(devices.map((d) => d.location)))
    return ['All', ...unique]
  }, [devices])

  // Load devices list from backend
  const loadDevices = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) setRefreshing(true)
      else setLoading(true)
      
      const devicesData = await devicesAPI.getAll()
      setDevices(devicesData || [])
      setError(null)
    } catch (err) {
      console.error('Error loading devices:', err)
      setError(err instanceof Error ? err.message : 'Failed to load devices')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadDevices()
  }, [])

  // Fetch and aggregate consumption data based on selected range and class
  useEffect(() => {
    const loadConsumptionData = async () => {
      if (!devices || devices.length === 0) return
      
      try {
        // Define day offsets based on timeRange
        const rangeDays = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30
        const totalDaysToFetch = rangeDays * 2 // we fetch double the range to calculate comparison
        
        const today = new Date()
        const startDate = new Date()
        startDate.setDate(today.getDate() - (totalDaysToFetch - 1))
        
        const startDateStr = startDate.toISOString().split('T')[0]
        const todayStr = today.toISOString().split('T')[0]
        
        // Fetch raw data
        let rawData: any[] = []
        if (selectedClass === 'All') {
          const classIds = [...new Set(devices.map((item) => item.class_id))]
          const perClassData = await Promise.all(
            classIds.map((id) => consumptionAPI.getByClass(id, startDateStr, todayStr).catch(() => []))
          )
          rawData = perClassData.flat()
        } else {
          const classId = devices.find((item) => item.location === selectedClass)?.class_id
          if (classId) {
            rawData = await consumptionAPI.getByClass(classId, startDateStr, todayStr)
          }
        }
        
        // Generate list of dates for current and previous periods
        const allDates: string[] = []
        for (let i = totalDaysToFetch - 1; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
          allDates.push(d.toISOString().split('T')[0])
        }
        
        const previousPeriodDates = allDates.slice(0, rangeDays)
        const currentPeriodDates = allDates.slice(rangeDays)
        
        let currentAcTotal = 0
        let currentLampTotal = 0
        let previousAcTotal = 0
        let previousLampTotal = 0
        
        if (timeRange === '24h') {
          // Current period: todayStr, previous period: yesterdayStr
          const todayStrLocal = currentPeriodDates[0]
          const yesterdayStrLocal = previousPeriodDates[0]
          
          // Initialize hourly map (00:00 to 23:00)
          const hourlyChartMap = new Map<string, { time: string; ac: number; lamp: number }>()
          for (let h = 0; h < 24; h += 2) { // display points every 2 hours to keep chart clean
            const label = `${String(h).padStart(2, '0')}:00`
            hourlyChartMap.set(label, { time: label, ac: 0, lamp: 0 })
          }
          
          rawData.forEach((row: any) => {
            const rowDate = row.consumption_date ? row.consumption_date.split('T')[0] : ''
            const hourInt = row.hour_start ? parseInt(row.hour_start.split(':')[0], 10) : 0
            const roundedHour = Math.floor(hourInt / 2) * 2
            const hourStr = `${String(roundedHour).padStart(2, '0')}:00`
            
            const acVal = Number(row.power_ac ?? (row.device_type === 'AC' ? row.consumption : 0)) || 0
            const lampVal = Number(row.power_lamp ?? (row.device_type === 'LAMP' ? row.consumption : 0)) || 0
            
            if (rowDate === todayStrLocal) {
              currentAcTotal += acVal
              currentLampTotal += lampVal
              
              const entry = hourlyChartMap.get(hourStr) || { time: hourStr, ac: 0, lamp: 0 }
              entry.ac += acVal
              entry.lamp += lampVal
              hourlyChartMap.set(hourStr, entry)
            } else if (rowDate === yesterdayStrLocal) {
              previousAcTotal += acVal
              previousLampTotal += lampVal
            }
          })
          
          const currentSum = currentAcTotal + currentLampTotal
          const prevSum = previousAcTotal + previousLampTotal
          
          setTotalConsumption(currentSum)
          const change = prevSum > 0 ? ((currentSum - prevSum) / prevSum) * 100 : 0
          setConsumptionChange(change)
          
          setEnergyData([...hourlyChartMap.values()].map(item => ({
            time: item.time,
            ac: Math.round(item.ac * 100) / 100,
            lamp: Math.round(item.lamp * 100) / 100
          })))
        } else {
          // Daily charts for 7d and 30d
          const dailyChartMap = new Map<string, { time: string; ac: number; lamp: number }>()
          currentPeriodDates.forEach(date => {
            const label = new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
            dailyChartMap.set(date, { time: label, ac: 0, lamp: 0 })
          })
          
          rawData.forEach((row: any) => {
            const rowDate = row.consumption_date ? row.consumption_date.split('T')[0] : ''
            const acVal = Number(row.power_ac ?? (row.device_type === 'AC' ? row.consumption : 0)) || 0
            const lampVal = Number(row.power_lamp ?? (row.device_type === 'LAMP' ? row.consumption : 0)) || 0
            
            if (currentPeriodDates.includes(rowDate)) {
              currentAcTotal += acVal
              currentLampTotal += lampVal
              
              const entry = dailyChartMap.get(rowDate) || { time: rowDate, ac: 0, lamp: 0 }
              entry.ac += acVal
              entry.lamp += lampVal
              dailyChartMap.set(rowDate, entry)
            } else if (previousPeriodDates.includes(rowDate)) {
              previousAcTotal += acVal
              previousLampTotal += lampVal
            }
          })
          
          const currentSum = currentAcTotal + currentLampTotal
          const prevSum = previousAcTotal + previousLampTotal
          
          setTotalConsumption(currentSum)
          const change = prevSum > 0 ? ((currentSum - prevSum) / prevSum) * 100 : 0
          setConsumptionChange(change)
          
          setEnergyData([...dailyChartMap.values()].map(item => ({
            time: item.time,
            ac: Math.round(item.ac * 100) / 100,
            lamp: Math.round(item.lamp * 100) / 100
          })))
        }
      } catch (err) {
        console.error('Error loading consumption data:', err)
      }
    }
    
    loadConsumptionData()
  }, [devices, selectedClass, timeRange])

  // Filter devices by selected class
  const filteredDevices = useMemo(() => {
    return selectedClass === 'All' 
      ? devices 
      : devices.filter(d => d.location === selectedClass)
  }, [devices, selectedClass])

  // Calculate live current statistics based on device status
  const currentStats = useMemo(() => {
    const acDevices = filteredDevices.filter(d => d.device_type === 'AC')
    const lampDevices = filteredDevices.filter(d => d.device_type === 'LAMP')
    const sensorDevices = filteredDevices.filter(d => d.device_type === 'SENSOR')
    
    // Live power (kW) calculation - fallback to power rating if active but current_power is 0
    const liveAcPower = acDevices.reduce((sum, d) => {
      const active = d.status === 'active' || d.status === 'online'
      if (!active) return sum
      const power = parseFloat(String(d.current_power)) || 0
      return sum + (power > 0 ? power : (parseFloat(String(d.power_rating)) || 3.0))
    }, 0)

    const liveLampPower = lampDevices.reduce((sum, d) => {
      const active = d.status === 'active' || d.status === 'online'
      if (!active) return sum
      const power = parseFloat(String(d.current_power)) || 0
      return sum + (power > 0 ? power : (parseFloat(String(d.power_rating)) || 1.6))
    }, 0)

    // Suhu Rata-rata gabungan dari semua perangkat yang punya suhu
    const allTemps = filteredDevices
      .filter(d => d.current_temperature && parseFloat(String(d.current_temperature)) > 0)
      .map(d => parseFloat(String(d.current_temperature)))
    
    const avgTemp = allTemps.length > 0
      ? (allTemps.reduce((s, t) => s + t, 0) / allTemps.length).toFixed(1)
      : '—'

    // Extract humidity from latest reading lists
    let latestHumidity = 78.5
    for (const sensor of sensorDevices) {
      const consumptionList = (sensor as any).consumption || []
      if (consumptionList.length > 0) {
        const validRecords = consumptionList.filter((c: any) => c.humidity !== null && c.humidity !== undefined)
        if (validRecords.length > 0) {
          latestHumidity = parseFloat(validRecords[validRecords.length - 1].humidity)
          break
        }
      }
    }

    const onlineDevicesCount = filteredDevices.filter(d => isDeviceOnline(d)).length

    return {
      liveAcPower,
      liveLampPower,
      avgTemp,
      latestHumidity,
      onlineDevicesCount,
      sensorCount: sensorDevices.length
    }
  }, [filteredDevices])

  // Handles device control (turn ON/OFF)
  const handleDeviceControl = async (deviceId: number, currentStatus: string) => {
    const action = currentStatus === 'active' || currentStatus === 'online' ? 'off' : 'on'
    try {
      setRefreshing(true)
      await devicesAPI.control(deviceId, action)
      // Reload devices to catch new state
      await loadDevices(true)
    } catch (err) {
      console.error('Failed to control device:', err)
      alert(err instanceof Error ? err.message : 'Gagal mengontrol perangkat')
    } finally {
      setRefreshing(false)
    }
  }


  // Node-RED direct device type control
  const [nodeRedLoading, setNodeRedLoading] = useState<Record<string, boolean>>({})

  const handleNodeRedControl = async (classCode: string, deviceType: 'lamp' | 'ac' | 'projector', action: 'on' | 'off') => {
    const key = `${classCode}-${deviceType}-${action}`
    const nodeRedClassCode = classCode.toLowerCase().replace(/\./g, '')
    try {
      setNodeRedLoading(prev => ({ ...prev, [key]: true }))

      // 1. Call physical Node-RED control
      if (deviceType === 'lamp') {
        await nodeRedControlAPI.controlLamp(nodeRedClassCode, action)
      } else if (deviceType === 'ac') {
        await nodeRedControlAPI.controlAC(nodeRedClassCode, action)
      } else {
        await nodeRedControlAPI.controlProjector(nodeRedClassCode, action)
      }

      // 2. Update database status so dashboard registers the change
      const targetDbStatus = action === 'on' ? 'active' : 'idle'
      const matchedDevices = devices.filter(d =>
        d.location === classCode &&
        (
          (deviceType === 'lamp' && d.device_type === 'LAMP') ||
          (deviceType === 'ac' && d.device_type === 'AC') ||
          (deviceType === 'projector' && d.device_type === 'PROJECTOR')
        )
      )

      await Promise.all(matchedDevices.map(d => devicesAPI.updateStatus(d.id, targetDbStatus)))

      // 3. Reload devices from backend to refresh live power metrics on dashboard
      await loadDevices(true)
    } catch (err) {
      console.error(`Failed to control ${deviceType} in ${classCode}:`, err)
      alert(err instanceof Error ? err.message : `Gagal mengontrol ${deviceType} di ${classCode}`)
    } finally {
      setNodeRedLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  // Monthly trend summary data (always 6 months)
  const [monthlyTrendData, setMonthlyTrendData] = useState<any[]>([])
  useEffect(() => {
    const fetchMonthlyTrend = async () => {
      try {
        const classId = selectedClass === 'All'
          ? undefined
          : devices.find((d) => d.location === selectedClass)?.class_id

        const summary = await consumptionAPI.getMonthlyTrendSummary(6, classId)
        
        // Format to Indonesian month labels
        const monthNamesMap: Record<string, string> = {
          'Jan': 'Jan', 'Feb': 'Feb', 'Mar': 'Mar', 'Apr': 'Apr', 'May': 'Mei', 'Jun': 'Jun',
          'Jul': 'Jul', 'Aug': 'Ags', 'Sep': 'Sep', 'Oct': 'Okt', 'Nov': 'Nov', 'Dec': 'Des'
        }

        const formatted = (summary || []).map((row: any) => {
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
        setMonthlyTrendData(formatted)
      } catch (e) {
        console.warn('Could not load monthly trend:', e)
      }
    }
    fetchMonthlyTrend()
  }, [devices, selectedClass])

  if (loading) {
    return (
      <div className="flex h-screen bg-[#0f2d59] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#d8ae47] mx-auto mb-6"></div>
          <p className="text-white font-bold tracking-wider animate-pulse">MEMUAT DASHBOARD ENERGI...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden text-slate-800" style={{
      backgroundImage: 'url(/bg_unesa2.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-white/40 pointer-events-none z-0" />

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

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* Main University Links */}
          <Link href="/" className="flex items-center space-x-3 px-4 py-2.5 rounded text-white/70 hover:bg-white/5 hover:text-white transition-all">
            <Building2 size={18} />
            {sidebarOpen && <span className="text-sm">Dasbor Rektorat</span>}
          </Link>
          
          <div className="space-y-1">
            <Link href="/psikologi" className="flex items-center space-x-3 px-4 py-2.5 rounded text-white bg-white/10 font-bold transition-all">
              <Activity size={18} className="text-[#f1c40f]" />
              {sidebarOpen && <span className="text-sm">Fakultas Psikologi</span>}
            </Link>
            
            {/* Sub-menu for Psikologi */}
            {sidebarOpen && (
              <div className="pl-8 space-y-1 border-l border-white/10 ml-6">
                <Link href="/psikologi" className="block py-1.5 px-3 text-xs font-semibold text-white rounded bg-white/10">
                  Dasbor
                </Link>
                <Link href="/devices" className="block py-1.5 px-3 text-xs text-white/60 hover:text-white rounded hover:bg-white/5">
                  Perangkat
                </Link>
                <Link href="/analytics" className="block py-1.5 px-3 text-xs text-white/60 hover:text-white rounded hover:bg-white/5">
                  Analitik
                </Link>
                <Link href="/alerts" className="block py-1.5 px-3 text-xs text-white/60 hover:text-white rounded hover:bg-white/5">
                  Pemberitahuan
                </Link>
                {user?.role === 'admin' && (
                  <Link href="/users" className="block py-1.5 px-3 text-xs text-white/60 hover:text-white rounded hover:bg-white/5">
                    Pengguna
                  </Link>
                )}
              </div>
            )}
          </div>
          
          <Link href="/fbs" className="flex items-center space-x-3 px-4 py-2.5 rounded text-white/70 hover:bg-white/5 hover:text-white transition-all">
            <Activity size={18} />
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
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        
        {/* Header */}
        <header className="bg-[#0f2d59] text-white shadow-md border-b-4 border-[#d8ae47] z-10 shrink-0">
          <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-1.5 hover:bg-white/10 rounded transition-all mr-2 lg:hidden"
                >
                  <Menu size={20} />
                </button>
              )}
              <div>
                <h1 className="text-white font-extrabold text-base tracking-tight leading-tight uppercase">Dashboard Energi Fakultas Psikologi</h1>
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

              {/* Refresh Button */}
              <button 
                onClick={() => loadDevices(true)}
                disabled={refreshing}
                className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#d8ae47]/30 rounded-lg text-[#d8ae47] transition-all disabled:opacity-50"
                title="Refresh Data"
              >
                <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              </button>

              {/* User Profile */}
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
                    <p className="text-[10px] text-[#f1c40f] font-bold leading-none mt-1 uppercase">Psikologi</p>
                  </div>
                </button>

                {profileMenuOpen && (
                  <>
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
        <main className="flex-1 overflow-y-auto p-8 max-w-[1600px] w-full mx-auto space-y-6">
          
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-red-800 text-sm flex items-center space-x-3 shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <span>{error}. Menggunakan data cache lokal sementara.</span>
            </div>
          )}

          {/* Filters & Total Consumption Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative overflow-hidden">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-teal-50 text-teal-700 rounded-lg">
                <Zap size={24} />
              </div>
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Konsumsi Fakultas Psikologi</p>
                <h3 className="text-2xl font-extrabold text-[#0f2d59] mt-0.5">
                  {totalConsumption.toFixed(2)} <span className="text-sm font-bold text-slate-400">kWh</span>
                </h3>
                <span className={`text-xs font-bold inline-flex items-center px-2 py-0.5 rounded-full mt-1.5 ${
                  consumptionChange <= 0 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                    : 'bg-rose-50 text-rose-800 border border-rose-100'
                }`}>
                  {consumptionChange <= 0 ? '↓' : '↑'} {Math.abs(consumptionChange).toFixed(1)}% vs {
                    timeRange === '24h' ? 'kemarin' : timeRange === '7d' ? '7d sebelumnya' : '30d sebelumnya'
                  }
                </span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 xl:justify-end">
              {/* Select Classroom */}
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Pilih Kelas:</span>
                <div className="flex flex-wrap gap-1.5">
                  {classes.map((cls) => (
                    <button
                      key={cls}
                      onClick={() => setSelectedClass(cls)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        selectedClass === cls
                          ? 'bg-[#0f2d59] text-white border-[#d8ae47]/30 shadow-md'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* KPI Statistics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="AC — Daya Saat Ini"
              value={`${currentStats.liveAcPower.toFixed(2)} kW`}
              change="Beban Berjalan"
              icon={<Zap className="text-orange-500" size={20} />}
              bgColor="bg-orange-50"
            />
            <KPICard
              title="Lampu — Daya Saat Ini"
              value={`${currentStats.liveLampPower.toFixed(2)} kW`}
              change="Daya Terkalkulasi"
              icon={<Zap className="text-yellow-500" size={20} />}
              bgColor="bg-yellow-50"
            />
            <KPICard
              title="Suhu Rata-rata"
              value={`${currentStats.avgTemp} °C`}
              change={`${currentStats.latestHumidity.toFixed(1)}% RH`}
              icon={<Activity className="text-teal-500" size={20} />}
              bgColor="bg-teal-50"
            />
            <KPICard
              title="Perangkat Aktif"
              value={`${currentStats.onlineDevicesCount} / ${filteredDevices.length}`}
              change={`${currentStats.sensorCount} Sensor Terhubung`}
              icon={<Activity className="text-purple-500" size={20} />}
              bgColor="bg-purple-50"
            />
          </div>

          {/* Graphs Area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: AC & Lamp Power Usage */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col hover:shadow-md transition-all duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 tracking-wider uppercase">
                    KONSUMSI DAYA AC & LAMPU ({timeRange === '24h' ? 'HARI INI' : timeRange === '7d' ? '7 HARI TERAKHIR' : '30 HARI TERAKHIR'})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Grafik perbandingan beban energi sektoral</p>
                </div>
                
                {/* Select Time Range */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-center">
                  {[
                    { key: '24h', label: 'Hari' },
                    { key: '7d', label: 'Minggu' },
                    { key: '30d', label: 'Bulan' }
                  ].map((range) => (
                    <button
                      key={range.key}
                      onClick={() => setTimeRange(range.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        timeRange === range.key
                          ? 'bg-[#0f2d59] text-white shadow-md'
                          : 'text-slate-600 hover:text-slate-900'
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
                    <YAxis stroke="#475569" fontSize={11} fontWeight={600} tickLine={false} unit={timeRange === '24h' ? ' kW' : ' kWh'} />
                    <Tooltip content={<CustomTooltip unit={timeRange === '24h' ? 'kW' : 'kWh'} />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10, fontWeight: 700 }} />
                    <Bar dataKey="ac" fill="#d8ae47" radius={[4, 4, 0, 0]} name="Air Conditioner" />
                    <Bar dataKey="lamp" fill="#483688" radius={[4, 4, 0, 0]} name="Lighting System" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Monthly Trends */}
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
                        <stop offset="5%" stopColor="#d8ae47" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#d8ae47" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorLamp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#483688" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#483688" stopOpacity={0}/>
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

          {/* Classroom Control Cards */}
          {selectedClass === 'All' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-800 tracking-wider uppercase">🕹️ KONTROL ON/OFF KELAS PSIKOLOGI</h3>
                <p className="text-xs text-slate-500 mt-0.5">Nyalakan/matikan perangkat per tipe (Lampu, AC, Proyektor) di setiap ruangan</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {classes.filter(c => c !== 'All').map(loc => {
                  const locDevices = devices.filter(d => d.location === loc)
                  const isAnyActive = locDevices.some(d => d.status === 'active' || d.status === 'online')
                  
                  const deviceTypeControls = [
                    { type: 'lamp' as const, label: 'Lampu', icon: '💡', color: 'amber' },
                    { type: 'ac' as const, label: 'AC', icon: '❄️', color: 'sky' },
                    { type: 'projector' as const, label: 'Proyektor', icon: '📽️', color: 'violet' },
                  ]
                  return (
                    <div key={loc} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-300">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                        <div>
                          <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">{loc}</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{locDevices.length} Perangkat Terdaftar</p>
                        </div>
                        <span className={`inline-flex items-center w-2.5 h-2.5 rounded-full ${isAnyActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      </div>
                      <div className="space-y-2">
                        {deviceTypeControls.map(ctrl => {
                          const onKey = `${loc}-${ctrl.type}-on`
                          const offKey = `${loc}-${ctrl.type}-off`
                          const isOnLoading = nodeRedLoading[onKey] || false
                          const isOffLoading = nodeRedLoading[offKey] || false
                          return (
                            <div key={ctrl.type} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm">{ctrl.icon}</span>
                                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">{ctrl.label}</span>
                              </div>
                              <div className="flex items-center space-x-1.5">
                                <button
                                  onClick={() => handleNodeRedControl(loc, ctrl.type, 'on')}
                                  disabled={isOnLoading}
                                  className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-all text-center disabled:opacity-50"
                                >
                                  {isOnLoading ? '...' : 'ON'}
                                </button>
                                <button
                                  onClick={() => handleNodeRedControl(loc, ctrl.type, 'off')}
                                  disabled={isOffLoading}
                                  className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-all text-center disabled:opacity-50"
                                >
                                  {isOffLoading ? '...' : 'OFF'}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Live Device Status Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm overflow-hidden">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-800 tracking-wider uppercase">DAFTAR STATUS PERANGKAT TERKONEKSI</h3>
              <p className="text-xs text-slate-500 mt-0.5">Daftar live telemetri status daya dan suhu perangkat</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                    <th className="pb-3 px-4 pt-3">Lokasi</th>
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
                  {filteredDevices.filter(d => d.device_type !== 'SENSOR').map((device) => {
                    const online = isDeviceOnline(device)
                    const active = device.status === 'active' || device.status === 'online'
                    const livePower = active
                      ? (parseFloat(String(device.current_power)) || parseFloat(String(device.power_rating)) || 0)
                      : 0.00
                    
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
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                          {livePower.toFixed(2)} kW
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                          {device.current_temperature && parseFloat(String(device.current_temperature)) > 0
                            ? `${parseFloat(String(device.current_temperature)).toFixed(1)}°C`
                            : '—'
                          }
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-[10px]">{device.device_eui}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            online
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'}`} />
                            {online ? 'Online' : 'Offline'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {device.device_type !== 'SENSOR' && (
                            <button
                              onClick={() => handleDeviceControl(device.id, device.status || 'offline')}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black border transition-all ${
                                active
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              <Power size={11} />
                              {active ? 'MATIKAN' : 'NYALAKAN'}
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
          
        </main>
      </div>
    </div>
  )
}

function KPICard({ title, value, change, icon, bgColor }: {
  title: string; value: string; change: string; icon: React.ReactNode; bgColor: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-extrabold text-slate-900 leading-none">{value}</p>
          <p className="text-xs text-slate-400 font-semibold">{change}</p>
        </div>
        <div className={`${bgColor} p-3 rounded-lg border border-slate-100 flex items-center justify-center`}>{icon}</div>
      </div>
    </div>
  )
}
