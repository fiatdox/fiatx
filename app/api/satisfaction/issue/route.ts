import { NextRequest, NextResponse } from 'next/server'
import { encodeSurveyToken } from '@/app/lib/surveyToken'
import { BASE_PATH } from '@/app/lib/basePath'

// GET /api/satisfaction/issue?id=123 → สร้างลิงก์แบบประเมินเข้ารหัสสำหรับคำร้อง
// จำกัดเฉพาะเจ้าหน้าที่ที่ล็อกอินแล้ว (ต้องมี auth_token) เพื่อไม่ให้ใครก็มินต์ลิงก์ได้
export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value
  if (!token) {
    return NextResponse.json({ ok: false, message: 'ต้องเข้าสู่ระบบก่อน' }, { status: 401 })
  }
  const idParam = req.nextUrl.searchParams.get('id')
  const id = Number(idParam)
  if (!idParam || !Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, message: 'id ไม่ถูกต้อง' }, { status: 400 })
  }
  const surveyToken = encodeSurveyToken(id)
  // หลัง reverse proxy ต้องใช้ host/โปรโตคอลที่ผู้ใช้เห็นจริง (ลิงก์นี้ส่งให้ผู้ป่วย) ไม่ใช่ที่อยู่ภายในของแอป
  const host = req.headers.get('x-forwarded-host')?.split(',')[0].trim() || req.headers.get('host') || req.nextUrl.host
  const proto = req.headers.get('x-forwarded-proto')?.split(',')[0].trim() || req.nextUrl.protocol.replace(':', '')
  const origin = `${proto}://${host}`
  return NextResponse.json({
    ok: true,
    token: surveyToken,
    path: `/satisfaction/${surveyToken}`,
    url: `${origin}${BASE_PATH}/satisfaction/${surveyToken}`,
  })
}
