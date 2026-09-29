import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const fy = sp.get('fy') ?? ''
  // scope=all = รวมครุภัณฑ์ที่คิดค่าเสื่อมครบไปแล้ว (ชุดข้อมูลใหญ่กว่ามาก ส่งต่อเฉพาะเมื่อขอมาจริง)
  const scope = sp.get('scope') === 'all' ? '&scope=all' : ''
  return proxy(req, `/api/v1/equipment/depreciation-year?fy=${encodeURIComponent(fy)}${scope}`)
}
