'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  Table, Tag, Card, Typography, Breadcrumb, Button, Drawer, Form, Input,
  Space, Alert, App, Spin, Empty, Upload, Segmented,
} from 'antd'
import {
  HomeOutlined, EyeOutlined, SearchOutlined, CalendarOutlined, MailOutlined,
  PaperClipOutlined, DownloadOutlined, UploadOutlined, FileDoneOutlined,
} from '@ant-design/icons'
import { InfoCard, Field } from '../statUI'
import type { UploadFile } from 'antd'
import { FaTasks } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import {
  ACCENT, StatRequest, StatStatus, STATUS_CONFIG, fmtDate, apiGet,
} from '../statShared'

const { Title, Text } = Typography

const PageContent = () => {
  const { message } = App.useApp()
  const [requests, setRequests] = useState<StatRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatStatus | 'all'>('processing')
  const [search, setSearch] = useState('')

  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState<StatRequest | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const loadRequests = useCallback(async () => {
    setLoading(true)
    try {
      const j = await apiGet('/api/v1/medical-stat?scope=assigned')
      if (j.success) setRequests(j.data ?? [])
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { loadRequests() }, [loadRequests])

  const openDetail = async (r: StatRequest) => {
    setSelected(r); setDetailOpen(true); setDetailLoading(true); form.resetFields()
    try { const j = await apiGet(`/api/v1/medical-stat/${r.id}`); if (j.success) setSelected(j.data) }
    finally { setDetailLoading(false) }
  }

  const submitDeliver = async () => {
    let v: any
    try { v = await form.validateFields() } catch { return }
    if (!selected) return
    const fd = new FormData()
    fd.append('delivered_note', v.delivered_note)
    const fileList = (v.result_files as UploadFile[] | undefined) ?? []
    fileList.forEach(f => { if (f.originFileObj) fd.append('result_files', f.originFileObj) })
    setSubmitting(true)
    try {
      const res = await fetch(`/api/v1/medical-stat/${selected.id}/deliver`, { method: 'POST', body: fd })
      const j = await res.json()
      if (res.ok && j.success) { message.success('บันทึกการส่งมอบข้อมูลแล้ว'); setDetailOpen(false); loadRequests() }
      else message.error(j?.error?.message || 'ส่งมอบไม่สำเร็จ')
    } catch { message.error('ส่งมอบไม่สำเร็จ') }
    finally { setSubmitting(false) }
  }

  const filtered = requests.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    const q = search.trim().toLowerCase()
    return !q || r.request_no.toLowerCase().includes(q) || (r.requester_name ?? '').toLowerCase().includes(q)
  })

  const columns = [
    { title: 'เลขที่คำขอ', dataIndex: 'request_no', key: 'request_no', width: 150, render: (v: string) => <Text style={{ color: ACCENT, fontWeight: 600 }}>{v}</Text> },
    { title: 'ผู้ขอ', key: 'requester', render: (_: unknown, r: StatRequest) => <div><div style={{ fontWeight: 600 }}>{r.requester_name}</div><Text type="secondary" style={{ fontSize: 12 }}>{r.requester_department}</Text></div> },
    { title: 'จุดประสงค์', key: 'purpose', render: (_: unknown, r: StatRequest) => <Tag color={ACCENT}>{r.purpose_category_name}</Tag> },
    { title: 'ช่วงข้อมูล', key: 'period', width: 170, render: (_: unknown, r: StatRequest) => <Text style={{ fontSize: 12 }}>{fmtDate(r.period_from)} – {fmtDate(r.period_to)}</Text> },
    { title: 'PDPA', key: 'pdpa', width: 110, render: (_: unknown, r: StatRequest) => r.review_type === 'partial' ? <Tag color="red">ตัดบางฟิลด์</Tag> : r.review_type === 'full' ? <Tag color="green">ส่งได้ทุกฟิลด์</Tag> : '-' },
    { title: 'สถานะ', dataIndex: 'status', key: 'status', width: 140, render: (v: StatStatus) => <Tag color={STATUS_CONFIG[v].color}>{STATUS_CONFIG[v].label}</Tag> },
    { title: '', key: 'action', align: 'center' as const, width: 130, render: (_: unknown, r: StatRequest) => <Button size="small" type="primary" icon={r.status === 'processing' ? <FileDoneOutlined /> : <EyeOutlined />} onClick={() => openDetail(r)}>{r.status === 'processing' ? 'จัดทำ/ส่งมอบ' : 'ดู'}</Button> },
  ]

  return (
    <div className="min-h-screen bg-app-bg">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb items={[
          { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
          { title: 'งานข้อมูลทางการแพทย์' },
          { title: 'งานที่ได้รับมอบหมาย (ประมวลผล)' },
        ]} className="mb-6" />

        <div className="mb-6">
          <Title level={2} className="m-0" style={{ display: 'flex', alignItems: 'center', gap: 10, color: ACCENT }}><FaTasks /> งานที่ได้รับมอบหมาย</Title>
          <Text type="secondary">คำขอที่หัวหน้ากลุ่มงานมอบหมายให้จัดทำ — โปรดปฏิบัติตามข้อจำกัด PDPA ก่อนส่งมอบ</Text>
        </div>

        <Card variant="borderless" className="rounded-xl">
          <div className="mb-4 flex flex-wrap items-center gap-3 justify-between">
            <Segmented value={statusFilter} onChange={v => setStatusFilter(v as StatStatus | 'all')}
              options={[{ label: 'กำลังจัดทำ', value: 'processing' }, { label: 'ส่งมอบแล้ว', value: 'delivered' }, { label: 'ทั้งหมด', value: 'all' }]} />
            <Input allowClear prefix={<SearchOutlined />} placeholder="ค้นหา เลขที่ / ผู้ขอ" style={{ maxWidth: 320 }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Table columns={columns} dataSource={filtered} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} scroll={{ x: 1000 }} locale={{ emptyText: <Empty description="ยังไม่มีงานที่ได้รับมอบหมาย" /> }} />
        </Card>
      </div>

      <Drawer title={<span>งานประมวลผล <Text type="secondary" style={{ fontSize: 12 }}>{selected?.request_no}</Text></span>} size="large" open={detailOpen} onClose={() => setDetailOpen(false)} styles={{ body: { paddingBottom: 80 } }}
        extra={selected?.status === 'processing' && <Button type="primary" icon={<FileDoneOutlined />} loading={submitting} onClick={submitDeliver}>บันทึกส่งมอบ</Button>}>
        {selected && (
          <Spin spinning={detailLoading}>
            <InfoCard name={selected.requester_name} department={selected.requester_department}>
              <Field label={<><MailOutlined /> อีเมลตอบกลับ</>}>
                {selected.email ? <a href={`mailto:${selected.email}`} style={{ color: ACCENT, fontWeight: 600 }}>{selected.email}</a> : '-'}
              </Field>
              <Field label={<><CalendarOutlined /> ช่วงข้อมูล</>}>{fmtDate(selected.period_from)} – {fmtDate(selected.period_to)}</Field>
              <Field label="รูปแบบไฟล์">{selected.format}</Field>
              <Field label="จุดประสงค์" full><Tag color={ACCENT}>{selected.purpose_category_name}</Tag> {selected.purpose_detail}</Field>
              <Field label="รายละเอียดข้อมูลที่ขอ" full>{selected.data_detail}</Field>
            </InfoCard>

            {selected.review_type === 'partial' && (
              <Alert type="error" showIcon className="mb-4" title="ข้อจำกัด PDPA — ห้ามดึง/ส่งฟิลด์เหล่านี้"
                description={<Space wrap size={4}>{(selected.restricted_fields ?? []).map(r => <Tag key={r.id} color="red">{r.field_name}{r.note ? ` (${r.note})` : ''}</Tag>)}</Space>} />
            )}
            {selected.review_type === 'full' && <Alert type="success" showIcon className="mb-4" title="หัวหน้าอนุมัติทั้งหมด — ส่งได้ทุกฟิลด์ตามที่ขอ" />}
            {selected.review_note && <Alert type="info" showIcon className="mb-4" title="หมายเหตุจากหัวหน้า" description={selected.review_note} />}

            {(selected.files ?? []).length > 0 && (
              <div className="mb-4">
                <Text strong><PaperClipOutlined /> ไฟล์แนบ</Text>
                <div className="mt-2 flex flex-col gap-1">
                  {(selected.files ?? []).map(f => (
                    <a key={f.id} href={`/api/v1/medical-stat/${selected.id}/files/${f.id}`}><Tag color={f.kind === 'result' ? 'green' : 'blue'} icon={<DownloadOutlined />}>{f.kind === 'result' ? '[ผลลัพธ์] ' : '[ตัวอย่าง] '}{f.original_name}</Tag></a>
                  ))}
                </div>
              </div>
            )}

            {selected.status === 'processing' ? (
              <Form form={form} layout="vertical">
                <Form.Item name="delivered_note" label="รายละเอียดการส่งมอบ" rules={[{ required: true, message: 'กรุณาระบุการส่งมอบ' }]}>
                  <Input.TextArea rows={3} placeholder="เช่น ส่งไฟล์ทางอีเมลราชการ / เลขที่หนังสือนำส่ง / ตัดฟิลด์ตาม PDPA แล้ว" />
                </Form.Item>
                <Form.Item name="result_files" label="แนบไฟล์ผลลัพธ์ (ถ้ามี, สูงสุด 5 ไฟล์)" valuePropName="fileList" getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}>
                  <Upload maxCount={5} multiple beforeUpload={() => false} accept=".xlsx,.xls,.csv,.pdf">
                    <Button icon={<UploadOutlined />}>เลือกไฟล์ผลลัพธ์</Button>
                  </Upload>
                </Form.Item>
              </Form>
            ) : selected.status === 'delivered' ? (
              <Alert type="success" showIcon title="ส่งมอบเรียบร้อยแล้ว" description={selected.delivered_note} />
            ) : null}
          </Spin>
        )}
      </Drawer>
    </div>
  )
}

export default function StatisticsTasksPage() {
  return <AppThemeProvider colorPrimary={ACCENT}><PageContent /></AppThemeProvider>
}
