'use client'
// แก้ยอดวันลาสะสมหนึ่งแถว (ยกมา / สิทธิ์ปีนี้ / ใช้ไปแล้ว) — ใช้ร่วมกันระหว่างหน้าวันลาสะสม และหน้าตรวจแก้วันลาสะสม
// แก้ตัวเลขต้องระบุเหตุผล · backend เก็บค่าก่อน/หลังไว้ทุกครั้ง (แท็บประวัติการแก้ไข)
import { useEffect, useState } from 'react'
import { Alert, App, Button, Col, Empty, Form, Input, InputNumber, Modal, Row, Skeleton, Space, Tabs, Tag, Timeline, Typography } from 'antd'
import { BulbOutlined, EditOutlined, HistoryOutlined } from '@ant-design/icons'

const { Text } = Typography

export interface BalanceEditTarget {
  balance_id: number | null
  user_id: number
  leave_type_id: number
  fiscal_year: number
  name: string
  leave_type_name: string
  carried_in: number
  entitled: number
  used: number
  note?: string | null
  /** ค่าที่ระบบแนะนำ (จากหน้าตรวจแก้) — มีปุ่ม "ใช้ค่าที่แนะนำ" */
  suggest?: Partial<Record<'carried_in' | 'entitled' | 'used', number>> | null
  /** ยอดยกมาที่แนะนำมาจากคงเหลือปีก่อน — ให้ระบบปรับตามปีก่อนต่อได้ */
  keep_carry_link?: boolean
}

interface LogSnap { carried_in: number; entitled: number; used: number; remaining: number; note: string | null }
interface BalanceLog { id: number; action: 'CREATE' | 'UPDATE'; before: LogSnap | null; after: LogSnap; reason: string | null; created_at: string; actor_name: string | null }

const FIELDS = [
  { key: 'carried_in', label: 'ยอดยกมา' },
  { key: 'entitled', label: 'สิทธิ์ปีนี้' },
  { key: 'used', label: 'ใช้ไปแล้ว' },
] as const
type FieldKey = typeof FIELDS[number]['key']

const fmt = (n: number) => Number(n).toLocaleString('th-TH', { maximumFractionDigits: 1 })
const fmtTime = (s: string) => new Date(s).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })

const LogHistory = ({ balanceId }: { balanceId: number }) => {
  const [data, setData] = useState<{ logs: BalanceLog[]; current: { updated_at: string; updated_by_name: string | null } } | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    fetch(`/api/v1/hr/leave-balances/${balanceId}/logs`)
      .then(r => r.json())
      .then(j => { if (alive) { if (j?.success) setData(j.data); else setError(j?.message ?? 'โหลดประวัติไม่สำเร็จ') } })
      .catch(() => { if (alive) setError('โหลดประวัติไม่สำเร็จ') })
    return () => { alive = false }
  }, [balanceId])
  if (error) return <Alert type="error" showIcon title={error} />
  if (!data) return <Skeleton active paragraph={{ rows: 3 }} />
  if (!data.logs.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Text type="secondary" style={{ fontSize: 12 }}>
            ยังไม่มีประวัติการแก้ไขในระบบ · ปรับปรุงล่าสุด {fmtTime(data.current.updated_at)}
            {data.current.updated_by_name?.trim() ? ` โดย ${data.current.updated_by_name}` : ' (ระบบ)'}
          </Text>
        }
      />
    )
  }
  return (
    <Timeline
      style={{ marginTop: 8 }}
      items={data.logs.map(l => ({
        color: l.action === 'CREATE' ? 'green' : 'blue',
        content: (
          <div>
            <Text strong style={{ fontSize: 13 }}>{l.action === 'CREATE' ? 'เพิ่มยอด' : 'แก้ไขยอด'}</Text>
            <Text type="secondary" style={{ fontSize: 12, marginInlineStart: 8 }}>{fmtTime(l.created_at)} · {l.actor_name?.trim() || '-'}</Text>
            <div className="flex flex-wrap gap-1 mt-1">
              {FIELDS.map(f => {
                const before = l.before?.[f.key]
                const after = l.after[f.key]
                if (l.before && before === after) return null
                return (
                  <Tag key={f.key} style={{ marginInlineEnd: 0 }}>
                    {f.label} {l.before ? <><Text delete type="secondary">{fmt(before ?? 0)}</Text> → </> : null}<Text strong>{fmt(after)}</Text>
                  </Tag>
                )
              })}
              <Tag color="green" style={{ marginInlineEnd: 0 }}>คงเหลือ {fmt(l.after.remaining)}</Tag>
            </div>
            {l.reason && <Text style={{ fontSize: 12 }}>เหตุผล: {l.reason}</Text>}
          </div>
        ),
      }))}
    />
  )
}

export default function BalanceEditModal({ target, onClose, onSaved }: {
  target: BalanceEditTarget | null
  onClose: () => void
  onSaved: () => void
}) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('edit')
  const values = Form.useWatch([], form) as Partial<Record<FieldKey, number>> | undefined

  useEffect(() => {
    if (!target) return
    form.setFieldsValue({ carried_in: target.carried_in, entitled: target.entitled, used: target.used, note: target.note ?? '', reason: '' })
    void Promise.resolve().then(() => setTab('edit'))
  }, [target, form])

  const isNew = target?.balance_id == null
  const changed = !!target && FIELDS.some(f => Number(values?.[f.key] ?? target[f.key]) !== Number(target[f.key]))
  const remaining = target ? Number(values?.carried_in ?? target.carried_in) + Number(values?.entitled ?? target.entitled) - Number(values?.used ?? target.used) : 0
  const usingSuggest = !!target?.suggest && Object.entries(target.suggest).every(([k, v]) => Number(values?.[k as FieldKey]) === Number(v))

  const applySuggest = () => {
    if (target?.suggest) form.setFieldsValue(target.suggest)
  }

  const save = async () => {
    if (!target) return
    const v = await form.validateFields()
    setSaving(true)
    try {
      const body: Record<string, unknown> = isNew
        ? { user_id: target.user_id, leave_type_id: target.leave_type_id, fiscal_year: target.fiscal_year, carried_in: v.carried_in, entitled: v.entitled, used: v.used, note: v.note || null, reason: v.reason || undefined }
        : {
            ...Object.fromEntries(FIELDS.filter(f => Number(v[f.key]) !== Number(target[f.key])).map(f => [f.key, v[f.key]])),
            note: v.note || null,
            ...(v.reason ? { reason: v.reason } : {}),
            ...(usingSuggest && target.keep_carry_link ? { keep_carry_link: true } : {}),
          }
      const res = await fetch(isNew ? '/api/v1/hr/leave-balances' : `/api/v1/hr/leave-balances/${target.balance_id}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) { message.error(json.message || 'บันทึกไม่สำเร็จ'); return }
      message.success('บันทึกยอดวันลาเรียบร้อย')
      onSaved()
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={<Space><EditOutlined style={{ color: '#10b981' }} /><span>{isNew ? 'เพิ่มยอดวันลา' : 'แก้ไขยอดวันลา'} — {target?.name}</span></Space>}
      open={target != null}
      onCancel={onClose}
      onOk={save}
      okText="บันทึก"
      cancelText="ยกเลิก"
      confirmLoading={saving}
      okButtonProps={{ disabled: tab !== 'edit' }}
      width={620}
      destroyOnHidden
      forceRender
    >
      {target && (
        <Text type="secondary" style={{ fontSize: 12 }}>{target.leave_type_name} · ปีงบประมาณ {target.fiscal_year}</Text>
      )}
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          {
            key: 'edit', label: <span><EditOutlined /> แก้ไขยอด</span>,
            children: (
              <Form form={form} layout="vertical">
                {target?.suggest && (
                  <Alert
                    type={usingSuggest ? 'success' : 'info'} showIcon icon={<BulbOutlined />} className="mb-3"
                    title={
                      <span>
                        ค่าที่แนะนำ: {FIELDS.filter(f => target.suggest?.[f.key] != null).map(f => `${f.label} ${fmt(target.suggest![f.key]!)}`).join(' · ')}
                      </span>
                    }
                    action={!usingSuggest && <Button size="small" type="primary" onClick={applySuggest}>ใช้ค่าที่แนะนำ</Button>}
                  />
                )}
                <Row gutter={12}>
                  {FIELDS.map(f => (
                    <Col span={8} key={f.key}>
                      <Form.Item name={f.key} label={`${f.label} (วัน)`} rules={[{ required: true, message: 'กรุณาระบุ' }]}>
                        <InputNumber min={0} max={999} step={0.5} precision={1} className="w-full" />
                      </Form.Item>
                    </Col>
                  ))}
                </Row>
                <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-lg" style={{ background: 'var(--app-surface-2, rgba(16,185,129,0.08))' }}>
                  <Text type="secondary">คงเหลือหลังแก้ = ยกมา + สิทธิ์ปีนี้ − ใช้ไปแล้ว</Text>
                  <Text strong style={{ fontSize: 18, color: remaining < 0 ? '#ef4444' : '#10b981' }}>{fmt(remaining)} วัน</Text>
                </div>
                <Form.Item
                  name="reason" label="เหตุผลที่แก้ไข"
                  rules={[{ required: !isNew && changed, whitespace: true, message: 'กรุณาระบุเหตุผลที่แก้ไขยอดวันลา' }]}
                  extra={isNew ? 'ไม่บังคับสำหรับการเพิ่มยอดครั้งแรก' : 'จำเป็นเมื่อแก้ตัวเลข — เก็บไว้ในประวัติการแก้ไข'}
                >
                  <Input maxLength={255} placeholder="เช่น ยอดยกมาจากโปรแกรมเดิมเกินเพดานสะสม / ตรวจสอบกับทะเบียนวันลาแล้ว" />
                </Form.Item>
                <Form.Item name="note" label="หมายเหตุ (แสดงในตารางวันลาสะสม)">
                  <Input.TextArea rows={2} maxLength={255} placeholder="เช่น ย้ายมาจาก รพ.xxx" />
                </Form.Item>
              </Form>
            ),
          },
          ...(target?.balance_id ? [{
            key: 'logs', label: <span><HistoryOutlined /> ประวัติการแก้ไข</span>,
            children: <LogHistory balanceId={target.balance_id} />,
          }] : []),
        ]}
      />
    </Modal>
  )
}
