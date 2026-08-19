'use client'

import { useMemo, useState } from 'react'
import { Gauge as GaugeIcon, Zap, AlertCircle } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import Gauge from '@/components/Gauge'
import Pagination from '@/components/Pagination'
import { isDeviceOnline } from '@/lib/energyChartUtils'
import type { Device, RawConsumptionRow, MonthlyPoint, DailyPoint, DeviceComparisonPoint } from './types'
import { getLocalIsoDate, formatShortDate, buildWeeklyConsumption } from './utils'

const ONLINE_COLOR = '#f59e0b'
const OFFLINE_COLOR = '#fca5a5'

interface UtamaTabProps {
  devices: Device[]
  monthlyData: MonthlyPoint[]
  dailyTrends: DailyPoint[]
  deviceComparison: DeviceComparisonPoint[]
  rawRows: RawConsumptionRow[]
  wideRows: RawConsumptionRow[]
}

export default function UtamaTab({ devices, monthlyData, dailyTrends, deviceComparison, rawRows, wideRows }: UtamaTabProps) {
  const [typeFilter, setTypeFilter] = useState<'Semua Tipe' | 'AC' | 'LAMP'>('Semua Tipe')
  const [tablePage, setTablePage] = useState(1)
  const tablePageSize = 10

  const latestMonth = useMemo(() => (monthlyData.length ? monthlyData[monthlyData.length - 1] : { ac: 0, lamp: 0 }), [monthlyData])

  const periodTotals = useMemo(() => {
    const today = new Date()
    const todayKey = getLocalIsoDate(today)
    const monday = new Date(today)
    monday.setDate(monday.getDate() - ((today.getDay() + 6) % 7))
    const mondayKey = getLocalIsoDate(monday)
    const monthPrefix = todayKey.slice(0, 7)
    const yearPrefix = todayKey.slice(0, 4)

    let day = 0, week = 0, month = 0, year = 0
    wideRows.forEach((row) => {
      const dateKey = String(row.consumption_date || '').slice(0, 10)
      if (!dateKey) return
      const value = Number(row.consumption || 0)
      if (dateKey === todayKey) day += value
      if (dateKey >= mondayKey && dateKey <= todayKey) week += value
      if (dateKey.startsWith(monthPrefix)) month += value
      if (dateKey.startsWith(yearPrefix)) year += value
    })

    return { day, week, month, year }
  }, [wideRows])

  const deviceStatus = useMemo(() => {
    const online = devices.filter(isDeviceOnline).length
    const offline = devices.length - online
    return { online, offline, total: devices.length }
  }, [devices])

  const deviceConsumptionChart = useMemo(() => {
    const totals = new Map<string, number>()
    rawRows.forEach((row) => {
      totals.set(row.device_name, (totals.get(row.device_name) || 0) + Number(row.consumption || 0))
    })
    return [...totals.entries()]
      .map(([device, consumption]) => ({ device, consumption: Math.round(consumption * 100) / 100 }))
      .sort((a, b) => b.consumption - a.consumption)
      .slice(0, 12)
  }, [rawRows])

  const weeklyTrend = useMemo(() => buildWeeklyConsumption(wideRows, 10), [wideRows])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-center">
          <Gauge value={periodTotals.day} max={Math.max(periodTotals.day * 1.4, 10)} label="Hari Ini" unit="kWh" size={150} />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-center">
          <Gauge value={periodTotals.week} max={Math.max(periodTotals.week * 1.4, 10)} label="Minggu Ini" unit="kWh" size={150} />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-center">
          <Gauge value={periodTotals.month} max={Math.max(periodTotals.month * 1.4, 10)} label="Bulan Ini" unit="kWh" size={150} />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-center">
          <Gauge value={periodTotals.year} max={Math.max(periodTotals.year * 1.4, 10)} label="Tahun Ini" unit="kWh" size={150} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AnalyticsCard title="AC Konsumsi Bulan Ini" value={`${latestMonth.ac.toFixed(2)} kWh`} change="Dinamis" icon={<Zap className="text-orange-500" />} />
        <AnalyticsCard title="Lampu Konsumsi Bulan Ini" value={`${latestMonth.lamp.toFixed(2)} kWh`} change="Dinamis" icon={<GaugeIcon className="text-blue-500" />} />
        <AnalyticsCard title="Konsumen Teratas" value={deviceComparison[0]?.device || '-'} change={`${(deviceComparison[0]?.consumption || 0).toFixed(2)} kWh`} icon={<AlertCircle className="text-teal-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Tren Konsumsi Bulanan</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" label={{ value: 'Bulan', position: 'insideBottom', offset: -3, fontSize: 11 }} />
              <YAxis stroke="#6b7280" label={{ value: 'kWh', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Legend />
              <Line type="monotone" dataKey="ac" stroke="#7ca6ff" strokeWidth={2} name="AC (kWh)" />
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
              <YAxis stroke="#6b7280" label={{ value: 'kWh', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="ac" fill="#7ca6ff" name="AC (kWh)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lamp" fill="#483688" name="Lampu (kWh)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Status Perangkat</h3>
          {deviceStatus.total === 0 ? (
            <EmptyState />
          ) : (
            <div className="relative">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={[{ name: 'Online', value: deviceStatus.online }, { name: 'Offline', value: deviceStatus.offline }]}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    <Cell fill={ONLINE_COLOR} />
                    <Cell fill={OFFLINE_COLOR} />
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: -20 }}>
                <p className="text-2xl font-black text-slate-800">{deviceStatus.total}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Perangkat</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Konsumsi per Perangkat</h3>
          {deviceConsumptionChart.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(260, deviceConsumptionChart.length * 28)}>
              <BarChart data={deviceConsumptionChart} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" stroke="#6b7280" label={{ value: 'kWh', position: 'insideBottom', offset: -3, fontSize: 11 }} />
                <YAxis type="category" dataKey="device" stroke="#6b7280" width={160} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Bar dataKey="consumption" fill="#7ca6ff" name="Konsumsi (kWh)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Tren Mingguan (10 Minggu Terakhir)</h3>
        {weeklyTrend.length === 0 ? (
          <EmptyState />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="week" stroke="#6b7280" label={{ value: 'Minggu', position: 'insideBottom', offset: -3, fontSize: 11 }} />
              <YAxis stroke="#6b7280" label={{ value: 'kWh', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Bar dataKey="consumption" fill="#2f46a3" name="Konsumsi (kWh)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Data Konsumsi Detail</h3>
            <p className="text-xs text-gray-500 mt-0.5">Rincian per jam per perangkat — bisa difilter dan diekspor.</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value as typeof typeFilter); setTablePage(1) }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none focus:border-[#2f46a3]"
            >
              <option value="Semua Tipe">Semua Tipe</option>
              <option value="AC">AC</option>
              <option value="LAMP">Lampu</option>
            </select>
          </div>
        </div>

        {(() => {
          const filteredRows = typeFilter === 'Semua Tipe' ? rawRows : rawRows.filter((r) => r.device_type === typeFilter)
          const start = (tablePage - 1) * tablePageSize
          const pageRows = filteredRows.slice(start, start + tablePageSize)

          if (filteredRows.length === 0) {
            return <div className="text-center py-10 text-sm text-slate-400">Belum ada data konsumsi untuk filter ini.</div>
          }

          return (
            <>
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-black uppercase tracking-wider">
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Jam</th>
                      <th className="py-2.5 px-3">Ruangan</th>
                      <th className="py-2.5 px-3">Perangkat</th>
                      <th className="py-2.5 px-3">Tipe</th>
                      <th className="py-2.5 px-3 text-right">AC (kW)</th>
                      <th className="py-2.5 px-3 text-right">Lampu (kW)</th>
                      <th className="py-2.5 px-3 text-right">Total (kW)</th>
                      <th className="py-2.5 px-3 text-right">Suhu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {pageRows.map((row) => (
                      <tr key={row.id} className="odd:bg-white even:bg-slate-50/40 hover:bg-slate-50">
                        <td className="py-2.5 px-3 whitespace-nowrap">{formatShortDate(row.consumption_date)}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{row.hour_start?.slice(0, 5)}</td>
                        <td className="py-2.5 px-3 text-slate-900 font-bold">{row.class_name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{row.device_name}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                            row.device_type === 'AC' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }`}>
                            {row.device_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">{Number(row.power_ac || 0).toFixed(3)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{Number(row.power_lamp || 0).toFixed(3)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{Number(row.consumption || 0).toFixed(3)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">{row.temperature ? `${Number(row.temperature).toFixed(1)}°C` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={tablePage} totalItems={filteredRows.length} pageSize={tablePageSize} onPageChange={setTablePage} />
            </>
          )
        })()}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Konsumen Energi Teratas</h3>
        <div className="space-y-3">
          {deviceComparison.length === 0 && <EmptyState />}
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

export function EmptyState({ message = 'Belum ada data.' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg">
      {message}
    </div>
  )
}
