'use client'
import React, { useMemo, useState } from 'react'
import { Typography, Breadcrumb, Row, Col, Input, Empty, Tag } from 'antd'
import {
  HomeOutlined,
  FileTextOutlined,
  SearchOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons'
import {
  FaCar, FaWrench, FaWarehouse, FaTruck, FaBed, FaShoppingCart,
  FaTachometerAlt, FaClipboardList, FaTasks, FaChartBar, FaFileAlt,
  FaBriefcaseMedical, FaExchangeAlt, FaBoxOpen,
} from 'react-icons/fa'
import { useRouter } from 'next/navigation'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'

const { Title, Text } = Typography

// ─── Data ────────────────────────────────────────────────────────────────────

interface ServiceItem {
  title: string
  desc: string
  href: string
  icon: React.ReactNode
}
interface ServiceGroup {
  key: string
  label: string
  color: string
  icon: React.ReactNode
  items: ServiceItem[]
}

const groups: ServiceGroup[] = [
  {
    key: 'vehicle',
    label: 'รถราชการ',
    color: '#dc2626',
    icon: <FaCar />,
    items: [
      { title: 'Dashboard รถราชการ', desc: 'ภาพรวมการใช้งานและสถิติยานพาหนะ', href: '/general/vehicle/dashboard', icon: <FaTachometerAlt /> },
      { title: 'ขอใช้รถราชการ', desc: 'ยื่นคำขอใช้รถไปราชการ', href: '/general/vehicle/request', icon: <FaClipboardList /> },
      { title: 'อนุมัติคำขอใช้รถ', desc: 'ตรวจสอบและอนุมัติคำขอ', href: '/general/vehicle/approval', icon: <FaTasks /> },
      { title: 'บันทึกการเดินทาง', desc: 'บันทึกเลขไมล์และประวัติการเดินทาง', href: '/general/vehicle/trip-log', icon: <FaChartBar /> },
    ],
  },
  {
    key: 'maintenance',
    label: 'ระบบซ่อมบำรุง',
    color: '#006a5a',
    icon: <FaWrench />,
    items: [
      { title: 'Dashboard งานซ่อม', desc: 'ภาพรวมงานซ่อมบำรุงทั้งหมด', href: '/general/maintenance/dashboard', icon: <FaTachometerAlt /> },
      { title: 'ใบสั่งงานซ่อม', desc: 'จัดการและติดตามใบสั่งงาน', href: '/general/maintenance/work-order', icon: <FaFileAlt /> },
      { title: 'แจ้งซ่อมบำรุงทั่วไป', desc: 'แจ้งซ่อมอาคารและอุปกรณ์ทั่วไป', href: '/general/maintenance-request', icon: <FaClipboardList /> },
      { title: 'แจ้งซ่อมเครื่องมือแพทย์', desc: 'แจ้งซ่อมครุภัณฑ์การแพทย์', href: '/general/medical-equipment-repair', icon: <FaBriefcaseMedical /> },
      { title: 'รายงานค่าซ่อมบำรุง', desc: 'สรุปค่าใช้จ่ายงานซ่อม', href: '/general/maintenance/reports', icon: <FaChartBar /> },
    ],
  },
  {
    key: 'assets',
    label: 'ระบบครุภัณฑ์',
    color: '#d97706',
    icon: <FaWarehouse />,
    items: [
      { title: 'ส่งคืนครุภัณฑ์เสีย', desc: 'แจ้งส่งคืนครุภัณฑ์ชำรุด', href: '/general/assets/return', icon: <FaExchangeAlt /> },
      { title: 'คลังครุภัณฑ์เสื่อมสภาพ', desc: 'จัดการครุภัณฑ์รอจำหน่าย', href: '/general/assets/warehouse', icon: <FaWarehouse /> },
      { title: 'เสนอซื้อทดแทน', desc: 'เสนอจัดซื้อครุภัณฑ์ทดแทน', href: '/general/assets/replacement-request', icon: <FaShoppingCart /> },
    ],
  },
  {
    key: 'procurement',
    label: 'งานพัสดุ',
    color: '#0891b2',
    icon: <FaBoxOpen />,
    items: [
      { title: 'Dashboard พัสดุ', desc: 'ภาพรวมงานพัสดุและเจ้าหนี้', href: '/general/procurement/dashboard', icon: <FaTachometerAlt /> },
      { title: 'รับสินค้า / สร้างเจ้าหนี้', desc: 'บันทึกรับสินค้าและตั้งเจ้าหนี้', href: '/general/procurement/receipt', icon: <FaTruck /> },
      { title: 'ตรวจรับสินค้า', desc: 'ตรวจรับและยืนยันคุณภาพสินค้า', href: '/general/procurement/inspection', icon: <FaTasks /> },
    ],
  },
  {
    key: 'item-moving',
    label: 'ย้ายสิ่งของ / จัดสถานที่',
    color: '#9333ea',
    icon: <FaTruck />,
    items: [
      { title: 'Dashboard งานสนาม', desc: 'ภาพรวมงานย้ายของและจัดสถานที่', href: '/general/item-moving/dashboard', icon: <FaTachometerAlt /> },
      { title: 'แจ้งขอบริการ', desc: 'ขอย้ายสิ่งของหรือจัดสถานที่', href: '/general/item-moving', icon: <FaTruck /> },
    ],
  },
  {
    key: 'room',
    label: 'ห้องพักเจ้าหน้าที่',
    color: '#2563eb',
    icon: <FaBed />,
    items: [
      { title: 'ขอห้องพักเจ้าหน้าที่', desc: 'จองและขอใช้บ้านพักของโรงพยาบาล', href: '/general/room-booking', icon: <FaBed /> },
    ],
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

const GeneralPageContent = () => {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const totalServices = useMemo(() => groups.reduce((n, g) => n + g.items.length, 0), [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return groups
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (it) =>
            it.title.toLowerCase().includes(q) ||
            it.desc.toLowerCase().includes(q) ||
            g.label.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.items.length > 0)
  }, [query])

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--app-bg)' }}>
      <Navbar />
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '20px 20px 56px' }}>
        <Breadcrumb
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FileTextOutlined /> ระบบบริหารงานทั่วไป</> },
          ]}
          style={{ marginBottom: 18 }}
        />

        {/* ── Header banner (branded teal — คงโทนทั้งสองโหมด) ── */}
        <div
          style={{
            borderRadius: 20,
            background: 'linear-gradient(120deg, #064e3b 0%, #065f46 45%, #0d9488 110%)',
            padding: '28px 32px',
            marginBottom: 28,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: -50, right: -30, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'absolute', bottom: -70, right: 120, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <Row align="middle" gutter={[24, 16]}>
            <Col xs={24} md={17}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: '#fff',
                  }}
                >
                  <FaWarehouse />
                </div>
                <div>
                  <Title level={3} style={{ color: '#fff', margin: 0, lineHeight: 1.2 }}>ระบบบริหารงานทั่วไป</Title>
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>
                    บริการงานยานพาหนะ ซ่อมบำรุง ครุภัณฑ์ พัสดุ และสถานที่ ในที่เดียว
                  </Text>
                </div>
              </div>
            </Col>
            <Col xs={24} md={7} style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-flex', gap: 24 }}>
                <div>
                  <div style={{ color: '#fff', fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{groups.length}</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>หมวดงาน</div>
                </div>
                <div>
                  <div style={{ color: '#fff', fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{totalServices}</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>บริการ</div>
                </div>
              </div>
            </Col>
          </Row>
        </div>

        {/* ── Search ── */}
        <div style={{ maxWidth: 460, marginBottom: 32 }}>
          <Input
            size="large"
            allowClear
            placeholder="ค้นหาบริการ เช่น ขอใช้รถ, แจ้งซ่อม, พัสดุ…"
            prefix={<SearchOutlined style={{ color: 'var(--app-text-3)' }} />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ borderRadius: 12 }}
          />
        </div>

        {/* ── Groups ── */}
        {filtered.length === 0 ? (
          <Empty description={<Text style={{ color: 'var(--app-text-2)' }}>ไม่พบบริการที่ค้นหา</Text>} style={{ padding: '60px 0' }} />
        ) : (
          filtered.map((g) => (
            <div key={g.key} style={{ marginBottom: 36 }}>
              {/* Group header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div
                  style={{
                    width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                    background: `${g.color}1a`, color: g.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}
                >
                  {g.icon}
                </div>
                <Title level={5} style={{ margin: 0, color: 'var(--app-text)' }}>{g.label}</Title>
                <Tag style={{ margin: 0, borderRadius: 20, border: 'none', background: 'var(--app-border)', color: 'var(--app-text-2)', fontSize: 12 }}>
                  {g.items.length} บริการ
                </Tag>
                <div style={{ flex: 1, height: 1, background: 'var(--app-border)' }} />
              </div>

              {/* Cards */}
              <Row gutter={[16, 16]}>
                {g.items.map((it) => (
                  <Col xs={24} sm={12} lg={8} xl={6} key={it.href}>
                    <button
                      onClick={() => router.push(it.href)}
                      className="general-service-card"
                      style={{
                        width: '100%', textAlign: 'left', cursor: 'pointer',
                        border: '1px solid var(--app-border)', borderRadius: 16,
                        background: 'var(--app-surface)', padding: '18px 18px 16px',
                        display: 'flex', flexDirection: 'column', gap: 10, height: '100%',
                        // @ts-expect-error custom prop consumed by CSS
                        '--accent': g.color,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div
                          style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: `${g.color}1a`, color: g.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19,
                          }}
                        >
                          {it.icon}
                        </div>
                        <ArrowRightOutlined className="general-service-arrow" style={{ color: g.color, fontSize: 14 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--app-text)', marginBottom: 4 }}>{it.title}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--app-text-2)', lineHeight: 1.45 }}>{it.desc}</div>
                      </div>
                    </button>
                  </Col>
                ))}
              </Row>
            </div>
          ))
        )}
      </div>

      {/* hover styles */}
      <style jsx global>{`
        .general-service-card {
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .general-service-card:hover {
          transform: translateY(-3px);
          border-color: var(--accent);
          box-shadow: 0 10px 26px -10px color-mix(in srgb, var(--accent) 55%, transparent);
        }
        .general-service-arrow {
          opacity: 0;
          transform: translateX(-4px);
          transition: opacity 0.18s ease, transform 0.18s ease;
        }
        .general-service-card:hover .general-service-arrow {
          opacity: 1;
          transform: translateX(0);
        }
      `}</style>
    </div>
  )
}

const GeneralPage = () => {
  return (
    <AppThemeProvider colorPrimary="#006a5a">
      <GeneralPageContent />
    </AppThemeProvider>
  )
}

export default GeneralPage
