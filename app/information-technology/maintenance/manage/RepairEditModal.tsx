'use client'
// แก้ไขข้อมูลใบส่งซ่อม — ช่าง/งาน IT แก้สิ่งที่ผู้แจ้งกรอกผิด (ชื่อครุภัณฑ์ ยี่ห้อ เลขครุภัณฑ์ ประเภท ฯลฯ)
// โหลดค่าปัจจุบัน + ตัวเลือก + ประวัติจาก GET /repair-requests/:id/edit · ส่งเฉพาะช่องที่เปลี่ยนไป PATCH /repair-requests/:id
// อาการที่ผู้แจ้งเขียน / ความเร่งด่วน / สถานะ ไม่ได้แก้ที่นี่ (backend ไม่รับ)
import React, { useEffect, useState } from 'react'
import { Alert, App, Col, Collapse, Form, Input, InputNumber, Modal, Row, Select, Skeleton, Typography } from 'antd'
import { EditOutlined, HistoryOutlined } from '@ant-design/icons'

const { Text } = Typography

export interface RepairEditValues {
  equipment_name: string
  brand: string | null
  equipment_number: string | null
  it_equipment_type_id: number
  problem_category_id: number | null
  location: string | null
  company_name: string | null
  budget_year: string | null
  unit_price: number | null
}
export interface RepairEditSaved extends RepairEditValues { equipment_type_name: string | null; problem_category_name: string | null }
interface Option { id: number; name: string }
interface HistoryEntry { id: number; changes: Record<string, { from: unknown; to: unknown }>; edited_at: string; edited_by_name: string | null }
interface EditData { request: RepairEditValues; equipment_types: Option[]; problem_categories: Option[]; labels: Record<string, string>; history: HistoryEntry[] }

const FIELDS: (keyof RepairEditValues)[] = ['equipment_name', 'brand', 'equipment_number', 'it_equipment_type_id', 'problem_category_id', 'location', 'company_name', 'budget_year', 'unit_price']
const norm = (v: unknown) => (typeof v === 'string' ? (v.trim() || null) : v ?? null)
const thaiDateTime = (iso: string) => new Date(iso).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function RepairEditModal({ apiId, code, onClose, onSaved }: {
  /** id ของใบส่งซ่อม — null = ปิด */
  apiId: number | null; code?: string; onClose: () => void; onSaved: (r: RepairEditSaved) => void
}) {
  const { message } = App.useApp()
  const [form] = Form.useForm<RepairEditValues>()
  const [data, setData] = useState<EditData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!apiId) return
    let alive = true
    fetch(`/api/v1/it/repair-requests/${apiId}/edit`)
      .then(async res => {
        const json = await res.json().catch(() => ({}))
        if (!alive) return
        if (!res.ok || json.success === false) { setError(json.message ?? `โหลดข้อมูลไม่สำเร็จ (${res.status})`); return }
        setData(json.data); form.setFieldsValue(json.data.request)
      })
      .catch(() => { if (alive) setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้') })
    return () => { alive = false }
  }, [apiId, form])

  const close = () => { setData(null); setError(null); form.resetFields(); onClose() }

  const submit = async (values: RepairEditValues) => {
    if (!apiId || !data) return
    // ส่งเฉพาะช่องที่เปลี่ยน — ประวัติจะได้ไม่มีรายการที่ไม่ได้แก้
    const body: Record<string, unknown> = {}
    for (const k of FIELDS) if (norm(values[k]) !== norm(data.request[k])) body[k] = norm(values[k])
    if (Object.keys(body).length === 0) { message.info('ไม่มีข้อมูลที่เปลี่ยนแปลง'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/it/repair-requests/${apiId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.success === false) {
        if (json.field) form.setFields([{ name: json.field, errors: [json.message] }])
        message.error(json.message ?? `บันทึกไม่สำเร็จ (${res.status})`)
        return
      }
      message.success(`แก้ไขข้อมูล ${code ?? 'ใบส่งซ่อม'} แล้ว`)
      onSaved(json.data.request)
      close()
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้')
    } finally {
      setSaving(false)
    }
  }

  const nameOf = (k: string, v: unknown): string => {
    if (v == null || v === '') return '(ว่าง)'
    if (k === 'it_equipment_type_id') return data?.equipment_types.find(t => t.id === v)?.name ?? String(v)
    if (k === 'problem_category_id') return data?.problem_categories.find(t => t.id === v)?.name ?? String(v)
    if (k === 'unit_price') return Number(v).toLocaleString('th-TH', { maximumFractionDigits: 2 })
    return String(v)
  }

  return (
    <Modal
      title={<span><EditOutlined style={{ color: '#0ea5e9', marginRight: 8 }} />แก้ไขข้อมูลใบส่งซ่อม{code && <code style={{ color: '#a78bfa', fontSize: 12, marginLeft: 8, fontWeight: 400 }}>{code}</code>}</span>}
      open={!!apiId} onCancel={close} onOk={() => form.submit()} okText="บันทึกการแก้ไข" cancelText="ยกเลิก"
      confirmLoading={saving} okButtonProps={{ disabled: !data }} width={720} destroyOnHidden
    >
      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 12 }} />}
      {!data && !error && <Skeleton active paragraph={{ rows: 6 }} />}
      <Form form={form} layout="vertical" onFinish={submit} style={{ display: data ? undefined : 'none' }} data-testid="repair-edit-form">
        <Alert type="info" showIcon style={{ marginBottom: 14 }}
          title={<span style={{ fontSize: 12 }}>แก้ไขข้อมูลครุภัณฑ์ที่ผู้แจ้งกรอกไม่ถูกต้อง — อาการที่แจ้ง ความเร่งด่วน และสถานะงานไม่เปลี่ยน · ระบบเก็บประวัติว่าใครแก้อะไรเมื่อไร</span>} />
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item name="equipment_name" label="ชื่อครุภัณฑ์" rules={[{ required: true, whitespace: true, message: 'กรุณาระบุชื่อครุภัณฑ์' }, { max: 255 }]}>
              <Input placeholder="เช่น เครื่องคอมพิวเตอร์ตั้งโต๊ะ" maxLength={255} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="brand" label="ยี่ห้อ / รุ่น" rules={[{ max: 100 }]}>
              <Input placeholder="เช่น Dell OptiPlex 7010" maxLength={100} allowClear />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="equipment_number" label="เลขครุภัณฑ์" rules={[{ max: 100 }]}>
              <Input maxLength={100} allowClear />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="it_equipment_type_id" label="ประเภทอุปกรณ์" rules={[{ required: true, message: 'กรุณาเลือกประเภทอุปกรณ์' }]}>
              <Select showSearch optionFilterProp="label" options={(data?.equipment_types ?? []).map(t => ({ value: t.id, label: t.name }))} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="problem_category_id" label="หมวดปัญหา">
              <Select showSearch optionFilterProp="label" options={(data?.problem_categories ?? []).map(t => ({ value: t.id, label: t.name }))} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="location" label="สถานที่ตั้ง" rules={[{ max: 500 }]}>
              <Input maxLength={500} allowClear />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="company_name" label="บริษัทผู้ขาย" rules={[{ max: 150 }]}>
              <Input maxLength={150} allowClear />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="budget_year" label="ปีงบที่ได้มา" rules={[{ pattern: /^\d{4}$/, message: 'ตัวเลข 4 หลัก เช่น 2567' }]}>
              <Input maxLength={4} inputMode="numeric" placeholder="2567" allowClear />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="unit_price" label="ราคาต่อหน่วย (บาท)">
              <InputNumber min={0} max={9999999999} precision={2} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
      {data && data.history.length > 0 && (
        <Collapse size="small" ghost data-testid="repair-edit-history"
          items={[{
            key: 'h',
            label: <Text style={{ fontSize: 12, color: 'var(--app-text-2)' }}><HistoryOutlined /> ประวัติการแก้ไข {data.history.length} ครั้ง</Text>,
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                {data.history.map(h => (
                  <div key={h.id} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, background: 'var(--app-bg)' }}>
                    <div style={{ color: 'var(--app-text-3)' }}>{thaiDateTime(h.edited_at)} · {h.edited_by_name ?? '-'}</div>
                    {Object.entries(h.changes).map(([k, c]) => (
                      <div key={k}><Text style={{ fontSize: 12, color: 'var(--app-text-2)' }}>{data.labels[k] ?? k}:</Text> <del style={{ color: 'var(--app-text-3)' }}>{nameOf(k, c.from)}</del> → <Text strong style={{ fontSize: 12 }}>{nameOf(k, c.to)}</Text></div>
                    ))}
                  </div>
                ))}
              </div>
            ),
          }]} />
      )}
    </Modal>
  )
}
