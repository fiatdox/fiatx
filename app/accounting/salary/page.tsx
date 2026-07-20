'use client'
import { useState, useMemo, useEffect, useCallback } from 'react'
import Cookies from 'js-cookie'
import {
  Table, Tag, Card, Typography, Breadcrumb,
  Select, Button, Modal, Space, Spin, Row, Col,
  Statistic, Avatar, Empty, Input, App
} from 'antd'
import {
  HomeOutlined, FilePdfOutlined, BankOutlined,
  UserOutlined, IdcardOutlined, ApartmentOutlined, DownloadOutlined,
  RiseOutlined, FallOutlined, EyeOutlined, LockOutlined
} from '@ant-design/icons'
import { FaMoneyBillWave, FaFileInvoiceDollar, FaWallet, FaRegMoneyBillAlt, FaHistory } from 'react-icons/fa'
import dayjs from 'dayjs'
import dynamic from 'next/dynamic'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import type { SalarySlipData } from '@/app/components/SalarySlipPDF'

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

// ─── Types (จาก API /accounting/salary) ──────────────────────────────────────
interface MonthSummary {
  mt: string          // งวดแบบ พ.ศ. YYYYMM00 เช่น 25690600
  income: number
  deduction: number
  net: number
}

interface PayrollProfile {
  fname: string
  lname: string
  bank: string | null
  bankbranch: string | null
  accno: string | null
}

interface SlipItem {
  code: string
  label: string
  amount: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatCurrency = (n: number) =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// mt "25690600" → "มิถุนายน 2569"
const mtToLabel = (mt: string) =>
  `${THAI_MONTHS[Number(mt.slice(4, 6))] ?? '—'} ${mt.slice(0, 4)}`

// mt → วันสิ้นเดือนแบบไทย เช่น "30 มิถุนายน 2569" (ใช้เป็นวันที่จ่ายบนสลิป)
const mtToPayDate = (mt: string) => {
  const beYear = Number(mt.slice(0, 4))
  const month = Number(mt.slice(4, 6))
  if (!beYear || !month) return ''
  const endDay = dayjs(new Date(beYear - 543, month - 1, 1)).endOf('month').date()
  return `${endDay} ${THAI_MONTHS[month]} ${beYear}`
}

// ─── Page Content ─────────────────────────────────────────────────────────────
const PageContent = () => {
  const { message } = App.useApp()

  // ── ข้อมูลผู้ใช้จาก login (cookie) — ใช้แสดงหัวสลิป/แบนเนอร์ ──
  const [profile, setProfile] = useState({
    name: '', position: '', department: '', group: '',
    staffType: '', username: '',
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
      })
    } catch { /* ignore malformed cookie */ }
  }, [])

  // ── เลขที่เงินเดือน (users.salary_id) — ถ้ายังไม่มี บังคับกรอกก่อนดูข้อมูล/พิมพ์สลิป ──
  const [salaryId,        setSalaryId]        = useState<number | null | undefined>(undefined) // undefined = กำลังโหลด
  const [salaryModalOpen, setSalaryModalOpen] = useState(false)
  const [salaryInput,     setSalaryInput]     = useState('')
  const [savingSalaryId,  setSavingSalaryId]  = useState(false)
  const hasSalaryId = salaryId != null

  useEffect(() => {
    fetch('/api/v1/users/me/salary-id')
      .then(r => r.json())
      .then(json => {
        if (!json.success) { setSalaryId(null); return }
        const id = json.data?.salary_id ?? null
        setSalaryId(id)
        if (id == null) setSalaryModalOpen(true) // ยังไม่มี → เปิด modal ให้กรอกทันที
      })
      .catch(() => { setSalaryId(null); message.error('ไม่สามารถตรวจสอบเลขที่เงินเดือนได้') })
  }, [message])

  const saveSalaryId = async () => {
    const val = salaryInput.trim()
    if (!/^\d+$/.test(val)) { message.warning('กรุณากรอกเลขที่เงินเดือนเป็นตัวเลข'); return }
    setSavingSalaryId(true)
    try {
      const res = await fetch('/api/v1/users/me/salary-id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salary_id: Number(val) }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        message.error(json.message || 'บันทึกเลขที่เงินเดือนไม่สำเร็จ')
        return
      }
      setSalaryId(json.data.salary_id)
      setSalaryModalOpen(false)
      message.success('บันทึกเลขที่เงินเดือนเรียบร้อย')
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setSavingSalaryId(false)
    }
  }

  // ── ข้อมูลเงินเดือนจริงจาก API (salarydb: dgpn_payrollmt + cpayroll) ──────
  const [years,       setYears]       = useState<number[]>([])          // ปี พ.ศ. ที่มีข้อมูล
  const [year,        setYear]        = useState<number | null>(null)   // ปี พ.ศ. ที่เลือก
  const [months,      setMonths]      = useState<MonthSummary[]>([])
  const [payProfile,  setPayProfile]  = useState<PayrollProfile | null>(null)
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => {
    if (!hasSalaryId) return
    setDataLoading(true)
    const q = year != null ? `?year=${year}` : ''
    fetch(`/api/v1/accounting/salary/summary${q}`)
      .then(r => r.json())
      .then(json => {
        if (!json.success) {
          message.error(json.message || 'ไม่สามารถโหลดข้อมูลเงินเดือนได้')
          return
        }
        setYears(json.data.years ?? [])
        setMonths(json.data.months ?? [])
        setPayProfile(json.data.profile ?? null)
        // ครั้งแรก (ยังไม่เลือกปี) backend เลือกปีล่าสุดให้ — sync กลับเข้า state
        if (json.data.year != null && json.data.year !== year) setYear(json.data.year)
      })
      .catch(() => message.error('ไม่สามารถโหลดข้อมูลเงินเดือนได้'))
      .finally(() => setDataLoading(false))
  }, [hasSalaryId, year, message])

  // ── สลิป PDF (โหลดรายละเอียดจริงต่องวด) ───────────────────────────────────
  const [pdfOpen,     setPdfOpen]     = useState(false)
  const [slipMt,      setSlipMt]      = useState<string>('')
  const [slipData,    setSlipData]    = useState<SalarySlipData | null>(null)
  const [slipLoading, setSlipLoading] = useState(false)

  const openSlip = useCallback(async (mt: string) => {
    if (!hasSalaryId) {
      message.warning('กรุณาระบุเลขที่เงินเดือนก่อนดูสลิป')
      setSalaryModalOpen(true)
      return
    }
    setSlipMt(mt)
    setSlipData(null)
    setSlipLoading(true)
    setPdfOpen(true)
    try {
      const res = await fetch(`/api/v1/accounting/salary/slip/${mt}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        message.error(json.message || 'ไม่สามารถโหลดข้อมูลสลิปได้')
        setPdfOpen(false)
        return
      }
      const d = json.data
      const p: PayrollProfile | null = d.profile
      setSlipData({
        employee: {
          id:          profile.username || String(salaryId),
          name:        profile.name || (p ? `${p.fname} ${p.lname}` : '—'),
          position:    profile.position,
          department:  profile.department,
          staffType:   profile.staffType,
          bankAccount: p?.accno ?? '',
          bankName:    p?.bank ? `ธนาคาร${p.bank}${p.bankbranch ? ` สาขา${p.bankbranch}` : ''}` : '',
        },
        monthLabel: `${THAI_MONTHS[Number(mt.slice(4, 6))]} พ.ศ. ${mt.slice(0, 4)}`,
        payDate: mtToPayDate(mt),
        earnings:   (d.earnings   as SlipItem[]).map(i => ({ label: i.label, amount: i.amount })),
        deductions: (d.deductions as SlipItem[]).map(i => ({ label: i.label, amount: i.amount })),
        totalEarnings:   d.total_earnings,
        totalDeductions: d.total_deductions,
        netSalary:       d.net,
      })
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
      setPdfOpen(false)
    } finally {
      setSlipLoading(false)
    }
  }, [hasSalaryId, message, profile, salaryId])

  // ── สรุปยอด ────────────────────────────────────────────────────────────────
  const latest = months[0]
  const previous = months[1]
  const changeVsPrev = latest && previous ? latest.net - previous.net : 0

  const yearSummary = useMemo(() =>
    months.reduce(
      (acc, m) => {
        acc.earnings += m.income
        acc.deductions += m.deduction
        acc.net += m.net
        return acc
      },
      { earnings: 0, deductions: 0, net: 0 }
    ), [months])

  // Stats
  const stats = [
    {
      title: 'เงินเดือนล่าสุด',
      value: latest ? formatCurrency(latest.net) : '—',
      suffix: 'บาท',
      icon: <FaWallet />,
      color: '#0284c7',
      footnote: latest ? mtToLabel(latest.mt) : '',
    },
    {
      title: 'เทียบเดือนก่อน',
      value: changeVsPrev === 0 ? '—' : `${changeVsPrev > 0 ? '+' : ''}${formatCurrency(changeVsPrev)}`,
      suffix: 'บาท',
      icon: changeVsPrev >= 0 ? <RiseOutlined /> : <FallOutlined />,
      color: changeVsPrev >= 0 ? '#16a34a' : '#ef4444',
      footnote: previous ? `vs ${THAI_MONTHS[Number(previous.mt.slice(4, 6))]}` : '',
    },
    {
      title: `รายได้รวมปี ${year ?? ''}`,
      value: formatCurrency(yearSummary.earnings),
      suffix: 'บาท',
      icon: <FaMoneyBillWave />,
      color: '#16a34a',
      footnote: `${months.length} งวด`,
    },
    {
      title: `หักรวมปี ${year ?? ''}`,
      value: formatCurrency(yearSummary.deductions),
      suffix: 'บาท',
      icon: <FaRegMoneyBillAlt />,
      color: '#d97706',
      footnote: 'ตามรายการหักจริง',
    },
  ]

  // Table columns
  const columns = [
    {
      title: 'งวดเงินเดือน', key: 'month', width: 200,
      render: (_: any, r: MonthSummary) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{mtToLabel(r.mt)}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>จ่าย {mtToPayDate(r.mt)}</Text>
        </div>
      ),
    },
    {
      title: 'รายได้รวม', key: 'earnings', align: 'right' as const, width: 140,
      render: (_: any, r: MonthSummary) => (
        <Text style={{ color: '#16a34a', fontSize: 14 }}>{formatCurrency(r.income)}</Text>
      ),
    },
    {
      title: 'รายการหัก', key: 'deductions', align: 'right' as const, width: 140,
      render: (_: any, r: MonthSummary) => (
        <Text style={{ color: '#ef4444', fontSize: 14 }}>{formatCurrency(r.deduction)}</Text>
      ),
    },
    {
      title: 'เงินสุทธิ', key: 'net', align: 'right' as const, width: 160,
      render: (_: any, r: MonthSummary) => (
        <Text strong style={{ color: '#0284c7', fontSize: 16 }}>{formatCurrency(r.net)}</Text>
      ),
    },
    {
      title: 'พิมพ์', key: 'action', align: 'center' as const, width: 130, fixed: 'right' as const,
      render: (_: any, r: MonthSummary) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => openSlip(r.mt)}
          style={{ backgroundColor: '#006a5a' }}
        >
          ดูสลิป
        </Button>
      ),
    },
  ]

  return (
    <div className="min-h-dvh bg-app-bg text-app-text" style={{ minHeight: '100dvh' }}>
      <Navbar />
      <div className="p-4 md:p-8 max-w-350 mx-auto">

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
                  {payProfile?.bank ? `ธนาคาร${payProfile.bank}${payProfile.bankbranch ? ` สาขา${payProfile.bankbranch}` : ''}` : 'ยังไม่ระบุ'}
                </div>
                <div style={{ color: '#0f172a', fontFamily: 'monospace', fontSize: 15, fontWeight: 600 }}>
                  {payProfile?.accno || '—'}
                </div>
              </div>
            </Col>
          </Row>
        </Card>

        {/* ── ยังไม่มีเลขที่เงินเดือน → ล็อกการดูข้อมูลทั้งหมด ── */}
        {!hasSalaryId ? (
          <Card style={{ borderRadius: 12, border: '1px dashed var(--app-border-strong)' }}>
            {salaryId === undefined ? (
              <div className="py-16 flex justify-center"><Spin size="large" /></div>
            ) : (
              <div className="py-12 flex flex-col items-center gap-3 text-center">
                <LockOutlined style={{ fontSize: 44, color: '#d97706' }} />
                <Title level={4} style={{ margin: 0 }}>ยังไม่ได้ระบุเลขที่เงินเดือน</Title>
                <Text type="secondary" style={{ maxWidth: 420 }}>
                  กรุณาระบุเลขที่เงินเดือนของท่านก่อน จึงจะสามารถดูข้อมูลเงินเดือนและพิมพ์สลิปได้
                </Text>
                <Button
                  type="primary"
                  size="large"
                  icon={<IdcardOutlined />}
                  onClick={() => setSalaryModalOpen(true)}
                  style={{ backgroundColor: '#006a5a', fontWeight: 600 }}
                >
                  ระบุเลขที่เงินเดือน
                </Button>
              </div>
            )}
          </Card>
        ) : (
        <Spin spinning={dataLoading}>
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
                    สลิปเงินเดือน · {mtToLabel(latest.mt)}
                  </Text>
                </div>
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic
                      title={<Text type="secondary" style={{ fontSize: 12 }}>รายได้รวม</Text>}
                      value={latest.income}
                      precision={2}
                      styles={{ content: { color: '#16a34a', fontSize: 18 } }}
                      prefix="฿"
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title={<Text type="secondary" style={{ fontSize: 12 }}>รายการหัก</Text>}
                      value={latest.deduction}
                      precision={2}
                      styles={{ content: { color: '#ef4444', fontSize: 18 } }}
                      prefix="฿"
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title={<Text type="secondary" style={{ fontSize: 12 }}>เงินสุทธิ</Text>}
                      value={latest.net}
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
                    onClick={() => openSlip(latest.mt)}
                    style={{ backgroundColor: '#006a5a', color: '#fff', border: 'none', fontWeight: 600 }}
                  >
                    ดูสลิปเดือนล่าสุด
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    size="large"
                    onClick={() => openSlip(latest.mt)}
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
                  {months.length} งวด
                </Tag>
              </div>
              <div className="flex items-center gap-2">
                <Text type="secondary" style={{ fontSize: 13 }}>ปี:</Text>
                <Select
                  value={year}
                  onChange={(v) => setYear(v)}
                  options={years.map(y => ({ value: y, label: `พ.ศ. ${y}` }))}
                  style={{ width: 150 }}
                  placeholder="เลือกปี"
                />
              </div>
            </div>
          </div>

          {months.length === 0 ? (
            <Empty description={dataLoading ? 'กำลังโหลด...' : 'ไม่พบข้อมูลเงินเดือนในปีนี้'} style={{ padding: 60 }} />
          ) : (
            <Table
              columns={columns}
              dataSource={months}
              rowKey="mt"
              pagination={false}
              scroll={{ x: 900 }}
              size="middle"
            />
          )}
        </Card>
        </Spin>
        )}

        {/* ── Modal กรอกเลขที่เงินเดือน ── */}
        <Modal
          title={
            <Space>
              <IdcardOutlined style={{ color: '#006a5a' }} />
              <span>ระบุเลขที่เงินเดือน</span>
            </Space>
          }
          open={salaryModalOpen}
          onCancel={() => setSalaryModalOpen(false)}
          onOk={saveSalaryId}
          okText="บันทึก"
          cancelText="ไว้ภายหลัง"
          confirmLoading={savingSalaryId}
          okButtonProps={{ disabled: !/^\d+$/.test(salaryInput.trim()), style: { backgroundColor: '#006a5a' } }}
          mask={{ closable: false }}
          destroyOnHidden
        >
          <div className="flex flex-col gap-3 py-2">
            <Text type="secondary" style={{ fontSize: 13 }}>
              ระบบยังไม่มีเลขที่เงินเดือนของท่าน กรุณากรอกเลขที่เงินเดือน (ตามเอกสารการเงิน)
              เพื่อใช้ดูข้อมูลเงินเดือนและพิมพ์สลิป — หากต้องการแก้ไขภายหลัง
              ทำได้ที่เมนู บัญชีผู้ใช้ → ตั้งค่าบัญชี
            </Text>
            <Input
              size="large"
              placeholder="เช่น 12345"
              inputMode="numeric"
              maxLength={10}
              value={salaryInput}
              onChange={e => setSalaryInput(e.target.value.replace(/\D/g, ''))}
              onPressEnter={saveSalaryId}
              prefix={<IdcardOutlined style={{ color: 'var(--app-text-3)' }} />}
              autoFocus
            />
          </div>
        </Modal>

        {/* ── PDF Modal ── */}
        <Modal
          title={
            <Space>
              <FilePdfOutlined style={{ color: '#006a5a' }} />
              <span>สลิปเงินเดือน · {profile.name}</span>
              {slipMt && <Tag color="#006a5a">{mtToLabel(slipMt)}</Tag>}
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
            {slipLoading || !slipData ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
                <Spin size="large" />
                <Text type="secondary">กำลังโหลดข้อมูลสลิปเงินเดือน...</Text>
              </div>
            ) : (
              <SalarySlipPDFViewer data={slipData} />
            )}
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
