/**
 * Simulator backend in-browser untuk mode demo (NEXT_PUBLIC_DEMO_MODE=true).
 *
 * `mockApiCall(endpoint, options)` mem-parsing endpoint + method persis
 * seperti tabel rute Express asli (lihat backend/routes/*.js) dan
 * mengembalikan objek JSON yang bentuknya SAMA PERSIS dengan apa yang
 * dikembalikan response.json() dari backend sungguhan — supaya setiap method
 * di apiClient.ts (classesAPI, devicesAPI, dst) berperilaku identik dari
 * sudut pandang pemanggil, hanya saja dibekukan oleh data di localStorage,
 * bukan MySQL/Express beneran.
 */

import { APIError } from './apiError'
import { getStore, nextId, saveStore } from './mockStore'
import { getConsumptionRows, type MockConsumptionRow } from './mockData/consumption'
import type { MockDevice, MockUser, MockAlert } from './mockData'

// ---------------------------------------------------------------------------
// Util umum
// ---------------------------------------------------------------------------

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 250))
}

function nowIso(): string {
  return new Date().toISOString()
}

interface ParsedEndpoint {
  segments: string[]
  params: URLSearchParams
}

function parseEndpoint(endpoint: string): ParsedEndpoint {
  const [pathname, queryString] = endpoint.split('?')
  const segments = pathname.split('/').filter(Boolean)
  return { segments, params: new URLSearchParams(queryString || '') }
}

function matchPath(segments: string[], pattern: string[]): Record<string, string> | null {
  if (segments.length !== pattern.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < pattern.length; i++) {
    const p = pattern[i]
    if (p.startsWith(':')) {
      params[p.slice(1)] = decodeURIComponent(segments[i])
    } else if (p !== segments[i]) {
      return null
    }
  }
  return params
}

function parseBody(options: RequestInit): any {
  if (!options.body) return {}
  try {
    return JSON.parse(options.body as string)
  } catch {
    return {}
  }
}

function methodOf(options: RequestInit): string {
  return (options.method || 'GET').toUpperCase()
}

// ---------------------------------------------------------------------------
// Sesi demo (pengganti cookie httpOnly — tidak ada server yang bisa
// menyetelnya di build statis, jadi dipakai flag localStorage biasa)
// ---------------------------------------------------------------------------

const SESSION_KEY = 'demo_session'

interface DemoSession {
  userId: number
  loginAt: string
}

function readSession(): DemoSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as DemoSession) : null
  } catch {
    return null
  }
}

function writeSession(session: DemoSession | null) {
  if (typeof window === 'undefined') return
  if (session) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } else {
    window.localStorage.removeItem(SESSION_KEY)
  }
}

function currentUserId(): number | null {
  return readSession()?.userId ?? null
}

function sanitizeUser(user: MockUser) {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
    last_login: user.last_login,
    tenant_code: user.tenant_code,
    tenant_name: user.tenant_name,
  }
}

// ---------------------------------------------------------------------------
// Audit log helper — dipakai oleh semua jalur kontrol perangkat supaya
// halaman Log Aktivitas terasa "hidup" selama sesi demo.
// ---------------------------------------------------------------------------

function logDeviceAction(action: string, device: MockDevice, newValues: Record<string, unknown>) {
  const store = getStore()
  store.auditLogs.unshift({
    id: nextId('auditLog'),
    action,
    device_id: device.id,
    new_values: newValues,
    created_at: nowIso(),
    user_id: currentUserId(),
    device_name: device.device_name,
    location: device.location,
    source: 'app',
  })
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const mockAuth = {
  async login(body: any) {
    const { email, password } = body
    if (!email || !password) {
      throw new APIError(400, 'Email and password are required')
    }
    const store = getStore()
    const user = store.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase())
    if (!user || !user.is_active || user.password !== password) {
      throw new APIError(401, 'Email atau password salah')
    }
    user.last_login = nowIso()
    saveStore()
    writeSession({ userId: user.id, loginAt: nowIso() })
    return {
      success: true,
      message: 'Login successful',
      data: {
        token: `demo-token-${user.id}`,
        user: sanitizeUser(user),
      },
    }
  },

  async me() {
    const session = readSession()
    if (!session) {
      throw new APIError(401, 'Authentication required')
    }
    const store = getStore()
    const user = store.users.find((u) => u.id === session.userId)
    if (!user) {
      throw new APIError(404, 'User not found')
    }
    return { success: true, data: sanitizeUser(user) }
  },

  async updateProfile(body: any) {
    const session = readSession()
    if (!session) {
      throw new APIError(401, 'Authentication required')
    }
    const store = getStore()
    const user = store.users.find((u) => u.id === session.userId)
    if (!user) {
      throw new APIError(404, 'User not found')
    }
    if (body.full_name !== undefined) user.full_name = body.full_name
    if (body.email !== undefined) user.email = body.email
    if (body.password) user.password = body.password
    saveStore()
    return { success: true, message: 'Profile updated successfully', data: sanitizeUser(user) }
  },

  async logout() {
    writeSession(null)
    return { success: true, message: 'Logged out successfully' }
  },
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

const mockUsers = {
  async getAll() {
    const store = getStore()
    return { success: true, data: store.users.map(sanitizeUser) }
  },

  async create(body: any) {
    const { full_name, email, password, role = 'viewer', is_active = true } = body
    if (!full_name || !email || !password) {
      throw new APIError(400, 'full_name, email, and password are required')
    }
    const store = getStore()
    if (store.users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
      throw new APIError(409, 'Email sudah terdaftar')
    }
    const user: MockUser = {
      id: nextId('user'),
      full_name,
      email,
      password,
      role,
      is_active: !!is_active,
      tenant_code: role === 'superadmin' ? null : (body.tenant_code || 'sier'),
      tenant_name: role === 'superadmin' ? null : 'PT SIER (Persero)',
      last_login: null,
      created_at: nowIso(),
    }
    store.users.push(user)
    saveStore()
    return { success: true, message: 'User created successfully', data: sanitizeUser(user) }
  },

  async update(id: number, body: any) {
    const store = getStore()
    const user = store.users.find((u) => u.id === id)
    if (!user) {
      throw new APIError(404, 'User not found')
    }
    if (body.full_name !== undefined) user.full_name = body.full_name
    if (body.email !== undefined) user.email = body.email
    if (body.password) user.password = body.password
    if (body.role !== undefined) user.role = body.role
    if (body.is_active !== undefined) user.is_active = !!body.is_active
    if (body.tenant_code !== undefined) user.tenant_code = body.tenant_code
    saveStore()
    return { success: true, message: 'User updated successfully', data: sanitizeUser(user) }
  },

  async delete(id: number) {
    const store = getStore()
    if (id === 1) {
      // Akun demo utama (admin@sier.id) tidak boleh hilang — kalau tidak,
      // tidak ada cara login lagi setelah refresh di build statis.
      throw new APIError(400, 'Akun admin demo tidak dapat dihapus')
    }
    if (currentUserId() === id) {
      throw new APIError(400, 'You cannot delete your own account')
    }
    const idx = store.users.findIndex((u) => u.id === id)
    if (idx === -1) {
      throw new APIError(404, 'User not found')
    }
    store.users.splice(idx, 1)
    saveStore()
    return { success: true, message: 'User deleted successfully' }
  },
}

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------

const mockClasses = {
  async getAll() {
    const store = getStore()
    return { success: true, data: store.classes.filter((c) => c.status === 'active') }
  },

  async getById(id: number) {
    const store = getStore()
    const cls = store.classes.find((c) => c.id === id)
    if (!cls) throw new APIError(404, 'Class not found')
    return { success: true, data: cls }
  },

  async create(body: any) {
    if (!body.name) throw new APIError(400, 'Name is required')
    const store = getStore()
    const cls = {
      id: nextId('class'),
      area: body.area ?? null,
      name: body.name,
      floor: body.floor ?? null,
      status: 'active',
      building: body.building ?? 'Gedung Kantor SIER',
      capacity: body.capacity ?? null,
      description: body.description ?? '',
    }
    store.classes.push(cls)
    saveStore()
    return { success: true, message: 'Class created successfully', data: cls }
  },

  async update(id: number, body: any) {
    const store = getStore()
    const cls = store.classes.find((c) => c.id === id)
    if (!cls) throw new APIError(404, 'Class not found')
    Object.assign(cls, {
      name: body.name ?? cls.name,
      description: body.description ?? cls.description,
      building: body.building ?? cls.building,
      floor: body.floor ?? cls.floor,
      area: body.area ?? cls.area,
      capacity: body.capacity ?? cls.capacity,
      status: body.status ?? cls.status,
    })
    saveStore()
    return { success: true, message: 'Class updated successfully' }
  },

  async delete(id: number) {
    const store = getStore()
    const idx = store.classes.findIndex((c) => c.id === id)
    if (idx === -1) throw new APIError(404, 'Class not found')
    store.classes.splice(idx, 1)
    saveStore()
    return { success: true, message: 'Class deleted successfully' }
  },
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

function todayConsumptionFor(deviceId: number): MockConsumptionRow[] {
  const today = new Date().toISOString().slice(0, 10)
  return getConsumptionRows().filter((r) => r.device_id === deviceId && r.consumption_date === today)
}

function attachConsumption(device: MockDevice) {
  return { ...device, consumption: todayConsumptionFor(device.id) }
}

function normalizeLocation(value: string): string {
  return String(value || '').toLowerCase().replace(/\./g, '').trim()
}

function devicesInClass(classCode: string): MockDevice[] {
  const store = getStore()
  const exact = store.devices.filter((d) => d.location === classCode)
  if (exact.length) return exact
  const normalized = normalizeLocation(classCode)
  return store.devices.filter((d) => normalizeLocation(d.location) === normalized)
}

// Indeks unit fisik (1 atau 2) dari akhiran device_eui, mis. "RDP-AC-01" -> 1,
// "RDP-AC-02" -> 2. Dipakai untuk ruangan dengan 2 unit AC/lampu (Direksi RDP/RRW).
function deviceUnitIndex(device: MockDevice): number {
  const match = String(device.device_eui || '').match(/-0*(\d+)$/)
  if (!match) return 1
  const n = parseInt(match[1], 10)
  return n === 2 ? 2 : 1
}

function deviceMatchesControlType(device: MockDevice, deviceType: string): boolean {
  const type = String(deviceType || '').toLowerCase()
  const isUnit = /^(ac|lamp)[12]$/.test(type)
  const base = isUnit ? type.slice(0, -1) : type
  const unitIndex = isUnit ? Number(type.slice(-1)) : null

  let matchesBase = false
  if (base === 'ac') matchesBase = device.device_type === 'AC'
  else if (base === 'lamp') matchesBase = device.device_type === 'LAMP'
  else if (base === 'projector') matchesBase = device.device_type === 'PROJECTOR'

  if (!matchesBase) return false
  if (unitIndex === null) return true
  return deviceUnitIndex(device) === unitIndex
}

function applyControlToDevices(devices: MockDevice[], action: 'on' | 'off', logAction = true) {
  const nextStatus = action === 'on' ? 'active' : 'idle'
  devices.forEach((device) => {
    if (device.device_type === 'SENSOR') return
    device.status = nextStatus
    device.iot_status = 'active'
    device.current_power = nextStatus === 'active' ? Number((device.power_rating * (0.85 + Math.random() * 0.3)).toFixed(4)) : 0
    device.last_heartbeat = nowIso()
    if (nextStatus === 'active') device.last_reading = nowIso()
    if (logAction) logDeviceAction(`device_${action}`, device, { status: nextStatus })
  })
  saveStore()
}

const mockDevices = {
  async getAll() {
    const store = getStore()
    return { success: true, data: store.devices.map(attachConsumption) }
  },

  async getById(id: number) {
    const store = getStore()
    const device = store.devices.find((d) => d.id === id)
    if (!device) throw new APIError(404, 'Device not found')
    return { success: true, data: attachConsumption(device) }
  },

  async getByClass(classId: number) {
    const store = getStore()
    const devices = store.devices.filter((d) => d.class_id === classId)
    return { success: true, data: devices.map(attachConsumption) }
  },

  async getByClassCode(classCode: string) {
    return { success: true, data: devicesInClass(classCode).map(attachConsumption) }
  },

  async getByType(type: string) {
    const store = getStore()
    return { success: true, data: store.devices.filter((d) => d.device_type === type) }
  },

  async create(body: any) {
    const finalName = body.device_name || body.name
    const finalType = body.device_type || body.type
    if (!body.class_id || !finalName || !finalType || !body.power_rating) {
      throw new APIError(400, 'class_id, name (or device_name), type (or device_type), and power_rating are required')
    }
    const store = getStore()
    const cls = store.classes.find((c) => c.id === Number(body.class_id))
    const device: MockDevice = {
      id: nextId('device'),
      brand: body.brand || '',
      model: body.model || '',
      status: 'idle',
      class_id: Number(body.class_id),
      location: body.location || cls?.name || '',
      class_name: cls?.name || body.location || '',
      device_eui: body.device_eui || `DEMO-${Date.now()}`,
      iot_status: 'active',
      device_name: finalName,
      device_type: finalType,
      power_rating: Number(body.power_rating) || 0,
      application_type: body.application_type || '',
      efficiency_rating: Number(body.efficiency_rating) || 95,
      notes: body.notes || null,
      current_power: 0,
      current_temperature: null,
      last_heartbeat: nowIso(),
      last_reading: null,
    }
    store.devices.push(device)
    saveStore()
    return { success: true, message: 'Device created successfully', data: device }
  },

  async update(id: number, body: any) {
    const store = getStore()
    const device = store.devices.find((d) => d.id === id)
    if (!device) throw new APIError(404, 'Device not found')
    const finalName = body.device_name || body.name
    const finalType = body.device_type || body.type
    Object.assign(device, {
      class_id: body.class_id !== undefined ? Number(body.class_id) : device.class_id,
      device_name: finalName ?? device.device_name,
      device_type: finalType ?? device.device_type,
      brand: body.brand ?? device.brand,
      model: body.model ?? device.model,
      power_rating: body.power_rating !== undefined ? Number(body.power_rating) : device.power_rating,
      efficiency_rating: body.efficiency_rating !== undefined ? Number(body.efficiency_rating) : device.efficiency_rating,
      notes: body.notes ?? device.notes,
      location: body.location ?? device.location,
      application_type: body.application_type ?? device.application_type,
    })
    saveStore()
    return { success: true, message: 'Device updated successfully' }
  },

  async updateStatus(id: number, body: any) {
    const { status } = body
    if (!status || !['active', 'idle', 'offline', 'maintenance'].includes(status)) {
      throw new APIError(400, 'Invalid status. Must be: active, idle, offline, or maintenance')
    }
    const store = getStore()
    const device = store.devices.find((d) => d.id === id)
    if (!device) throw new APIError(404, 'Device not found')
    device.status = status
    device.iot_status = status === 'active' || status === 'idle' ? 'active' : 'inactive'
    if (status === 'active' || status === 'idle') device.last_heartbeat = nowIso()
    saveStore()
    return { success: true, message: 'Device status updated successfully', data: { id, status } }
  },

  async control(id: number, body: any) {
    const action = String(body.action || body.state || '').toLowerCase()
    if (!['on', 'off'].includes(action)) {
      throw new APIError(400, 'Invalid action. Must be on or off')
    }
    const store = getStore()
    const device = store.devices.find((d) => d.id === id)
    if (!device) throw new APIError(404, 'Device not found')
    applyControlToDevices([device], action as 'on' | 'off')
    return {
      success: true,
      message: `Device ${action.toUpperCase()} command sent successfully`,
      data: { id, action, status: device.status },
    }
  },

  async controlByClassCode(classCode: string, body: any) {
    const action = String(body.action || body.state || '').toLowerCase()
    if (!['on', 'off'].includes(action)) {
      throw new APIError(400, 'Invalid action. Must be on or off')
    }
    const devices = devicesInClass(classCode)
    if (!devices.length) throw new APIError(404, `No devices found for class ${classCode}`)
    applyControlToDevices(devices, action as 'on' | 'off')
    return {
      success: true,
      message: `Class ${classCode} ${action.toUpperCase()} command sent to devices`,
      data: { classCode, action, status: action === 'on' ? 'active' : 'idle', affectedDevices: devices.length },
    }
  },

  async controlByClassCodeAndType(classCode: string, deviceType: string, body: any) {
    const action = String(body.action || body.state || '').toLowerCase()
    if (!['on', 'off'].includes(action)) {
      throw new APIError(400, 'Invalid action. Must be on or off')
    }
    const devices = devicesInClass(classCode).filter((d) => deviceMatchesControlType(d, deviceType))
    applyControlToDevices(devices, action as 'on' | 'off')
    return {
      success: true,
      message: `${deviceType.toUpperCase()} ${classCode} command ${action.toUpperCase()} sent successfully`,
      data: {
        classCode,
        deviceType,
        action,
        status: action === 'on' ? 'active' : 'idle',
        affectedDevices: devices.length,
      },
    }
  },

  async delete(id: number) {
    const store = getStore()
    const idx = store.devices.findIndex((d) => d.id === id)
    if (idx === -1) throw new APIError(404, 'Device not found')
    store.devices.splice(idx, 1)
    saveStore()
    return { success: true, message: 'Device deleted successfully' }
  },

  async getTelemetry(id: number) {
    const store = getStore()
    const device = store.devices.find((d) => d.id === id)
    if (!device) throw new APIError(404, 'Device not found')
    // Belum ada histori uplink IoT nyata di mode demo -- konsisten dengan
    // perilaku backend asli untuk device yang belum pernah mengirim uplink.
    return { success: true, data: null }
  },

  async restart(id: number) {
    const store = getStore()
    const device = store.devices.find((d) => d.id === id)
    if (!device) throw new APIError(404, 'Device not found')
    logDeviceAction('device_restart_requested', device, { device_eui: device.device_eui })
    return {
      success: true,
      message: 'Perintah restart dicatat. Belum terhubung ke hardware asli — perlu integrasi protokol vendor (LoRaWAN/UG65) untuk benar-benar mengeksekusi.',
      data: { id, status: 'pending' },
    }
  },
}

// ---------------------------------------------------------------------------
// Device Types
// ---------------------------------------------------------------------------

const mockDeviceTypes = {
  async getAll() {
    const store = getStore()
    return { success: true, data: store.deviceTypes }
  },
  async create(body: any) {
    if (!body.code || !body.label) throw new APIError(400, 'code dan label wajib diisi')
    const store = getStore()
    const type = {
      id: nextId('deviceType'),
      code: body.code,
      icon: body.icon || null,
      label: body.label,
      status: 'active',
      category: body.category || null,
      controllable: body.controllable ? 1 : 0,
    }
    store.deviceTypes.push(type)
    saveStore()
    return { success: true, message: 'Tipe perangkat dibuat', data: { id: type.id } }
  },
  async update(id: number, body: any) {
    const store = getStore()
    const type = store.deviceTypes.find((t) => t.id === id)
    if (!type) throw new APIError(404, 'Tipe perangkat tidak ditemukan')
    Object.assign(type, {
      code: body.code ?? type.code,
      label: body.label ?? type.label,
      category: body.category ?? type.category,
      icon: body.icon ?? type.icon,
      controllable: body.controllable !== undefined ? (body.controllable ? 1 : 0) : type.controllable,
      status: body.status ?? type.status,
    })
    saveStore()
    return { success: true, message: 'Tipe perangkat diperbarui' }
  },
  async delete(id: number) {
    const store = getStore()
    const idx = store.deviceTypes.findIndex((t) => t.id === id)
    if (idx === -1) throw new APIError(404, 'Tipe perangkat tidak ditemukan')
    store.deviceTypes.splice(idx, 1)
    saveStore()
    return { success: true, message: 'Tipe perangkat dihapus' }
  },
}

// ---------------------------------------------------------------------------
// Room Occupants
// ---------------------------------------------------------------------------

const mockRoomOccupants = {
  async getAll(classId?: string) {
    const store = getStore()
    const withNames = store.roomOccupants.map((o) => ({
      ...o,
      class_name: store.classes.find((c) => c.id === o.class_id)?.name,
    }))
    const data = classId ? withNames.filter((o) => o.class_id === Number(classId)) : withNames
    return { success: true, data }
  },
  async create(body: any) {
    if (!body.class_id || !body.full_name) throw new APIError(400, 'class_id dan full_name wajib diisi')
    const store = getStore()
    const occupant = {
      id: nextId('roomOccupant'),
      class_id: Number(body.class_id),
      full_name: body.full_name,
      email: body.email || '',
      phone: body.phone || '',
      notify_email: body.notify_email !== false,
      created_at: nowIso(),
    }
    store.roomOccupants.push(occupant)
    saveStore()
    return { success: true, message: 'Penghuni ruangan ditambahkan', data: { id: occupant.id } }
  },
  async update(id: number, body: any) {
    const store = getStore()
    const occupant = store.roomOccupants.find((o) => o.id === id)
    if (!occupant) throw new APIError(404, 'Penghuni ruangan tidak ditemukan')
    Object.assign(occupant, {
      class_id: body.class_id !== undefined ? Number(body.class_id) : occupant.class_id,
      full_name: body.full_name ?? occupant.full_name,
      email: body.email ?? occupant.email,
      phone: body.phone ?? occupant.phone,
      notify_email: body.notify_email !== undefined ? body.notify_email !== false : occupant.notify_email,
    })
    saveStore()
    return { success: true, message: 'Penghuni ruangan diperbarui' }
  },
  async delete(id: number) {
    const store = getStore()
    const idx = store.roomOccupants.findIndex((o) => o.id === id)
    if (idx === -1) throw new APIError(404, 'Penghuni ruangan tidak ditemukan')
    store.roomOccupants.splice(idx, 1)
    saveStore()
    return { success: true, message: 'Penghuni ruangan dihapus' }
  },
}

// ---------------------------------------------------------------------------
// Device Schedules
// ---------------------------------------------------------------------------

const mockDeviceSchedules = {
  async getAll(deviceId?: string) {
    const store = getStore()
    const withNames = store.deviceSchedules.map((s) => {
      const device = store.devices.find((d) => d.id === s.device_id)
      return { ...s, device_name: device?.device_name, location: device?.location }
    })
    const data = deviceId ? withNames.filter((s) => s.device_id === Number(deviceId)) : withNames
    return { success: true, data }
  },
  async create(body: any) {
    if (!body.device_id || !body.action || !body.time_of_day) {
      throw new APIError(400, 'device_id, action, dan time_of_day wajib diisi')
    }
    if (!['on', 'off'].includes(body.action)) {
      throw new APIError(400, 'action harus on atau off')
    }
    const store = getStore()
    const schedule = {
      id: nextId('deviceSchedule'),
      device_id: Number(body.device_id),
      action: body.action,
      time_of_day: body.time_of_day,
      days_of_week: body.days_of_week || '1,2,3,4,5,6,7',
      is_active: body.is_active !== false,
      last_run_at: null,
    }
    store.deviceSchedules.push(schedule)
    saveStore()
    return { success: true, message: 'Jadwal dibuat', data: { id: schedule.id } }
  },
  async update(id: number, body: any) {
    const store = getStore()
    const schedule = store.deviceSchedules.find((s) => s.id === id)
    if (!schedule) throw new APIError(404, 'Jadwal tidak ditemukan')
    Object.assign(schedule, {
      action: body.action ?? schedule.action,
      time_of_day: body.time_of_day ?? schedule.time_of_day,
      days_of_week: body.days_of_week || schedule.days_of_week,
      is_active: body.is_active !== undefined ? body.is_active !== false : schedule.is_active,
    })
    saveStore()
    return { success: true, message: 'Jadwal diperbarui' }
  },
  async delete(id: number) {
    const store = getStore()
    const idx = store.deviceSchedules.findIndex((s) => s.id === id)
    if (idx === -1) throw new APIError(404, 'Jadwal tidak ditemukan')
    store.deviceSchedules.splice(idx, 1)
    saveStore()
    return { success: true, message: 'Jadwal dihapus' }
  },
}

// ---------------------------------------------------------------------------
// Audit Logs
// ---------------------------------------------------------------------------

const mockAuditLogs = {
  async getDeviceActivity(classId?: string, deviceId?: string, page = 1, limit = 20) {
    const store = getStore()
    let items = store.auditLogs.slice()
    if (deviceId) items = items.filter((i) => i.device_id === Number(deviceId))
    if (classId) {
      const classIdNum = Number(classId)
      items = items.filter((i) => {
        const device = store.devices.find((d) => d.id === i.device_id)
        return device?.class_id === classIdNum
      })
    }
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const total = items.length
    const safePage = Math.max(1, page)
    const offset = (safePage - 1) * limit
    const pageItems = items.slice(offset, offset + limit)
    return { success: true, items: pageItems, total, page: safePage, limit }
  },
}

// ---------------------------------------------------------------------------
// Consumption
// ---------------------------------------------------------------------------

function rowsBetween(startDate: string, endDate: string): MockConsumptionRow[] {
  return getConsumptionRows().filter((r) => r.consumption_date >= startDate && r.consumption_date <= endDate)
}

function monthKeysBack(months: number): string[] {
  const keys: string[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return keys
}

const mockConsumption = {
  async getDaily(deviceId: number, date: string) {
    const rows = getConsumptionRows()
      .filter((r) => r.device_id === deviceId && r.consumption_date === date)
      .sort((a, b) => a.hour_start.localeCompare(b.hour_start))
    const data = rows.map((r) => ({
      hour: r.hour_start.slice(0, 5),
      power: r.consumption,
      temperature: r.temperature,
      humidity: r.humidity,
    }))
    return { success: true, data }
  },

  async getByClass(classId: number, startDate: string, endDate: string) {
    const data = rowsBetween(startDate, endDate).filter((r) => r.class_id === classId)
    return { success: true, data }
  },

  async getMonthly(deviceId: number, year: string, month: string) {
    const monthStr = String(month).padStart(2, '0')
    const rows = getConsumptionRows().filter(
      (r) => r.device_id === deviceId && r.consumption_date.startsWith(`${year}-${monthStr}`)
    )
    const byDate = new Map<string, { total: number; peak: number; temps: number[] }>()
    rows.forEach((r) => {
      const entry = byDate.get(r.consumption_date) || { total: 0, peak: 0, temps: [] }
      entry.total += r.consumption
      entry.peak = Math.max(entry.peak, r.consumption)
      if (r.temperature != null) entry.temps.push(r.temperature)
      byDate.set(r.consumption_date, entry)
    })
    const data = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, entry]) => ({
        date,
        total_consumption: Number(entry.total.toFixed(4)),
        avg_temperature: entry.temps.length ? Number((entry.temps.reduce((s, t) => s + t, 0) / entry.temps.length).toFixed(2)) : null,
        peak_consumption: Number(entry.peak.toFixed(4)),
      }))
    return { success: true, data }
  },

  async getMonthlyTrend(deviceId: number, months: number) {
    const keys = monthKeysBack(Math.max(1, Math.min(months || 6, 24)))
    const rows = getConsumptionRows().filter((r) => r.device_id === deviceId)
    const data = keys.map((month_key) => {
      const total = rows
        .filter((r) => r.consumption_date.startsWith(month_key))
        .reduce((sum, r) => sum + r.consumption, 0)
      return { month_key, total_consumption: Number(total.toFixed(4)) }
    })
    return { success: true, data }
  },

  async getMonthlyTrendSummary(months: number, classId?: string) {
    const keys = monthKeysBack(Math.max(1, Math.min(months || 6, 24)))
    let rows = getConsumptionRows()
    if (classId) rows = rows.filter((r) => r.class_id === Number(classId))

    const data = keys.map((month_key) => {
      const monthRows = rows.filter((r) => r.consumption_date.startsWith(month_key))
      const ac_total = monthRows.reduce((sum, r) => sum + (r.power_ac || (r.device_type === 'AC' ? r.consumption : 0)), 0)
      const lamp_total = monthRows.reduce((sum, r) => sum + (r.power_lamp || (r.device_type === 'LAMP' ? r.consumption : 0)), 0)
      const temps = monthRows.map((r) => r.temperature).filter((t): t is number => t != null)
      return {
        month_key,
        ac_total: Number(ac_total.toFixed(4)),
        lamp_total: Number(lamp_total.toFixed(4)),
        avg_temperature: temps.length ? Number((temps.reduce((s, t) => s + t, 0) / temps.length).toFixed(2)) : null,
        avg_humidity: null,
      }
    })
    return { success: true, data }
  },

  async getTotalByClass(classId: number, startDate: string, endDate: string) {
    const rows = rowsBetween(startDate, endDate).filter((r) => r.class_id === classId)
    const byDevice = new Map<number, { device_name: string; device_type: string; values: number[] }>()
    rows.forEach((r) => {
      const entry = byDevice.get(r.device_id) || { device_name: r.device_name, device_type: r.device_type, values: [] }
      entry.values.push(r.consumption)
      byDevice.set(r.device_id, entry)
    })
    const data = Array.from(byDevice.entries())
      .map(([id, entry]) => ({
        id,
        device_name: entry.device_name,
        device_type: entry.device_type,
        total_consumption: Number(entry.values.reduce((s, v) => s + v, 0).toFixed(4)),
        avg_consumption: Number((entry.values.reduce((s, v) => s + v, 0) / entry.values.length).toFixed(4)),
        peak_consumption: Number(Math.max(...entry.values).toFixed(4)),
        readings_count: entry.values.length,
      }))
      .sort((a, b) => b.total_consumption - a.total_consumption)
    return { success: true, data }
  },

  async getHourlyAggregatedByClass(classId: number, date: string) {
    const rows = getConsumptionRows().filter((r) => r.class_id === classId && r.consumption_date === date)
    const byHour = new Map<string, { ac: number; lamp: number; temps: number[] }>()
    rows.forEach((r) => {
      const entry = byHour.get(r.hour_start) || { ac: 0, lamp: 0, temps: [] }
      entry.ac += r.power_ac || (r.device_type === 'AC' ? r.consumption : 0)
      entry.lamp += r.power_lamp || (r.device_type === 'LAMP' ? r.consumption : 0)
      if (r.temperature != null) entry.temps.push(r.temperature)
      byHour.set(r.hour_start, entry)
    })
    const data = Array.from(byHour.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, entry]) => ({
        time,
        ac: Number(entry.ac.toFixed(4)),
        lamp: Number(entry.lamp.toFixed(4)),
        sensorTemp: entry.temps.length ? Number((entry.temps.reduce((s, t) => s + t, 0) / entry.temps.length).toFixed(2)) : 0,
        sensorHumidity: 0,
      }))
    return { success: true, data }
  },

  async getHourly(deviceId: number, date: string) {
    const rows = getConsumptionRows()
      .filter((r) => r.device_id === deviceId && r.consumption_date === date)
      .sort((a, b) => a.hour_start.localeCompare(b.hour_start))
    const data = rows.map((r) => ({ time: r.hour_start, power: r.consumption, temperature: r.temperature }))
    return { success: true, data }
  },

  async create(body: any) {
    if (body.device_id === undefined && body.id_class === undefined && body.class_code === undefined && body.classCode === undefined) {
      throw new APIError(400, 'device_id or id_class is required')
    }
    // Data yang di-post lewat endpoint ini di mode demo tidak dipersist ke
    // generator konsumsi (yang di-cache) -- konsisten dgn tujuan endpoint ini
    // yang sebenarnya untuk ingest dari perangkat IoT nyata, bukan dipakai UI.
    return {
      success: true,
      message: 'Consumption data created successfully',
      data: { id: Date.now(), ...body },
    }
  },
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

const mockAlerts = {
  async getAll() {
    const store = getStore()
    const sorted = store.alerts.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return { success: true, data: sorted }
  },
  async getById(id: number) {
    const store = getStore()
    const alert = store.alerts.find((a) => a.id === id)
    if (!alert) throw new APIError(404, 'Alert not found')
    return { success: true, data: alert }
  },
  async getUnread() {
    const store = getStore()
    return { success: true, data: { unreadCount: store.alerts.filter((a) => !a.read_status).length } }
  },
  async create(body: any) {
    const { type, title, message, severity } = body
    if (!type || !title || !message || !severity) {
      throw new APIError(400, 'type, title, message, and severity are required')
    }
    const store = getStore()
    const alert: MockAlert = {
      id: nextId('alert'),
      device_id: body.device_id ?? null,
      class_id: body.class_id ?? null,
      type,
      title,
      message,
      severity,
      status: 'unread',
      read_status: false,
      created_at: nowIso(),
    }
    store.alerts.push(alert)
    saveStore()
    return { success: true, message: 'Alert created successfully', data: alert }
  },
  async markAsRead(id: number) {
    const store = getStore()
    const alert = store.alerts.find((a) => a.id === id)
    if (!alert) throw new APIError(404, 'Alert not found')
    alert.read_status = true
    alert.status = 'read'
    saveStore()
    return { success: true, message: 'Alert marked as read' }
  },
  async delete(id: number) {
    const store = getStore()
    const idx = store.alerts.findIndex((a) => a.id === id)
    if (idx === -1) throw new APIError(404, 'Alert not found')
    store.alerts.splice(idx, 1)
    saveStore()
    return { success: true, message: 'Alert deleted successfully' }
  },
}

// ---------------------------------------------------------------------------
// Settings (per-key sistem + per-user)
// ---------------------------------------------------------------------------

const SETTINGS_STORAGE_KEY = 'sier_demo_settings_v1'
const USER_SETTINGS_STORAGE_KEY = 'sier_demo_user_settings_v1'

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // tidak fatal
  }
}

const mockSettings = {
  async getAll() {
    const data = readJson<Record<string, any>>(SETTINGS_STORAGE_KEY, {})
    return { success: true, data: Object.entries(data).map(([setting_key, setting_value]) => ({ setting_key, setting_value })) }
  },
  async getByKey(key: string) {
    const data = readJson<Record<string, any>>(SETTINGS_STORAGE_KEY, {})
    if (!(key in data)) throw new APIError(404, 'Setting not found')
    return { success: true, data: { setting_key: key, setting_value: data[key] } }
  },
  async set(key: string, value: any) {
    const data = readJson<Record<string, any>>(SETTINGS_STORAGE_KEY, {})
    data[key] = value
    writeJson(SETTINGS_STORAGE_KEY, data)
    return { success: true, message: 'Setting saved successfully', data: { setting_key: key, setting_value: value } }
  },
  async delete(key: string) {
    const data = readJson<Record<string, any>>(SETTINGS_STORAGE_KEY, {})
    if (!(key in data)) throw new APIError(404, 'Setting not found')
    delete data[key]
    writeJson(SETTINGS_STORAGE_KEY, data)
    return { success: true, message: 'Setting deleted successfully' }
  },
  async getUserSettings(userId: number) {
    const all = readJson<Record<number, any>>(USER_SETTINGS_STORAGE_KEY, {})
    const entry = all[userId]
    if (!entry) throw new APIError(404, 'User settings not found')
    return { success: true, data: entry }
  },
  async updateUserSettings(userId: number, body: any) {
    const all = readJson<Record<number, any>>(USER_SETTINGS_STORAGE_KEY, {})
    all[userId] = { ...(all[userId] || {}), ...body, user_id: userId }
    writeJson(USER_SETTINGS_STORAGE_KEY, all)
    return { success: true, message: 'User settings updated successfully', data: all[userId] }
  },
}

// ---------------------------------------------------------------------------
// Tenants (aplikasi ini single-tenant -- cukup 1 entri non-crashing)
// ---------------------------------------------------------------------------

const mockTenants = {
  async getAll() {
    return {
      success: true,
      data: [{ id: 1, code: 'sier', name: 'PT SIER (Persero)', type: 'kantor', status: 'active', campus: null, address: null }],
    }
  },
  async create(body: any) {
    return { success: true, message: `Tenant '${body.code}' berhasil di-provision`, data: { id: 2, code: body.code, name: body.name, status: 'active' } }
  },
  async update(code: string, body: any) {
    return { success: true, message: 'Tenant updated', data: { code, ...body } }
  },
  async overview() {
    return {
      success: true,
      data: {
        date: new Date().toISOString().slice(0, 10),
        total_faculties: 1,
        reachable_faculties: 1,
        total_live_kw: 0,
        total_consumption_today_kwh: 0,
        total_devices: getStore().devices.length,
        total_active_devices: getStore().devices.filter((d) => d.status === 'active').length,
        total_classes: getStore().classes.length,
        total_active_alerts: getStore().alerts.filter((a) => a.status === 'unread').length,
        faculties: [],
      },
    }
  },
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export async function mockApiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
  await delay()

  const { segments, params } = parseEndpoint(endpoint)
  const method = methodOf(options)
  const body = parseBody(options)

  let m: Record<string, string> | null

  // ---- classes ----
  if ((m = matchPath(segments, ['classes'])) && method === 'GET') return mockClasses.getAll()
  if ((m = matchPath(segments, ['classes', ':id'])) && method === 'GET') return mockClasses.getById(Number(m.id))
  if ((m = matchPath(segments, ['classes'])) && method === 'POST') return mockClasses.create(body)
  if ((m = matchPath(segments, ['classes', ':id'])) && method === 'PUT') return mockClasses.update(Number(m.id), body)
  if ((m = matchPath(segments, ['classes', ':id'])) && method === 'DELETE') return mockClasses.delete(Number(m.id))

  // ---- devices ----
  if ((m = matchPath(segments, ['devices'])) && method === 'GET') return mockDevices.getAll()
  if ((m = matchPath(segments, ['devices', 'class', ':classId'])) && method === 'GET') return mockDevices.getByClass(Number(m.classId))
  if ((m = matchPath(segments, ['devices', 'class-code', ':classCode'])) && method === 'GET') return mockDevices.getByClassCode(m.classCode)
  if ((m = matchPath(segments, ['devices', 'type', ':type'])) && method === 'GET') return mockDevices.getByType(m.type)
  if ((m = matchPath(segments, ['devices', ':id', 'telemetry'])) && method === 'GET') return mockDevices.getTelemetry(Number(m.id))
  if ((m = matchPath(segments, ['devices', ':id'])) && method === 'GET') return mockDevices.getById(Number(m.id))
  if ((m = matchPath(segments, ['devices'])) && method === 'POST') return mockDevices.create(body)
  if ((m = matchPath(segments, ['devices', ':id'])) && method === 'PUT') return mockDevices.update(Number(m.id), body)
  if ((m = matchPath(segments, ['devices', ':id', 'status'])) && method === 'PATCH') return mockDevices.updateStatus(Number(m.id), body)
  if ((m = matchPath(segments, ['devices', ':id', 'control'])) && method === 'POST') return mockDevices.control(Number(m.id), body)
  if ((m = matchPath(segments, ['devices', 'class-code', ':classCode', 'control'])) && method === 'POST') {
    return mockDevices.controlByClassCode(m.classCode, body)
  }
  if ((m = matchPath(segments, ['devices', 'class-code', ':classCode', 'control', ':deviceType'])) && method === 'POST') {
    return mockDevices.controlByClassCodeAndType(m.classCode, m.deviceType, body)
  }
  if ((m = matchPath(segments, ['devices', ':id', 'restart'])) && method === 'POST') return mockDevices.restart(Number(m.id))
  if ((m = matchPath(segments, ['devices', ':id'])) && method === 'DELETE') return mockDevices.delete(Number(m.id))

  // ---- device-types ----
  if ((m = matchPath(segments, ['device-types'])) && method === 'GET') return mockDeviceTypes.getAll()
  if ((m = matchPath(segments, ['device-types'])) && method === 'POST') return mockDeviceTypes.create(body)
  if ((m = matchPath(segments, ['device-types', ':id'])) && method === 'PUT') return mockDeviceTypes.update(Number(m.id), body)
  if ((m = matchPath(segments, ['device-types', ':id'])) && method === 'DELETE') return mockDeviceTypes.delete(Number(m.id))

  // ---- room-occupants ----
  if ((m = matchPath(segments, ['room-occupants'])) && method === 'GET') return mockRoomOccupants.getAll(params.get('classId') || undefined)
  if ((m = matchPath(segments, ['room-occupants'])) && method === 'POST') return mockRoomOccupants.create(body)
  if ((m = matchPath(segments, ['room-occupants', ':id'])) && method === 'PUT') return mockRoomOccupants.update(Number(m.id), body)
  if ((m = matchPath(segments, ['room-occupants', ':id'])) && method === 'DELETE') return mockRoomOccupants.delete(Number(m.id))

  // ---- device-schedules ----
  if ((m = matchPath(segments, ['device-schedules'])) && method === 'GET') return mockDeviceSchedules.getAll(params.get('deviceId') || undefined)
  if ((m = matchPath(segments, ['device-schedules'])) && method === 'POST') return mockDeviceSchedules.create(body)
  if ((m = matchPath(segments, ['device-schedules', ':id'])) && method === 'PUT') return mockDeviceSchedules.update(Number(m.id), body)
  if ((m = matchPath(segments, ['device-schedules', ':id'])) && method === 'DELETE') return mockDeviceSchedules.delete(Number(m.id))

  // ---- audit-logs ----
  if ((m = matchPath(segments, ['audit-logs', 'device-activity'])) && method === 'GET') {
    return mockAuditLogs.getDeviceActivity(
      params.get('classId') || undefined,
      params.get('deviceId') || undefined,
      Number(params.get('page') || 1),
      Number(params.get('limit') || 20)
    )
  }

  // ---- consumption ----
  if ((m = matchPath(segments, ['consumption', 'daily', ':deviceId'])) && method === 'GET') {
    return mockConsumption.getDaily(Number(m.deviceId), params.get('date') || '')
  }
  if ((m = matchPath(segments, ['consumption', 'class', ':classId'])) && method === 'GET') {
    return mockConsumption.getByClass(Number(m.classId), params.get('startDate') || '', params.get('endDate') || '')
  }
  if ((m = matchPath(segments, ['consumption', 'monthly', ':deviceId'])) && method === 'GET') {
    let year = params.get('year')
    let month = params.get('month')
    if (!year && month && month.includes('-')) {
      ;[year, month] = month.split('-')
    }
    return mockConsumption.getMonthly(Number(m.deviceId), year || '', month || '')
  }
  if ((m = matchPath(segments, ['consumption', 'monthly-trend', ':deviceId'])) && method === 'GET') {
    return mockConsumption.getMonthlyTrend(Number(m.deviceId), Number(params.get('months') || 6))
  }
  if ((m = matchPath(segments, ['consumption', 'monthly-trend-summary'])) && method === 'GET') {
    return mockConsumption.getMonthlyTrendSummary(Number(params.get('months') || 6), params.get('classId') || undefined)
  }
  if ((m = matchPath(segments, ['consumption', 'total', 'class', ':classId'])) && method === 'GET') {
    return mockConsumption.getTotalByClass(Number(m.classId), params.get('startDate') || '', params.get('endDate') || '')
  }
  if ((m = matchPath(segments, ['consumption', 'hourly', 'class', ':classId'])) && method === 'GET') {
    return mockConsumption.getHourlyAggregatedByClass(Number(m.classId), params.get('date') || '')
  }
  if ((m = matchPath(segments, ['consumption', 'hourly', ':deviceId'])) && method === 'GET') {
    return mockConsumption.getHourly(Number(m.deviceId), params.get('date') || '')
  }
  if ((m = matchPath(segments, ['consumption'])) && method === 'POST') return mockConsumption.create(body)

  // ---- alerts ----
  if ((m = matchPath(segments, ['alerts'])) && method === 'GET') return mockAlerts.getAll()
  if ((m = matchPath(segments, ['alerts', 'count', 'unread'])) && method === 'GET') return mockAlerts.getUnread()
  if ((m = matchPath(segments, ['alerts', ':id'])) && method === 'GET') return mockAlerts.getById(Number(m.id))
  if ((m = matchPath(segments, ['alerts'])) && method === 'POST') return mockAlerts.create(body)
  if ((m = matchPath(segments, ['alerts', ':id', 'read'])) && method === 'PATCH') return mockAlerts.markAsRead(Number(m.id))
  if ((m = matchPath(segments, ['alerts', ':id'])) && method === 'DELETE') return mockAlerts.delete(Number(m.id))

  // ---- settings ----
  if ((m = matchPath(segments, ['settings'])) && method === 'GET') return mockSettings.getAll()
  if ((m = matchPath(segments, ['settings', 'user', ':userId'])) && method === 'GET') return mockSettings.getUserSettings(Number(m.userId))
  if ((m = matchPath(segments, ['settings', 'user', ':userId'])) && method === 'PUT') return mockSettings.updateUserSettings(Number(m.userId), body)
  if ((m = matchPath(segments, ['settings', ':key'])) && method === 'GET') return mockSettings.getByKey(m.key)
  if ((m = matchPath(segments, ['settings'])) && method === 'POST') return mockSettings.set(body.key, body.value)
  if ((m = matchPath(segments, ['settings', ':key'])) && method === 'PUT') return mockSettings.set(m.key, body.value)
  if ((m = matchPath(segments, ['settings', ':key'])) && method === 'DELETE') return mockSettings.delete(m.key)

  // ---- auth ----
  if ((m = matchPath(segments, ['auth', 'login'])) && method === 'POST') return mockAuth.login(body)
  if ((m = matchPath(segments, ['auth', 'me'])) && method === 'GET') return mockAuth.me()
  if ((m = matchPath(segments, ['auth', 'profile'])) && method === 'PUT') return mockAuth.updateProfile(body)
  if ((m = matchPath(segments, ['auth', 'logout'])) && method === 'POST') return mockAuth.logout()

  // ---- users ----
  if ((m = matchPath(segments, ['users'])) && method === 'GET') return mockUsers.getAll()
  if ((m = matchPath(segments, ['users'])) && method === 'POST') return mockUsers.create(body)
  if ((m = matchPath(segments, ['users', ':id'])) && method === 'PUT') return mockUsers.update(Number(m.id), body)
  if ((m = matchPath(segments, ['users', ':id'])) && method === 'DELETE') return mockUsers.delete(Number(m.id))

  // ---- tenants ----
  if ((m = matchPath(segments, ['tenants'])) && method === 'GET') return mockTenants.getAll()
  if ((m = matchPath(segments, ['tenants', 'overview'])) && method === 'GET') return mockTenants.overview()
  if ((m = matchPath(segments, ['tenants'])) && method === 'POST') return mockTenants.create(body)
  if ((m = matchPath(segments, ['tenants', ':code'])) && method === 'PUT') return mockTenants.update(m.code, body)

  throw new APIError(404, `Mock endpoint not implemented: ${method} ${endpoint}`)
}

// Diekspor untuk halaman Pengaturan (tombol "Reset Data Demo").
export { resetDemoData } from './mockStore'
