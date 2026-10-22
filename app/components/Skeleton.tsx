// โครงหน้าระหว่างโหลด (skeleton) — ใช้ทั้ง loading.tsx ของแต่ละโมดูล และในหน้าที่รอข้อมูลชุดแรก
// เป็น CSS ล้วน (คลาส .sk / .sk-card ใน globals.css) ไม่มี hook ไม่พึ่ง antd
// จึงเรนเดอร์เป็น Server Component ได้ และสีตามธีมเองผ่าน --sk-* / --app-*
// ความกว้างของแต่ละแท่งกำหนดตายตัว ไม่สุ่ม — สุ่มแล้ว HTML ฝั่ง server กับ client จะไม่ตรงกัน
import type { CSSProperties, ReactNode } from 'react'
import { HEADER_GRADIENT, STAR_PATTERN } from '../lib/brand'

type Size = number | string

/** แท่ง skeleton หนึ่งชิ้น */
export const SkBlock = ({ w = '100%', h = 14, r, style }: { w?: Size; h?: Size; r?: number; style?: CSSProperties }) => (
  <span className="sk" style={{ width: w, height: h, borderRadius: r, ...style }} />
)

const SkCard = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div className="sk-card" style={{ padding: 16, ...style }}>{children}</div>
)

// ความกว้างที่วนใช้ในแถวตาราง/รายการ ให้ดูเป็นข้อความจริงที่ยาวไม่เท่ากัน
const WIDTHS = ['72%', '48%', '86%', '38%', '64%', '55%', '80%', '44%']

/** การ์ดตัวเลขสรุป (KPI) เรียงเป็นแถว */
export const KpiSkeleton = ({ count = 4 }: { count?: number }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
    {Array.from({ length: count }, (_, i) => (
      <SkCard key={i}>
        <SkBlock w="45%" h={12} />
        <SkBlock w="65%" h={26} style={{ marginTop: 12 }} />
      </SkCard>
    ))}
  </div>
)

/** กล่องกราฟ */
export const ChartsSkeleton = ({ count = 2, height = 260 }: { count?: number; height?: number }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
    {Array.from({ length: count }, (_, i) => (
      <SkCard key={i}>
        <SkBlock w="35%" h={14} />
        <SkBlock h={height} r={10} style={{ marginTop: 16 }} />
      </SkCard>
    ))}
  </div>
)

/** ตาราง: แถวหัว + แถวข้อมูล */
export const TableSkeleton = ({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) => (
  <SkCard style={{ padding: 0, overflow: 'hidden' }}>
    <div style={{ display: 'flex', gap: 16, padding: '14px 16px', borderBottom: '1px solid var(--app-border)' }}>
      {Array.from({ length: cols }, (_, c) => <SkBlock key={c} h={12} style={{ flex: 1 }} />)}
    </div>
    {Array.from({ length: rows }, (_, r) => (
      <div key={r} style={{ display: 'flex', gap: 16, padding: '14px 16px', borderBottom: r < rows - 1 ? '1px solid var(--app-border)' : undefined }}>
        {Array.from({ length: cols }, (_, c) => (
          <div key={c} style={{ flex: 1 }}><SkBlock w={WIDTHS[(r + c * 3) % WIDTHS.length]} h={12} /></div>
        ))}
      </div>
    ))}
  </SkCard>
)

/** รายการ: วงกลม + ข้อความสองบรรทัด */
export const ListSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '8px 0' }}>
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <SkBlock w={36} h={36} r={18} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <SkBlock w={WIDTHS[i % WIDTHS.length]} h={13} />
          <SkBlock w={WIDTHS[(i + 3) % WIDTHS.length]} h={11} style={{ marginTop: 8, maxWidth: '60%' }} />
        </div>
      </div>
    ))}
  </div>
)

/** หน้า dashboard: แถว KPI + กราฟ */
export const DashboardSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <KpiSkeleton />
    <ChartsSkeleton />
  </div>
)

/**
 * เนื้อหาหน้าแบบทั่วไปของระบบ: breadcrumb, หัวเรื่อง + ปุ่ม, แถบตัวกรอง, KPI, ตาราง
 * ไม่ได้เลียนแบบหน้าใดหน้าหนึ่ง — แค่ให้เห็นทันทีว่ากำลังเปิดหน้าใหม่และโครงจะออกมาแบบไหน
 */
export const ContentSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <SkBlock w={220} h={12} style={{ maxWidth: '60%' }} />
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ flex: '1 1 260px' }}>
        <SkBlock w={320} h={26} style={{ maxWidth: '85%' }} />
        <SkBlock w={240} h={12} style={{ marginTop: 10, maxWidth: '65%' }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <SkBlock w={96} h={32} r={8} />
        <SkBlock w={120} h={32} r={8} />
      </div>
    </div>
    <SkCard style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {[180, 220, 260, 200].map((w, i) => <SkBlock key={i} w={w} h={32} r={8} style={{ maxWidth: '100%' }} />)}
    </SkCard>
    <KpiSkeleton />
    <TableSkeleton />
  </div>
)

/** แถบหัวหน้าตาเดียวกับ Navbar — ตัวจริงขึ้นแทนแล้วแถบหัวจะไม่วูบ */
export const HeaderSkeleton = () => (
  <div
    style={{
      height: 64,
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: `${STAR_PATTERN}, ${HEADER_GRADIENT}`,
      backgroundBlendMode: 'overlay, normal',
      boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
      borderBottom: '1px solid rgba(16, 185, 129, 0.15)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{ width: 40, height: 40, display: 'grid', placeItems: 'center' }}>
        <span style={{ width: 20, height: 14, borderTop: '2px solid #fff', borderBottom: '2px solid #fff', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 0, right: 0, top: 4, borderTop: '2px solid #fff' }} />
        </span>
      </span>
      <span style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 600, letterSpacing: '0.02em', textShadow: '0 0 12px rgba(16, 185, 129, 0.45)' }}>
        PYHOS-EXP
      </span>
    </div>
    <div style={{ display: 'flex', gap: 16 }}>
      <span style={{ width: 22, height: 22, borderRadius: 11, background: 'rgba(255,255,255,0.18)' }} />
      <span style={{ width: 22, height: 22, borderRadius: 11, background: 'rgba(255,255,255,0.18)' }} />
    </div>
  </div>
)

/** ทั้งหน้า (แถบหัว + เนื้อหา) — ใช้ใน loading.tsx และหน้าที่ยังไม่พร้อมแสดงอะไรเลย */
export default function PageSkeleton() {
  return (
    <div className="min-h-screen bg-app-bg" role="status" aria-busy="true" aria-live="polite">
      <HeaderSkeleton />
      <div className="px-4 md:px-8 py-6">
        <ContentSkeleton />
      </div>
      <span className="sr-only">กำลังโหลด...</span>
    </div>
  )
}
