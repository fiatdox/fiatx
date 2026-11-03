import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

// ทดสอบส่งแจ้งเตือนถึงผู้ดูแลระบบเอง — ส่ง level / mission_id / config มา = ข้อความแบบที่ผู้อนุมัติระดับนั้นจะได้รับ
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  return proxy(req, '/api/v1/hr/leave-notify/test', 'POST', body)
}
