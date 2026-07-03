import { NextRequest, NextResponse } from 'next/server'

// ถอดรหัส cookie ที่ js-cookie เขียนไว้ (percent-encoded) — เผื่อกรณีไม่ได้ encode ด้วย
function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v)
  } catch {
    return v
  }
}

// อ่าน roles ของผู้ใช้จาก cookie `user_data`
function getRoles(req: NextRequest): string[] {
  const raw = req.cookies.get('user_data')?.value
  if (!raw) return []
  for (const candidate of [raw, safeDecode(raw)]) {
    try {
      const data = JSON.parse(candidate)
      if (Array.isArray(data?.roles)) return data.roles.map(String)
    } catch {
      /* ลองค่าถัดไป */
    }
  }
  return []
}

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

  // กั้นหน้าจัดการสิทธิ์การใช้งาน — ต้องมีสิทธิ์ IT_STAFF หรือ ADMIN เท่านั้น
  if (pathname === '/account/roles' || pathname.startsWith('/account/roles/')) {
    const roles = getRoles(req)
    if (!roles.includes('IT_STAFF') && !roles.includes('ADMIN')) {
      const homeUrl = req.nextUrl.clone()
      homeUrl.pathname = '/home'
      homeUrl.search = ''
      return NextResponse.redirect(homeUrl)
    }
  }

  // กั้นหน้าจัดการงานซ่อม IT — เฉพาะเจ้าหน้าที่/หัวหน้ากลุ่ม IT, หัวหน้าภารกิจ และผู้ดูแลระบบ
  if (pathname === '/information-technology/maintenance/manage' || pathname === '/information-technology/maintenance/manage/') {
    const allowed = ['CHIEF_GROUP_IT', 'IT_STAFF', 'CHIEF_MISSION_IT', 'ADMIN']
    const roles = getRoles(req).map(r => r.toUpperCase())
    if (!roles.some(r => allowed.includes(r))) {
      const homeUrl = req.nextUrl.clone()
      homeUrl.pathname = '/home'
      homeUrl.search = ''
      return NextResponse.redirect(homeUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
