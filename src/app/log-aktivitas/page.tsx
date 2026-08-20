'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { History, FileDown, Info } from 'lucide-react'
import { auditLogsAPI, classesAPI, devicesAPI } from '@/lib/apiClient'
import { exportToExcel } from '@/lib/exportExcel'
import Sidebar from '@/components/Sidebar'
import DashboardHeader from '@/components/DashboardHeader'
import Pagination from '@/components/Pagination'
import RoomDropdown from '@/components/RoomDropdown'

interface ActivityItem {
  id: number
  action: string
  device_id: number
  new_values: Record<string, unknown>
  created_at: string
  user_id: number | null
  device_name: string
  location: string
  source: 'app' | 'manual'
}

const PAGE_SIZE = 20

// Peta aksi mentah dari audit_logs ke label ramah pengguna (Bahasa Indonesia).
const ACTION_LABELS: Record<string, string> = {
  device_on: 'Dinyalakan',
  device_off: 'Dimatikan',
  device_scheduled_on: 'Dinyalakan (Jadwal)',
  device_scheduled_off: 'Dimatikan (Jadwal)',
  device_restart_requested: 'Restart diminta',
  status_change: 'Perubahan status (dari perangkat)',
}

function formatAction(action: string): string {
  return ACTION_LABELS[action] || action
}

function LogAktivitasContent() {
  const searchParams = useSearchParams()
  const deviceIdParam = searchParams.get('deviceId')
  const deviceId = deviceIdParam ? Number(deviceIdParam) : undefined

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [rooms, setRooms] = useState<string[]>([])
  const [roomToClassId, setRoomToClassId] = useState<Record<string, number>>({})
  const [selectedRoom, setSelectedRoom] = useState('Semua Ruangan')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'app' | 'manual'>('all')

  const [items, setItems] = useState<ActivityItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Ambil daftar ruangan unik dari perangkat + mapping nama ruangan -> class_id
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [devicesData, classesData] = await Promise.all([
          devicesAPI.getAll(),
          classesAPI.getAll(),
        ])
        const deviceList = (devicesData || []) as any[]
        const uniqueRooms = Array.from(new Set(deviceList.map((d) => d.location).filter(Boolean)))
        setRooms(uniqueRooms)

        const mapping: Record<string, number> = {}
        ;(classesData || []).forEach((cls: any) => {
          if (cls?.name) mapping[cls.name] = cls.id
        })
        setRoomToClassId(mapping)
      } catch (err) {
        console.error('Error loading filter data:', err)
      }
    }

    loadFilters()
  }, [])

  useEffect(() => {
    const loadActivity = async () => {
      try {
        setLoading(true)
        setError(null)
        const classId = selectedRoom === 'Semua Ruangan' ? undefined : roomToClassId[selectedRoom]
        const response = await auditLogsAPI.getDeviceActivity({ classId, deviceId, page, limit: PAGE_SIZE })
        setItems((response.items || []) as ActivityItem[])
        setTotal(response.total || 0)
      } catch (err) {
        console.error('Error loading device activity log:', err)
        setError(err instanceof Error ? err.message : 'Gagal memuat log aktivitas perangkat')
        setItems([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    }

    loadActivity()
  }, [selectedRoom, deviceId, page, roomToClassId])

  // Reset ke halaman 1 saat filter ruangan berubah
  useEffect(() => {
    setPage(1)
  }, [selectedRoom])

  const filteredItems = useMemo(() => {
    if (sourceFilter === 'all') return items
    return items.filter((item) => item.source === sourceFilter)
  }, [items, sourceFilter])

  const handleExport = () => {
    const rows = filteredItems.map((item) => ({
      Waktu: new Date(item.created_at).toLocaleString('id-ID'),
      Ruangan: item.location,
      Perangkat: item.device_name,
      Aksi: formatAction(item.action),
      Sumber: item.source === 'app' ? 'Aplikasi' : 'Manual (Perangkat)',
    }))
    exportToExcel(rows, 'log-aktivitas-perangkat')
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat log aktivitas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50" style={{
      backgroundImage: "url('/sier-building-bg.jpg')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
    }}>
      <div className="absolute inset-0 bg-white/95 pointer-events-none"></div>

      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <DashboardHeader title="Log Aktivitas Perangkat" sidebarOpen={sidebarOpen} onOpenSidebar={() => setSidebarOpen(true)} />

        <div className="flex-1 overflow-y-auto relative z-10">
          {error && (
            <div className="mx-8 mt-6 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-yellow-800 shadow-sm">
              Gagal mengambil data log aktivitas. Halaman tetap tersedia dengan daftar kosong.
            </div>
          )}

          {/* Explanatory note */}
          <div className="mx-8 mt-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900 shadow-sm flex items-start gap-3">
            <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              Baris <strong>&quot;Aplikasi&quot;</strong> tercatat saat kontrol dilakukan lewat dashboard ini. Baris <strong>&quot;Manual&quot;</strong> adalah
              tebakan terbaik dari data sensor perangkat — perangkat itu sendiri tidak melaporkan siapa yang menekan tombolnya secara fisik.
            </p>
          </div>

          {/* Filter Card */}
          <div className="mx-8 mt-6 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-slate-900 font-bold text-sm">Filter Log Aktivitas</h2>
              <p className="text-slate-500 text-xs mt-0.5">Saring log berdasarkan ruangan dan sumber kontrol</p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <RoomDropdown
                rooms={rooms}
                value={selectedRoom}
                onChange={setSelectedRoom}
                allLabel="Semua Ruangan"
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none focus:border-[#2f46a3]"
              />

              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as 'all' | 'app' | 'manual')}
                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none focus:border-[#2f46a3]"
              >
                <option value="all">Semua Sumber</option>
                <option value="app">Aplikasi</option>
                <option value="manual">Manual (Perangkat)</option>
              </select>

              <button
                onClick={handleExport}
                disabled={filteredItems.length === 0}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#2f46a3] hover:bg-[#263a87] text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileDown size={14} />
                Export Excel
              </button>
            </div>
          </div>

          {/* Activity List */}
          <div className="p-8">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="space-y-3">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <div key={item.id} className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-gray-900 text-sm">{item.device_name}</h3>
                          <span className="text-xs text-gray-500">• {item.location}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            item.source === 'app'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {item.source === 'app' ? '🖥️ Aplikasi' : '🔌 Manual (Perangkat)'}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm mt-1.5">{formatAction(item.action)}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(item.created_at).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <History size={48} className="text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-semibold text-sm">Tidak ada log aktivitas</p>
                  </div>
                )}
              </div>

              <Pagination page={page} totalItems={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function LogAktivitasPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat log aktivitas...</p>
        </div>
      </div>
    }>
      <LogAktivitasContent />
    </Suspense>
  )
}
