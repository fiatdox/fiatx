import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

// ตัวเลือกการโอนข้อมูลจากโปรแกรมการลาเดิม — backend จำกัดเฉพาะ ADMIN / HR
export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/hr/legacy-import/options')
}
