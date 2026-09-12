'use client'
import React, { useState, useEffect, useMemo } from 'react'
import {
  ConfigProvider, theme, Typography, Breadcrumb, Card, Alert, App,
  Input, DatePicker, Button, Space, Table, Form, Modal, Row, Col, InputNumber,
  Segmented, Statistic, Tag, Progress, Select, Tooltip, Tabs, Descriptions, Spin,
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, SearchOutlined, CalendarOutlined,
  ReloadOutlined, QrcodeOutlined, PrinterOutlined, FilePdfOutlined,
} from '@ant-design/icons'
import dynamic from 'next/dynamic'
import { FaCalculator } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import { useThemeMode } from '@/app/components/ThemeProvider'
import dayjs, { Dayjs } from 'dayjs'
import Cookies from 'js-cookie'
import {
  buildSchedule, accumulatedAsOf, expenseBetween, currentFyBE, money,
  type ProrateMode, type ScheduleRow, type DepreciationParams,
} from './calc'
import { CLASS_OPTIONS, classByNo, type AssetClass } from './assetClasses'
import { computeGfmis, type GfmisFyRow } from './gfmis'
import { buildFyReport, buildGfmisReport } from './report'
import type { AssetRegisterData } from '@/app/components/AssetRegisterPDF'

// โหลด PDFViewer เฉพาะฝั่งเบราว์เซอร์ — @react-pdf/renderer ทำงานกับ SSR ไม่ได้
const AssetRegisterPDFViewer = dynamic(() => import('@/app/components/AssetRegisterPDF'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 560, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <Spin size="large" />
      <Text type="secondary">กำลังสร้างรายงาน...</Text>
    </div>
  ),
})

const { RangePicker } = DatePicker
const { Title, Text } = Typography

export interface DepreciationViewProps {
  /** endpoint ค้นหาครุภัณฑ์ เช่น /api/v1/equipment/search */
  apiPath: string
  /** แปลง assetcatid ของทะเบียนนั้น ๆ เป็นหมวดตามตารางที่ ๑ (แต่ละระบบใช้รหัสคนละชุด) */
  resolveClass: (assetcatid: number | null | undefined) => AssetClass | null
  /** ข้อความต่อท้ายหัวข้อ เช่น '(ระบบใหม่ V2)' */
  titleSuffix?: string
  /** ชื่อแหล่งข้อมูล แสดงใต้หัวข้อและในกล่องค้นหา */
  sourceLabel: string
}

// โครงสร้างครุภัณฑ์จาก /api/v1/equipment/search — ชุดเดียวกับที่หน้าแจ้งซ่อมใช้
interface EquipmentAsset {
  noid: string
  names: string
  models: string
  locates: string
  fy: string
  docno: string
  notes: string
  companyname: string
  companyaddress: string | null  // address01 จากตาราง company
  companytel: string | null      // tel จากตาราง company
  moneytype: string | null       // kmoneydesc — ประเภทเงิน
  acquiremethod: string | null   // tmoneydesc — วิธีได้มา
  perunits: number | null
  receive: string | null    // วันที่รับ (YYYY-MM-DD — backend แปลงเป็นสตริงแล้ว)
  expired: number | null    // อายุการใช้งาน (ปี)
  deprec: number | null     // อัตราค่าเสื่อมต่อปี (%) ที่บันทึกไว้ในทะเบียน
  assetcatid: number | null // ประเภทสินทรัพย์ (ตาราง assetcat)
  assetcatname: string | null
  subtypename: string | null    // ประเภทครุภัณฑ์ จาก hsro_subtype
}

const PageContent = ({ apiPath, resolveClass, titleSuffix, sourceLabel }: DepreciationViewProps) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [assetNo, setAssetNo] = useState('')
  const [selected, setSelected] = useState<EquipmentAsset | null>(null)

  // ตัวแปรของการคำนวณ — ปรับได้ให้ตรงกับหลักเกณฑ์ที่หน่วยงานใช้
  const [residual, setResidual] = useState(1)
  const [mode, setMode] = useState<ProrateMode>('daily')

  // หมวดตามตารางที่ ๑ และอายุการใช้งานที่จะใช้คำนวณจริง
  // ตั้งต้นจากทะเบียน แต่แก้เองได้ เพราะข้อมูลดิบบางรายการลงหมวดไว้ไม่ตรง
  const [classNo, setClassNo] = useState<string | null>(null)
  const [lifeYears, setLifeYears] = useState<number | null>(null)

  // โหมดว่าจะคิดค่าเสื่อม "ถึงเมื่อไร"
  //   today  = ถึงวันนี้ · date = ถึงวันที่เลือก · fyEnd = สิ้นปีงบที่เลือก · period = เฉพาะช่วงที่เลือก
  type AsOfMode = 'today' | 'date' | 'fyEnd' | 'period'
  const [asOfMode, setAsOfMode] = useState<AsOfMode>('today')
  const [asOfDate, setAsOfDate] = useState<Dayjs>(dayjs())
  const [asOfFy, setAsOfFy] = useState<number>(currentFyBE())

  // ผู้จัดทำรายงาน = คนที่กำลังใช้งานอยู่ (คุกกี้ user_data.name = pname+fname+lname)
  // อ่านตอน render ได้เลย — js-cookie คืน undefined ฝั่ง server และค่านี้โผล่เฉพาะใน PDF
  // จึงไม่มีปัญหา hydration และไม่ต้องพึ่ง effect ที่ทำให้ render ซ้ำ
  const preparedBy = useMemo(() => {
    try {
      const u = JSON.parse(Cookies.get('user_data') || '{}')
      return { name: u?.name ?? '', position: u?.position_name ?? '' }
    } catch { return {} as { name?: string; position?: string } }
  }, [])

  // แท็บที่เปิดอยู่ — ใช้เลือกว่าจะพิมพ์รายงานด้วยวิธีคิดแบบไหน
  const [activeTab, setActiveTab] = useState<'fy' | 'gfmis'>('fy')
  const [pdfOpen, setPdfOpen] = useState(false)

  // ── กล่องค้นหาครุภัณฑ์ (ยกรูปแบบมาจากหน้าแจ้งซ่อมคอมพิวเตอร์) ──
  const [assetModalOpen, setAssetModalOpen] = useState(false)
  const [assetSearch, setAssetSearch] = useState('')
  const [assetResults, setAssetResults] = useState<EquipmentAsset[]>([])
  const [assetLoading, setAssetLoading] = useState(false)

  useEffect(() => {
    if (!assetModalOpen) return
    const t = setTimeout(() => {
      setAssetLoading(true)
      fetch(`${apiPath}?keyword=${encodeURIComponent(assetSearch.trim())}`)
        .then(r => r.json())
        .then(json => { if (Array.isArray(json.data)) setAssetResults(json.data) })
        .catch(() => {})
        .finally(() => setAssetLoading(false))
    }, 350)
    return () => clearTimeout(t)
  }, [assetSearch, assetModalOpen, apiPath])

  const handleSelectAsset = (asset: EquipmentAsset) => {
    setSelected(asset)
    setAssetNo(asset.noid)
    form.setFieldsValue({
      assetNo: asset.noid,
      assetName: asset.names,
      assetModel: asset.models,
      assetCompany: asset.companyname,
      assetLocate: asset.locates,
      assetFy: asset.fy,
      assetPrice: asset.perunits ?? undefined,
      assetDocno: asset.docno,
      assetReceive: asset.receive ?? '',
    })
    setClassNo(resolveClass(asset.assetcatid)?.no ?? null)
    setLifeYears(asset.expired != null ? Number(asset.expired) : null)
    setAssetModalOpen(false)
    setAssetSearch('')
    message.success(`เลือกครุภัณฑ์ ${asset.noid} แล้ว`)
  }

  const hasFilter = dateRange !== null || assetNo.trim() !== '' || selected !== null
  const clearAll = () => {
    setDateRange(null)
    setAssetNo('')
    setSelected(null)
    setClassNo(null)
    setLifeYears(null)
    form.resetFields()
  }

  // ── ผลการคำนวณ ──
  const result = useMemo(() => {
    if (!selected?.receive || !selected.perunits || !lifeYears) return null
    return buildSchedule({
      cost: Number(selected.perunits),
      lifeYears: Number(lifeYears),
      receive: selected.receive,
      residual,
      mode,
    })
  }, [selected, lifeYears, residual, mode])

  const params: DepreciationParams | null = useMemo(() => {
    if (!selected?.receive || !selected.perunits || !lifeYears) return null
    return {
      cost: Number(selected.perunits),
      lifeYears: Number(lifeYears),
      receive: selected.receive,
      residual,
      mode,
    }
  }, [selected, lifeYears, residual, mode])

  const thisFy = currentFyBE()

  // วันที่ที่จะคิดถึง ตามโหมดที่เลือก (โหมด period ใช้วันสุดท้ายของช่วง)
  const asOfIso = useMemo(() => {
    if (asOfMode === 'today') return dayjs().format('YYYY-MM-DD')
    if (asOfMode === 'date') return asOfDate.format('YYYY-MM-DD')
    if (asOfMode === 'fyEnd') return dayjs(`${asOfFy - 543}-09-30`).format('YYYY-MM-DD')
    return dateRange ? dateRange[1].format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')
  }, [asOfMode, asOfDate, asOfFy, dateRange])

  const asOf = useMemo(
    () => (params ? accumulatedAsOf(params, asOfIso) : null),
    [params, asOfIso],
  )

  // ค่าเสื่อมเฉพาะช่วง (โหมด period) — ใช้ปิดงบรายเดือน/ไตรมาส
  const periodExpense = useMemo(() => {
    if (asOfMode !== 'period' || !params || !dateRange) return null
    return expenseBetween(params, dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD'))
  }, [asOfMode, params, dateRange])
  // ── GFMIS: เกณฑ์นับเดือน ──
  // ยอดต่อเดือนคิดจากราคาทุนเต็ม แต่หยุดที่ราคาซาก — เดือนสุดท้ายจึงเหลือมูลค่าสุทธิ 1 บาท
  const gfmis = useMemo(() => {
    if (!selected?.receive || !selected.perunits || !lifeYears) return null
    return computeGfmis(
      { cost: Number(selected.perunits), lifeYears: Number(lifeYears), receive: selected.receive, residual },
      asOfIso,
    )
  }, [selected, lifeYears, asOfIso, residual])

  // แถวของปีงบปัจจุบัน ใช้สรุปยอด ณ ปัจจุบัน (ถ้าเลยอายุแล้วให้ใช้แถวสุดท้าย)
  const currentRow: ScheduleRow | null = useMemo(() => {
    if (!result) return null
    return result.rows.find(r => r.fyBE === thisFy)
      ?? (result.rows.length && result.rows[result.rows.length - 1].fyBE < thisFy
        ? result.rows[result.rows.length - 1]
        : null)
  }, [result, thisFy])

  // ── ข้อมูลรายงานทะเบียนคุมทรัพย์สิน — ออกตามวิธีคิดของแท็บที่เปิดอยู่ ──
  const reportData: AssetRegisterData | null = useMemo(() => {
    if (!selected || !lifeYears) return null
    const asset = {
      noid: selected.noid, names: selected.names, models: selected.models,
      locates: selected.locates, fy: selected.fy, docno: selected.docno,
      notes: selected.notes, companyname: selected.companyname,
      companyaddress: selected.companyaddress, companytel: selected.companytel,
      moneytype: selected.moneytype, acquiremethod: selected.acquiremethod,
      perunits: selected.perunits, receive: selected.receive, expired: selected.expired,
      assetcatname: selected.assetcatname, subtypename: selected.subtypename,
    }
    if (activeTab === 'gfmis') {
      return gfmis ? buildGfmisReport({ asset, gfmis, lifeYears, currentFyBE: thisFy, preparedBy }) : null
    }
    return result
      ? buildFyReport({ asset, result, lifeYears, currentFyBE: thisFy, preparedBy })
      : null
  }, [selected, lifeYears, activeTab, gfmis, result, thisFy, preparedBy])

  const cls: AssetClass | null = classByNo(classNo)
  const registryClass = resolveClass(selected?.assetcatid)

  // แก้หมวด/อายุต่างจากทะเบียนหรือยัง — ต้องบอกให้ชัดว่าผลลัพธ์ไม่ได้มาจากข้อมูลดิบล้วน ๆ
  const classChanged = registryClass != null && classNo != null && classNo !== registryClass.no
  const lifeChanged = selected?.expired != null && lifeYears != null
    && Number(lifeYears) !== Number(selected.expired)

  // อายุที่จะใช้คำนวณ อยู่ในช่วงของหมวดที่เลือกไหม
  const lifeOutOfRange = cls != null && lifeYears != null
    && (lifeYears < cls.minYears || lifeYears > cls.maxYears)

  // ทะเบียนบันทึกอัตราไว้ไม่ตรงกับ 100/อายุ = ข้อมูลต้นทางเพี้ยน ควรเตือนให้เห็น
  const rateMismatch = selected?.expired && selected.deprec != null
    && Math.abs(100 / Number(selected.expired) - Number(selected.deprec)) > 0.51

  // เลือกหมวดใหม่แล้วอายุเดิมหลุดช่วง ให้ดึงกลับมาที่ค่าต่ำสุดของหมวดนั้น
  const handleClassChange = (no: string) => {
    setClassNo(no)
    const next = classByNo(no)
    if (next && lifeYears != null && (lifeYears < next.minYears || lifeYears > next.maxYears)) {
      setLifeYears(next.minYears)
    }
  }

  const labelOf = (t: string) => <span style={{ color: 'var(--app-text-2)' }}>{t}</span>

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--app-bg)' }}>
      <Navbar />
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 20px 48px' }}>
        <Breadcrumb className="mb-6" items={[
          { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
          { href: '/general', title: <><FileTextOutlined /> งานบริหารงานทั่วไป</> },
          { title: 'งานพัสดุ' },
          { title: `คำนวณค่าเสื่อมราคา${titleSuffix ? ` ${titleSuffix}` : ''}` },
        ]} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <FaCalculator style={{ fontSize: 26, color: '#FF6500' }} />
          <Title level={3} style={{ margin: 0 }}>คำนวณค่าเสื่อมราคาครุภัณฑ์{titleSuffix ? ` ${titleSuffix}` : ''}</Title>
        </div>
        <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
          วิธีเส้นตรง (straight-line) ตามปีงบประมาณไทย 1 ต.ค. – 30 ก.ย. · ข้อมูลจาก{sourceLabel}
        </Text>

        {/* ── ค้นหา + ข้อมูลครุภัณฑ์ ── */}
        <Card style={{ borderRadius: 14, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label={labelOf('เลขครุภัณฑ์')}>
                  <Space.Compact style={{ width: '100%' }}>
                    <Form.Item name="assetNo" noStyle>
                      <Input
                        placeholder="เช่น IT-67-001"
                        style={{ fontFamily: 'monospace' }}
                        value={assetNo}
                        onChange={e => setAssetNo(e.target.value)}
                        allowClear
                      />
                    </Form.Item>
                    <Button
                      icon={<QrcodeOutlined />}
                      onClick={() => { setAssetSearch(''); setAssetModalOpen(true) }}
                      style={{ color: '#a78bfa', fontWeight: 600 }}
                    >
                      ค้นหา
                    </Button>
                  </Space.Compact>
                </Form.Item>
              </Col>

              <Col xs={24} md={16}>
                <Form.Item label={<span style={{ visibility: 'hidden' }}>ล้าง</span>}>
                  {hasFilter && (
                    <Button icon={<ReloadOutlined />} onClick={clearAll}>ล้างข้อมูล</Button>
                  )}
                </Form.Item>
              </Col>
            </Row>

            {selected && (
              <>
                <div style={{
                  borderTop: '1px solid var(--app-border)',
                  margin: '4px 0 16px', paddingTop: 16,
                  color: 'var(--app-text-3)', fontSize: 12, fontWeight: 600,
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                }}>
                  ข้อมูลครุภัณฑ์
                </div>

                <Row gutter={16}>
                  <Col xs={24} md={10}>
                    <Form.Item name="assetName" label={labelOf('ชื่ออุปกรณ์')}>
                      <Input readOnly />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={7}>
                    <Form.Item name="assetModel" label={labelOf('รุ่น')}>
                      <Input readOnly />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={7}>
                    <Form.Item name="assetCompany" label={labelOf('บริษัท')}>
                      <Input readOnly />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} md={6}>
                    <Form.Item name="assetLocate" label={labelOf('สถานที่')}>
                      <Input readOnly />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={5}>
                    <Form.Item name="assetReceive" label={labelOf('วันที่รับ')}>
                      <Input readOnly style={{ fontFamily: 'monospace' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={3}>
                    <Form.Item name="assetFy" label={labelOf('ปีงบ')}>
                      <Input readOnly style={{ fontFamily: 'monospace' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={4}>
                    <Form.Item
                      label={
                        <Space size={6}>
                          {labelOf('อายุใช้งาน (ปี)')}
                          {lifeChanged && <Tag color="orange" style={{ margin: 0 }}>แก้แล้ว</Tag>}
                        </Space>
                      }
                      extra={selected?.expired != null && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          ทะเบียนบันทึก {String(selected.expired)} ปี
                        </Text>
                      )}
                    >
                      <InputNumber
                        min={1}
                        max={99}
                        value={lifeYears ?? undefined}
                        onChange={v => setLifeYears(v == null ? null : Number(v))}
                        style={{ width: '100%', fontFamily: 'monospace' }}
                        status={lifeOutOfRange ? 'warning' : undefined}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={4}>
                    <Form.Item name="assetPrice" label={labelOf('ราคา/หน่วย (บาท)')}>
                      <InputNumber
                        readOnly
                        style={{ width: '100%', fontFamily: 'monospace' }}
                        formatter={v => v ? money(Number(v)) : ''}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={3}>
                    <Form.Item name="assetDocno" label={labelOf('เลขที่เอกสาร')}>
                      <Input readOnly />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={11}>
                    <Form.Item
                      label={
                        <Space size={6}>
                          {labelOf('ประเภทสินทรัพย์ (ตารางที่ ๑)')}
                          {classChanged && <Tag color="orange" style={{ margin: 0 }}>เลือกเอง</Tag>}
                          <Tooltip title="ข้อมูลในทะเบียนบางรายการลงหมวดไว้ไม่ตรง เลือกหมวดที่ถูกต้องได้เอง แล้วช่วงอายุจะเปลี่ยนตาม">
                            <Text type="secondary" style={{ fontSize: 11, cursor: 'help' }}>(?)</Text>
                          </Tooltip>
                        </Space>
                      }
                      extra={
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {selected?.assetcatname
                            ? `ทะเบียนลงหมวดไว้: ${selected.assetcatname}`
                            : 'ทะเบียนไม่ได้ระบุหมวด'}
                          {cls && ` · หลักเกณฑ์กำหนด ${cls.minYears}–${cls.maxYears} ปี`}
                        </Text>
                      }
                    >
                      <Select
                        showSearch
                        allowClear
                        placeholder="เลือกประเภทสินทรัพย์"
                        value={classNo ?? undefined}
                        onChange={v => handleClassChange(v)}
                        optionFilterProp="label"
                        options={CLASS_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </>
            )}
          </Form>
        </Card>

        {/* ── ผลการคำนวณ ── */}
        {selected && !result && (
          <Alert
            type="warning"
            showIcon
            title="คำนวณไม่ได้ — ข้อมูลในทะเบียนไม่ครบ"
            description={`ต้องมีครบทั้งราคาต่อหน่วย วันที่รับ และอายุการใช้งาน (ครุภัณฑ์นี้: ราคา ${selected.perunits ?? '-'} · วันที่รับ ${selected.receive ?? '-'} · อายุ ${selected.expired ?? '-'} ปี)`}
          />
        )}

        {result && currentRow && (
          <>
            {lifeOutOfRange && cls && (
              <Alert
                type="warning"
                showIcon
                className="mb-4"
                title="อายุการใช้งานไม่อยู่ในช่วงที่หลักเกณฑ์กำหนด"
                description={`อายุ ${lifeYears} ปี อยู่นอกช่วง ${cls.minYears}–${cls.maxYears} ปี ที่ตารางที่ ๑ ข้อ ${cls.no} กำหนดไว้ — ระบบยังคำนวณให้ตามค่านี้ แต่ควรตรวจสอบกับงานพัสดุ`}
              />
            )}

            {(classChanged || lifeChanged) && (
              <Alert
                type="info"
                showIcon
                className="mb-4"
                title="ผลลัพธ์นี้คำนวณจากค่าที่แก้เอง ไม่ใช่ค่าในทะเบียน"
                description={[
                  classChanged && registryClass ? `หมวด: ทะเบียนลงไว้ "${registryClass.name}" → ใช้ "${cls?.name}"` : null,
                  lifeChanged ? `อายุใช้งาน: ทะเบียนบันทึก ${String(selected?.expired)} ปี → ใช้ ${lifeYears} ปี` : null,
                ].filter(Boolean).join(' · ')}
              />
            )}

            {rateMismatch && (
              <Alert
                type="warning"
                showIcon
                className="mb-4"
                title="อัตราค่าเสื่อมในทะเบียนไม่ตรงกับอายุการใช้งาน"
                description={`ทะเบียนบันทึกอัตราไว้ ${selected?.deprec}% แต่อายุ ${selected?.expired} ปี ควรเป็น ${(100 / Number(selected?.expired)).toFixed(2)}% — หน้านี้คำนวณจากอายุการใช้งาน แนะนำให้ตรวจสอบข้อมูลต้นทาง`}
              />
            )}

            {/* ── เงื่อนไขการคำนวณ ── */}
            <Card style={{ borderRadius: 14, marginBottom: 16 }} styles={{ body: { padding: 14 } }}>
              <Space wrap size={16} align="center">
                <Space size={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>คำนวณถึง</Text>
                  <Segmented
                    value={asOfMode}
                    onChange={v => setAsOfMode(v as typeof asOfMode)}
                    options={[
                      { label: 'วันนี้', value: 'today' },
                      { label: 'ระบุวันที่', value: 'date' },
                      { label: 'สิ้นปีงบ', value: 'fyEnd' },
                      { label: 'เฉพาะช่วง', value: 'period' },
                    ]}
                  />
                </Space>

                {asOfMode === 'date' && (
                  <DatePicker
                    value={asOfDate}
                    onChange={d => d && setAsOfDate(d)}
                    format="YYYY-MM-DD"
                    allowClear={false}
                    suffixIcon={<CalendarOutlined />}
                  />
                )}

                {asOfMode === 'fyEnd' && (
                  <Select
                    value={asOfFy}
                    onChange={setAsOfFy}
                    style={{ width: 150 }}
                    options={(result?.rows ?? []).map(r => ({
                      value: r.fyBE,
                      label: `ปีงบ ${r.fyBE}`,
                    }))}
                  />
                )}

                {asOfMode === 'period' && (
                  <RangePicker
                    value={dateRange}
                    onChange={dates => {
                      if (dates && dates[0] && dates[1]) setDateRange([dates[0], dates[1]])
                      else setDateRange(null)
                    }}
                    format="YYYY-MM-DD"
                    allowClear
                    presets={[
                      { label: 'เดือนนี้', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
                      { label: 'เดือนที่แล้ว', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
                      { label: 'ปีงบประมาณนี้', value: [dayjs(`${thisFy - 544}-10-01`), dayjs(`${thisFy - 543}-09-30`)] },
                    ]}
                  />
                )}

                <span style={{ borderLeft: '1px solid var(--app-border)', height: 20 }} />

                <Space size={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>ราคาซาก</Text>
                  <InputNumber
                    size="small" min={0} value={residual}
                    onChange={v => setResidual(Number(v ?? 0))}
                    style={{ width: 90 }}
                  />
                </Space>

                <Space size={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>คิดปีแรก</Text>
                  <Segmented
                    size="small" value={mode}
                    onChange={v => setMode(v as ProrateMode)}
                    options={[
                      { label: 'รายวัน', value: 'daily' },
                      { label: 'รายเดือน', value: 'monthly' },
                      { label: 'เต็มปี', value: 'full' },
                    ]}
                  />
                </Space>
              </Space>

              {asOfMode === 'period' && !dateRange && (
                <Alert
                  type="info" showIcon className="mt-3"
                  title="เลือกช่วงวันที่ที่ต้องการก่อน แล้วระบบจะคิดค่าเสื่อมเฉพาะช่วงนั้นให้"
                />
              )}
            </Card>

            {/* ── สรุปผล ── */}
            <Row gutter={[16, 16]} className="mb-4">
              <Col xs={12} md={6}>
                <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 16 } }}>
                  <Statistic title="ราคาทุน" value={Number(selected?.perunits)} precision={2} suffix="บาท" />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 16 } }}>
                  <Statistic
                    title={asOfMode === 'period' && dateRange
                      ? `ค่าเสื่อมในช่วง ${dateRange[0].format('DD/MM/YY')}–${dateRange[1].format('DD/MM/YY')}`
                      : `ค่าเสื่อมสะสม (ถึง ${asOfIso})`}
                    value={asOfMode === 'period' ? (periodExpense ?? 0) : (asOf?.accumulated ?? 0)}
                    precision={2}
                    suffix="บาท"
                    styles={{ content: { color: '#f59e0b' } }}
                  />
                  {asOfMode === 'period' && asOf && (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      สะสมถึงสิ้นช่วง {money(asOf.accumulated)} บาท
                    </Text>
                  )}
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 16 } }}>
                  <Statistic
                    title={`มูลค่าสุทธิ ณ ${asOfIso}`}
                    value={asOf?.nbv ?? 0}
                    precision={2}
                    suffix="บาท"
                    styles={{ content: { color: '#10b981' } }}
                  />
                  {asOf?.fullyDepreciated && <Tag style={{ marginTop: 4 }}>คิดค่าเสื่อมครบแล้ว</Tag>}
                  {asOf?.beforeStart && <Tag color="blue" style={{ marginTop: 4 }}>ยังไม่ถึงวันรับ</Tag>}
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 16 } }}>
                  <Statistic
                    title={`ค่าเสื่อมเต็มปี (อัตรา ${result.ratePercent.toFixed(2)}%)`}
                    value={result.perYear}
                    precision={2}
                    suffix="บาท"
                  />
                </Card>
              </Col>
            </Row>

            <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 16 } }}>
              <Tabs
                activeKey={activeTab}
                onChange={k => setActiveTab(k as 'fy' | 'gfmis')}
                tabBarExtraContent={
                  <Tooltip title={reportData
                    ? 'พิมพ์ทะเบียนคุมทรัพย์สินตามวิธีคิดของแท็บนี้'
                    : 'ข้อมูลยังไม่พอสำหรับออกรายงาน'}>
                    <Button
                      icon={<PrinterOutlined />}
                      onClick={() => setPdfOpen(true)}
                      disabled={!reportData}
                    >
                      พิมพ์รายงาน
                    </Button>
                  </Tooltip>
                }
                items={[
                  {
                    key: 'fy',
                    label: 'รายปีงบประมาณ (เกณฑ์รายวัน)',
                    children: (
                      <>
              <div style={{ marginBottom: 12 }}>
                <Progress
                  percent={Number(((currentRow.accumulated / result.depreciableBase) * 100).toFixed(1))}
                  strokeColor="#FF6500"
                  format={p => `คิดค่าเสื่อมไปแล้ว ${p}%`}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ครบอายุการใช้งาน {result.endDate} · ฐานที่นำมาคิด {money(result.depreciableBase)} บาท
                  (ราคาทุน {money(Number(selected?.perunits))} − ราคาซาก {money(residual)})
                </Text>
              </div>

              <Table
                dataSource={result.rows}
                rowKey="fyBE"
                size="small"
                pagination={false}
                scroll={{ x: 760 }}
                rowClassName={r => r.fyBE === thisFy ? 'depreciation-current-fy' : ''}
                columns={[
                  {
                    title: 'ปีงบประมาณ', dataIndex: 'fyBE', key: 'fyBE', width: 120,
                    render: (v: number) => (
                      <Space size={6}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{v}</span>
                        {v === thisFy && <Tag color="orange">ปีปัจจุบัน</Tag>}
                      </Space>
                    ),
                  },
                  {
                    title: 'ช่วงที่คิด', key: 'period', width: 210,
                    render: (_: unknown, r: ScheduleRow) => (
                      <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {r.from} → {r.to}
                      </Text>
                    ),
                  },
                  {
                    title: 'จำนวนวัน', dataIndex: 'days', key: 'days', width: 90, align: 'right' as const,
                    render: (v: number) => <span style={{ fontFamily: 'monospace' }}>{v}</span>,
                  },
                  {
                    title: 'ค่าเสื่อมปีนี้', dataIndex: 'amount', key: 'amount', width: 140, align: 'right' as const,
                    render: (v: number) => <span style={{ fontFamily: 'monospace' }}>{money(v)}</span>,
                  },
                  {
                    title: 'ค่าเสื่อมสะสม', dataIndex: 'accumulated', key: 'accumulated', width: 140, align: 'right' as const,
                    render: (v: number) => <span style={{ fontFamily: 'monospace', color: '#f59e0b' }}>{money(v)}</span>,
                  },
                  {
                    title: 'มูลค่าสุทธิ', dataIndex: 'nbv', key: 'nbv', width: 140, align: 'right' as const,
                    render: (v: number) => <span style={{ fontFamily: 'monospace', color: '#10b981' }}>{money(v)}</span>,
                  },
                ]}
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={3}>
                      <Text strong>รวม</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Text strong style={{ fontFamily: 'monospace' }}>
                        {money(result.rows.reduce((sum, r) => sum + r.amount, 0))}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} colSpan={2} align="right">
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        เหลือมูลค่าซาก {money(result.rows.length ? result.rows[result.rows.length - 1].nbv : residual)} บาท
                      </Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
                      </>
                    ),
                  },
                  {
                    key: 'gfmis',
                    label: 'แบบ GFMIS (เกณฑ์นับเดือน)',
                    children: gfmis ? (
                      <>
                        <Alert
                          type="info"
                          showIcon
                          className="mb-3"
                          title={`รับของวันที่ ${gfmis.receiveDay} — ${gfmis.startsNextMonth
                            ? 'อยู่ในช่วง 16–31 จึงยกยอดไปเริ่มคิดเดือนถัดไป'
                            : 'อยู่ในช่วง 1–15 จึงนับเดือนที่รับเป็นเดือนเต็ม'}`}
                          description={
                            <>
                              <div>
                                เริ่มคิด {gfmis.startMonth} ถึง {gfmis.endMonth} รวม {gfmis.totalMonths} เดือน
                                {' · '}เดือนละ {money(gfmis.perMonth)} บาท
                              </div>
                              <div>
                                คิดถึง {asOfIso} (วันที่ {gfmis.asOfDay}) — {gfmis.countsAsOfMonth
                                  ? `อยู่ในช่วง 16–31 จึงปัดขึ้นนับเดือนนั้นเต็มเดือน`
                                  : `อยู่ในช่วง 1–15 จึงยังไม่นับเดือนนั้น ยอดคงอยู่กับปีงบเดิม`}
                                {gfmis.lastCountedMonth && ` · เดือนสุดท้ายที่นับให้คือ ${gfmis.lastCountedMonth}`}
                              </div>
                            </>
                          }
                        />

                        <Row gutter={[16, 16]} className="mb-3">
                          <Col xs={12} md={6}>
                            <Card size="small" style={{ borderRadius: 12 }}>
                              <Statistic title="ใช้ไปแล้ว" value={gfmis.usedMonths} suffix="เดือน" />
                            </Card>
                          </Col>
                          <Col xs={12} md={6}>
                            <Card size="small" style={{ borderRadius: 12 }}>
                              <Statistic
                                title="ค่าเสื่อมที่ใช้ไปแล้ว"
                                value={gfmis.accumulated}
                                precision={2}
                                suffix="บาท"
                                styles={{ content: { color: '#f59e0b' } }}
                              />
                            </Card>
                          </Col>
                          <Col xs={12} md={6}>
                            <Card size="small" style={{ borderRadius: 12 }}>
                              <Statistic title="ยังไม่เกิด" value={gfmis.remainingMonths} suffix="เดือน" />
                            </Card>
                          </Col>
                          <Col xs={12} md={6}>
                            <Card size="small" style={{ borderRadius: 12 }}>
                              <Statistic
                                title="ค่าเสื่อมที่ยังไม่เกิด"
                                value={gfmis.remaining}
                                precision={2}
                                suffix="บาท"
                                styles={{ content: { color: '#10b981' } }}
                              />
                            </Card>
                          </Col>
                        </Row>

                        <Descriptions bordered size="small" column={{ xs: 1, md: 2 }} className="mb-3">
                          <Descriptions.Item label="สูตร">
                            <Text style={{ fontFamily: 'monospace' }}>
                              {money(Number(selected?.perunits))} ÷ {gfmis.totalMonths} เดือน = {money(gfmis.perMonth)} บาท/เดือน
                            </Text>
                          </Descriptions.Item>
                          <Descriptions.Item label="ค่าเสื่อมสะสม">
                            <Text style={{ fontFamily: 'monospace' }}>
                              {money(gfmis.perMonth)} × {gfmis.usedMonths} = {money(gfmis.accumulated)} บาท
                            </Text>
                          </Descriptions.Item>
                        </Descriptions>

                        <Table
                          dataSource={gfmis.rows}
                          rowKey="fyBE"
                          size="small"
                          pagination={false}
                          scroll={{ x: 700 }}
                          rowClassName={r => r.fyBE === thisFy ? 'depreciation-current-fy' : ''}
                          columns={[
                            {
                              title: 'ปีงบประมาณ', dataIndex: 'fyBE', key: 'fyBE', width: 120,
                              render: (v: number) => (
                                <Space size={6}>
                                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{v}</span>
                                  {v === thisFy && <Tag color="orange">ปีปัจจุบัน</Tag>}
                                </Space>
                              ),
                            },
                            {
                              title: 'เดือนที่คิด', key: 'period', width: 180,
                              render: (_: unknown, r: GfmisFyRow) => (
                                <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                                  {r.from} → {r.to}
                                </Text>
                              ),
                            },
                            {
                              title: 'จำนวนเดือน', dataIndex: 'months', key: 'months', width: 100, align: 'right' as const,
                              render: (v: number) => <span style={{ fontFamily: 'monospace' }}>{v}</span>,
                            },
                            {
                              title: 'ค่าเสื่อมปีนี้', dataIndex: 'amount', key: 'amount', width: 140, align: 'right' as const,
                              render: (v: number) => <span style={{ fontFamily: 'monospace' }}>{money(v)}</span>,
                            },
                            {
                              title: 'ค่าเสื่อมสะสม', dataIndex: 'accumulated', key: 'accumulated', width: 140, align: 'right' as const,
                              render: (v: number) => <span style={{ fontFamily: 'monospace', color: '#f59e0b' }}>{money(v)}</span>,
                            },
                            {
                              title: 'มูลค่าสุทธิ', dataIndex: 'nbv', key: 'nbv', width: 130, align: 'right' as const,
                              render: (v: number) => <span style={{ fontFamily: 'monospace', color: '#10b981' }}>{money(v)}</span>,
                            },
                          ]}
                        />
                      </>
                    ) : <Alert type="warning" showIcon title="คำนวณไม่ได้ — ข้อมูลไม่ครบ" />,
                  },
                ]}
              />
            </Card>
          </>
        )}
      </div>

      {/* ── ตัวอย่างรายงานก่อนพิมพ์ ── */}
      <Modal
        title={
          <Space>
            <FilePdfOutlined style={{ color: '#FF6500' }} />
            <span>
              ทะเบียนคุมทรัพย์สิน · {selected?.noid}
              {' · '}
              {activeTab === 'gfmis' ? 'เกณฑ์นับเดือน (GFMIS)' : 'เกณฑ์รายวัน (รายปีงบประมาณ)'}
            </span>
          </Space>
        }
        open={pdfOpen}
        onCancel={() => setPdfOpen(false)}
        footer={null}
        width="92%"
        styles={{ body: { padding: '16px 0 0', display: 'flex', flexDirection: 'column', minHeight: 600 } }}
        destroyOnHidden
      >
        {reportData && <AssetRegisterPDFViewer data={reportData} />}
      </Modal>

      {/* ── กล่องค้นหาครุภัณฑ์ ── */}
      <Modal
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <QrcodeOutlined style={{ color: '#a78bfa' }} />
            ค้นหาครุภัณฑ์ — {sourceLabel}
          </span>
        }
        open={assetModalOpen}
        onCancel={() => { setAssetModalOpen(false); setAssetSearch('') }}
        footer={null}
        width={1200}
        destroyOnHidden
      >
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--app-text-2)' }} />}
          placeholder="ค้นหาจากเลขครุภัณฑ์ ชื่ออุปกรณ์ Serial Number หรือหน่วยงาน..."
          value={assetSearch}
          onChange={e => setAssetSearch(e.target.value)}
          allowClear
          autoFocus
          size="large"
          style={{ marginBottom: 16 }}
        />
        <Table
          dataSource={assetResults}
          rowKey="noid"
          loading={assetLoading}
          size="small"
          pagination={{ pageSize: 8, size: 'small' }}
          columns={[
            {
              title: 'เลขครุภัณฑ์', dataIndex: 'noid', key: 'noid', width: 120,
              render: (v: string) => <code style={{ color: '#a78bfa' }}>{v}</code>,
            },
            { title: 'ชื่ออุปกรณ์', dataIndex: 'names', key: 'names' },
            { title: 'รุ่น', dataIndex: 'models', key: 'models', width: 140 },
            { title: 'บริษัท', dataIndex: 'companyname', key: 'companyname', width: 140 },
            { title: 'สถานที่', dataIndex: 'locates', key: 'locates', width: 150 },
            {
              title: 'วันที่รับ', dataIndex: 'receive', key: 'receive', width: 105,
              render: (v: string | null) => v
                ? <Text style={{ fontFamily: 'monospace' }}>{v}</Text>
                : <Text type="secondary">-</Text>,
            },
            { title: 'อายุ', dataIndex: 'expired', key: 'expired', width: 60, align: 'right' as const },
            {
              title: 'ราคา/หน่วย', dataIndex: 'perunits', key: 'perunits', width: 110, align: 'right' as const,
              render: (v: number | null) => v != null
                ? <Text style={{ color: '#6ee7b7', fontFamily: 'monospace' }}>{money(v)}</Text>
                : <Text type="secondary">-</Text>,
            },
            {
              title: 'เลือก', key: 'action', width: 70, align: 'center' as const,
              render: (_: unknown, record: EquipmentAsset) => (
                <Button type="primary" size="small" onClick={() => handleSelectAsset(record)}>เลือก</Button>
              ),
            },
          ]}
        />
      </Modal>

      <style>{`
        .depreciation-current-fy > td { background: rgba(255, 101, 0, 0.08) !important; }
      `}</style>
    </div>
  )
}

export default function DepreciationView(props: DepreciationViewProps) {
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  return (
    <ConfigProvider theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: '#FF6500', borderRadius: 8 } }}>
      <App>
        <PageContent {...props} />
      </App>
    </ConfigProvider>
  )
}
