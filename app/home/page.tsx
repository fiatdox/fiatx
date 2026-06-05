'use client'
import React, { useState, useEffect } from 'react'
import Cookies from 'js-cookie'
import {
  Typography, Card, Row, Col, Badge, Tag, Avatar,
  Timeline, Button
} from 'antd'
import { AppThemeProvider } from '../components/ThemeProvider'
import {
  BellOutlined, CalendarOutlined,
  ClockCircleOutlined, UserOutlined, ArrowRightOutlined
} from '@ant-design/icons'
import {
  FaWrench, FaBed, FaCar, FaTruck,
  FaBriefcaseMedical, FaCalendarAlt, FaDesktop, FaUserShield,
} from 'react-icons/fa'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'
import dayjs from 'dayjs'
import 'dayjs/locale/th'

dayjs.locale('th')

const { Title, Text } = Typography

// ─── Data ────────────────────────────────────────────────────────────────────

const quickActions = [
  { key: '/hr/leave', icon: <FaCalendarAlt />, label: 'ยื่นคำขอลา', color: '#059669', bg: '#05966920' },
  { key: '/information-technology/maintenance', icon: <FaDesktop />, label: 'แจ้งซ่อมคอมพิวเตอร์', color: '#7c3aed', bg: '#7c3aed20' },
  { key: '/general/maintenance-request', icon: <FaWrench />, label: 'แจ้งซ่อมทั่วไป', color: '#006a5a', bg: '#006a5a20' },
  { key: '/general/medical-equipment-repair', icon: <FaBriefcaseMedical />, label: 'เครื่องมือแพทย์', color: '#0891b2', bg: '#0891b220' },
  { key: '/general/item-moving', icon: <FaTruck />, label: 'ขอย้ายสิ่งของ/จัดสถานที่', color: '#9333ea', bg: '#9333ea20' },
  { key: '/general/room-booking', icon: <FaBed />, label: 'จองห้องพัก', color: '#d97706', bg: '#d9770620' },
  { key: '/general/vehicle/request', icon: <FaCar />, label: 'ขอใช้รถราชการ', color: '#dc2626', bg: '#dc262620' },
  { key: '/information-technology/user-request', icon: <FaUserShield />, label: 'ขอรหัสผู้ใช้งาน', color: '#2563eb', bg: '#2563eb20' },
]


const recentActivities = [
  { id: 1, title: 'แจ้งซ่อมเครื่องปรับอากาศ ห้องตรวจ OPD 2', status: 'กำลังดำเนินการ', statusColor: 'processing', time: '2 ชม. ที่แล้ว', type: 'ซ่อมบำรุง', typeColor: '#006a5a' },
  { id: 2, title: 'คำขอใช้รถราชการ วันที่ 21 เม.ย. 2569', status: 'รออนุมัติ', statusColor: 'warning', time: '3 ชม. ที่แล้ว', type: 'รถราชการ', typeColor: '#dc2626' },
  { id: 3, title: 'ขอติดตั้งจุด LAN ห้องประชุมชั้น 3', status: 'อนุมัติแล้ว', statusColor: 'success', time: 'เมื่อวาน', type: 'IT', typeColor: '#7c3aed' },
  { id: 4, title: 'แจ้งซ่อมเครื่องพิมพ์ ห้อง HR ชั้น 2', status: 'เสร็จสิ้น', statusColor: 'default', time: '2 วันที่แล้ว', type: 'ซ่อมบำรุง', typeColor: '#006a5a' },
  { id: 5, title: 'ยื่นคำขอลาพักผ่อน 23-25 เม.ย. 2569', status: 'อนุมัติแล้ว', statusColor: 'success', time: '3 วันที่แล้ว', type: 'การลา', typeColor: '#059669' },
]

const todaySchedule = [
  { time: '09:00', title: 'ประชุมคณะกรรมการบริหาร', location: 'ห้องประชุมชั้น 3' },
  { time: '13:00', title: 'อบรม HAIT ประจำปี', location: 'ห้องประชุมใหญ่ ชั้น 5' },
  { time: '15:30', title: 'ส่งมอบครุภัณฑ์ใหม่', location: 'อาคาร OPD ชั้น 1' },
]

const notifications = [
  { id: 1, message: 'งานซ่อมเครื่องปรับอากาศ OPD 2 อัปเดตสถานะ', read: false, time: '5 นาทีที่แล้ว' },
  { id: 2, message: 'คำขอลาของคุณได้รับการอนุมัติแล้ว', read: false, time: '1 ชม. ที่แล้ว' },
  { id: 3, message: 'มีใบสั่งงานซ่อมใหม่ 2 รายการ', read: true, time: '3 ชม. ที่แล้ว' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

const PageContent = () => {
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState(dayjs())
  const [user, setUser] = useState({ name: '', position: '', department: '' })

  useEffect(() => {
    const raw = Cookies.get('user_data')
    if (!raw) { router.replace('/'); return }
    const data = JSON.parse(raw)
    setUser({
      name: data.name ?? '',
      position: data.position_name ?? '',
      department: data.major_name ?? '',
    })
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(dayjs()), 60000)
    return () => clearInterval(timer)
  }, [])

  const greeting = (() => {
    const h = currentTime.hour()
    if (h < 12) return 'สวัสดีตอนเช้า'
    if (h < 17) return 'สวัสดีตอนบ่าย'
    return 'สวัสดีตอนเย็น'
  })()

  const unread = notifications.filter(n => !n.read).length

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--app-bg)' }}>
      <Navbar />
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '24px 20px 48px' }}>

        {/* ── Hero ── */}
        <div
          style={{
            borderRadius: 20,
            background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)',
            padding: '28px 32px',
            marginBottom: 24,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* decorative circles */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ position: 'absolute', bottom: -60, right: 80, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />

          <Row gutter={[24, 16]} align="middle">
            <Col xs={24} md={16}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                <Avatar
                  size={60}
                  icon={<UserOutlined />}
                  style={{ background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }}
                />
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 2 }}>{greeting}</div>
                  <Title level={3} style={{ color: '#fff', margin: 0, lineHeight: 1.2 }}>{user.name || '—'}</Title>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
                    {user.position}{user.position && user.department ? ' · ' : ''}{user.department}
                  </Text>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>
                <CalendarOutlined />
                <span>{currentTime.format('วันdddd ที่ D MMMM BBBB')} &nbsp;|&nbsp; {currentTime.format('HH:mm น.')}</span>
              </div>
            </Col>
            <Col xs={24} md={8} style={{ textAlign: 'right' }}>
              <Badge count={unread} size="default" offset={[-4, 4]}>
                <Button
                  shape="circle"
                  size="large"
                  icon={<BellOutlined style={{ color: '#fff', fontSize: 18 }} />}
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', width: 48, height: 48 }}
                />
              </Badge>
              {unread > 0 && (
                <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                  การแจ้งเตือนใหม่ <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{unread}</span> รายการ
                </div>
              )}
            </Col>
          </Row>
        </div>

        {/* ── Quick Actions ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ color: 'var(--app-text-2)', fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              เข้าถึงด่วน
            </Text>
          </div>
          <Row gutter={[12, 12]}>
            {quickActions.map((a) => (
              <Col xs={12} sm={8} md={6} lg={3} key={a.key}>
                <Card
                  hoverable
                  onClick={() => router.push(a.key)}
                  style={{ borderRadius: 14, border: '1px solid var(--app-border)', background: 'var(--app-surface)', cursor: 'pointer', textAlign: 'center' }}
                  styles={{ body: { padding: '18px 8px' } }}
                >
                  <div
                    style={{
                      width: 48, height: 48, borderRadius: 12, margin: '0 auto 10px',
                      background: a.bg, color: a.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                    }}
                  >
                    {a.icon}
                  </div>
                  <Text style={{ fontSize: 12, fontWeight: 500, color: 'var(--app-text-2)', lineHeight: 1.3 }}>{a.label}</Text>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        {/* ── Bottom ── */}
        <Row gutter={[16, 16]}>
          {/* Activities */}
          <Col xs={24} lg={14}>
            <Card
              title={
                <span style={{ color: 'var(--app-text)', fontSize: 14, fontWeight: 600 }}>
                  <ClockCircleOutlined style={{ marginRight: 8, color: '#006a5a' }} />รายการล่าสุดของฉัน
                </span>
              }
              extra={<Button type="link" size="small" icon={<ArrowRightOutlined />} style={{ color: 'var(--app-text-3)', fontSize: 12 }}>ดูทั้งหมด</Button>}
              style={{ borderRadius: 16, border: '1px solid var(--app-border)', background: 'var(--app-surface)', height: '100%' }}
              styles={{ header: { borderBottom: '1px solid var(--app-border)' }, body: { padding: 0 } }}
            >
              {recentActivities.map((item, idx) => (
                <div
                  key={item.id}
                  style={{
                    padding: '14px 20px',
                    borderBottom: idx < recentActivities.length - 1 ? '1px solid var(--app-border)' : 'none',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <Text style={{ fontSize: 13, color: 'var(--app-text)', flex: 1 }}>{item.title}</Text>
                    <Tag color={item.statusColor} style={{ margin: 0, borderRadius: 6, fontSize: 11, flexShrink: 0 }}>
                      {item.status}
                    </Tag>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 4, background: `${item.typeColor}20`, color: item.typeColor, fontWeight: 500 }}>
                      {item.type}
                    </span>
                    <Text type="secondary" style={{ fontSize: 11 }}>{item.time}</Text>
                  </div>
                </div>
              ))}
            </Card>
          </Col>

          {/* Right Column */}
          <Col xs={24} lg={10}>
            {/* Schedule */}
            <Card
              title={
                <span style={{ color: 'var(--app-text)', fontSize: 14, fontWeight: 600 }}>
                  <CalendarOutlined style={{ marginRight: 8, color: '#d97706' }} />กำหนดการวันนี้
                </span>
              }
              style={{ borderRadius: 16, border: '1px solid var(--app-border)', background: 'var(--app-surface)', marginBottom: 16 }}
              styles={{ header: { borderBottom: '1px solid var(--app-border)' } }}
            >
              {todaySchedule.length > 0 ? (
                <Timeline
                  items={todaySchedule.map((s, i) => ({
                    color: i === 0 ? '#059669' : '#334155',
                    content: (
                      <div style={{ paddingBottom: 4 }}>
                        <Tag
                          style={{ borderRadius: 6, fontSize: 12, fontWeight: 700, background: i === 0 ? '#06443520' : 'transparent', borderColor: i === 0 ? '#059669' : '#334155', color: i === 0 ? '#34d399' : 'var(--app-text-3)', marginBottom: 4 }}
                        >
                          {s.time}
                        </Tag>
                        <div>
                          <Text style={{ fontSize: 13, color: 'var(--app-text)' }}>{s.title}</Text>
                        </div>
                        <Text type="secondary" style={{ fontSize: 12 }}>{s.location}</Text>
                      </div>
                    ),
                  }))}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <Text type="secondary">ไม่มีกำหนดการวันนี้</Text>
                </div>
              )}
            </Card>

            {/* Notifications */}
            <Card
              title={
                <span style={{ color: 'var(--app-text)', fontSize: 14, fontWeight: 600 }}>
                  <BellOutlined style={{ marginRight: 8, color: '#7c3aed' }} />การแจ้งเตือน
                </span>
              }
              extra={unread > 0 && <Badge count={unread} style={{ background: '#7c3aed' }} />}
              style={{ borderRadius: 16, border: '1px solid var(--app-border)', background: 'var(--app-surface)' }}
              styles={{ header: { borderBottom: '1px solid var(--app-border)' }, body: { padding: 0 } }}
            >
              {notifications.map((n, idx) => (
                <div
                  key={n.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '12px 20px',
                    borderBottom: idx < notifications.length - 1 ? '1px solid var(--app-border)' : 'none',
                    background: !n.read ? 'rgba(124,58,237,0.06)' : 'transparent',
                  }}
                >
                  <div style={{ paddingTop: 2, flexShrink: 0 }}>
                    {!n.read
                      ? <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', marginTop: 3 }} />
                      : <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#334155', marginTop: 3 }} />
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, color: n.read ? 'var(--app-text-3)' : 'var(--app-text)' }}>{n.message}</Text>
                    <div style={{ fontSize: 11, color: 'var(--app-text-3)', marginTop: 2 }}>{n.time}</div>
                  </div>
                </div>
              ))}
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <AppThemeProvider colorPrimary="#006a5a">
      <PageContent />
    </AppThemeProvider>
  )
}
