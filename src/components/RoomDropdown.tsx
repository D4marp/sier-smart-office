interface RoomDropdownProps {
  rooms: string[]
  value: string
  onChange: (value: string) => void
  allLabel?: string
  className?: string
}

// Dropdown "Pilih Ruangan" — menggantikan pola chip-button lama yang dipakai
// di Dashboard/Perangkat/Analitik. `rooms` sudah termasuk opsi "Semua"/"All"
// di posisi pertama bila diperlukan oleh pemanggil.
export default function RoomDropdown({ rooms, value, onChange, allLabel, className }: RoomDropdownProps) {
  const options = allLabel ? [allLabel, ...rooms.filter((r) => r !== allLabel)] : rooms
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={
        className ||
        'w-full sm:w-72 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[#2f46a3] focus:ring-1 focus:ring-[#2f46a3] transition'
      }
    >
      {options.map((room) => (
        <option key={room} value={room}>
          {room}
        </option>
      ))}
    </select>
  )
}
