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
  FaCalendarMinus, FaUserClock, FaBed, FaCar, FaBoxOpen, FaTools, FaStethoscope,
  FaChartLine, FaUserGraduate, FaDesktop, FaKey, FaFileInvoiceDollar,
  FaUsers
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
  const themeColor = '#FF6500'

  // สร้างพื้นหลังลายน้ำรูปพระจันทร์ (SVG Data URI)
  const moonPattern = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cg fill='rgba(255,255,255,0.07)'%3E%3Cpath d='M12 21.35a9.69 9.69 0 0 1-7.35-3.35 1 1 0 0 1 .53-1.59 8 8 0 0 0 4.67-11.83 1 1 0 0 1 1.09-1.5 9.69 9.69 0 0 1 8.41 9.57 9.71 9.71 0 0 1-7.35 8.7z' transform='translate(30, 40) rotate(15) scale(1.5)'/%3E%3Cpath d='M12 21.35a9.69 9.69 0 0 1-7.35-3.35 1 1 0 0 1 .53-1.59 8 8 0 0 0 4.67-11.83 1 1 0 0 1 1.09-1.5 9.69 9.69 0 0 1 8.41 9.57 9.71 9.71 0 0 1-7.35 8.7z' transform='translate(100, 30) rotate(-25) scale(0.8)'/%3E%3Cpath d='M12 21.35a9.69 9.69 0 0 1-7.35-3.35 1 1 0 0 1 .53-1.59 8 8 0 0 0 4.67-11.83 1 1 0 0 1 1.09-1.5 9.69 9.69 0 0 1 8.41 9.57 9.71 9.71 0 0 1-7.35 8.7z' transform='translate(160, 80) rotate(45) scale(2)'/%3E%3Cpath d='M12 21.35a9.69 9.69 0 0 1-7.35-3.35 1 1 0 0 1 .53-1.59 8 8 0 0 0 4.67-11.83 1 1 0 0 1 1.09-1.5 9.69 9.69 0 0 1 8.41 9.57 9.71 9.71 0 0 1-7.35 8.7z' transform='translate(40, 130) rotate(-15) scale(1.2)'/%3E%3Cpath d='M12 21.35a9.69 9.69 0 0 1-7.35-3.35 1 1 0 0 1 .53-1.59 8 8 0 0 0 4.67-11.83 1 1 0 0 1 1.09-1.5 9.69 9.69 0 0 1 8.41 9.57 9.71 9.71 0 0 1-7.35 8.7z' transform='translate(110, 150) rotate(72) scale(0.6)'/%3E%3Cpath d='M12 21.35a9.69 9.69 0 0 1-7.35-3.35 1 1 0 0 1 .53-1.59 8 8 0 0 0 4.67-11.83 1 1 0 0 1 1.09-1.5 9.69 9.69 0 0 1 8.41 9.57 9.71 9.71 0 0 1-7.35 8.7z' transform='translate(180, 160) rotate(-40) scale(1)'/%3E%3C/g%3E%3C/svg%3E")`

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
            section: { background: `${moonPattern}, linear-gradient(180deg, ${themeColor} 0%, #FF9F43 100%)` }
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
              icon: <FileTextOutlined />, 
              label: 'งานทรัพยากรบุคคล',
              children: [
                { key: '/hr/users', icon: <FaUsers />, label: 'ทะเบียนบุคลากร' },
                { key: '/hr/leave', icon: <FaCalendarMinus />, label: 'ลาพักผ่อน / ลากิจ /ลาคลอดบุตร' },
                { key: '/hr/time-attendance', icon: <FaUserClock />, label: 'เวลาเข้าออกงาน' },
              ]
            },
            { 
              key: 'general', 
              icon: <FileTextOutlined />, 
              label: 'งานบริหารงานทั่วไป',
              children: [
                { key: '/general/room-booking', icon: <FaBed />, label: 'ขอห้องพักเจ้าหน้าที่' },
                { key: '/general/vehicle-booking', icon: <FaCar />, label: 'ขอรถเดินทางไปราชการ' },
                { key: '/general/item-moving', icon: <FaBoxOpen />, label: 'ขอย้ายสิ่งของ จัดสถานที่' },
                { key: '/general/maintenance-request', icon: <FaTools />, label: 'แจ้งซ่อมบำรุง' },
                { key: '/general/medical-equipment-request', icon: <FaStethoscope />, label: 'แจ้งซ่อมเครื่องมือแพทย์' },
              ]
            },
            { 
              key: 'HSS-DS', 
              icon: <FileTextOutlined />, 
              label: 'งานพัฒนาระบบบริการและสนับสนุนบริการสุขภาพ',
              children: [
                { key: '/HSS-DSHit-maintenance-request', icon: <FaChartLine />, label: 'งานยุทธศาสตร์และแผนงาน' },
                { key: '/HSS-DS/it-user-request', icon: <FaUserGraduate />, label: 'งานพัฒนาบุคลากรและการศึกษา' },
              ]
            },

            { 
              key: 'it', 
              icon: <FileTextOutlined />, 
              label: 'งานคอมพิวเตอร์และเทคโนโลยีสารสนเทศ',
              children: [
                { key: '/it/it-maintenance-request', icon: <FaDesktop />, label: 'แจ้งซ่อมคอมพิวเตอร์' },
                { key: '/it/it-user-request', icon: <FaKey />, label: 'ขอรหัสผู้ใช้งานระบบ' },
              ]
            },
            { 
              key: 'accounting', 
              icon: <FileTextOutlined />, 
              label: 'งานการเงินและบัญชี',
              children: [
                { key: '/accounting/salary', icon: <FaFileInvoiceDollar />, label: 'สลิปเงินเดือน' },
                { key: '/accounting/it-user-request', icon: <FaKey />, label: 'ขอรหัสผู้ใช้งานระบบ' },
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