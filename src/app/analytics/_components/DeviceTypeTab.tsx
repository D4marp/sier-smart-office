'use client'

import { useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import Gauge from '@/components/Gauge'
import { PowerBadge } from '@/components/StatusBadges'
import type { Device, RawConsumptionRow } from './types'
import { buildWeeklyConsumption } from './utils'
import { EmptyState } from './UtamaTab'

const LINE_COLORS = ['#7ca6ff', '#483688', '#f59e0b', '#10b981', '#ef4444', '#0ea5e9', '#a855f7', '#eab308', '#14b8a6', '#f472b6']

interface DeviceTypeTabProps {
  deviceType: 'AC' | 'LAMP'
  typeLabel: string
  devices: Device[]
  rawRows: RawConsumptionRow[]
  wideRows: RawConsumptionRow[]
  showSwitchStatusTable?: boolean
}

export default function DeviceTypeTab({ deviceType, typeLabel, devices, rawRows, wideRows, showSwitchStatusTable }: DeviceTypeTabProps) {
  const typedDevices = useMemo(() => devices.filter((d) => d.device_type === deviceType), [devices, deviceType])

  const roomGauges = useMemo(() => {
    const rooms = new Map<string, { power: number; rating: number }>()
    typedDevices.forEach((d) => {
      const entry = rooms.get(d.location) || { power: 0, rating: 0 }
      entry.power += Number(d.current_power) || 0
      entry.rating += Number(d.power_rating) || 0
      rooms.set(d.location, entry)
    })
    return [...rooms.entries()]
      .map(([room, v]) => ({ room, power: Math.round(v.power * 1000) / 1000, rating: Math.max(v.rating, 0.1) }))
      .sort((a, b) => a.room.localeCompare(b.room))
  }, [typedDevices])

  const weeklyTrend = useMemo(
    () => buildWeeklyConsumption(wideRows.filter((r) => r.device_type === deviceType), 10),
    [wideRows, deviceType]
  )

  const hourlyPattern = useMemo(() => {
    const filtered = rawRows.filter((r) => r.device_type === deviceType)
    const deviceIds = [...new Set(filtered.map((r) => r.device_id))]
    const deviceNames = new Map<number, string>()
    filtered.forEach((r) => deviceNames.set(r.device_id, r.device_name))

    const buckets: Record<number, Record<number, { sum: number; count: number }>> = {}
    for (let h = 0; h < 24; h++) buckets[h] = {}

    filtered.forEach((row) => {
      const hour = parseInt(String(row.hour_start || '0:00').split(':')[0], 10) || 0
      if (!buckets[hour][row.device_id]) buckets[hour][row.device_id] = { sum: 0, count: 0 }
      buckets[hour][row.device_id].sum += Number(row.consumption || 0)
      buckets[hour][row.device_id].count += 1
    })

    const series = Array.from({ length: 24 }, (_, hour) => {
      const point: Record<string, number | string> = { hour: `${String(hour).padStart(2, '0')}:00` }
      deviceIds.forEach((id) => {
        const b = buckets[hour][id]
        point[String(id)] = b ? Math.round((b.sum / b.count) * 1000) / 1000 : 0
      })
      return point
    })

    return { series, deviceIds, deviceNames }
  }, [rawRows, deviceType])

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Daya {typeLabel} per Ruangan</h3>
        {roomGauges.length === 0 ? <EmptyState message={`Belum ada perangkat ${typeLabel} terpasang.`} /> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {roomGauges.map((r) => (
              <div key={r.room} className="border border-slate-100 rounded-lg p-3 flex flex-col items-center">
                <Gauge value={r.power} max={r.rating} label={r.room} unit="kW" size={140} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Tren Konsumsi Mingguan {typeLabel} (10 Minggu Terakhir)</h3>
        {weeklyTrend.every((w) => w.consumption === 0) ? <EmptyState /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="week" stroke="#6b7280" label={{ value: 'Minggu', position: 'insideBottom', offset: -3, fontSize: 11 }} />
              <YAxis stroke="#6b7280" label={{ value: 'kWh', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Bar dataKey="consumption" fill="#7ca6ff" name={`${typeLabel} (kWh)`} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-1">Pola Pemakaian per Jam</h3>
        <p className="text-xs text-gray-500 mb-4">Rata-rata daya per jam (0–23) untuk setiap perangkat {typeLabel}, periode &amp; ruangan sesuai filter.</p>
        {hourlyPattern.deviceIds.length === 0 ? <EmptyState /> : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={hourlyPattern.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="hour" stroke="#6b7280" label={{ value: 'Jam', position: 'insideBottom', offset: -3, fontSize: 11 }} />
              <YAxis stroke="#6b7280" label={{ value: 'kW', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {hourlyPattern.deviceIds.map((id, idx) => (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={String(id)}
                  name={hourlyPattern.deviceNames.get(id) || `Perangkat ${id}`}
                  stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                  strokeWidth={1.75}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {showSwitchStatusTable && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Status Saklar Saat Ini</h3>
          {typedDevices.length === 0 ? <EmptyState /> : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-black uppercase tracking-wider">
                    <th className="py-2.5 px-3">Perangkat</th>
                    <th className="py-2.5 px-3">Ruangan</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {typedDevices.map((d) => (
                    <tr key={d.id} className="odd:bg-white even:bg-slate-50/40 hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-900 font-bold">{d.device_name}</td>
                      <td className="py-2.5 px-3">{d.location}</td>
                      <td className="py-2.5 px-3"><PowerBadge device={d} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
