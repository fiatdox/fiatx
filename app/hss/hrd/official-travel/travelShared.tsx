'use client'
// ส่วนกลางของระบบเดินทางไปราชการ (งานพัฒนาทรัพยากรบุคคล พรส) — โครงหน้าและเมนู
import React, { useSyncExternalStore } from 'react'
import { Button, Result } from 'antd'
import { HomeOutlined, FundOutlined } from '@ant-design/icons'
import { FaGraduationCap, FaPlaneDeparture, FaFileSignature, FaListAlt, FaCoins, FaRoute, FaChartPie, FaBed, FaSignature } from 'react-icons/fa'
import Link from 'next/link'
import Cookies from 'js-cookie'
import Breadcrumb from '@/app/components/AppBreadcrumb'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import { HRD_ALLOWANCE_ROLES, normalizeRoles } from '@/app/lib/menuAccess'

export const TRAVEL_BASE = '/hss/hrd/official-travel'
export const TRAVEL_COLOR = '#6366f1'

export interface TravelMenuItem {
  title: string
  desc: string
  href: string
  icon: React.ReactNode
  roles?: string[] // ไม่ระบุ = ทุกคนเห็น
}

export const TRAVEL_MENU: TravelMenuItem[] = [
  { title: 'ขออนุมัติเดินทางไปราชการ', desc: 'ยื่นคำขอไปราชการ ระบุเรื่อง สถานที่ วันเดินทาง และประมาณการค่าใช้จ่าย', href: `${TRAVEL_BASE}/request`, icon: <FaFileSignature /> },
  { title: 'รายการขออนุมัติเดินทางไปราชการ', desc: 'ติดตามสถานะคำขอไปราชการและประวัติการเดินทาง', href: `${TRAVEL_BASE}/requests`, icon: <FaListAlt /> },
  { title: 'ตั้งค่าเบี้ยเลี้ยงบุคลากร', desc: 'กำหนดอัตราเบี้ยเลี้ยงรายบุคคล และแก้ราคาของแต่ละอัตรา สำหรับบุคลากรที่ปฏิบัติงาน', href: `${TRAVEL_BASE}/allowance`, icon: <FaCoins />, roles: HRD_ALLOWANCE_ROLES },
  { title: 'ตั้งค่าการเดินทาง', desc: 'อัตราค่าน้ำมันต่อกิโลเมตรของพาหนะส่วนตัว และเพดานราคารถโดยสารประจำทางและเครื่องบินตามเส้นทาง', href: `${TRAVEL_BASE}/transport`, icon: <FaRoute />, roles: HRD_ALLOWANCE_ROLES },
  { title: 'ตั้งค่าค่าเช่าที่พัก', desc: 'อัตราเพดานค่าที่พักแบบเหมาจ่ายและจ่ายจริงตามระดับตำแหน่ง สิทธิ์ชั้นโดยสารเครื่องบิน และระดับของบุคลากร', href: `${TRAVEL_BASE}/lodging`, icon: <FaBed />, roles: HRD_ALLOWANCE_ROLES },
  { title: 'ตั้งค่าการลงนาม', desc: 'เลือกรายกลุ่มว่าให้ลงนามด้วยลายเซ็นในระบบ หรือเดินเอกสารให้เซ็นเอง', href: `${TRAVEL_BASE}/signing`, icon: <FaSignature />, roles: HRD_ALLOWANCE_ROLES },
  { title: 'งบประมาณและ Dashboard', desc: 'ตั้งวงเงินงบประมาณรายปี ดูยอดใช้จริงที่การเงินยืนยัน ยอดรอยืนยัน และคงเหลือ', href: `${TRAVEL_BASE}/budget`, icon: <FaChartPie />, roles: HRD_ALLOWANCE_ROLES },
]

// งานที่ต้องดำเนินการของ HRD — การ์ดหน้าแรก (HrdTasks) และตัวกรอง ?task= ของหน้ารายการคำขอ (ตรงกับ backend taskWhere)
export type HrdTaskKey = 'director' | 'actual' | 'soon'
export const HRD_TASKS: Record<HrdTaskKey, { title: string; hint: string; color: string }> = {
  director: { title: 'รอบันทึกผลคำสั่งผู้อำนวยการ', hint: 'ผ่านสายอนุมัติแล้ว หรือเดินเอกสาร — บันทึกผลตามบันทึกข้อความที่ ผอ. ลงนามจริง', color: '#d97706' },
  actual: { title: 'รอบันทึกยอดที่การเงินยืนยัน', hint: 'ผอ. อนุมัติแล้ว — บันทึกยอดเบิกจ่ายจริงเพื่อตัดงบประมาณ', color: '#2563eb' },
  soon: { title: 'ใกล้เดินทางแต่ยังไม่อนุมัติ', hint: 'ออกเดินทางภายใน 7 วัน (หรือเลยวันแล้ว) แต่ยังค้างอยู่ในสายอนุมัติ', color: '#dc2626' },
}
export const isHrdTaskKey = (v: unknown): v is HrdTaskKey => typeof v === 'string' && v in HRD_TASKS
export const HRD_ROLES_ITEM = { roles: HRD_ALLOWANCE_ROLES } as TravelMenuItem

export async function travelPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/v1/hrd/travel/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || j.success === false) throw new TravelApiError(j.message ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่', res.status, j.field)
  return j.data as T
}

// role ของผู้ใช้จาก cookie — null ระหว่าง render ฝั่ง server / ก่อน mount (กันเมนูกะพริบและ hydration ไม่ตรง)
export const useTravelRoles = (): string[] | null => {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  if (!mounted) return null
  try { return normalizeRoles(JSON.parse(Cookies.get('user_data') ?? '{}')?.roles) } catch { return [] }
}

export const canSeeTravelItem = (item: TravelMenuItem, roles: string[] | null) =>
  !item.roles || (roles ?? []).some(r => item.roles!.includes(r))

export class TravelApiError extends Error {
  constructor(message: string, public status: number, public field?: string) { super(message) }
}

export async function travelApi<T = unknown>(path: string, method: 'GET' | 'PUT' = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`/api/v1/hrd/travel/${path}`, {
    method,
    ...(body !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || j.success === false) throw new TravelApiError(j.message ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่', res.status, j.field)
  return j.data as T
}

// โครงหน้า: Navbar + breadcrumb (หน้าย่อยส่ง current มา จะมีลิงก์กลับหน้าเมนูให้)
export const TravelShell = ({ current, children }: { current?: string; children: React.ReactNode }) => (
  <AppThemeProvider colorPrimary="#a855f7">
    <div style={{ minHeight: '100dvh', background: 'var(--app-bg)' }}>
      <Navbar />
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '20px 16px 56px' }}>
        <Breadcrumb
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FundOutlined /> พัฒนาระบบบริการและสนับสนุนบริการสุขภาพ</> },
            { href: '/hss/hrd', title: <><FaGraduationCap style={{ display: 'inline-block', verticalAlign: '-2px' }} /> งานพัฒนาทรัพยากรบุคคล</> },
            current
              ? { href: TRAVEL_BASE, title: <><FaPlaneDeparture style={{ display: 'inline-block', verticalAlign: '-2px' }} /> เดินทางไปราชการ</> }
              : { title: <><FaPlaneDeparture style={{ display: 'inline-block', verticalAlign: '-2px' }} /> เดินทางไปราชการ</> },
            ...(current ? [{ title: current }] : []),
          ]}
          style={{ marginBottom: 18 }}
        />
        {children}
      </div>
    </div>
  </AppThemeProvider>
)

// หน้าย่อยที่ยังไม่ได้ทำระบบ
export const TravelComingSoon = ({ item }: { item: TravelMenuItem }) => (
  <TravelShell current={item.title}>
    <Result
      icon={<span style={{ fontSize: 64, color: TRAVEL_COLOR }}>{item.icon}</span>}
      title={item.title}
      subTitle="หน้านี้กำลังจัดทำ ยังใช้งานไม่ได้"
      extra={<Link href={TRAVEL_BASE}><Button type="primary">กลับเมนูเดินทางไปราชการ</Button></Link>}
    />
  </TravelShell>
)
