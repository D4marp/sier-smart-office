// Tipe bersama untuk semua tab halaman Analitik.
import type { Device as EnergyChartDevice } from '@/lib/energyChartUtils'

export interface RawConsumptionRow {
  id: number
  device_id: number
  device_name: string
  device_type: string
  class_name: string
  class_id?: number
  consumption_date: string
  hour_start: string
  power_ac: number | null
  power_lamp: number | null
  consumption: number
  temperature: number | null
  humidity: number | null
}

// Menambahkan field spesifik tabel status (last_heartbeat/last_reading) di atas
// tipe Device bersama (energyChartUtils) — supaya isDeviceOnline/isDevicePowerOn
// tetap kompatibel dengan device dari state halaman ini.
export interface Device extends EnergyChartDevice {
  id: number
  last_heartbeat?: string | null
  last_reading?: string | null
}

export interface MonthlyPoint {
  month: string
  ac: number
  lamp: number
}

export interface DailyPoint {
  day: string
  ac: number
  lamp: number
}

export interface DeviceComparisonPoint {
  device: string
  efficiency: number
  consumption: number
}

export type TabKey = 'utama' | 'energi-hijau' | 'ac' | 'lampu' | 'tabel'
