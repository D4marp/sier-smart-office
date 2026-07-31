'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// URL lama dipertahankan sebagai redirect ke dashboard fakultas generik —
// semua fakultas (termasuk Psikologi) kini memakai desain dashboard yang sama.
export default function PsikologiRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/fakultas/psikologi')
  }, [router])
  return null
}
