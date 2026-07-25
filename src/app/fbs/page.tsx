'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// URL lama dipertahankan sebagai redirect ke dashboard fakultas generik.
export default function FbsRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/fakultas/fbs')
  }, [router])
  return null
}
