'use client'

import { useMemo } from 'react'
import { Info, Leaf } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { Device, RawConsumptionRow } from './types'
import {
  BASELINE_HOURS_PER_DAY, CO2_TON_PER_KWH, CO2_TON_ABSORBED_PER_TREE_PER_YEAR,
  treesFromEnergyKWh, formatShortDate, formatMonthLabel, savingsTier, HOUR_BUCKETS, hourFromRow,
} from './utils'
import { EmptyState } from './UtamaTab'

interface GreenEnergyTabProps {
  devices: Device[]
  rawRows: RawConsumptionRow[]
  wideRows: RawConsumptionRow[]
}

export default function GreenEnergyTab({ devices, rawRows, wideRows }: GreenEnergyTabProps) {
  const devicePowerMap = useMemo(() => {
    const map = new Map<number, number>()
    devices.forEach((d) => map.set(d.id, Number(d.power_rating) || 0))
    return map
  }, [devices])

  const monthlySavings = useMemo(() => {
    const monthMap = new Map<string, Map<number, { actual: number; days: Set<string> }>>()

    wideRows.forEach((row) => {
      const monthKey = String(row.consumption_date || '').slice(0, 7)
      const dateKey = String(row.consumption_date || '').slice(0, 10)
      if (!monthKey || !row.device_id) return
      if (!monthMap.has(monthKey)) monthMap.set(monthKey, new Map())
      const devMap = monthMap.get(monthKey)!
      if (!devMap.has(row.device_id)) devMap.set(row.device_id, { actual: 0, days: new Set() })
      const entry = devMap.get(row.device_id)!
      entry.actual += Number(row.consumption || 0)
      entry.days.add(dateKey)
    })

    return [...monthMap.entries()]
      .map(([monthKey, devMap]) => {
        let totalActual = 0
        let totalBaseline = 0
        devMap.forEach((entry, deviceId) => {
          const rating = devicePowerMap.get(deviceId) || 0
          totalBaseline += rating * BASELINE_HOURS_PER_DAY * entry.days.size
          totalActual += entry.actual
        })
        const saved = Math.max(0, totalBaseline - totalActual)
        const pct = totalBaseline > 0 ? (saved / totalBaseline) * 100 : 0
        return {
          monthKey,
          totalActual: Math.round(totalActual * 100) / 100,
          saved: Math.round(saved * 100) / 100,
          trees: Math.round(treesFromEnergyKWh(saved) * 1000) / 1000,
          pct: Math.round(pct * 10) / 10,
        }
      })
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
  }, [wideRows, devicePowerMap])

  const perDeviceSavings = useMemo(() => {
    const devMap = new Map<number, { name: string; actual: number; days: Set<string> }>()
    wideRows.forEach((row) => {
      if (!row.device_id) return
      if (!devMap.has(row.device_id)) devMap.set(row.device_id, { name: row.device_name, actual: 0, days: new Set() })
      const e = devMap.get(row.device_id)!
      e.actual += Number(row.consumption || 0)
      e.days.add(String(row.consumption_date || '').slice(0, 10))
    })
    return [...devMap.entries()]
      .map(([id, e]) => {
        const rating = devicePowerMap.get(id) || 0
        const baseline = rating * BASELINE_HOURS_PER_DAY * e.days.size
        const saved = Math.max(0, baseline - e.actual)
        return { device: e.name, trees: Math.round(treesFromEnergyKWh(saved) * 1000) / 1000 }
      })
      .sort((a, b) => b.trees - a.trees)
      .slice(0, 10)
  }, [wideRows, devicePowerMap])

  const dailySavings = useMemo(() => {
    const dayMap = new Map<string, Map<number, number>>()
    rawRows.forEach((row) => {
      const date = String(row.consumption_date || '').slice(0, 10)
      if (!date || !row.device_id) return
      if (!dayMap.has(date)) dayMap.set(date, new Map())
      const dm = dayMap.get(date)!
      dm.set(row.device_id, (dm.get(row.device_id) || 0) + Number(row.consumption || 0))
    })

    return [...dayMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, dm]) => {
        let baseline = 0
        let actual = 0
        dm.forEach((value, deviceId) => {
          actual += value
          baseline += (devicePowerMap.get(deviceId) || 0) * BASELINE_HOURS_PER_DAY
        })
        const saved = Math.max(0, baseline - actual)
        return { day: formatShortDate(date), saved: Math.round(saved * 100) / 100 }
      })
  }, [rawRows, devicePowerMap])

  const hourBuckets = useMemo(() => {
    return HOUR_BUCKETS.map((bucket) => {
      const total = rawRows
        .filter((r) => { const h = hourFromRow(r); return h >= bucket.from && h < bucket.to })
        .reduce((sum, r) => sum + Number(r.consumption || 0), 0)
      const potentialTrees = treesFromEnergyKWh(total * 0.5)
      return {
        ...bucket,
        total: Math.round(total * 100) / 100,
        potentialTrees: Math.round(potentialTrees * 1000) / 1000,
      }
    })
  }, [rawRows])

  const totals = useMemo(() => {
    const totalSaved = monthlySavings.reduce((s, m) => s + m.saved, 0)
    const totalTrees = monthlySavings.reduce((s, m) => s + m.trees, 0)
    return { totalSaved: Math.round(totalSaved * 100) / 100, totalTrees: Math.round(totalTrees * 100) / 100 }
  }, [monthlySavings])

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
          <Leaf size={28} />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Ringkasan Energi Hijau</h2>
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-1 mt-2">
            <p><span className="text-2xl font-black text-[#2f46a3]">{totals.totalSaved.toLocaleString('id-ID')}</span> <span className="text-xs font-bold text-slate-400">kWh dihemat</span></p>
            <p><span className="text-2xl font-black text-emerald-600">{totals.totalTrees.toLocaleString('id-ID')}</span> <span className="text-xs font-bold text-slate-400">pohon setara</span></p>
          </div>
          <div className="flex items-start gap-1.5 mt-3 text-[11px] text-slate-500">
            <Info size={13} className="mt-0.5 shrink-0" />
            <p>Estimasi berdasarkan asumsi baseline pemakaian 12 jam/hari operasional penuh vs konsumsi aktual — bukan pengukuran langsung.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-1">Tabel Penghematan per Bulan</h3>
        <p className="text-xs text-gray-500 mb-4">Baseline: daya terpasang × 12 jam/hari × jumlah hari data tersedia pada bulan tsb.</p>
        {monthlySavings.length === 0 ? <EmptyState /> : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-black uppercase tracking-wider">
                  <th className="py-2.5 px-3">Bulan</th>
                  <th className="py-2.5 px-3 text-right">Total Pemakaian (kWh)</th>
                  <th className="py-2.5 px-3 text-right">Energi Dihemat (kWh)</th>
                  <th className="py-2.5 px-3 text-right">Pohon Setara</th>
                  <th className="py-2.5 px-3 text-right">% Penghematan</th>
                  <th className="py-2.5 px-3">Penilaian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {monthlySavings.map((row) => {
                  const tier = savingsTier(row.pct)
                  return (
                    <tr key={row.monthKey} className="odd:bg-white even:bg-slate-50/40 hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{formatMonthLabel(row.monthKey)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{row.totalActual.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700">{row.saved.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{row.trees.toFixed(3)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{row.pct.toFixed(1)}%</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${tier.className}`}>{tier.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Performa Hijau per Perangkat</h3>
          {perDeviceSavings.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={Math.max(260, perDeviceSavings.length * 28)}>
              <BarChart data={perDeviceSavings} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" stroke="#6b7280" label={{ value: 'Pohon setara', position: 'insideBottom', offset: -3, fontSize: 11 }} />
                <YAxis type="category" dataKey="device" stroke="#6b7280" width={160} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Bar dataKey="trees" fill="#10b981" name="Pohon setara" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Tren Penghematan Harian</h3>
          {dailySavings.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailySavings}>
                <defs>
                  <linearGradient id="colorSaved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#6b7280" minTickGap={18} />
                <YAxis stroke="#6b7280" label={{ value: 'kWh', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Legend />
                <Area type="monotone" dataKey="saved" stroke="#10b981" strokeWidth={2} fill="url(#colorSaved)" name="Energi Dihemat (kWh)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-1">Analisis Peluang Penghematan</h3>
        <p className="text-xs text-gray-500 mb-4">Pemakaian dikelompokkan per periode waktu untuk periode yang sedang dipilih.</p>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-black uppercase tracking-wider">
                <th className="py-2.5 px-3">Periode</th>
                <th className="py-2.5 px-3 text-right">Total Pemakaian (kWh)</th>
                <th className="py-2.5 px-3">Rekomendasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {hourBuckets.map((bucket) => (
                <tr key={bucket.key} className="odd:bg-white even:bg-slate-50/40 hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{bucket.label}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{bucket.total.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-emerald-700">
                    Mengurangi 50% pemakaian bisa menghemat {bucket.potentialTrees.toFixed(3)} pohon
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 text-center max-w-2xl mx-auto pb-2">
        Estimasi: 1 kWh energi ≈ {CO2_TON_PER_KWH} ton CO₂; 1 pohon dewasa menyerap ≈ {CO2_TON_ABSORBED_PER_TREE_PER_YEAR} ton CO₂/tahun.
      </p>
    </div>
  )
}
