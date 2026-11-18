import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

// ทะเบียนทรัพย์สินงาน IT (ครุภัณฑ์คอมพิวเตอร์ V3 + V2) — เฉพาะเจ้าหน้าที่ IT (backend ตรวจสิทธิ์)
export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/it/assets')
}
