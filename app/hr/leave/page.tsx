'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Cookies from 'js-cookie'
import { Card, Typography, Button, Space, Empty, Tag, Skeleton, Row, Col, Badge, Progress, Select, Alert, Table, Tooltip } from 'antd'
import Breadcrumb from '@/app/components/AppBreadcrumb'
import {
  HomeOutlined, LinkOutlined, PushpinFilled, NotificationOutlined,
  FolderOpenOutlined, FormOutlined, HistoryOutlined, AuditOutlined, RightOutlined, TeamOutlined, CalendarOutlined,
  FileSearchOutlined, DashboardOutlined, UserSwitchOutlined, CheckCircleFilled, MinusCircleOutlined, WarningFilled,
  ScheduleOutlined, SafetyCertificateOutlined, SettingOutlined, CloudDownloadOutlined, ToolOutlined, CloudSyncOutlined,
} from '@ant-design/icons'
import { FaUsersCog, FaCalendarAlt, FaUmbrellaBeach, FaBriefcase, FaUserMd, FaBaby } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import HrPopup from '@/app/components/HrPopup'
import { normalizeRoles, MENU_ROLE_REQUIREMENTS, canSeeMenu } from '@/app/lib/menuAccess'
import LeaveHeader from './LeaveHeader'
import {
  type HrPost, KIND_LABEL, NO_CATEGORY, categoryRank, fileIcon, fileUrl, fmtDate, fmtSize, isImage,
} from '@/app/lib/hrPosts'

const { Text, Paragraph } = Typography

interface QuickLink { href: string; icon: React.ReactNode; label: string; desc: string; color: string; badge?: number; badgeColor?: string; highlight?: boolean }

const QUICK_LINKS: QuickLink[] = [
  { href: '/hr/leave/new', icon: <FormOutlined />, label: 'ยื่นคำขอลา', desc: 'ยื่นใบลาใหม่ ตรวจสิทธิ์วันลาคงเหลือ', color: '#10b981' },
  { href: '/hr/leave/history', icon: <HistoryOutlined />, label: 'ประวัติการลาของฉัน', desc: 'ใบลาทั้งหมด ติดตามสถานะการอนุมัติ', color: '#3b82f6' },
  { href: '/hr/leave/calendar', icon: <CalendarOutlined />, label: 'ปฏิทินการลา', desc: 'ดูว่าใครลาวันไหน ตามสิทธิ์ของตน', color: '#0d9488' },
]

// เครื่องมือของงานทรัพยากรบุคคล — การ์ดแสดงตามสิทธิ์ใน MENU_ROLE_REQUIREMENTS (กติกาเดียวกับ Navbar และ proxy.ts)
const HR_TOOL_LINKS: QuickLink[] = [
  { href: '/hr/leave/day-check', icon: <ScheduleOutlined />, label: 'ตรวจวันลา / วันหยุด', desc: 'ตรวจจำนวนวันลาหลังอนุมัติ และวันหยุดราชการ', color: '#0ea5e9' },
  { href: '/hr/leave/balance', icon: <FaUmbrellaBeach />, label: 'วันลาสะสม', desc: 'ยอดยกมาลาพักผ่อน และยกยอดปีงบประมาณ', color: '#14b8a6' },
  { href: '/hr/leave/balance-audit', icon: <SafetyCertificateOutlined />, label: 'ตรวจแก้วันลาสะสม', desc: 'หายอดวันลาที่ผิด แก้ไขพร้อมเก็บประวัติ', color: '#047857' },
  { href: '/hr/leave/balance-transfer', icon: <CloudSyncOutlined />, label: 'ตรวจสอบการโอนยอดสะสม', desc: 'ใครยังไม่ได้โอนยอด แยกตามประเภทบุคลากร', color: '#0e7490' },
  { href: '/hr/leave/policy', icon: <SettingOutlined />, label: 'กำหนดสิทธิ์การลา', desc: 'ประเภทการลา และสิทธิ์ตามประเภทบุคลากร', color: '#f59e0b' },
  { href: '/hr/leave/posts', icon: <NotificationOutlined />, label: 'ข่าว / เอกสารงาน HR', desc: 'ประกาศข่าว แบบฟอร์ม และป๊อปอัป', color: '#10b981' },
  { href: '/hr/leave/legacy-import', icon: <CloudDownloadOutlined />, label: 'โอนข้อมูลโปรแกรมเดิม', desc: 'นำเข้าประวัติการลาและวันเริ่มงาน', color: '#64748b' },
]

// ── สรุปวันลาปีงบปัจจุบันของฉัน ─────────────────────────────────────────────
interface OverviewType {
  code: string
  name_th: string
  has_entitlement: boolean
  entitled: number          // สิทธิ์รวม (ปีนี้ + ยกมา)
  entitled_this_year: number
  carried_in: number
  used: number              // อนุมัติแล้ว/หักแล้ว ไม่รวมใบรออนุมัติ
  pending: number
  remaining: number
}

const OVERVIEW_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  ANNUAL: { label: 'วันลาพักผ่อน', icon: <FaUmbrellaBeach />, color: '#10b981' },
  PERS: { label: 'ลากิจส่วนตัว', icon: <FaBriefcase />, color: '#3b82f6' },
  SICK: { label: 'ลาป่วย', icon: <FaUserMd />, color: '#f97316' },
  MAT: { label: 'ลาคลอดบุตร', icon: <FaBaby />, color: '#db2777' },
}
const fmtDays = (n: number) => Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 1 })

type OverviewData = { fiscal_year: number; types: OverviewType[] }

/** override = ข้อมูลของบุคลากรที่ ADMIN เลือกดูแทน (ไม่ส่ง = ของผู้ login) */
const LeaveOverviewCards = ({ override }: { override?: OverviewData | null }) => {
  const [own, setOwn] = useState<OverviewData | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    fetch('/api/v1/hr/leave-requests/overview')
      .then(r => r.json())
      .then(j => { if (j?.success) setOwn(j.data); else setFailed(true) })
      .catch(() => setFailed(true))
  }, [])
  const data = override !== undefined ? override : own
  if (override === undefined && failed) return null

  return (
    <div style={{ marginBottom: 24 }}>
      <Text type="secondary" style={{ fontSize: 13 }}>
        วันลาของฉัน{data ? ` · ปีงบประมาณ ${data.fiscal_year}` : ''}
      </Text>
      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        {!data ? [0, 1, 2, 3].map(i => (
          <Col key={i} xs={24} sm={12} lg={6}>
            <Card style={{ borderRadius: 12, border: 'none' }}><Skeleton active paragraph={{ rows: 1 }} /></Card>
          </Col>
        )) : data.types.map(t => {
          const m = OVERVIEW_META[t.code] ?? { label: t.name_th, icon: <CalendarOutlined />, color: '#64748b' }
          const annual = t.code === 'ANNUAL'
          const total = Number(t.entitled) || 0
          const used = Number(t.used) || 0
          const pending = Number(t.pending) || 0
          // ใบที่รออนุมัติถูกตัดยอดทันทีตั้งแต่ยื่น จึงนับรวมใน "ใช้ไป" ด้วย (บรรทัดล่างบอกส่วนที่ยังรออนุมัติ)
          const usedNow = used + pending
          return (
            <Col key={t.code} xs={24} sm={12} lg={6}>
              <Card style={{ borderRadius: 12, border: 'none', height: '100%' }} styles={{ body: { padding: 16 } }}>
                <div className="flex items-center gap-2">
                  <span
                    className="flex items-center justify-center rounded-lg"
                    style={{ width: 32, height: 32, flexShrink: 0, fontSize: 16, color: m.color, backgroundColor: `${m.color}1f` }}
                  >
                    {m.icon}
                  </span>
                  <Text strong style={{ minWidth: 0 }}>{m.label}</Text>
                  {/* ลาพักผ่อน: ที่มาของสิทธิ์ + คงเหลือ ไว้มุมขวาบน */}
                  {annual && t.has_entitlement && (
                    <div style={{ marginLeft: 'auto', textAlign: 'right', fontSize: 12, lineHeight: 1.35, color: 'var(--app-text-2)' }}>
                      <div>ปีนี้ {fmtDays(t.entitled_this_year)} + สะสม {fmtDays(t.carried_in)}</div>
                      <div>คงเหลือ <b style={{ color: 'var(--app-text)' }}>{fmtDays(t.remaining)}</b> วัน</div>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 10 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>ใช้ไป</Text>{' '}
                  <span style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>{fmtDays(usedNow)}</span>
                  {annual && t.has_entitlement
                    ? <Text type="secondary" style={{ fontSize: 15 }}> / {fmtDays(total)} วัน</Text>
                    : <Text type="secondary" style={{ fontSize: 15 }}> วัน</Text>}
                </div>
                {annual && t.has_entitlement && (
                  <Progress
                    percent={total ? Math.min((usedNow / total) * 100, 100) : 0}
                    success={{ percent: total ? Math.min((used / total) * 100, 100) : 0, strokeColor: m.color }}
                    strokeColor="#f59e0b" showInfo={false} size="small" style={{ margin: '6px 0 2px' }}
                  />
                )}
                <div style={{ fontSize: 12, color: 'var(--app-text-2)', marginTop: 4 }}>
                  {/* ลากิจ/ลาป่วย/ลาคลอด แสดงเฉพาะวันที่ใช้ไป — ไม่โชว์สิทธิ์/คงเหลือ กันเข้าใจว่าเป็นโควตาที่ต้องลาให้ครบ */}
                  {pending > 0 && <div style={{ color: '#f59e0b' }}>รวมรออนุมัติ {fmtDays(pending)} วัน</div>}
                </div>
              </Card>
            </Col>
          )
        })}
      </Row>
    </div>
  )
}

// ── ADMIN ดูแบบเจ้าหน้าที่ (view as) ─────────────────────────────────────────────
interface ApproverScope { id: number; name: string; is_primary: boolean }
interface ApproverInfo { is_approver: boolean; is_director: boolean; is_admin: boolean; missions: ApproverScope[]; majors: ApproverScope[]; submajors: ApproverScope[] }
interface AccessPreview {
  user: { id: number; name: string; is_active: boolean }
  roles: string[]
  approver: ApproverInfo | null
  pending_approvals: number
  mine: { total: number; pending: number }
  overview: OverviewData | null
}

const HR_ROLES = ['ADMIN', 'HR']
/** หน้าในระบบการลาทั้งหมด — ที่มา: card = การ์ดในหน้านี้ · menu = เมนูใน Navbar (menuAccess) */
const LEAVE_PAGES: { href: string; label: string; where: 'card' | 'menu' }[] = [
  { href: '/hr/leave/new', label: 'ยื่นคำขอลา', where: 'card' },
  { href: '/hr/leave/history', label: 'ประวัติการลาของฉัน', where: 'card' },
  { href: '/hr/leave/calendar', label: 'ปฏิทินการลา', where: 'card' },
  { href: '/hr/leave/status', label: 'สถิติการลา', where: 'card' },
  { href: '/hr/leave/approval', label: 'อนุมัติการลา', where: 'card' },
  { href: '/hr/leave/staff-history', label: 'ประวัติการลาเจ้าหน้าที่', where: 'card' },
  { href: '/hr/leave/dashboard', label: 'Dashboard วิเคราะห์การลา', where: 'card' },
  { href: '/hr/leave/day-check', label: 'ตรวจวันลา / วันหยุด', where: 'card' },
  { href: '/hr/leave/balance', label: 'วันลาสะสม', where: 'card' },
  { href: '/hr/leave/balance-audit', label: 'ตรวจแก้วันลาสะสม', where: 'card' },
  { href: '/hr/leave/balance-transfer', label: 'ตรวจสอบการโอนยอดวันลาสะสม', where: 'card' },
  { href: '/hr/leave/policy', label: 'กำหนดสิทธิ์การลา', where: 'card' },
  { href: '/hr/leave/posts', label: 'ข่าว / เอกสารงาน HR', where: 'card' },
  { href: '/hr/leave/legacy-import', label: 'โอนข้อมูลโปรแกรมเดิม', where: 'card' },
]

/** หัวหน้า/รักษาการ/ผอ. ที่บุคคลนี้ถืออยู่ — ข้อความสั้นสำหรับบอกที่มาของสิทธิ์ */
const headTitles = (a: ApproverInfo | null) => !a ? [] : [
  ...(a.is_director ? ['ผู้อำนวยการ'] : []),
  ...a.missions.map(x => `${x.is_primary ? 'หัวหน้า' : 'รักษาการหัวหน้า'}กลุ่มภารกิจ${x.name}`),
  ...a.majors.map(x => `${x.is_primary ? 'หัวหน้า' : 'รักษาการหัวหน้า'}${x.name}`),
  ...a.submajors.map(x => `${x.is_primary ? 'หัวหน้า' : 'รักษาการหัวหน้า'}${x.name}`),
]

/**
 * ใครเห็นหน้าไหน เพราะอะไร — ตรรกะเดียวกับการ์ดในหน้านี้ + MENU_ROLE_REQUIREMENTS (Navbar / proxy)
 * via 'role' = ได้จาก role ในระบบ (ควรตรวจว่าตรงกับหน้าที่จริงไหม) · 'head' = ได้จากการแต่งตั้งในผัง · 'all' = ทุกคน
 */
const accessOf = (href: string, roles: string[], approver: ApproverInfo | null): { ok: boolean; via: 'all' | 'role' | 'head' | null; reason: string } => {
  const hrRoles = roles.filter(r => HR_ROLES.includes(r))
  const heads = headTitles(approver)
  const isHead = heads.length > 0
  if (href === '/hr/leave/status') {
    if (hrRoles.length) return { ok: true, via: 'role', reason: `role ${hrRoles.join(', ')} — เห็นทั้งองค์กร` }
    if (isHead) return { ok: true, via: 'head', reason: `${heads.join(' · ')} — เห็นหน่วยที่ดูแล` }
    return { ok: false, via: null, reason: 'ไม่ใช่หัวหน้า และไม่มี role ADMIN / HR' }
  }
  if (href === '/hr/leave/approval') {
    if (isHead) return { ok: true, via: 'head', reason: heads.join(' · ') }
    if (roles.includes('ADMIN')) return { ok: true, via: 'role', reason: 'role ADMIN (ไม่ได้เป็นหัวหน้าในผัง)' }
    return { ok: false, via: null, reason: 'ไม่ได้เป็นหัวหน้า/รักษาการ/ผอ.' }
  }
  const need = MENU_ROLE_REQUIREMENTS[href] ?? (href === '/hr/leave/staff-history' || href === '/hr/leave/dashboard' ? HR_ROLES : null)
  if (!need) return { ok: true, via: 'all', reason: 'บุคลากรทุกคน' }
  const got = roles.filter(r => need.includes(r))
  return got.length
    ? { ok: true, via: 'role', reason: `role ${got.join(', ')}` }
    : { ok: false, via: null, reason: `ต้องมี role ${need.join(' / ')}` }
}

// หน้าอ่านอย่างเดียว — เพิ่ม/แก้ไขอยู่ที่ /hr/leave/posts (เฉพาะ ADMIN / HR)
const HrLeaveHomeContent = () => {
  const [posts, setPosts] = useState<HrPost[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/v1/hr-posts')
      .then(r => r.json())
      .then(json => {
        if (!json.success) {
          setLoadError(json.message || 'โหลดข้อมูลไม่สำเร็จ')
          return
        }
        setPosts(json.data ?? [])
      })
      .catch(() => setLoadError('โหลดข้อมูลไม่สำเร็จ'))
      .finally(() => setLoaded(true))
  }, [])

  // หัวหน้า / รักษาการในผังเจ้าหน้าที่ (กลุ่มภารกิจ กลุ่มงาน หน่วยงาน) หรือ ผอ. — เห็นปุ่มอนุมัติ + รายงานบุคลากรในสังกัด
  const [approver, setApprover] = useState<{ pending: number } | null>(null)
  useEffect(() => {
    let alive = true
    fetch('/api/v1/hr/leave-approver-check')
      .then(r => r.json())
      .then(async j => {
        if (!j?.success || !j.data?.is_approver) return
        const p = await fetch('/api/v1/hr/leave-requests/pending-approval?scope=pending').then(r => r.json()).catch(() => null)
        if (alive) setApprover({ pending: p?.success && Array.isArray(p.data) ? p.data.length : 0 })
      })
      .catch(() => { /* ไม่ใช่หัวหน้า = ไม่แสดงปุ่ม */ })
    return () => { alive = false }
  }, [])

  // จำนวนใบลาของฉัน (ทั้งหมด / รออนุมัติ) — แสดงบนปุ่มประวัติการลา
  const [mine, setMine] = useState<{ total: number; pending: number } | null>(null)
  useEffect(() => {
    let alive = true
    fetch('/api/v1/hr/leave-requests/mine')
      .then(r => r.json())
      .then(j => {
        if (!alive || !j?.success || !Array.isArray(j.data)) return
        const rows = j.data as { status: string }[]
        setMine({ total: rows.length, pending: rows.filter(r => ['PENDING', 'CANCEL_PENDING'].includes(String(r.status).toUpperCase())).length })
      })
      .catch(() => { /* ไม่มีตัวเลขก็แสดงปุ่มตามปกติ */ })
    return () => { alive = false }
  }, [])

  const baseLinks: QuickLink[] = QUICK_LINKS.map(l => l.href === '/hr/leave/history' && mine
    ? {
        ...l, badge: mine.total, badgeColor: l.color, highlight: mine.pending > 0,
        desc: mine.total ? `ใบลาทั้งหมด ${mine.total} ใบ${mine.pending ? ` · รออนุมัติ ${mine.pending} ใบ` : ''}` : 'ยังไม่มีใบลา',
      }
    : l)

  // ADMIN / HR — เห็นการ์ดสถิติการลาทั้งองค์กรและประวัติการลาเจ้าหน้าที่ (backend ตรวจสิทธิ์ซ้ำ)
  const [myRoles, setMyRoles] = useState<string[]>([])
  useEffect(() => {
    let roles: string[] = []
    try { roles = normalizeRoles(JSON.parse(Cookies.get('user_data') ?? '{}')?.roles) } catch { /* cookie เสีย = ผู้ใช้ทั่วไป */ }
    void Promise.resolve().then(() => setMyRoles(roles))
  }, [])
  const isHr = myRoles.some(r => r === 'ADMIN' || r === 'HR')

  // จำนวนยอดวันลาสะสมที่ต้องตรวจ (ปีงบปัจจุบัน) — แสดงบนการ์ดตรวจแก้วันลาสะสม
  const [balanceFlagged, setBalanceFlagged] = useState<number | null>(null)
  useEffect(() => {
    if (!canSeeMenu('/hr/leave/balance-audit', myRoles, null)) return
    let alive = true
    fetch('/api/v1/hr/leave-balances/audit?summary=1')
      .then(r => r.json())
      .then(j => { if (alive && j?.success) setBalanceFlagged(Number(j.data.flagged) || 0) })
      .catch(() => { /* ไม่มีตัวเลขก็แสดงการ์ดตามปกติ */ })
    return () => { alive = false }
  }, [myRoles])

  // จำนวนบุคลากรที่ยังไม่ได้โอนยอดสะสม และมีสิทธิ์สะสม (ปีงบปัจจุบัน) — แสดงบนการ์ดตรวจสอบการโอนยอด
  const [transferMissing, setTransferMissing] = useState<number | null>(null)
  useEffect(() => {
    if (!canSeeMenu('/hr/leave/balance-transfer', myRoles, null)) return
    let alive = true
    fetch('/api/v1/hr/leave-balances/transfer-status?summary=1')
      .then(r => r.json())
      .then(j => { if (alive && j?.success) setTransferMissing(Number(j.data.missing_with_right) || 0) })
      .catch(() => { /* ไม่มีตัวเลขก็แสดงการ์ดตามปกติ */ })
    return () => { alive = false }
  }, [myRoles])

  // ── ADMIN: ดูแบบเจ้าหน้าที่ — การ์ด/สรุปวันลา/หัวการ์ดข้อมูลการทำงาน เป็นของคนที่เลือก + ตารางตรวจสิทธิ์ ──
  const [isAdmin, setIsAdmin] = useState(false)
  const [staffOptions, setStaffOptions] = useState<{ value: number; label: string }[]>([])
  const [viewAs, setViewAs] = useState<number | null>(null)
  const [preview, setPreview] = useState<AccessPreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  useEffect(() => {
    let admin = false
    try { admin = normalizeRoles(JSON.parse(Cookies.get('user_data') ?? '{}')?.roles).includes('ADMIN') } catch { /* cookie เสีย */ }
    if (!admin) return
    void Promise.resolve().then(() => setIsAdmin(true))
    fetch('/api/v1/users')
      .then(r => r.json())
      .then(j => {
        if (!j?.success || !Array.isArray(j.data)) return
        setStaffOptions(j.data
          .filter((u: { is_active?: string }) => u.is_active !== 'N')
          .map((u: { id: number; pname?: string; fname?: string; lname?: string; position_name?: string }) => ({
            value: Number(u.id),
            label: `${u.pname ?? ''}${u.fname ?? ''} ${u.lname ?? ''}`.trim() + (u.position_name ? ` · ${u.position_name}` : ''),
          })))
      })
      .catch(() => { /* ไม่มีรายชื่อ = ใช้โหมดนี้ไม่ได้ */ })
  }, [])
  useEffect(() => {
    if (!viewAs) return
    let alive = true
    fetch(`/api/v1/hr/leave-access-preview?user_id=${viewAs}`)
      .then(r => r.json())
      .then(j => {
        if (!alive) return
        if (j?.success) { setPreview(j.data); setPreviewError(null) } else { setPreview(null); setPreviewError(j?.message ?? 'โหลดข้อมูลไม่สำเร็จ') }
      })
      .catch(() => { if (alive) { setPreview(null); setPreviewError('โหลดข้อมูลไม่สำเร็จ') } })
    return () => { alive = false }
  }, [viewAs])
  const viewing = viewAs != null
  const pv = viewing && preview?.user.id === viewAs ? preview : null

  // ค่าที่ใช้ตัดสินการ์ด — โหมดดูแทนใช้ของคนที่เลือก
  const effIsHr = viewing ? !!pv?.roles.some(r => HR_ROLES.includes(r)) : isHr
  const effApprover = viewing ? (pv?.approver?.is_approver ? { pending: pv.pending_approvals } : null) : approver
  const effBaseLinks: QuickLink[] = viewing
    ? QUICK_LINKS.map(l => l.href === '/hr/leave/history' && pv
      ? {
          ...l, badge: pv.mine.total, badgeColor: l.color, highlight: pv.mine.pending > 0,
          desc: pv.mine.total ? `ใบลาทั้งหมด ${pv.mine.total} ใบ${pv.mine.pending ? ` · รออนุมัติ ${pv.mine.pending} ใบ` : ''}` : 'ยังไม่มีใบลา',
        }
      : l)
    : baseLinks
  const accessRows = pv ? LEAVE_PAGES.map(p => ({ ...p, ...accessOf(p.href, pv.roles, pv.approver) })) : []

  // การ์ดเครื่องมือ HR ตามสิทธิ์ — โหมดดูแทนใช้ role ของคนที่เลือก (ไม่มีตัวเลขค้างตรวจ เพราะเป็นข้อมูลทั้งองค์กรเหมือนกัน)
  const effRoles = viewing ? (pv?.roles ?? []) : myRoles
  const hrTools: QuickLink[] = HR_TOOL_LINKS
    .filter(l => canSeeMenu(l.href, effRoles, null))
    .map(l => l.href === '/hr/leave/balance-audit' && !viewing && balanceFlagged != null
      ? {
          ...l, badge: balanceFlagged, badgeColor: '#ef4444', highlight: balanceFlagged > 0,
          desc: balanceFlagged ? `พบยอดที่ต้องตรวจ ${balanceFlagged} รายการ` : 'ยอดวันลาปีงบนี้ไม่พบปัญหา',
        }
      : l.href === '/hr/leave/balance-transfer' && !viewing && transferMissing != null
        ? {
            ...l, badge: transferMissing, badgeColor: '#ef4444', highlight: transferMissing > 0,
            desc: transferMissing ? `ยังไม่ได้โอนยอด ${transferMissing.toLocaleString('th-TH')} คน` : 'โอนยอดครบทุกคนแล้ว',
          }
        : l)

  const quickLinks: QuickLink[] = [
    ...effBaseLinks,
    ...(effApprover || effIsHr ? [{
      href: '/hr/leave/status', icon: <TeamOutlined />, label: 'สถิติการลา', color: '#8b5cf6',
      desc: effIsHr ? 'สรุปการลาของบุคลากรทั้งองค์กร' : 'สรุปการลาของบุคลากรในหน่วยที่ดูแล',
    }] : []),
    ...(effIsHr ? [{
      href: '/hr/leave/staff-history', icon: <FileSearchOutlined />, label: 'ประวัติการลาเจ้าหน้าที่', color: '#0891b2',
      desc: 'รายละเอียดใบลาทุกคน พร้อมไฟล์แนบ',
    }, {
      href: '/hr/leave/dashboard', icon: <DashboardOutlined />, label: 'Dashboard วิเคราะห์การลา', color: '#6366f1',
      desc: 'การตรวจวันลา แนวโน้ม และรูปแบบการลา',
    }] : []),
    ...(effApprover ? [{
      href: '/hr/leave/approval', icon: <AuditOutlined />, label: 'อนุมัติการลา', color: '#f59e0b', badge: effApprover.pending, highlight: effApprover.pending > 0,
      desc: effApprover.pending ? `รอการอนุมัติ ${effApprover.pending} รายการ` : 'ไม่มีใบลารออนุมัติ',
    }] : []),
  ]

  const news = useMemo(() => posts.filter(p => p.kind === 'news'), [posts])
  const docGroups = useMemo(() => {
    const groups = new Map<string, HrPost[]>()
    for (const p of posts.filter(x => x.kind === 'document')) {
      const c = p.category || NO_CATEGORY
      groups.set(c, [...(groups.get(c) ?? []), p])
    }
    return [...groups.entries()].sort(([a], [b]) => categoryRank(a, b))
  }, [posts])

  const pinTag = (p: HrPost) => p.is_pinned && (
    <Tag color="gold" icon={<PushpinFilled />} style={{ marginInlineEnd: 4 }}>ปักหมุด</Tag>
  )

  const attachments = (p: HrPost) => (p.has_file || p.link_url) && (
    <Space wrap size={8} style={{ marginTop: 8 }}>
      {p.has_file && (
        <Button size="small" icon={fileIcon(p.original_name)} href={fileUrl(p.id)} target="_blank" rel="noopener noreferrer">
          {p.original_name ?? 'ไฟล์แนบ'} {p.file_size ? <Text type="secondary" style={{ fontSize: 11 }}>({fmtSize(p.file_size)})</Text> : null}
        </Button>
      )}
      {p.link_url && (
        <Button size="small" icon={<LinkOutlined />} href={p.link_url} target="_blank" rel="noopener noreferrer">เปิดลิงก์</Button>
      )}
    </Space>
  )

  const renderLinks = (links: QuickLink[]) => (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      {links.map(l => (
        <Col key={l.href} xs={24} sm={12} lg={6}>
          <Link href={l.href} className="block h-full" onClick={e => { if (viewing) e.preventDefault() }} style={viewing ? { cursor: 'default' } : undefined}>
            <Card hoverable style={{ borderRadius: 12, border: 'none', height: '100%' }} styles={{ body: { padding: 16 } }}>
              <div className="flex items-center gap-3">
                <span
                  className="flex items-center justify-center rounded-xl"
                  style={{ width: 44, height: 44, flexShrink: 0, fontSize: 20, color: l.color, backgroundColor: `${l.color}1f` }}
                >
                  {l.icon}
                </span>
                <div style={{ minWidth: 0 }}>
                  <Text strong style={{ fontSize: 15 }}>{l.label}</Text>
                  <div>
                    {l.highlight
                      ? <Text strong style={{ fontSize: 12, color: '#f59e0b' }}>{l.desc}</Text>
                      : <Text type="secondary" style={{ fontSize: 12 }}>{l.desc}</Text>}
                  </div>
                </div>
                <span className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
                  {!!l.badge && <Badge count={l.badge} overflowCount={999} color={l.badgeColor} />}
                  <RightOutlined style={{ color: 'var(--app-text-3)' }} />
                </span>
              </div>
            </Card>
          </Link>
        </Col>
      ))}
    </Row>
  )

  return (
    <div className="min-h-dvh bg-app-bg text-app-text">
      <Navbar />
      <div className="p-4 md:p-8 max-w-350 mx-auto">
        <Breadcrumb
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FaUsersCog className="inline mr-1" /> งานทรัพยากรบุคคล</> },
            { title: <><FaCalendarAlt className="inline mr-1" /> การลา</> },
          ]}
          className="mb-4"
        />

        {isAdmin && (
          <Card variant="borderless" className="mb-4 shadow-sm" style={{ borderRadius: 12 }} styles={{ body: { padding: 14 } }}>
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <Text strong style={{ whiteSpace: 'nowrap' }}><UserSwitchOutlined /> ดูแบบเจ้าหน้าที่ (ADMIN)</Text>
              <Select
                showSearch allowClear
                className="w-full md:max-w-120"
                placeholder="ดูของตัวเอง — หรือค้นหาชื่อบุคลากรเพื่อดูว่าเห็นเมนูอะไรบ้าง"
                options={staffOptions}
                value={viewAs ?? undefined}
                optionFilterProp="label"
                onChange={(v?: number) => { setViewAs(v ?? null); setPreviewError(null) }}
              />
            </div>
            {!viewing ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                ตรวจว่าเจ้าหน้าที่แต่ละคนเห็นเมนูการลาครบตามหน้าที่ไหม และใครได้สิทธิ์จาก role ที่ไม่ตรงกับตำแหน่ง · อ่านอย่างเดียว
              </Text>
            ) : previewError ? (
              <Alert className="mt-3" type="error" showIcon title={previewError} />
            ) : !pv ? (
              <Skeleton active paragraph={{ rows: 2 }} className="mt-3" />
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                <Alert
                  type="warning" showIcon
                  title={`กำลังดูแบบ ${pv.user.name}${pv.user.is_active ? '' : ' (บัญชีปิดใช้งาน)'}`}
                  description="การ์ดเมนู สรุปวันลา และข้อมูลการทำงานด้านล่างเป็นของบุคคลนี้ — การ์ดกดเข้าไม่ได้ในโหมดนี้"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Text type="secondary" style={{ fontSize: 12 }}>Role ในระบบ:</Text>
                  {pv.roles.length
                    ? pv.roles.map(r => <Tag key={r} color={HR_ROLES.includes(r) ? 'orange' : 'default'} style={{ marginInlineEnd: 0 }}>{r}</Tag>)
                    : <Text type="secondary" style={{ fontSize: 12 }}>ไม่มี</Text>}
                  <Text type="secondary" style={{ fontSize: 12, marginInlineStart: 8 }}>ตำแหน่งในผัง:</Text>
                  {headTitles(pv.approver).length
                    ? headTitles(pv.approver).map(h => <Tag key={h} color="green" style={{ marginInlineEnd: 0 }}>{h}</Tag>)
                    : <Text type="secondary" style={{ fontSize: 12 }}>ไม่ได้เป็นหัวหน้า</Text>}
                </div>
                <Table
                  size="small" pagination={false} rowKey="href" dataSource={accessRows}
                  columns={[
                    {
                      title: 'หน้า', key: 'page',
                      render: (_: unknown, r: typeof accessRows[number]) => (
                        <span><Text strong={r.ok}>{r.label}</Text> <Text type="secondary" style={{ fontSize: 11 }}>{r.href}</Text></span>
                      ),
                    },
                    {
                      title: 'แสดงที่', key: 'where', width: 110,
                      render: (_: unknown, r: typeof accessRows[number]) => <Text type="secondary" style={{ fontSize: 12 }}>{r.where === 'card' ? 'การ์ดหน้านี้' : 'เมนู Navbar'}</Text>,
                    },
                    {
                      title: 'เข้าถึง', key: 'ok', width: 90, align: 'center' as const,
                      render: (_: unknown, r: typeof accessRows[number]) => r.ok
                        ? <CheckCircleFilled style={{ color: '#10b981', fontSize: 16 }} aria-label="เข้าถึงได้" />
                        : <MinusCircleOutlined style={{ color: 'var(--app-text-3)', fontSize: 16 }} aria-label="เข้าไม่ได้" />,
                    },
                    {
                      title: 'ที่มาของสิทธิ์', key: 'reason',
                      render: (_: unknown, r: typeof accessRows[number]) => (
                        <Space size={6} wrap>
                          {r.via === 'role' && (
                            <Tooltip title="ได้จาก role ในระบบ ไม่ใช่จากตำแหน่งในผัง — ตรวจว่าตรงกับหน้าที่จริงไหม">
                              <Tag icon={<WarningFilled />} color="orange" style={{ marginInlineEnd: 0 }}>จาก role</Tag>
                            </Tooltip>
                          )}
                          {r.via === 'head' && <Tag color="green" style={{ marginInlineEnd: 0 }}>จากผัง</Tag>}
                          <Text type={r.ok ? undefined : 'secondary'} style={{ fontSize: 12 }}>{r.reason}</Text>
                        </Space>
                      ),
                    },
                  ]}
                />
              </div>
            )}
          </Card>
        )}

        <LeaveHeader userId={viewing ? viewAs : null} />

        <LeaveOverviewCards override={viewing ? (pv?.overview ?? null) : undefined} />

        {renderLinks(quickLinks)}

        {hrTools.length > 0 && (
          <>
            <div className="flex flex-wrap items-baseline gap-2 mb-3">
              <Text strong style={{ fontSize: 15 }}><ToolOutlined style={{ color: '#047857' }} /> เครื่องมืองานทรัพยากรบุคคล</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>แสดงตามสิทธิ์ของ{viewing ? 'บุคลากรที่เลือก' : 'ท่าน'} ({effRoles.filter(r => HR_ROLES.includes(r)).join(' / ')})</Text>
            </div>
            {renderLinks(hrTools)}
          </>
        )}

        {loadError ? (
          <Card style={{ borderRadius: 12, border: 'none' }}>
            <Empty description={loadError} />
          </Card>
        ) : (
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={14}>
              <Card
                title={<span className="flex items-center gap-2"><NotificationOutlined style={{ color: '#10b981' }} /> {KIND_LABEL.news}</span>}
                style={{ borderRadius: 12, border: 'none' }}
              >
                {!loaded ? <Skeleton active /> : news.length === 0 ? (
                  <Empty description="ยังไม่มีข่าวประชาสัมพันธ์" />
                ) : (
                  <div className="flex flex-col">
                    {news.map((p, i) => (
                      <div key={p.id} style={{ padding: '14px 0', borderTop: i ? '1px solid var(--app-border-strong)' : 'none' }}>
                        <div>{pinTag(p)}<Text strong className="hr-news-text" style={{ fontSize: 16 }}>{p.title}</Text></div>
                        <Text type="secondary" style={{ fontSize: 12 }}>{fmtDate(p.created_at)}</Text>
                        {p.body && (
                          <Paragraph
                            className="hr-news-text"
                            style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}
                            ellipsis={{ rows: 4, expandable: 'collapsible', symbol: (expanded: boolean) => expanded ? 'ย่อ' : 'อ่านต่อ' }}
                          >
                            {p.body}
                          </Paragraph>
                        )}
                        {p.has_file && isImage(p.original_name) && (
                          <a href={fileUrl(p.id)} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element -- รูปมาจาก API ผ่าน cookie ใช้ next/image ไม่ได้ */}
                            <img src={fileUrl(p.id)} alt={p.title} loading="lazy" style={{ display: 'block', maxWidth: '100%', maxHeight: 360, marginTop: 8, borderRadius: 8 }} />
                          </a>
                        )}
                        {attachments(p)}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </Col>

            <Col xs={24} lg={10}>
              <Card
                title={<span className="flex items-center gap-2"><FolderOpenOutlined style={{ color: '#0d9488' }} /> {KIND_LABEL.document}</span>}
                style={{ borderRadius: 12, border: 'none' }}
              >
                {!loaded ? <Skeleton active /> : docGroups.length === 0 ? (
                  <Empty description="ยังไม่มีเอกสาร" />
                ) : (
                  <div className="flex flex-col gap-5">
                    {docGroups.map(([category, items]) => (
                      <div key={category}>
                        <Text strong style={{ color: 'var(--app-text-2)', fontSize: 13 }}>{category}</Text>
                        <div className="flex flex-col mt-1">
                          {items.map(p => (
                            <div key={p.id} className="flex items-start gap-2" style={{ padding: '8px 0', borderTop: '1px solid var(--app-border-strong)' }}>
                              <span style={{ fontSize: 18, lineHeight: '22px' }}>{p.has_file ? fileIcon(p.original_name) : <LinkOutlined />}</span>
                              <div style={{ minWidth: 0 }}>
                                <div>
                                  {pinTag(p)}
                                  {p.has_file || p.link_url ? (
                                    <a href={p.has_file ? fileUrl(p.id) : p.link_url!} target="_blank" rel="noopener noreferrer" className="hr-news-text" style={{ fontSize: 14, lineHeight: 1.6 }}>{p.title}</a>
                                  ) : <Text>{p.title}</Text>}
                                </div>
                                {p.body && <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{p.body}</Text>}
                                <div>
                                  <Text type="secondary" style={{ fontSize: 11 }}>
                                    {fmtDate(p.updated_at)}{p.has_file && p.file_size ? ` · ${fmtSize(p.file_size)}` : ''}
                                    {p.has_file && p.link_url && <> · <a href={p.link_url} target="_blank" rel="noopener noreferrer">ลิงก์</a></>}
                                  </Text>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        )}
      </div>
    </div>
  )
}

export default function HrLeaveHomePage() {
  return (
    <AppThemeProvider colorPrimary="#10b981">
      <HrLeaveHomeContent />
      <HrPopup />
    </AppThemeProvider>
  )
}
