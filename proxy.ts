import { NextRequest, NextResponse } from 'next/server'

function isTokenExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1]
    if (!payload) return true
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    if (typeof decoded.exp !== 'number') return false
    return Date.now() / 1000 > decoded.exp
  } catch {
    return true
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow login page and auth API through
  if (pathname === '/' || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  const token = req.cookies.get('auth_token')?.value

  if (!token || isTokenExpired(token)) {
    // API routes must return JSON, not a redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/'
    loginUrl.search = ''
    const res = NextResponse.redirect(loginUrl)
    res.cookies.delete('auth_token')
    res.cookies.delete('user_data')
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
