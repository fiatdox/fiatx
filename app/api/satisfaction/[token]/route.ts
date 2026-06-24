import { NextRequest, NextResponse } from 'next/server'
import { decodeSurveyToken } from '@/app/lib/surveyToken'

const BASE = process.env.NEXT_PUBLIC_API_URL

// โทเค็นคือ "สิทธิ์" ในการเข้าถึงแบบประเมินของคำร้องนั้น ๆ — เป็นหน้าสาธารณะ
// จึงไม่ต้องแนบ auth_token ของเจ้าหน้าที่ (และไม่ควรแนบ เพราะลิงก์ส่งให้ผู้รับบริการ)

// GET /api/satisfaction/:token → ข้อมูลสรุปคำร้อง + สถานะว่าเคยประเมินแล้วหรือยัง
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const decoded = decodeSurveyToken(token)
  if (!decoded) {
    return NextResponse.json({ ok: false, reason: 'invalid', message: 'ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว' }, { status: 410 })
  }
  if (!BASE) return NextResponse.json({ ok: true, id: decoded.id, summary: null, submitted: false })
  try {
    const res = await fetch(`${BASE}/api/v1/it/repair-requests/${decoded.id}/satisfaction`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    const data = await res.json().catch(() => ({}))
    // backend อาจคืนสรุปคำร้อง + ไทม์ไลน์แต่ละขั้น + ว่าเคยประเมินแล้วหรือยัง
    return NextResponse.json({
      ok: true,
      id: decoded.id,
      summary: data?.data ?? data?.summary ?? null,
      submitted: data?.submitted ?? data?.data?.submitted ?? false,
    }, { status: res.ok ? 200 : 200 })
  } catch {
    // backend ล่ม/ยังไม่มี endpoint → ยังให้หน้าแสดงฟอร์มได้ (ส่งเฉพาะ id)
    return NextResponse.json({ ok: true, id: decoded.id, summary: null, submitted: false })
  }
}

// POST /api/satisfaction/:token → บันทึกผลการประเมิน
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const decoded = decodeSurveyToken(token)
  if (!decoded) {
    return NextResponse.json({ ok: false, message: 'ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว' }, { status: 410 })
  }
  const body = await req.json().catch(() => ({}))
  if (!BASE) return NextResponse.json({ ok: false, message: 'ยังไม่ได้ตั้งค่าเซิร์ฟเวอร์ปลายทาง' }, { status: 500 })
  try {
    const res = await fetch(`${BASE}/api/v1/it/repair-requests/${decoded.id}/satisfaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ ok: false, message: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้' }, { status: 502 })
  }
}
