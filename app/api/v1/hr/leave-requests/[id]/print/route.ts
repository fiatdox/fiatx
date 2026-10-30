import { NextRequest } from 'next/server'
import { proxy } from '../../../../../_proxy'

type Ctx = { params: Promise<{ id: string }> }

// ข้อมูลพิมพ์แบบใบลา — เจ้าของใบ / สายอนุมัติ / หัวหน้าหน่วยที่สังกัด / ADMIN / HR (backend ตรวจสิทธิ์)
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  return proxy(req, `/api/v1/hr/leave-requests/${encodeURIComponent(id)}/print`)
}
