'use client'

import { Activity } from 'lucide-react'
import { useState, useEffect } from 'react'
import { devicesAPI } from '@/lib/apiClient'
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

function isDeviceOnline(device: Device): boolean {
  const iot = String(device.iot_status || '').toLowerCase()
  const status = String(device.status || '').toLowerCase()
  return iot === 'online' || iot === 'active' || status === 'active' || status === 'idle'
}

export default function DevicesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedClass, setSelectedClass] = useState('All')
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [classes, setClasses] = useState(['All'])
  const [classControlLoading, setClassControlLoading] = useState<Record<string, 'on' | 'off' | null>>({})

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
    }
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
      backgroundImage: 'url(/assets/bg_image.png)',
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
                        ? 'bg-[#0f2d59] text-white shadow-sm'
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
              <h3 className="mb-4 text-sm font-bold text-slate-800 uppercase tracking-wider">Kontrol Saklar ON/OFF Per Ruangan</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleClassCodes.map((classCode) => (
                  <div key={classCode} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 hover:border-slate-300 transition-all">
                    <p className="text-sm font-bold text-slate-900">{classCode}</p>
                    <p className="mt-1 text-xs text-slate-400">Saklar cepat untuk seluruh AC & Lampu di ruangan ini.</p>
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

                      {['ac', 'projector', 'lamp', 'lighting'].includes(String(device.device_type).toLowerCase()) && (
                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kendali Perangkat:</span>
                            <span className="text-[9px] text-slate-400 font-mono">#{device.id}</span>
                          </div>
                          <div className="flex space-x-1.5">
                            <button
                              onClick={() => handleDeviceControl(device.id, 'on')}
                              disabled={device.status === 'active' || device.status === 'online'}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 duration-200 ${
                                (device.status === 'active' || device.status === 'online')
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md'
                              }`}
                            >
                              ON
                            </button>
                            <button
                              onClick={() => handleDeviceControl(device.id, 'off')}
                              disabled={!(device.status === 'active' || device.status === 'online')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 duration-200 ${
                                !(device.status === 'active' || device.status === 'online')
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                  : 'bg-red-600 text-white hover:bg-red-700 hover:shadow-md'
                              }`}
                            >
                              OFF
                            </button>
                          </div>
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


