// /Users/fiat/Desktop/nextjs/fiatx/app/general/page.tsx

'use client'
import React from 'react'
import { Card, Typography, Breadcrumb, ConfigProvider, App, Row, Col } from 'antd'
import {
  HomeOutlined,
  FileTextOutlined,
  CarOutlined,
  ToolOutlined,
  MedicineBoxOutlined
} from '@ant-design/icons'
import Navbar from '@/app/components/Navbar'
import Link from 'next/link'

const { Title, Text } = Typography

const GeneralPageContent = () => {
  const menuItems = [
    {
      title: 'ขอใช้รถไปราชการ',
      icon: <CarOutlined className="text-4xl text-primary" />,
      href: '/general/vehicle-request'
    },
    {
      title: 'แจ้งซ่อมบำรุงทั่วไป',
      icon: <ToolOutlined className="text-4xl text-primary" />,
      href: '/general/maintenance-request'
    },
    {
      title: 'แจ้งซ่อมเครื่องมือแพทย์',
      icon: <MedicineBoxOutlined className="text-4xl text-primary" />,
      href: '/general/medical-equipment-repair'
    },
    {
      title: 'ขอบ้านพัก รพ.',
      icon: <HomeOutlined className="text-4xl text-primary" />,
      href: '/general/housing-request'
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
          ]}
          className="mb-6"
        />

        <div className="max-w-full mx-auto">
          <div className="mb-8">
            <Title level={3} className="text-primary m-0 mt-4">ระบบบริหารงานทั่วไป</Title>
            <Text type="secondary">จัดการข้อมูลยานพาหนะและงานซ่อมบำรุง</Text>
          </div>

          <Row gutter={[24, 24]}>
            {menuItems.map((item, index) => (
              <Col xs={24} sm={12} md={8} lg={4} key={index}>
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