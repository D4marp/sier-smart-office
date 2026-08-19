'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Trash2, Plus, Pencil, X, Download, Cpu } from 'lucide-react'
import { deviceTypesAPI } from '@/lib/apiClient'
import { useAuth } from '@/components/AuthProvider'
import { exportToExcel } from '@/lib/exportExcel'
import Sidebar from '@/components/Sidebar'
import DashboardHeader from '@/components/DashboardHeader'
import Pagination from '@/components/Pagination'

type DeviceTypeStatus = 'active' | 'inactive'

type DeviceTypeRecord = {
  id: number
  code: string
  label: string
  category?: string | null
  icon?: string | null
  controllable?: boolean
  status?: DeviceTypeStatus
}

type DeviceTypeFormState = {
  code: string
  label: string
  category: string
  controllable: boolean
}

const EMPTY_FORM: DeviceTypeFormState = { code: '', label: '', category: '', controllable: false }

const CATEGORY_SUGGESTIONS = ['lighting', 'climate', 'gateway', 'sensor', 'power', 'controller', 'interface']

const PAGE_SIZE = 10

export default function MasterTipePerangkatPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [types, setTypes] = useState<DeviceTypeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<DeviceTypeFormState>(EMPTY_FORM)
  const [page, setPage] = useState(1)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<DeviceTypeFormState & { status: DeviceTypeStatus }>({ ...EMPTY_FORM, status: 'active' })
  const [editSaving, setEditSaving] = useState(false)

  const canManage = user?.role === 'admin' || user?.role === 'superadmin'

  const loadTypes = async () => {
    try {
      setLoading(true)
      const data = await deviceTypesAPI.getAll()
      setTypes(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data tipe perangkat')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTypes()
  }, [])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.code.trim() || !form.label.trim()) {
      setError('Kode dan label wajib diisi')
      return
    }
    try {
      setSaving(true)
      setError(null)
      await deviceTypesAPI.create({
        code: form.code.trim().toUpperCase(),
        label: form.label.trim(),
        category: form.category.trim() || undefined,
        controllable: form.controllable,
      })
      setForm(EMPTY_FORM)
      setPage(1)
      await loadTypes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah tipe perangkat')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (type: DeviceTypeRecord) => {
    setEditingId(type.id)
    setEditForm({
      code: type.code || '',
      label: type.label || '',
      category: type.category || '',
      controllable: !!type.controllable,
      status: (type.status as DeviceTypeStatus) || 'active',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ ...EMPTY_FORM, status: 'active' })
  }

  const handleUpdate = async (id: number) => {
    if (!editForm.code.trim() || !editForm.label.trim()) {
      setError('Kode dan label wajib diisi')
      return
    }
    try {
      setEditSaving(true)
      setError(null)
      await deviceTypesAPI.update(id, {
        code: editForm.code.trim().toUpperCase(),
        label: editForm.label.trim(),
        category: editForm.category.trim() || undefined,
        controllable: editForm.controllable,
        status: editForm.status,
      })
      cancelEdit()
      await loadTypes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui tipe perangkat')
    } finally {
      setEditSaving(false)
    }
  }

  const handleDelete = async (type: DeviceTypeRecord) => {
    if (!confirm(`Hapus tipe perangkat "${type.label}" (${type.code})?`)) return
    try {
      await deviceTypesAPI.delete(type.id)
      await loadTypes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus tipe perangkat')
    }
  }

  const handleExport = () => {
    exportToExcel(
      types.map((t) => ({
        Kode: t.code,
        Label: t.label,
        Kategori: t.category || '-',
        'Bisa Dikendalikan': t.controllable ? 'Ya' : 'Tidak',
        Status: t.status === 'inactive' ? 'Nonaktif' : 'Aktif',
      })),
      'master-tipe-perangkat',
      'Tipe Perangkat'
    )
  }

  const summary = useMemo(() => ({
    total: types.length,
    controllable: types.filter((t) => t.controllable).length,
    categories: new Set(types.map((t) => (t.category || '').trim()).filter(Boolean)).size,
  }), [types])

  const pagedTypes = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return types.slice(start, start + PAGE_SIZE)
  }, [types, page])

  if (!canManage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <Shield className="mx-auto text-cyan-300" size={40} />
          <h1 className="mt-4 text-2xl font-bold">Akses ditolak</h1>
          <p className="mt-2 text-sm text-white/65">Halaman master tipe perangkat hanya untuk role admin.</p>
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
      <div className="absolute inset-0 bg-white/40 pointer-events-none"></div>

      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <DashboardHeader title="Master Tipe Perangkat" sidebarOpen={sidebarOpen} onOpenSidebar={() => setSidebarOpen(true)} />

        <div className="flex-1 overflow-y-auto relative z-10 p-8">
          <div className="mx-auto max-w-7xl space-y-6">

            {/* Summary KPI Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">Master Data</p>
                <h2 className="text-xl font-bold text-gray-900 mt-1">Kelola Tipe Perangkat</h2>
                <p className="text-sm text-slate-500 mt-0.5">Admin dapat menambah, mengubah, dan menghapus tipe perangkat IoT.</p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <Stat label="Total Tipe" value={summary.total} />
                <Stat label="Tipe Terkendali" value={summary.controllable} />
                <Stat label="Kategori Unik" value={summary.categories} />
              </div>
            </div>

            <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              {/* Form Create */}
              <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200 h-fit">
                <h2 className="text-base font-bold text-gray-900 mb-4 border-b pb-2">Tambah Tipe Perangkat</h2>
                <form onSubmit={handleCreate} className="space-y-4">
                  <Input label="Kode (mis. LAMP, AC)" value={form.code} onChange={(value) => setForm({ ...form, code: value })} />
                  <Input label="Label" value={form.label} onChange={(value) => setForm({ ...form, label: value })} />
                  <div>
                    <label className="mb-2 block text-xs font-bold text-slate-500 uppercase">Kategori</label>
                    <input
                      list="category-suggestions"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-[#2f46a3]"
                    />
                    <datalist id="category-suggestions">
                      {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase">
                    <input
                      type="checkbox"
                      checked={form.controllable}
                      onChange={(e) => setForm({ ...form, controllable: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-[#2f46a3] focus:ring-[#2f46a3]"
                    />
                    Bisa dikendalikan (ON/OFF)
                  </label>
                  {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 font-bold">{error}</div>}
                  <button
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#2f46a3] hover:bg-teal-800 transition-all px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-white disabled:opacity-70"
                  >
                    <Plus size={16} />
                    {saving ? 'Menyimpan...' : 'Tambah Tipe'}
                  </button>
                </form>
              </div>

              {/* Types List */}
              <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200 flex flex-col">
                <div className="flex items-center justify-between mb-4 border-b pb-2">
                  <h2 className="text-base font-bold text-gray-900">Daftar Tipe Perangkat</h2>
                  <button
                    onClick={handleExport}
                    disabled={types.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition-all disabled:opacity-50"
                  >
                    <Download size={14} />
                    Export Excel
                  </button>
                </div>
                {loading ? (
                  <p className="text-xs text-gray-500 font-bold">Memuat tipe perangkat...</p>
                ) : types.length === 0 ? (
                  <div className="text-center py-10">
                    <Cpu className="mx-auto text-slate-300" size={32} />
                    <p className="mt-2 text-xs text-slate-400 font-bold">Belum ada tipe perangkat</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {pagedTypes.map((type) => (
                        <div key={type.id} className="rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-all bg-slate-50">
                          {editingId === type.id ? (
                            <div className="space-y-3">
                              <Input label="Kode" value={editForm.code} onChange={(value) => setEditForm({ ...editForm, code: value })} />
                              <Input label="Label" value={editForm.label} onChange={(value) => setEditForm({ ...editForm, label: value })} />
                              <div>
                                <label className="mb-2 block text-xs font-bold text-slate-500 uppercase">Kategori</label>
                                <input
                                  list="category-suggestions-edit"
                                  value={editForm.category}
                                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-[#2f46a3]"
                                />
                                <datalist id="category-suggestions-edit">
                                  {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
                                </datalist>
                              </div>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase">
                                <input
                                  type="checkbox"
                                  checked={editForm.controllable}
                                  onChange={(e) => setEditForm({ ...editForm, controllable: e.target.checked })}
                                  className="h-4 w-4 rounded border-slate-300 text-[#2f46a3] focus:ring-[#2f46a3]"
                                />
                                Bisa dikendalikan (ON/OFF)
                              </label>
                              <div>
                                <label className="mb-2 block text-xs font-bold text-slate-500 uppercase">Status</label>
                                <select
                                  value={editForm.status}
                                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as DeviceTypeStatus })}
                                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 outline-none text-sm focus:border-[#2f46a3] font-bold text-slate-700"
                                >
                                  <option value="active">Aktif</option>
                                  <option value="inactive">Nonaktif</option>
                                </select>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleUpdate(type.id)}
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
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-sm text-gray-900 leading-tight">{type.label}</p>
                                  <span className="text-[10px] font-mono font-extrabold tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                                    {type.code}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                  {type.category && (
                                    <span className="inline-block text-[10px] uppercase font-extrabold tracking-wider bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded">
                                      {type.category}
                                    </span>
                                  )}
                                  <span className={`inline-block text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded ${type.controllable ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                                    {type.controllable ? 'Bisa dikendalikan' : 'Hanya tampil'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${(type.status || 'active') === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                                  {(type.status || 'active') === 'active' ? 'aktif' : 'nonaktif'}
                                </span>
                                <button onClick={() => startEdit(type)} className="rounded-lg p-2 text-[#2f46a3] hover:bg-blue-50 transition-all">
                                  <Pencil size={16} />
                                </button>
                                <button onClick={() => handleDelete(type)} className="rounded-lg p-2 text-red-600 hover:bg-red-100 transition-all">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <Pagination page={page} totalItems={types.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
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
