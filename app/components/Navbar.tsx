'use client'
import React, { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Layout, Button, Drawer, Typography, Avatar, Menu, Space, Divider, ConfigProvider } from 'antd'
import {
  MenuOutlined,
  UserOutlined,
  HomeOutlined,
  FileTextOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined
} from '@ant-design/icons'
import {
  FaCalendarAlt, FaUserClock, FaBed, FaCar, FaTruck, FaWrench, FaBriefcaseMedical,
  FaChartBar, FaGraduationCap, FaDesktop, FaUserShield, FaFileInvoiceDollar,
  FaUsers, FaUserTie, FaLock, FaUsersCog, FaBuilding, FaHospitalSymbol, FaMicrochip, FaCalculator,
  FaClipboardList, FaExclamationTriangle, FaTasks
} from 'react-icons/fa'

const { Header } = Layout
const { Title, Text } = Typography

const Navbar: React.FC = () => {
  const [openMenu, setOpenMenu] = useState(false)
  const [openProfile, setOpenProfile] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const [openKeys, setOpenKeys] = useState<string[]>([])

  // กางเมนูหลัก (SubMenu) อัตโนมัติตาม URL ปัจจุบัน (เช่น /general/* จะกางเมนู 'general')
  useEffect(() => {
    const parentPath = pathname.split('/')[1]
    if (parentPath) {
      setOpenKeys((prev) => Array.from(new Set([...prev, parentPath])))
    }
  }, [pathname])

  // สีส้มตาม Theme 
  const themeColor = '#6B21A8'

  // สร้างพื้นหลังลายน้ำรูปดาวแบบสุ่มตำแหน่งและขนาด (SVG Data URI)
  const starPattern = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cg fill='white' fill-opacity='0.08'%3E%3Cpath d='M10 0L13 7h7l-5 5 2 8-7-5-7 5 2-8-5-5h7z' transform='translate(20,40) rotate(15) scale(1.2)'/%3E%3Cpath d='M10 0L13 7h7l-5 5 2 8-7-5-7 5 2-8-5-5h7z' transform='translate(120,30) rotate(-25) scale(0.8)'/%3E%3Cpath d='M10 0L13 7h7l-5 5 2 8-7-5-7 5 2-8-5-5h7z' transform='translate(180,90) rotate(45) scale(1.5)'/%3E%3Cpath d='M10 0L13 7h7l-5 5 2 8-7-5-7 5 2-8-5-5h7z' transform='translate(40,160) rotate(-10) scale(0.6)'/%3E%3Cpath d='M10 0L13 7h7l-5 5 2 8-7-5-7 5 2-8-5-5h7z' transform='translate(130,180) rotate(60) scale(1.1)'/%3E%3Cpath d='M10 0L13 7h7l-5 5 2 8-7-5-7 5 2-8-5-5h7z' transform='translate(210,190) rotate(-40) scale(0.9)'/%3E%3C/g%3E%3C/svg%3E")`

  return (
    <>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: themeColor,
          height: 64,
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
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
          <Typography.Text strong style={{ color: '#fff', fontSize: '1.25rem', margin: 0 }}>
            PYHOS-ERP
          </Typography.Text>
        </div>

        {/* Right Side: User Icon */}
        <Space size="middle">
          <Button
            type="text"
            icon={<UserOutlined style={{ fontSize: '20px', color: '#fff' }} />}
            onClick={() => setOpenProfile(true)}
            style={{ width: 40, height: 40 }}
          />
        </Space>
      </Header>

      {/* Left Drawer: Main Navigation */}
      <ConfigProvider
        theme={{
          components: {
            Drawer: {
              colorBgElevated: 'transparent',
              colorIcon: '#fff',
              colorIconHover: 'rgba(255, 255, 255, 0.8)',
            },
            Menu: {
              itemBg: 'transparent',
              subMenuItemBg: 'rgba(0, 0, 0, 0.08)',
              itemColor: 'rgba(255, 255, 255, 0.85)',
              itemHoverColor: '#fff',
              itemHoverBg: 'rgba(255, 255, 255, 0.1)',
              itemSelectedColor: '#fff',
              itemSelectedBg: 'rgba(255, 255, 255, 0.2)',
              itemActiveBg: 'rgba(255, 255, 255, 0.2)',
            }
          },
          token: {
            colorPrimary: '#fff',
          }
        }}
      >
        <Drawer
          title={<span style={{ color: '#fff', fontWeight: 600 }}>เมนูหลัก</span>}
          placement="left"
          onClose={() => setOpenMenu(false)}
          open={openMenu}
          size="default"
            styles={{ 
              body: { padding: '16px 0' },
              header: { borderBottom: '1px solid rgba(255, 255, 255, 0.2)' },
              section: { background: `${starPattern}, linear-gradient(180deg, ${themeColor} 0%, #FF9F43 100%)` }
            }}
        >
          <Menu
            mode="inline"
          inlineIndent={16}
          style={{ borderRight: 0, fontWeight: 500 }}
          openKeys={openKeys}
          onOpenChange={(keys) => setOpenKeys(keys)}
          onClick={(e) => {
            router.push(e.key)
            setOpenMenu(false) // เลือกเมนูเสร็จให้ปิด Drawer
          }}
          items={[
            { key: '/', icon: <HomeOutlined />, label: 'หน้าหลัก' },
            { 
              key: 'hr', 
              icon: <FaUsersCog />, 
              label: 'งานทรัพยากรบุคคล',
              children: [
                { key: '/hr/users', icon: <FaUsers />, label: 'ทะเบียนบุคลากร' },
                { key: '/hr/leave', icon: <FaCalendarAlt />, label: 'ลาพักผ่อน / ลากิจ / ลาคลอด' },
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
                { key: '/general/vehicle-request', icon: <FaCar />, label: 'ขอรถเดินทางไปราชการ' },
                { key: '/general/item-moving', icon: <FaTruck />, label: 'ขอย้ายสิ่งของ / จัดสถานที่' },
                { key: '/general/maintenance-request', icon: <FaWrench />, label: 'แจ้งซ่อมบำรุงทั่วไป' },
                { key: '/general/medical-equipment-repair', icon: <FaBriefcaseMedical />, label: 'แจ้งซ่อมเครื่องมือแพทย์' },
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
                { key: '/information-technology/maintenance', icon: <FaDesktop />, label: 'แจ้งซ่อมคอมพิวเตอร์' },
                { key: '/information-technology/user-request', icon: <FaUserShield />, label: 'ขอรหัสผู้ใช้งานระบบ' },
                { key: '/information-technology/hait', icon: <FaMicrochip />, label: 'HAIT' },
                { key: '/information-technology/hait/sla', icon: <FaClipboardList />, label: 'SLA' },
                { key: '/information-technology/hait/incident-reports', icon: <FaExclamationTriangle />, label: 'บันทึกอุบัติการณ์ (Incident Reports)' },
                { key: '/information-technology/hait/activity', icon: <FaTasks />, label: 'บันทึกกิจกรรม IT (Activity)' },
              ]
            },
            { 
              key: 'accounting', 
              icon: <FaCalculator />, 
              label: 'งานการเงินและบัญชี',
              children: [
                { key: '/accounting/salary', icon: <FaFileInvoiceDollar />, label: 'สลิปเงินเดือน' },
                { key: '/accounting/credentials', icon: <FaLock />, label: 'ขอสิทธิ์การใช้งานระบบบัญชี' },
              ]
            },
            
            
          ]}
        />
      </Drawer>
      </ConfigProvider>

      {/* Right Drawer: User Profile */}
      <Drawer
        title="ข้อมูลผู้ใช้งาน"
        placement="right"
        onClose={() => setOpenProfile(false)}
        open={openProfile}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <Avatar size={80} icon={<UserOutlined />} style={{ backgroundColor: themeColor, marginBottom: 16 }} />
          <Title level={4} style={{ margin: 0 }}>นายสมชาย ใจดี</Title>
          <Text type="secondary">นักทรัพยากรบุคคล</Text>
        </div>
        <Divider />
        <Menu
          mode="vertical"
          selectable={false}
          style={{ borderRight: 0, fontWeight: 500 }}
          items={[
            { key: 'settings', icon: <SettingOutlined />, label: 'ตั้งค่าบัญชี' },
            { key: 'logout', icon: <LogoutOutlined />, label: 'ออกจากระบบ', danger: true },
          ]}
        />
      </Drawer>
    </>
  )
}

export default Navbar