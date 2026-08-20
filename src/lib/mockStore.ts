/**
 * Store mutable ber-localStorage untuk mode demo. Semua CRUD/kontrol dari
 * mockBackend.ts membaca & menulis lewat store ini, supaya perubahan yang
 * dibuat pengguna selama sesi (tambah perangkat, kontrol ON/OFF, tambah user,
 * dst) tetap ada walau halaman di-refresh — terasa seperti backend
 * sungguhan yang "mengingat", padahal semuanya di browser.
 */

import {
  buildLiveDevices,
  seedClasses,
  seedDeviceTypes,
  seedUsers,
  seedAlerts,
  seedRoomOccupants,
  seedDeviceSchedules,
  seedAuditLogs,
  type MockClass,
  type MockDeviceType,
  type MockDevice,
  type MockUser,
  type MockAlert,
  type MockRoomOccupant,
  type MockDeviceSchedule,
  type MockAuditLog,
} from './mockData'

// Bump versi ini untuk memaksa reset data demo yang basi tanpa perlu user
// membersihkan localStorage manual (mis. setelah struktur seed berubah).
const STORE_VERSION = 'sier_demo_v1'
const STORE_KEY = 'sier_demo_store_v1'

export interface MockStoreState {
  version: string
  classes: MockClass[]
  deviceTypes: MockDeviceType[]
  devices: MockDevice[]
  users: MockUser[]
  alerts: MockAlert[]
  roomOccupants: MockRoomOccupant[]
  deviceSchedules: MockDeviceSchedule[]
  auditLogs: MockAuditLog[]
  nextIds: Record<string, number>
}

function maxId(items: Array<{ id: number }>): number {
  return items.reduce((max, item) => Math.max(max, item.id), 0)
}

function buildInitialState(): MockStoreState {
  const devices = buildLiveDevices()
  const classes = seedClasses.map((c) => ({ ...c }))
  const deviceTypes = seedDeviceTypes.map((t) => ({ ...t }))
  const users = seedUsers.map((u) => ({ ...u }))
  const alerts = seedAlerts.map((a) => ({ ...a }))
  const roomOccupants = seedRoomOccupants.map((r) => ({ ...r }))
  const deviceSchedules = seedDeviceSchedules.map((s) => ({ ...s }))
  const auditLogs = seedAuditLogs.map((l) => ({ ...l }))

  return {
    version: STORE_VERSION,
    classes,
    deviceTypes,
    devices,
    users,
    alerts,
    roomOccupants,
    deviceSchedules,
    auditLogs,
    nextIds: {
      class: maxId(classes) + 1,
      deviceType: maxId(deviceTypes) + 1,
      device: maxId(devices) + 1,
      user: maxId(users) + 1,
      alert: maxId(alerts) + 1,
      roomOccupant: maxId(roomOccupants) + 1,
      deviceSchedule: maxId(deviceSchedules) + 1,
      auditLog: maxId(auditLogs) + 1,
    },
  }
}

let state: MockStoreState | null = null

function persist() {
  if (!state) return
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(state))
  } catch {
    // Kuota localStorage penuh -- perubahan tetap ada di memori untuk sesi ini
  }
}

function load(): MockStoreState {
  if (state) return state

  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(STORE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as MockStoreState
        if (parsed.version === STORE_VERSION) {
          state = parsed
          return state
        }
      }
    } catch {
      // Data korup/format lama -- jatuh ke rebuild di bawah
    }
  }

  state = buildInitialState()
  persist()
  return state
}

export function getStore(): MockStoreState {
  return load()
}

export function nextId(kind: keyof MockStoreState['nextIds']): number {
  const s = load()
  const id = s.nextIds[kind]
  s.nextIds[kind] = id + 1
  return id
}

export function saveStore() {
  persist()
}

export function resetDemoData() {
  state = buildInitialState()
  persist()
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem('sier_demo_consumption_v1')
    } catch {
      // tidak fatal
    }
  }
}
