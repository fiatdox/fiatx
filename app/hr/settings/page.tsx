// /Users/fiat/Desktop/nextjs/fiatx/app/hr/settings/page.tsx

'use client'
import React from 'react'
import { Card, Typography, Breadcrumb, ConfigProvider, App, Row, Col, theme } from 'antd'
import {
  HomeOutlined,
  SettingOutlined,
  ScheduleOutlined,
  ApartmentOutlined,
  BankOutlined,
  FieldTimeOutlined,
  ContactsOutlined,
  RiseOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import Navbar from '@/app/components/Navbar'
import Link from 'next/link'

const { Title, Text } = Typography

const SettingsPageContent = () => {
  const { token } = theme.useToken();

  const menuItems = [
    {
      title: 'ผังผู้บริหารและหัวหน้างาน',
      icon: <ApartmentOutlined className="text-4xl text-purple-400" />,
      description: 'กำหนดรายชื่อผู้บริหาร หัวหน้ากลุ่มงาน และรักษาการแทนในรูปแบบ Slot',
      href: '/hr/settings/supervisor',
      color: 'from-purple-500/20 to-purple-600/5'
    },
    {
      title: 'ประเภทการลา',
      icon: <ScheduleOutlined className="text-4xl text-emerald-400" />,
      description: 'จัดการประเภทการลา กฏเกณฑ์ และสิทธิ์การลาต่างๆ',
      href: '/hr/settings/leave-types',
      color: 'from-emerald-500/20 to-emerald-600/5'
    },
    {
      title: 'ตั้งค่ากลุ่มภารกิจ',
      icon: <ApartmentOutlined className="text-4xl text-blue-400" />,
      description: 'จัดการโครงสร้างและข้อมูลกลุ่มภารกิจ',
      href: '/hr/settings/missions',
      color: 'from-blue-500/20 to-blue-600/5'
    },
    {
      title: 'ตั้งค่าหน่วยงาน',
      icon: <BankOutlined className="text-4xl text-indigo-400" />,
      description: 'จัดการข้อมูลหน่วยงานและแผนกภายใน',
      href: '/hr/settings/units',
      color: 'from-indigo-500/20 to-indigo-600/5'
    },
    {
      title: 'ตั้งค่าวันลาสะสม',
      icon: <FieldTimeOutlined className="text-4xl text-amber-400" />,
      description: 'กำหนดวันลาสะสมตามประเภทพนักงาน',
      href: '/hr/settings/accumulated-leave',
      color: 'from-amber-500/20 to-amber-600/5'
    },
    {
      title: 'ตั้งค่าตำแหน่งบุคลากร',
      icon: <ContactsOutlined className="text-4xl text-rose-400" />,
      description: 'จัดการตำแหน่งงานต่างๆ ภายในองค์กร',
      href: '/hr/settings/positions',
      color: 'from-rose-500/20 to-rose-600/5'
    },
    {
      title: 'ตั้งค่าระดับความชำนาญ',
      icon: <RiseOutlined className="text-4xl text-cyan-400" />,
      description: 'กำหนดระดับความชำนาญในตำแหน่งงาน',
      href: '/hr/settings/proficiency-levels',
      color: 'from-cyan-500/20 to-cyan-600/5'
    }
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-purple-500/30">
      <Navbar />
      
      {/* Abstract Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 p-6 md:p-12 max-w-7xl mx-auto">
        <Breadcrumb
          items={[
            { href: '/', title: <span className="text-slate-400 hover:text-purple-400 transition-colors"><HomeOutlined /> หน้าหลัก</span> },
            { href: '/hr/users', title: <span className="text-slate-400 hover:text-purple-400 transition-colors"><FileTextOutlined /> ทรัพยากรบุคคล</span> },
            { title: <span className="text-slate-200 font-medium"><SettingOutlined /> ตั้งค่าระบบ</span> },
          ]}
          className="mb-10 text-xs uppercase tracking-widest"
        />

        <div className="mb-12">
          <div className="flex items-center gap-4 mb-2">
             <div className="w-1 h-8 bg-purple-600 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
             <Title level={2} className="text-slate-100 m-0 font-black! tracking-tight uppercase">
               System Configurations
             </Title>
          </div>
          <Text className="text-slate-400 ml-5 text-sm max-w-2xl block border-l border-slate-800 pl-4">
             ปรับแต่งโครงสร้างองค์กร สิทธิ์การลา และระบบบริหารจัดการบุคลากรทั้งหมดผ่านศูนยกลางการตั้งค่าพรีเมียม
          </Text>
        </div>

        <Row gutter={[24, 24]}>
          {menuItems.map((item, index) => (
            <Col xs={24} sm={12} md={8} lg={6} key={index}>
              <Link href={item.href}>
                <Card
                  hoverable
                  className="h-full bg-slate-900/40 backdrop-blur-xl border-slate-800/50 hover:border-purple-500/50 transition-all duration-500 group overflow-hidden shadow-xl"
                  styles={{ 
                    body: { 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'flex-start', 
                      padding: '2rem' 
                    } 
                  }}
                >
                  {/* Card Background Glow */}
                  <div className={`absolute inset-0 bg-linear-to-br ${item.color} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
                  
                  <div className="relative z-10 w-full">
                    <div className="mb-6 p-4 bg-slate-800/50 rounded-2xl w-fit group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 shadow-inner">
                      {item.icon}
                    </div>
                    <Title level={4} className="mb-3 text-slate-100 group-hover:text-white transition-colors font-bold! tracking-tight">
                      {item.title}
                    </Title>
                    <Text className="text-slate-500 group-hover:text-slate-300 text-xs leading-relaxed transition-colors block">
                      {item.description}
                    </Text>
                  </div>

                  {/* Corner Accent */}
                  <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-slate-800 rounded-full group-hover:bg-purple-500 transition-colors shadow-[0_0_8px_rgba(168,85,247,0)] group-hover:shadow-[0_0_8px_rgba(168,85,247,1)]" />
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      </div>

      <style jsx global>{`
        .ant-breadcrumb-separator { color: #334155 !important; margin: 0 12px; }
        .ant-typography { color: inherit !important; }
      `}</style>
    </div>
  )
}

const SettingsPage = () => {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#6B21A8',
          borderRadius: 16,
          fontFamily: 'var(--font-sarabun)',
          colorBgBase: '#020617',
          colorBorder: 'rgba(255,255,255,0.1)'
        },
        components: {
          Card: {
            colorBgContainer: 'rgba(15, 23, 42, 0.4)',
          }
        }
      }}
    >
      <App>
        <SettingsPageContent />
      </App>
    </ConfigProvider>
  )
}

export default SettingsPage