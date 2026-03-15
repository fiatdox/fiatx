'use client'
import React, { useState } from 'react'
import { Layout, Button, Drawer, Typography, Avatar, Menu, Space, Divider } from 'antd'
import {
  MenuOutlined,
  UserOutlined,
  HomeOutlined,
  FileTextOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined
} from '@ant-design/icons'

const { Header } = Layout
const { Title, Text } = Typography

const Navbar: React.FC = () => {
  const [openMenu, setOpenMenu] = useState(false)
  const [openProfile, setOpenProfile] = useState(false)

  // สีเขียวตาม Theme กระทรวง (#006a5a)
  const ministryGreen = '#006a5a'

  return (
    <>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: ministryGreen,
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
      <Drawer
        title="เมนูหลัก"
        placement="left"
        onClose={() => setOpenMenu(false)}
        open={openMenu}
        style={{ width: 280 }}
      >
        <Menu
          mode="vertical"
          style={{ borderRight: 0 }}
          items={[
            { key: 'home', icon: <HomeOutlined />, label: 'หน้าหลัก' },
            { key: 'hr', icon: <FileTextOutlined />, label: 'ระบบงานบุคคล' },
            { key: 'general', icon: <FileTextOutlined />, label: 'ระบบบริหารงานทั่วไป' },
          ]}
        />
      </Drawer>

      {/* Right Drawer: User Profile */}
      <Drawer
        title="ข้อมูลผู้ใช้งาน"
        placement="right"
        onClose={() => setOpenProfile(false)}
        open={openProfile}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <Avatar size={80} icon={<UserOutlined />} style={{ backgroundColor: ministryGreen, marginBottom: 16 }} />
          <Title level={4} style={{ margin: 0 }}>นายสมชาย ใจดี</Title>
          <Text type="secondary">นักทรัพยากรบุคคล</Text>
        </div>
        <Divider />
        <Menu
          mode="vertical"
          selectable={false}
          style={{ borderRight: 0 }}
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