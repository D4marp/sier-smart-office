'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// URL lama dipertahankan sebagai redirect ke dashboard fakultas generik
// (pola sama seperti /fbs) — dashboard Psikologi sekarang memakai komponen
// yang sama dengan seluruh fakultas lain di src/app/fakultas/[code]/page.tsx.
export default function PsikologiRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/fakultas/psikologi')
  }, [router])
  return null
}
