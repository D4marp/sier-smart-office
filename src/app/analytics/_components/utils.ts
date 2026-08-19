// Helper tanggal/agregasi bersama untuk semua tab halaman Analitik.
import type { RawConsumptionRow, MonthlyPoint, DailyPoint } from './types'

// ── Konversi energi hijau (formula sama dengan Metabase klien, jangan diubah
// tanpa konfirmasi ulang — angka harus tetap berarti sama bagi mereka) ──
export const CO2_TON_PER_KWH = 0.00070555
export const CO2_TON_ABSORBED_PER_TREE_PER_YEAR = 0.039
// Asumsi baseline "selalu menyala jam kerja" — bukan 24 jam, supaya tidak
// melebih-lebihkan penghematan.
export const BASELINE_HOURS_PER_DAY = 12

export function treesFromEnergyKWh(kwh: number): number {
  const safe = Math.max(0, kwh)
  return (safe * CO2_TON_PER_KWH) / CO2_TON_ABSORBED_PER_TREE_PER_YEAR
}

export function getLocalIsoDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseLocalDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function shiftDateByDays(date: string, daysBack: number) {
  const d = parseLocalDate(date)
  d.setDate(d.getDate() - daysBack)
  return getLocalIsoDate(d)
}

export function normalizeDateKey(value: any) {
  if (!value) return ''
  if (value instanceof Date) return getLocalIsoDate(value)
  const text = String(value)
  const isoMatch = text.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoMatch) return isoMatch[1]
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? '' : getLocalIsoDate(parsed)
}

export function formatShortDate(date: string) {
  return parseLocalDate(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export function sortRawRowsDesc(rows: RawConsumptionRow[]): RawConsumptionRow[] {
  return [...(rows || [])].sort((a, b) => {
    const keyA = `${a.consumption_date} ${a.hour_start}`
    const keyB = `${b.consumption_date} ${b.hour_start}`
    return keyB.localeCompare(keyA)
  })
}

export function buildMonthlySeries(apiRows: any[], months: number): MonthlyPoint[] {
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

export function buildDailyFromClassRows(apiRows: any[], startDate: string, endDate: string): DailyPoint[] {
  const totals: Record<string, { ac: number; lamp: number }> = {}

  ;(apiRows || []).forEach((row) => {
    const dateKey = normalizeDateKey(row.consumption_date || row.date)
    if (!dateKey) return

    if (!totals[dateKey]) totals[dateKey] = { ac: 0, lamp: 0 }

    const deviceType = String(row.device_type || '').toUpperCase()
    totals[dateKey].ac += row.power_ac !== null && row.power_ac !== undefined
      ? Number(row.power_ac || 0)
      : deviceType === 'AC' ? Number(row.consumption || 0) : 0
    totals[dateKey].lamp += row.power_lamp !== null && row.power_lamp !== undefined
      ? Number(row.power_lamp || 0)
      : deviceType === 'LAMP' || deviceType === 'LIGHT' || deviceType === 'LIGHTING' ? Number(row.consumption || 0) : 0
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

// ── Bucket mingguan (ISO week) — dipakai tren mingguan Utama/AC/Lampu ──
export function getIsoWeekKey(date: Date): { key: string; label: string; weekStart: string } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  const monday = new Date(date)
  monday.setDate(monday.getDate() - (dayNum - 1))
  return {
    key: `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`,
    label: `M${String(weekNo).padStart(2, '0')}`,
    weekStart: getLocalIsoDate(monday),
  }
}

export interface WeeklyPoint {
  week: string
  consumption: number
}

// Total konsumsi per minggu (ISO), untuk `weeksCount` minggu terakhir sampai hari ini.
export function buildWeeklyConsumption(rows: RawConsumptionRow[], weeksCount = 10): WeeklyPoint[] {
  const buckets = new Map<string, { label: string; weekStart: string; total: number }>()
  const today = new Date()

  for (let i = weeksCount - 1; i >= 0; i--) {
    const anchor = new Date(today)
    anchor.setDate(anchor.getDate() - i * 7)
    const { key, label, weekStart } = getIsoWeekKey(anchor)
    if (!buckets.has(key)) buckets.set(key, { label, weekStart, total: 0 })
  }

  rows.forEach((row) => {
    const dateKey = normalizeDateKey(row.consumption_date)
    if (!dateKey) return
    const { key } = getIsoWeekKey(parseLocalDate(dateKey))
    const bucket = buckets.get(key)
    if (bucket) bucket.total += Number(row.consumption || 0)
  })

  return [...buckets.entries()]
    .sort((a, b) => a[1].weekStart.localeCompare(b[1].weekStart))
    .map(([, v]) => ({ week: v.label, consumption: Math.round(v.total * 100) / 100 }))
}

// ── Bucket jam (Pagi/Siang/Sore-Malam/Dini Hari) ──
export const HOUR_BUCKETS = [
  { key: 'pagi', label: 'Pagi (06:00–12:00)', from: 6, to: 12 },
  { key: 'siang', label: 'Siang (12:00–18:00)', from: 12, to: 18 },
  { key: 'sore', label: 'Sore/Malam (18:00–24:00)', from: 18, to: 24 },
  { key: 'dini', label: 'Dini Hari (00:00–06:00)', from: 0, to: 6 },
] as const

export function hourFromRow(row: RawConsumptionRow): number {
  const raw = String(row.hour_start || '0:00')
  const hour = parseInt(raw.split(':')[0], 10)
  return Number.isNaN(hour) ? 0 : hour
}

// ── Tingkat badge penghematan bulanan. Ambang batas: sesuai penilaian tim
// (bukan angka dari klien) — >=40% dianggap "Sangat Baik", >=20% "Baik",
// sisanya "Cukup". Bisa disesuaikan bila klien punya patokan sendiri nanti.
export function savingsTier(pct: number): { label: string; className: string } {
  if (pct >= 40) return { label: 'Sangat Baik', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (pct >= 20) return { label: 'Baik', className: 'bg-amber-50 text-amber-700 border-amber-200' }
  return { label: 'Cukup', className: 'bg-slate-100 text-slate-600 border-slate-200' }
}

export function formatMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-')
  const year = parseInt(yearStr, 10)
  const monthIndex = parseInt(monthStr, 10) - 1
  if (Number.isNaN(year) || Number.isNaN(monthIndex)) return monthKey
  return new Date(year, monthIndex, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

export function formatDateTimeId(value: string | null | undefined): string {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function minutesSince(value: string | null | undefined): string {
  if (!value) return 'Belum pernah'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Belum pernah'
  const minutes = Math.round((Date.now() - parsed.getTime()) / 60000)
  if (minutes < 0) return '—'
  return `${minutes.toLocaleString('id-ID')} menit lalu`
}
