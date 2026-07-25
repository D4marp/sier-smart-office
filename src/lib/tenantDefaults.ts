const HOST_DEFAULT_TENANTS: Record<string, string> = {
  '10.12.1.97': 'psikologi',
}

export function getDefaultTenantForHost(hostname?: string | null): string | null {
  const host = (hostname || (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase()
  return HOST_DEFAULT_TENANTS[host] || null
}

export function getDashboardPathForTenant(tenantCode?: string | null): string {
  if (!tenantCode) return '/'
  return tenantCode === 'psikologi' ? '/psikologi' : `/fakultas/${tenantCode}`
}

export function getDefaultLoginForHost(hostname?: string | null) {
  const tenant = getDefaultTenantForHost(hostname)
  if (tenant === 'psikologi') {
    return {
      email: 'admin.psikologi@unesa.ac.id',
      password: 'psikologi123',
      label: 'Admin Fakultas Psikologi',
    }
  }

  return null
}
