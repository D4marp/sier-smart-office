'use client'

import { Plus, Pencil, Trash2, MoreVertical, X, Download, Clock, RotateCw, FileText, Info } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { devicesAPI, classesAPI, deviceTypesAPI, deviceSchedulesAPI, nodeRedControlAPI } from '@/lib/apiClient'
import { type Device as BaseDevice } from '@/lib/energyChartUtils'
import { StatusBadges, isDevicePowerOn } from '@/components/StatusBadges'
import Pagination from '@/components/Pagination'
import RoomDropdown from '@/components/RoomDropdown'
import { exportToExcel } from '@/lib/exportExcel'
import Sidebar from '@/components/Sidebar'
import DashboardHeader from '@/components/DashboardHeader'

interface Device extends BaseDevice {
  class_name?: string
  brand?: string
  model?: string
  efficiency_rating?: string | number
  last_reading?: string
  last_heartbeat?: string
  notes?: string
  consumption?: number
}

interface RoomOption {
  id: number
  name: string
}

interface DeviceTypeOption {
  code: string
  label: string
}

interface Schedule {
  id: number
  device_id: number
  action: 'on' | 'off'
  time_of_day: string
  days_of_week: string
  is_active: boolean
}

type DeviceTypeControl = {
  type: 'lamp' | 'ac' | 'projector'
  label: string
}

const DEVICE_TYPE_CONTROLS: DeviceTypeControl[] = [
  { type: 'lamp', label: 'Lampu' },
  { type: 'ac', label: 'AC' },
  { type: 'projector', label: 'Proyektor' },
]

const ALL_ROOMS_LABEL = 'Semua Ruangan'
const ALL_TYPES_LABEL = 'Semua Tipe'
const PAGE_SIZE = 12

const DAYS_OF_WEEK = [
  { value: 1, label: 'Senin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' },
  { value: 5, label: 'Jumat' },
  { value: 6, label: 'Sabtu' },
  { value: 7, label: 'Minggu' },
]

const DAY_LABEL_MAP: Record<number, string> = { 1: 'Sen', 2: 'Sel', 3: 'Rab', 4: 'Kam', 5: 'Jum', 6: 'Sab', 7: 'Min' }

const FALLBACK_DEVICE_TYPES: DeviceTypeOption[] = [
  { code: 'LAMP', label: 'Smart Wall Switch (Lampu)' },
  { code: 'AC', label: 'Air Conditioner' },
  { code: 'GATEWAY', label: 'Gateway' },
  { code: 'SOCKET', label: 'Socket' },
  { code: 'CONTROLLER', label: 'Controller' },
  { code: 'SENSOR', label: 'Sensor' },
  { code: 'INTERFACE', label: 'Interface' },
]

const EMPTY_FORM = {
  class_id: '',
  device_name: '',
  device_type: '',
  device_eui: '',
  power_rating: '0',
  brand: '',
  model: '',
  application_type: '',
  notes: '',
}

function deviceMatchesControlType(device: Device, controlType: DeviceTypeControl['type']) {
  const type = String(device.device_type || '').toLowerCase()
  if (controlType === 'lamp') return type.includes('lamp') || type.includes('light')
  if (controlType === 'ac') return type.includes('ac')
  return type.includes('projector') || type.includes('proyektor')
}

function isDeviceControllable(device: Device): boolean {
  return DEVICE_TYPE_CONTROLS.some((control) => deviceMatchesControlType(device, control.type))
}

function formatDaysLabel(days: string) {
  return (days || '')
    .split(',')
    .map((d) => DAY_LABEL_MAP[Number(d)] || d)
    .filter(Boolean)
    .join(', ')
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl border border-slate-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-50 pb-1.5">
      <span className="text-slate-400 font-semibold shrink-0">{label}</span>
      <span className="text-slate-800 font-bold text-right break-words">{value}</span>
    </div>
  )
}

export default function DevicesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [devices, setDevices] = useState<Device[]>([])
  const [rooms, setRooms] = useState<RoomOption[]>([])
  const [deviceTypeOptions, setDeviceTypeOptions] = useState<DeviceTypeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [selectedLocation, setSelectedLocation] = useState(ALL_ROOMS_LABEL)
  const [selectedType, setSelectedType] = useState(ALL_TYPES_LABEL)
  const [page, setPage] = useState(1)

  const [classControlLoading, setClassControlLoading] = useState<Record<string, 'on' | 'off' | null>>({})
  const [typeControlLoading, setTypeControlLoading] = useState<Record<string, boolean>>({})
  const [deviceControlLoading, setDeviceControlLoading] = useState<Record<number, 'on' | 'off' | null>>({})

  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [detailDevice, setDetailDevice] = useState<Device | null>(null)
  const [detailTelemetry, setDetailTelemetry] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [scheduleDevice, setScheduleDevice] = useState<Device | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [scheduleForm, setScheduleForm] = useState<{ action: 'on' | 'off'; time_of_day: string; days: number[] }>({
    action: 'on',
    time_of_day: '07:00',
    days: [1, 2, 3, 4, 5],
  })

  const reloadDevices = async () => {
    try {
      const data = await devicesAPI.getAll()
      setDevices(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat ulang perangkat')
    }
  }

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true)
        const [devicesData, roomsData] = await Promise.all([
          devicesAPI.getAll(),
          classesAPI.getAll().catch(() => []),
        ])
        setDevices(devicesData || [])
        setRooms((roomsData || []).map((r: any) => ({ id: r.id, name: r.name })))
        setError(null)
      } catch (err) {
        console.error('Error loading devices:', err)
        setError(err instanceof Error ? err.message : 'Failed to load devices')
        setDevices([])
      } finally {
        setLoading(false)
      }
    }

    loadAll()

    deviceTypesAPI
      .getAll()
      .then((data) => {
        const list = data && data.length ? data.map((t: any) => ({ code: t.code, label: t.label })) : FALLBACK_DEVICE_TYPES
        setDeviceTypeOptions(list)
      })
      .catch(() => setDeviceTypeOptions(FALLBACK_DEVICE_TYPES))
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    setPage(1)
  }, [selectedLocation, selectedType])

  const showToast = (message: string) => setToast(message)

  const locationOptions = useMemo(
    () => Array.from(new Set(devices.map((d) => d.location).filter(Boolean))),
    [devices]
  )
  const typeFilterOptions = useMemo(
    () => Array.from(new Set(devices.map((d) => d.device_type).filter(Boolean))),
    [devices]
  )

  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      const locOk = selectedLocation === ALL_ROOMS_LABEL || d.location === selectedLocation
      const typeOk = selectedType === ALL_TYPES_LABEL || d.device_type === selectedType
      return locOk && typeOk
    })
  }, [devices, selectedLocation, selectedType])

  const pagedDevices = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredDevices.slice(start, start + PAGE_SIZE)
  }, [filteredDevices, page])

  const visibleClassCodes = Array.from(new Set(filteredDevices.map((d) => d.location).filter(Boolean)))
  const getClassDevices = (classCode: string) => devices.filter((device) => device.location === classCode)
  const getControlsForClass = (classCode: string) => {
    const classDevices = getClassDevices(classCode)
    return DEVICE_TYPE_CONTROLS.filter((control) =>
      classDevices.some((device) => deviceMatchesControlType(device, control.type))
    )
  }

  const handleClassControl = async (classCode: string, action: 'on' | 'off') => {
    try {
      setClassControlLoading((prev) => ({ ...prev, [classCode]: action }))
      await devicesAPI.controlByClass(classCode, action)

      setDevices((prev) =>
        prev.map((device) => {
          if (device.location !== classCode) return device
          return {
            ...device,
            status: action === 'on' ? 'active' : 'idle',
            iot_status: action === 'on' ? 'active' : 'inactive',
          }
        })
      )

      setError(null)
    } catch (err) {
      console.error('Error controlling class devices:', err)
      setError(err instanceof Error ? err.message : 'Gagal mengirim perintah ON/OFF kelas ke Node-RED')
    } finally {
      setClassControlLoading((prev) => ({ ...prev, [classCode]: null }))
    }
  }

  const handleDeviceControl = async (deviceId: number, action: 'on' | 'off') => {
    try {
      setDeviceControlLoading((prev) => ({ ...prev, [deviceId]: action }))
      await devicesAPI.control(deviceId, action)
      setDevices((prev) =>
        prev.map((device) => {
          if (device.id !== deviceId) return device
          return {
            ...device,
            status: action === 'on' ? 'active' : 'idle',
            iot_status: action === 'on' ? 'active' : 'offline',
          }
        })
      )
      setError(null)
    } catch (err) {
      console.error('Error controlling device:', err)
      setError(err instanceof Error ? err.message : 'Gagal mengirim perintah ON/OFF perangkat')
    } finally {
      setDeviceControlLoading((prev) => ({ ...prev, [deviceId]: null }))
    }
  }

  const handleDeviceTypeControl = async (
    classCode: string,
    deviceType: DeviceTypeControl['type'],
    action: 'on' | 'off'
  ) => {
    const key = `${classCode}-${deviceType}-${action}`

    try {
      setTypeControlLoading((prev) => ({ ...prev, [key]: true }))

      if (deviceType === 'lamp') {
        await nodeRedControlAPI.controlLamp(classCode, action)
      } else if (deviceType === 'ac') {
        await nodeRedControlAPI.controlAC(classCode, action)
      } else {
        await nodeRedControlAPI.controlProjector(classCode, action)
      }

      setDevices((prev) =>
        prev.map((device) => {
          if (device.location !== classCode || !deviceMatchesControlType(device, deviceType)) return device
          return {
            ...device,
            status: action === 'on' ? 'active' : 'idle',
            iot_status: action === 'on' ? 'active' : 'inactive',
          }
        })
      )
      setError(null)
    } catch (err) {
      console.error(`Error controlling ${deviceType} devices in ${classCode}:`, err)
      setError(err instanceof Error ? err.message : `Gagal mengirim perintah ${deviceType.toUpperCase()} ${action.toUpperCase()} ke Node-RED`)
    } finally {
      setTypeControlLoading((prev) => ({ ...prev, [key]: false }))
    }
  }

  const openCreateForm = () => {
    setFormMode('create')
    setEditingId(null)
    setFormData(EMPTY_FORM)
    setFormError(null)
    setShowForm(true)
  }

  const openEditForm = (device: Device) => {
    setOpenMenuId(null)
    setFormMode('edit')
    setEditingId(device.id)
    setFormData({
      class_id: String(device.class_id ?? ''),
      device_name: device.device_name || '',
      device_type: device.device_type || '',
      device_eui: device.device_eui || '',
      power_rating: String(device.power_rating ?? 0),
      brand: device.brand || '',
      model: device.model || '',
      application_type: device.application_type || '',
      notes: device.notes || '',
    })
    setFormError(null)
    setShowForm(true)
  }

  const handleFormSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)

    const room = rooms.find((r) => String(r.id) === formData.class_id)
    if (!formData.class_id || !room) {
      setFormError('Pilih ruangan terlebih dahulu')
      return
    }
    if (!formData.device_name.trim()) {
      setFormError('Nama perangkat wajib diisi')
      return
    }
    if (!formData.device_type.trim()) {
      setFormError('Tipe perangkat wajib dipilih')
      return
    }
    if (!formData.device_eui.trim()) {
      setFormError('Device EUI wajib diisi')
      return
    }

    const payload: Record<string, unknown> = {
      class_id: Number(formData.class_id),
      device_name: formData.device_name.trim(),
      device_type: formData.device_type,
      device_eui: formData.device_eui.trim(),
      location: room.name,
      power_rating: Number(formData.power_rating) || 0,
      brand: formData.brand.trim() || undefined,
      model: formData.model.trim() || undefined,
      application_type: formData.application_type.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    }

    try {
      setFormSaving(true)
      if (formMode === 'create') {
        await devicesAPI.create(payload)
      } else if (editingId) {
        await devicesAPI.update(editingId, payload)
      }
      setShowForm(false)
      await reloadDevices()
      showToast(formMode === 'create' ? 'Perangkat berhasil ditambahkan' : 'Perangkat berhasil diperbarui')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan perangkat')
    } finally {
      setFormSaving(false)
    }
  }

  const handleDelete = async (device: Device) => {
    setOpenMenuId(null)
    if (!confirm(`Hapus perangkat "${device.device_name}"? Tindakan ini tidak bisa dibatalkan.`)) return
    try {
      await devicesAPI.delete(device.id)
      await reloadDevices()
      showToast('Perangkat berhasil dihapus')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus perangkat')
    }
  }

  const openDetail = async (device: Device) => {
    setOpenMenuId(null)
    setDetailDevice(device)
    setDetailTelemetry(null)
    setDetailLoading(true)
    try {
      const telemetry = await devicesAPI.getTelemetry(device.id)
      setDetailTelemetry(telemetry)
    } catch {
      setDetailTelemetry(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const openSchedule = async (device: Device) => {
    setOpenMenuId(null)
    setScheduleDevice(device)
    setScheduleForm({ action: 'on', time_of_day: '07:00', days: [1, 2, 3, 4, 5] })
    setScheduleLoading(true)
    try {
      const data = await deviceSchedulesAPI.getAll(device.id)
      setSchedules(data || [])
    } catch {
      setSchedules([])
    } finally {
      setScheduleLoading(false)
    }
  }

  const toggleScheduleDay = (day: number) => {
    setScheduleForm((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day].sort((a, b) => a - b),
    }))
  }

  const handleScheduleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!scheduleDevice) return
    if (scheduleForm.days.length === 0) {
      setError('Pilih minimal satu hari untuk jadwal')
      return
    }
    try {
      setScheduleSaving(true)
      await deviceSchedulesAPI.create({
        device_id: scheduleDevice.id,
        action: scheduleForm.action,
        time_of_day: `${scheduleForm.time_of_day}:00`,
        days_of_week: scheduleForm.days.join(','),
        is_active: true,
      })
      const data = await deviceSchedulesAPI.getAll(scheduleDevice.id)
      setSchedules(data || [])
      showToast('Jadwal berhasil ditambahkan')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah jadwal')
    } finally {
      setScheduleSaving(false)
    }
  }

  const handleScheduleDelete = async (id: number) => {
    if (!confirm('Hapus jadwal ini?')) return
    try {
      await deviceSchedulesAPI.delete(id)
      setSchedules((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus jadwal')
    }
  }

  const handleRestart = async (device: Device) => {
    setOpenMenuId(null)
    if (!confirm(`Restart perangkat "${device.device_name}"?`)) return
    try {
      const res = await devicesAPI.restart(device.id)
      showToast(res.message || 'Perintah restart tercatat')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim perintah restart')
    }
  }

  const handleExport = () => {
    exportToExcel(
      filteredDevices.map((d) => ({
        Ruangan: d.location,
        Nama: d.device_name,
        Tipe: d.device_type,
        Brand: d.brand || '-',
        Model: d.model || '-',
        EUI: d.device_eui,
        'Daya (kW)': d.current_power ?? d.power_rating ?? 0,
        Status: d.status,
        'Terakhir Update': d.last_heartbeat || '-',
      })),
      'perangkat-sier'
    )
  }

  const renderTypeControls = (classCode: string) => {
    const controls = getControlsForClass(classCode)

    if (controls.length === 0) {
      return (
        <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-400">
          Belum ada perangkat Lampu/AC/Proyektor di ruangan ini.
        </p>
      )
    }

    return (
      <div className="space-y-2">
        {controls.map((control) => {
          const onKey = `${classCode}-${control.type}-on`
          const offKey = `${classCode}-${control.type}-off`
          const isOnLoading = Boolean(typeControlLoading[onKey])
          const isOffLoading = Boolean(typeControlLoading[offKey])

          return (
            <div key={control.type} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">{control.label}</span>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => handleDeviceTypeControl(classCode, control.type, 'on')}
                  disabled={isOnLoading || isOffLoading}
                  className="px-2.5 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-[10px] font-bold uppercase tracking-wider text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isOnLoading ? '...' : 'ON'}
                </button>
                <button
                  onClick={() => handleDeviceTypeControl(classCode, control.type, 'off')}
                  disabled={isOnLoading || isOffLoading}
                  className="px-2.5 py-1 rounded-md border border-rose-200 bg-rose-50 text-[10px] font-bold uppercase tracking-wider text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isOffLoading ? '...' : 'OFF'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderDeviceControlButtons = (device: Device) => {
    const loadingAction = deviceControlLoading[device.id]
    const active = isDevicePowerOn(device)

    return (
      <div className="flex space-x-1.5">
        <button
          onClick={() => handleDeviceControl(device.id, 'on')}
          disabled={Boolean(loadingAction) || active}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 duration-200 ${
            active
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60'
          }`}
        >
          {loadingAction === 'on' ? '...' : 'ON'}
        </button>
        <button
          onClick={() => handleDeviceControl(device.id, 'off')}
          disabled={Boolean(loadingAction) || !active}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 duration-200 ${
            !active
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              : 'bg-red-600 text-white hover:bg-red-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60'
          }`}
        >
          {loadingAction === 'off' ? '...' : 'OFF'}
        </button>
      </div>
    )
  }

  const renderDeviceControls = (classCode: string) => {
    const controllableDevices = getClassDevices(classCode).filter(isDeviceControllable)

    if (controllableDevices.length === 0) {
      return (
        <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-400">
          Belum ada perangkat yang bisa dikontrol satuan di ruangan ini.
        </p>
      )
    }

    return (
      <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
        {controllableDevices.map((device) => (
          <div key={device.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-700">{device.device_name}</p>
              <p className="mt-0.5 text-[9px] font-mono text-slate-400">
                #{device.id} - {device.device_type} - {isDevicePowerOn(device) ? 'Active' : 'Idle'}
              </p>
            </div>
            {renderDeviceControlButtons(device)}
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data perangkat...</p>
        </div>
      </div>
    )
  }

  const formRoomName = rooms.find((r) => String(r.id) === formData.class_id)?.name || ''

  return (
    <div className="flex h-screen bg-gray-50" style={{
      backgroundImage: 'url(/sier-building-bg.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-white/95 pointer-events-none"></div>
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <DashboardHeader title="Dashboard Perangkat" sidebarOpen={sidebarOpen} onOpenSidebar={() => setSidebarOpen(true)} />

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto relative z-10">
          {openMenuId !== null && (
            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
          )}

          {error && (
            <div className="mx-8 mt-6 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-yellow-800 shadow-sm">
              {error}
            </div>
          )}

          {toast && (
            <div className="fixed bottom-6 right-6 z-[60] max-w-sm rounded-lg bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-lg">
              {toast}
            </div>
          )}

          {/* Filter + actions card */}
          <div className="mx-8 mt-6 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-slate-900 font-bold text-sm">Filter &amp; Kelola Perangkat</h3>
                <p className="text-slate-500 text-xs mt-0.5">Saring berdasarkan ruangan dan tipe perangkat, atau kelola daftar perangkat.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExport}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  <Download size={14} /> Export Excel
                </button>
                <button
                  onClick={openCreateForm}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2f46a3] px-3 py-2 text-xs font-bold text-white hover:bg-[#25397f] transition-all"
                >
                  <Plus size={14} /> Tambah Perangkat
                </button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Ruangan</label>
                <RoomDropdown
                  rooms={locationOptions}
                  value={selectedLocation}
                  onChange={setSelectedLocation}
                  allLabel={ALL_ROOMS_LABEL}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[#2f46a3] focus:ring-1 focus:ring-[#2f46a3] transition"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Tipe Perangkat</label>
                <RoomDropdown
                  rooms={typeFilterOptions}
                  value={selectedType}
                  onChange={setSelectedType}
                  allLabel={ALL_TYPES_LABEL}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[#2f46a3] focus:ring-1 focus:ring-[#2f46a3] transition"
                />
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Room Controls (Only visible when "Semua Ruangan" is selected) */}
            {selectedLocation === ALL_ROOMS_LABEL && visibleClassCodes.length > 0 && (
              <div className="mb-6 rounded-xl bg-white p-6 shadow-md border border-slate-200">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Kontrol Saklar ON/OFF Per Ruangan</h3>
                  <p className="mt-1 text-xs text-slate-500">Kontrol semua perangkat ruangan atau pilih per tipe perangkat.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {visibleClassCodes.map((classCode) => (
                    <div key={classCode} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 hover:border-slate-300 transition-all">
                      <p className="text-sm font-bold text-slate-900">{classCode}</p>
                      <p className="mt-1 text-xs text-slate-400">{getClassDevices(classCode).length} perangkat terdaftar</p>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleClassControl(classCode, 'on')}
                          disabled={Boolean(classControlLoading[classCode])}
                          className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 transition-all active:scale-95"
                        >
                          {classControlLoading[classCode] === 'on' ? 'Mengirim...' : 'ON'}
                        </button>
                        <button
                          onClick={() => handleClassControl(classCode, 'off')}
                          disabled={Boolean(classControlLoading[classCode])}
                          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 transition-all active:scale-95"
                        >
                          {classControlLoading[classCode] === 'off' ? 'Mengirim...' : 'OFF'}
                        </button>
                      </div>
                      <div className="mt-4 border-t border-slate-200 pt-3">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Kontrol per tipe</p>
                        {renderTypeControls(classCode)}
                      </div>
                      <div className="mt-4 border-t border-slate-200 pt-3">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Kontrol per device</p>
                        {renderDeviceControls(classCode)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick room control when a specific room is selected */}
            {selectedLocation !== ALL_ROOMS_LABEL && getClassDevices(selectedLocation).length > 0 && (
              <>
                <div className="mb-1 rounded-xl bg-white p-4 shadow-md border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Kontrol Cepat Ruang {selectedLocation}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Nyalakan/matikan seluruh saklar di ruangan ini sekaligus</p>
                  </div>
                  <div className="flex space-x-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleClassControl(selectedLocation, 'on')}
                      disabled={Boolean(classControlLoading[selectedLocation])}
                      className="flex-1 sm:flex-none rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-60 transition-all active:scale-95"
                    >
                      {classControlLoading[selectedLocation] === 'on' ? 'Mengirim...' : 'ON'}
                    </button>
                    <button
                      onClick={() => handleClassControl(selectedLocation, 'off')}
                      disabled={Boolean(classControlLoading[selectedLocation])}
                      className="flex-1 sm:flex-none rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60 transition-all active:scale-95"
                    >
                      {classControlLoading[selectedLocation] === 'off' ? 'Mengirim...' : 'OFF'}
                    </button>
                  </div>
                </div>
                <div className="mb-6 rounded-xl bg-white p-4 shadow-md border border-slate-200">
                  <div className="mb-3">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Kontrol Per Tipe Ruang {selectedLocation}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Kontrol Lampu, AC, atau Proyektor tanpa memengaruhi tipe perangkat lain.</p>
                  </div>
                  {renderTypeControls(selectedLocation)}
                </div>
              </>
            )}

            {/* Device Detailed List */}
            <div className="grid grid-cols-1 gap-6">
              {filteredDevices.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-md border border-slate-200">
                  <p className="text-gray-600">Tidak ada perangkat ditemukan</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pagedDevices.map((device) => (
                      <div key={device.id} className="relative bg-white rounded-xl shadow-md p-6 border border-slate-200 flex flex-col justify-between hover:shadow-lg transition-all duration-300">
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <div className="min-w-0 pr-2">
                              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider truncate">{device.location}</p>
                              <h3 className="text-base font-extrabold text-slate-800 mt-1 leading-snug">{device.device_name}</h3>
                              <p className="text-[10px] text-slate-400 font-mono mt-1">{device.device_eui}</p>
                            </div>
                            <div className="relative shrink-0">
                              <button
                                onClick={() => setOpenMenuId(openMenuId === device.id ? null : device.id)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                              >
                                <MoreVertical size={16} />
                              </button>
                              {openMenuId === device.id && (
                                <div className="absolute right-0 top-9 z-20 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg text-left">
                                  <button onClick={() => openDetail(device)} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                                    <Info size={14} /> Lihat Detail
                                  </button>
                                  <button onClick={() => openEditForm(device)} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                                    <Pencil size={14} /> Edit
                                  </button>
                                  <button onClick={() => openSchedule(device)} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                                    <Clock size={14} /> Atur Jadwal
                                  </button>
                                  <button onClick={() => handleRestart(device)} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                                    <RotateCw size={14} /> Restart
                                  </button>
                                  <Link
                                    href={`/log-aktivitas?deviceId=${device.id}`}
                                    onClick={() => setOpenMenuId(null)}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                  >
                                    <FileText size={14} /> Lihat Log
                                  </Link>
                                  <button
                                    onClick={() => handleDelete(device)}
                                    className="mt-1 flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 size={14} /> Hapus
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <StatusBadges device={device} />

                          <div className="space-y-2 text-xs text-slate-500 border-t border-slate-100 pt-3 mt-3">
                            <div className="flex justify-between border-b border-slate-55 pb-1.5">
                              <span>Daya Berjalan</span>
                              <span className="font-bold text-slate-800">{(parseFloat(String(device.current_power)) || 0).toFixed(2)} kW</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-55 pb-1.5">
                              <span>Suhu Terukur</span>
                              <span className="font-bold text-slate-800">{(parseFloat(String(device.current_temperature)) || 0).toFixed(1)}°C</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-55 pb-1.5">
                              <span>Tipe Beban</span>
                              <span className="font-bold text-blue-600">{device.device_type}</span>
                            </div>
                            <div className="flex justify-between pb-0.5">
                              <span>Aplikasi Node</span>
                              <span className="font-bold text-teal-600">{device.application_type}</span>
                            </div>
                          </div>
                        </div>

                        {isDeviceControllable(device) && (
                          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kendali Perangkat:</span>
                              <span className="text-[9px] text-slate-400 font-mono">#{device.id}</span>
                            </div>
                            {renderDeviceControlButtons(device)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <Pagination page={page} totalItems={filteredDevices.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Create / Edit Modal */}
      {showForm && (
        <Modal title={formMode === 'create' ? 'Tambah Perangkat' : 'Edit Perangkat'} onClose={() => setShowForm(false)} wide>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Ruangan *</label>
                <select
                  value={formData.class_id}
                  onChange={(e) => setFormData((prev) => ({ ...prev, class_id: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[#2f46a3]"
                  required
                >
                  <option value="">Pilih ruangan</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Lokasi (otomatis)</label>
                <input
                  readOnly
                  value={formRoomName}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Nama Perangkat *</label>
                <input
                  value={formData.device_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, device_name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[#2f46a3]"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Tipe Perangkat *</label>
                <select
                  value={formData.device_type}
                  onChange={(e) => setFormData((prev) => ({ ...prev, device_type: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[#2f46a3]"
                  required
                >
                  <option value="">Pilih tipe</option>
                  {deviceTypeOptions.map((t) => (
                    <option key={t.code} value={t.code}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Device EUI *</label>
                <input
                  value={formData.device_eui}
                  onChange={(e) => setFormData((prev) => ({ ...prev, device_eui: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-bold font-mono text-slate-700 outline-none focus:border-[#2f46a3]"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Daya Terpasang (kW) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.power_rating}
                  onChange={(e) => setFormData((prev) => ({ ...prev, power_rating: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[#2f46a3]"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Brand</label>
                <input
                  value={formData.brand}
                  onChange={(e) => setFormData((prev) => ({ ...prev, brand: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[#2f46a3]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Model</label>
                <input
                  value={formData.model}
                  onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[#2f46a3]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Tipe Aplikasi</label>
                <input
                  value={formData.application_type}
                  onChange={(e) => setFormData((prev) => ({ ...prev, application_type: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[#2f46a3]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Catatan</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#2f46a3]"
                />
              </div>
            </div>
            {formError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 font-bold">{formError}</div>
            )}
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={formSaving}
                className="rounded-lg bg-[#2f46a3] px-4 py-2 text-xs font-bold text-white hover:bg-[#25397f] disabled:opacity-60 transition-all"
              >
                {formSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Detail Modal */}
      {detailDevice && (
        <Modal title={`Detail: ${detailDevice.device_name}`} onClose={() => setDetailDevice(null)}>
          <div className="space-y-3 text-xs">
            <DetailRow label="Ruangan" value={detailDevice.location} />
            <DetailRow label="Device EUI" value={detailDevice.device_eui} />
            <DetailRow label="Tipe" value={detailDevice.device_type} />
            <DetailRow label="Aplikasi" value={detailDevice.application_type || '-'} />
            <DetailRow label="Brand / Model" value={`${detailDevice.brand || '-'} / ${detailDevice.model || '-'}`} />
            <DetailRow label="Daya Berjalan" value={`${(parseFloat(String(detailDevice.current_power)) || 0).toFixed(2)} kW`} />
            <DetailRow label="Daya Terpasang" value={`${detailDevice.power_rating ?? '-'} kW`} />
            <DetailRow label="Suhu" value={`${(parseFloat(String(detailDevice.current_temperature)) || 0).toFixed(1)}°C`} />
            <DetailRow label="Efisiensi" value={String(detailDevice.efficiency_rating ?? '-')} />
            <DetailRow label="Heartbeat Terakhir" value={detailDevice.last_heartbeat || '-'} />
            <DetailRow label="Pembacaan Terakhir" value={detailDevice.last_reading || '-'} />
            <DetailRow label="Catatan" value={detailDevice.notes || '-'} />
            <div className="flex items-center gap-2 pt-1">
              <StatusBadges device={detailDevice} />
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Telemetri</p>
              {detailLoading ? (
                <p className="text-slate-400">Memuat telemetri...</p>
              ) : detailTelemetry ? (
                <div className="space-y-1.5">
                  <DetailRow label="Signal Strength" value={detailTelemetry.signal_strength != null ? String(detailTelemetry.signal_strength) : '-'} />
                  <DetailRow label="Battery Level" value={detailTelemetry.battery_level != null ? String(detailTelemetry.battery_level) : '-'} />
                  <DetailRow label="Diterima" value={detailTelemetry.received_at || '-'} />
                </div>
              ) : (
                <p className="text-slate-400">Belum ada data telemetri.</p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Schedule Modal */}
      {scheduleDevice && (
        <Modal title={`Jadwal: ${scheduleDevice.device_name}`} onClose={() => setScheduleDevice(null)} wide>
          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Aksi</label>
                <select
                  value={scheduleForm.action}
                  onChange={(e) => setScheduleForm((prev) => ({ ...prev, action: e.target.value as 'on' | 'off' }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-[#2f46a3]"
                >
                  <option value="on">Nyalakan (ON)</option>
                  <option value="off">Matikan (OFF)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Jam</label>
                <input
                  type="time"
                  value={scheduleForm.time_of_day}
                  onChange={(e) => setScheduleForm((prev) => ({ ...prev, time_of_day: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-[#2f46a3]"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Hari</label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((d) => (
                  <button
                    type="button"
                    key={d.value}
                    onClick={() => toggleScheduleDay(d.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                      scheduleForm.days.includes(d.value)
                        ? 'bg-[#2f46a3] text-white border-[#2f46a3]'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={scheduleSaving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2f46a3] px-4 py-2 text-xs font-bold text-white hover:bg-[#25397f] disabled:opacity-60 transition-all"
            >
              <Clock size={14} /> {scheduleSaving ? 'Menyimpan...' : 'Simpan Jadwal'}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Jadwal Aktif</p>
            {scheduleLoading ? (
              <p className="text-xs text-slate-400">Memuat jadwal...</p>
            ) : schedules.length === 0 ? (
              <p className="text-xs text-slate-400">Belum ada jadwal untuk perangkat ini.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {schedules.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700">{s.action === 'on' ? 'ON' : 'OFF'} — {(s.time_of_day || '').slice(0, 5)}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{formatDaysLabel(s.days_of_week)}</p>
                    </div>
                    <button onClick={() => handleScheduleDelete(s.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
