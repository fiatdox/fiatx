'use client'
// หน้าจอผู้ครอบครองพัสดุ: ดูวันหมดประกันของพัสดุที่ดูแล และแจ้งความชำรุด
import React, { useCallback, useEffect, useState } from 'react'
import { App, Button, Card, Empty, Form, Input, Modal, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { FaTools } from 'react-icons/fa'
import dayjs from 'dayjs'
import { api, ApiError, cardStyle, ContractDrawer, ContractPage, DATE_FORMAT, fmtDate, ThaiDatePicker, toApiDate, type ContractMe } from '../contractShared'

const { Text } = Typography

/* eslint-disable @typescript-eslint/no-explicit-any */
const CustodianContent = ({ me }: { me: ContractMe }) => {
  const { message } = App.useApp()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<number | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [target, setTarget] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const load = useCallback(async () => {
    try { setRows((await api('list?duty=custodian')).filter((c: any) => c.status === 'active')) }
    catch (e) { message.error((e as Error).message) } finally { setLoading(false) }
  }, [message])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])

  const openForm = (c: any) => {
    form.resetFields()
    form.setFieldsValue({ found_date: dayjs() })
    setTarget(c)
  }
  const save = async () => {
    const v = await form.validateFields().catch(() => null)
    if (!v) return
    setSaving(true)
    try {
      await api(`list/${target.id}/defects`, 'POST', { ...v, found_date: toApiDate(v.found_date) })
      message.success('แจ้งความชำรุดแล้ว พัสดุจะติดตามผู้รับจ้าง')
      setTarget(null)
      setRefresh(n => n + 1)
      load()
    } catch (e) {
      const err = e as ApiError
      if (err.field) form.setFields([{ name: err.field, errors: [err.message] }])
      else message.error(err.message)
    } finally { setSaving(false) }
  }

  const left = (t: string | null) => {
    if (!t) return <Tag>ยังไม่ตั้ง</Tag>
    const days = dayjs(t).startOf('day').diff(dayjs().startOf('day'), 'day')
    if (days < 0) return <Tag>หมดประกันแล้ว {fmtDate(t)}</Tag>
    return <>{fmtDate(t)} <Text type="secondary">(อีก {days.toLocaleString('th-TH')} วัน)</Text></>
  }
  const columns: ColumnsType<any> = [
    { title: 'เลขที่สัญญา', dataIndex: 'contract_no', width: 150, render: (v: string, r: any) => <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setOpenId(r.id)}>{v}</Button> },
    { title: 'โครงการ', dataIndex: 'project_name', render: (v: string, r: any) => <><div>{v}</div><Text type="secondary" style={{ fontSize: 12 }}>{r.vendor_name}</Text></> },
    { title: 'วันหมดประกัน', dataIndex: 'warranty_end_date', width: 220, render: left },
    { title: 'ชำรุดค้าง', dataIndex: 'open_defects', width: 90, align: 'center', render: (v: number) => v > 0 ? <Tag color="error">{v} รายการ</Tag> : '—' },
    ...(me.isAdmin ? [] : [{ title: '', width: 120, align: 'right' as const, render: (_: unknown, r: any) => <Button size="small" type="primary" onClick={() => openForm(r)}>แจ้งชำรุด</Button> }]),
  ]

  return (
    <>
      <Card style={cardStyle} styles={{ body: { padding: 12 } }}>
        <Table size="small" rowKey="id" loading={loading} columns={columns} dataSource={rows} pagination={{ pageSize: 20, hideOnSinglePage: true }} scroll={{ x: 'max-content' }}
          locale={{ emptyText: <Empty description="ไม่มีสัญญาที่ดูแล" /> }} />
      </Card>
      <ContractDrawer id={openId} refreshKey={refresh} onClose={() => setOpenId(null)}
        renderActions={d => d.can.report_defect && <Button size="small" type="primary" onClick={() => openForm(d)}>แจ้งชำรุด</Button>} />
      <Modal title={`แจ้งความชำรุด ${target?.contract_no ?? ''}`} open={!!target} onCancel={() => setTarget(null)} onOk={save} okText="แจ้งชำรุด" cancelText="ยกเลิก" confirmLoading={saving} forceRender zIndex={1100 /* เปิดจากลิ้นชักสัญญาได้ ต้องอยู่เหนือลิ้นชัก */}>
        <Form form={form} layout="vertical">
          <Form.Item name="found_date" label="วันที่พบ" rules={[{ required: true, message: 'กรุณาระบุวันที่' }]}>
            <ThaiDatePicker format={DATE_FORMAT} style={{ width: '100%' }} disabledDate={d => d.isAfter(dayjs(), 'day')} />
          </Form.Item>
          <Form.Item name="detail" label="รายละเอียดความชำรุด" rules={[{ required: true, message: 'กรุณาระบุรายละเอียด' }]}>
            <Input.TextArea rows={4} placeholder="พบที่ไหน อาการเป็นอย่างไร" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default function CustodianContractsPage() {
  return (
    <ContractPage screen="custodian" title="ผู้ครอบครองพัสดุ" icon={<FaTools />} subtitle="เฝ้าระวังและแจ้งความชำรุดระหว่างประกัน">
      {me => <CustodianContent me={me} />}
    </ContractPage>
  )
}
