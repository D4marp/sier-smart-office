'use client'

import { useState, useEffect } from 'react'
import { Bell, AlertCircle, Trash2 } from 'lucide-react'
import { alertsAPI } from '@/lib/apiClient'
import Sidebar from '@/components/Sidebar'
import DashboardHeader from '@/components/DashboardHeader'

interface Alert {
  id: number
  title: string
  message: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'unread' | 'read'
  device_id: number
  created_at: string
}

export default function AlertsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load alerts from backend API
  useEffect(() => {
    const loadAlerts = async () => {
      try {
        setLoading(true)
        const alertsData = await alertsAPI.getAll()
        setAlerts(alertsData || [])
        setError(null)
      } catch (err) {
        console.error('Error loading alerts:', err)
        setError(err instanceof Error ? err.message : 'Failed to load alerts')
        setAlerts([])
      } finally {
        setLoading(false)
      }
    }

    loadAlerts()
  }, [])

  const filteredAlerts = filterStatus === 'all' 
    ? alerts 
    : alerts.filter(a => a.status === filterStatus)

  const unreadCount = alerts.filter(a => a.status === 'unread').length

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 border-l-4 border-red-500'
      case 'high':
        return 'bg-orange-100 border-l-4 border-orange-500'
      case 'medium':
        return 'bg-yellow-100 border-l-4 border-yellow-500'
      case 'low':
        return 'bg-blue-100 border-l-4 border-blue-500'
      default:
        return 'bg-gray-100 border-l-4 border-gray-500'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertCircle className="text-red-600" size={20} />
      case 'medium':
        return <AlertCircle className="text-yellow-600" size={20} />
      default:
        return <AlertCircle className="text-blue-600" size={20} />
    }
  }

  const handleMarkAsRead = async (id: number) => {
    try {
      await alertsAPI.markAsRead(id)
      setAlerts(alerts.map(a => 
        a.id === id ? { ...a, status: 'read' } : a
      ))
    } catch (err) {
      console.error('Error marking alert as read:', err)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await alertsAPI.delete(id)
      setAlerts(alerts.filter(a => a.id !== id))
    } catch (err) {
      console.error('Error deleting alert:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat pemberitahuan...</p>
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
        <DashboardHeader title="Dashboard Pemberitahuan" sidebarOpen={sidebarOpen} onOpenSidebar={() => setSidebarOpen(true)} />

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto relative z-10">
          {error && (
            <div className="mx-8 mt-6 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-yellow-800 shadow-sm">
              Gagal mengambil data pemberitahuan. Halaman tetap tersedia dengan daftar kosong.
            </div>
          )}

          {/* Clean Modern Filter & Summary Card */}
          <div className="mx-8 mt-6 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-slate-900 font-bold text-sm">Filter Pemberitahuan</h2>
              <p className="text-slate-500 text-xs mt-0.5">Kelola dan saring pemberitahuan sistem smart energy</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right pr-4 border-r border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Belum Dibaca</span>
                <p className="text-xl font-black text-red-600 leading-none mt-1">{unreadCount}</p>
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none focus:border-[#2f46a3]"
              >
                <option value="all">Semua Status</option>
                <option value="unread">Belum Dibaca</option>
                <option value="read">Sudah Dibaca</option>
              </select>
            </div>
          </div>

          {/* Alerts List */}
          <div className="p-8">
            <div className="space-y-4">
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert) => (
                  <div key={alert.id} className={`p-4 rounded-lg bg-white border border-slate-200 shadow-sm ${getSeverityColor(alert.severity)} flex items-start justify-between`}>
                    <div className="flex items-start space-x-4 flex-1">
                      {getSeverityIcon(alert.severity)}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                        <p className="text-gray-700 text-sm mt-1">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Device #{alert.device_id} • {new Date(alert.created_at).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {alert.status === 'unread' && (
                        <button
                          onClick={() => handleMarkAsRead(alert.id)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-all"
                        >
                          Tandai Dibaca
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(alert.id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-all"
                        title="Hapus"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border border-slate-200 shadow-sm">
                  <Bell size={48} className="text-gray-300 mx-auto mb-4 animate-bounce" />
                  <p className="text-gray-500 font-semibold text-sm">Tidak ada pemberitahuan</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
