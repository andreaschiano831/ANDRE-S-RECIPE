import type { MetadataRoute } from 'next'
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ricettario', short_name: 'Ricettario',
    start_url: '/', display: 'standalone', background_color: '#F5EFE0', theme_color: '#F5EFE0',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}
