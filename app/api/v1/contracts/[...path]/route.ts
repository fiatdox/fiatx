import { NextRequest } from 'next/server'
import { proxy } from '../../../_proxy'

// ระบบคืนหลักประกันสัญญา — ส่งต่อทุกเส้นทางไป backend (สิทธิ์ตรวจที่ backend)
type Ctx = { params: Promise<{ path: string[] }> }

const target = async (req: NextRequest, { params }: Ctx) =>
  `/api/v1/contracts/${(await params).path.map(encodeURIComponent).join('/')}${req.nextUrl.search}`

export async function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, await target(req, ctx))
}

export async function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, await target(req, ctx), 'POST', await req.json().catch(() => ({})))
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  return proxy(req, await target(req, ctx), 'PUT', await req.json().catch(() => ({})))
}
