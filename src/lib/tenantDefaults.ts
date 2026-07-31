const HOST_DEFAULT_TENANTS: Record<string, string> = {
  '10.12.1.97': 'psikologi',
}

export function getDefaultTenantForHost(hostname?: string | null): string | null {
  const host = (hostname || (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase()
  return HOST_DEFAULT_TENANTS[host] || null
}

// Semua fakultas (termasuk Psikologi) memakai dashboard generik yang sama —
// hanya beda data ruangan/perangkat sesuai database masing-masing tenant.
export function getDashboardPathForTenant(tenantCode?: string | null): string {
  if (!tenantCode) return '/'
  return `/fakultas/${tenantCode}`
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
