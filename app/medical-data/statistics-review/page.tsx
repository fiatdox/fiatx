'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  Table, Tag, Card, Typography, Breadcrumb, Button, Drawer, Form, Input,
  Select, Space, Alert, Radio, App, Result, Spin, Empty, Segmented,
} from 'antd'
import {
  HomeOutlined, EyeOutlined, SearchOutlined, CalendarOutlined, MailOutlined,
  CheckCircleOutlined, CloseCircleOutlined, TeamOutlined, PaperClipOutlined,
  DownloadOutlined, MinusCircleOutlined, PlusOutlined, SafetyCertificateOutlined,
} from '@ant-design/icons'
import { InfoCard, Field } from '../statUI'
import { FaUserShield } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import {
  ACCENT, HEAD_ROLES, StatRequest, StatStaff, StatStatus, STATUS_CONFIG, fmtDate, fmtDateTime, apiGet, hasRole,
} from '../statShared'

const { Title, Text } = Typography

const PageContent = () => {
  const { message } = App.useApp()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const allowed = mounted && hasRole(HEAD_ROLES)

  const [requests, setRequests] = useState<StatRequest[]>([])
  const [staff, setStaff] = useState<StatStaff[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatStatus | 'all'>('pending')
  const [search, setSearch] = useState('')

  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState<StatRequest | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()
  const decision = Form.useWatch('decision', form)
  const reviewType = Form.useWatch('review_type', form)

  const loadRequests = useCallback(async () => {
    setLoading(true)
    try {
      const j = await apiGet('/api/v1/medical-stat?scope=all')
      if (j.success) setRequests(j.data ?? [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (!allowed) return
    loadRequests()
    apiGet('/api/v1/medical-stat/staff').then(j => { if (j.success) setStaff(j.data ?? []) })
  }, [allowed, loadRequests])

  const openDetail = async (r: StatRequest) => {
    setSelected(r); setDetailOpen(true); setDetailLoading(true)
    form.resetFields()
    form.setFieldsValue({ decision: 'approve', review_type: 'full', restricted_fields: [] })
    try {
      const j = await apiGet(`/api/v1/medical-stat/${r.id}`)
      if (j.success) setSelected(j.data)
    } finally { setDetailLoading(false) }
  }

  const submitReview = async () => {
    let v: any
    try { v = await form.validateFields() } catch { return }
    if (!selected) return
    const body: any = { decision: v.decision, review_note: v.review_note }
    if (v.decision === 'approve') {
      body.review_type = v.review_type
      body.assigned_to = v.assigned_to
      body.restricted_fields = v.review_type === 'partial'
        ? (v.restricted_fields ?? []).filter((f: any) => f?.field_name?.trim())
        : []
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/v1/medical-stat/${selected.id}/review`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const j = await res.json()
      if (res.ok && j.success) {
        message.success(v.decision === 'reject' ? 'ปฏิเสธคำขอแล้ว' : 'อนุมัติและมอบหมายเรียบร้อยแล้ว')
        setDetailOpen(false); loadRequests()
      } else message.error(j?.error?.message || 'ดำเนินการไม่สำเร็จ')
    } catch { message.error('ดำเนินการไม่สำเร็จ') }
    finally { setSubmitting(false) }
  }

  const filtered = requests.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return r.request_no.toLowerCase().includes(q) || (r.requester_name ?? '').toLowerCase().includes(q) || (r.purpose_detail ?? '').toLowerCase().includes(q)
  })

  const columns = [
    { title: 'เลขที่คำขอ', dataIndex: 'request_no', key: 'request_no', width: 150, render: (v: string) => <Text style={{ color: ACCENT, fontWeight: 600 }}>{v}</Text> },
    { title: 'ผู้ขอ', key: 'requester', render: (_: unknown, r: StatRequest) => <div><div style={{ fontWeight: 600 }}>{r.requester_name}</div><Text type="secondary" style={{ fontSize: 12 }}>{r.requester_department}</Text></div> },
    { title: 'จุดประสงค์', key: 'purpose', render: (_: unknown, r: StatRequest) => <div><Tag color={ACCENT}>{r.purpose_category_name}</Tag><div><Text style={{ fontSize: 12 }} type="secondary" ellipsis>{r.purpose_detail}</Text></div></div> },
    { title: 'ความเร่งด่วน', key: 'urgency', width: 110, render: (_: unknown, r: StatRequest) => r.urgency_name ? <Tag color={r.urgency_color ?? undefined}>{r.urgency_name}</Tag> : '-' },
    { title: 'สถานะ', dataIndex: 'status', key: 'status', width: 150, render: (v: StatStatus) => <Tag color={STATUS_CONFIG[v].color}>{STATUS_CONFIG[v].label}</Tag> },
    { title: '', key: 'action', align: 'center' as const, width: 120, render: (_: unknown, r: StatRequest) => <Button size="small" type="primary" icon={r.status === 'pending' ? <SafetyCertificateOutlined /> : <EyeOutlined />} onClick={() => openDetail(r)}>{r.status === 'pending' ? 'ตรวจสอบ' : 'ดู'}</Button> },
  ]

  if (mounted && !allowed) {
    return (
      <div className="min-h-screen bg-app-bg"><Navbar />
        <Result status="403" title="เฉพาะหัวหน้ากลุ่มงานข้อมูลทางการแพทย์" subTitle="หน้านี้สงวนสิทธิ์ให้ผู้มีบทบาท CHIEF_GROUP_MEDSTAT หรือผู้ดูแลระบบเท่านั้น" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-app-bg">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb items={[
          { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
          { title: 'งานข้อมูลทางการแพทย์' },
          { title: 'ตรวจสอบ/อนุมัติคำขอ (หัวหน้ากลุ่มงาน)' },
        ]} className="mb-6" />

        <div className="mb-6">
          <Title level={2} className="m-0" style={{ display: 'flex', alignItems: 'center', gap: 10, color: ACCENT }}><FaUserShield /> ตรวจสอบคำขอข้อมูล (PDPA) & มอบหมายงาน</Title>
          <Text type="secondary">ตรวจสอบความเหมาะสมด้านข้อมูลส่วนบุคคล อนุมัติ/ปฏิเสธ และมอบหมายเจ้าพนักงานเวชสถิติ</Text>
        </div>

        <Card variant="borderless" className="rounded-xl">
          <div className="mb-4 flex flex-wrap items-center gap-3 justify-between">
            <Segmented value={statusFilter} onChange={v => setStatusFilter(v as StatStatus | 'all')}
              options={[
                { label: 'รอตรวจสอบ', value: 'pending' },
                { label: 'กำลังจัดทำ', value: 'processing' },
                { label: 'ส่งมอบแล้ว', value: 'delivered' },
                { label: 'ไม่อนุมัติ', value: 'rejected' },
                { label: 'ทั้งหมด', value: 'all' },
              ]} />
            <Input allowClear prefix={<SearchOutlined />} placeholder="ค้นหา เลขที่ / ผู้ขอ" style={{ maxWidth: 320 }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Table columns={columns} dataSource={filtered} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} scroll={{ x: 1000 }} locale={{ emptyText: <Empty description="ไม่มีคำขอ" /> }} />
        </Card>
      </div>

      <Drawer title={<span>ตรวจสอบคำขอ <Text type="secondary" style={{ fontSize: 12 }}>{selected?.request_no}</Text></span>} size="large" open={detailOpen} onClose={() => setDetailOpen(false)} styles={{ body: { paddingBottom: 80 } }}
        extra={selected?.status === 'pending' && <Button type="primary" loading={submitting} onClick={submitReview}>บันทึกผลพิจารณา</Button>}>
        {selected && (
          <Spin spinning={detailLoading}>
            <InfoCard name={selected.requester_name} department={selected.requester_department}>
              <Field label={<><MailOutlined /> อีเมลรับข้อมูล</>}>{selected.email}</Field>
              <Field label={<><CalendarOutlined /> ช่วงข้อมูล</>}>{fmtDate(selected.period_from)} – {fmtDate(selected.period_to)}</Field>
              <Field label="ความเร่งด่วน">{selected.urgency_name ? <Tag color={selected.urgency_color ?? undefined}>{selected.urgency_name}</Tag> : '-'}</Field>
              <Field label="จุดประสงค์" full><Tag color={ACCENT}>{selected.purpose_category_name}</Tag> {selected.purpose_detail}</Field>
              <Field label="รายละเอียดข้อมูลที่ขอ" full>{selected.data_detail}</Field>
            </InfoCard>

            {(selected.files ?? []).length > 0 && (
              <div className="mb-4">
                <Text strong><PaperClipOutlined /> ไฟล์ตัวอย่างจากผู้ขอ (ตรวจ PDPA)</Text>
                <div className="mt-2 flex flex-col gap-1">
                  {(selected.files ?? []).filter(f => f.kind === 'sample').map(f => (
                    <a key={f.id} href={`/api/v1/medical-stat/${selected.id}/files/${f.id}`}><Tag color="blue" icon={<DownloadOutlined />}>{f.original_name}</Tag></a>
                  ))}
                </div>
              </div>
            )}

            {selected.status === 'pending' ? (
              <>
                <Alert type="info" showIcon className="mb-4" title="พิจารณาความเหมาะสมด้านข้อมูลส่วนบุคคล (PDPA)"
                  description="อนุมัติทั้งหมด / อนุมัติแบบตัดบางฟิลด์ที่เป็นข้อมูลส่วนบุคคล / หรือปฏิเสธทั้งคำขอ แล้วมอบหมายเจ้าพนักงานเวชสถิติ" />
                <Form form={form} layout="vertical">
                  <Form.Item name="decision" label="ผลการพิจารณา" rules={[{ required: true }]}>
                    <Radio.Group>
                      <Radio.Button value="approve"><CheckCircleOutlined /> อนุมัติ</Radio.Button>
                      <Radio.Button value="reject"><CloseCircleOutlined /> ปฏิเสธทั้งคำขอ</Radio.Button>
                    </Radio.Group>
                  </Form.Item>

                  {decision === 'approve' && (
                    <>
                      <Form.Item name="review_type" label="ขอบเขตการอนุมัติ" rules={[{ required: true }]}>
                        <Radio.Group>
                          <Radio value="full">อนุมัติทั้งหมด (ส่งได้ทุกฟิลด์)</Radio>
                          <Radio value="partial">อนุมัติแบบตัดบางฟิลด์ (PDPA)</Radio>
                        </Radio.Group>
                      </Form.Item>

                      {reviewType === 'partial' && (
                        <Form.Item label="ฟิลด์/คอลัมน์ที่ห้ามส่ง (ผู้ประมวลผลจะไม่ดึงให้)">
                          <Form.List name="restricted_fields">
                            {(fields, { add, remove }) => (
                              <div className="space-y-2">
                                {fields.map(({ key, ...f }) => (
                                  <div key={key} className="flex gap-2 items-start">
                                    <Form.Item {...f} name={[f.name, 'field_name']} rules={[{ required: true, whitespace: true, message: 'ระบุชื่อฟิลด์' }]} className="mb-0" style={{ flex: '0 0 45%' }}>
                                      <Input placeholder="เช่น เลขบัตร ปชช., ชื่อ-สกุล, HN" />
                                    </Form.Item>
                                    <Form.Item {...f} name={[f.name, 'note']} className="mb-0 grow">
                                      <Input placeholder="เหตุผล (ถ้ามี)" />
                                    </Form.Item>
                                    <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(f.name)} />
                                  </div>
                                ))}
                                <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()} className="w-full">เพิ่มฟิลด์ที่ห้ามส่ง</Button>
                              </div>
                            )}
                          </Form.List>
                        </Form.Item>
                      )}

                      <Form.Item name="assigned_to" label={<span><TeamOutlined /> มอบหมายเจ้าพนักงานเวชสถิติ</span>} rules={[{ required: true, message: 'กรุณาเลือกผู้ประมวลผล' }]}>
                        <Select showSearch optionFilterProp="label" placeholder="เลือกผู้ประมวลผล"
                          options={staff.map(s => ({ value: s.id, label: `${s.name}${s.position_name ? ' — ' + s.position_name : ''}` }))} />
                      </Form.Item>
                    </>
                  )}

                  <Form.Item name="review_note" label={decision === 'reject' ? 'เหตุผลที่ปฏิเสธ' : 'หมายเหตุถึงผู้ประมวลผล'}
                    rules={decision === 'reject' ? [{ required: true, message: 'กรุณาระบุเหตุผล' }] : []}>
                    <Input.TextArea rows={2} placeholder={decision === 'reject' ? 'ระบุเหตุผล...' : 'เช่น ให้เสร็จภายใน 3 วัน / ระวังข้อมูลส่วนบุคคล'} />
                  </Form.Item>
                </Form>
              </>
            ) : (
              <Alert type={selected.status === 'rejected' ? 'error' : 'success'} showIcon
                title={`พิจารณาแล้ว: ${STATUS_CONFIG[selected.status].label}${selected.review_type === 'partial' ? ' (ตัดบางฟิลด์)' : ''}`}
                description={<>
                  {selected.assigned_to_name && <div>ผู้จัดทำ: {selected.assigned_to_name}</div>}
                  {(selected.restricted_fields ?? []).length > 0 && <div className="mt-1">ห้ามส่ง: {(selected.restricted_fields ?? []).map(r => r.field_name).join(', ')}</div>}
                  {selected.review_note && <div className="mt-1">หมายเหตุ: {selected.review_note}</div>}
                </>} />
            )}
          </Spin>
        )}
      </Drawer>
    </div>
  )
}

export default function StatisticsReviewPage() {
  return <AppThemeProvider colorPrimary={ACCENT}><PageContent /></AppThemeProvider>
}
