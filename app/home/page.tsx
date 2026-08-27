'use client'
import React, { useState, useEffect, useCallback } from 'react'
import Cookies from 'js-cookie'
import {
  Typography, Card, Row, Col, Badge, Avatar, Progress, Carousel, Tag,
  Button, Drawer, Form, Select, Input, Space, Descriptions, Alert, App,
} from 'antd'
import { AppThemeProvider } from '../components/ThemeProvider'
import {
  BellOutlined, CalendarOutlined,
  UserOutlined, ArrowRightOutlined,
  SendOutlined,
} from '@ant-design/icons'
import {
  FaBed,
  FaBriefcaseMedical, FaDesktop, FaKey, FaMoneyCheckAlt,
  FaHospital, FaBoxes, FaBuilding, FaMoneyBillWave, FaWifi, FaUserShield,
  FaUmbrellaBeach, FaUserClock, FaChevronLeft, FaChevronRight,
  FaCalendarAlt, FaWrench, FaCar, FaUserTie, FaUsers, FaTachometerAlt,
  FaIdCard, FaShieldAlt, FaGift, FaWarehouse, FaClipboardList, FaMicrochip,
  FaUsersCog, FaLock,
} from 'react-icons/fa'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'
import { canSeeMenu, normalizeRoles, isRouteEnabled } from '../lib/menuAccess'
import dayjs from 'dayjs'
import 'dayjs/locale/th'

dayjs.locale('th')

const { Title, Text } = Typography

// ลูกศรซ้าย-ขวาของ carousel (react-slick clone element แล้วส่ง onClick มาให้)
const CarouselArrow = ({ dir, onClick }: { dir: 'prev' | 'next'; onClick?: React.MouseEventHandler }) => (
  <button
    type="button"
    aria-label={dir === 'prev' ? 'ก่อนหน้า' : 'ถัดไป'}
    onClick={onClick}
    className={`home-arrow home-arrow-${dir}`}
  >
    {dir === 'prev' ? <FaChevronLeft /> : <FaChevronRight />}
  </button>
)

// ─── ขอรหัสผู้ใช้งานระบบ (self-service) ────────────────────────────────────────

const USER_REQUEST_KEY = '/information-technology/user-request'

interface SystemOption {
  id: number
  system_code: string
  label: string
  icon_key?: string
  color?: string
}

// map icon_key (จาก backend) → react-icons
const ICON_MAP: Record<string, React.ReactNode> = {
  hospital: <FaHospital />,
  boxes: <FaBoxes />,
  bed: <FaBed />,
  building: <FaBuilding />,
  money: <FaMoneyBillWave />,
  wifi: <FaWifi />,
}

// ─── Data ────────────────────────────────────────────────────────────────────

// ─── เมนูลัด — จัดกลุ่มและคุมการมองเห็นตามสิทธิ์ ─────────────────────────────
// กฎสิทธิ์ส่วนกลางอยู่ที่ app/lib/menuAccess.ts (ชุดเดียวกับเมนูหลักใน Navbar)
// ไทล์ที่ route ยังไม่มีกฎในไฟล์นั้น กำหนด roles เพิ่มได้ที่ตัวไทล์เอง

interface Shortcut {
  key: string          // route ปลายทาง (หรือ USER_REQUEST_KEY = เปิด drawer ขอรหัส)
  icon: React.ReactNode
  label: string
  color: string
  roles?: string[]     // สิทธิ์เฉพาะของไทล์นี้ — ไม่ระบุ = ยึดตาม menuAccess
  supervisor?: boolean // ต้องถูกแต่งตั้งเป็นหัวหน้าหน่วย (ถามจาก backend)
}

interface ShortcutGroup {
  key: string
  title: string
  hint: string
  items: Shortcut[]
}

const ADMIN_ROLES = ['ADMIN', 'CHIEF_GROUP_IT']

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    key: 'self',
    title: 'บริการของฉัน',
    hint: 'ใช้ได้ทุกคน',
    items: [
      { key: '/hr/leave', icon: <FaCalendarAlt />, label: 'ยื่นคำขอลา', color: '#059669' },
      { key: '/information-technology/maintenance', icon: <FaDesktop />, label: 'แจ้งซ่อมคอมพิวเตอร์', color: '#7c3aed' },
      { key: '/general/maintenance-request', icon: <FaWrench />, label: 'แจ้งซ่อมบำรุงทั่วไป', color: '#006a5a' },
      { key: '/general/medical-equipment-repair', icon: <FaBriefcaseMedical />, label: 'แจ้งซ่อมเครื่องมือแพทย์', color: '#0891b2' },
      { key: '/general/vehicle/request', icon: <FaCar />, label: 'ขอใช้รถราชการ', color: '#dc2626' },
      { key: '/general/room-booking', icon: <FaBed />, label: 'ขอห้องพักเจ้าหน้าที่', color: '#d97706' },
      { key: '/accounting/salary', icon: <FaMoneyCheckAlt />, label: 'สลิปเงินเดือน', color: '#22c55e' },
      { key: USER_REQUEST_KEY, icon: <FaKey />, label: 'ขอรหัสผู้ใช้งาน HOSxP ฯลฯ', color: '#2563eb' },
      { key: '/medical-data/statistics-request', icon: <FaHospital />, label: 'ขอข้อมูลทางการแพทย์', color: '#ec4899' },
    ],
  },
  {
    key: 'duty',
    title: 'งานที่ต้องดำเนินการ',
    hint: 'ตามหน้าที่ที่ได้รับมอบหมาย',
    items: [
      { key: '/hr/leave/approval', icon: <FaUserTie />, label: 'อนุมัติคำขอลา', color: '#0ea5e9', supervisor: true },
      { key: '/information-technology/maintenance/manage', icon: <FaWrench />, label: 'จัดการงานซ่อมคอมพิวเตอร์', color: '#7c3aed' },
      { key: '/general/assets/donation-request', icon: <FaGift />, label: 'ขอรับบริจาคครุภัณฑ์', color: '#f43f5e' },
      { key: '/general/assets/donation-review', icon: <FaUserShield />, label: 'พิจารณาอนุมัติบริจาค', color: '#8b5cf6' },
      { key: '/general/assets/donation-registration', icon: <FaWarehouse />, label: 'ขึ้นทะเบียนครุภัณฑ์บริจาค', color: '#0d9488' },
      { key: '/medical-data/statistics-review', icon: <FaClipboardList />, label: 'ตรวจสอบคำขอข้อมูลสถิติ', color: '#ec4899' },
    ],
  },
  {
    key: 'manage',
    title: 'เครื่องมือผู้ดูแล',
    hint: 'เฉพาะผู้ดูแลระบบ / หัวหน้างาน',
    items: [
      { key: '/hr/dashboard', icon: <FaTachometerAlt />, label: 'Dashboard ทรัพยากรบุคคล', color: '#0ea5e9', roles: ['ADMIN', 'HR'] },
      { key: '/hr/users', icon: <FaUsers />, label: 'ทะเบียนบุคลากร', color: '#0891b2', roles: ['ADMIN', 'HR', 'IT_STAFF'] },
      { key: '/hr/leave/policy', icon: <FaClipboardList />, label: 'กำหนดสิทธิ์การลา', color: '#f59e0b' },
      { key: '/hr/leave/balance', icon: <FaUmbrellaBeach />, label: 'วันลาสะสม', color: '#14b8a6' },
      { key: '/accounting/salary-ids', icon: <FaIdCard />, label: 'เลขที่เงินเดือนบุคลากร', color: '#22c55e' },
      { key: '/information-technology/hait', icon: <FaMicrochip />, label: 'ภาพรวม HAIT', color: '#6366f1' },
      { key: '/account/user-credentials', icon: <FaLock />, label: 'จัดการบัญชีผู้ใช้บุคลากร', color: '#64748b', roles: ['ADMIN', 'IT_STAFF'] },
      { key: '/account/roles', icon: <FaUsersCog />, label: 'จัดการสิทธิ์การใช้งาน', color: '#a855f7', roles: ADMIN_ROLES },
      { key: '/account/mfa', icon: <FaShieldAlt />, label: 'ยืนยันตัวตนสองชั้น (MFA)', color: '#ef4444', roles: ['ADMIN'] },
    ],
  },
]


// ประกาศ/ข่าวสาร (mock — ต่อ API ภายหลังได้)
interface Announcement {
  id: number
  title: string
  desc: string
  tag: string
  date: string
  gradient: string
  image?: string
  link?: string
}
const announcements: Announcement[] = [
  {
    id: 1,
    title: 'อบรม HAIT ประจำปี 2569',
    desc: 'ขอเชิญบุคลากรทุกท่านเข้าร่วมอบรมความปลอดภัยสารสนเทศ วันที่ 25 มิ.ย. 2569 ณ ห้องประชุมใหญ่ ชั้น 5',
    tag: 'อบรม',
    date: '20 มิ.ย. 2569',
    gradient: 'linear-gradient(135deg, #0f766e 0%, #0891b2 100%)',
    image: 'https://images.unsplash.com/photo-1641757625075-d018760a4fb5?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    link: '/information-technology/hait',
  },
  {
    id: 3,
    title: 'เปิดรับคำขอวันลาพักผ่อนประจำปี',
    desc: 'บุคลากรสามารถยื่นคำขอลาพักผ่อนผ่านระบบออนไลน์ได้แล้ววันนี้ ตรวจสอบวันคงเหลือและยื่นได้ทันที',
    tag: 'ข่าวสาร',
    date: '15 มิ.ย. 2569',
    gradient: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)',
    image: 'https://images.unsplash.com/photo-1602088113235-229c19758e9f?q=80&w=1167&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    link: '/hr/leave',
  },
]

// แผนโครงการ (mock — ต่อ API ภายหลังได้)
interface ProjectPlan {
  id: number
  name: string
  owner: string
  status: 'ดำเนินการ' | 'รออนุมัติ' | 'เสร็จสิ้น'
  progress: number
  due: string
  color: string
  image?: string
}
const projectPlans: ProjectPlan[] = [
  { id: 1, name: 'พัฒนาระบบสารสนเทศโรงพยาบาล (HIS) ระยะที่ 2', owner: 'กลุ่มงานสุขภาพดิจิทัล', status: 'ดำเนินการ', progress: 65, due: '30 ก.ย. 2569', color: '#0ea5e9', image: 'https://images.unsplash.com/photo-1529119368496-2dfda6ec2804?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
  { id: 2, name: 'ปรับปรุงโครงข่าย LAN อาคารผู้ป่วยนอก', owner: 'งานเทคโนโลยีสารสนเทศ', status: 'ดำเนินการ', progress: 40, due: '15 ส.ค. 2569', color: '#7c3aed', image: 'https://images.unsplash.com/photo-1682559736721-c2e77ff4c650?q=80&w=1711&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
]
const PROJECT_STATUS_COLOR: Record<ProjectPlan['status'], string> = {
  'ดำเนินการ': 'processing',
  'รออนุมัติ': 'warning',
  'เสร็จสิ้น': 'success',
}

// สรุปวันลา (mock — ต่อ API ภายหลังได้)
interface LeaveBalance {
  key: string
  label: string
  icon: React.ReactNode
  color: string
  used: number
  total: number
}
const leaveBalances: LeaveBalance[] = [
  { key: 'annual', label: 'ลาพักผ่อน', icon: <FaUmbrellaBeach />, color: '#0ea5e9', used: 4, total: 10 },
  { key: 'personal', label: 'ลากิจส่วนตัว', icon: <FaUserClock />, color: '#f59e0b', used: 3, total: 45 },
  { key: 'sick', label: 'ลาป่วย', icon: <FaBriefcaseMedical />, color: '#ef4444', used: 2, total: 60 },
]

const notifications = [
  { id: 1, message: 'งานซ่อมเครื่องปรับอากาศ OPD 2 อัปเดตสถานะ', read: false, time: '5 นาทีที่แล้ว' },
  { id: 2, message: 'คำขอลาของคุณได้รับการอนุมัติแล้ว', read: false, time: '1 ชม. ที่แล้ว' },
  { id: 3, message: 'มีใบสั่งงานซ่อมใหม่ 2 รายการ', read: true, time: '3 ชม. ที่แล้ว' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Profile {
  id?: number
  name: string
  position: string
  department: string
  phone?: string
}

const PageContent = () => {
  const router = useRouter()
  const { message } = App.useApp()
  const [currentTime, setCurrentTime] = useState(dayjs())
  const [user, setUser] = useState<Profile>({ name: '', position: '', department: '' })

  // สิทธิ์สำหรับกรองเมนูลัด — role มาจาก cookie, สิทธิ์อนุมัติการลามาจากการแต่งตั้ง (ถาม backend)
  // null = ยังไม่รู้ผล ซ่อนไทล์ไว้ก่อน กันเมนูกะพริบให้คนที่ไม่มีสิทธิ์เห็น
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [isLeaveApprover, setIsLeaveApprover] = useState<boolean | null>(null)

  useEffect(() => {
    const raw = Cookies.get('user_data')
    if (!raw) { router.replace('/'); return }
    const data = JSON.parse(raw)
    setUser({
      id: data.id,
      name: data.name ?? '',
      position: data.position_name ?? '',
      department: data.mission_name ?? data.major_name ?? '',
      phone: data.phone ?? '',
    })
    setUserRoles(normalizeRoles(data.roles))
  }, [])

  // โมดูลที่ผู้ดูแลระบบปิดการมองเห็นไว้ (route_prefix)
  const [disabledModules, setDisabledModules] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/v1/hr/leave-approver-check')
      .then(r => r.json())
      .then(j => setIsLeaveApprover(j?.success ? !!j.data?.is_approver : false))
      .catch(() => setIsLeaveApprover(false))
    fetch('/api/v1/modules/disabled')
      .then(r => r.json())
      .then(j => setDisabledModules(j?.success ? (j.data?.disabled ?? []) : []))
      .catch(() => setDisabledModules([]))
  }, [])

  // กรองไทล์ตามสิทธิ์ แล้วตัดกลุ่มที่ไม่เหลือไทล์ทิ้ง
  const visibleGroups = SHORTCUT_GROUPS
    .map(g => ({
      ...g,
      items: g.items.filter(it => {
        if (!isRouteEnabled(it.key, disabledModules)) return false
        if (it.supervisor) return isLeaveApprover === true
        if (it.roles) return it.roles.some(r => userRoles.includes(r))
        return canSeeMenu(it.key, userRoles, isLeaveApprover, disabledModules)
      }),
    }))
    .filter(g => g.items.length > 0)

  // ── ขอรหัสผู้ใช้งานระบบ (drawer) ──
  const [reqOpen, setReqOpen] = useState(false)
  const [reqForm] = Form.useForm()
  const [systems, setSystems] = useState<SystemOption[]>([])
  const [systemsLoading, setSystemsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadSystems = useCallback(async () => {
    setSystemsLoading(true)
    try {
      const res = await fetch('/api/v1/it/user-requests/systems')
      const data = await res.json()
      const arr = (data?.data ?? []) as Array<Record<string, unknown>>
      setSystems(arr.map(s => ({
        id: Number(s.id),
        system_code: String(s.system_code ?? ''),
        label: String(s.label ?? s.name_th ?? s.system_code ?? ''),
        icon_key: s.icon_key as string | undefined,
        color: s.color as string | undefined,
      })))
    } catch {
      message.error('โหลดรายการระบบไม่สำเร็จ')
    } finally {
      setSystemsLoading(false)
    }
  }, [message])

  const openRequest = () => {
    reqForm.resetFields()
    setReqOpen(true)
    if (systems.length === 0) void loadSystems()
  }

  const submitRequest = () => {
    reqForm.validateFields().then(async values => {
      if (!user.id) { message.error('ไม่พบข้อมูลผู้ใช้ — กรุณาเข้าสู่ระบบใหม่'); return }
      setSubmitting(true)
      try {
        const res = await fetch('/api/v1/it/user-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requester_user_id: user.id,
            requester_name: user.name,
            position_name: user.position || null,
            department: user.department || null,
            phone: values.phone || user.phone || null,
            system_id: values.system_id,
            purpose: values.purpose || null,
          }),
        })
        const data = await res.json()
        if (!res.ok || data?.success === false) {
          message.error(data?.error?.message || 'ส่งคำขอไม่สำเร็จ')
          return
        }
        message.success('ส่งคำขอรหัสผู้ใช้งานเรียบร้อยแล้ว — เจ้าหน้าที่ไอทีจะดำเนินการออกรหัสให้')
        setReqOpen(false)
      } catch {
        message.error('เกิดข้อผิดพลาดในการเชื่อมต่อ')
      } finally {
        setSubmitting(false)
      }
    })
  }

  const systemSelectOptions = systems.map(s => ({
    value: s.id,
    label: (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: s.color, display: 'inline-flex' }}>{ICON_MAP[s.icon_key ?? '']}</span>
        {s.label}
      </span>
    ),
  }))

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(dayjs()), 60000)
    return () => clearInterval(timer)
  }, [])

  const greeting = (() => {
    const h = currentTime.hour()
    if (h < 12) return 'สวัสดีตอนเช้า'
    if (h < 17) return 'สวัสดีตอนบ่าย'
    return 'สวัสดีตอนเย็น'
  })()

  const unread = notifications.filter(n => !n.read).length

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--app-bg)' }}>
      <Navbar />
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '24px 20px 48px' }}>

        {/* ── Hero ── */}
        <div
          style={{
            borderRadius: 20,
            background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)',
            padding: '28px 32px',
            marginBottom: 24,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* decorative circles */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ position: 'absolute', bottom: -60, right: 80, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />

          <Row gutter={[24, 16]} align="middle">
            <Col xs={24} md={16}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                <Avatar
                  size={60}
                  icon={<UserOutlined />}
                  style={{ background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }}
                />
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 2 }}>{greeting}</div>
                  <Title level={3} style={{ color: '#fff', margin: 0, lineHeight: 1.2 }}>{user.name || '—'}</Title>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
                    {user.position}{user.position && user.department ? ' · ' : ''}{user.department}
                  </Text>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>
                <CalendarOutlined />
                <span>{currentTime.format('วันdddd ที่ D MMMM BBBB')} &nbsp;|&nbsp; {currentTime.format('HH:mm น.')}</span>
              </div>
            </Col>
            <Col xs={24} md={8} style={{ textAlign: 'right' }}>
              <Badge count={unread} size="default" offset={[-4, 4]}>
                <Button
                  shape="circle"
                  size="large"
                  icon={<BellOutlined style={{ color: '#fff', fontSize: 18 }} />}
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', width: 48, height: 48 }}
                />
              </Badge>
              {unread > 0 && (
                <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                  การแจ้งเตือนใหม่ <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{unread}</span> รายการ
                </div>
              )}
            </Col>
          </Row>
        </div>

        {/* ── ประกาศ / ข่าวสาร (carousel) ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ color: 'var(--app-text-2)', fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              ประกาศ / ข่าวสาร · แผนโครงการ
            </Text>
          </div>
          <Carousel
            autoplay
            autoplaySpeed={5000}
            draggable
            arrows
            prevArrow={<CarouselArrow dir="prev" />}
            nextArrow={<CarouselArrow dir="next" />}
            className="home-carousel"
            dots={{ className: 'home-news-dots' }}
            style={{ borderRadius: 20, overflow: 'hidden' }}
          >
            {announcements.map((n) => (
              <div key={n.id}>
                <div
                  onClick={() => n.link && router.push(n.link)}
                  style={{
                    position: 'relative',
                    minHeight: 220,
                    background: n.image
                      ? `linear-gradient(90deg, rgba(2,6,23,0.85) 0%, rgba(2,6,23,0.55) 55%, rgba(2,6,23,0.25) 100%), url(${n.image}) center/cover no-repeat`
                      : n.gradient,
                    padding: '32px 64px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    cursor: n.link ? 'pointer' : 'default',
                    overflow: 'hidden',
                  }}
                >
                  {/* decorative circles */}
                  <div style={{ position: 'absolute', top: -50, right: -30, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                  <div style={{ position: 'absolute', bottom: -70, right: 120, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

                  <div style={{ position: 'relative', maxWidth: 680 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <Tag style={{ margin: 0, borderRadius: 999, border: 'none', background: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 600, padding: '2px 12px' }}>
                        {n.tag}
                      </Tag>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
                        <CalendarOutlined /> {n.date}
                      </span>
                    </div>
                    <Title level={3} style={{ color: '#fff', margin: '0 0 10px', lineHeight: 1.25 }}>{n.title}</Title>
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 1.6 }}>{n.desc}</Text>
                    {n.link && (
                      <div style={{ marginTop: 16 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fff', fontWeight: 600, fontSize: 13 }}>
                          อ่านเพิ่มเติม <ArrowRightOutlined />
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {projectPlans.map((p) => (
              <div key={`proj-${p.id}`}>
                <div
                  onClick={() => router.push('/hss/strategy')}
                  style={{
                    position: 'relative',
                    minHeight: 220,
                    background: p.image
                      ? `linear-gradient(90deg, rgba(2,6,23,0.88) 0%, rgba(2,6,23,0.6) 55%, rgba(2,6,23,0.35) 100%), url(${p.image}) center/cover no-repeat`
                      : `linear-gradient(135deg, #0f172a 0%, ${p.color}33 100%)`,
                    padding: '32px 64px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden',
                  }}
                >
                  {/* decorative circles */}
                  <div style={{ position: 'absolute', top: -50, right: -30, width: 220, height: 220, borderRadius: '50%', background: `${p.color}22` }} />
                  <div style={{ position: 'absolute', bottom: -70, right: 120, width: 180, height: 180, borderRadius: '50%', background: `${p.color}1a` }} />

                  <div style={{ position: 'relative', maxWidth: 680 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <Tag style={{ margin: 0, borderRadius: 999, border: 'none', background: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 600, padding: '2px 12px' }}>
                        แผนโครงการ
                      </Tag>
                      <Tag color={PROJECT_STATUS_COLOR[p.status]} style={{ margin: 0, borderRadius: 999 }}>
                        {p.status}
                      </Tag>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
                        <CalendarOutlined /> ครบกำหนด {p.due}
                      </span>
                    </div>
                    <Title level={3} style={{ color: '#fff', margin: '0 0 6px', lineHeight: 1.25 }}>{p.name}</Title>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{p.owner}</Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, maxWidth: 460 }}>
                      <Progress
                        percent={p.progress}
                        showInfo={false}
                        size="small"
                        strokeColor="#fff"
                        style={{ flex: 1, margin: 0 }}
                      />
                      <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', width: 56, textAlign: 'right' }}>{p.progress}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </Carousel>
        </div>

        {/* ── เมนูลัด (แสดงตามสิทธิ์) ── */}
        {visibleGroups.map((g) => (
          <div key={g.key} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <Text style={{ color: 'var(--app-text-2)', fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {g.title}
              </Text>
              <Tag style={{ margin: 0, borderRadius: 999, fontSize: 11, border: '1px solid var(--app-border)', background: 'transparent', color: 'var(--app-text-3)' }}>
                {g.hint}
              </Tag>
            </div>
            <Row gutter={[12, 12]}>
              {g.items.map((a) => (
                <Col xs={12} sm={8} md={6} lg={3} key={a.key}>
                  <Card
                    onClick={() => a.key === USER_REQUEST_KEY ? openRequest() : router.push(a.key)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = `0 8px 24px ${a.color}55`
                      e.currentTarget.style.borderColor = a.color
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none'
                      e.currentTarget.style.borderColor = 'var(--app-border)'
                      e.currentTarget.style.transform = 'none'
                    }}
                    style={{ borderRadius: 14, border: '1px solid var(--app-border)', background: 'var(--app-surface)', cursor: 'pointer', textAlign: 'center', height: '100%', transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.2s' }}
                    styles={{ body: { padding: '18px 8px' } }}
                  >
                    <div
                      style={{
                        width: 48, height: 48, borderRadius: 12, margin: '0 auto 10px',
                        background: `${a.color}20`, color: a.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                      }}
                    >
                      {a.icon}
                    </div>
                    <Text style={{ fontSize: 12, fontWeight: 500, color: 'var(--app-text-2)', lineHeight: 1.3 }}>{a.label}</Text>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        ))}

        {/* ── สรุปวันลาของฉัน ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ color: 'var(--app-text-2)', fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              สรุปวันลาของฉัน · ปี {currentTime.format('BBBB')}
            </Text>
            <Button
              type="link"
              size="small"
              icon={<ArrowRightOutlined />}
              style={{ color: 'var(--app-text-3)', fontSize: 12 }}
              onClick={() => router.push('/hr/leave')}
            >
              ดูประวัติการลา
            </Button>
          </div>
          <Row gutter={[16, 16]}>
            {leaveBalances.map((lv) => {
              const remaining = Math.max(lv.total - lv.used, 0)
              const pct = lv.total > 0 ? Math.round((lv.used / lv.total) * 100) : 0
              return (
                <Col xs={24} sm={8} key={lv.key}>
                  <Card
                    style={{ borderRadius: 16, border: '1px solid var(--app-border)', background: 'var(--app-surface)', height: '100%' }}
                    styles={{ body: { padding: 20 } }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div
                        style={{
                          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                          background: `${lv.color}20`, color: lv.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                        }}
                      >
                        {lv.icon}
                      </div>
                      <div style={{ lineHeight: 1.2 }}>
                        <div style={{ color: 'var(--app-text)', fontSize: 15, fontWeight: 600 }}>{lv.label}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>ใช้ไป {lv.used} จาก {lv.total} วัน</Text>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                      <span style={{ fontSize: 32, fontWeight: 800, color: lv.color, lineHeight: 1 }}>{remaining}</span>
                      <Text type="secondary" style={{ fontSize: 13 }}>วันคงเหลือ</Text>
                    </div>
                    <Progress
                      percent={pct}
                      showInfo={false}
                      size="small"
                      strokeColor={lv.color}
                    />
                  </Card>
                </Col>
              )
            })}
          </Row>
        </div>
      </div>

      {/* ─── Drawer: ขอรหัสผู้ใช้งานระบบ ─── */}
      <Drawer
        title={
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-lg"
              style={{ width: 36, height: 36, backgroundColor: '#2563eb20', color: '#2563eb' }}
            >
              <FaUserShield />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>ขอรหัสผู้ใช้งานระบบ</div>
              <Text type="secondary" style={{ fontSize: 12 }}>HOSxP, Inventory, IPD CHART ฯลฯ</Text>
            </div>
          </div>
        }
        size="large"
        open={reqOpen}
        onClose={() => setReqOpen(false)}
        styles={{ body: { paddingBottom: 80 } }}
        extra={
          <Space>
            <Button onClick={() => setReqOpen(false)}>ยกเลิก</Button>
            <Button type="primary" icon={<SendOutlined />} loading={submitting} onClick={submitRequest}>
              ส่งคำขอ
            </Button>
          </Space>
        }
      >
        <Alert
          type="info"
          showIcon
          className="mb-4"
          title="คำขอจะถูกส่งให้เจ้าหน้าที่ไอที"
          description="หลังตรวจสอบ เจ้าหน้าที่จะออกรหัสและส่ง username / password ให้ผ่านหมอพร้อม"
        />

        <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--app-text-3)' }}>
          ผู้ขอ
        </div>
        <Card
          variant="borderless"
          className="rounded-xl mb-4"
          styles={{ body: { padding: 16 } }}
          style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <Avatar size={48} style={{ backgroundColor: '#2563eb' }} icon={<UserOutlined />} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{user.name || '-'}</div>
              <Text type="secondary" style={{ fontSize: 13 }}>{user.position || '-'}</Text>
            </div>
          </div>
          <Descriptions column={1} size="small" styles={{ label: { width: 90 } }}>
            <Descriptions.Item label="หน่วยงาน">{user.department || '-'}</Descriptions.Item>
          </Descriptions>
        </Card>

        <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--app-text-3)' }}>
          รายละเอียดคำขอ
        </div>
        <Form form={reqForm} layout="vertical" requiredMark="optional" initialValues={{ phone: user.phone }}>
          <Form.Item name="system_id" label="ระบบที่ขอใช้งาน" rules={[{ required: true, message: 'กรุณาเลือกระบบ' }]}>
            <Select
              options={systemSelectOptions}
              optionLabelProp="label"
              allowClear
              loading={systemsLoading}
              placeholder="เลือกระบบที่ต้องการขอรหัส"
            />
          </Form.Item>
          <Form.Item name="phone" label="เบอร์โทรติดต่อ">
            <Input placeholder="เบอร์โทรสำหรับติดต่อกลับ" />
          </Form.Item>
          <Form.Item name="purpose" label="วัตถุประสงค์ / เหตุผลที่ขอใช้งาน">
            <Input.TextArea rows={3} placeholder="เช่น เริ่มงานใหม่ / ต้องใช้บันทึกข้อมูลผู้ป่วย" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}

export default function Page() {
  return (
    <AppThemeProvider colorPrimary="#006a5a">
      <PageContent />
    </AppThemeProvider>
  )
}
