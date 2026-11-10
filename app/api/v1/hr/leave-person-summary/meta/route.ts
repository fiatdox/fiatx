import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

// ตัวกรองหน้าสรุปวันลารายบุคคล (ADMIN / HR — backend ตรวจสิทธิ์)
export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/hr/leave-person-summary/meta')
}
