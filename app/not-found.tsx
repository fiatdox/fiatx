import type { Metadata } from 'next'
import NotFoundView from './components/NotFoundView'

// หน้า 404 ของทั้งระบบ — Next ใช้ไฟล์นี้กับทุก URL ที่ไม่มีหน้ารองรับ และตอนเรียก notFound()
// ผู้ที่ยังไม่ล็อกอินจะไม่เห็นหน้านี้ proxy.ts พากลับหน้า login ก่อนถึงตรงนี้
export const metadata: Metadata = {
  title: 'ไม่พบหน้า (404) · ระบบบริหารโรงพยาบาลอัจฉริยะ',
}

export default function NotFound() {
  return <NotFoundView />
}
