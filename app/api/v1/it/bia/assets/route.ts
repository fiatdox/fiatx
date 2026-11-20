import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

// ครุภัณฑ์เป้าหมายนอกหมวดคอมพิวเตอร์ที่ผูกกับ BIA ได้ (เฉพาะเจ้าหน้าที่ IT — backend ตรวจสิทธิ์)
// ส่งต่อเฉพาะ search / keys
export async function GET(req: NextRequest) {
  const qs = new URLSearchParams()
  for (const k of ['search', 'keys']) { const v = req.nextUrl.searchParams.get(k); if (v) qs.set(k, v) }
  return proxy(req, `/api/v1/it/bia/assets${qs.size ? `?${qs}` : ''}`)
}
