'use client'
// ส่วนกลางของระบบเดินทางไปราชการ (งานพัฒนาทรัพยากรบุคคล พรส) — โครงหน้าและเมนู
import React, { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Button, Result } from 'antd'
import { HomeOutlined, FundOutlined } from '@ant-design/icons'
import { FaGraduationCap, FaPlaneDeparture, FaFileSignature, FaListAlt, FaCoins, FaRoute, FaChartPie, FaBed, FaSignature, FaTasks, FaUserCheck } from 'react-icons/fa'
import Link from 'next/link'
import Cookies from 'js-cookie'
import Breadcrumb from '@/app/components/AppBreadcrumb'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import { HRD_ALLOWANCE_ROLES, normalizeRoles } from '@/app/lib/menuAccess'
import { budgetTypeLabel, type BudgetTypeRow } from './travelCalc'

export const TRAVEL_BASE = '/hss/hrd/official-travel'
export const TRAVEL_COLOR = '#6366f1'

export interface TravelMenuItem {
  title: string
  desc: string
  href: string
  icon: React.ReactNode
  roles?: string[] // ไม่ระบุ = ทุกคนเห็น
  /** เห็นเฉพาะผู้อนุมัติ (หัวหน้า/รักษาการกลุ่มงานหรือกลุ่มภารกิจ หรือเคยอยู่ในสาย) — ถาม backend ไม่ใช่ role */
  approver?: boolean
  /** สีไอคอนบนการ์ดหน้าเมนู */
  color?: string
  /** คำอธิบายสั้นบนการ์ดหน้าเมนู (ไม่ระบุ = ใช้ desc) */
  short?: string
}

export const TRAVEL_MENU: TravelMenuItem[] = [
  { title: 'ขออนุมัติเดินทางไปราชการ', desc: 'ยื่นคำขอไปราชการ ระบุเรื่อง สถานที่ วันเดินทาง และประมาณการค่าใช้จ่าย', href: `${TRAVEL_BASE}/request`, icon: <FaFileSignature />, color: '#10b981', short: 'ยื่นคำขอไปราชการ และประมาณการค่าใช้จ่าย' },
  { title: 'รายการขออนุมัติเดินทางไปราชการ', desc: 'ติดตามสถานะคำขอไปราชการและประวัติการเดินทาง', href: `${TRAVEL_BASE}/requests`, icon: <FaListAlt />, color: '#3b82f6', short: 'ติดตามสถานะคำขอและประวัติการเดินทาง' },
  { title: 'ตั้งค่าเบี้ยเลี้ยงบุคลากร', desc: 'กำหนดอัตราเบี้ยเลี้ยงรายบุคคล และแก้ราคาของแต่ละอัตรา สำหรับบุคลากรที่ปฏิบัติงาน', href: `${TRAVEL_BASE}/allowance`, icon: <FaCoins />, roles: HRD_ALLOWANCE_ROLES, color: '#14b8a6', short: 'อัตราเบี้ยเลี้ยงรายบุคคล และราคาแต่ละอัตรา' },
  { title: 'ตั้งค่าการเดินทาง', desc: 'อัตราค่าน้ำมันต่อกิโลเมตรของพาหนะส่วนตัว และเพดานราคารถโดยสารประจำทางและเครื่องบินตามเส้นทาง', href: `${TRAVEL_BASE}/transport`, icon: <FaRoute />, roles: HRD_ALLOWANCE_ROLES, color: '#0ea5e9', short: 'ค่าน้ำมันต่อ กม. และเพดานค่าโดยสารตามเส้นทาง' },
  { title: 'ตั้งค่าค่าเช่าที่พัก', desc: 'อัตราเพดานค่าที่พักแบบเหมาจ่ายและจ่ายจริงตามระดับตำแหน่ง สิทธิ์ชั้นโดยสารเครื่องบิน และระดับของบุคลากร', href: `${TRAVEL_BASE}/lodging`, icon: <FaBed />, roles: HRD_ALLOWANCE_ROLES, color: '#8b5cf6', short: 'เพดานค่าที่พักตามระดับ และสิทธิ์ชั้นโดยสาร' },
  { title: 'ตั้งค่าการลงนาม', desc: 'เลือกรายกลุ่มว่าให้ลงนามด้วยลายเซ็นในระบบ หรือเดินเอกสารให้เซ็นเอง', href: `${TRAVEL_BASE}/signing`, icon: <FaSignature />, roles: HRD_ALLOWANCE_ROLES, color: '#64748b', short: 'ลงนามในระบบ หรือเดินเอกสาร รายกลุ่มงาน' },
  { title: 'งบประมาณและ Dashboard', desc: 'ตั้งวงเงินงบประมาณรายปี ดูยอดใช้จริงที่การเงินยืนยัน ยอดรอยืนยัน และคงเหลือ', href: `${TRAVEL_BASE}/budget`, icon: <FaChartPie />, roles: HRD_ALLOWANCE_ROLES, color: '#6366f1', short: 'วงเงินรายปี ยอดใช้จริง รอยืนยัน และคงเหลือ' },
  // ต่อท้ายเสมอ — หน้าอื่นอ้าง TRAVEL_MENU ด้วย index (หน้าเมนูย้ายใบนี้ขึ้นเป็นใบแรกเอง)
  { title: 'งานที่ต้องดำเนินการ', desc: 'คำขอที่รอบันทึกผลคำสั่ง ผอ. รอยอดจากการเงิน ใกล้เดินทางแต่ยังไม่อนุมัติ และงบประมาณที่ต้องดู', href: `${TRAVEL_BASE}/tasks`, icon: <FaTasks />, roles: HRD_ALLOWANCE_ROLES, color: '#dc2626', short: 'รอบันทึกผล ผอ. รอยอดการเงิน และใกล้เดินทาง' },
  { title: 'อนุมัติการเดินทางไปราชการ', desc: 'หัวหน้ากลุ่มงาน / หัวหน้ากลุ่มภารกิจ พิจารณาและลงนามคำขอในระบบ (ผู้อำนวยการลงนามบนกระดาษ)', href: `${TRAVEL_BASE}/approval`, icon: <FaUserCheck />, approver: true, color: '#f59e0b', short: 'พิจารณาและลงนามคำขอในสายอนุมัติ' },
]
/** การ์ด/หน้า งานที่ต้องดำเนินการ (ADMIN / HRD) */
export const TRAVEL_TASKS_ITEM = TRAVEL_MENU.find(it => it.href === `${TRAVEL_BASE}/tasks`)!
/** การ์ด/หน้า อนุมัติการเดินทาง (ผู้อนุมัติในสาย) */
export const TRAVEL_APPROVAL_ITEM = TRAVEL_MENU.find(it => it.href === `${TRAVEL_BASE}/approval`)!

// งานที่ต้องดำเนินการของ HRD — การ์ดหน้าแรก (HrdTasks) และตัวกรอง ?task= ของหน้ารายการคำขอ (ตรงกับ backend taskWhere)
export type HrdTaskKey = 'director' | 'actual' | 'soon'
export const HRD_TASKS: Record<HrdTaskKey, { title: string; hint: string; color: string }> = {
  director: { title: 'รอบันทึกผลคำสั่งผู้อำนวยการ', hint: 'ผ่านสายอนุมัติแล้ว หรือเดินเอกสาร — บันทึกผลตามบันทึกข้อความที่ ผอ. ลงนามจริง', color: '#d97706' },
  actual: { title: 'รอบันทึกยอดที่การเงินยืนยัน', hint: 'ผอ. อนุมัติแล้ว — บันทึกยอดเบิกจ่ายจริงเพื่อตัดงบประมาณ', color: '#2563eb' },
  soon: { title: 'ใกล้เดินทางแต่ ผอ. ยังไม่อนุมัติ', hint: 'ออกเดินทางภายใน 7 วัน (หรือเลยวันแล้ว) แต่ยังค้างในสายอนุมัติหรือรอ ผอ. ลงนาม — ต้องเร่ง ไม่งั้นผู้เดินทางไม่มีสิทธิ์เดินทาง', color: '#dc2626' },
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
/** fluid = ใช้ความกว้างเต็มจอ (หน้าตารางที่มีหลายคอลัมน์) */
export const TravelShell = ({ current, fluid, children }: { current?: string; fluid?: boolean; children: React.ReactNode }) => {
  // หน้าภาพรวมเปิดเฉพาะ ADMIN/HRD (proxy.ts) — คนอื่นไม่ต้องมีลิงก์ที่กดแล้วเด้งกลับหน้าหลัก
  const hubLink = canSeeTravelItem(HRD_ROLES_ITEM, useTravelRoles())
  return (
  <AppThemeProvider colorPrimary="#a855f7">
    <div style={{ minHeight: '100dvh', background: 'var(--app-bg)' }}>
      <Navbar />
      <div style={{ maxWidth: fluid ? 'none' : 1320, margin: '0 auto', padding: fluid ? '20px clamp(16px, 2vw, 32px) 56px' : '20px 16px 56px' }}>
        <Breadcrumb
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FundOutlined /> พัฒนาระบบบริการและสนับสนุนบริการสุขภาพ</> },
            { href: '/hss/hrd', title: <><FaGraduationCap style={{ display: 'inline-block', verticalAlign: '-2px' }} /> งานพัฒนาทรัพยากรบุคคล</> },
            current && hubLink
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
}

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

// ประเภทงบ (ช่องที่ติ๊กในบันทึกข้อความ) — โหลดครั้งเดียวต่อหน้า · reload หลังเพิ่ม/แก้ที่หน้างบประมาณ
export const useBudgetTypes = () => {
  const [types, setTypes] = useState<BudgetTypeRow[] | null>(null)
  const reload = useCallback(() => travelApi<BudgetTypeRow[]>('budget-types').then(setTypes).catch(() => setTypes([])), [])
  useEffect(() => { reload() }, [reload])
  const byCode = useMemo(() => new Map((types ?? []).map(t => [t.code, t])), [types])
  const label = useCallback((code: string) => budgetTypeLabel(byCode.get(code), code), [byCode])
  return { types, byCode, label, reload }
}
