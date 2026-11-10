import { NextRequest } from 'next/server'
import { proxy } from '../../../../_proxy'

// ประวัติการลารายคนในปีงบ (ADMIN / HR — backend ตรวจสิทธิ์)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^\d+$/.test(id)) return Response.json({ success: false, message: 'รหัสบุคลากรไม่ถูกต้อง' }, { status: 400 })
  const fy = req.nextUrl.searchParams.get('fiscal_year')
  const suffix = fy && /^\d{4}$/.test(fy) ? `?fiscal_year=${fy}` : ''
  return proxy(req, `/api/v1/hr/leave-person-summary/${id}${suffix}`)
}
