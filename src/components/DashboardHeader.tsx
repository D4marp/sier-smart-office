'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, Settings, LogOut, Clock } from 'lucide-react'
import { useAuth } from './AuthProvider'

interface DashboardHeaderProps {
  title: string
  badge?: string
  sidebarOpen: boolean
  onOpenSidebar: () => void
}

export default function DashboardHeader({ title, badge, sidebarOpen, onOpenSidebar }: DashboardHeaderProps) {
  const { user, logout } = useAuth()
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const roleBadge = badge || (user?.tenant_name || user?.tenant_code || (user?.role === 'superadmin' ? 'Admin' : '')).toString()

  return (
    <header className="bg-[#2f46a3] text-white shadow-md border-b-4 border-[#7ca6ff] z-10 shrink-0">
      <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {!sidebarOpen && (
            <button onClick={onOpenSidebar} className="p-1.5 hover:bg-white/10 rounded transition-all mr-2 lg:hidden">
              <Menu size={20} />
            </button>
          )}
          <div>
            <h1 className="text-white font-extrabold text-base tracking-tight leading-tight uppercase">{title}</h1>
            <p className="text-[#7ca6ff] font-bold text-xs tracking-wider uppercase">PT SIER (Persero)</p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="text-right border-r border-white/20 pr-6 hidden md:block">
            <div className="flex items-center justify-end space-x-1.5 text-white">
              <Clock size={13} className="text-[#7ca6ff]" />
              <span className="font-bold text-sm tracking-wide">{now.toLocaleTimeString('id-ID')}</span>
            </div>
            <p className="text-slate-300 text-xs mt-0.5">
              {now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center space-x-2.5 hover:bg-white/10 p-1.5 rounded-lg transition-all focus:outline-none"
            >
              <div className="w-9 h-9 rounded-full bg-[#7ca6ff] text-[#2f46a3] font-black text-sm flex items-center justify-center border-2 border-white shadow-md">
                {user?.full_name ? user.full_name[0].toUpperCase() : 'A'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-white leading-none">{user?.full_name || 'Administrator'}</p>
                <p className="text-[10px] text-[#7ca6ff] font-bold leading-none mt-1 uppercase">{roleBadge}</p>
              </div>
            </button>

            {profileMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setProfileMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-1 z-40 border border-slate-200 divide-y divide-slate-100 text-slate-800">
                  <div className="px-4 py-2">
                    <p className="text-xs font-semibold text-slate-400">Masuk sebagai</p>
                    <p className="text-xs font-bold text-slate-800 truncate mt-0.5">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/settings"
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-medium transition-all"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <Settings size={16} className="text-slate-500" />
                      <span>Pengaturan</span>
                    </Link>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false)
                        logout()
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-semibold transition-all text-left"
                    >
                      <LogOut size={16} className="text-red-500" />
                      <span>Keluar</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
