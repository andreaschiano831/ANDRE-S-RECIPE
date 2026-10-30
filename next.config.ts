import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // le pagine già visitate restano pronte per 30 s: avanti/indietro istantaneo
    staleTimes: { dynamic: 30, static: 300 },
    optimizePackageImports: ['lucide-react'],
  },
}

export default nextConfig
