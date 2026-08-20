/**
 * Generator konsumsi energi (device_consumption) untuk mode demo — 30 hari
 * terakhir, per jam, hanya untuk device AC/LAMP (sama seperti pola nyata di
 * backend/scripts/seed_consumption_sier.js). Dibuat on-demand (bukan JSON
 * raksasa yang di-bundle) supaya ukuran build statis tetap wajar, lalu
 * di-cache di memori + localStorage supaya panggilan berikutnya dalam sesi
 * yang sama cepat dan tidak berubah-ubah acak setiap dipanggil.
 */

import { seedDevicesRaw, dailyRandom, type MockDevice } from './index'

export interface MockConsumptionRow {
  id: number
  device_id: number
  id_class: string | null
  occupancy: number
  power_ac: number | null
  power_lamp: number | null
  consumption: number
  consumption_date: string
  hour_start: string
  hour_end: string
  temperature: number | null
  humidity: number | null
  device_name: string
  device_type: string
  class_id: number
  class_name: string
}

const DAYS_BACK = 30
const CACHE_KEY = 'sier_demo_consumption_v1'

let memoryCache: MockConsumptionRow[] | null = null

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

// Faktor okupansi kantor per jam: rendah malam/dini hari, puncak jam kerja 08-17.
// Sama seperti backend/scripts/seed_consumption_sier.js supaya angkanya konsisten
// dengan pola yang sudah dipakai sebelumnya di data demo backend.
function hourActivityFactor(hour: number, weekend: boolean, rnd: () => number): number {
  if (weekend) return hour >= 8 && hour <= 16 ? 0.15 : 0.03
  if (hour < 6 || hour >= 21) return 0.05
  if (hour >= 8 && hour <= 17) return 0.75 + rnd() * 0.25
  return 0.25 + rnd() * 0.2
}

function generate(): MockConsumptionRow[] {
  const rnd = dailyRandom('consumption')
  const devices = seedDevicesRaw.filter((d) => d.device_type === 'AC' || d.device_type === 'LAMP')
  const rows: MockConsumptionRow[] = []
  const now = new Date()
  let id = 1

  for (let dayOffset = DAYS_BACK - 1; dayOffset >= 0; dayOffset--) {
    const targetDate = new Date(now)
    targetDate.setDate(now.getDate() - dayOffset)
    const dateStr = formatLocalDate(targetDate)
    const weekend = isWeekend(targetDate)

    for (let hour = 0; hour < 24; hour++) {
      const hourStart = `${String(hour).padStart(2, '0')}:00:00`
      const hourEnd = `${String((hour + 1) % 24).padStart(2, '0')}:00:00`
      const factor = hourActivityFactor(hour, weekend, rnd)

      for (const device of devices as MockDevice[]) {
        const rating = Number(device.power_rating) || (device.device_type === 'AC' ? 1.5 : 0.1)
        const occupancy = factor > 0.3 && rnd() < factor ? 1 : 0
        const noise = 0.85 + rnd() * 0.3
        const powerAc = device.device_type === 'AC' ? Number((rating * factor * noise).toFixed(4)) : 0
        const powerLamp = device.device_type === 'LAMP' ? Number((rating * factor * noise).toFixed(4)) : 0
        const consumption = Number((powerAc + powerLamp).toFixed(4))
        const temperature = device.device_type === 'AC' ? Number((23 + rnd() * 3).toFixed(1)) : null

        rows.push({
          id: id++,
          device_id: device.id,
          id_class: null,
          occupancy,
          power_ac: powerAc || null,
          power_lamp: powerLamp || null,
          consumption,
          consumption_date: dateStr,
          hour_start: hourStart,
          hour_end: hourEnd,
          temperature,
          humidity: null,
          device_name: device.device_name,
          device_type: device.device_type,
          class_id: device.class_id,
          class_name: device.class_name,
        })
      }
    }
  }

  return rows
}

export function getConsumptionRows(): MockConsumptionRow[] {
  if (memoryCache) return memoryCache

  if (typeof window !== 'undefined') {
    try {
      const cached = window.localStorage.getItem(CACHE_KEY)
      if (cached) {
        memoryCache = JSON.parse(cached) as MockConsumptionRow[]
        return memoryCache
      }
    } catch {
      // localStorage tidak tersedia/rusak -- lanjut generate ulang
    }
  }

  const rows = generate()
  memoryCache = rows

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(rows))
    } catch {
      // Kuota localStorage penuh -- tidak fatal, cache memori tetap jalan
    }
  }

  return rows
}
