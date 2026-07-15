'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from './AuthProvider'
import { getDashboardPathForTenant } from '@/lib/tenantDefaults'

function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useAuth()
  const userDashboardPath = user ? getDashboardPathForTenant(user.tenant_code) : '/login'
  const isFacultyRoute = pathname.startsWith('/fakultas/')
  const requestedFacultyCode = isFacultyRoute ? pathname.split('/')[2]?.toLowerCase() : null
  const shouldRedirectTenantUser =
    !!user &&
    user.role !== 'superadmin' &&
    (
      pathname === '/' ||
      (requestedFacultyCode && requestedFacultyCode !== user.tenant_code)
    )
  const shouldHoldProtectedRender =
    loading ||
    (!user && pathname !== '/login') ||
    (user && pathname === '/login') ||
    shouldRedirectTenantUser

  useEffect(() => {
    if (loading) {
      return
    }

    if (!user && pathname !== '/login') {
      router.replace('/login')
      return
    }

    if (shouldRedirectTenantUser) {
      router.replace(userDashboardPath)
      return
    }

    if (user && pathname === '/login') {
      router.replace(userDashboardPath)
    }
  }, [loading, user, pathname, router, shouldRedirectTenantUser, userDashboardPath])

  if (shouldHoldProtectedRender) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
          <p className="text-sm text-white/70">Memeriksa sesi login...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShellContent>{children}</AppShellContent>
    </AuthProvider>
  )
}
