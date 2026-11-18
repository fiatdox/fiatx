import { NextResponse } from 'next/server'
import { clearAuthCookies } from '../../_authCookie'

// ออกจากระบบ — auth_token เป็น HttpOnly เบราว์เซอร์ลบเองไม่ได้ ต้องให้ server สั่งลบ
export async function POST() {
  return clearAuthCookies(NextResponse.json({ success: true }))
}
