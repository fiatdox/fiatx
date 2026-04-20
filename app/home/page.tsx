'use client'
import React, { useState, useEffect } from 'react'
import {
  Typography, Card, Row, Col, ConfigProvider, theme, Statistic, Badge, Tag, Avatar,
  Timeline, Progress, Divider, Button, App
} from 'antd'
import {
  HomeOutlined, BellOutlined, CalendarOutlined, CheckCircleOutlined,
  ClockCircleOutlined, ToolOutlined, UserOutlined, RightOutlined,
  FileTextOutlined, CarOutlined, DesktopOutlined, MedicineBoxOutlined
} from '@ant-design/icons'
import {
  FaWrench, FaBed, FaCar, FaTruck, FaClipboardList, FaBriefcaseMedical,
  FaCalendarAlt, FaDesktop, FaNetworkWired, FaUserShield, FaFileInvoiceDollar,
  FaExchangeAlt, FaChartBar
} from 'react-icons/fa'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'
import dayjs from 'dayjs'
import 'dayjs/locale/th'

dayjs.locale('th')

const { Title, Text, Paragraph } = Typography

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockUser = {
  name: 'นายสมชาย ใจดี',
  position: 'นักทรัพยากรบุคคล',
  department: 'กลุ่มงานบริหารทั่วไป',
}

const quickActions = [
  { key: '/general/maintenance-request', icon: <FaWrench className="text-2xl" />, label: 'แจ้งซ่อมบำรุง', color: '#006a5a' },
  { key: '/general/medical-equipment-repair', icon: <FaBriefcaseMedical className="text-2xl" />, label: 'แจ้งซ่อมเครื่องมือแพทย์', color: '#0891b2' },
  { key: '/information-technology/maintenance', icon: <FaDesktop className="text-2xl" />, label: 'แจ้งซ่อมคอมพิวเตอร์', color: '#6B21A8' },
  { key: '/general/room-booking', icon: <FaBed className="text-2xl" />, label: 'จองห้องพัก', color: '#d97706' },
  { key: '/general/vehicle/request', icon: <FaCar className="text-2xl" />, label: 'ขอใช้รถราชการ', color: '#dc2626' },
  { key: '/general/item-moving', icon: <FaTruck className="text-2xl" />, label: 'ขอย้ายสิ่งของ', color: '#7c3aed' },
  { key: '/hr/leave', icon: <FaCalendarAlt className="text-2xl" />, label: 'ยื่นคำขอลา', color: '#059669' },
  { key: '/information-technology/user-request', icon: <FaUserShield className="text-2xl" />, label: 'ขอรหัสผู้ใช้งาน', color: '#2563eb' },
]

const pendingStats = [
  { title: 'งานซ่อมรอดำเนินการ', value: 12, icon: <ToolOutlined />, color: '#006a5a' },
  { title: 'คำขอรออนุมัติ', value: 5, icon: <FileTextOutlined />, color: '#d97706' },
  { title: 'คำขอลารอพิจารณา', value: 3, icon: <CalendarOutlined />, color: '#6B21A8' },
  { title: 'งานเสร็จเดือนนี้', value: 47, icon: <CheckCircleOutlined />, color: '#059669' },
]

const recentActivities = [
  {
    id: 1,
    title: 'แจ้งซ่อมเครื่องปรับอากาศ ห้องตรวจ OPD 2',
    status: 'กำลังดำเนินการ',
    statusColor: 'processing',
    time: '2 ชั่วโมงที่แล้ว',
    type: 'ซ่อมบำรุง',
  },
  {
    id: 2,
    title: 'คำขอใช้รถราชการ วันที่ 21 เม.ย. 2569',
    status: 'รออนุมัติ',
    statusColor: 'warning',
    time: '3 ชั่วโมงที่แล้ว',
    type: 'รถราชการ',
  },
  {
    id: 3,
    title: 'ขอติดตั้งจุด LAN ห้องประชุมชั้น 3',
    status: 'อนุมัติแล้ว',
    statusColor: 'success',
    time: 'เมื่อวาน',
    type: 'IT',
  },
  {
    id: 4,
    title: 'แจ้งซ่อมเครื่องพิมพ์ ห้อง HR ชั้น 2',
    status: 'เสร็จสิ้น',
    statusColor: 'default',
    time: '2 วันที่แล้ว',
    type: 'ซ่อมบำรุง',
  },
  {
    id: 5,
    title: 'ยื่นคำขอลาพักผ่อน 23-25 เม.ย. 2569',
    status: 'อนุมัติแล้ว',
    statusColor: 'success',
    time: '3 วันที่แล้ว',
    type: 'การลา',
  },
]

const todaySchedule = [
  { time: '09:00', title: 'ประชุมคณะกรรมการบริหาร', location: 'ห้องประชุมชั้น 3' },
  { time: '13:00', title: 'อบรม HAIT ประจำปี', location: 'ห้องประชุมใหญ่ ชั้น 5' },
  { time: '15:30', title: 'ส่งมอบครุภัณฑ์ใหม่', location: 'อาคาร OPD ชั้น 1' },
]

const notifications = [
  { id: 1, message: 'งานซ่อมเครื่องปรับอากาศ OPD 2 อัปเดตสถานะ', read: false },
  { id: 2, message: 'คำขอลาของคุณได้รับการอนุมัติแล้ว', read: false },
  { id: 3, message: 'มีใบสั่งงานซ่อมใหม่ 2 รายการ', read: true },
]

// ─── Page Component ──────────────────────────────────────────────────────────

const PageContent = () => {
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState(dayjs())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(dayjs()), 60000)
    return () => clearInterval(timer)
  }, [])

  const greeting = (() => {
    const hour = currentTime.hour()
    if (hour < 12) return 'สวัสดีตอนเช้า'
    if (hour < 17) return 'สวัสดีตอนบ่าย'
    return 'สวัสดีตอนเย็น'
  })()

  return (
    <div className="min-h-dvh bg-slate-900 text-slate-200" style={{ minHeight: '100dvh' }}>
      <Navbar />
      <div className="p-4 md:p-8 pb-12 max-w-[1400px] mx-auto">

        {/* ── Welcome Section ── */}
        <div className="mb-6">
          <Card
            style={{
              background: 'linear-gradient(135deg, #006a5a 0%, #059669 50%, #0d9488 100%)',
              border: 'none',
              borderRadius: 16,
            }}
          >
            <Row gutter={[24, 16]} align="middle">
              <Col xs={24} md={16}>
                <div className="flex items-center gap-4 mb-3">
                  <Avatar size={56} icon={<UserOutlined />} style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)' }} />
                  <div>
                    <Title level={3} style={{ color: '#fff', margin: 0 }}>
                      {greeting}, {mockUser.name}
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15 }}>
                      {mockUser.position} | {mockUser.department}
                    </Text>
                  </div>
                </div>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                  <CalendarOutlined className="mr-1" />
                  {currentTime.format('วันdddd ที่ D MMMM BBBB')} | {currentTime.format('HH:mm น.')}
                </Text>
              </Col>
              <Col xs={24} md={8}>
                <div className="flex items-center gap-3 md:justify-end">
                  <Badge count={notifications.filter(n => !n.read).length} size="small">
                    <Button
                      shape="circle"
                      size="large"
                      icon={<BellOutlined style={{ color: '#fff' }} />}
                      style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: 'none' }}
                    />
                  </Badge>
                  <div className="text-right hidden md:block">
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>การแจ้งเตือนใหม่</Text>
                    <br />
                    <Text strong style={{ color: '#fff', fontSize: 20 }}>
                      {notifications.filter(n => !n.read).length} รายการ
                    </Text>
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </div>

        {/* ── Statistics ── */}
        <Row gutter={[16, 16]} className="mb-6">
          {pendingStats.map((stat, index) => (
            <Col xs={12} sm={12} md={6} key={index}>
              <Card
                hoverable
                style={{ borderRadius: 12, border: 'none' }}
                styles={{ body: { padding: '20px 16px' } }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center rounded-xl"
                    style={{
                      width: 48, height: 48,
                      backgroundColor: `${stat.color}18`,
                      color: stat.color,
                      fontSize: 22,
                    }}
                  >
                    {stat.icon}
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{stat.title}</Text>
                    <div>
                      <Text strong style={{ fontSize: 28, lineHeight: 1.1 }}>{stat.value}</Text>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* ── Quick Actions ── */}
        <div className="mb-6">
          <Title level={5} style={{ color: '#94a3b8', marginBottom: 16 }}>
            <RightOutlined className="mr-2 text-xs" />เข้าถึงด่วน
          </Title>
          <Row gutter={[12, 12]}>
            {quickActions.map((action) => (
              <Col xs={12} sm={8} md={6} lg={3} key={action.key}>
                <Card
                  hoverable
                  onClick={() => router.push(action.key)}
                  style={{ borderRadius: 12, border: 'none', cursor: 'pointer', textAlign: 'center' }}
                  styles={{ body: { padding: '20px 12px' } }}
                >
                  <div
                    className="flex items-center justify-center mx-auto mb-3 rounded-xl"
                    style={{
                      width: 52, height: 52,
                      backgroundColor: `${action.color}18`,
                      color: action.color,
                    }}
                  >
                    {action.icon}
                  </div>
                  <Text style={{ fontSize: 13, fontWeight: 500 }}>{action.label}</Text>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        {/* ── Bottom Section: Activities + Schedule ── */}
        <Row gutter={[16, 16]}>
          {/* Recent Activities */}
          <Col xs={24} lg={14}>
            <Card
              title={
                <span style={{ fontSize: 15 }}>
                  <ClockCircleOutlined className="mr-2" />รายการล่าสุดของฉัน
                </span>
              }
              style={{ borderRadius: 12, border: 'none', height: '100%' }}
              styles={{ body: { padding: '8px 0' } }}
            >
              <div>
                {recentActivities.map((item) => (
                  <div key={item.id} style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <Text style={{ fontSize: 14 }}>{item.title}</Text>
                      <Tag
                        color={item.statusColor}
                        style={{ margin: 0, borderRadius: 6, fontSize: 12 }}
                      >
                        {item.status}
                      </Tag>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <Tag variant="filled" style={{ fontSize: 11, borderRadius: 4 }}>{item.type}</Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>{item.time}</Text>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </Col>

          {/* Today Schedule */}
          <Col xs={24} lg={10}>
            <Card
              title={
                <span style={{ fontSize: 15 }}>
                  <CalendarOutlined className="mr-2" />กำหนดการวันนี้
                </span>
              }
              style={{ borderRadius: 12, border: 'none', height: '100%' }}
            >
              {todaySchedule.length > 0 ? (
                <Timeline
                  items={todaySchedule.map((schedule, index) => ({
                    color: index === 0 ? '#006a5a' : '#94a3b8',
                    content: (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Tag color="#006a5a" style={{ borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
                            {schedule.time}
                          </Tag>
                        </div>
                        <Text style={{ fontSize: 14 }}>{schedule.title}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>{schedule.location}</Text>
                      </div>
                    ),
                  }))}
                />
              ) : (
                <div className="text-center py-8">
                  <Text type="secondary">ไม่มีกำหนดการวันนี้</Text>
                </div>
              )}
            </Card>

            {/* Notifications Card */}
            <Card
              title={
                <span style={{ fontSize: 15 }}>
                  <BellOutlined className="mr-2" />การแจ้งเตือน
                </span>
              }
              style={{ borderRadius: 12, border: 'none', marginTop: 16 }}
            >
              <div>
                {notifications.map((item) => (
                  <div key={item.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-2">
                      <Badge dot={!item.read} offset={[0, 0]}>
                        <BellOutlined style={{ fontSize: 14, color: item.read ? '#64748b' : '#006a5a' }} />
                      </Badge>
                      <Text style={{ fontSize: 13, color: item.read ? '#64748b' : undefined }}>
                        {item.message}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#006a5a',
          borderRadius: 8,
        },
        components: {
          App: {
            colorBgBase: 'transparent',
          },
        },
      }}
    >
      <App style={{ background: 'transparent' }}>
        <PageContent />
      </App>
    </ConfigProvider>
  )
}
