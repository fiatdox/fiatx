'use client'
import { useState, useMemo, useEffect } from 'react'
import Cookies from 'js-cookie'
import {
  Table, Tag, Card, Typography, Breadcrumb,
  DatePicker, Select, Button, Modal, Space, Spin, Row, Col,
  Statistic, Avatar, Divider, Empty
} from 'antd'
import {
  HomeOutlined, FilePdfOutlined,
  DollarOutlined, BankOutlined,
  CalendarOutlined, PrinterOutlined, UserOutlined,
  IdcardOutlined, ApartmentOutlined, DownloadOutlined,
  RiseOutlined, FallOutlined, WalletOutlined, EyeOutlined
} from '@ant-design/icons'
import { FaMoneyBillWave, FaFileInvoiceDollar, FaWallet, FaRegMoneyBillAlt, FaHistory } from 'react-icons/fa'
import dayjs, { Dayjs } from 'dayjs'
import dynamic from 'next/dynamic'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import type { SalaryEarning, SalaryDeduction, SalarySlipData } from '@/app/components/SalarySlipPDF'

const { Title, Text } = Typography

// ─── Lazy PDF Viewer ─────────────────────────────────────────────────────────
const SalarySlipPDFViewer = dynamic(
  () => import('@/app/components/SalarySlipPDF'),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 560, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <Spin size="large" />
        <Text type="secondary">กำลังสร้าง PDF สลิปเงินเดือน...</Text>
      </div>
    ),
  }
)

// ─── Constants ────────────────────────────────────────────────────────────────
const THAI_MONTHS = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']

// ─── Current User (mock — would come from auth session) ─────────────────────
const CURRENT_USER = {
  id: 'EMP-001',
  name: 'นายสมชาย ใจดี',
  position: 'นักทรัพยากรบุคคลชำนาญการ',
  department: 'งาน HR',
  group: 'กลุ่มอำนวยการ',
  staffType: 'ข้าราชการ',
  bankAccount: '123-4-56789-0',
  bankName: 'ธนาคารกรุงไทย',
  startDate: '2018-05-01',
  baseSalary: 35200,
  positionAllowance: 3500,
  responsibilityAllowance: 0,
  otherAllowance: 600,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatCurrency = (n: number) =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function computeSalaryForMonth(monthDate: Dayjs): SalarySlipData {
  const monthLabel = `${THAI_MONTHS[monthDate.month() + 1]} พ.ศ. ${monthDate.year() + 543}`
  const payDate = `${monthDate.endOf('month').date()} ${THAI_MONTHS[monthDate.month() + 1]} ${monthDate.year() + 543}`

  // Small variation per month for realism (OT, bonus, etc.)
  const monthKey = monthDate.month() + monthDate.year() * 12
  const otBonus = (monthKey * 137) % 1500
  const hasBonus = monthDate.month() === 11 // December = year-end bonus
  const u = CURRENT_USER

  const earnings: SalaryEarning[] = [
    { label: 'เงินเดือน', amount: u.baseSalary },
  ]
  if (u.positionAllowance > 0) earnings.push({ label: 'เงินประจำตำแหน่ง', amount: u.positionAllowance })
  if (u.responsibilityAllowance > 0) earnings.push({ label: 'ค่าตอบแทนพิเศษ (พ.ต.ส.)', amount: u.responsibilityAllowance })
  if (u.otherAllowance > 0) earnings.push({ label: 'ค่าตอบแทนอื่น ๆ', amount: u.otherAllowance })
  if (otBonus > 300) earnings.push({ label: 'ค่าล่วงเวลา (OT)', amount: otBonus })
  if (hasBonus) earnings.push({ label: 'เงินโบนัสประจำปี', amount: u.baseSalary })

  const totalEarnings = earnings.reduce((s, e) => s + e.amount, 0)

  // Deductions
  const gpf = u.staffType === 'ข้าราชการ' ? +(u.baseSalary * 0.03).toFixed(2) : 0
  const sso = u.staffType === 'ข้าราชการ' ? 0 : Math.min(+(u.baseSalary * 0.05).toFixed(2), 750)
  const tax = +(totalEarnings * 0.02).toFixed(2)
  const coop = 1500
  const loan = 0

  const deductions: SalaryDeduction[] = [
    { label: 'ภาษีเงินได้บุคคลธรรมดา', amount: tax },
  ]
  if (gpf > 0) deductions.push({ label: 'กองทุนบำเหน็จบำนาญ (กบข.)', amount: gpf })
  if (sso > 0) deductions.push({ label: 'ประกันสังคม', amount: sso })
  deductions.push({ label: 'สหกรณ์ออมทรัพย์', amount: coop })
  if (loan > 0) deductions.push({ label: 'ผ่อนชำระสินเชื่อสวัสดิการ', amount: loan })

  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0)
  const netSalary = +(totalEarnings - totalDeductions).toFixed(2)

  return {
    employee: {
      id: u.id, name: u.name, position: u.position,
      department: u.department, staffType: u.staffType,
      bankAccount: u.bankAccount, bankName: u.bankName,
    },
    monthLabel,
    payDate,
    earnings,
    deductions,
    totalEarnings,
    totalDeductions,
    netSalary,
  }
}

// ─── Page Content ─────────────────────────────────────────────────────────────
const PageContent = () => {
  const today = dayjs()
  const [selectedYear, setSelectedYear] = useState<Dayjs>(today)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [pdfMonth, setPdfMonth] = useState<Dayjs>(today.subtract(1, 'month'))

  // ── ข้อมูลผู้ใช้จาก login (cookie) — ฟิลด์ที่ backend ไม่มี ใช้ค่า mock เป็น fallback ──
  const [profile, setProfile] = useState({
    name: '', position: '', department: '', group: '',
    staffType: '', username: '',
    bankName: '', bankAccount: '',
  })

  useEffect(() => {
    const raw = Cookies.get('user_data')
    if (!raw) return
    try {
      const d = JSON.parse(raw)
      setProfile({
        name: d.name || '',
        position: d.position_name || '',
        department: d.major_name || '',          // กลุ่มงาน
        group: d.mission_name || '',             // ภารกิจ
        staffType: d.user_type_name || '',
        username: d.username || (d.id != null ? String(d.id) : ''),
        bankName: d.bankName || '',              // login ไม่มี — รอ API เงินเดือน
        bankAccount: d.bankAccount || '',
      })
    } catch { /* ignore malformed cookie */ }
  }, [])

  // Build 12-month history for selected year, up to current month
  const history = useMemo(() => {
    const list: { month: Dayjs; data: SalarySlipData }[] = []
    const year = selectedYear.year()
    const maxMonth = year === today.year() ? today.month() : 11
    for (let m = maxMonth; m >= 0; m--) {
      const md = dayjs(new Date(year, m, 1))
      list.push({ month: md, data: computeSalaryForMonth(md) })
    }
    return list
  }, [selectedYear, today])

  // Summary for current year
  const yearSummary = useMemo(() => {
    return history.reduce(
      (acc, h) => {
        acc.earnings += h.data.totalEarnings
        acc.deductions += h.data.totalDeductions
        acc.net += h.data.netSalary
        return acc
      },
      { earnings: 0, deductions: 0, net: 0 }
    )
  }, [history])

  // Latest month snapshot
  const latest = history[0]
  const previous = history[1]
  const changeVsPrev = latest && previous ? latest.data.netSalary - previous.data.netSalary : 0

  // สร้างข้อมูลสลิป แล้วแทนที่ส่วน "ตัวตนพนักงาน" ด้วยข้อมูลผู้ login จริง (user_data)
  // ตัวเลขเงินเดือนยังมาจาก mock จนกว่าจะมี API เงินเดือน
  const pdfData = useMemo<SalarySlipData>(() => {
    const base = computeSalaryForMonth(pdfMonth)
    return {
      ...base,
      employee: {
        ...base.employee,
        id:          profile.username   || base.employee.id,
        name:        profile.name       || base.employee.name,
        position:    profile.position   || base.employee.position,
        department:  profile.department || base.employee.department,
        staffType:   profile.staffType  || base.employee.staffType,
        bankName:    profile.bankName    || base.employee.bankName,
        bankAccount: profile.bankAccount || base.employee.bankAccount,
      },
    }
  }, [pdfMonth, profile])

  // Stats
  const stats = [
    {
      title: 'เงินเดือนล่าสุด',
      value: latest ? formatCurrency(latest.data.netSalary) : '—',
      suffix: 'บาท',
      icon: <FaWallet />,
      color: '#0284c7',
      footnote: latest ? `${THAI_MONTHS[latest.month.month() + 1]} ${latest.month.year() + 543}` : '',
    },
    {
      title: 'เทียบเดือนก่อน',
      value: changeVsPrev === 0 ? '—' : `${changeVsPrev > 0 ? '+' : ''}${formatCurrency(changeVsPrev)}`,
      suffix: 'บาท',
      icon: changeVsPrev >= 0 ? <RiseOutlined /> : <FallOutlined />,
      color: changeVsPrev >= 0 ? '#16a34a' : '#ef4444',
      footnote: previous ? `vs ${THAI_MONTHS[previous.month.month() + 1]}` : '',
    },
    {
      title: 'รายได้รวมปีนี้',
      value: formatCurrency(yearSummary.earnings),
      suffix: 'บาท',
      icon: <FaMoneyBillWave />,
      color: '#16a34a',
      footnote: `${history.length} เดือน`,
    },
    {
      title: 'หักรวมปีนี้',
      value: formatCurrency(yearSummary.deductions),
      suffix: 'บาท',
      icon: <FaRegMoneyBillAlt />,
      color: '#d97706',
      footnote: 'ภาษี · กบข. · สหกรณ์',
    },
  ]

  // Table columns
  const columns = [
    {
      title: 'งวดเงินเดือน', key: 'month', width: 200,
      render: (_: any, r: { month: Dayjs; data: SalarySlipData }) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {THAI_MONTHS[r.month.month() + 1]} {r.month.year() + 543}
          </div>
          <Text type="secondary" style={{ fontSize: 11 }}>
            จ่าย {r.data.payDate}
          </Text>
        </div>
      ),
    },
    {
      title: 'รายได้รวม', key: 'earnings', align: 'right' as const, width: 140,
      render: (_: any, r: { data: SalarySlipData }) => (
        <Text style={{ color: '#16a34a', fontSize: 14 }}>{formatCurrency(r.data.totalEarnings)}</Text>
      ),
    },
    {
      title: 'รายการหัก', key: 'deductions', align: 'right' as const, width: 140,
      render: (_: any, r: { data: SalarySlipData }) => (
        <Text style={{ color: '#ef4444', fontSize: 14 }}>{formatCurrency(r.data.totalDeductions)}</Text>
      ),
    },
    {
      title: 'เงินสุทธิ', key: 'net', align: 'right' as const, width: 160,
      render: (_: any, r: { data: SalarySlipData }) => (
        <Text strong style={{ color: '#0284c7', fontSize: 16 }}>{formatCurrency(r.data.netSalary)}</Text>
      ),
    },
    {
      title: 'รายการพิเศษ', key: 'special', width: 200,
      render: (_: any, r: { data: SalarySlipData }) => {
        const special = r.data.earnings.filter(e =>
          e.label.includes('OT') || e.label.includes('โบนัส')
        )
        if (special.length === 0) return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
        return (
          <Space size={4} wrap>
            {special.map((e, i) => (
              <Tag key={i} color={e.label.includes('โบนัส') ? 'gold' : 'cyan'} style={{ fontSize: 11 }}>
                {e.label.replace('ค่าล่วงเวลา (OT)', 'OT')}: {formatCurrency(e.amount)}
              </Tag>
            ))}
          </Space>
        )
      },
    },
    {
      title: 'พิมพ์', key: 'action', align: 'center' as const, width: 130, fixed: 'right' as const,
      render: (_: any, r: { month: Dayjs }) => (
        <Space size={4}>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => { setPdfMonth(r.month); setPdfOpen(true) }}
            style={{ backgroundColor: '#006a5a' }}
          >
            ดูสลิป
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="min-h-dvh bg-app-bg text-app-text" style={{ minHeight: '100dvh' }}>
      <Navbar />
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto">

        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FaFileInvoiceDollar className="inline mr-1" /> งานการเงินและบัญชี</> },
            { title: 'เงินเดือนของฉัน' },
          ]}
          className="mb-4"
        />

        {/* ── Header Banner / Employee Profile ── */}
        <Card
          style={{
            background: 'linear-gradient(135deg, #006a5a 0%, #059669 50%, #0d9488 100%)',
            border: 'none',
            borderRadius: 16,
            marginBottom: 24,
          }}
        >
          <Row gutter={[24, 16]} align="middle">
            <Col xs={24} md={16}>
              <div className="flex items-center gap-4">
                <Avatar
                  size={72}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: '#fff',
                    fontSize: 28,
                    border: '2px solid rgba(255,255,255,0.3)',
                  }}
                  icon={<UserOutlined />}
                />
                <div>
                  {profile.staffType && (
                    <Tag color="white" style={{ color: '#006a5a', fontWeight: 600, marginBottom: 6 }}>
                      {profile.staffType}
                    </Tag>
                  )}
                  <Title level={3} style={{ color: '#fff', margin: 0 }}>
                    {profile.name || '—'}
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
                    {profile.username && <><IdcardOutlined className="mr-1" /> {profile.username}<span className="mx-2">·</span></>}
                    {profile.position}
                  </Text>
                  <div>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                      <ApartmentOutlined className="mr-1" /> {profile.department}{profile.group ? ` · ${profile.group}` : ''}
                    </Text>
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: '#ffffff', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              >
                <Text style={{ color: 'var(--app-text-3)', fontSize: 12 }}>
                  <BankOutlined className="mr-1" style={{ color: '#006a5a' }} /> บัญชีรับเงินเดือน
                </Text>
                <div style={{ color: '#006a5a', fontSize: 15, fontWeight: 700, marginTop: 4 }}>
                  {profile.bankName || 'ยังไม่ระบุ'}
                </div>
                <div style={{ color: '#0f172a', fontFamily: 'monospace', fontSize: 15, fontWeight: 600 }}>
                  {profile.bankAccount || '—'}
                </div>
              </div>
            </Col>
          </Row>
        </Card>

        {/* ── Stats Cards ── */}
        <Row gutter={[12, 12]} className="mb-6">
          {stats.map((stat, i) => (
            <Col xs={12} md={6} key={i}>
              <Card style={{ borderRadius: 12, border: '1px solid var(--app-border)' }} styles={{ body: { padding: '18px 20px' } }}>
                <div className="flex items-start justify-between gap-2">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{stat.title}</Text>
                    <div style={{ marginTop: 2 }}>
                      <Text strong style={{ fontSize: 20, lineHeight: 1.2, color: stat.color }}>
                        {stat.value}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>{stat.suffix}</Text>
                    </div>
                    {stat.footnote && (
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
                        {stat.footnote}
                      </Text>
                    )}
                  </div>
                  <div
                    className="flex items-center justify-center rounded-xl"
                    style={{ width: 44, height: 44, backgroundColor: `${stat.color}26`, color: stat.color, fontSize: 20, flexShrink: 0 }}
                  >
                    {stat.icon}
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* ── Latest Slip Highlight ── */}
        {latest && (
          <Card
            style={{
              borderRadius: 12,
              border: '1px solid rgba(0, 106, 90, 0.35)',
              marginBottom: 24,
              background: 'var(--app-surface)',
            }}
            styles={{ body: { padding: 20 } }}
          >
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} md={14}>
                <div className="flex items-center gap-3 mb-2">
                  <Tag color="#006a5a" style={{ fontSize: 12 }}>งวดล่าสุด</Tag>
                  <Text strong style={{ fontSize: 16 }}>
                    สลิปเงินเดือน · {latest.data.monthLabel}
                  </Text>
                </div>
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic
                      title={<Text type="secondary" style={{ fontSize: 12 }}>รายได้รวม</Text>}
                      value={latest.data.totalEarnings}
                      precision={2}
                      styles={{ content: { color: '#16a34a', fontSize: 18 } }}
                      prefix="฿"
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title={<Text type="secondary" style={{ fontSize: 12 }}>รายการหัก</Text>}
                      value={latest.data.totalDeductions}
                      precision={2}
                      styles={{ content: { color: '#ef4444', fontSize: 18 } }}
                      prefix="฿"
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title={<Text type="secondary" style={{ fontSize: 12 }}>เงินสุทธิ</Text>}
                      value={latest.data.netSalary}
                      precision={2}
                      styles={{ content: { color: '#0284c7', fontSize: 20, fontWeight: 700 } }}
                      prefix="฿"
                    />
                  </Col>
                </Row>
              </Col>
              <Col xs={24} md={10}>
                <div className="flex gap-2 md:justify-end flex-wrap">
                  <Button
                    icon={<EyeOutlined />}
                    size="large"
                    onClick={() => { setPdfMonth(latest.month); setPdfOpen(true) }}
                    style={{ backgroundColor: '#006a5a', color: '#fff', border: 'none', fontWeight: 600 }}
                  >
                    ดูสลิปเดือนล่าสุด
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    size="large"
                    onClick={() => { setPdfMonth(latest.month); setPdfOpen(true) }}
                    style={{ backgroundColor: '#facc15', color: '#1e293b', border: 'none', fontWeight: 600 }}
                  >
                    ดาวน์โหลด PDF
                  </Button>
                </div>
              </Col>
            </Row>
          </Card>
        )}

        {/* ── History Table ── */}
        <Card
          style={{ borderRadius: 12, border: 'none' }}
          styles={{ body: { padding: 0 } }}
        >
          <div className="px-6 pt-5 pb-4">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <FaHistory style={{ color: '#006a5a', fontSize: 18 }} />
                <Text strong style={{ fontSize: 16 }}>ประวัติเงินเดือน</Text>
                <Tag color="#006a5a" style={{ borderRadius: 12, fontSize: 12, padding: '0 10px' }}>
                  {history.length} งวด
                </Tag>
              </div>
              <div className="flex items-center gap-2">
                <Text type="secondary" style={{ fontSize: 13 }}>ปี:</Text>
                <DatePicker
                  picker="year"
                  value={selectedYear}
                  onChange={(v) => { if (v) setSelectedYear(v) }}
                  format={(v) => `พ.ศ. ${v.year() + 543}`}
                  allowClear={false}
                  suffixIcon={<CalendarOutlined />}
                  style={{ width: 150 }}
                />
              </div>
            </div>
          </div>

          {history.length === 0 ? (
            <Empty description="ไม่พบข้อมูลเงินเดือนในปีนี้" style={{ padding: 60 }} />
          ) : (
            <Table
              columns={columns}
              dataSource={history}
              rowKey={(r) => r.month.format('YYYY-MM')}
              pagination={false}
              scroll={{ x: 1000 }}
              size="middle"
            />
          )}
        </Card>

        {/* ── PDF Modal ── */}
        <Modal
          title={
            <Space>
              <FilePdfOutlined style={{ color: '#006a5a' }} />
              <span>สลิปเงินเดือน · {profile.name}</span>
              <Tag color="#006a5a">
                {THAI_MONTHS[pdfMonth.month() + 1]} {pdfMonth.year() + 543}
              </Tag>
            </Space>
          }
          open={pdfOpen}
          onCancel={() => setPdfOpen(false)}
          footer={null}
          width="90%"
          style={{ top: 24, maxWidth: 1100 }}
          styles={{ body: { padding: 0, height: '80vh' } }}
          destroyOnHidden
        >
          <div style={{ width: '100%', height: '100%' }}>
            <SalarySlipPDFViewer data={pdfData} />
          </div>
        </Modal>
      </div>
    </div>
  )
}

export default function SalaryPage() {
  return (
    <AppThemeProvider colorPrimary="#006a5a">
      <PageContent />
    </AppThemeProvider>
  )
}
