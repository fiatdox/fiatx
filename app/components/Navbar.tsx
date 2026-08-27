'use client'
import React, { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Layout, Button, Drawer, Typography, Avatar, Menu, Space, Divider, ConfigProvider, Alert } from 'antd'
import Cookies from 'js-cookie'
import {
  MenuOutlined,
  UserOutlined,
  HomeOutlined,
  FileTextOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
  SunOutlined,
  MoonOutlined,
  HistoryOutlined
} from '@ant-design/icons'
import { useThemeMode } from './ThemeProvider'
import {
  FaCalendarAlt, FaUserClock, FaBed, FaCar, FaTruck, FaWrench, FaBriefcaseMedical,
  FaChartBar, FaGraduationCap, FaDesktop, FaUserShield, FaFileInvoiceDollar,
  FaUsers, FaUserTie, FaLock, FaUsersCog, FaBuilding, FaHospitalSymbol, FaMicrochip, FaCalculator,
  FaClipboardList, FaExclamationTriangle, FaTasks, FaNetworkWired,
  FaShoppingCart, FaFileAlt, FaTachometerAlt, FaHistory,
  FaWarehouse, FaExchangeAlt, FaQrcode,
  FaCoins, FaGift, FaShieldAlt, FaIdCard, FaUserLock, FaToggleOn
} from 'react-icons/fa'
import { canSeeMenu, normalizeRoles } from '../lib/menuAccess'

const { Header } = Layout
const { Title, Text } = Typography

// เมนูลัด "บริการของฉัน" ชี้ไป route เดียวกับกลุ่มหน่วยงานด้านล่าง จึงต้องมี key ไม่ซ้ำ
const FAV_PREFIX = 'fav:'
const toRoute = (key: string) => key.startsWith(FAV_PREFIX) ? key.slice(FAV_PREFIX.length) : key

interface UserData {
  name?: string
  position_name?: string
  major_name?: string
  roles?: string[]
}

const Navbar: React.FC = () => {
  const [openMenu, setOpenMenu] = useState(false)
  const [openProfile, setOpenProfile] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  // กาง "บริการของฉัน" ไว้ตั้งแต่แรก — เป็นกลุ่มที่ทุกคนใช้ ไม่ควรต้องกดเปิดเอง
  const [openKeys, setOpenKeys] = useState<string[]>(['my-services'])
  const [userData, setUserData] = useState<UserData>({})
  const { mode, toggle } = useThemeMode()

  // สิทธิ์อนุมัติการลา — ไม่ได้มาจาก role แต่มาจากการถูกแต่งตั้งเป็นหัวหน้าหน่วย จึงต้องถาม backend
  // null = ยังไม่รู้ผล (ซ่อนเมนูไว้ก่อน กันเมนูกะพริบให้คนที่ไม่มีสิทธิ์เห็น)
  const [isLeaveApprover, setIsLeaveApprover] = useState<boolean | null>(null)

  // สถานะอายุรหัสผ่าน — null = ปิดนโยบาย/ยังไม่รู้ผล
  type PwdStatus = {
    expired: boolean; shouldWarn: boolean
    ageDays: number | null; daysLeft: number | null; changedAt: string | null
    policy_enabled: boolean; expiry_days: number
  }
  const [pwdStatus, setPwdStatus] = useState<PwdStatus | null>(null)
  const [pwdBannerClosed, setPwdBannerClosed] = useState(false)

  // สถานะชื่อผู้ใช้ — username ที่เป็นเลขบัตรประชาชน
  type UnameStatus = { weak: boolean; warn: boolean; required: boolean; mode: string; username: string }
  const [unameStatus, setUnameStatus] = useState<UnameStatus | null>(null)
  const [unameBannerClosed, setUnameBannerClosed] = useState(false)

  // โมดูลที่ผู้ดูแลระบบปิดการมองเห็นไว้ (route_prefix)
  const [disabledModules, setDisabledModules] = useState<string[]>([])

  useEffect(() => {
    const raw = Cookies.get('user_data')
    if (raw) {
      try { setUserData(JSON.parse(raw)) } catch { /* ignore */ }
    }
    fetch('/api/v1/hr/leave-approver-check')
      .then(r => r.json())
      .then(j => setIsLeaveApprover(j?.success ? !!j.data?.is_approver : false))
      .catch(() => setIsLeaveApprover(false))
  }, [])

  // ถามใหม่ทุกครั้งที่เปลี่ยนหน้า เพื่อให้เมนูอัปเดตทันทีหลังผู้ดูแลระบบสลับสวิตช์
  // (ฝั่ง server แคชไว้ 30 วินาที จึงไม่ได้ยิง DB จริงทุกครั้ง)
  useEffect(() => {
    fetch('/api/v1/modules/disabled')
      .then(r => r.json())
      .then(j => setDisabledModules(j?.success ? (j.data?.disabled ?? []) : []))
      .catch(() => setDisabledModules([]))
  }, [pathname])

  // นโยบายอายุรหัสผ่าน — แจ้งเตือนอย่างเดียว ใช้งานระบบได้ตามปกติ
  // คำนวณจากวันที่เปลี่ยนรหัสล่าสุด (ถามใหม่ทุกครั้งที่เปลี่ยนหน้า เพื่อให้หายทันทีหลังเปลี่ยนรหัส)
  useEffect(() => {
    fetch('/api/v1/users/me/password-status')
      .then(r => r.json())
      .then(j => setPwdStatus(j?.success ? j.data : null))
      .catch(() => setPwdStatus(null))
  }, [pathname])

  // นโยบายชื่อผู้ใช้ — โหมด force จะพาไปหน้าตั้งชื่อใหม่ (backend ก็ปิดกั้น API ไว้อีกชั้น)
  useEffect(() => {
    if (pathname === '/account/change-username') return
    fetch('/api/v1/users/me/username-status')
      .then(r => r.json())
      .then(j => {
        const d = j?.success ? j.data : null
        setUnameStatus(d)
        if (d?.required) router.replace('/account/change-username')
      })
      .catch(() => setUnameStatus(null))
  }, [pathname, router])

  // ── สิทธิ์การมองเห็นเมนู ────────────────────────────────────────────────
  // กฎทั้งหมดอยู่ที่ app/lib/menuAccess.ts — ใช้ร่วมกับเมนูลัดหน้าหลัก
  const userRoles = normalizeRoles(userData.roles)

  // กรองต้นไม้เมนูตามสิทธิ์ — leaf ตัดตาม canSeeMenu, กลุ่มที่ไม่เหลือลูกให้ตัดทิ้ง
  // ใช้ any ที่ขอบ antd (โครงสร้าง items แต่ละอันไม่เหมือนกัน) — คืนค่าให้ Menu รับได้เหมือนเดิม
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filterMenuByRole = (items: any[]): any[] =>
    items.reduce((acc: any[], item: any) => {
      if (item.children) {
        const kids = filterMenuByRole(item.children)
        if (kids.length > 0) acc.push({ ...item, children: kids })
      } else if (canSeeMenu(toRoute(item.key), userRoles, isLeaveApprover, disabledModules)) {
        acc.push(item)
      }
      return acc
    }, [])

  // กางเมนูหลักและ submenu ที่ซ้อนอยู่อัตโนมัติตาม URL ปัจจุบัน
  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean)
    const keys: string[] = []

    if (segments[0]) keys.push(segments[0]) // เมนูหลัก เช่น 'general', 'information-technology'

    // submenu การลา
    if (segments[0] === 'hr' && segments[1] === 'leave') {
      keys.push('hr-leave')
    }

    // submenu รถราชการ
    if (segments[0] === 'general' && segments[1] === 'vehicle') {
      keys.push('general-vehicle')
    }

    // submenu ระบบซ่อมบำรุง
    if (segments[0] === 'general' && segments[1] === 'maintenance') {
      keys.push('general-maintenance')
    }

    // submenu ขอย้ายสิ่งของ / จัดสถานที่
    if (segments[0] === 'general' && segments[1] === 'item-moving') {
      keys.push('general-item-moving')
    }

    // submenu ระบบครุภัณฑ์
    if (segments[0] === 'general' && segments[1] === 'assets') {
      keys.push('general-assets')
    }

    // submenu งานพัสดุ
    if (segments[0] === 'general' && segments[1] === 'procurement') {
      keys.push('general-procurement')
    }

    // submenu IT Maintenance
    if (segments[0] === 'information-technology' && segments[1] === 'maintenance') {
      keys.push('it-maintenance')
    }

    // submenu HAIT
    if (segments[0] === 'information-technology' && segments[1] === 'hait') {
      keys.push('it-hait')
    }

    // submenu Smart Hospital
    if (segments[0] === 'information-technology' && segments[1] === 'smart-hospital') {
      keys.push('it-smart-hospital')
    }

    // submenu HSS Strategy
    if (segments[0] === 'hss') {
      keys.push('HSS-DS')
      if (segments[1] === 'strategy') keys.push('hss-strategy-group')
    }

    setOpenKeys((prev) => Array.from(new Set([...prev, ...keys])))
  }, [pathname])

  // Theme — เข้ากับหน้า Login (emerald/teal บนพื้น slate-950)
  // ลายดาวพื้นหลัง (โปร่งใสมากขึ้นเพื่อให้เข้ากับธีมมืด)
  const starPattern = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cg fill='white' fill-opacity='0.05'%3E%3Cpath d='M10 0L13 7h7l-5 5 2 8-7-5-7 5 2-8-5-5h7z' transform='translate(20,40) rotate(15) scale(1.2)'/%3E%3Cpath d='M10 0L13 7h7l-5 5 2 8-7-5-7 5 2-8-5-5h7z' transform='translate(120,30) rotate(-25) scale(0.8)'/%3E%3Cpath d='M10 0L13 7h7l-5 5 2 8-7-5-7 5 2-8-5-5h7z' transform='translate(180,90) rotate(45) scale(1.5)'/%3E%3Cpath d='M10 0L13 7h7l-5 5 2 8-7-5-7 5 2-8-5-5h7z' transform='translate(40,160) rotate(-10) scale(0.6)'/%3E%3Cpath d='M10 0L13 7h7l-5 5 2 8-7-5-7 5 2-8-5-5h7z' transform='translate(130,180) rotate(60) scale(1.1)'/%3E%3Cpath d='M10 0L13 7h7l-5 5 2 8-7-5-7 5 2-8-5-5h7z' transform='translate(210,190) rotate(-40) scale(0.9)'/%3E%3C/g%3E%3C/svg%3E")`

  // Gradient หลัก (slate-950 → emerald-950 → teal-600) — สอดคล้องกับ blob ที่หน้า Login
  const headerGradient = 'linear-gradient(90deg, #020617 0%, #0f172a 30%, #064e3b 75%, #0d9488 110%)'
  const drawerGradient = 'linear-gradient(180deg, #020617 0%, #0b1220 25%, #052e2b 70%, #0d9488 100%)'

  return (
    <>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: `${starPattern}, ${headerGradient}`,
          backgroundBlendMode: 'overlay, normal',
          height: 64,
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
          borderBottom: '1px solid rgba(16, 185, 129, 0.15)'
        }}
      >
        {/* Left Side: Hamburger & App Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button
            type="text"
            icon={<MenuOutlined style={{ fontSize: '20px', color: '#fff' }} />}
            onClick={() => setOpenMenu(true)}
            style={{ width: 40, height: 40 }}
          />
          <Typography.Text
            strong
            onClick={() => router.push('/home')}
            style={{
              color: '#fff',
              fontSize: '1.25rem',
              margin: 0,
              letterSpacing: '0.02em',
              textShadow: '0 0 12px rgba(16, 185, 129, 0.45)',
              cursor: 'pointer'
            }}
          >
            PYHOS-EXP
          </Typography.Text>
        </div>

        {/* Right Side: Theme toggle & User Icon */}
        <Space size="middle">
          <Button
            type="text"
            aria-label={mode === 'dark' ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'}
            title={mode === 'dark' ? 'โหมดสว่าง' : 'โหมดมืด'}
            icon={mode === 'dark'
              ? <SunOutlined style={{ fontSize: '20px', color: '#fde68a' }} />
              : <MoonOutlined style={{ fontSize: '20px', color: '#fff' }} />}
            onClick={toggle}
            style={{ width: 40, height: 40 }}
          />
          <Button
            type="text"
            icon={<UserOutlined style={{ fontSize: '20px', color: '#fff' }} />}
            onClick={() => setOpenProfile(true)}
            style={{ width: 40, height: 40 }}
          />
        </Space>
      </Header>

      {/* แถบเตือนอายุรหัสผ่าน — เตือนอย่างเดียว ไม่ปิดกั้นการใช้งาน */}
      {pwdStatus?.policy_enabled && !pwdBannerClosed && (pwdStatus.expired || pwdStatus.shouldWarn)
        && pathname !== '/account/change-password' && (
        <Alert
          type={pwdStatus.expired ? 'warning' : 'info'}
          showIcon
          banner
          closable
          onClose={() => setPwdBannerClosed(true)}
          title={
            pwdStatus.expired
              ? `รหัสผ่านของท่านใช้งานมาแล้ว ${pwdStatus.ageDays ?? 0} วัน (นโยบายกำหนด ${pwdStatus.expiry_days} วัน) — ควรเปลี่ยนรหัสผ่าน`
              : `รหัสผ่านของท่านจะครบกำหนดเปลี่ยนในอีก ${pwdStatus.daysLeft} วัน`
          }
          action={
            <Button size="small" type="primary" onClick={() => router.push('/account/change-password')}>
              เปลี่ยนรหัสผ่าน
            </Button>
          }
        />
      )}

      {/* แถบเตือนชื่อผู้ใช้เป็นเลขบัตรประชาชน (โหมด warn — โหมด force จะถูกพาไปหน้าตั้งชื่อใหม่แทน) */}
      {unameStatus?.warn && !unameBannerClosed && pathname !== '/account/change-username' && (
        <Alert
          type="warning"
          showIcon
          banner
          closable
          onClose={() => setUnameBannerClosed(true)}
          title="ชื่อผู้ใช้ของท่านคือเลขบัตรประชาชน — ควรเปลี่ยนเพื่อความปลอดภัยของบัญชี"
          action={
            <Button size="small" type="primary" onClick={() => router.push('/account/change-username')}>
              ตั้งชื่อผู้ใช้ใหม่
            </Button>
          }
        />
      )}

      {/* Left Drawer: Main Navigation */}
      <ConfigProvider
        theme={{
          components: {
            Drawer: {
              colorBgElevated: 'transparent',
              colorIcon: '#fff',
              colorIconHover: 'rgba(16, 185, 129, 0.9)',
            },
            Menu: {
              itemBg: 'transparent',
              subMenuItemBg: 'rgba(2, 6, 23, 0.45)',
              itemColor: 'rgba(226, 232, 240, 0.85)',
              itemHoverColor: '#6ee7b7',
              itemHoverBg: 'rgba(16, 185, 129, 0.12)',
              itemSelectedColor: '#fff',
              itemSelectedBg: 'rgba(16, 185, 129, 0.25)',
              itemActiveBg: 'rgba(16, 185, 129, 0.3)',
            }
          },
          token: {
            colorPrimary: '#10b981',
          }
        }}
      >
        <Drawer
          title={<span style={{ color: '#fff', fontWeight: 600, letterSpacing: '0.02em' }}>เมนูหลัก</span>}
          placement="left"
          onClose={() => setOpenMenu(false)}
          open={openMenu}
          size="default"
            styles={{
              body: { padding: '16px 0' },
              header: { borderBottom: '1px solid rgba(16, 185, 129, 0.2)', background: 'transparent' },
              section: { background: `${starPattern}, ${drawerGradient}`, backgroundBlendMode: 'overlay, normal' }
            }}
        >
          <Menu
            mode="inline"
          inlineIndent={16}
          style={{ borderRight: 0, fontWeight: 500 }}
          openKeys={openKeys}
          onOpenChange={(keys) => setOpenKeys(keys)}
          onClick={(e) => {
            router.push(toRoute(e.key))
            setOpenMenu(false) // เลือกเมนูเสร็จให้ปิด Drawer
          }}
          items={filterMenuByRole([
            { key: '/home', icon: <HomeOutlined />, label: 'หน้าหลัก' },
            // ── บริการที่ทุกคนใช้บ่อย — รวมไว้บนสุด ไม่ต้องไล่หาในกลุ่มหน่วยงาน ──
            {
              key: 'my-services',
              icon: <FaClipboardList />,
              label: 'บริการของฉัน',
              children: [
                // นำหน้าด้วย FAV_PREFIX เพราะ route เดียวกันปรากฏในกลุ่มหน่วยงานด้านล่างด้วย
                // antd Menu ต้องการ key ไม่ซ้ำ ไม่งั้นไฮไลต์พร้อมกันสองที่
                { key: `${FAV_PREFIX}/hr/leave`, icon: <FaCalendarAlt />, label: 'ยื่นคำขอลา' },
                { key: `${FAV_PREFIX}/hr/leave/status`, icon: <FaClipboardList />, label: 'สรุปรายการลาของฉัน' },
                { key: `${FAV_PREFIX}/information-technology/maintenance`, icon: <FaDesktop />, label: 'แจ้งซ่อมคอมพิวเตอร์' },
                { key: `${FAV_PREFIX}/general/maintenance-request`, icon: <FaWrench />, label: 'แจ้งซ่อมบำรุงทั่วไป' },
                { key: `${FAV_PREFIX}/general/vehicle/request`, icon: <FaCar />, label: 'ขอใช้รถราชการ' },
                { key: `${FAV_PREFIX}/general/room-booking`, icon: <FaBed />, label: 'ขอห้องพักเจ้าหน้าที่' },
                { key: `${FAV_PREFIX}/accounting/salary`, icon: <FaFileInvoiceDollar />, label: 'สลิปเงินเดือน' },
                { key: `${FAV_PREFIX}/information-technology/user-request`, icon: <FaUserShield />, label: 'ขอรหัสผู้ใช้งานระบบ' },
                { key: `${FAV_PREFIX}/medical-data/statistics-request`, icon: <FaChartBar />, label: 'ขอข้อมูลสถิติ' },
              ]
            },
            {
              key: 'hr',
              icon: <FaUsersCog />,
              label: 'งานทรัพยากรบุคคล',
              children: [
                { key: '/hr/dashboard', icon: <FaTachometerAlt />, label: 'Dashboard ภาพรวม' },
                { key: '/hr/users', icon: <FaUsers />, label: 'ทะเบียนบุคลากร' },
                {
                  key: 'hr-leave',
                  icon: <FaCalendarAlt />,
                  label: 'การลา',
                  children: [
                    { key: '/hr/leave',          icon: <FaCalendarAlt />, label: 'ยื่นคำขอลา' },
                    { key: '/hr/leave/approval',  icon: <FaUserTie />,    label: 'สถานะอนุมัติการลา' },
                    { key: '/hr/leave/status',    icon: <FaClipboardList />, label: 'สรุปรายการลา' },
                    { key: '/hr/leave/dashboard', icon: <FaTachometerAlt />, label: 'Dashboard การลา' },
                    // ตั้งค่าที่มีผลทั้งองค์กร — เห็นเฉพาะ ADMIN/HR
                    { key: '/hr/leave/policy', icon: <SettingOutlined />, label: 'กำหนดสิทธิ์การลา' },
                    { key: '/hr/leave/balance', icon: <HistoryOutlined />, label: 'วันลาสะสม' },
                  ]
                },
                { key: '/hr/time-attendance', icon: <FaUserClock />, label: 'เวลาเข้าออกงาน' },
                { key: '/hr/settings/supervisor', icon: <FaUserTie />, label: 'ผังผู้บริหาร' },
              ]
            },
            {
              key: 'general',
              icon: <FaBuilding />,
              label: 'งานบริหารงานทั่วไป',
              children: [
                { key: '/general/room-booking', icon: <FaBed />, label: 'ขอห้องพักเจ้าหน้าที่' },
                {
                  key: 'general-vehicle',
                  icon: <FaCar />,
                  label: 'รถราชการ',
                  children: [
                    { key: '/general/vehicle/dashboard', icon: <FaTachometerAlt />, label: 'Dashboard รถราชการ' },
                    { key: '/general/vehicle/request', icon: <FaClipboardList />, label: 'ขอใช้รถราชการ' },
                    { key: '/general/vehicle/approval', icon: <FaTasks />, label: 'อนุมัติคำขอใช้รถ' },
                    { key: '/general/vehicle/trip-log', icon: <FaChartBar />, label: 'บันทึกการเดินทาง' },
                  ]
                },
                {
                  key: 'general-item-moving',
                  icon: <FaTruck />,
                  label: 'ขอย้ายสิ่งของ / จัดสถานที่',
                  children: [
                    { key: '/general/item-moving/dashboard', icon: <FaTachometerAlt />, label: 'Dashboard งานสนาม' },
                    { key: '/general/item-moving', icon: <FaTruck />, label: 'แจ้งขอบริการ' },
                  ]
                },
                {
                  key: 'general-maintenance',
                  icon: <FaWrench />,
                  label: 'ระบบซ่อมบำรุง',
                  children: [
                    { key: '/general/maintenance/dashboard',  icon: <FaTachometerAlt />,   label: 'Dashboard งานซ่อม' },
                    { key: '/general/maintenance/work-order', icon: <FaFileAlt />,          label: 'ใบสั่งงานซ่อม' },
                    { key: '/general/maintenance-request',    icon: <FaClipboardList />,    label: 'แจ้งซ่อมบำรุงทั่วไป' },
                    { key: '/general/medical-equipment-repair', icon: <FaBriefcaseMedical />, label: 'แจ้งซ่อมเครื่องมือแพทย์' },
                    { key: '/general/maintenance/reports',    icon: <FaChartBar />,         label: 'รายงานค่าซ่อมบำรุง' },
                  ]
                },
                {
                  key: 'general-assets',
                  icon: <FaWarehouse />,
                  label: 'ระบบครุภัณฑ์',
                  children: [
                    { key: '/general/assets/return',               icon: <FaExchangeAlt />,    label: 'ส่งคืนครุภัณฑ์เสีย' },
                    { key: '/general/assets/warehouse',            icon: <FaWarehouse />,      label: 'คลังครุภัณฑ์เสื่อมสภาพ' },
                    { key: '/general/assets/replacement-request',  icon: <FaShoppingCart />,   label: 'เสนอซื้อทดแทน' },
                    { key: '/general/assets/donation-request',      icon: <FaGift />,          label: 'ขอรับบริจาคครุภัณฑ์' },
                    { key: '/general/assets/donation-review',       icon: <FaUserShield />,    label: 'พิจารณาอนุมัติบริจาค' },
                    { key: '/general/assets/donation-registration', icon: <FaWarehouse />,     label: 'ขึ้นทะเบียนครุภัณฑ์บริจาค' },
                    { key: '/general/assets/donation-admin',        icon: <FaUsersCog />,      label: 'ตั้งค่าระบบรับบริจาค' },
                  ]
                },
                {
                  key: 'general-procurement',
                  icon: <FaWarehouse />,
                  label: 'งานพัสดุ',
                  children: [
                    { key: '/general/procurement/dashboard',     icon: <FaTachometerAlt />,  label: 'Dashboard พัสดุ' },
                    { key: '/general/procurement/receipt',       icon: <FaTruck />,          label: 'รับสินค้า / สร้างเจ้าหนี้' },
                    { key: '/general/procurement/inspection',    icon: <FaTasks />,          label: 'ตรวจรับสินค้า' },
                  ]
                },
              ]
            },
            { 
              key: 'HSS-DS', 
              icon: <FaHospitalSymbol />, 
              label: 'งานพัฒนาระบบบริการและสนับสนุนบริการสุขภาพ',
              children: [
                {
                  key: 'hss-strategy-group',
                  icon: <FaChartBar />,
                  label: 'งานยุทธศาสตร์และแผนงาน',
                  children: [
                    { key: '/hss/strategy', label: 'ภาพรวมยุทธศาสตร์' },
                    { key: '/hss/strategy/grant-charts', label: 'Project Roadmap' },
                    { key: '/hss/strategy/kpis', label: 'KPI Dashboard' },
                  ]
                },
                { key: '/hss/hrd', icon: <FaGraduationCap />, label: 'งานพัฒนาบุคลากรและการศึกษา' },
              ]
            },

            {
              key: 'information-technology',
              icon: <FaMicrochip />,
              label: 'งานคอมพิวเตอร์และเทคโนโลยีสารสนเทศ',
              children: [
                {
                  key: 'it-maintenance',
                  icon: <FaDesktop />,
                  label: 'งานซ่อมคอมพิวเตอร์',
                  children: [
                    { key: '/information-technology/maintenance/dashboard', icon: <FaTachometerAlt />, label: 'Dashboard งานซ่อม' },
                    { key: '/information-technology/maintenance', icon: <FaDesktop />, label: 'แจ้งซ่อมคอมพิวเตอร์' },
                    { key: '/information-technology/maintenance/manage', icon: <FaWrench />, label: 'จัดการงานซ่อม' },
                  ]
                },
                {
                  key: 'it-hait',
                  icon: <FaMicrochip />,
                  label: 'HAIT',
                  children: [
                    { key: '/information-technology/hait', icon: <FaChartBar />, label: 'ภาพรวม HAIT' },
                    { key: '/information-technology/hait/sla', icon: <FaClipboardList />, label: 'SLA' },
                    { key: '/information-technology/hait/incident-reports', icon: <FaExclamationTriangle />, label: 'บันทึกอุบัติการณ์' },
                    { key: '/information-technology/hait/activity', icon: <FaTasks />, label: 'บันทึกกิจกรรม IT' },
                    { key: '/information-technology/hait/risk-management', icon: <FaUserShield />, label: 'ประเมินความเสี่ยง IT' },
                  ]
                },
                {
                  key: 'it-smart-hospital',
                  icon: <FaHospitalSymbol />,
                  label: 'Smart Hospital',
                  children: [
                    { key: '/information-technology/smart-hospital/dashboard', icon: <FaTachometerAlt />, label: 'Dashboard ภาพรวม' },
                    { key: '/information-technology/smart-hospital/edit', icon: <FaFileAlt />, label: 'แก้ไขคะแนนประเมิน' },
                  ]
                },
                { key: '/information-technology/grant-charts', icon: <FaTasks />, label: 'แผนโครงการ IT (Gantt)' },
                 { key: '/information-technology/user-request', icon: <FaUserShield />, label: 'ขอรหัสผู้ใช้งานระบบ' },
                { key: '/information-technology/lan-request', icon: <FaNetworkWired />, label: 'ขอติดตั้งจุด LAN' },
                { key: '/information-technology/his-users-session', icon: <FaUserClock />, label: 'ขอเคลียร์เซสชัน HIS ผู้ใช้ระบบ' },
              ]
            },
            {
              key: 'medical-data',
              icon: <FaChartBar />,
              label: 'งานข้อมูลทางการแพทย์',
              children: [
                { key: '/medical-data/statistics', icon: <FaChartBar />, label: 'เวชสถิติ / สถิติผู้ป่วย' },
                { key: '/medical-data/statistics-request', icon: <FaClipboardList />, label: 'ขอข้อมูลสถิติ' },
                { key: '/medical-data/statistics-review', icon: <FaUserShield />, label: 'ตรวจสอบ/อนุมัติคำขอ (หัวหน้ากลุ่ม)' },
                { key: '/medical-data/statistics-tasks', icon: <FaTasks />, label: 'งานที่ได้รับมอบหมาย' },
                { key: '/medical-data/statistics-request-dashboard', icon: <FaTachometerAlt />, label: 'Dashboard คำขอข้อมูล' },
              ]
            },
            { 
              key: 'accounting', 
              icon: <FaCalculator />, 
              label: 'งานการเงินและบัญชี',
              children: [
                { key: '/accounting/schedule',           icon: <FaCalendarAlt />, label: 'ตารางเวรการปฏิบัติงาน' },
                { key: '/accounting/salary',           icon: <FaFileInvoiceDollar />, label: 'สลิปเงินเดือน' },
                { key: '/accounting/salary-ids',       icon: <FaIdCard />,            label: 'เลขที่เงินเดือนบุคลากร' },
                { key: '/accounting/credentials',      icon: <FaLock />,              label: 'ขอสิทธิ์การใช้งานระบบบัญชี' },
                { key: '/accounting/repair-payment',   icon: <FaFileAlt />,           label: 'เบิกจ่ายค่าซ่อมบำรุง' },
                { key: '/accounting/accounts-payable', icon: <FaFileInvoiceDollar />, label: 'เจ้าหนี้การค้า / KPI จ่าย' },
                { key: '/accounting/accounts-payable/dashboard', icon: <FaTachometerAlt />, label: 'Dashboard เจ้าหนี้การค้า' },
                { key: '/accounting/budget',           icon: <FaCoins />,             label: 'งบประมาณรายหน่วยงาน' },
              ]
            },


          ])}
        />
      </Drawer>
      </ConfigProvider>

      {/* Right Drawer: User Profile */}
      <ConfigProvider
        theme={{
          components: {
            Drawer: {
              colorBgElevated: 'transparent',
              colorIcon: '#fff',
              colorIconHover: 'rgba(16, 185, 129, 0.9)',
              colorText: '#e2e8f0',
              colorTextHeading: '#fff',
            },
            Menu: {
              itemBg: 'transparent',
              itemColor: 'rgba(226, 232, 240, 0.85)',
              itemHoverColor: '#6ee7b7',
              itemHoverBg: 'rgba(16, 185, 129, 0.12)',
              itemSelectedColor: '#fff',
              itemSelectedBg: 'rgba(16, 185, 129, 0.25)',
            },
            Divider: {
              colorSplit: 'rgba(255,255,255,0.08)',
            },
          },
          token: { colorPrimary: '#10b981' }
        }}
      >
        <Drawer
          title={<span style={{ color: '#fff', fontWeight: 600 }}>ข้อมูลผู้ใช้งาน</span>}
          placement="right"
          onClose={() => setOpenProfile(false)}
          open={openProfile}
          styles={{
            header: { borderBottom: '1px solid rgba(16, 185, 129, 0.2)', background: 'transparent' },
            section: { background: `${starPattern}, ${drawerGradient}`, backgroundBlendMode: 'overlay, normal' },
            body: { padding: '24px 16px' }
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
            <div style={{
              padding: 4,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
              boxShadow: '0 0 24px rgba(16, 185, 129, 0.45)',
              marginBottom: 16,
            }}>
              <Avatar
                size={80}
                icon={<UserOutlined />}
                style={{
                  backgroundColor: '#0f172a',
                  color: '#6ee7b7',
                  border: '2px solid rgba(2, 6, 23, 0.6)',
                }}
              />
            </div>
            <Title level={4} style={{ margin: 0, color: '#fff' }}>{userData.name || '—'}</Title>
            <Text style={{ color: 'rgba(226, 232, 240, 0.65)' }}>{userData.position_name || ''}</Text>
            {userData.major_name && (
              <Text style={{ color: 'rgba(226, 232, 240, 0.45)', fontSize: 12 }}>{userData.major_name}</Text>
            )}
          </div>
          <Divider style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
          <Menu
            mode="vertical"
            selectable={false}
            style={{ borderRight: 0, fontWeight: 500, background: 'transparent' }}
            onClick={({ key }) => {
              if (key === 'settings') {
                setOpenProfile(false)
                router.push('/account/settings')
              } else if (key === 'change-password') {
                setOpenProfile(false)
                router.push('/account/change-password')
              } else if (key === 'change-username') {
                setOpenProfile(false)
                router.push('/account/change-username')
              } else if (key === 'roles') {
                setOpenProfile(false)
                router.push('/account/roles')
              } else if (key === 'mfa') {
                setOpenProfile(false)
                router.push('/account/mfa')
              } else if (key === 'modules') {
                setOpenProfile(false)
                router.push('/account/modules')
              } else if (key === 'user-credentials') {
                setOpenProfile(false)
                router.push('/account/user-credentials')
              } else if (key === 'logout') {
                Cookies.remove('auth_token')
                Cookies.remove('user_data')
                setOpenProfile(false)
                router.push('/')
              }
            }}
            items={[
              { key: 'settings', icon: <SettingOutlined />, label: 'ตั้งค่าบัญชี' },
              { key: 'change-password', icon: <FaLock />, label: 'เปลี่ยนรหัสผ่าน' },
              // แสดงเฉพาะคนที่ยังใช้เลขบัตรเป็นชื่อผู้ใช้ — คนอื่นไม่ต้องเห็นเมนูที่ไม่ต้องใช้
              ...(unameStatus?.weak
                ? [{ key: 'change-username', icon: <FaUserLock />, label: 'เปลี่ยนชื่อผู้ใช้' }]
                : []),
              // แสดงเฉพาะผู้มีสิทธิ์ admin หรือ CHIEF_GROUP_IT
              ...(userData.roles?.some((r) => {
                const role = String(r).toUpperCase()
                return role === 'ADMIN' || role === 'CHIEF_GROUP_IT'
              })
                ? [{ key: 'roles', icon: <SettingOutlined />, label: 'จัดการสิทธิ์การใช้งาน' }]
                : []),
              // ตั้งค่า MFA — สวิตช์ควบคุมการเข้าถึงทั้งระบบ จำกัดเฉพาะ ADMIN (ตรงกับ requireRoles ฝั่ง backend)
              ...(userRoles.includes('ADMIN')
                ? [{ key: 'mfa', icon: <FaShieldAlt />, label: 'ยืนยันตัวตนสองชั้น (MFA)' }]
                : []),
              // เปิด/ปิดการมองเห็นแต่ละระบบ — เฉพาะ ADMIN (ตรงกับ requireRoles ฝั่ง backend)
              ...(userRoles.includes('ADMIN')
                ? [{ key: 'modules', icon: <FaToggleOn />, label: 'เปิด/ปิดการมองเห็นระบบ' }]
                : []),
              // จัดการ username/รหัสผ่าน/เลขบัตรของบุคลากร (ตรงกับ CREDENTIAL_ROLES ฝั่ง backend)
              ...(userRoles.some(r => ['ADMIN', 'IT_STAFF'].includes(r))
                ? [{ key: 'user-credentials', icon: <FaUserLock />, label: 'จัดการบัญชีเข้าใช้งาน' }]
                : []),
              { key: 'logout', icon: <LogoutOutlined />, label: 'ออกจากระบบ', danger: true },
            ]}
          />
        </Drawer>
      </ConfigProvider>
    </>
  )
}

export default Navbar