'use client'

import { useMemo, useState } from 'react'
import { Activity, Power, Wifi } from 'lucide-react'
import Pagination from '@/components/Pagination'
import { ConnectivityBadge } from '@/components/StatusBadges'
import { isDeviceOnline } from '@/lib/energyChartUtils'
import type { Device } from './types'
import { formatDateTimeId, minutesSince } from './utils'
import { EmptyState } from './UtamaTab'

const PAGE_SIZE = 10

export default function TableTab({ devices }: { devices: Device[] }) {
  const [powerPage, setPowerPage] = useState(1)
  const [statusPage, setStatusPage] = useState(1)

  const summary = useMemo(() => {
    const online = devices.filter(isDeviceOnline).length
    return { online, offline: devices.length - online, total: devices.length }
  }, [devices])

  const powerRows = useMemo(
    () => [...devices].sort((a, b) => (Number(b.current_power) || 0) - (Number(a.current_power) || 0)),
    [devices]
  )

  const statusRows = useMemo(
    () => [...devices].sort((a, b) => a.device_name.localeCompare(b.device_name)),
    [devices]
  )

  const powerPageRows = powerRows.slice((powerPage - 1) * PAGE_SIZE, powerPage * PAGE_SIZE)
  const statusPageRows = statusRows.slice((statusPage - 1) * PAGE_SIZE, statusPage * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard title="Online" value={summary.online} icon={<Wifi className="text-emerald-600" size={20} />} bg="bg-emerald-50" />
        <SummaryCard title="Offline" value={summary.offline} icon={<Power className="text-rose-600" size={20} />} bg="bg-rose-50" />
        <SummaryCard title="Total Perangkat" value={summary.total} icon={<Activity className="text-[#2f46a3]" size={20} />} bg="bg-blue-50" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Konsumsi Daya Saat Ini</h3>
        {devices.length === 0 ? <EmptyState /> : (
          <>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-black uppercase tracking-wider">
                    <th className="py-2.5 px-3">Perangkat</th>
                    <th className="py-2.5 px-3">Ruangan</th>
                    <th className="py-2.5 px-3 text-right">Daya Aktif (kW)</th>
                    <th className="py-2.5 px-3">Pembacaan Terakhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {powerPageRows.map((d) => (
                    <tr key={d.id} className="odd:bg-white even:bg-slate-50/40 hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-900 font-bold">{d.device_name}</td>
                      <td className="py-2.5 px-3">{d.location}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">{(Number(d.current_power) || 0).toFixed(3)}</td>
                      <td className="py-2.5 px-3 text-slate-500">{formatDateTimeId(d.last_reading)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={powerPage} totalItems={powerRows.length} pageSize={PAGE_SIZE} onPageChange={setPowerPage} />
          </>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Status Online Perangkat</h3>
        {devices.length === 0 ? <EmptyState /> : (
          <>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-black uppercase tracking-wider">
                    <th className="py-2.5 px-3">Perangkat</th>
                    <th className="py-2.5 px-3">Ruangan</th>
                    <th className="py-2.5 px-3">Tipe Aplikasi</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Heartbeat Terakhir</th>
                    <th className="py-2.5 px-3 text-right">Terakhir Terlihat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {statusPageRows.map((d) => (
                    <tr key={d.id} className="odd:bg-white even:bg-slate-50/40 hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-900 font-bold">{d.device_name}</td>
                      <td className="py-2.5 px-3">{d.location}</td>
                      <td className="py-2.5 px-3 text-slate-500">{d.application_type || '—'}</td>
                      <td className="py-2.5 px-3"><ConnectivityBadge device={d} /></td>
                      <td className="py-2.5 px-3 text-slate-500">{formatDateTimeId(d.last_heartbeat)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">{minutesSince(d.last_heartbeat)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={statusPage} totalItems={statusRows.length} pageSize={PAGE_SIZE} onPageChange={setStatusPage} />
          </>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ title, value, icon, bg }: { title: string; value: number; icon: React.ReactNode; bg: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-black text-slate-800 mt-1">{value}</p>
      </div>
      <div className={`${bg} p-3 rounded-lg`}>{icon}</div>
    </div>
  )
}
