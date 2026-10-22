'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeftOutlined, HomeOutlined } from '@ant-design/icons'
import Navbar from './Navbar'

// path ภาษาไทยมาเป็น %E0%B8... ถอดให้อ่านออกก่อนแสดง (ถอดไม่ได้ก็แสดงตามเดิม)
const readable = (path: string) => {
  try { return decodeURIComponent(path) } catch { return path }
}

const btn = 'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-medium transition-colors '
  + 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500'

/** หน้า 404 — ใช้กับ app/not-found.tsx (URL ที่ไม่มีหน้าในระบบ และการเรียก notFound()) */
export default function NotFoundView() {
  const pathname = usePathname()
  const router = useRouter()

  // เปิดลิงก์ตรงมาจากที่อื่น (ไม่มีประวัติให้ย้อน) ให้ไปหน้าหลักแทน ไม่ใช่กดแล้วไม่เกิดอะไร
  const goBack = () => (window.history.length > 1 ? router.back() : router.push('/home'))

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <Navbar />
      <main className="flex justify-center px-4 py-16 md:py-24">
        <div className="w-full max-w-xl text-center">
          <div
            aria-hidden
            className="font-extrabold leading-none select-none"
            style={{
              fontSize: 'clamp(84px, 20vw, 152px)',
              letterSpacing: '0.04em',
              background: 'linear-gradient(135deg, #34d399 0%, #10b981 40%, #0d9488 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            404
          </div>

          <h1 className="mt-4 text-2xl font-semibold md:text-3xl">ไม่พบหน้าที่ต้องการ</h1>
          <p className="mt-3 text-app-text-2">
            ลิงก์อาจพิมพ์ผิด หรือหน้านี้ถูกย้าย / ยังไม่เปิดใช้งาน
          </p>

          {pathname && (
            <div className="mx-auto mt-5 max-w-full rounded-lg border border-app-border bg-app-surface px-4 py-2 text-sm text-app-text-2">
              <span className="text-app-text-3">ที่อยู่ที่เปิด: </span>
              <code className="break-all">{readable(pathname)}</code>
            </div>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/home" className={`${btn} bg-emerald-600 text-white hover:bg-emerald-500`}>
              <HomeOutlined /> กลับหน้าหลัก
            </Link>
            <button
              type="button"
              onClick={goBack}
              className={`${btn} border border-app-border bg-app-surface text-app-text hover:border-emerald-500`}
            >
              <ArrowLeftOutlined /> ย้อนกลับ
            </button>
          </div>

          <p className="mt-6 text-sm text-app-text-3">
            หรือเลือกหน้าที่ต้องการจากเมนูหลัก (☰) มุมซ้ายบน
          </p>
        </div>
      </main>
    </div>
  )
}
