'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, Building2, Activity, Settings, LogOut } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { tenantsAPI } from '@/lib/apiClient'

type TenantSummary = {
  code: string
  name: string
  campus?: string | null
}

interface SidebarProps {
  open: boolean
  onToggle: () => void
}

// Daftar fakultas ditentukan oleh akun yang login: superadmin (rektorat) melihat
// semua fakultas aktif, user fakultas hanya melihat fakultasnya sendiri.
export default function Sidebar({ open, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout, switchTenant } = useAuth()
  const [tenants, setTenants] = useState<TenantSummary[]>([])
  const isSuperadmin = user?.role === 'superadmin'

  useEffect(() => {
    if (isSuperadmin) {
      tenantsAPI.getAll().then(setTenants).catch(() => setTenants([]))
    } else if (user?.tenant_code) {
      setTenants([{ code: user.tenant_code, name: user.tenant_name || user.tenant_code }])
    }
  }, [isSuperadmin, user?.tenant_code, user?.tenant_name])

  const facultyHref = (code: string) => `/fakultas/${code}`
  const isFacultyActive = (code: string) => pathname === facultyHref(code)

  return (
    <aside
      className={`${
        open ? 'w-64' : 'w-20'
      } bg-[#0f2d59] text-white transition-all duration-300 flex flex-col shadow-xl relative z-20 border-r-4 border-r-[#d8ae47]`}
    >
      <div className="p-4 flex items-center justify-between border-b border-white/10">
        {open && (
          <div className="flex-1 w-full h-auto">
            <Image
              src="/logo_unesa.png"
              alt="UNESA Logo"
              width={240}
              height={80}
              priority
              className="w-full h-auto object-contain brightness-110"
            />
          </div>
        )}
        <button onClick={onToggle} className="p-2 hover:bg-white/10 rounded transition-all ml-auto">
          <Menu size={20} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {isSuperadmin && (
          <Link
            href="/"
            className={`flex items-center space-x-3 px-4 py-3 rounded transition-all ${
              pathname === '/' ? 'bg-white/10 text-white font-bold' : 'text-white/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Building2 size={20} className={pathname === '/' ? 'text-[#f1c40f]' : ''} />
            {open && <span className="text-sm">Dasbor Rektorat</span>}
          </Link>
        )}

        {tenants.map((t) => {
          const active = isFacultyActive(t.code)
          return (
            <div key={t.code} className="space-y-1">
              <Link
                href={facultyHref(t.code)}
                onClick={() => switchTenant(t.code)}
                className={`flex items-center space-x-3 px-4 py-2.5 rounded transition-all ${
                  active ? 'bg-white/10 text-white font-bold' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Activity size={18} className={active ? 'text-[#f1c40f]' : ''} />
                {open && <span className="text-sm truncate">{t.name}</span>}
              </Link>

              {open && active && (
                <div className="pl-8 space-y-1 border-l border-white/10 ml-6">
                  <Link href={facultyHref(t.code)} className="block py-1.5 px-3 text-xs font-semibold text-white rounded bg-white/10">
                    Dasbor
                  </Link>
                  <Link href="/devices" className="block py-1.5 px-3 text-xs text-white/60 hover:text-white rounded hover:bg-white/5">
                    Perangkat
                  </Link>
                  <Link href="/analytics" className="block py-1.5 px-3 text-xs text-white/60 hover:text-white rounded hover:bg-white/5">
                    Analitik
                  </Link>
                  <Link href="/alerts" className="block py-1.5 px-3 text-xs text-white/60 hover:text-white rounded hover:bg-white/5">
                    Pemberitahuan
                  </Link>
                  <Link href="/users" className="block py-1.5 px-3 text-xs text-white/60 hover:text-white rounded hover:bg-white/5">
                    Pengguna
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="px-3 pb-6 space-y-2 border-t border-white/10 pt-4">
        <Link href="/settings" className="flex items-center space-x-3 px-4 py-3 rounded text-white/70 hover:bg-white/5 hover:text-white transition-all">
          <Settings size={20} />
          {open && <span className="text-sm">Pengaturan</span>}
        </Link>
        <button onClick={logout} className="w-full flex items-center space-x-3 px-4 py-3 rounded text-white/70 hover:bg-white/5 hover:text-white transition-all text-left">
          <LogOut size={20} />
          {open && <span className="text-sm">Keluar</span>}
        </button>
      </div>
    </aside>
  )
}
