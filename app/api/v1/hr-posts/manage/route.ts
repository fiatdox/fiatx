import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

// หน้าจัดการ — backend กั้นเฉพาะ ADMIN / HR
export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/hr-posts/manage', 'GET')
}
