import { isDeviceOnline, type Device } from '@/lib/energyChartUtils'

// Status konektivitas (online/offline) dan status daya (ON/OFF) adalah dua hal
// berbeda — perangkat bisa online tapi OFF (menyala jaringan, mati daya), atau
// offline dengan status daya terakhir tersimpan tidak berubah. Satu sumber
// logic dipakai di semua halaman (dashboard, perangkat, log aktivitas).
export function isDevicePowerOn(device: Pick<Device, 'status'>): boolean {
  const status = String(device.status || '').toLowerCase()
  return status === 'active' || status === 'online'
}

export function ConnectivityBadge({ device }: { device: Device }) {
  const online = isDeviceOnline(device)
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
      online ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'}`} />
      {online ? 'Online' : 'Offline'}
    </span>
  )
}

export function PowerBadge({ device }: { device: Device }) {
  const on = isDevicePowerOn(device)
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
      on ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-amber-500' : 'bg-slate-400'}`} />
      {on ? 'ON' : 'OFF'}
    </span>
  )
}

export function StatusBadges({ device }: { device: Device }) {
  return (
    <div className="flex items-center gap-1.5">
      <ConnectivityBadge device={device} />
      <PowerBadge device={device} />
    </div>
  )
}
