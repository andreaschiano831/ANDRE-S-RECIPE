import type { Metadata, Viewport } from 'next'
import { createClient } from '@/lib/supabase/server'
import { supabaseKey, supabaseUrl } from '@/lib/env'
import './globals.css'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  let name = 'Ricettario'
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('app_settings').select('name').eq('id', 1).maybeSingle()
    if (data?.name) name = data.name
  } catch {}
  return {
    title: name,
    description: 'Ricettario professionale',
    appleWebApp: { capable: true, title: name, statusBarStyle: 'default' },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F7F2E8',
}

const themeBoot = `try{var t=localStorage.getItem('rc_theme');if(t)document.documentElement.dataset.theme=t}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" data-theme="crema" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
        {/* configurazione pubblica di Supabase letta a runtime (url e chiave anon sono pubbliche per natura) */}
        <script dangerouslySetInnerHTML={{ __html: `window.__SB=${JSON.stringify({ url: supabaseUrl(), key: supabaseKey() }).replace(/</g, '\\u003c')}` }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..700&family=Schibsted+Grotesk:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
