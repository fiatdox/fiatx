// /Users/fiat/Desktop/nextjs/fiatx/app/hr/settings/page.tsx

'use client'
import React from 'react'
import { Card, Typography, Breadcrumb, ConfigProvider, App, Row, Col } from 'antd'
import {
  HomeOutlined,
  SettingOutlined,
  ScheduleOutlined,
  UserSwitchOutlined,
  TeamOutlined,
  BankOutlined,
  ApartmentOutlined,
  SolutionOutlined,
  FieldTimeOutlined,
  ContactsOutlined,
  RiseOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import Navbar from '@/app/components/Navbar'
import Link from 'next/link'

const { Title, Text } = Typography

const SettingsPageContent = () => {
  const menuItems = [
    {
      title: 'ประเภทการลา',
      icon: <ScheduleOutlined className="text-4xl text-primary" />,
      description: 'จัดการประเภทการลา กฏเกณฑ์ และสิทธิ์การลาต่างๆ',
      href: '/hr/settings/leave-types'
    },
    {
      title: 'ตั้งค่าหัวหน้าภารกิจ / รักษาการ',
      icon: <UserSwitchOutlined className="text-4xl text-primary" />,
      description: 'กำหนดรายชื่อหัวหน้าภารกิจและผู้รักษาการแทน',
      href: '/hr/settings/mission-leaders'
    },
    {
      title: 'ตั้งค่าหัวหน้ากลุ่มงาน',
      icon: <TeamOutlined className="text-4xl text-primary" />,
      description: 'กำหนดรายชื่อหัวหน้ากลุ่มงานในแต่ละฝ่าย',
      href: '/hr/settings/group-leaders'
    },
    {
      title: 'ตั้งค่าหัวหน้าหน่วยงาน',
      icon: <SolutionOutlined className="text-4xl text-primary" />,
      description: 'กำหนดรายชื่อหัวหน้าหน่วยงานย่อย',
      href: '/hr/settings/unit-leaders'
    },
    {
      title: 'ตั้งค่ากลุ่มภารกิจ',
      icon: <ApartmentOutlined className="text-4xl text-primary" />,
      description: 'จัดการโครงสร้างและข้อมูลกลุ่มภารกิจ',
      href: '/hr/settings/missions'
    },
    {
      title: 'ตั้งค่าหน่วยงาน',
      icon: <BankOutlined className="text-4xl text-primary" />,
      description: 'จัดการข้อมูลหน่วยงานและแผนกภายใน',
      href: '/hr/settings/units'
    },
    {
      title: 'ตั้งค่าวันลาสะสม',
      icon: <FieldTimeOutlined className="text-4xl text-primary" />,
      description: 'กำหนดวันลาสะสมตามประเภทพนักงาน',
      href: '/hr/settings/accumulated-leave'
    },
    {
      title: 'ตั้งค่าตำแหน่งบุคลากร',
      icon: <ContactsOutlined className="text-4xl text-primary" />,
      description: 'จัดการตำแหน่งงานต่างๆ ภายในองค์กร',
      href: '/hr/settings/positions'
    },
    {
      title: 'ตั้งค่าระดับความชำนาญ',
      icon: <RiseOutlined className="text-4xl text-primary" />,
      description: 'กำหนดระดับความชำนาญในตำแหน่งงาน',
      href: '/hr/settings/proficiency-levels'
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb
          items={[
            { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
            { href: '/hr', title: <><FileTextOutlined /> งานทรัพยากรบุคคล</> },
            { title: <><SettingOutlined /> ตั้งค่าระบบ</> },
          ]}
          className="mb-6"
        />

        <div className="max-w-full mx-auto">
          <div className="mb-8">
            <Title level={3} className="text-primary m-0 mt-4">ตั้งค่าระบบงานทรัพยากรบุคคล</Title>
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

const SettingsPage = () => {
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
        <SettingsPageContent />
      </App>
    </ConfigProvider>
  )
}

export default SettingsPage