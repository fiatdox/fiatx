'use client'
// หน้าจอกรรมการตรวจรับ / ผู้ควบคุมงาน: เห็นเฉพาะสัญญาที่ได้รับมอบหมาย บันทึกผลตรวจ
import React, { useCallback, useEffect, useState } from 'react'
import { App, Button, Card, Empty, Form, Input, Modal, Radio, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { FaClipboardCheck } from 'react-icons/fa'
import dayjs from 'dayjs'
import { api, ApiError, cardStyle, ContractDrawer, ContractPage, DATE_FORMAT, DueTag, fmtDate, ThaiDatePicker, toApiDate, type ContractMe } from '../contractShared'

const { Text } = Typography

/* eslint-disable @typescript-eslint/no-explicit-any */
const InspectionContent = ({ me }: { me: ContractMe }) => {
  const { message } = App.useApp()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<number | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [target, setTarget] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const result = Form.useWatch('result', form)

  const load = useCallback(async () => {
    try { setRows((await api('list?duty=field')).filter((c: any) => c.status === 'active')) }
    catch (e) { message.error((e as Error).message) } finally { setLoading(false) }
  }, [message])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])

  const openForm = (c: any) => {
    form.resetFields()
    form.setFieldsValue({ kind: 'final', inspected_date: dayjs() })
    setTarget(c)
  }
  const save = async () => {
    const v = await form.validateFields().catch(() => null)
    if (!v) return
    setSaving(true)
    try {
      await api(`list/${target.id}/inspections`, 'POST', { ...v, inspected_date: toApiDate(v.inspected_date) })
      message.success(v.result === 'defect' ? 'บันทึกแล้ว และแจ้งรายการชำรุดให้พัสดุติดตาม' : 'บันทึกผลตรวจแล้ว')
      setTarget(null)
      setRefresh(n => n + 1)
      load()
    } catch (e) {
      const err = e as ApiError
      if (err.field) form.setFields([{ name: err.field, errors: [err.message] }])
      else message.error(err.message)
    } finally { setSaving(false) }
  }

  const canRecord = (r: any) => !me.isAdmin && (r.my_duties ?? '').split(',').some((d: string) => ['committee', 'supervisor', 'custodian'].includes(d))
  const columns: ColumnsType<any> = [
    { title: 'เลขที่สัญญา', dataIndex: 'contract_no', width: 150, render: (v: string, r: any) => <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setOpenId(r.id)}>{v}</Button> },
    { title: 'โครงการ', dataIndex: 'project_name', render: (v: string, r: any) => <><div>{v}</div><Text type="secondary" style={{ fontSize: 12 }}>{r.vendor_name}</Text></> },
    { title: 'หมดประกัน (T)', dataIndex: 'warranty_end_date', width: 120, render: fmtDate },
    { title: 'งานถัดไป', dataIndex: 'next_task', width: 250, render: (v: string | null, r: any) => v ? <><div style={{ fontSize: 13 }}>{v}</div><DueTag state={r.due_state} date={r.next_due} /></> : '—' },
    { title: 'ตรวจรอบสุดท้าย', dataIndex: 'final_result', width: 130, render: (v: string | null) => v === 'pass' ? <Tag color="success">ไม่พบชำรุด</Tag> : v === 'defect' ? <Tag color="error">พบชำรุด</Tag> : <Tag>ยังไม่ตรวจ</Tag> },
    { title: '', width: 130, align: 'right', render: (_: unknown, r: any) => canRecord(r) ? <Button size="small" type="primary" onClick={() => openForm(r)}>บันทึกผลตรวจ</Button> : <Text type="secondary" style={{ fontSize: 12 }}>ดูอย่างเดียว</Text> },
  ]

  return (
    <>
      <Card style={cardStyle} styles={{ body: { padding: 12 } }}>
        <Table size="small" rowKey="id" loading={loading} columns={columns} dataSource={rows} pagination={{ pageSize: 20, hideOnSinglePage: true }} scroll={{ x: 'max-content' }}
          locale={{ emptyText: <Empty description="ไม่มีสัญญาที่ต้องตรวจ" /> }} />
      </Card>
      <ContractDrawer id={openId} refreshKey={refresh} onClose={() => setOpenId(null)}
        renderActions={d => d.can.inspect && <Button size="small" type="primary" onClick={() => openForm(d)}>บันทึกผลตรวจ</Button>} />
      <Modal title={`บันทึกผลตรวจ ${target?.contract_no ?? ''}`} open={!!target} onCancel={() => setTarget(null)} onOk={save} okText="บันทึก" cancelText="ยกเลิก" confirmLoading={saving} forceRender>
        <Form form={form} layout="vertical">
          <Form.Item name="kind" label="รอบการตรวจ" rules={[{ required: true, message: 'กรุณาเลือก' }]}>
            <Radio.Group options={[{ value: 'final', label: 'ตรวจรอบสุดท้าย' }, { value: 'periodic', label: 'ตามรอบสัญญา' }]} />
          </Form.Item>
          <Form.Item name="inspected_date" label="วันที่ตรวจ" rules={[{ required: true, message: 'กรุณาระบุวันที่' }]}>
            <ThaiDatePicker format={DATE_FORMAT} style={{ width: '100%' }} disabledDate={d => d.isAfter(dayjs(), 'day')} />
          </Form.Item>
          <Form.Item name="result" label="ผลการตรวจ" rules={[{ required: true, message: 'กรุณาเลือกผลการตรวจ' }]}>
            <Radio.Group options={[{ value: 'pass', label: 'ไม่พบความชำรุด' }, { value: 'defect', label: 'พบความชำรุด' }]} />
          </Form.Item>
          <Form.Item name="detail" label="รายละเอียด" rules={[{ required: result === 'defect', message: 'พบชำรุดต้องระบุรายละเอียด' }]}>
            <Input.TextArea rows={3} placeholder={result === 'defect' ? 'ระบุจุดที่ชำรุด ระบบจะส่งให้พัสดุติดตาม' : 'ถ้ามี'} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default function InspectionContractsPage() {
  return (
    <ContractPage screen="inspection" title="กรรมการตรวจรับ / ผู้ควบคุมงาน" icon={<FaClipboardCheck />} subtitle="เห็นเฉพาะสัญญาที่ได้รับมอบหมาย รวมถึงในฐานะผู้สำรอง">
      {me => <InspectionContent me={me} />}
    </ContractPage>
  )
}
