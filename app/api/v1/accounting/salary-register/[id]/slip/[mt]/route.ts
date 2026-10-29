import { NextRequest } from 'next/server'
import { proxy } from '../../../../../../_proxy'

// รายการรายรับ/รายการหักของ 1 เลขที่เงินเดือน งวดเดียว — backend จำกัดสิทธิ์ไว้แล้ว
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; mt: string }> }) {
  const { id, mt } = await params
  return proxy(req, `/api/v1/accounting/salary-register/${encodeURIComponent(id)}/slip/${encodeURIComponent(mt)}`)
}
