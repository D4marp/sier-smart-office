// Helper bersama untuk dashboard energi fakultas: agregasi tanggal/minggu/bulan
// dan format data untuk grafik Recharts. Dipakai oleh dashboard fakultas generik
// (src/app/fakultas/[code]/page.tsx) agar setiap fakultas (Psikologi, FIKK, dst.)
// memakai logika agregasi yang identik.

export interface Device {
  id: number
  class_id: number
  device_eui: string
  device_name: string
  device_type: string
  application_type?: string
  location: string
  current_power: number
  current_temperature: number
  power_rating?: number
  iot_status: string
  status?: string
}

export interface ChartDataPoint {
  time: string
  ac: number
  lamp: number
}

export interface MonthlyTrendPoint {
  month: string
  ac: number
  lamp: number
  sensorTemp: number
  sensorHumidity: number
}

export type EnergyRange = 'day' | 'week' | 'month'

export const monthNamesMap: Record<string, string> = {
  Jan: 'Jan', Feb: 'Feb', Mar: 'Mar', Apr: 'Apr', May: 'Mei', Jun: 'Jun',
  Jul: 'Jul', Aug: 'Ags', Sep: 'Sep', Oct: 'Okt', Nov: 'Nov', Dec: 'Des',
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getConsumptionDate(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') {
    return value.includes('T') ? value.split('T')[0] : value.slice(0, 10)
  }
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? '' : formatLocalDate(date)
}

export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map((item) => parseInt(item, 10))
  return new Date(year, month - 1, day)
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  next.setDate(next.getDate() + days)
  return next
}

export function formatShortDate(value: string): string {
  return parseLocalDate(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export function getIsoDay(date: Date): number {
  const day = date.getDay()
  return day === 0 ? 7 : day
}

export function buildDateWindow(anchor: Date, days: number): string[] {
  const dates: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    dates.push(formatLocalDate(addDays(anchor, -i)))
  }
  return dates
}

export function buildMonthWorkWeekPeriods(anchor: Date) {
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

    return {
      label: `Minggu ke ${index + 1}`,
      dates,
    }
  })
}

export function formatMonthlyTrendSummary(summary: any[] = []): MonthlyTrendPoint[] {
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

export function isDeviceOnline(device: Device): boolean {
  const iot = String(device.iot_status || '').toLowerCase()
  const status = String(device.status || '').toLowerCase()
  return iot === 'online' || iot === 'active' || status === 'active' || status === 'idle'
}
