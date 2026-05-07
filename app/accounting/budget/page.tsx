'use client'
import React, { useState, useMemo } from 'react'
import {
  ConfigProvider, theme, Typography, Breadcrumb, Card, Tag, Button, Table,
  Modal, Form, Input, Select, Row, Col, Alert, Progress, Space, App, message,
  Statistic, Tabs, InputNumber
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, PlusOutlined, EditOutlined,
  WarningOutlined, FundOutlined, FilterOutlined, RiseOutlined, FallOutlined
} from '@ant-design/icons'
import { FaCoins, FaChartPie } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import EChart from '@/app/components/EChart'

const { Title, Text } = Typography

type BudgetCategory = 'salary' | 'material' | 'asset' | 'service' | 'utility' | 'misc'
const CATEGORY_LABEL: Record<BudgetCategory, string> = {
  salary: 'เงินเดือน/ค่าจ้าง',
  material: 'ค่าวัสดุ/เวชภัณฑ์',
  asset: 'ค่าครุภัณฑ์/สินทรัพย์',
  service: 'ค่าบริการ/จ้างเหมา',
  utility: 'ค่าสาธารณูปโภค',
  misc: 'ค่าใช้สอยอื่น',
}
const CATEGORY_COLOR: Record<BudgetCategory, string> = {
  salary: '#a78bfa',
  material: '#22d3ee',
  asset: '#fb923c',
  service: '#10b981',
  utility: '#fbbf24',
  misc: '#94a3b8',
}

type BudgetItem = {
  id: string
  fiscalYear: number  // BE
  department: string
  category: BudgetCategory
  allocated: number
  actual: number
  reserved: number   // ผูกพัน (PR/PO ที่ยังไม่จ่าย)
  owner: string
}

const FY = 2569

const MOCK_BUDGETS: BudgetItem[] = [
  { id: 'BG-001', fiscalYear: FY, department: 'ฝ่ายบริหารทั่วไป',     category: 'misc',     allocated: 1_200_000, actual:   840_000, reserved: 120_000, owner: 'นางสาวอรวรรณ' },
  { id: 'BG-002', fiscalYear: FY, department: 'ฝ่ายบริหารทั่วไป',     category: 'utility',  allocated: 2_400_000, actual: 1_980_000, reserved:  60_000, owner: 'นางสาวอรวรรณ' },
  { id: 'BG-003', fiscalYear: FY, department: 'งานเภสัชกรรม',         category: 'material', allocated: 8_500_000, actual: 7_120_000, reserved: 850_000, owner: 'ภญ.พิมพ์ใจ' },
  { id: 'BG-004', fiscalYear: FY, department: 'งานเภสัชกรรม',         category: 'asset',    allocated: 1_800_000, actual:   620_000, reserved: 240_000, owner: 'ภญ.พิมพ์ใจ' },
  { id: 'BG-005', fiscalYear: FY, department: 'งานทันตกรรม',          category: 'material', allocated: 1_500_000, actual: 1_460_000, reserved:  90_000, owner: 'ทพ.ประภาส' },
  { id: 'BG-006', fiscalYear: FY, department: 'ห้องปฏิบัติการ',        category: 'material', allocated: 2_200_000, actual: 1_680_000, reserved: 180_000, owner: 'นักเทคนิคฯ สุดา' },
  { id: 'BG-007', fiscalYear: FY, department: 'แผนก IPD',              category: 'material', allocated: 3_600_000, actual: 2_910_000, reserved: 320_000, owner: 'หน. IPD' },
  { id: 'BG-008', fiscalYear: FY, department: 'แผนก OPD',              category: 'material', allocated: 1_800_000, actual: 1_205_000, reserved: 110_000, owner: 'หน. OPD' },
  { id: 'BG-009', fiscalYear: FY, department: 'งานซ่อมบำรุง',          category: 'service',  allocated: 1_500_000, actual:   920_000, reserved: 250_000, owner: 'นายชาญชัย' },
  { id: 'BG-010', fiscalYear: FY, department: 'งานซ่อมบำรุง',          category: 'asset',    allocated:   900_000, actual:   210_000, reserved:  80_000, owner: 'นายชาญชัย' },
  { id: 'BG-011', fiscalYear: FY, department: 'เทคโนโลยีสารสนเทศ',     category: 'service',  allocated: 1_200_000, actual:   720_000, reserved: 180_000, owner: 'หน. IT' },
  { id: 'BG-012', fiscalYear: FY, department: 'เทคโนโลยีสารสนเทศ',     category: 'asset',    allocated: 2_500_000, actual: 1_080_000, reserved: 620_000, owner: 'หน. IT' },
  { id: 'BG-013', fiscalYear: FY, department: 'ทรัพยากรบุคคล',         category: 'salary',   allocated:42_000_000, actual:31_500_000, reserved:       0, owner: 'หน. HR' },
  { id: 'BG-014', fiscalYear: FY, department: 'งานยุทธศาสตร์ (HSS)',   category: 'misc',     allocated:   600_000, actual:   180_000, reserved:  40_000, owner: 'หน. ยุทธศาสตร์' },
  { id: 'BG-015', fiscalYear: FY, department: 'จัดซื้อจัดจ้าง',         category: 'service',  allocated:   450_000, actual:   310_000, reserved:  20_000, owner: 'หน. พัสดุ' },
]

// แนวโน้มการใช้จ่ายรายเดือน (ต.ค.-ก.ย. ปีงบ)
const MONTHS_TH = ['ต.ค.','พ.ย.','ธ.ค.','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.']
const MONTHLY_BURN = [4_200_000, 5_100_000, 6_300_000, 5_900_000, 5_400_000, 6_800_000, 7_200_000, 6_550_000, 5_980_000, 0, 0, 0]

const usagePct = (b: BudgetItem) => Math.round(((b.actual + b.reserved) / b.allocated) * 1000) / 10
const remaining = (b: BudgetItem) => b.allocated - b.actual - b.reserved
const levelOf = (pct: number): 'safe' | 'warn' | 'danger' | 'over' => {
  if (pct > 100) return 'over'
  if (pct >= 90) return 'danger'
  if (pct >= 75) return 'warn'
  return 'safe'
}
const LEVEL_COLOR: Record<'safe' | 'warn' | 'danger' | 'over', string> = {
  safe: '#10b981', warn: '#fbbf24', danger: '#fb923c', over: '#ef4444',
}
const LEVEL_LABEL: Record<'safe' | 'warn' | 'danger' | 'over', string> = {
  safe: 'ปกติ', warn: 'ใช้ไป >75%', danger: 'ใกล้เต็ม >90%', over: 'เกินงบ',
}

const PageContent = () => {
  const [items, setItems] = useState<BudgetItem[]>(MOCK_BUDGETS)
  const [editId, setEditId] = useState<string | 'new' | null>(null)
  const [filterDept, setFilterDept] = useState<string | undefined>(undefined)
  const [filterCat, setFilterCat] = useState<BudgetCategory | undefined>(undefined)
  const [form] = Form.useForm()

  const departments = useMemo(() => Array.from(new Set(items.map(i => i.department))), [items])

  const filtered = useMemo(() => items.filter(i =>
    (!filterDept || i.department === filterDept) &&
    (!filterCat || i.category === filterCat)
  ), [items, filterDept, filterCat])

  const summary = useMemo(() => {
    const allocated = filtered.reduce((s, b) => s + b.allocated, 0)
    const actual = filtered.reduce((s, b) => s + b.actual, 0)
    const reserved = filtered.reduce((s, b) => s + b.reserved, 0)
    const used = actual + reserved
    const remain = allocated - used
    const pct = allocated === 0 ? 0 : Math.round((used / allocated) * 1000) / 10
    const overItems = filtered.filter(b => usagePct(b) > 100)
    const dangerItems = filtered.filter(b => usagePct(b) >= 90 && usagePct(b) <= 100)
    return { allocated, actual, reserved, used, remain, pct, overItems, dangerItems }
  }, [filtered])

  const byDept = useMemo(() => {
    const map = new Map<string, { allocated: number; actual: number; reserved: number }>()
    filtered.forEach(b => {
      const cur = map.get(b.department) || { allocated: 0, actual: 0, reserved: 0 }
      map.set(b.department, {
        allocated: cur.allocated + b.allocated,
        actual: cur.actual + b.actual,
        reserved: cur.reserved + b.reserved,
      })
    })
    return Array.from(map.entries()).sort((a, b) => b[1].allocated - a[1].allocated)
  }, [filtered])

  const byCategory = useMemo(() => {
    const map = new Map<BudgetCategory, number>()
    filtered.forEach(b => map.set(b.category, (map.get(b.category) || 0) + b.allocated))
    return Array.from(map.entries())
  }, [filtered])

  const openEdit = (id: string | 'new') => {
    setEditId(id)
    if (id === 'new') {
      form.setFieldsValue({
        fiscalYear: FY, department: '', category: 'material',
        allocated: 0, actual: 0, reserved: 0, owner: '',
      })
    } else {
      const b = items.find(i => i.id === id)
      if (b) form.setFieldsValue(b)
    }
  }

  const saveItem = () => {
    form.validateFields().then(v => {
      if (editId === 'new') {
        const id = `BG-${(items.length + 1).toString().padStart(3, '0')}`
        setItems(prev => [...prev, { id, ...v } as BudgetItem])
        message.success(`เพิ่มงบประมาณ ${id} เรียบร้อย`)
      } else if (editId) {
        setItems(prev => prev.map(i => i.id === editId ? { ...i, ...v } : i))
        message.success(`อัปเดตงบประมาณ ${editId} เรียบร้อย`)
      }
      setEditId(null)
      form.resetFields()
    }).catch(() => {})
  }

  const cols = [
    { title: 'รหัส', dataIndex: 'id', key: 'id', width: 90,
      render: (v: string) => <Text style={{ color: '#22d3ee', fontWeight: 600 }}>{v}</Text> },
    { title: 'หน่วยงาน', dataIndex: 'department', key: 'dept', width: 180 },
    { title: 'หมวดงบ', dataIndex: 'category', key: 'cat', width: 150,
      render: (v: BudgetCategory) => <Tag color={CATEGORY_COLOR[v]} style={{ color: '#0f172a', border: 'none' }}>
        {CATEGORY_LABEL[v]}
      </Tag> },
    { title: 'งบที่ตั้ง', dataIndex: 'allocated', key: 'al', width: 130, align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#a78bfa', fontWeight: 600 }}>฿{v.toLocaleString()}</Text> },
    { title: 'เบิกจ่ายแล้ว', dataIndex: 'actual', key: 'ac', width: 130, align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#10b981' }}>฿{v.toLocaleString()}</Text> },
    { title: 'ผูกพัน', dataIndex: 'reserved', key: 'rs', width: 110, align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#fbbf24' }}>฿{v.toLocaleString()}</Text> },
    { title: 'คงเหลือ', key: 'rm', width: 130, align: 'right' as const,
      render: (_: any, b: BudgetItem) => {
        const r = remaining(b)
        return <Text style={{ color: r < 0 ? '#ef4444' : '#94a3b8', fontWeight: 600 }}>
          ฿{r.toLocaleString()}
        </Text>
      }
    },
    { title: '% ใช้ไป', key: 'pc', width: 200,
      render: (_: any, b: BudgetItem) => {
        const pct = usagePct(b)
        const lv = levelOf(pct)
        return (
          <div>
            <Progress percent={Math.min(pct, 100)} size="small"
              strokeColor={LEVEL_COLOR[lv]} railColor="#334155"
              format={() => <span style={{ color: LEVEL_COLOR[lv], fontSize: 11 }}>{pct}%</span>} />
            <Tag color={lv === 'over' ? 'error' : lv === 'danger' ? 'orange' : lv === 'warn' ? 'warning' : 'success'}
              style={{ fontSize: 10, marginTop: 2 }}>
              {LEVEL_LABEL[lv]}
            </Tag>
          </div>
        )
      }
    },
    { title: 'ผู้รับผิดชอบ', dataIndex: 'owner', key: 'ow', width: 140,
      render: (v: string) => <Text style={{ color: '#94a3b8', fontSize: 12 }}>{v}</Text> },
    { title: '', key: 'act', width: 80,
      render: (_: any, b: BudgetItem) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(b.id)}>แก้</Button>
      )
    },
  ]

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb className="mb-6" items={[
          { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
          { href: '/accounting', title: <><FileTextOutlined /> งานการเงินและบัญชี</> },
          { title: 'งบประมาณรายหน่วยงาน' },
        ]} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <FaCoins style={{ fontSize: 24, color: '#fbbf24' }} />
          <Title level={3} style={{ margin: 0, color: '#f1f5f9' }}>
            งบประมาณรายหน่วยงาน — ปีงบ {FY}
          </Title>
        </div>

        <Card style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}
          styles={{ body: { padding: 12 } }}>
          <Space wrap size={12} align="center">
            <Text style={{ color: '#94a3b8' }}><FilterOutlined /> ตัวกรอง</Text>
            <Select
              placeholder="หน่วยงาน"
              allowClear
              value={filterDept}
              onChange={setFilterDept}
              style={{ width: 200 }}
              options={departments.map(d => ({ label: d, value: d }))}
            />
            <Select
              placeholder="หมวดงบ"
              allowClear
              value={filterCat}
              onChange={setFilterCat}
              style={{ width: 180 }}
              options={(Object.keys(CATEGORY_LABEL) as BudgetCategory[]).map(k => ({
                label: CATEGORY_LABEL[k], value: k
              }))}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit('new')}>
              ตั้งงบใหม่
            </Button>
          </Space>
        </Card>

        <Row gutter={12} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <Statistic title={<span style={{ color: '#94a3b8' }}>งบทั้งหมดที่ตั้ง</span>}
                value={summary.allocated} prefix="฿"
                valueStyle={{ color: '#a78bfa' }}
                formatter={v => Number(v).toLocaleString()} />
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>{filtered.length} รายการ</Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <Statistic title={<span style={{ color: '#94a3b8' }}>เบิกจ่ายแล้ว</span>}
                value={summary.actual} prefix="฿"
                valueStyle={{ color: '#10b981' }}
                formatter={v => Number(v).toLocaleString()} />
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                ผูกพันอีก ฿{summary.reserved.toLocaleString()}
              </Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <Statistic title={<span style={{ color: '#94a3b8' }}>คงเหลือ</span>}
                value={summary.remain}
                prefix={<>{summary.remain < 0 ? <FallOutlined /> : <RiseOutlined />} ฿</>}
                valueStyle={{ color: summary.remain < 0 ? '#ef4444' : '#22d3ee' }}
                formatter={v => Number(v).toLocaleString()} />
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                ใช้ไป {summary.pct}% ของงบ
              </Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <Text style={{ color: '#94a3b8', fontSize: 13 }}>การใช้งบรวม</Text>
              <Progress percent={Math.min(summary.pct, 100)} size={8}
                strokeColor={summary.pct > 100 ? '#ef4444' : summary.pct >= 90 ? '#fb923c'
                  : summary.pct >= 75 ? '#fbbf24' : '#10b981'}
                railColor="#334155" />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={{ color: '#fb923c', fontSize: 12 }}>
                  <WarningOutlined /> ใกล้เต็ม {summary.dangerItems.length}
                </Text>
                <Text style={{ color: '#ef4444', fontSize: 12 }}>
                  เกินงบ {summary.overItems.length}
                </Text>
              </div>
            </Card>
          </Col>
        </Row>

        {summary.overItems.length > 0 && (
          <Alert type="error" showIcon style={{ marginBottom: 16 }}
            title={`มีหน่วยงานใช้งบเกิน ${summary.overItems.length} รายการ`}
            description={summary.overItems.map(b => `${b.department} (${CATEGORY_LABEL[b.category]})`).join(' • ')} />
        )}

        <Row gutter={12} style={{ marginBottom: 16 }}>
          <Col span={16}>
            <Card title={<span style={{ color: '#f1f5f9' }}>
              <FundOutlined /> เปรียบเทียบงบ vs เบิกจ่าย vs ผูกพัน รายหน่วยงาน
            </span>}
              style={{ background: '#1e293b', border: '1px solid #334155' }}
              styles={{ body: { padding: 12 } }}>
              <EChart height={360} option={{
                backgroundColor: 'transparent',
                grid: { left: 16, right: 16, top: 36, bottom: 80, containLabel: true },
                tooltip: {
                  trigger: 'axis', axisPointer: { type: 'shadow' },
                  backgroundColor: '#0f172a', borderColor: '#334155',
                  textStyle: { color: '#e2e8f0' },
                  valueFormatter: (v: any) => '฿' + Number(v).toLocaleString(),
                },
                legend: {
                  data: ['งบที่ตั้ง', 'เบิกจ่าย', 'ผูกพัน'],
                  textStyle: { color: '#cbd5e1' }, top: 4,
                },
                xAxis: {
                  type: 'category', data: byDept.map(([d]) => d),
                  axisLabel: { color: '#94a3b8', interval: 0, rotate: 22, fontSize: 11 },
                  axisLine: { lineStyle: { color: '#475569' } },
                },
                yAxis: {
                  type: 'value',
                  axisLabel: {
                    color: '#94a3b8',
                    formatter: (v: number) => v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + 'M'
                      : v >= 1000 ? (v / 1000).toFixed(0) + 'k' : String(v),
                  },
                  splitLine: { lineStyle: { color: '#334155' } },
                },
                series: [
                  {
                    name: 'งบที่ตั้ง', type: 'bar', barWidth: 16,
                    data: byDept.map(([, v]) => v.allocated),
                    itemStyle: {
                      borderRadius: [4, 4, 0, 0],
                      color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [{ offset: 0, color: '#a78bfa' }, { offset: 1, color: '#7c3aed' }] },
                    },
                  },
                  {
                    name: 'เบิกจ่าย', type: 'bar', barWidth: 16,
                    data: byDept.map(([, v]) => v.actual),
                    itemStyle: {
                      borderRadius: [4, 4, 0, 0],
                      color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [{ offset: 0, color: '#34d399' }, { offset: 1, color: '#059669' }] },
                    },
                  },
                  {
                    name: 'ผูกพัน', type: 'bar', barWidth: 16,
                    data: byDept.map(([, v]) => v.reserved),
                    itemStyle: {
                      borderRadius: [4, 4, 0, 0],
                      color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [{ offset: 0, color: '#fbbf24' }, { offset: 1, color: '#d97706' }] },
                    },
                  },
                ],
              }} />
            </Card>
          </Col>
          <Col span={8}>
            <Card title={<span style={{ color: '#f1f5f9' }}>
              <FaChartPie style={{ marginRight: 6 }} /> สัดส่วนงบตามหมวด
            </span>}
              style={{ background: '#1e293b', border: '1px solid #334155' }}
              styles={{ body: { padding: 12 } }}>
              <EChart height={360} option={{
                backgroundColor: 'transparent',
                tooltip: {
                  trigger: 'item', backgroundColor: '#0f172a', borderColor: '#334155',
                  textStyle: { color: '#e2e8f0' },
                  formatter: (p: any) => `${p.name}<br/>฿${Number(p.value).toLocaleString()} (${p.percent}%)`,
                },
                legend: {
                  orient: 'vertical', right: 4, top: 'center',
                  textStyle: { color: '#cbd5e1', fontSize: 11 },
                },
                series: [{
                  type: 'pie', radius: ['52%', '76%'], center: ['36%', '50%'],
                  avoidLabelOverlap: true,
                  label: { show: false },
                  labelLine: { show: false },
                  itemStyle: { borderColor: '#1e293b', borderWidth: 2 },
                  data: byCategory.map(([k, v]) => ({
                    name: CATEGORY_LABEL[k], value: v,
                    itemStyle: { color: CATEGORY_COLOR[k] },
                  })),
                }],
                graphic: [{
                  type: 'text', left: '36%', top: '44%',
                  style: { text: 'รวม', textAlign: 'center', fill: '#94a3b8', fontSize: 12 },
                }, {
                  type: 'text', left: '36%', top: '52%',
                  style: {
                    text: '฿' + (summary.allocated / 1_000_000).toFixed(1) + 'M',
                    textAlign: 'center', fill: '#fbbf24', fontSize: 18, fontWeight: 700,
                  },
                }],
              }} />
            </Card>
          </Col>
        </Row>

        <Card title={<span style={{ color: '#f1f5f9' }}>
          แนวโน้มการใช้งบรายเดือน — ปีงบ {FY}
        </span>}
          style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}
          styles={{ body: { padding: 12 } }}>
          <EChart height={260} option={{
            backgroundColor: 'transparent',
            grid: { left: 16, right: 16, top: 36, bottom: 36, containLabel: true },
            tooltip: {
              trigger: 'axis', backgroundColor: '#0f172a', borderColor: '#334155',
              textStyle: { color: '#e2e8f0' },
              valueFormatter: (v: any) => '฿' + Number(v).toLocaleString(),
            },
            legend: { data: ['ใช้จ่ายรายเดือน', 'สะสม'], textStyle: { color: '#cbd5e1' }, top: 4 },
            xAxis: {
              type: 'category', data: MONTHS_TH,
              axisLabel: { color: '#94a3b8' },
              axisLine: { lineStyle: { color: '#475569' } },
            },
            yAxis: [
              {
                type: 'value', name: 'รายเดือน',
                axisLabel: {
                  color: '#94a3b8',
                  formatter: (v: number) => v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + 'M' : (v / 1000).toFixed(0) + 'k',
                },
                splitLine: { lineStyle: { color: '#334155' } },
                nameTextStyle: { color: '#94a3b8' },
              },
              {
                type: 'value', name: 'สะสม',
                axisLabel: {
                  color: '#94a3b8',
                  formatter: (v: number) => v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + 'M' : (v / 1000).toFixed(0) + 'k',
                },
                splitLine: { show: false },
                nameTextStyle: { color: '#94a3b8' },
              },
            ],
            series: [
              {
                name: 'ใช้จ่ายรายเดือน', type: 'bar', barWidth: 22, yAxisIndex: 0,
                data: MONTHLY_BURN,
                itemStyle: {
                  borderRadius: [6, 6, 0, 0],
                  color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [{ offset: 0, color: '#22d3ee' }, { offset: 1, color: '#0e7490' }] },
                },
              },
              {
                name: 'สะสม', type: 'line', smooth: true, yAxisIndex: 1,
                data: MONTHLY_BURN.reduce<number[]>((acc, v, i) => {
                  acc.push((acc[i - 1] || 0) + v); return acc
                }, []),
                lineStyle: { color: '#fbbf24', width: 3 },
                itemStyle: { color: '#fbbf24' },
                areaStyle: {
                  color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [{ offset: 0, color: 'rgba(251,191,36,0.35)' }, { offset: 1, color: 'rgba(251,191,36,0)' }] },
                },
              },
            ],
          }} />
        </Card>

        <Card style={{ background: '#1e293b', border: '1px solid #334155' }}
          styles={{ body: { padding: 0 } }}>
          <Tabs defaultActiveKey="all" style={{ padding: '0 16px' }}
            items={[
              {
                key: 'all',
                label: <span>ทั้งหมด ({filtered.length})</span>,
                children: <Table dataSource={filtered} columns={cols} rowKey="id" size="small"
                  pagination={{ pageSize: 8 }} scroll={{ x: 1400 }} />,
              },
              {
                key: 'over',
                label: <span style={{ color: '#ef4444' }}>เกินงบ ({summary.overItems.length})</span>,
                children: <Table dataSource={summary.overItems} columns={cols} rowKey="id" size="small"
                  pagination={{ pageSize: 8 }} scroll={{ x: 1400 }} />,
              },
              {
                key: 'danger',
                label: <span style={{ color: '#fb923c' }}>ใกล้เต็ม ({summary.dangerItems.length})</span>,
                children: <Table dataSource={summary.dangerItems} columns={cols} rowKey="id" size="small"
                  pagination={{ pageSize: 8 }} scroll={{ x: 1400 }} />,
              },
            ]} />
        </Card>
      </div>

      <Modal
        title={<span><FaCoins style={{ color: '#fbbf24', marginRight: 8 }} />
          {editId === 'new' ? 'ตั้งงบประมาณใหม่' : `แก้ไขงบ — ${editId}`}
        </span>}
        open={!!editId}
        onCancel={() => { setEditId(null); form.resetFields() }}
        onOk={saveItem}
        okText="บันทึก"
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="ปีงบประมาณ" name="fiscalYear" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={2560} max={2600} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="ผู้รับผิดชอบ" name="owner" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="หน่วยงาน" name="department" rules={[{ required: true }]}>
            <Input placeholder="เช่น ฝ่ายบริหารทั่วไป" />
          </Form.Item>
          <Form.Item label="หมวดงบ" name="category" rules={[{ required: true }]}>
            <Select options={(Object.keys(CATEGORY_LABEL) as BudgetCategory[]).map(k => ({
              label: CATEGORY_LABEL[k], value: k,
            }))} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label="งบที่ตั้ง (฿)" name="allocated" rules={[{ required: true }]}>
                <InputNumber<number> style={{ width: '100%' }} min={0} step={10000}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={v => Number((v || '').replace(/\$\s?|(,*)/g, '')) as number} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="เบิกจ่ายแล้ว (฿)" name="actual">
                <InputNumber<number> style={{ width: '100%' }} min={0} step={10000}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={v => Number((v || '').replace(/\$\s?|(,*)/g, '')) as number} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="ผูกพัน (฿)" name="reserved">
                <InputNumber<number> style={{ width: '100%' }} min={0} step={10000}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={v => Number((v || '').replace(/\$\s?|(,*)/g, '')) as number} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

export default function BudgetPage() {
  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#10b981', borderRadius: 8 } }}>
      <App>
        <PageContent />
      </App>
    </ConfigProvider>
  )
}
