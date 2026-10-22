import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

// รายงานครุภัณฑ์แยกตามหน่วยงาน (ทะเบียน V3) — ส่งทั้งทะเบียนครั้งเดียว ตัวกรองทำที่หน้าเว็บ
export async function GET(req: NextRequest) {
  return proxy(req, '/api/v1/equipment/by-department')
}
