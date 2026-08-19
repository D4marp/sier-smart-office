'use client'

import { Activity } from 'lucide-react'
import { useState, useEffect } from 'react'
import { devicesAPI, nodeRedControlAPI } from '@/lib/apiClient'
import Sidebar from '@/components/Sidebar'
import DashboardHeader from '@/components/DashboardHeader'

interface Device {
  id: number
  device_eui: string
  device_name: string
  device_type: string
  application_type: string
  location: string
  current_power: number
  current_temperature: number
  iot_status: string
  status?: string
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

function isDeviceOnline(device: Device): boolean {
  const iot = String(device.iot_status || '').toLowerCase()
  const status = String(device.status || '').toLowerCase()
  return iot === 'online' || iot === 'active' || status === 'active' || status === 'idle'
}

function deviceMatchesControlType(device: Device, controlType: DeviceTypeControl['type']) {
  const type = String(device.device_type || '').toLowerCase()
  if (controlType === 'lamp') return type.includes('lamp') || type.includes('light')
  if (controlType === 'ac') return type.includes('ac')
  return type.includes('projector') || type.includes('proyektor')
}

function isDeviceActive(device: Device): boolean {
  const iot = String(device.iot_status || '').toLowerCase()
  const status = String(device.status || '').toLowerCase()
  return iot === 'online' || iot === 'active' || status === 'online' || status === 'active'
}

function isDeviceControllable(device: Device): boolean {
  return DEVICE_TYPE_CONTROLS.some((control) => deviceMatchesControlType(device, control.type))
}

export default function DevicesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedClass, setSelectedClass] = useState('All')
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [classes, setClasses] = useState(['All'])
  const [classControlLoading, setClassControlLoading] = useState<Record<string, 'on' | 'off' | null>>({})
  const [typeControlLoading, setTypeControlLoading] = useState<Record<string, boolean>>({})
  const [deviceControlLoading, setDeviceControlLoading] = useState<Record<number, 'on' | 'off' | null>>({})

  // Load devices from backend API
  useEffect(() => {
    const loadDevices = async () => {
      try {
        setLoading(true)
        const devicesData = await devicesAPI.getAll()
        setDevices(devicesData || [])
        
        // Extract unique locations
        if (devicesData && devicesData.length > 0) {
          const uniqueClasses = ['All', ...new Set(devicesData.map((d: Device) => d.location))]
          setClasses(uniqueClasses)
        }
        
        setError(null)
      } catch (err) {
        console.error('Error loading devices:', err)
        setError(err instanceof Error ? err.message : 'Failed to load devices')
        setDevices([])
      } finally {
        setLoading(false)
      }
    }

    loadDevices()
  }, [])

  const filteredDevices = selectedClass === 'All' 
    ? devices 
    : devices.filter(d => d.location === selectedClass)

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
      setClassControlLoading(prev => ({ ...prev, [classCode]: action }))
      await devicesAPI.controlByClass(classCode, action)

      setDevices(prev => prev.map(device => {
        if (device.location !== classCode) {
          return device
        }

        return {
          ...device,
          status: action === 'on' ? 'active' : 'idle',
          iot_status: action === 'on' ? 'active' : 'inactive',
        }
      }))

      setError(null)
    } catch (err) {
      console.error('Error controlling class devices:', err)
      setError(err instanceof Error ? err.message : 'Gagal mengirim perintah ON/OFF kelas ke Node-RED')
    } finally {
      setClassControlLoading(prev => ({ ...prev, [classCode]: null }))
    }
  }

  const handleDeviceControl = async (deviceId: number, action: 'on' | 'off') => {
    try {
      setDeviceControlLoading(prev => ({ ...prev, [deviceId]: action }))
      await devicesAPI.control(deviceId, action)
      setDevices(prev => prev.map(device => {
        if (device.id !== deviceId) {
          return device
        }

        return {
          ...device,
          status: action === 'on' ? 'active' : 'idle',
          iot_status: action === 'on' ? 'active' : 'offline',
        }
      }))
      setError(null)
    } catch (err) {
      console.error('Error controlling device:', err)
      setError(err instanceof Error ? err.message : 'Gagal mengirim perintah ON/OFF perangkat')
    } finally {
      setDeviceControlLoading(prev => ({ ...prev, [deviceId]: null }))
    }
  }

  const handleDeviceTypeControl = async (
    classCode: string,
    deviceType: DeviceTypeControl['type'],
    action: 'on' | 'off'
  ) => {
    const key = `${classCode}-${deviceType}-${action}`

    try {
      setTypeControlLoading(prev => ({ ...prev, [key]: true }))

      if (deviceType === 'lamp') {
        await nodeRedControlAPI.controlLamp(classCode, action)
      } else if (deviceType === 'ac') {
        await nodeRedControlAPI.controlAC(classCode, action)
      } else {
        await nodeRedControlAPI.controlProjector(classCode, action)
      }

      setDevices(prev => prev.map(device => {
        if (device.location !== classCode || !deviceMatchesControlType(device, deviceType)) {
          return device
        }

        return {
          ...device,
          status: action === 'on' ? 'active' : 'idle',
          iot_status: action === 'on' ? 'active' : 'inactive',
        }
      }))
      setError(null)
    } catch (err) {
      console.error(`Error controlling ${deviceType} devices in ${classCode}:`, err)
      setError(err instanceof Error ? err.message : `Gagal mengirim perintah ${deviceType.toUpperCase()} ${action.toUpperCase()} ke Node-RED`)
    } finally {
      setTypeControlLoading(prev => ({ ...prev, [key]: false }))
    }
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
    const active = isDeviceActive(device)

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
                #{device.id} - {device.device_type} - {isDeviceActive(device) ? 'Active' : 'Idle'}
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

  return (
    <div className="flex h-screen bg-gray-50" style={{
      backgroundImage: 'url(/sier-building-bg.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-white/40 pointer-events-none"></div>
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <DashboardHeader title="Dashboard Perangkat" sidebarOpen={sidebarOpen} onOpenSidebar={() => setSidebarOpen(true)} />

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto relative z-10">
          {error && (
            <div className="mx-8 mt-6 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-yellow-800 shadow-sm">
              Terjadi kendala saat memuat atau mengontrol perangkat.
            </div>
          )}

          {/* Clean Modern Filter Card */}
          <div className="mx-8 mt-6 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-slate-900 font-bold text-sm">Filter Status Perangkat</h3>
              <p className="text-slate-500 text-xs mt-0.5">Saring tampilan perangkat berdasarkan lokasi ruangan</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lokasi:</span>
              <div className="flex flex-wrap gap-1.5">
                {classes.map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                      selectedClass === cls
                        ? 'bg-[#2f46a3] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-8">
          {/* Room Controls (Only visible when "All" is selected) */}
          {selectedClass === 'All' && visibleClassCodes.length > 0 && (
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

          {/* Device Detailed List */}
          <div className="grid grid-cols-1 gap-6">
            {selectedClass === 'All' ? (
              // Placeholder when "All" is active
              <div className="text-center py-16 bg-white rounded-xl shadow-md border border-slate-200 p-8">
                <div className="mx-auto w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-3 text-slate-400">
                  <Activity size={24} />
                </div>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Pilih Ruangan Untuk Detail Perangkat</h4>
                <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
                  Silakan pilih ruangan tertentu melalui filter pilihan ruangan di pojok kanan atas untuk melihat status sensor, telemetri daya, suhu, dan kendali detail per alat.
                </p>
              </div>
            ) : filteredDevices.length > 0 ? (
              // Show class-specific details along with a single class control
              <>
                {/* Classroom single quick control above details */}
                <div className="mb-1 rounded-xl bg-white p-4 shadow-md border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Kontrol Cepat Ruang {selectedClass}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Nyalakan/matikan seluruh saklar di ruangan ini sekaligus</p>
                  </div>
                  <div className="flex space-x-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleClassControl(selectedClass, 'on')}
                      disabled={Boolean(classControlLoading[selectedClass])}
                      className="flex-1 sm:flex-none rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-60 transition-all active:scale-95"
                    >
                      {classControlLoading[selectedClass] === 'on' ? 'Mengirim...' : 'ON'}
                    </button>
                    <button
                      onClick={() => handleClassControl(selectedClass, 'off')}
                      disabled={Boolean(classControlLoading[selectedClass])}
                      className="flex-1 sm:flex-none rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60 transition-all active:scale-95"
                    >
                      {classControlLoading[selectedClass] === 'off' ? 'Mengirim...' : 'OFF'}
                    </button>
                  </div>
                </div>
                <div className="mb-1 rounded-xl bg-white p-4 shadow-md border border-slate-200">
                  <div className="mb-3">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Kontrol Per Tipe Ruang {selectedClass}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Kontrol Lampu, AC, atau Proyektor tanpa memengaruhi tipe perangkat lain.</p>
                  </div>
                  {renderTypeControls(selectedClass)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredDevices.map((device) => (
                    <div key={device.id} className="bg-white rounded-xl shadow-md p-6 border border-slate-200 flex flex-col justify-between hover:shadow-lg transition-all duration-300">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{device.location}</p>
                            <h3 className="text-base font-extrabold text-slate-800 mt-1 leading-snug">{device.device_name}</h3>
                            <p className="text-[10px] text-slate-400 font-mono mt-1">{device.device_eui}</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isDeviceOnline(device) 
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {isDeviceOnline(device) ? '● Online' : '○ Offline'}
                          </span>
                        </div>
                        <div className="space-y-2 text-xs text-slate-500 border-t border-slate-100 pt-3">
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
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600">Tidak ada perangkat ditemukan</p>
              </div>
            )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}


