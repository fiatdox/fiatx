'use client'
// หลังบ้านของระบบ: ค่าเริ่มต้นและกำหนดวัน เช่น คืนหลักประกันภายในกี่วัน
import React, { useCallback, useEffect, useState } from 'react'
import { Alert, App, Button, Card, Empty, Form, Input, InputNumber, Modal, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { FaCogs } from 'react-icons/fa'
import dayjs from 'dayjs'
import { api, ApiError, cardStyle, ContractPage, DATE_FORMAT, type ContractMe } from '../contractShared'

const { Text } = Typography

/* eslint-disable @typescript-eslint/no-explicit-any */
const SettingsContent = ({ me }: { me: ContractMe }) => {
  const { message } = App.useApp()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const load = useCallback(async () => {
    try { setRows(await api('rules')) }
    catch (e) { message.error((e as Error).message) } finally { setLoading(false) }
  }, [message])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])

  const open = (r: any) => {
    form.setFieldsValue({ value: r.value, ref_doc: r.ref_doc })
    setEditing(r)
  }
  const save = async () => {
    const v = await form.validateFields().catch(() => null)
    if (!v) return
    setSaving(true)
    try {
      await api(`rules/${editing.key}`, 'PUT', { value: v.value, ref_doc: v.ref_doc ?? null })
      message.success('บันทึกแล้ว กำหนดงานที่ยังเปิดอยู่ถูกปรับตามค่าใหม่')
      setEditing(null)
      load()
    } catch (e) {
      const err = e as ApiError
      if (err.field) form.setFields([{ name: err.field, errors: [err.message] }])
      else message.error(err.message)
    } finally { setSaving(false) }
  }

  const columns: ColumnsType<any> = [
    { title: 'รายการ', dataIndex: 'label' },
    { title: 'ค่า', dataIndex: 'value', width: 110, align: 'right', render: (v: number, r: any) => <Text strong>{v}{r.unit ? ` ${r.unit}` : ''}</Text> },
    { title: 'ที่มา', dataIndex: 'ref_doc', render: (v: string | null, r: any) => v ?? (r.is_proposal ? <Tag>ข้อเสนอ ไม่ใช่ข้อกำหนดตามระเบียบ</Tag> : '—') },
    { title: 'แก้ล่าสุด', dataIndex: 'updated_at', width: 210, render: (v: string, r: any) => r.updated_by_name ? <>{r.updated_by_name}<div style={{ fontSize: 12 }}><Text type="secondary">{dayjs(v).locale('th').format(`${DATE_FORMAT} HH:mm`)}</Text></div></> : <Text type="secondary">ค่าตั้งต้น</Text> },
    { title: '', width: 90, align: 'right', render: (_: unknown, r: any) => r.editable ? <Button size="small" onClick={() => open(r)}>แก้ไข</Button> : null },
  ]

  return (
    <>
      <Alert className="mb-3" type="warning" showIcon title="เลขอ้างอิงระเบียบมาจากบทความสรุป ยังไม่ได้ตรวจกับหนังสือเวียนต้นฉบับ" description="ให้เจ้าหน้าที่พัสดุยืนยันค่าเหล่านี้ก่อนใช้งานจริง" />
      {!me.canEditRules && <Alert className="mb-3" type="info" showIcon title="ค่าเหล่านี้แก้ได้เฉพาะผู้ดูแลระบบ" />}
      <Card style={cardStyle} styles={{ body: { padding: 12 } }}>
        <Table size="small" rowKey="key" loading={loading} columns={columns} dataSource={rows} pagination={false} scroll={{ x: 'max-content' }}
          locale={{ emptyText: <Empty description="ไม่มีรายการ" /> }} />
      </Card>
      <Modal title={editing?.label} open={!!editing} onCancel={() => setEditing(null)} onOk={save} okText="บันทึก" cancelText="ยกเลิก" confirmLoading={saving} forceRender>
        <Form form={form} layout="vertical">
          <Form.Item name="value" label={`ค่า${editing?.unit ? ` (${editing.unit})` : ''}`} rules={[{ required: true, message: 'กรุณาระบุค่า' }]}>
            <InputNumber min={0} max={3650} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="ref_doc" label="เลขหนังสือเวียน/ระเบียบที่อ้างอิง"><Input maxLength={200} /></Form.Item>
        </Form>
        <Text type="secondary" style={{ fontSize: 12 }}>เรื่องเสนอคืนที่ส่งไปแล้วจะใช้กำหนดคืนเดิม ค่าใหม่มีผลกับเรื่องที่เสนอหลังจากนี้</Text>
      </Modal>
    </>
  )
}

export default function ContractSettingsPage() {
  return (
    <ContractPage screen="settings" title="ตั้งค่าเริ่มต้น" icon={<FaCogs />} subtitle="ระยะประกันเริ่มต้น จำนวนวันคืนหลักประกัน และกำหนดวันอื่น ๆ">
      {me => <SettingsContent me={me} />}
    </ContractPage>
  )
}
