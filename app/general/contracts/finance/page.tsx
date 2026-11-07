'use client'
// หน้าจอกลุ่มงานการเงิน: ทะเบียนหลักประกัน วันหมดอายุ จ่ายคืน วางทรัพย์ ส่งคลัง
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, App, Button, Card, Col, Empty, Form, Input, InputNumber, Modal, Row, Segmented, Select, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ExclamationCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { FaCoins } from 'react-icons/fa'
import dayjs from 'dayjs'
import {
  api, ApiError, cardStyle, ContractDrawer, ContractPage, DATE_FORMAT, DueTag, fmtDate, fmtMoney, GUARANTEE_PURPOSES, GUARANTEE_STATUS, GUARANTEE_TYPES,
  PAYOUT_METHODS, RETURN_STATUS, ThaiDatePicker, toApiDate, toFormDate, toOptions, type ContractMe,
} from '../contractShared'

const { Text } = Typography
const { TextArea } = Input

/* eslint-disable @typescript-eslint/no-explicit-any */
type View = 'all' | 'pay' | 'expiring' | 'held' | 'closed'

const FinanceContent = ({ me }: { me: ContractMe }) => {
  const { message, modal } = App.useApp()
  const [rows, setRows] = useState<any[]>([])
  const [contracts, setContracts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<View>('all')
  const [openId, setOpenId] = useState<number | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [editing, setEditing] = useState<any | null>(null)
  const [paying, setPaying] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const [payForm] = Form.useForm()
  const type = Form.useWatch('guarantee_type', form)
  const method = Form.useWatch('method', payForm)

  const load = useCallback(async () => {
    try {
      const [g, c] = await Promise.all([api(`guarantees?search=${encodeURIComponent(search)}`), api('list')])
      setRows(g)
      setContracts(c.filter((x: any) => x.status === 'active'))
    } catch (e) { message.error((e as Error).message) } finally { setLoading(false) }
  }, [search, message])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])

  const fail = (e: unknown, f: any) => {
    const err = e as ApiError
    if (err.field) f.setFields([{ name: err.field, errors: [err.message] }])
    else message.error(err.message)
  }

  const openForm = (g?: any) => {
    form.resetFields()
    form.setFieldsValue(g ? { ...g, expiry_date: toFormDate(g.expiry_date) } : { purpose: 'performance', guarantee_type: 'cash' })
    setEditing(g ?? {})
  }
  const save = async () => {
    const v = await form.validateFields().catch(() => null)
    if (!v) return
    setSaving(true)
    try {
      const body = { ...v, expiry_date: toApiDate(v.expiry_date) }
      let warn = false
      if (editing?.id) await api(`guarantees/${editing.id}`, 'PUT', body)
      else warn = (await api(`list/${v.contract_id}/guarantees`, 'POST', body)).expiring
      setEditing(null)
      setRefresh(n => n + 1)
      load()
      if (warn) modal.warning({ title: 'หนังสือค้ำประกันหมดอายุเร็วเกินไป', content: 'วันหมดอายุไม่คุ้มวันหมดประกันบวกระยะเผื่อ ควรเรียกต่ออายุจากผู้รับจ้าง' })
      else message.success('บันทึกหลักประกันแล้ว')
    } catch (e) { fail(e, form) } finally { setSaving(false) }
  }

  const openPay = (g: any) => {
    payForm.resetFields()
    payForm.setFieldsValue({ method: 'returned', paid_date: dayjs(), deduct_amount: 0 })
    setPaying(g)
  }
  const pay = async () => {
    const v = await payForm.validateFields().catch(() => null)
    if (!v) return
    setSaving(true)
    try {
      const r = await api(`guarantees/${paying.id}/payout`, 'POST', { ...v, paid_date: toApiDate(v.paid_date) })
      message.success(r.contract_closed ? 'บันทึกแล้ว คืนครบทุกรายการ สัญญาปิดเรียบร้อย' : 'บันทึกแล้ว สัญญานี้ยังมีหลักประกันเหลืออยู่')
      setPaying(null)
      setRefresh(n => n + 1)
      load()
    } catch (e) { fail(e, payForm) } finally { setSaving(false) }
  }

  const counts = useMemo(() => ({
    all: rows.length,
    pay: rows.filter(r => r.can_pay).length,
    expiring: rows.filter(r => r.expiring).length,
    held: rows.filter(r => r.status === 'held').length,
    closed: rows.filter(r => r.status !== 'held').length,
  }), [rows])
  const shown = useMemo(() => rows.filter(r => view === 'all' ? true : view === 'pay' ? r.can_pay : view === 'expiring' ? r.expiring : view === 'held' ? r.status === 'held' : r.status !== 'held'), [rows, view])

  const columns: ColumnsType<any> = [
    { title: 'สัญญา', dataIndex: 'contract_no', render: (v: string, r: any) => <><Button type="link" size="small" style={{ padding: 0 }} onClick={() => setOpenId(r.contract_id)}>{v}</Button><div style={{ fontSize: 12 }}><Text type="secondary">{r.project_name} · {r.vendor_name}</Text></div></> },
    { title: 'ประเภท', dataIndex: 'guarantee_type', width: 190, render: (v: string, r: any) => <>{GUARANTEE_TYPES[v]}{r.doc_no ? <div style={{ fontSize: 12 }}><Text type="secondary">{r.bank_name} · {r.doc_no}</Text></div> : null}</> },
    { title: 'จำนวนเงิน', dataIndex: 'amount', width: 130, align: 'right', render: fmtMoney },
    { title: 'หมดประกัน (T)', dataIndex: 'warranty_end_date', width: 115, render: fmtDate },
    { title: 'หนังสือหมดอายุ', dataIndex: 'expiry_date', width: 190, render: (v: string | null, r: any) => r.expiring ? <Tag color="error" icon={<ExclamationCircleOutlined />}>{fmtDate(v)} ต้องต่ออายุ</Tag> : fmtDate(v) },
    { title: 'ที่เก็บ', dataIndex: 'storage_location', width: 170 },
    { title: 'สถานะ', dataIndex: 'status', width: 220, render: (v: string, r: any) => v !== 'held'
      ? <><Tag color={GUARANTEE_STATUS[v]?.color}>{GUARANTEE_STATUS[v]?.label}</Tag>{fmtDate(r.paid_date)}<div style={{ fontSize: 12 }}><Text type="secondary">สุทธิ {fmtMoney(r.net_amount)} · {r.voucher_no}</Text></div></>
      : r.return_status ? <><Tag color={RETURN_STATUS[r.return_status]?.color}>{RETURN_STATUS[r.return_status]?.label}</Tag><DueTag state={r.due_state} date={r.return_due_date} /></> : <Tag color="blue">ถือไว้</Tag> },
    { title: '', width: 170, align: 'right', fixed: 'right', render: (_: unknown, r: any) => r.status !== 'held' ? null : (
      <>
        {me.finance && <Button size="small" type="link" onClick={() => openForm(r)}>แก้ไข</Button>}
        {r.can_pay && <Button size="small" type="primary" onClick={() => openPay(r)}>บันทึกการคืน</Button>}
      </>
    ) },
  ]

  return (
    <>
      <Card style={cardStyle} styles={{ body: { padding: 12 } }}>
        <div className="flex flex-wrap gap-2 justify-between mb-3">
          <Input.Search allowClear placeholder="ค้นหาเลขที่สัญญา โครงการ ผู้รับจ้าง เลขหนังสือ" style={{ maxWidth: 360 }} onSearch={setSearch} aria-label="ค้นหาหลักประกัน" />
          {me.finance && <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>บันทึกหลักประกัน</Button>}
        </div>
        <div className="mb-3" style={{ overflowX: 'auto' }}>
          <Segmented value={view} onChange={v => setView(v as View)} options={[
            { value: 'all', label: `ทั้งหมด (${counts.all})` },
            { value: 'pay', label: `รอคืน (${counts.pay})` },
            { value: 'expiring', label: `ต้องต่ออายุ (${counts.expiring})` },
            { value: 'held', label: `ถือไว้ (${counts.held})` },
            { value: 'closed', label: `คืนแล้ว (${counts.closed})` },
          ]} />
        </div>
        <Table size="small" rowKey="id" loading={loading} columns={columns} dataSource={shown} pagination={{ pageSize: 20, hideOnSinglePage: true }} scroll={{ x: 'max-content' }}
          locale={{ emptyText: <Empty description="ไม่มีรายการ" /> }} />
      </Card>

      <ContractDrawer id={openId} refreshKey={refresh} onClose={() => setOpenId(null)} />

      <Modal title={editing?.id ? 'แก้ไขหลักประกัน' : 'บันทึกหลักประกัน'} open={!!editing} onCancel={() => setEditing(null)} onOk={save} okText="บันทึก" cancelText="ยกเลิก" confirmLoading={saving} forceRender>
        <Form form={form} layout="vertical">
          {!editing?.id && (
            <Form.Item name="contract_id" label="สัญญา" rules={[{ required: true, message: 'กรุณาเลือกสัญญา' }]}>
              <Select showSearch={{ optionFilterProp: 'label' }} options={contracts.map(c => ({ value: c.id, label: `${c.contract_no} — ${c.project_name}` }))} placeholder="ค้นหาเลขที่สัญญา" />
            </Form.Item>
          )}
          <Row gutter={12}>
            <Col xs={24} md={12}><Form.Item name="guarantee_type" label="ประเภท" rules={[{ required: true, message: 'กรุณาเลือก' }]}><Select options={toOptions(GUARANTEE_TYPES)} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="purpose" label="วัตถุประสงค์"><Select options={toOptions(GUARANTEE_PURPOSES)} /></Form.Item></Col>
          </Row>
          <Form.Item name="amount" label="จำนวนเงิน (บาท)" rules={[{ required: true, message: 'กรุณาระบุจำนวนเงิน' }]}><InputNumber min={0.01} style={{ width: '100%' }} /></Form.Item>
          {type === 'bank_guarantee' && (
            <>
              <Form.Item name="bank_name" label="ธนาคาร" rules={[{ required: true, message: 'กรุณาระบุธนาคาร' }]}><Input maxLength={150} /></Form.Item>
              <Form.Item name="doc_no" label="เลขที่หนังสือค้ำประกัน" rules={[{ required: true, message: 'กรุณาระบุเลขที่' }]}><Input maxLength={100} /></Form.Item>
              <Form.Item name="expiry_date" label="วันหมดอายุ"><ThaiDatePicker format={DATE_FORMAT} style={{ width: '100%' }} /></Form.Item>
            </>
          )}
          <Form.Item name="storage_location" label="ที่เก็บฉบับจริง" rules={[{ required: true, message: 'กรุณาระบุที่เก็บ' }]}><Input maxLength={300} placeholder="เช่น ตู้นิรภัยการเงิน" /></Form.Item>
        </Form>
      </Modal>

      <Modal title={`บันทึกการคืน ${paying?.contract_no ?? ''} · ${fmtMoney(paying?.amount)} บาท`} open={!!paying} onCancel={() => setPaying(null)} onOk={pay} okText="บันทึก" cancelText="ยกเลิก" confirmLoading={saving} forceRender>
        <Alert className="mb-3" type="info" showIcon title={`กำหนดคืนไม่เกิน ${fmtDate(paying?.return_due_date)}`} description="วางทรัพย์หรือส่งคลังต้องมีหลักฐานการติดตามผู้รับจ้าง ตรวจวิธีปฏิบัติกับพัสดุ/ฝ่ายกฎหมายก่อนบันทึก" />
        <Form form={payForm} layout="vertical">
          <Row gutter={12}>
            <Col xs={24} md={12}><Form.Item name="method" label="วิธีคืน" rules={[{ required: true, message: 'กรุณาเลือก' }]}><Select options={toOptions(PAYOUT_METHODS)} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="paid_date" label="วันที่" rules={[{ required: true, message: 'กรุณาระบุวันที่' }]}><ThaiDatePicker format={DATE_FORMAT} style={{ width: '100%' }} disabledDate={d => d.isAfter(dayjs(), 'day')} /></Form.Item></Col>
          </Row>
          <Form.Item name="voucher_no" label={method === 'returned' ? 'เลขที่ใบสำคัญจ่าย/หนังสือส่งคืน' : method === 'escrow' ? 'เลขที่วางทรัพย์' : 'เลขที่นำส่งคลัง'} rules={[{ required: true, message: 'กรุณาระบุเลขที่' }]}><Input maxLength={100} /></Form.Item>
          {method === 'returned' && <Form.Item name="receiver_name" label="ผู้รับคืน" rules={[{ required: true, message: 'กรุณาระบุผู้รับ' }]}><Input maxLength={200} /></Form.Item>}
          {paying?.guarantee_type === 'cash' && (
            <>
              <Form.Item name="deduct_amount" label="หักค่าปรับ/ค่าเสียหาย (บาท)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="deduct_reason" label="เหตุผลที่หัก"><Input /></Form.Item>
            </>
          )}
          <Form.Item name="note" label="หมายเหตุ"><TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default function FinanceContractsPage() {
  return (
    <ContractPage screen="finance" title="การเงิน — ทะเบียนหลักประกัน" icon={<FaCoins />} subtitle="กลุ่มงานการเงิน">
      {me => <FinanceContent me={me} />}
    </ContractPage>
  )
}
