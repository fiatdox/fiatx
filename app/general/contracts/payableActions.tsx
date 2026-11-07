'use client'
// ฟอร์มเจ้าหนี้ การจ่าย และการยกเลิก ใช้ร่วมกันระหว่างหน้าผู้รับจ้างกับหน้าเจ้าหนี้การค้าของบัญชี
import React, { useEffect, useState } from 'react'
import { App, Col, Form, Input, InputNumber, Modal, Row, Select, Typography } from 'antd'
import dayjs from 'dayjs'
import { api, ApiError, DATE_FORMAT, fmtMoney, ThaiDatePicker, toApiDate, toFormDate } from './contractShared'

const { Text } = Typography
const { TextArea } = Input

/* eslint-disable @typescript-eslint/no-explicit-any */
type Vendor = { id: number; name: string }

export function usePayableActions({ vendors, onChanged }: { vendors: Vendor[]; onChanged: () => void }) {
  const { message, modal } = App.useApp()
  const [payableEdit, setPayableEdit] = useState<any | null>(null)  // {} = เพิ่มใหม่
  const [paying, setPaying] = useState<any | null>(null)
  const [reasonFor, setReasonFor] = useState<{ kind: 'cancel' | 'void'; id: number; title: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [payableForm] = Form.useForm()
  const [payForm] = Form.useForm()
  const [reasonForm] = Form.useForm()
  const payableVendor = Form.useWatch('vendor_id', payableForm)
  // ผูกรายการสัญญากับรหัสผู้รับจ้าง เปิดฟอร์มรายเดิมซ้ำได้ และไม่เห็นสัญญาของรายอื่นระหว่างรอโหลด
  const [contractsOf, setContractsOf] = useState<{ vendorId: number; rows: any[] } | null>(null)
  const vendorContracts = contractsOf?.vendorId === payableVendor ? contractsOf?.rows ?? [] : []

  useEffect(() => {
    if (!payableVendor) return
    api(`vendors/${payableVendor}`).then(d => setContractsOf({ vendorId: payableVendor, rows: d.contracts })).catch(() => {})
  }, [payableVendor])

  const fail = (e: unknown, form: any) => {
    const err = e as ApiError
    if (err.field) form.setFields([{ name: err.field, errors: [err.message] }])
    else message.error(err.message)
  }

  const openPayableForm = (p?: any, vendorId?: number) => {
    payableForm.resetFields()
    payableForm.setFieldsValue(p
      ? { ...p, invoice_date: toFormDate(p.invoice_date), due_date: toFormDate(p.due_date) }
      : { vendor_id: vendorId, invoice_date: dayjs() })
    setPayableEdit(p ?? {})
  }
  const savePayable = async () => {
    const v = await payableForm.validateFields().catch(() => null)
    if (!v) return
    setSaving(true)
    try {
      const body = { ...v, invoice_date: toApiDate(v.invoice_date), due_date: toApiDate(v.due_date), contract_id: v.contract_id ?? null }
      const r = payableEdit?.id ? await api(`payables/${payableEdit.id}`, 'PUT', body) : await api('payables', 'POST', body)
      setPayableEdit(null)
      onChanged()
      if (r.over_contract) modal.warning({ title: 'ยอดเจ้าหนี้รวมเกินวงเงินสัญญา', content: 'บันทึกแล้ว แต่ควรตรวจว่ามีบันทึกแก้ไขวงเงินหรือบันทึกใบเดิมซ้ำหรือไม่' })
      else message.success('บันทึกเจ้าหนี้แล้ว')
    } catch (e) { fail(e, payableForm) } finally { setSaving(false) }
  }

  const openPay = (p: any) => {
    payForm.resetFields()
    payForm.setFieldsValue({ paid_date: dayjs(), amount: p.balance })
    setPaying(p)
  }
  const savePay = async () => {
    const v = await payForm.validateFields().catch(() => null)
    if (!v) return
    setSaving(true)
    try {
      const r = await api(`payables/${paying.id}/payments`, 'POST', { ...v, paid_date: toApiDate(v.paid_date) })
      message.success(r.balance > 0 ? `บันทึกแล้ว ยังค้าง ${fmtMoney(r.balance)} บาท` : 'บันทึกแล้ว จ่ายครบ')
      setPaying(null)
      onChanged()
    } catch (e) { fail(e, payForm) } finally { setSaving(false) }
  }

  const askReason = (kind: 'cancel' | 'void', id: number, title: string) => { reasonForm.resetFields(); setReasonFor({ kind, id, title }) }
  const saveReason = async () => {
    const v = await reasonForm.validateFields().catch(() => null)
    if (!v || !reasonFor) return
    setSaving(true)
    try {
      await api(reasonFor.kind === 'cancel' ? `payables/${reasonFor.id}/cancel` : `payments/${reasonFor.id}/void`, 'POST', v)
      message.success('ยกเลิกแล้ว')
      setReasonFor(null)
      onChanged()
    } catch (e) { fail(e, reasonForm) } finally { setSaving(false) }
  }

  const modals = (
    <>
      <Modal title={payableEdit?.id ? 'แก้ไขเจ้าหนี้' : 'บันทึกเจ้าหนี้'} open={!!payableEdit} onCancel={() => setPayableEdit(null)} onOk={savePayable} okText="บันทึก" cancelText="ยกเลิก" confirmLoading={saving} forceRender>
        <Form form={payableForm} layout="vertical">
          <Form.Item name="vendor_id" label="ผู้รับจ้าง" rules={[{ required: true, message: 'กรุณาเลือกผู้รับจ้าง' }]}>
            <Select showSearch={{ optionFilterProp: 'label' }} disabled={!!payableEdit?.id} options={vendors.map(v => ({ value: v.id, label: v.name }))} placeholder="เลือกผู้รับจ้าง"
              onChange={() => payableForm.setFieldValue('contract_id', null)} />
          </Form.Item>
          <Form.Item name="contract_id" label="สัญญา" extra="ว่าง = งานที่ไม่มีสัญญา">
            <Select allowClear showSearch={{ optionFilterProp: 'label' }} options={vendorContracts.map(c => ({ value: c.id, label: `${c.contract_no} — ${c.project_name}` }))} placeholder="เลือกสัญญาของผู้รับจ้างรายนี้" />
          </Form.Item>
          <Form.Item name="description" label="รายการ" rules={[{ required: true, message: 'กรุณาระบุรายการ' }]}><Input maxLength={500} placeholder="เช่น ค่างานงวดที่ 2" /></Form.Item>
          <Form.Item name="invoice_no" label="เลขที่ใบแจ้งหนี้"><Input maxLength={100} /></Form.Item>
          <Row gutter={12}>
            <Col xs={24} md={12}><Form.Item name="invoice_date" label="วันที่" rules={[{ required: true, message: 'กรุณาระบุวันที่' }]}><ThaiDatePicker format={DATE_FORMAT} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="due_date" label="วันครบกำหนดจ่าย"><ThaiDatePicker format={DATE_FORMAT} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="amount" label="จำนวนเงิน (บาท)" rules={[{ required: true, message: 'กรุณาระบุจำนวนเงิน' }]}><InputNumber min={0.01} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>

      <Modal title={`บันทึกการจ่าย ${paying?.invoice_no ?? paying?.description ?? ''}`} open={!!paying} onCancel={() => setPaying(null)} onOk={savePay} okText="บันทึก" cancelText="ยกเลิก" confirmLoading={saving} forceRender>
        <Text type="secondary">{paying?.vendor_name} · ยอดค้าง {fmtMoney(paying?.balance)} บาท</Text>
        <Form form={payForm} layout="vertical" className="mt-3">
          <Row gutter={12}>
            <Col xs={24} md={12}><Form.Item name="paid_date" label="วันที่จ่าย" rules={[{ required: true, message: 'กรุณาระบุวันที่' }]}><ThaiDatePicker format={DATE_FORMAT} style={{ width: '100%' }} disabledDate={d => d.isAfter(dayjs(), 'day')} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="amount" label="จำนวนเงิน (บาท)" rules={[{ required: true, message: 'กรุณาระบุจำนวนเงิน' }]}><InputNumber min={0.01} max={paying?.balance} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="voucher_no" label="เลขที่ใบสำคัญจ่าย" rules={[{ required: true, message: 'กรุณาระบุเลขที่' }]}><Input maxLength={100} /></Form.Item>
          <Form.Item name="note" label="หมายเหตุ"><TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal title={reasonFor?.title} open={!!reasonFor} onCancel={() => setReasonFor(null)} onOk={saveReason} okText="ยืนยันยกเลิก" okButtonProps={{ danger: true }} cancelText="ไม่ยกเลิก" confirmLoading={saving} forceRender>
        <Form form={reasonForm} layout="vertical">
          <Form.Item name="reason" label="เหตุผล" rules={[{ required: true, message: 'กรุณาระบุเหตุผล' }]}><TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </>
  )

  return { openPayableForm, openPay, askReason, modals }
}
