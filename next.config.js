/** @type {import('next').NextConfig} */
const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:5001'

// Build statis (demo tanpa backend): NEXT_OUTPUT_MODE=export next build
// Menghasilkan folder /out yang bisa di-hosting di mana saja (Vercel/Netlify
// static, GitHub Pages, dst) — dipakai bersama NEXT_PUBLIC_DEMO_MODE=true
// supaya apiClient memakai mock backend (src/lib/mockData) alih-alih fetch
// ke backend Express yang sungguhan.
const isStaticExport = process.env.NEXT_OUTPUT_MODE === 'export'

const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  ...(isStaticExport ? { output: 'export' } : {}),
  images: {
    unoptimized: true,
  },
  // Dipakai next dev supaya HMR/asset request dari device lain di jaringan
  // yang sama tidak diblokir (mis. akses dashboard dari HP/laptop lain saat
  // demo). Tambahkan IP mesin ini di jaringan yang relevan kalau berubah.
  allowedDevOrigins: ['10.12.1.97', '192.168.137.1', '10.203.168.143', '100.76.80.13'],
  // rewrites() tidak didukung oleh output:'export' — dilewati saat build statis
  // (tidak masalah, mode demo tidak pernah benar-benar fetch ke backend).
  ...(isStaticExport ? {} : {
    async rewrites() {
      return [
        {
          source: '/api/v1/:path*',
          destination: `${backendUrl}/api/v1/:path*`,
        },
        {
          source: '/api/ac/:classCode',
          destination: `${backendUrl}/api/v1/devices/class-code/:classCode/control/ac`,
        },
        {
          source: '/api/projector/:classCode',
          destination: `${backendUrl}/api/v1/devices/class-code/:classCode/control/projector`,
        },
        {
          source: '/api/:classCode',
          destination: `${backendUrl}/api/v1/devices/class-code/:classCode/control/lamp`,
        },
      ]
    },
  }),
}

module.exports = nextConfig
