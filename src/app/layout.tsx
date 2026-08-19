import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import AppShell from '@/components/AppShell'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'SIER Smart Office Dashboard',
  description: 'Dashboard pemantauan & kontrol energi gedung kantor PT SIER (Persero)',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${plusJakartaSans.className} bg-gradient-to-br from-gray-50 to-gray-100`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
