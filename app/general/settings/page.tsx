// /Users/fiat/Desktop/nextjs/fiatx/app/general/page.tsx

'use client'
import React from 'react'
import { Card, Typography, Breadcrumb, ConfigProvider, App, Row, Col } from 'antd'
import {
  HomeOutlined,
  SettingOutlined,
  UserSwitchOutlined,
  FileTextOutlined,
  CarOutlined,
  IdcardOutlined,
  ToolOutlined
} from '@ant-design/icons'
import Navbar from '@/app/components/Navbar'
import Link from 'next/link'

const { Title, Text } = Typography

const GeneralPageContent = () => {
  const menuItems = [
    {
      title: 'ตั้งค่ารถขอไปใช้ราชการ',
      icon: <CarOutlined className="text-4xl text-primary" />,
      description: 'จัดการข้อมูลรถยนต์ราชการและสถานะ',
      href: '/general/settings/vehicles'
    },
    {
      title: 'ตั้งค่าคนขับรถ',
      icon: <IdcardOutlined className="text-4xl text-primary" />,
      description: 'จัดการรายชื่อพนักงานขับรถและตารางงาน',
      href: '/general/settings/vehicle-driver-management'
    },
    {
      title: 'ตั้งค่าหัวหน้าช่างซ่อมบำรุง',
      icon: <UserSwitchOutlined className="text-4xl text-primary" />,
      description: 'กำหนดรายชื่อหัวหน้าช่างและผู้รับผิดชอบ',
      href: '/general/settings/maintenance-chiefs'
    },
    {
      title: 'ตั้งค่าช่างรับงาน',
      icon: <ToolOutlined className="text-4xl text-primary" />,
      description: 'จัดการรายชื่อช่างและทีมงานซ่อมบำรุง',
      href: '/general/settings/technicians'
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb
          items={[
            { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FileTextOutlined /> ระบบบริหารงานทั่วไป</> },
            { title: <><FileTextOutlined /> ตั้งค่าระบบ</> },
          ]}
          className="mb-6"
        />

        <div className="max-w-full mx-auto">
          <div className="mb-8">
            <Title level={3} className="text-primary m-0 mt-4">ตั้งค่าระบบระบบบริหารงานทั่วไป</Title>
            <Text type="secondary">จัดการข้อมูลยานพาหนะและงานซ่อมบำรุง</Text>
          </div>

          <Row gutter={[24, 24]}>
            {menuItems.map((item, index) => (
              <Col xs={24} sm={12} md={8} lg={6} key={index}>
                <Link href={item.href}>
                  <Card
                    hoverable
                    className="h-full shadow-sm hover:shadow-md transition-all duration-300 border-primary/10 group cursor-pointer"
                    styles={{ 
                      body: { 
                        height: '100%', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        textAlign: 'center', 
                        padding: '2.5rem' 
                      } 
                    }}
                  >
                    <div className="mb-6 p-4 bg-primary/5 rounded-full group-hover:bg-primary/10 transition-colors duration-300">
                      {item.icon}
                    </div>
                    <Title level={4} className="mb-3 group-hover:text-primary transition-colors duration-300">
                      {item.title}
                    </Title>
                    <Text type="secondary" className="group-hover:text-slate-600">
                      {item.description}
                    </Text>
                  </Card>
                </Link>
              </Col>
            ))}
          </Row>
        </div>
      </div>
    </div>
  )
}

const GeneralPage = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#006a5a',
          borderRadius: 8,
          fontFamily: 'var(--font-sarabun)',
        },
      }}
    >
      <App>
        <GeneralPageContent />
      </App>
    </ConfigProvider>
  )
}

export default GeneralPage