/**
 * Data seed statis untuk mode demo (NEXT_PUBLIC_DEMO_MODE=true).
 *
 * Sumber utama (classes/devices/device_types) adalah data seed ASLI gedung
 * kantor PT SIER (lihat backend/database/seed_sier.sql) — diekspor apa
 * adanya sebagai JSON supaya build statis tidak butuh MySQL/Express sama
 * sekali. Data tambahan (users, alerts) ditulis manual di sini, mengikuti
 * nada/gaya Bahasa Indonesia yang sama dengan sisa aplikasi.
 */

import classesJson from './classes.json'
import devicesJson from './devices.json'
import deviceTypesJson from './device_types.json'

// ---- PRNG kecil (mulberry32), di-seed dari tanggal (YYYY-MM-DD) supaya ----
// nilai "acak" demo stabil sepanjang hari yang sama, tapi tidak selalu identik
// dari hari ke hari (tidak terasa seperti screenshot beku).
export function mulberry32(seed: number) {
  let a = seed
  return function random() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashStringToInt(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return hash
}

export function todaySeedKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function dailyRandom(salt = ''): () => number {
  return mulberry32(hashStringToInt(todaySeedKey() + salt))
}

// ---- Tipe data ----
export interface MockClass {
  id: number
  area: string | null
  name: string
  floor: number | null
  status: string
  building: string
  capacity: number | null
  description: string
}

export interface MockDeviceType {
  id: number
  code: string
  icon: string
  label: string
  status: string
  category: string
  controllable: number
}

export interface MockDevice {
  id: number
  brand: string
  model: string
  status: string
  class_id: number
  location: string
  class_name: string
  device_eui: string
  iot_status: string
  device_name: string
  device_type: string
  power_rating: number
  application_type: string
  efficiency_rating: number
  notes?: string | null
  current_power?: number
  current_temperature?: number | null
  last_heartbeat?: string | null
  last_reading?: string | null
}

export interface MockUser {
  id: number
  full_name: string
  email: string
  password: string
  role: 'superadmin' | 'admin' | 'manager' | 'viewer'
  is_active: boolean
  tenant_code: string | null
  tenant_name: string | null
  last_login: string | null
  created_at: string
}

export interface MockAlert {
  id: number
  device_id: number | null
  class_id: number | null
  type: 'warning' | 'info' | 'success' | 'error'
  title: string
  message: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'unread' | 'read'
  read_status: boolean
  created_at: string
}

export interface MockRoomOccupant {
  id: number
  class_id: number
  class_name?: string
  full_name: string
  email: string
  phone: string
  notify_email: boolean
  created_at: string
}

export interface MockDeviceSchedule {
  id: number
  device_id: number
  device_name?: string
  location?: string
  action: 'on' | 'off'
  time_of_day: string
  days_of_week: string
  is_active: boolean
  last_run_at: string | null
}

export interface MockAuditLog {
  id: number
  action: string
  device_id: number | null
  new_values: Record<string, unknown> | null
  created_at: string
  user_id: number | null
  device_name?: string
  location?: string
  source: 'app' | 'manual'
}

export const seedClasses: MockClass[] = classesJson as MockClass[]
export const seedDeviceTypes: MockDeviceType[] = deviceTypesJson as MockDeviceType[]
export const seedDevicesRaw: MockDevice[] = devicesJson as MockDevice[]

// ---- Users demo ----
// Kredensial admin@sier.id / sier12345 SUDAH didokumentasikan sebagai login
// demo yang berfungsi di aplikasi ini — jangan diganti.
export const seedUsers: MockUser[] = [
  {
    id: 1,
    full_name: 'Admin SIER',
    email: 'admin@sier.id',
    password: 'sier12345',
    role: 'superadmin',
    is_active: true,
    tenant_code: 'sier',
    tenant_name: 'PT SIER (Persero)',
    last_login: null,
    created_at: '2026-01-06T02:00:00.000Z',
  },
  {
    id: 2,
    full_name: 'Budi Santoso',
    email: 'budi.admin@sier.id',
    password: 'sier12345',
    role: 'admin',
    is_active: true,
    tenant_code: 'sier',
    tenant_name: 'PT SIER (Persero)',
    last_login: '2026-08-14T01:12:00.000Z',
    created_at: '2026-02-10T03:00:00.000Z',
  },
  {
    id: 3,
    full_name: 'Sri Wahyuni',
    email: 'sri.manager@sier.id',
    password: 'sier12345',
    role: 'manager',
    is_active: true,
    tenant_code: 'sier',
    tenant_name: 'PT SIER (Persero)',
    last_login: '2026-08-17T06:40:00.000Z',
    created_at: '2026-03-02T03:00:00.000Z',
  },
  {
    id: 4,
    full_name: 'Andi Prasetyo',
    email: 'andi.viewer@sier.id',
    password: 'sier12345',
    role: 'viewer',
    is_active: false,
    tenant_code: 'sier',
    tenant_name: 'PT SIER (Persero)',
    last_login: null,
    created_at: '2026-04-18T03:00:00.000Z',
  },
]

// ---- Alerts demo (DB asli 0 baris — sengaja diisi contoh masuk akal) ----
function findDeviceByEui(eui: string): MockDevice | undefined {
  return seedDevicesRaw.find((d) => d.device_eui === eui)
}

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

export const seedAlerts: MockAlert[] = [
  {
    id: 1,
    device_id: findDeviceByEui('RDP-AC-01')?.id ?? null,
    class_id: 5,
    type: 'warning',
    title: 'Konsumsi AC Ruang Direksi RDP melebihi ambang batas',
    message: 'Beban AC di Ruang Direksi RDP tercatat di atas 1.8 kW selama lebih dari 1 jam berturut-turut.',
    severity: 'high',
    status: 'unread',
    read_status: false,
    created_at: hoursAgoIso(3),
  },
  {
    id: 2,
    device_id: findDeviceByEui('RED-UG65-01')?.id ?? null,
    class_id: 1,
    type: 'info',
    title: 'Gateway LoRaWAN Ruang Meeting Red kembali online',
    message: 'Gateway Milesight UG65 di Ruang Meeting Red kembali terhubung setelah sempat idle.',
    severity: 'low',
    status: 'read',
    read_status: true,
    created_at: hoursAgoIso(20),
  },
  {
    id: 3,
    device_id: null,
    class_id: 4,
    type: 'success',
    title: 'Penambahan sensor Lt 4 selesai dikonfigurasi',
    message: 'Seluruh smart socket dan sensor presence di Tambahan Ruang Lt 4 berhasil terdaftar ke sistem.',
    severity: 'low',
    status: 'read',
    read_status: true,
    created_at: hoursAgoIso(48),
  },
  {
    id: 4,
    device_id: findDeviceByEui('RRW-AC-01')?.id ?? null,
    class_id: 6,
    type: 'warning',
    title: 'Suhu Ruang Direksi RRW di atas kenyamanan standar',
    message: 'Sensor mencatat suhu ruangan 27.4°C, di atas ambang batas kenyamanan 26°C selama jam kerja.',
    severity: 'medium',
    status: 'unread',
    read_status: false,
    created_at: hoursAgoIso(6),
  },
  {
    id: 5,
    device_id: null,
    class_id: null,
    type: 'info',
    title: 'Jadwal pemeliharaan rutin gateway LoRaWAN',
    message: 'Pemeliharaan rutin seluruh gateway Milesight UG65 dijadwalkan akhir pekan ini, kemungkinan ada gangguan singkat.',
    severity: 'low',
    status: 'unread',
    read_status: false,
    created_at: hoursAgoIso(30),
  },
  {
    id: 6,
    device_id: findDeviceByEui('KDV01-VK2200-01')?.id ?? null,
    class_id: 9,
    type: 'error',
    title: 'Control System Box Ruang Kadiv 1 tidak merespons',
    message: 'Perangkat Control System Box (ATEN VK2200) di Ruang Kadiv 1 tidak mengirim heartbeat selama lebih dari 2 jam.',
    severity: 'critical',
    status: 'unread',
    read_status: false,
    created_at: hoursAgoIso(2),
  },
]

// Kosong: sengaja mengikuti kondisi DB asli. Diisi user selama sesi demo lewat CRUD.
export const seedRoomOccupants: MockRoomOccupant[] = []
export const seedDeviceSchedules: MockDeviceSchedule[] = []
export const seedAuditLogs: MockAuditLog[] = []

// ---- Status "hidup" untuk devices, dihitung saat load (bukan hardcode di JSON) ----
// GATEWAY/CONTROLLER/INTERFACE/SENSOR -> selalu aktif & online (infrastruktur pendukung).
// AC/LAMP/SOCKET -> mengikuti jam kerja (aktif 08-17 kerja, idle di luar itu), dengan
// sedikit variasi acak per-device supaya tidak semua ON/OFF serentak.
const ALWAYS_ON_TYPES = new Set(['GATEWAY', 'CONTROLLER', 'INTERFACE', 'SENSOR'])

export function buildLiveDevices(): MockDevice[] {
  const rnd = dailyRandom('devices')
  const now = new Date()
  const hour = now.getHours()
  const isWeekend = now.getDay() === 0 || now.getDay() === 6
  const businessHours = !isWeekend && hour >= 8 && hour <= 17

  return seedDevicesRaw.map((raw) => {
    const device: MockDevice = { ...raw }
    const r = rnd()

    if (ALWAYS_ON_TYPES.has(device.device_type)) {
      device.status = 'active'
      device.iot_status = 'active'
      device.current_power = Number((device.power_rating * (0.85 + r * 0.3)).toFixed(4))
      device.current_temperature = null
      device.last_heartbeat = new Date(now.getTime() - Math.floor(r * 4) * 60 * 1000).toISOString()
      device.last_reading = device.last_heartbeat
      return device
    }

    // AC / LAMP / SOCKET: probabilitas aktif lebih tinggi di jam kerja.
    const activeProbability = businessHours ? 0.78 : 0.22
    const active = r < activeProbability

    device.status = active ? 'active' : 'idle'
    device.iot_status = 'active' // konektivitas online, terlepas dari status daya
    device.current_power = active ? Number((device.power_rating * (0.8 + rnd() * 0.35)).toFixed(4)) : 0

    if (device.device_type === 'AC') {
      device.current_temperature = active ? Number((22 + rnd() * 4).toFixed(1)) : null
    } else {
      device.current_temperature = null
    }

    device.last_heartbeat = new Date(now.getTime() - Math.floor(rnd() * 6) * 60 * 1000).toISOString()
    device.last_reading = active ? device.last_heartbeat : null

    return device
  })
}
