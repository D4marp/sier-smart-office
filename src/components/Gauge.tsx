interface GaugeProps {
  value: number
  max: number
  label: string
  unit?: string
  size?: number
}

// Gauge setengah lingkaran (hijau→kuning→merah) — versi kita sendiri dari
// pola "Power Usage" gauge di Metabase, tapi dengan warna & tipografi SIER.
export default function Gauge({ value, max, label, unit = 'kWh', size = 160 }: GaugeProps) {
  const safeMax = max > 0 ? max : 1
  const pct = Math.min(1, Math.max(0, value / safeMax))
  const angle = pct * 180
  const radius = size / 2 - 12
  const cx = size / 2
  const cy = size / 2

  function polarToXY(deg: number) {
    const rad = (Math.PI * deg) / 180
    return { x: cx - radius * Math.cos(rad), y: cy - radius * Math.sin(rad) }
  }

  function arcPath(startDeg: number, endDeg: number) {
    const start = polarToXY(startDeg)
    const end = polarToXY(endDeg)
    const largeArc = endDeg - startDeg > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`
  }

  const needleEnd = polarToXY(180 - angle)

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        <path d={arcPath(180, 120)} stroke="#10b981" strokeWidth={14} fill="none" strokeLinecap="round" />
        <path d={arcPath(120, 60)} stroke="#f59e0b" strokeWidth={14} fill="none" />
        <path d={arcPath(60, 0)} stroke="#ef4444" strokeWidth={14} fill="none" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={needleEnd.x} y2={needleEnd.y} stroke="#2f46a3" strokeWidth={3} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={5} fill="#2f46a3" />
      </svg>
      <p className="text-xl font-extrabold text-[#2f46a3] -mt-1">
        {value.toLocaleString('id-ID', { maximumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-400">{unit}</span>
      </p>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center mt-0.5">{label}</p>
    </div>
  )
}
