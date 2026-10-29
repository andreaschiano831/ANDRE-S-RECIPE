import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { configErrorPage, supabaseEnvProblem, supabaseKey, supabaseUrl } from '@/lib/env'

const PUBLIC_PATHS = ['/login', '/auth']

export async function proxy(request: NextRequest) {
  const problem = supabaseEnvProblem()
  if (problem) return new NextResponse(configErrorPage(problem), { status: 500, headers: { 'content-type': 'text/html; charset=utf-8' } })
  try {
    return await guard(request)
  } catch (e: any) {
    console.error('proxy', e)
    return new NextResponse(configErrorPage('Errore nel controllo del login.', String(e?.message ?? e)), { status: 500, headers: { 'content-type': 'text/html; charset=utf-8' } })
  }
}

async function guard(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    supabaseUrl(),
    supabaseKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p))

  if (!user && !isPublic) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }
  if (user && path === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)'],
}
