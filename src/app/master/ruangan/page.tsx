'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Trash2, Plus, Pencil, X, Download, DoorOpen } from 'lucide-react'
import { classesAPI } from '@/lib/apiClient'
import { useAuth } from '@/components/AuthProvider'
import { exportToExcel } from '@/lib/exportExcel'
import Sidebar from '@/components/Sidebar'
import DashboardHeader from '@/components/DashboardHeader'
import Pagination from '@/components/Pagination'

type RoomStatus = 'active' | 'inactive'

type RoomRecord = {
  id: number
  name: string
  description?: string | null
  location?: string | null
  building?: string | null
  floor?: number | null
  area?: number | null
  capacity?: number | null
  status?: RoomStatus
}

type RoomFormState = {
  name: string
  description: string
  building: string
  floor: string
  area: string
  capacity: string
}

const EMPTY_FORM: RoomFormState = { name: '', description: '', building: '', floor: '', area: '', capacity: '' }

const PAGE_SIZE = 10

export default function MasterRuanganPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [rooms, setRooms] = useState<RoomRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<RoomFormState>(EMPTY_FORM)
  const [page, setPage] = useState(1)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<RoomFormState & { status: RoomStatus }>({ ...EMPTY_FORM, status: 'active' })
  const [editSaving, setEditSaving] = useState(false)

  const canManage = user?.role === 'admin' || user?.role === 'superadmin'

  const loadRooms = async () => {
    try {
      setLoading(true)
      const data = await classesAPI.getAll()
      setRooms(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data ruangan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRooms()
  }, [])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) {
      setError('Nama ruangan wajib diisi')
      return
    }
    try {
      setSaving(true)
      setError(null)
      await classesAPI.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        building: form.building.trim() || undefined,
        floor: form.floor ? Number(form.floor) : undefined,
        area: form.area ? Number(form.area) : undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
      })
      setForm(EMPTY_FORM)
      setPage(1)
      await loadRooms()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah ruangan')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (room: RoomRecord) => {
    setEditingId(room.id)
    setEditForm({
      name: room.name || '',
      description: room.description || '',
      building: room.building || '',
      floor: room.floor != null ? String(room.floor) : '',
      area: room.area != null ? String(room.area) : '',
      capacity: room.capacity != null ? String(room.capacity) : '',
      status: (room.status as RoomStatus) || 'active',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ ...EMPTY_FORM, status: 'active' })
  }

  const handleUpdate = async (id: number) => {
    if (!editForm.name.trim()) {
      setError('Nama ruangan wajib diisi')
      return
    }
    try {
      setEditSaving(true)
      setError(null)
      await classesAPI.update(id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        building: editForm.building.trim() || undefined,
        floor: editForm.floor ? Number(editForm.floor) : undefined,
        area: editForm.area ? Number(editForm.area) : undefined,
        capacity: editForm.capacity ? Number(editForm.capacity) : undefined,
        status: editForm.status,
      })
      cancelEdit()
      await loadRooms()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui ruangan')
    } finally {
      setEditSaving(false)
    }
  }

  const handleDelete = async (room: RoomRecord) => {
    const confirmed = confirm(
      `Hapus ruangan "${room.name}"?\n\nPERINGATAN: Semua perangkat yang terdaftar di ruangan ini akan ikut TERHAPUS PERMANEN (cascade delete). Tindakan ini tidak bisa dibatalkan.`
    )
    if (!confirmed) return
    try {
      await classesAPI.delete(room.id)
      await loadRooms()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus ruangan')
    }
  }

  const handleExport = () => {
    exportToExcel(
      rooms.map((r) => ({
        Nama: r.name,
        Deskripsi: r.description || '-',
        Gedung: r.building || '-',
        Lantai: r.floor ?? '-',
        Luas: r.area ?? '-',
        Kapasitas: r.capacity ?? '-',
        Status: r.status === 'inactive' ? 'Nonaktif' : 'Aktif',
      })),
      'master-ruangan',
      'Ruangan'
    )
  }

  const summary = useMemo(() => ({
    total: rooms.length,
    active: rooms.filter((r) => (r.status || 'active') === 'active').length,
    totalCapacity: rooms.reduce((sum, r) => sum + (Number(r.capacity) || 0), 0),
  }), [rooms])

  const pagedRooms = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return rooms.slice(start, start + PAGE_SIZE)
  }, [rooms, page])

  if (!canManage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <Shield className="mx-auto text-cyan-300" size={40} />
          <h1 className="mt-4 text-2xl font-bold">Akses ditolak</h1>
          <p className="mt-2 text-sm text-white/65">Halaman master ruangan hanya untuk role admin.</p>
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
      <div className="absolute inset-0 bg-white/95 pointer-events-none"></div>

      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <DashboardHeader title="Master Ruangan" sidebarOpen={sidebarOpen} onOpenSidebar={() => setSidebarOpen(true)} />

        <div className="flex-1 overflow-y-auto relative z-10 p-8">
          <div className="mx-auto max-w-7xl space-y-6">

            {/* Summary KPI Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">Master Data</p>
                <h2 className="text-xl font-bold text-gray-900 mt-1">Kelola Data Ruangan</h2>
                <p className="text-sm text-slate-500 mt-0.5">Admin dapat menambah, mengubah, dan menghapus data ruangan gedung SIER.</p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <Stat label="Total Ruangan" value={summary.total} />
                <Stat label="Ruangan Aktif" value={summary.active} />
                <Stat label="Total Kapasitas" value={summary.totalCapacity} />
              </div>
            </div>

            <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              {/* Form Create */}
              <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200 h-fit">
                <h2 className="text-base font-bold text-gray-900 mb-4 border-b pb-2">Tambah Ruangan</h2>
                <form onSubmit={handleCreate} className="space-y-4">
                  <Input label="Nama Ruangan" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
                  <Input label="Deskripsi" value={form.description} onChange={(value) => setForm({ ...form, description: value })} />
                  <Input label="Gedung" value={form.building} onChange={(value) => setForm({ ...form, building: value })} />
                  <div className="grid grid-cols-3 gap-3">
                    <Input label="Lantai" type="number" value={form.floor} onChange={(value) => setForm({ ...form, floor: value })} />
                    <Input label="Luas (m²)" type="number" value={form.area} onChange={(value) => setForm({ ...form, area: value })} />
                    <Input label="Kapasitas" type="number" value={form.capacity} onChange={(value) => setForm({ ...form, capacity: value })} />
                  </div>
                  {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 font-bold">{error}</div>}
                  <button
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#2f46a3] hover:bg-teal-800 transition-all px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-white disabled:opacity-70"
                  >
                    <Plus size={16} />
                    {saving ? 'Menyimpan...' : 'Tambah Ruangan'}
                  </button>
                </form>
              </div>

              {/* Rooms List */}
              <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200 flex flex-col">
                <div className="flex items-center justify-between mb-4 border-b pb-2">
                  <h2 className="text-base font-bold text-gray-900">Daftar Ruangan</h2>
                  <button
                    onClick={handleExport}
                    disabled={rooms.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition-all disabled:opacity-50"
                  >
                    <Download size={14} />
                    Export Excel
                  </button>
                </div>
                {loading ? (
                  <p className="text-xs text-gray-500 font-bold">Memuat ruangan...</p>
                ) : rooms.length === 0 ? (
                  <div className="text-center py-10">
                    <DoorOpen className="mx-auto text-slate-300" size={32} />
                    <p className="mt-2 text-xs text-slate-400 font-bold">Belum ada data ruangan</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {pagedRooms.map((room) => (
                        <div key={room.id} className="rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-all bg-slate-50">
                          {editingId === room.id ? (
                            <div className="space-y-3">
                              <Input label="Nama Ruangan" value={editForm.name} onChange={(value) => setEditForm({ ...editForm, name: value })} />
                              <Input label="Deskripsi" value={editForm.description} onChange={(value) => setEditForm({ ...editForm, description: value })} />
                              <Input label="Gedung" value={editForm.building} onChange={(value) => setEditForm({ ...editForm, building: value })} />
                              <div className="grid grid-cols-3 gap-3">
                                <Input label="Lantai" type="number" value={editForm.floor} onChange={(value) => setEditForm({ ...editForm, floor: value })} />
                                <Input label="Luas (m²)" type="number" value={editForm.area} onChange={(value) => setEditForm({ ...editForm, area: value })} />
                                <Input label="Kapasitas" type="number" value={editForm.capacity} onChange={(value) => setEditForm({ ...editForm, capacity: value })} />
                              </div>
                              <div>
                                <label className="mb-2 block text-xs font-bold text-slate-500 uppercase">Status</label>
                                <select
                                  value={editForm.status}
                                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as RoomStatus })}
                                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 outline-none text-sm focus:border-[#2f46a3] font-bold text-slate-700"
                                >
                                  <option value="active">Aktif</option>
                                  <option value="inactive">Nonaktif</option>
                                </select>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleUpdate(room.id)}
                                  disabled={editSaving}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2f46a3] hover:bg-teal-800 transition-all px-3 py-2 font-bold text-xs uppercase tracking-wider text-white disabled:opacity-70"
                                >
                                  {editSaving ? 'Menyimpan...' : 'Simpan'}
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 transition-all px-3 py-2 font-bold text-xs uppercase tracking-wider text-slate-600"
                                >
                                  <X size={14} />
                                  Batal
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-bold text-sm text-gray-900 leading-tight">{room.name}</p>
                                {room.description && <p className="text-xs text-gray-500 mt-1">{room.description}</p>}
                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                  {room.building && (
                                    <span className="inline-block text-[10px] uppercase font-extrabold tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                                      {room.building}
                                    </span>
                                  )}
                                  {room.floor != null && (
                                    <span className="inline-block text-[10px] uppercase font-extrabold tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                                      Lantai {room.floor}
                                    </span>
                                  )}
                                  {room.area != null && (
                                    <span className="inline-block text-[10px] uppercase font-extrabold tracking-wider bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded">
                                      {room.area} m²
                                    </span>
                                  )}
                                  {room.capacity != null && (
                                    <span className="inline-block text-[10px] uppercase font-extrabold tracking-wider bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded">
                                      Kapasitas {room.capacity}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${(room.status || 'active') === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                                  {(room.status || 'active') === 'active' ? 'aktif' : 'nonaktif'}
                                </span>
                                <button onClick={() => startEdit(room)} className="rounded-lg p-2 text-[#2f46a3] hover:bg-blue-50 transition-all">
                                  <Pencil size={16} />
                                </button>
                                <button onClick={() => handleDelete(room)} className="rounded-lg p-2 text-red-600 hover:bg-red-100 transition-all">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <Pagination page={page} totalItems={rooms.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
                  </>
                )}
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
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 min-w-[90px]">
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
