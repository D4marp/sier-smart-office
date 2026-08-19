'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Trash2, Plus, Mail, AlertTriangle } from 'lucide-react'
import { usersAPI, roomOccupantsAPI, classesAPI } from '@/lib/apiClient'
import { useAuth } from '@/components/AuthProvider'
import { SIER_TENANT_CODE } from '@/lib/tenantDefaults'
import Sidebar from '@/components/Sidebar'
import DashboardHeader from '@/components/DashboardHeader'
import Pagination from '@/components/Pagination'
import RoomDropdown from '@/components/RoomDropdown'
import { exportToExcel } from '@/lib/exportExcel'

type UserRole = 'superadmin' | 'admin' | 'manager' | 'viewer'

type UserRecord = {
  id: number
  full_name: string
  email: string
  role: UserRole
  is_active: boolean
  last_login?: string
  tenant_code?: string | null
  tenant_name?: string | null
}

type RoomClass = {
  id: number
  name: string
}

type RoomOccupant = {
  id: number
  class_id: number
  class_name?: string
  full_name: string
  email: string
  phone: string
  notify_email: boolean
  created_at: string
}

export default function UsersPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'viewer' as UserRole })

  // Room occupants (Penghuni Ruangan) state
  const [rooms, setRooms] = useState<RoomClass[]>([])
  const [occupants, setOccupants] = useState<RoomOccupant[]>([])
  const [occupantsLoading, setOccupantsLoading] = useState(true)
  const [occupantSaving, setOccupantSaving] = useState(false)
  const [occupantError, setOccupantError] = useState<string | null>(null)
  const [occupantPage, setOccupantPage] = useState(1)
  const occupantPageSize = 10
  const [occupantForm, setOccupantForm] = useState({
    room: '',
    full_name: '',
    email: '',
    phone: '',
    notify_email: true,
  })

  const isSuperadmin = user?.role === 'superadmin'
  const canManage = user?.role === 'admin' || isSuperadmin

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await usersAPI.getAll()
      setUsers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat user')
    } finally {
      setLoading(false)
    }
  }

  const loadOccupants = async () => {
    try {
      setOccupantsLoading(true)
      const [roomsData, occupantsData] = await Promise.all([
        classesAPI.getAll(),
        roomOccupantsAPI.getAll(),
      ])
      setRooms(roomsData || [])
      setOccupants(occupantsData || [])
      if (!occupantForm.room && roomsData?.length) {
        setOccupantForm((prev) => ({ ...prev, room: roomsData[0].name }))
      }
    } catch (err) {
      setOccupantError(err instanceof Error ? err.message : 'Gagal memuat penghuni ruangan')
    } finally {
      setOccupantsLoading(false)
    }
  }

  useEffect(() => {
    if (canManage) {
      loadUsers()
      loadOccupants()
    }
  }, [canManage])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      setSaving(true)
      const payload: Record<string, unknown> = { ...form }
      if (form.role !== 'superadmin') {
        payload.tenant_code = SIER_TENANT_CODE
      }
      await usersAPI.create(payload)
      setForm({ full_name: '', email: '', password: '', role: 'viewer' })
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah user')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus user ini?')) return
    await usersAPI.delete(id)
    await loadUsers()
  }

  const summary = useMemo(() => ({
    total: users.length,
    admins: users.filter((item) => item.role === 'admin').length,
    active: users.filter((item) => item.is_active).length,
  }), [users])

  const handleCreateOccupant = async (event: React.FormEvent) => {
    event.preventDefault()
    const selectedRoom = rooms.find((r) => r.name === occupantForm.room)
    if (!selectedRoom) {
      setOccupantError('Pilih ruangan terlebih dahulu')
      return
    }
    try {
      setOccupantSaving(true)
      await roomOccupantsAPI.create({
        class_id: selectedRoom.id,
        full_name: occupantForm.full_name,
        email: occupantForm.email,
        phone: occupantForm.phone,
        notify_email: occupantForm.notify_email,
      })
      setOccupantForm({ room: occupantForm.room, full_name: '', email: '', phone: '', notify_email: true })
      setOccupantError(null)
      await loadOccupants()
    } catch (err) {
      setOccupantError(err instanceof Error ? err.message : 'Gagal menambah penghuni ruangan')
    } finally {
      setOccupantSaving(false)
    }
  }

  const handleDeleteOccupant = async (id: number) => {
    if (!confirm('Hapus penghuni ruangan ini?')) return
    await roomOccupantsAPI.delete(id)
    await loadOccupants()
  }

  const handleExportOccupants = () => {
    exportToExcel(
      occupants.map((item) => ({
        Ruangan: item.class_name || rooms.find((r) => r.id === item.class_id)?.name || '-',
        Nama: item.full_name,
        Email: item.email,
        Telepon: item.phone,
        'Notifikasi Email': item.notify_email ? 'Aktif' : 'Nonaktif',
      })),
      'penghuni-ruangan',
      'Penghuni Ruangan'
    )
  }

  const paginatedOccupants = useMemo(() => {
    const start = (occupantPage - 1) * occupantPageSize
    return occupants.slice(start, start + occupantPageSize)
  }, [occupants, occupantPage])

  if (!canManage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <Shield className="mx-auto text-cyan-300" size={40} />
          <h1 className="mt-4 text-2xl font-bold">Akses ditolak</h1>
          <p className="mt-2 text-sm text-white/65">Halaman user management hanya untuk role admin.</p>
          <button onClick={() => router.push('/')} className="mt-6 rounded-2xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950">
            Kembali
          </button>
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
        <DashboardHeader title="Dashboard Pengguna" sidebarOpen={sidebarOpen} onOpenSidebar={() => setSidebarOpen(true)} />

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto relative z-10 p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            
            {/* Summary KPI Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">User Management</p>
                <h2 className="text-xl font-bold text-gray-900 mt-1">Kelola Pengguna Dashboard</h2>
                <p className="text-sm text-slate-500 mt-0.5">Admin dapat menambah, mengubah, dan menonaktifkan pengguna dashboard.</p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <Stat label="Total" value={summary.total} />
                <Stat label="Admin" value={summary.admins} />
                <Stat label="Aktif" value={summary.active} />
              </div>
            </div>

            <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              {/* Form Create */}
              <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
                <h2 className="text-base font-bold text-gray-900 mb-4 border-b pb-2">Tambah Pengguna</h2>
                <form onSubmit={handleCreate} className="space-y-4">
                  <Input label="Nama Lengkap" value={form.full_name} onChange={(value) => setForm({ ...form, full_name: value })} />
                  <Input label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
                  <Input label="Password" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />
                  <div>
                    <label className="mb-2 block text-xs font-bold text-slate-500 uppercase">Role</label>
                    <select 
                      value={form.role} 
                      onChange={(e) => setForm({ ...form, role: e.target.value as any })} 
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none text-sm focus:border-[#2f46a3] font-bold text-slate-700"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                      {isSuperadmin && <option value="superadmin">Superadmin</option>}
                    </select>
                  </div>
                  {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 font-bold">{error}</div>}
                  <button 
                    disabled={saving} 
                    className="inline-flex items-center gap-2 rounded-lg bg-[#2f46a3] hover:bg-teal-800 transition-all px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-white disabled:opacity-70"
                  >
                    <Plus size={16} />
                    {saving ? 'Menyimpan...' : 'Tambah User'}
                  </button>
                </form>
              </div>

              {/* Users List */}
              <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200 flex flex-col h-[500px]">
                <h2 className="text-base font-bold text-gray-900 mb-4 border-b pb-2">Daftar Pengguna</h2>
                {loading ? (
                  <p className="text-xs text-gray-500 font-bold">Memuat user...</p>
                ) : (
                  <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                    {users.map((item) => (
                      <div key={item.id} className="rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-all bg-slate-50 flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold text-sm text-gray-900 leading-tight">{item.full_name}</p>
                          <p className="text-xs text-gray-500 mt-1">{item.email}</p>
                          <span className="inline-block mt-2 text-[10px] uppercase font-extrabold tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                            {item.role}
                          </span>
                          <span className="inline-block mt-2 ml-1 text-[10px] uppercase font-extrabold tracking-wider bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded">
                            {item.role === 'superadmin' ? 'akses penuh' : item.tenant_name || item.tenant_code || '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                            {item.is_active ? 'aktif' : 'nonaktif'}
                          </span>
                          <button onClick={() => handleDelete(item.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-100 transition-all">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Penghuni Ruangan */}
            <section className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">Penghuni Ruangan</p>
                    <h2 className="text-xl font-bold text-gray-900 mt-1">Penanggung Jawab per Ruangan</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Daftarkan siapa yang bertanggung jawab atas tiap ruangan agar dapat dihubungi untuk pemberitahuan energi/perangkat di masa mendatang.
                    </p>
                  </div>
                  {occupants.length > 0 && (
                    <button
                      onClick={handleExportOccupants}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
                    >
                      Export Excel
                    </button>
                  )}
                </div>

                <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                  <p>
                    Data penghuni ruangan ini tersimpan dan terhubung ke server, tapi pengiriman notifikasi email <strong>belum aktif</strong> — sistem belum
                    terhubung ke server SMTP. Setelah kredensial email tersedia, fitur ini tinggal diaktifkan tanpa perlu ubah data yang sudah ada.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                {canManage && (
                  <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
                    <h2 className="text-base font-bold text-gray-900 mb-4 border-b pb-2">Tambah Penghuni Ruangan</h2>
                    <form onSubmit={handleCreateOccupant} className="space-y-4">
                      <div>
                        <label className="mb-2 block text-xs font-bold text-slate-500 uppercase">Ruangan</label>
                        <RoomDropdown
                          rooms={rooms.map((r) => r.name)}
                          value={occupantForm.room}
                          onChange={(value) => setOccupantForm({ ...occupantForm, room: value })}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none text-sm focus:border-[#2f46a3] font-bold text-slate-700"
                        />
                      </div>
                      <Input label="Nama Lengkap" value={occupantForm.full_name} onChange={(value) => setOccupantForm({ ...occupantForm, full_name: value })} />
                      <Input label="Email" type="email" value={occupantForm.email} onChange={(value) => setOccupantForm({ ...occupantForm, email: value })} />
                      <Input label="Telepon" value={occupantForm.phone} onChange={(value) => setOccupantForm({ ...occupantForm, phone: value })} />
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <input
                          type="checkbox"
                          checked={occupantForm.notify_email}
                          onChange={(e) => setOccupantForm({ ...occupantForm, notify_email: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-[#2f46a3] focus:ring-[#2f46a3]"
                        />
                        Aktifkan notifikasi email
                      </label>
                      {occupantError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 font-bold">{occupantError}</div>}
                      <button
                        disabled={occupantSaving || rooms.length === 0}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#2f46a3] hover:bg-teal-800 transition-all px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-white disabled:opacity-70"
                      >
                        <Plus size={16} />
                        {occupantSaving ? 'Menyimpan...' : 'Tambah Penghuni'}
                      </button>
                    </form>
                  </div>
                )}

                <div className={`rounded-xl bg-white p-6 shadow-sm border border-slate-200 flex flex-col ${canManage ? '' : 'lg:col-span-2'}`}>
                  <h2 className="text-base font-bold text-gray-900 mb-4 border-b pb-2 flex items-center gap-2">
                    <Mail size={16} className="text-slate-400" />
                    Daftar Penghuni Ruangan
                  </h2>
                  {occupantsLoading ? (
                    <p className="text-xs text-gray-500 font-bold">Memuat data...</p>
                  ) : occupants.length === 0 ? (
                    <p className="text-xs text-gray-500 font-bold">Belum ada penghuni ruangan terdaftar.</p>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {paginatedOccupants.map((item) => (
                          <div key={item.id} className="rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-all bg-slate-50 flex items-start justify-between gap-4">
                            <div>
                              <span className="inline-block text-[10px] uppercase font-extrabold tracking-wider bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded mb-1">
                                {item.class_name || rooms.find((r) => r.id === item.class_id)?.name || `Ruangan #${item.class_id}`}
                              </span>
                              <p className="font-bold text-sm text-gray-900 leading-tight">{item.full_name}</p>
                              <p className="text-xs text-gray-500 mt-1">{item.email || '-'}</p>
                              <p className="text-xs text-gray-500">{item.phone || '-'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${item.notify_email ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                                {item.notify_email ? 'Notifikasi aktif' : 'Notifikasi nonaktif'}
                              </span>
                              {canManage && (
                                <button onClick={() => handleDeleteOccupant(item.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-100 transition-all">
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <Pagination page={occupantPage} totalItems={occupants.length} pageSize={occupantPageSize} onPageChange={setOccupantPage} />
                    </>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 min-w-[80px]">
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold leading-none">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-800 leading-none">{value}</p>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold text-slate-500 uppercase">{label}</label>
      <input 
        type={type} 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-[#2f46a3]" 
      />
    </div>
  )
}