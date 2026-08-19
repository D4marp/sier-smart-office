import * as XLSX from 'xlsx'

// Export array-of-objects ke file .xlsx yang diunduh browser. Dipakai sebagai
// tombol "Export Excel" di halaman Perangkat/Analitik/Pemberitahuan/Log Aktivitas.
export function exportToExcel(rows: Record<string, unknown>[], filename: string, sheetName = 'Data') {
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  const stamped = `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(workbook, stamped)
}
