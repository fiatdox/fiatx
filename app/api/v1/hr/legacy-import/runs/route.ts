import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

// ประวัติ / สั่งงานโอนข้อมูลจากโปรแกรมการลาเดิม — backend จำกัดเฉพาะ ADMIN / HR
export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/hr/legacy-import/runs')
}

export async function POST(req: NextRequest) {
  return proxy(req, '/api/v1/hr/legacy-import/runs', 'POST', await req.json().catch(() => ({})))
}
