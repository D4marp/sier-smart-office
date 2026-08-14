/** @type {import('next').NextConfig} */
const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:5001'

const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // Dipakai next dev supaya HMR/asset request dari device lain di jaringan
  // yang sama tidak diblokir (mis. akses dashboard dari HP/laptop lain saat
  // demo). Tambahkan IP mesin ini di jaringan yang relevan kalau berubah.
  allowedDevOrigins: ['10.12.1.97', '192.168.137.1', '10.203.168.143', '100.76.80.13'],
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
}

module.exports = nextConfig
