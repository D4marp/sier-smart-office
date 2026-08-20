'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileDown } from 'lucide-react'
import { devicesAPI, consumptionAPI } from '@/lib/apiClient'
import { exportToExcel } from '@/lib/exportExcel'
import Sidebar from '@/components/Sidebar'
import DashboardHeader from '@/components/DashboardHeader'
import RoomDropdown from '@/components/RoomDropdown'
import UtamaTab from './_components/UtamaTab'
import GreenEnergyTab from './_components/GreenEnergyTab'
import DeviceTypeTab from './_components/DeviceTypeTab'
import TableTab from './_components/TableTab'
import type { Device, RawConsumptionRow, MonthlyPoint, DailyPoint, DeviceComparisonPoint, TabKey } from './_components/types'
import { getLocalIsoDate, shiftDateByDays, sortRawRowsDesc, buildMonthlySeries, buildDailyFromClassRows } from './_components/utils'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'utama', label: 'Utama' },
  { key: 'energi-hijau', label: 'Energi Hijau' },
  { key: 'ac', label: 'AC' },
  { key: 'lampu', label: 'Lampu' },
  { key: 'tabel', label: 'Tabel' },
]

// Rentang lebar untuk gauge Hari/Minggu/Bulan/Tahun Ini, tren mingguan, dan
// tabel penghematan bulanan di tab Energi Hijau — independen dari toggle
// 7d/30d/90d yang hanya mengatur grafik harian/tabel detail.
const WIDE_RANGE_DAYS = 365

export default function AnalyticsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('utama')
  const [selectedClass, setSelectedClass] = useState('Semua Ruangan')
  const [timeRange, setTimeRange] = useState('30d')
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<string[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyPoint[]>([])
  const [dailyTrends, setDailyTrends] = useState<DailyPoint[]>([])
  const [deviceComparison, setDeviceComparison] = useState<DeviceComparisonPoint[]>([])
  const [rawRows, setRawRows] = useState<RawConsumptionRow[]>([])
  const [wideRows, setWideRows] = useState<RawConsumptionRow[]>([])

  useEffect(() => {
    const loadDevices = async () => {
      try {
        setLoading(true)
        const devicesData = await devicesAPI.getAll()
        const list = (devicesData || []) as Device[]
        setDevices(list)

        if (list.length > 0) {
          const uniqueClasses = [...new Set(list.map((item) => item.location))]
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
        setRawRows([])
        return
      }

      try {
        const classId = selectedClass === 'Semua Ruangan'
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
          setRawRows(sortRawRowsDesc(classRows || []))

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
          setRawRows(sortRawRowsDesc(perClassRows.flat()))

          const locationTotals = new Map<string, number>()
          perClassRows.flat().forEach((row: RawConsumptionRow) => {
            locationTotals.set(row.class_name, (locationTotals.get(row.class_name) || 0) + Number(row.consumption || 0))
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

  // Dataset rentang lebar (365 hari) — dipakai gauge Utama, tren mingguan
  // Utama/AC/Lampu, dan tabel/grafik penghematan di tab Energi Hijau.
  useEffect(() => {
    const loadWideRows = async () => {
      if (!devices.length) {
        setWideRows([])
        return
      }

      try {
        const today = getLocalIsoDate()
        const startDate = shiftDateByDays(today, WIDE_RANGE_DAYS - 1)
        const classId = selectedClass === 'Semua Ruangan'
          ? undefined
          : devices.find((item) => item.location === selectedClass)?.class_id

        if (classId) {
          const rows = await consumptionAPI.getByClass(classId, startDate, today)
          setWideRows(rows || [])
        } else {
          const classIds = [...new Set(devices.map((item) => item.class_id))]
          const perClassRows = await Promise.all(
            classIds.map((id) => consumptionAPI.getByClass(id, startDate, today).catch(() => []))
          )
          setWideRows(perClassRows.flat())
        }
      } catch (error) {
        console.error('Error loading wide-range consumption:', error)
        setWideRows([])
      }
    }

    loadWideRows()
  }, [devices, selectedClass])

  const filteredDevices = useMemo(
    () => (selectedClass === 'Semua Ruangan' ? devices : devices.filter((d) => d.location === selectedClass)),
    [devices, selectedClass]
  )

  const handleExportExcel = () => {
    const monthlyRows = monthlyData.map((row) => ({
      Jenis: 'Bulanan',
      Periode: row.month,
      'AC (kWh)': row.ac,
      'Lampu (kWh)': row.lamp,
    }))
    const dailyRows = dailyTrends.map((row) => ({
      Jenis: 'Harian',
      Periode: row.day,
      'AC (kWh)': row.ac,
      'Lampu (kWh)': row.lamp,
    }))
    const detailRows = rawRows.map((row) => ({
      Jenis: 'Detail',
      Tanggal: row.consumption_date,
      Jam: row.hour_start,
      Ruangan: row.class_name,
      Perangkat: row.device_name,
      Tipe: row.device_type,
      'AC (kW)': row.power_ac,
      'Lampu (kW)': row.power_lamp,
      'Total (kW)': row.consumption,
      'Suhu (°C)': row.temperature,
    }))
    exportToExcel([...monthlyRows, ...dailyRows, ...detailRows], 'analitik-konsumsi-energi')
  }

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
      backgroundImage: 'url(/sier-building-bg.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      <div className="absolute inset-0 bg-white/95 pointer-events-none"></div>

      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <DashboardHeader title="Dashboard Analitik" sidebarOpen={sidebarOpen} onOpenSidebar={() => setSidebarOpen(true)} />

        <div className="flex-1 overflow-y-auto relative z-10">
          {/* Tab bar */}
          <div className="mx-8 mt-6 flex items-center gap-1 border-b border-slate-200 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-xs sm:text-sm whitespace-nowrap transition-all border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? 'text-[#2f46a3] border-[#2f46a3] font-bold'
                    : 'text-slate-500 border-transparent hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filter row */}
          <div className="mx-8 mt-4 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Ruangan:</span>
              <RoomDropdown
                rooms={classes}
                value={selectedClass}
                onChange={setSelectedClass}
                allLabel="Semua Ruangan"
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none focus:border-[#2f46a3]"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportExcel}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#2f46a3] hover:bg-[#263a87] text-white rounded-lg text-xs font-bold transition-all"
              >
                <FileDown size={14} />
                Export Excel
              </button>

              <div className="flex bg-slate-100 p-1 rounded border border-slate-200">
                {['7d', '30d', '90d'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      timeRange === range ? 'bg-[#2f46a3] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-8">
            {activeTab === 'utama' && (
              <UtamaTab
                devices={filteredDevices}
                monthlyData={monthlyData}
                dailyTrends={dailyTrends}
                deviceComparison={deviceComparison}
                rawRows={rawRows}
                wideRows={wideRows}
              />
            )}
            {activeTab === 'energi-hijau' && (
              <GreenEnergyTab devices={filteredDevices} rawRows={rawRows} wideRows={wideRows} />
            )}
            {activeTab === 'ac' && (
              <DeviceTypeTab deviceType="AC" typeLabel="AC" devices={filteredDevices} rawRows={rawRows} wideRows={wideRows} />
            )}
            {activeTab === 'lampu' && (
              <DeviceTypeTab deviceType="LAMP" typeLabel="Lampu" devices={filteredDevices} rawRows={rawRows} wideRows={wideRows} showSwitchStatusTable />
            )}
            {activeTab === 'tabel' && <TableTab devices={devices} />}
          </div>
        </div>
      </main>
    </div>
  )
}
