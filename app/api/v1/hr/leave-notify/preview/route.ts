import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

// ตัวอย่างรอบสรุปรออนุมัติ (ไม่ส่งจริง)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  return proxy(req, '/api/v1/hr/leave-notify/preview', 'POST', body)
}
