'use client'
import React from 'react'
import { ConfigProvider, App, Typography, Breadcrumb, Row, Col, Card, theme } from 'antd'
import { 
  HomeOutlined, 
  FundOutlined, 
  ProjectOutlined, 
  DotChartOutlined, 
  RiseOutlined, 
  AppstoreOutlined,
  CompassOutlined
} from '@ant-design/icons'
import Navbar from '@/app/components/Navbar'
import Link from 'next/link'

const { Title, Text } = Typography

const StrategyDashboard = () => {
  const menuItems = [
    {
      title: 'Project Roadmap',
      icon: <ProjectOutlined className="text-4xl text-purple-400" />,
      description: 'แผนภูมิ Gantt ติดตามโครงการยุทธศาสตร์และความคืบหน้างบประมาณ',
      href: '/hss/strategy/grant-charts',
      color: 'from-purple-500/20 to-purple-600/5'
    },
    {
      title: 'KPI Dashboard',
      icon: <DotChartOutlined className="text-4xl text-emerald-400" />,
      description: 'สรุปตัวชี้วัดความสำเร็จของแต่ละกลุ่มภารกิจและหน่วยงาน',
      href: '/hss/strategy/kpis',
      color: 'from-emerald-500/20 to-emerald-600/5'
    },
    {
      title: 'Planning & Strategy',
      icon: <CompassOutlined className="text-4xl text-blue-400" />,
      description: 'การกำหนดทิศทางองค์กร วิสัยทัศน์ และแผนปฏิบัติการประจำปี',
      href: '/hss/strategy/planning',
      color: 'from-blue-500/20 to-blue-600/5'
    },
    {
      title: 'Annual Report',
      icon: <RiseOutlined className="text-4xl text-amber-400" />,
      description: 'รายงานผลการดำเนินงานประจำปีและบทสรุปผู้บริหาร',
      href: '/hss/strategy/reports',
      color: 'from-amber-500/20 to-amber-600/5'
    }
  ]

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-purple-500/30">
      <Navbar />
      
      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[5%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[5%] w-[40%] h-[40%] bg-emerald-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 p-6 md:p-12 max-w-7xl mx-auto">
        <Breadcrumb
          items={[
            { href: '/', title: <span className="text-slate-500 hover:text-purple-400 transition-colors"><HomeOutlined /> หน้าหลัก</span> },
            { title: <span className="text-slate-100 font-medium"><FundOutlined /> งานยุทธศาสตร์</span> },
          ]}
          className="mb-10 text-xs uppercase tracking-widest"
        />

        <div className="mb-12">
          <div className="flex items-center gap-4 mb-3">
             <div className="w-1 h-10 bg-linear-to-b from-purple-600 to-emerald-500 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
             <div>
               <Title level={1} className="text-slate-100 m-0 font-black! tracking-tighter uppercase">
                 Strategy & Planning
               </Title>
               <Text className="text-slate-400 text-sm mt-1 block font-medium opacity-80 uppercase tracking-widest">
                 Health Service Support & Digital Strategy
               </Text>
             </div>
          </div>
          <div className="max-w-2xl border-l border-slate-800 ml-5 pl-5 py-1">
             <Text className="text-slate-400 text-sm italic">
                ศูนย์กลางการจัดการยุทธศาสตร์ แผนงานโครงการ และตัวชี้วัดความสำเร็จของโรงพยาบาล เพื่อการขับเคลื่อนองค์กรสู่ความเป็นเลิศผ่านระบบดิจิทัล
             </Text>
          </div>
        </div>

        <Row gutter={[24, 24]}>
          {menuItems.map((item, index) => (
            <Col xs={24} sm={12} md={12} lg={6} key={index}>
              <Link href={item.href}>
                <Card
                  hoverable
                  className="h-full bg-slate-900/40 backdrop-blur-xl border-slate-800/50 hover:border-purple-500/50 transition-all duration-500 group overflow-hidden shadow-2xl"
                  styles={{ 
                    body: { 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'flex-start', 
                      padding: '2.5rem 2rem' 
                    } 
                  }}
                >
                  {/* Card Background Glow */}
                  <div className={`absolute inset-0 bg-linear-to-br ${item.color} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
                  
                  <div className="relative z-10 w-full">
                    <div className="mb-8 p-5 bg-slate-800/50 rounded-2xl w-fit group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-inner group-hover:bg-purple-900/20">
                      {item.icon}
                    </div>
                    <Title level={4} className="mb-4 text-slate-100 group-hover:text-white transition-colors font-bold! tracking-tight leading-tight">
                      {item.title}
                    </Title>
                    <Text className="text-slate-500 group-hover:text-slate-300 text-xs leading-relaxed transition-colors block font-medium">
                      {item.description}
                    </Text>
                  </div>

                  {/* Corner Accent Decor */}
                  <div className="absolute top-4 right-4 flex gap-1.5 opacity-30 group-hover:opacity-100 transition-opacity">
                    <div className="w-1.5 h-1.5 bg-slate-800 rounded-full group-hover:bg-purple-500 transition-colors" />
                    <div className="w-1.5 h-1.5 bg-slate-800 rounded-full group-hover:bg-emerald-500 transition-colors" />
                  </div>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>

        {/* Informative Footer Section */}
        <div className="mt-16 pt-8 border-t border-slate-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
           <div className="flex items-center gap-3 text-slate-500 group cursor-default">
              <AppstoreOutlined className="text-xl group-hover:text-purple-400 transition-colors" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Department of Strategy & Development Control</span>
           </div>
           <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest text-slate-600">
              <span className="hover:text-slate-400 transition-colors cursor-pointer">Support</span>
              <span className="hover:text-slate-400 transition-colors cursor-pointer">Privacy Policy</span>
              <span className="hover:text-slate-400 transition-colors cursor-pointer">System Status</span>
           </div>
        </div>
      </div>

      <style jsx global>{`
        .ant-breadcrumb-separator { color: #1e293b !important; margin: 0 12px; }
        .ant-typography { color: inherit !important; }
      `}</style>
    </div>
  )
}

const StrategyPage = () => {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#6B21A8',
          borderRadius: 20,
          fontFamily: 'var(--font-sarabun)',
          colorBgBase: '#020617',
          colorBorder: 'rgba(255,255,255,0.08)'
        },
        components: {
          Card: {
            colorBgContainer: 'rgba(15, 23, 42, 0.4)',
          }
        }
      }}
    >
      <App>
        <StrategyDashboard />
      </App>
    </ConfigProvider>
  )
}

export default StrategyPage