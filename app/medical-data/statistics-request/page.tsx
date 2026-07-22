'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Table, Tag, Card, Typography, Breadcrumb, Button, Drawer, Form, Input,
  Select, Row, Col, Space, Alert, Steps, Timeline, DatePicker,
  App, Upload, Spin, Empty,
} from 'antd'
import {
  HomeOutlined, PlusOutlined, EyeOutlined, SearchOutlined,
  CalendarOutlined, SendOutlined, UploadOutlined, PaperClipOutlined,
  DownloadOutlined, MailOutlined,
} from '@ant-design/icons'
import { InfoCard, Field } from '../statUI'
import type { UploadFile } from 'antd'
import { FaChartBar } from 'react-icons/fa'
import dayjs, { Dayjs } from 'dayjs'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import {
  ACCENT, StatRequest, StatMeta, STATUS_CONFIG, STEP_ITEMS, fmtDate, fmtDateTime, apiGet,
} from '../statShared'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const PageContent = () => {
  const { message } = App.useApp()
  const [meta, setMeta] = useState<StatMeta | null>(null)
  const [requests, setRequests] = useState<StatRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState<StatRequest | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [form] = Form.useForm()

  const loadRequests = useCallback(async () => {
    setLoading(true)
    try {
      const j = await apiGet('/api/v1/medical-stat?scope=mine')
      if (j.success) setRequests(j.data ?? [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    apiGet('/api/v1/medical-stat/meta').then(j => { if (j.success) setMeta(j.data) })
    loadRequests()
  }, [loadRequests])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return requests
    return requests.filter(r =>
      r.request_no.toLowerCase().includes(q) ||
      (r.purpose_detail ?? '').toLowerCase().includes(q) ||
      (r.data_detail ?? '').toLowerCase().includes(q) ||
      (r.purpose_category_name ?? '').toLowerCase().includes(q))
  }, [requests, search])

  const summary = useMemo(() => ({
    pending: requests.filter(r => r.status === 'pending').length,
    processing: requests.filter(r => r.status === 'processing').length,
    delivered: requests.filter(r => r.status === 'delivered').length,
    total: requests.length,
  }), [requests])

  const openDetail = async (r: StatRequest) => {
    setSelected(r); setDetailOpen(true); setDetailLoading(true)
    try {
      const j = await apiGet(`/api/v1/medical-stat/${r.id}`)
      if (j.success) setSelected(j.data)
    } finally { setDetailLoading(false) }
  }

  const handleSubmit = async () => {
    let values: any
    try { values = await form.validateFields() } catch { return }
    const fileList = (values.sample_files as UploadFile[] | undefined) ?? []
    if (fileList.length < 1) { message.error('กรุณาแนบไฟล์ Excel ตัวอย่างอย่างน้อย 1 ไฟล์'); return }

    const fd = new FormData()
    fd.append('email', values.email)
    fd.append('purpose_category_id', String(values.purpose_category_id))
    if (values.purpose_detail) fd.append('purpose_detail', values.purpose_detail)
    fd.append('data_detail', values.data_detail)
    if (values.format) fd.append('format', values.format)
    if (values.urgency_id) fd.append('urgency_id', String(values.urgency_id))
    const period = values.period as [Dayjs, Dayjs] | undefined
    if (period?.[0] && period?.[1]) {
      fd.append('period_from', period[0].format('YYYY-MM-DD'))
      fd.append('period_to', period[1].format('YYYY-MM-DD'))
    }
    fileList.forEach(f => { if (f.originFileObj) fd.append('sample_files', f.originFileObj) })

    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/medical-stat', { method: 'POST', body: fd })
      const j = await res.json()
      if (res.ok && j.success) {
        message.success('ยื่นคำขอข้อมูลสถิติเรียบร้อยแล้ว')
        form.resetFields(); setFormOpen(false); loadRequests()
      } else {
        message.error(j?.error?.message || 'ยื่นคำขอไม่สำเร็จ')
      }
    } catch { message.error('ยื่นคำขอไม่สำเร็จ') }
    finally { setSubmitting(false) }
  }

  const urgencyOptions = (meta?.urgency_levels ?? []).map(u => ({
    value: u.id,
    label: <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 8, background: u.color_hex, marginRight: 8 }} />{u.name}</span>,
  }))

  const columns = [
    { title: 'เลขที่คำขอ', dataIndex: 'request_no', key: 'request_no', width: 150, render: (v: string) => <Text style={{ color: ACCENT, fontWeight: 600 }}>{v}</Text> },
    { title: 'วันที่ขอ', dataIndex: 'created_at', key: 'created_at', width: 110, render: fmtDate },
    { title: 'จุดประสงค์', key: 'purpose', render: (_: unknown, r: StatRequest) => (
      <div><Tag color={ACCENT}>{r.purpose_category_name ?? '-'}</Tag><div><Text style={{ fontSize: 12 }} type="secondary">{r.purpose_detail}</Text></div></div>
    ) },
    { title: 'ช่วงข้อมูล', key: 'period', width: 170, render: (_: unknown, r: StatRequest) => <Text style={{ fontSize: 12 }}>{fmtDate(r.period_from)} – {fmtDate(r.period_to)}</Text> },
    { title: 'ความเร่งด่วน', key: 'urgency', width: 120, render: (_: unknown, r: StatRequest) => r.urgency_name ? <Tag color={r.urgency_color ?? undefined}>{r.urgency_name}</Tag> : '-' },
    { title: 'สถานะ', dataIndex: 'status', key: 'status', width: 150, render: (v: StatRequest['status']) => <Tag color={STATUS_CONFIG[v].color}>{STATUS_CONFIG[v].label}</Tag> },
    { title: '', key: 'action', align: 'center' as const, width: 110, render: (_: unknown, r: StatRequest) => <Button size="small" type="primary" icon={<EyeOutlined />} onClick={() => openDetail(r)}>ดู</Button> },
  ]

  const stepCurrent = (s: StatRequest['status']) => s === 'delivered' ? 4 : STATUS_CONFIG[s].step

  return (
    <div className="min-h-screen bg-app-bg">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb items={[
          { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
          { title: 'งานข้อมูลทางการแพทย์' },
          { title: 'ขอข้อมูลสถิติ' },
        ]} className="mb-6" />

        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <Title level={2} className="m-0" style={{ display: 'flex', alignItems: 'center', gap: 10, color: ACCENT }}><FaChartBar /> ขอข้อมูลสถิติ</Title>
            <Text type="secondary">ยื่นคำขอข้อมูลสถิติทางการแพทย์ และติดตามสถานะคำขอของคุณ</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => { form.resetFields(); setFormOpen(true) }}>ยื่นคำขอใหม่</Button>
        </div>

        <Row gutter={16} className="mb-6">
          {[
            { label: 'รอตรวจสอบ', count: summary.pending, color: '#f59e0b' },
            { label: 'กำลังจัดทำ', count: summary.processing, color: ACCENT },
            { label: 'ส่งมอบแล้ว', count: summary.delivered, color: '#10b981' },
            { label: 'คำขอทั้งหมด', count: summary.total, color: '#0891b2' },
          ].map((s, i) => (
            <Col xs={12} md={6} key={i}>
              <Card variant="borderless" className="rounded-xl text-center">
                <div style={{ fontSize: 32, fontWeight: 700, color: s.color }}>{s.count}</div>
                <Text type="secondary">{s.label}</Text>
              </Card>
            </Col>
          ))}
        </Row>

        <Card variant="borderless" className="rounded-xl">
          <div className="mb-4" style={{ maxWidth: 380 }}>
            <Input allowClear prefix={<SearchOutlined />} placeholder="ค้นหา เลขที่คำขอ / จุดประสงค์" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Table columns={columns} dataSource={filtered} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} scroll={{ x: 1000 }}
            locale={{ emptyText: <Empty description="ยังไม่มีคำขอของคุณ" /> }} />
        </Card>
      </div>

      {/* ── ยื่นคำขอใหม่ ── */}
      <Drawer title="ยื่นคำขอข้อมูลสถิติ" size="large" open={formOpen} onClose={() => setFormOpen(false)} styles={{ body: { paddingBottom: 80 } }}
        extra={<Space><Button onClick={() => setFormOpen(false)}>ยกเลิก</Button><Button type="primary" icon={<SendOutlined />} loading={submitting} onClick={handleSubmit}>ยื่นคำขอ</Button></Space>}>
        <Alert type="info" showIcon className="mb-4" title="ข้อมูลผู้ขอดึงจากบัญชีที่เข้าสู่ระบบโดยอัตโนมัติ" description="ไม่ต้องกรอกชื่อ-นามสกุล/หน่วยงาน — ระบบใช้ข้อมูลจากผู้ที่ล็อกอิน" />
        <Form form={form} layout="vertical" requiredMark="optional" initialValues={{ format: 'Excel (.xlsx)' }}>
          <Form.Item name="email" label={<span><MailOutlined className="mr-1" />อีเมลสำหรับรับข้อมูล</span>}
            rules={[{ required: true, message: 'กรุณาระบุอีเมล' }, { type: 'email', message: 'รูปแบบอีเมลไม่ถูกต้อง' }]}
            extra="ผู้ประมวลผลจะตอบกลับ/ส่งข้อมูลผ่านอีเมลนี้">
            <Input placeholder="name@hospital.go.th" />
          </Form.Item>
          <Form.Item name="purpose_category_id" label="จุดประสงค์การขอข้อมูล (ประเภท)" rules={[{ required: true, message: 'กรุณาเลือกจุดประสงค์' }]}>
            <Select placeholder="เลือกว่าจะนำข้อมูลไปทำอะไร" options={(meta?.purpose_categories ?? []).map(p => ({ value: p.id, label: p.name }))} />
          </Form.Item>
          <Form.Item name="purpose_detail" label="อธิบายจุดประสงค์เพิ่มเติม">
            <Input.TextArea rows={2} placeholder="เช่น ประกอบงานวิจัยเรื่อง... / จัดทำรายงาน KPI ไตรมาส..." />
          </Form.Item>
          <Form.Item name="data_detail" label="รายละเอียดข้อมูลที่ขอ" rules={[{ required: true, message: 'กรุณาระบุรายละเอียดข้อมูลที่ขอ' }]}
            extra="ระบุให้ชัด เช่น ต้องการข้อมูลอะไร รหัสโรค (ICD-10) แยกตามอะไร ช่วงอายุ ฯลฯ">
            <Input.TextArea rows={3} placeholder="เช่น ผู้ป่วยเบาหวาน E10-E14 แยกรายเดือน/ช่วงอายุ เฉพาะเพศชาย..." />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={24} md={14}>
              <Form.Item name="period" label="ช่วงเวลาข้อมูล" rules={[{ required: true, message: 'กรุณาระบุช่วงเวลา' }]}>
                <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder={['ตั้งแต่', 'ถึง']} />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item name="format" label="รูปแบบไฟล์ที่ต้องการรับ">
                <Select options={(meta?.formats ?? []).map(f => ({ value: f, label: f }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="urgency_id" label="ความเร่งด่วน">
            <Select placeholder="เลือกระดับความเร่งด่วน" options={urgencyOptions} />
          </Form.Item>
          <Form.Item name="sample_files" label="ไฟล์ Excel ตัวอย่างข้อมูลที่ต้องการ (จำเป็น 1–5 ไฟล์)"
            valuePropName="fileList" getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
            rules={[{ required: true, message: 'กรุณาแนบไฟล์ตัวอย่างอย่างน้อย 1 ไฟล์' }]}
            extra="แนบไฟล์ตัวอย่างเพื่อให้เจ้าหน้าที่เห็นรูปแบบ/คอลัมน์ข้อมูลที่ต้องการ (สูงสุด 5 ไฟล์)">
            <Upload maxCount={5} multiple beforeUpload={() => false} accept=".xlsx,.xls,.csv">
              <Button icon={<UploadOutlined />}>เลือกไฟล์ตัวอย่าง</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Drawer>

      {/* ── รายละเอียดคำขอ ── */}
      <Drawer title={<span>รายละเอียดคำขอ <Text type="secondary" style={{ fontSize: 12 }}>{selected?.request_no}</Text></span>}
        size="large" open={detailOpen} onClose={() => setDetailOpen(false)} styles={{ body: { paddingBottom: 40 } }}>
        {selected && (
          <Spin spinning={detailLoading}>
            <Steps current={stepCurrent(selected.status)} status={selected.status === 'rejected' ? 'error' : 'process'} items={STEP_ITEMS} size="small" className="mb-6" />
            <InfoCard name={selected.requester_name} department={selected.requester_department}>
              <Field label={<><MailOutlined /> อีเมลรับข้อมูล</>}>{selected.email}</Field>
              <Field label={<><CalendarOutlined /> ช่วงข้อมูล</>}>{fmtDate(selected.period_from)} – {fmtDate(selected.period_to)}</Field>
              <Field label="รูปแบบไฟล์">{selected.format}</Field>
              <Field label="ความเร่งด่วน">{selected.urgency_name ? <Tag color={selected.urgency_color ?? undefined}>{selected.urgency_name}</Tag> : '-'}</Field>
              {selected.assigned_to_name && <Field label="ผู้จัดทำ"><Text style={{ color: ACCENT, fontWeight: 600 }}>{selected.assigned_to_name}</Text></Field>}
              <Field label="จุดประสงค์" full><Tag color={ACCENT}>{selected.purpose_category_name}</Tag> {selected.purpose_detail}</Field>
              <Field label="รายละเอียดข้อมูลที่ขอ" full>{selected.data_detail}</Field>
            </InfoCard>

            {(selected.files ?? []).length > 0 && (
              <div className="mb-4">
                <Text strong><PaperClipOutlined /> ไฟล์แนบ</Text>
                <div className="mt-2 flex flex-col gap-1">
                  {(selected.files ?? []).map(f => (
                    <a key={f.id} href={`/api/v1/medical-stat/${selected.id}/files/${f.id}`}>
                      <Tag color={f.kind === 'result' ? 'green' : 'blue'} icon={<DownloadOutlined />}>{f.kind === 'result' ? '[ผลลัพธ์] ' : ''}{f.original_name}</Tag>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {(selected.restricted_fields ?? []).length > 0 && (
              <Alert type="warning" showIcon className="mb-4" title="ฟิลด์ที่ถูกจำกัดตาม PDPA (ไม่ส่งให้)"
                description={<Space wrap size={4}>{(selected.restricted_fields ?? []).map(r => <Tag key={r.id} color="red">{r.field_name}{r.note ? ` (${r.note})` : ''}</Tag>)}</Space>} />
            )}

            {selected.status === 'delivered' && <Alert type="success" showIcon className="mb-4" title="ส่งมอบข้อมูลเรียบร้อยแล้ว" description={selected.delivered_note} />}
            {selected.status === 'rejected' && <Alert type="error" showIcon className="mb-4" title="คำขอนี้ไม่ได้รับอนุมัติ" description={selected.review_note} />}

            <Text strong>ประวัติการดำเนินการ</Text>
            <Timeline className="mt-3" items={(selected.history ?? []).map(h => ({
              color: h.action.includes('ปฏิเสธ') || h.action.includes('ไม่อนุมัติ') ? 'red' : (h.action.includes('อนุมัติ') || h.action.includes('ส่งมอบ')) ? 'green' : ACCENT,
              content: (
                <div>
                  <Text strong>{h.step_name}</Text><Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>{fmtDateTime(h.created_at)}</Text>
                  <div><Text type="secondary">โดย {h.actor_name ?? '-'} — {h.action}</Text></div>
                  {h.note && <div style={{ color: '#d97706', fontSize: 12 }}>{h.note}</div>}
                </div>
              ),
            }))} />
          </Spin>
        )}
      </Drawer>
    </div>
  )
}

export default function StatisticsRequestPage() {
  return <AppThemeProvider colorPrimary={ACCENT}><PageContent /></AppThemeProvider>
}
