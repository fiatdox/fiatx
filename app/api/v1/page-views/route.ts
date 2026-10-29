import { NextRequest } from 'next/server'
import { proxy } from '../../_proxy'

// บันทึกการเปิดหน้า — Navbar ส่งมาทุกครั้งที่เปลี่ยนหน้า
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  return proxy(req, '/api/v1/page-views', 'POST', body)
}
