'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, LayoutDashboard, Activity, BarChart3, Bell, Users, Settings, LogOut } from 'lucide-react'
import { useAuth } from './AuthProvider'

interface SidebarProps {
  open: boolean
  onToggle: () => void
}

const NAV_ITEMS = [
  { href: '/', label: 'Dasbor', icon: LayoutDashboard },
  { href: '/devices', label: 'Perangkat', icon: Activity },
  { href: '/analytics', label: 'Analitik', icon: BarChart3 },
  { href: '/alerts', label: 'Pemberitahuan', icon: Bell },
  { href: '/users', label: 'Pengguna', icon: Users },
]

export default function Sidebar({ open, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { logout } = useAuth()

  return (
    <aside
      className={`${
        open ? 'w-64' : 'w-20'
      } bg-[#2f46a3] text-white transition-all duration-300 flex flex-col shadow-xl relative z-20 border-r-4 border-r-[#7ca6ff]`}
    >
      <div className="p-4 flex items-center justify-between border-b border-white/10">
        {open && (
          <div className="flex-1 w-full h-auto flex items-center gap-2">
            <Image src="/sier-logo.jpg" alt="Logo SIER" width={32} height={42} priority className="object-contain rounded" />
            <div className="leading-tight">
              <p className="text-sm font-extrabold tracking-tight">PT SIER</p>
              <p className="text-[10px] text-white/60 uppercase tracking-wider">Smart Office</p>
            </div>
          </div>
        )}
        <button onClick={onToggle} className="p-2 hover:bg-white/10 rounded transition-all ml-auto">
          <Menu size={20} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center space-x-3 px-4 py-3 rounded transition-all ${
                active ? 'bg-white/10 text-white font-bold' : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={20} className={active ? 'text-[#7ca6ff]' : ''} />
              {open && <span className="text-sm">{label}</span>}
            </Link>
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
