'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { authAPI, getActiveTenant, setActiveTenant } from '@/lib/apiClient'

type AuthUser = {
  id: number
  full_name: string
  email: string
  role: 'superadmin' | 'admin' | 'manager' | 'viewer'
  tenant_code: string | null
  tenant_name: string | null
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  activeTenant: string | null
  refreshUser: () => Promise<void>
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  switchTenant: (code: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Sinkronkan tenant aktif (header X-Tenant) dengan user yang login.
// PT SIER berjalan sebagai tenant tunggal ('sier').
function syncTenantWithUser(user: AuthUser | null) {
  if (!user) return
  if (user.role !== 'superadmin' && user.tenant_code) {
    setActiveTenant(user.tenant_code)
  } else if (user.role === 'superadmin' && !getActiveTenant() && user.tenant_code) {
    setActiveTenant(user.tenant_code)
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTenant, setActiveTenantState] = useState<string | null>(null)

  useEffect(() => {
    setActiveTenantState(getActiveTenant())
  }, [])

  const refreshUser = async () => {
    try {
      const me = await authAPI.me()
      const nextUser = me as AuthUser
      syncTenantWithUser(nextUser)
      setUser(nextUser)
      setActiveTenantState(getActiveTenant())
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  const login = async (email: string, password: string) => {
    const response = await authAPI.login(email, password)
    const nextUser = response.user as AuthUser
    syncTenantWithUser(nextUser)
    setUser(nextUser)
    setActiveTenantState(getActiveTenant())
    return nextUser
  }

  const logout = async () => {
    try {
      await authAPI.logout()
    } finally {
      setUser(null)
      setActiveTenant(null)
      setActiveTenantState(null)
    }
  }

  // Dipanggil saat dashboard mount. Tidak reload — setiap halaman men-fetch
  // datanya sendiri saat mount, jadi cukup set tenant aktif sebelum itu.
  const switchTenant = (code: string) => {
    const nextCode = user?.role !== 'superadmin' && user?.tenant_code
      ? user.tenant_code
      : code
    setActiveTenant(nextCode)
    setActiveTenantState(nextCode)
  }

  const value = { user, loading, activeTenant, refreshUser, login, logout, switchTenant }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
