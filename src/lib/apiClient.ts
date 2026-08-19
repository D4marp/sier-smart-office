/**
 * API Client for Smart Energy Dashboard
 * Handles all backend API requests
 */

import { SIER_TENANT_CODE } from './tenantDefaults';

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

const API_BASE_URL = configuredApiBaseUrl || (
  typeof window !== 'undefined'
    ? '/api/v1'
    : 'http://localhost:5001/api/v1'
);

// ============ TENANT TUNGGAL (gedung kantor SIER) ============
// Tenant aktif dikirim ke backend lewat header X-Tenant.
const TENANT_STORAGE_KEY = 'active_tenant';

export function getActiveTenant(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TENANT_STORAGE_KEY) || SIER_TENANT_CODE;
}

export function setActiveTenant(code: string | null) {
  if (typeof window === 'undefined') return;
  if (code) {
    window.localStorage.setItem(TENANT_STORAGE_KEY, code);
  } else {
    window.localStorage.removeItem(TENANT_STORAGE_KEY);
  }
}

// Error handler
class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Generic fetch wrapper
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const activeTenant = getActiveTenant();

  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(activeTenant ? { 'X-Tenant': activeTenant } : {}),
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new APIError(
      response.status,
      data.message || `API Error: ${response.statusText}`,
      data
    );
  }

  return data;
}

// ============ CLASSES API ============
export const classesAPI = {
  getAll: async () => {
    const response = await apiCall<{ success: boolean; data: any[] }>(
      '/classes'
    );
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiCall<{ success: boolean; data: any }>(
      `/classes/${id}`
    );
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiCall<{ success: boolean; data: any }>('/classes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await apiCall<{ success: boolean; data: any }>(`/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiCall<{ success: boolean; message: string }>(`/classes/${id}`, {
      method: 'DELETE',
    });
    return response;
  },
};

// ============ DEVICES API ============
export const devicesAPI = {
  getAll: async () => {
    const response = await apiCall<{ success: boolean; data: any[] }>(
      '/devices'
    );
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiCall<{ success: boolean; data: any }>(
      `/devices/${id}`
    );
    return response.data;
  },

  getByClass: async (classId: number) => {
    const response = await apiCall<{ success: boolean; data: any[] }>(
      `/devices/class/${classId}`
    );
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiCall<{ success: boolean; data: any }>(
      '/devices',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await apiCall<{ success: boolean; data: any }>(
      `/devices/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  updateStatus: async (id: number, status: string) => {
    const response = await apiCall<{ success: boolean; data: any }>(
      `/devices/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    );
    return response.data;
  },

  control: async (id: number, action: 'on' | 'off') => {
    const response = await apiCall<{ success: boolean; data: any }>(
      `/devices/${id}/control`,
      {
        method: 'POST',
        body: JSON.stringify({ action }),
      }
    );
    return response.data;
  },

  controlByClass: async (classCode: string, action: 'on' | 'off') => {
    const response = await apiCall<{ success: boolean; data: any }>(
      `/devices/class-code/${encodeURIComponent(classCode)}/control`,
      {
        method: 'POST',
        body: JSON.stringify({ action }),
      }
    );
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiCall<{ success: boolean; data: any }>(
      `/devices/${id}`,
      {
        method: 'DELETE',
      }
    );
    return response.data;
  },

  getTelemetry: async (id: number) => {
    const response = await apiCall<{ success: boolean; data: any }>(`/devices/${id}/telemetry`);
    return response.data;
  },

  // Versi statis: mencatat permintaan restart (audit log + downlink pending),
  // belum benar-benar mengeksekusi ke hardware Milesight/EWS asli.
  restart: async (id: number) => {
    const response = await apiCall<{ success: boolean; message: string; data: any }>(`/devices/${id}/restart`, {
      method: 'POST',
    });
    return response;
  },
};

// ============ DEVICE TYPES API (master data) ============
export const deviceTypesAPI = {
  getAll: async () => {
    const response = await apiCall<{ success: boolean; data: any[] }>('/device-types');
    return response.data;
  },
  create: async (data: any) => {
    const response = await apiCall<{ success: boolean; data: any }>('/device-types', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await apiCall<{ success: boolean; data: any }>(`/device-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },
  delete: async (id: number) => {
    const response = await apiCall<{ success: boolean; message: string }>(`/device-types/${id}`, {
      method: 'DELETE',
    });
    return response;
  },
};

// ============ ROOM OCCUPANTS API (penghuni ruangan / notifikasi) ============
export const roomOccupantsAPI = {
  getAll: async (classId?: number) => {
    const query = classId ? `?classId=${classId}` : '';
    const response = await apiCall<{ success: boolean; data: any[] }>(`/room-occupants${query}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await apiCall<{ success: boolean; data: any }>('/room-occupants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await apiCall<{ success: boolean; data: any }>(`/room-occupants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },
  delete: async (id: number) => {
    const response = await apiCall<{ success: boolean; message: string }>(`/room-occupants/${id}`, {
      method: 'DELETE',
    });
    return response;
  },
};

// ============ DEVICE SCHEDULES API ("Set Timer") ============
export const deviceSchedulesAPI = {
  getAll: async (deviceId?: number) => {
    const query = deviceId ? `?deviceId=${deviceId}` : '';
    const response = await apiCall<{ success: boolean; data: any[] }>(`/device-schedules${query}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await apiCall<{ success: boolean; data: any }>('/device-schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await apiCall<{ success: boolean; data: any }>(`/device-schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },
  delete: async (id: number) => {
    const response = await apiCall<{ success: boolean; message: string }>(`/device-schedules/${id}`, {
      method: 'DELETE',
    });
    return response;
  },
};

// ============ AUDIT LOGS API (Log Aktivitas Perangkat) ============
export const auditLogsAPI = {
  getDeviceActivity: async (params: { classId?: number; deviceId?: number; page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.classId) query.set('classId', String(params.classId));
    if (params.deviceId) query.set('deviceId', String(params.deviceId));
    query.set('page', String(params.page || 1));
    query.set('limit', String(params.limit || 20));
    const response = await apiCall<{ success: boolean; items: any[]; total: number; page: number; limit: number }>(
      `/audit-logs/device-activity?${query.toString()}`
    );
    return response;
  },
};

// ============ CONSUMPTION API ============
export const consumptionAPI = {
  getDaily: async (deviceId: number, date: string) => {
    const response = await apiCall<{ success: boolean; data: any[] }>(
      `/consumption/daily/${deviceId}?date=${date}`
    );
    return response.data;
  },

  getByClass: async (classId: number, startDate: string, endDate: string) => {
    const response = await apiCall<{ success: boolean; data: any[] }>(
      `/consumption/class/${classId}?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data;
  },

  getMonthly: async (deviceId: number, month: string) => {
    const response = await apiCall<{ success: boolean; data: any[] }>(
      `/consumption/monthly/${deviceId}?month=${month}`
    );
    return response.data;
  },

  getMonthlyTrend: async (deviceId: number, months: number = 6) => {
    const response = await apiCall<{ success: boolean; data: any[] }>(
      `/consumption/monthly-trend/${deviceId}?months=${months}`
    );
    return response.data;
  },

  getMonthlyTrendSummary: async (months: number = 6, classId?: number) => {
    const classQuery = classId ? `&classId=${classId}` : '';
    const response = await apiCall<{ success: boolean; data: any[] }>(
      `/consumption/monthly-trend-summary?months=${months}${classQuery}`
    );
    return response.data;
  },

  getTotalByClass: async (classId: number, startDate: string, endDate: string) => {
    const response = await apiCall<{ success: boolean; data: any[] }>(
      `/consumption/total/class/${classId}?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data;
  },

  getHourlyAggregatedByClass: async (classId: number, date: string) => {
    const response = await apiCall<{ success: boolean; data: any[] }>(
      `/consumption/hourly/class/${classId}?date=${date}`
    );
    return response.data;
  },

  getHourly: async (deviceId: number, date: string) => {
    const response = await apiCall<{ success: boolean; data: any[] }>(
      `/consumption/hourly/${deviceId}?date=${date}`
    );
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiCall<{ success: boolean; data: any }>(
      '/consumption',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },
};

// ============ ALERTS API ============
export const alertsAPI = {
  getAll: async () => {
    const response = await apiCall<{ success: boolean; data: any[] }>(
      '/alerts'
    );
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiCall<{ success: boolean; data: any }>(
      `/alerts/${id}`
    );
    return response.data;
  },

  getUnread: async () => {
    const response = await apiCall<{ success: boolean; data: any }>(
      '/alerts/count/unread'
    );
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiCall<{ success: boolean; data: any }>(
      '/alerts',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  markAsRead: async (id: number) => {
    const response = await apiCall<{ success: boolean; data: any }>(
      `/alerts/${id}/read`,
      {
        method: 'PATCH',
      }
    );
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiCall<{ success: boolean; data: any }>(
      `/alerts/${id}`,
      {
        method: 'DELETE',
      }
    );
    return response.data;
  },
};

// ============ SETTINGS API ============
export const settingsAPI = {
  getAll: async () => {
    const response = await apiCall<{ success: boolean; data: any[] }>(
      '/settings'
    );
    return response.data;
  },

  getByKey: async (key: string) => {
    const response = await apiCall<{ success: boolean; data: any }>(
      `/settings/${key}`
    );
    return response.data;
  },

  getUserSettings: async (userId: number) => {
    const response = await apiCall<{ success: boolean; data: any }>(
      `/settings/user/${userId}`
    );
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiCall<{ success: boolean; data: any }>(
      '/settings',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  update: async (key: string, value: any) => {
    const response = await apiCall<{ success: boolean; data: any }>(
      `/settings/${key}`,
      {
        method: 'PUT',
        body: JSON.stringify({ value }),
      }
    );
    return response.data;
  },

  updateUserSettings: async (userId: number, data: any) => {
    const response = await apiCall<{ success: boolean; data: any }>(
      `/settings/user/${userId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },
};

// ============ AUTH API ============
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await apiCall<{ success: boolean; data: { token: string; user: any } }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    return response.data;
  },

  me: async () => {
    const response = await apiCall<{ success: boolean; data: any }>('/auth/me');
    return response.data;
  },

  updateProfile: async (data: { full_name?: string; email?: string; password?: string }) => {
    const response = await apiCall<{ success: boolean; data: any }>(
      '/auth/profile',
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  logout: async () => {
    const response = await apiCall<{ success: boolean; message: string }>(
      '/auth/logout',
      { method: 'POST' }
    );
    return response;
  },
};

// ============ USERS API ============
export const usersAPI = {
  getAll: async () => {
    const response = await apiCall<{ success: boolean; data: any[] }>('/users');
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiCall<{ success: boolean; data: any }>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await apiCall<{ success: boolean; data: any }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiCall<{ success: boolean; message: string; data?: any }>(`/users/${id}`, {
      method: 'DELETE',
    });
    return response;
  },
};

// ============ TENANTS API (registry) ============
export const tenantsAPI = {
  getAll: async () => {
    const response = await apiCall<{ success: boolean; data: any[] }>('/tenants');
    return response.data;
  },

  create: async (data: { code: string; name: string; type?: string; db_name?: string }) => {
    const response = await apiCall<{ success: boolean; data: any }>('/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  update: async (code: string, data: { name?: string; status?: string; type?: string }) => {
    const response = await apiCall<{ success: boolean; data: any }>(`/tenants/${code}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  // Rollup untuk superadmin
  overview: async (date?: string) => {
    const query = date ? `?date=${date}` : '';
    const response = await apiCall<{ success: boolean; data: any }>(`/tenants/overview${query}`);
    return response.data;
  },
};

// ============ NODE-RED DEVICE TYPE CONTROL API ============
// Kontrol lampu/AC/proyektor lewat backend (bukan langsung ke Node-RED dari
// browser), sehingga tetap terikat pada tenant aktif (header X-Tenant).
type NodeRedDeviceType = 'lamp' | 'ac' | 'projector' | 'ac1' | 'ac2' | 'lamp1' | 'lamp2';

async function nodeRedCall(
  classCode: string,
  deviceType: NodeRedDeviceType,
  state: 'on' | 'off'
): Promise<any> {
  const response = await apiCall<{ success: boolean; data: any }>(
    `/devices/class-code/${encodeURIComponent(classCode)}/control/${deviceType}`,
    {
      method: 'POST',
      body: JSON.stringify({ state }),
    }
  );
  return response.data;
}

export const nodeRedControlAPI = {
  // Lampu (WS501/WS502 compatibility) — kedua unit sekaligus (ruangan 1 lampu saja
  // tetap pakai ini; ruangan 2 lampu, ini = "keduanya sekaligus").
  controlLamp: async (classCode: string, state: 'on' | 'off') => {
    return nodeRedCall(classCode, 'lamp', state);
  },

  // Proyektor
  controlProjector: async (classCode: string, state: 'on' | 'off') => {
    return nodeRedCall(classCode, 'projector', state);
  },

  // AC — kedua unit sekaligus (lihat catatan controlLamp di atas)
  controlAC: async (classCode: string, state: 'on' | 'off') => {
    return nodeRedCall(classCode, 'ac', state);
  },

  // Unit individual (ruangan dengan >1 AC/lampu, mis. FISIPOL)
  controlAcUnit: async (classCode: string, unit: 1 | 2, state: 'on' | 'off') => {
    return nodeRedCall(classCode, (unit === 1 ? 'ac1' : 'ac2') as NodeRedDeviceType, state);
  },
  controlLampUnit: async (classCode: string, unit: 1 | 2, state: 'on' | 'off') => {
    return nodeRedCall(classCode, (unit === 1 ? 'lamp1' : 'lamp2') as NodeRedDeviceType, state);
  },
};

// ============ EXPORT ERROR CLASS ============
export { APIError };
