import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}

// Pagination custom (client-side) dipakai di semua daftar: Perangkat,
// Pemberitahuan, Pengguna, Master data, Log Aktivitas.
export default function Pagination({ page, totalItems, pageSize, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  if (totalPages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(totalItems, page * pageSize)

  const pageNumbers: number[] = []
  const windowSize = 5
  let from = Math.max(1, page - Math.floor(windowSize / 2))
  const to = Math.min(totalPages, from + windowSize - 1)
  from = Math.max(1, to - windowSize + 1)
  for (let i = from; i <= to; i++) pageNumbers.push(i)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-100">
      <p className="text-xs text-slate-500 font-semibold">
        Menampilkan {start}-{end} dari {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={14} />
        </button>
        {pageNumbers.map((n) => (
          <button
            key={n}
            onClick={() => onPageChange(n)}
            className={`min-w-[28px] h-7 px-1.5 rounded-md text-xs font-bold transition-all ${
              n === page ? 'bg-[#2f46a3] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
