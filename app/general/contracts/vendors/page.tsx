'use client'
// ทะเบียนกลางผู้รับจ้าง: เคยรับงานอะไร เป็นเจ้าหนี้เท่าไร ค้างจ่ายเท่าไร
// พัสดุดูแลข้อมูลบริษัท · การเงินบันทึกเจ้าหนี้และการจ่าย · ADMIN ดูอย่างเดียว
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert, App, Button, Card, Col, Descriptions, Divider, Drawer, Empty, Form, Input, Modal, Row, Segmented, Spin, Statistic, Table, Tabs, Tag, Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ExclamationCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { FaBuilding } from 'react-icons/fa'
import {
  api, ApiError, cardStyle, ContractDrawer, ContractPage, CONTRACT_STATUS, DueTag, fmtDate, fmtMoney, PAY_STATUS, WORK_TYPES, type ContractMe,
} from '../contractShared'
import { usePayableActions } from '../payableActions'

const { Text } = Typography
const { TextArea } = Input

/* eslint-disable @typescript-eslint/no-explicit-any */
type PayView = 'open' | 'overdue' | 'closed'

const Money = ({ value, danger }: { value: number; danger?: boolean }) =>
  value > 0 && danger ? <Text type="danger" strong>{fmtMoney(value)}</Text> : <>{value > 0 ? fmtMoney(value) : '—'}</>

const VendorsContent = ({ me }: { me: ContractMe }) => {
  const { message } = App.useApp()
  const [vendors, setVendors] = useState<any[]>([])
  const [payables, setPayables] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [paySearch, setPaySearch] = useState('')
  const [payView, setPayView] = useState<PayView>('open')
  const [openVendor, setOpenVendor] = useState<number | null>(null)
  const [detail, setDetail] = useState<any | null>(null)
  const [openContract, setOpenContract] = useState<number | null>(null)

  const [vendorEdit, setVendorEdit] = useState<any | null>(null)    // {} = เพิ่มใหม่
  const [saving, setSaving] = useState(false)
  const [vendorForm] = Form.useForm()

  const load = useCallback(async () => {
    try {
      const [v, p] = await Promise.all([api('vendors'), api(`payables?search=${encodeURIComponent(paySearch)}`)])
      setVendors(v)
      setPayables(p)
    } catch (e) { message.error((e as Error).message) } finally { setLoading(false) }
  }, [paySearch, message])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])

  const loadDetail = useCallback(() => {
    if (openVendor == null) return
    api(`vendors/${openVendor}`).then(setDetail).catch(e => message.error(e.message))
  }, [openVendor, message])
  useEffect(() => { loadDetail() }, [loadDetail])
  const shownDetail = detail?.id === openVendor ? detail : null

  const refresh = () => { load(); loadDetail() }
  const { openPayableForm, openPay, askReason, modals } = usePayableActions({ vendors, onChanged: refresh })
  const fail = (e: unknown, form: any) => {
    const err = e as ApiError
    if (err.field) form.setFields([{ name: err.field, errors: [err.message] }])
    else message.error(err.message)
  }

  // ── ผู้รับจ้าง ──
  const saveVendor = async () => {
    const v = await vendorForm.validateFields().catch(() => null)
    if (!v) return
    setSaving(true)
    try {
      if (vendorEdit?.id) await api(`vendors/${vendorEdit.id}`, 'PUT', v)
      else await api('vendors', 'POST', v)
      message.success('บันทึกผู้รับจ้างแล้ว')
      setVendorEdit(null)
      refresh()
    } catch (e) { fail(e, vendorForm) } finally { setSaving(false) }
  }

  // ── ตาราง ──
  const shownVendors = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? vendors.filter(v => `${v.name} ${v.tax_id ?? ''}`.toLowerCase().includes(q)) : vendors
  }, [vendors, search])
  const totals = useMemo(() => vendors.reduce((t, v) => ({
    payable: t.payable + v.payable_total, paid: t.paid + v.paid_total, outstanding: t.outstanding + v.outstanding, overdue: t.overdue + v.overdue_amount,
  }), { payable: 0, paid: 0, outstanding: 0, overdue: 0 }), [vendors])
  const inView = (p: any, view: PayView) => view === 'closed'
    ? ['paid', 'cancelled'].includes(p.pay_status)
    : view === 'overdue' ? p.due_state === 'overdue' : ['unpaid', 'partial'].includes(p.pay_status)
  const shownPayables = useMemo(() => payables.filter(p => inView(p, payView)), [payables, payView])

  const vendorCols: ColumnsType<any> = [
    { title: 'ผู้รับจ้าง', dataIndex: 'name', render: (v: string, r: any) => <><Button type="link" size="small" style={{ padding: 0, whiteSpace: 'normal', textAlign: 'left', height: 'auto' }} onClick={() => setOpenVendor(r.id)}>{v}</Button><div style={{ fontSize: 12 }}><Text type="secondary">{r.tax_id ?? 'ยังไม่มีเลขผู้เสียภาษี'}</Text></div></> },
    { title: 'งาน', dataIndex: 'contract_count', width: 70, align: 'center', render: (v: number) => v || '—' },
    { title: 'มูลค่างานรวม', dataIndex: 'contract_total', width: 130, align: 'right', render: (v: number) => <Money value={v} /> },
    { title: 'ยอดเจ้าหนี้', dataIndex: 'payable_total', width: 130, align: 'right', render: (v: number) => <Money value={v} /> },
    { title: 'จ่ายแล้ว', dataIndex: 'paid_total', width: 130, align: 'right', render: (v: number) => <Money value={v} /> },
    { title: 'ค้างจ่าย', dataIndex: 'outstanding', width: 130, align: 'right', render: (v: number) => <Text strong={v > 0}>{v > 0 ? fmtMoney(v) : '—'}</Text> },
    { title: 'เกินกำหนด', dataIndex: 'overdue_amount', width: 130, align: 'right', render: (v: number) => <Money value={v} danger /> },
    { title: 'หลักประกันที่ถืออยู่', dataIndex: 'guarantee_held', width: 140, align: 'right', render: (v: number) => <Money value={v} /> },
  ]

  const payableActions = (r: any) => (
    <>
      {me.finance && ['unpaid', 'partial'].includes(r.pay_status) && <Button size="small" type="primary" onClick={() => openPay(r)}>จ่าย</Button>}{' '}
      {me.finance && r.pay_status !== 'cancelled' && r.pay_status !== 'paid' && <Button size="small" onClick={() => openPayableForm(r)}>แก้ไข</Button>}{' '}
      {me.finance && r.pay_status === 'unpaid' && <Button size="small" danger onClick={() => askReason('cancel', r.id, `ยกเลิกรายการ ${r.invoice_no ?? r.description}`)}>ยกเลิก</Button>}
    </>
  )
  const payableBase: ColumnsType<any> = [
    { title: 'รายการ', dataIndex: 'description', render: (v: string, r: any) => <><div>{v}</div><Text type="secondary" style={{ fontSize: 12 }}>{[r.invoice_no && `ใบแจ้งหนี้ ${r.invoice_no}`, r.contract_no && `สัญญา ${r.contract_no}`, r.source_module && `จาก ${r.source_module}`].filter(Boolean).join(' · ') || 'ไม่ได้ผูกสัญญา'}</Text></> },
    { title: 'วันที่', dataIndex: 'invoice_date', width: 95, render: fmtDate },
    { title: 'ครบกำหนด', dataIndex: 'due_date', width: 185, render: (v: string | null, r: any) => r.due_state ? <DueTag state={r.due_state} date={v} /> : fmtDate(v) },
    { title: 'ยอดหนี้', dataIndex: 'amount', width: 105, align: 'right', render: fmtMoney },
    { title: 'จ่ายแล้ว', dataIndex: 'paid_amount', width: 105, align: 'right', render: (v: number) => <Money value={v} /> },
    { title: 'ค้างจ่าย', dataIndex: 'balance', width: 105, align: 'right', render: (v: number, r: any) => r.pay_status === 'cancelled' ? '—' : <Text strong={v > 0}>{v > 0 ? fmtMoney(v) : '—'}</Text> },
    { title: 'สถานะ', dataIndex: 'pay_status', width: 105, render: (v: string, r: any) => <Tag color={PAY_STATUS[v]?.color} title={r.cancel_reason ?? undefined}>{PAY_STATUS[v]?.label}</Tag> },
    ...(me.finance ? [{ title: '', width: 170, align: 'right' as const, fixed: 'right' as const, render: (_: unknown, r: any) => payableActions(r) }] : []),
  ]

  const s = shownDetail?.summary
  return (
    <>
      <Row gutter={[12, 12]} className="mb-4">
        <Col xs={12} md={6}><Card style={cardStyle}><Statistic title="ยอดเจ้าหนี้รวม" value={fmtMoney(totals.payable)} suffix="บาท" /></Card></Col>
        <Col xs={12} md={6}><Card style={cardStyle}><Statistic title="จ่ายแล้ว" value={fmtMoney(totals.paid)} suffix="บาท" /></Card></Col>
        <Col xs={12} md={6}><Card style={cardStyle}><Statistic title="ค้างจ่าย" value={fmtMoney(totals.outstanding)} suffix="บาท" /></Card></Col>
        <Col xs={12} md={6}><Card style={cardStyle}><Statistic title="เกินกำหนด" value={fmtMoney(totals.overdue)} suffix="บาท" /></Card></Col>
      </Row>
      <Card style={cardStyle} styles={{ body: { padding: 12 } }}>
        <Tabs items={[
          {
            key: 'vendors',
            label: `ผู้รับจ้าง (${vendors.length})`,
            children: (
              <>
                <div className="flex flex-wrap gap-2 justify-between mb-3">
                  <Input.Search allowClear placeholder="ค้นหาชื่อหรือเลขผู้เสียภาษี" style={{ maxWidth: 360 }} onSearch={setSearch} aria-label="ค้นหาผู้รับจ้าง" />
                  {me.procurement && <Button type="primary" icon={<PlusOutlined />} onClick={() => { vendorForm.resetFields(); setVendorEdit({}) }}>เพิ่มผู้รับจ้าง</Button>}
                </div>
                <Table size="small" rowKey="id" loading={loading} columns={vendorCols} dataSource={shownVendors} pagination={{ pageSize: 20, hideOnSinglePage: true }} scroll={{ x: 'max-content' }}
                  locale={{ emptyText: <Empty description="ยังไม่มีผู้รับจ้าง" /> }} />
              </>
            ),
          },
          {
            key: 'payables',
            label: `รายการเจ้าหนี้ (${payables.filter(p => inView(p, 'open')).length} ค้าง)`,
            children: (
              <>
                <div className="flex flex-wrap gap-2 justify-between mb-3">
                  <Input.Search allowClear placeholder="ค้นหาผู้รับจ้าง เลขใบแจ้งหนี้ รายการ เลขที่สัญญา" style={{ maxWidth: 360 }} onSearch={setPaySearch} aria-label="ค้นหาเจ้าหนี้" />
                  {me.finance && <Button type="primary" icon={<PlusOutlined />} onClick={() => openPayableForm()}>บันทึกเจ้าหนี้</Button>}
                </div>
                <div className="mb-3" style={{ overflowX: 'auto' }}>
                  <Segmented value={payView} onChange={v => setPayView(v as PayView)} options={[
                    { value: 'open', label: `ค้างจ่าย (${payables.filter(p => inView(p, 'open')).length})` },
                    { value: 'overdue', label: `เกินกำหนด (${payables.filter(p => inView(p, 'overdue')).length})` },
                    { value: 'closed', label: `จ่ายครบ/ยกเลิก (${payables.filter(p => inView(p, 'closed')).length})` },
                  ]} />
                </div>
                <Table size="small" rowKey="id" loading={loading} dataSource={shownPayables} pagination={{ pageSize: 20, hideOnSinglePage: true }} scroll={{ x: 1240 }}
                  columns={[{ title: 'ผู้รับจ้าง', dataIndex: 'vendor_name', width: 170, render: (v: string, r: any) => <Button type="link" size="small" style={{ padding: 0, whiteSpace: 'normal', textAlign: 'left', height: 'auto' }} onClick={() => setOpenVendor(r.vendor_id)}>{v}</Button> }, ...payableBase]}
                  locale={{ emptyText: <Empty description="ไม่มีรายการ" /> }} />
              </>
            ),
          },
        ]} />
      </Card>

      {/* รายละเอียดผู้รับจ้าง */}
      <Drawer title={shownDetail?.name ?? 'ผู้รับจ้าง'} open={openVendor != null} onClose={() => setOpenVendor(null)} size={1080} destroyOnHidden
        extra={shownDetail && (
          <div className="flex gap-2">
            {me.finance && <Button type="primary" icon={<PlusOutlined />} onClick={() => openPayableForm(undefined, shownDetail.id)}>บันทึกเจ้าหนี้</Button>}
            {me.procurement && <Button onClick={() => { vendorForm.setFieldsValue(shownDetail); setVendorEdit(shownDetail) }}>แก้ไขข้อมูลบริษัท</Button>}
          </div>
        )}>
        {!shownDetail && <div className="py-16 text-center"><Spin /></div>}
        {shownDetail && (
          <>
            <Row gutter={[12, 12]} className="mb-4">
              <Col xs={12} md={6}><Statistic title={`งานที่เคยรับ (${s.contract_count})`} value={fmtMoney(s.contract_total)} suffix="บาท" /></Col>
              <Col xs={12} md={6}><Statistic title="ยอดเจ้าหนี้" value={fmtMoney(s.payable_total)} suffix="บาท" /></Col>
              <Col xs={12} md={6}><Statistic title="ค้างจ่าย" value={fmtMoney(s.outstanding)} suffix="บาท" /></Col>
              <Col xs={12} md={6}><Statistic title="หลักประกันที่ถืออยู่" value={fmtMoney(s.guarantee_held)} suffix="บาท" /></Col>
            </Row>
            {s.overdue_amount > 0 && <Alert className="mb-4" type="error" showIcon icon={<ExclamationCircleOutlined />} title={`เกินกำหนดจ่าย ${fmtMoney(s.overdue_amount)} บาท`} />}
            <Descriptions size="small" bordered column={{ xs: 1, md: 2 }} styles={{ label: { width: 150, color: 'var(--app-text-2)' } }}>
              <Descriptions.Item label="เลขผู้เสียภาษี">{shownDetail.tax_id ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="ผู้ติดต่อ">{[shownDetail.contact_name, shownDetail.phone].filter(Boolean).join(' · ') || '—'}</Descriptions.Item>
              <Descriptions.Item label="อีเมล">{shownDetail.email ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="ที่อยู่">{shownDetail.address ?? '—'}</Descriptions.Item>
            </Descriptions>

            <Divider titlePlacement="left">งานที่เคยรับ</Divider>
            <Table size="small" rowKey="id" pagination={false} dataSource={shownDetail.contracts} scroll={{ x: 'max-content' }}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ยังไม่เคยมีสัญญา" /> }}
              columns={[
                { title: 'เลขที่สัญญา', dataIndex: 'contract_no', render: (v: string, r: any) => <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setOpenContract(r.id)}>{v}</Button> },
                { title: 'โครงการ', dataIndex: 'project_name' },
                { title: 'ประเภท', dataIndex: 'work_type', render: (v: string) => WORK_TYPES[v] },
                { title: 'วงเงิน', dataIndex: 'contract_value', align: 'right', render: fmtMoney },
                { title: 'วันลงนาม', dataIndex: 'signed_date', render: fmtDate },
                { title: 'หมดประกัน', dataIndex: 'warranty_end_date', render: fmtDate },
                { title: 'ชำรุด', dataIndex: 'defect_count', align: 'center', render: (v: number) => v ? `${v} ครั้ง` : '—' },
                { title: 'สถานะ', dataIndex: 'status', render: (v: string) => <Tag color={CONTRACT_STATUS[v]?.color}>{CONTRACT_STATUS[v]?.label}</Tag> },
              ]} />

            <Divider titlePlacement="left">เจ้าหนี้</Divider>
            <Table size="small" rowKey="id" pagination={false} columns={payableBase} dataSource={shownDetail.payables} scroll={{ x: 1045 }}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ยังไม่มีรายการเจ้าหนี้" /> }} />

            <Divider titlePlacement="left">ประวัติการจ่าย</Divider>
            <Table size="small" rowKey="id" pagination={false} dataSource={shownDetail.payments} scroll={{ x: 'max-content' }}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ยังไม่มีการจ่าย" /> }}
              columns={[
                { title: 'วันที่จ่าย', dataIndex: 'paid_date', render: fmtDate },
                { title: 'รายการ', dataIndex: 'description', render: (v: string, r: any) => r.invoice_no ? `${r.invoice_no} · ${v}` : v },
                { title: 'เลขที่ใบสำคัญจ่าย', dataIndex: 'voucher_no' },
                { title: 'จำนวนเงิน', dataIndex: 'amount', align: 'right', render: (v: number, r: any) => r.voided_at ? <Text delete type="secondary">{fmtMoney(v)}</Text> : fmtMoney(v) },
                { title: 'ผู้บันทึก', dataIndex: 'paid_by_name' },
                { title: '', align: 'right', render: (_: unknown, r: any) => r.voided_at ? <Tag title={r.void_reason ?? undefined}>ยกเลิกแล้ว</Tag> : me.finance ? <Button size="small" danger onClick={() => askReason('void', r.id, `ยกเลิกการจ่าย ${r.voucher_no}`)}>ยกเลิกการจ่าย</Button> : null },
              ]} />
          </>
        )}
      </Drawer>

      <ContractDrawer id={openContract} onClose={() => setOpenContract(null)} />

      {/* ฟอร์มผู้รับจ้าง */}
      <Modal title={vendorEdit?.id ? 'แก้ไขข้อมูลบริษัท' : 'เพิ่มผู้รับจ้าง'} open={!!vendorEdit} onCancel={() => setVendorEdit(null)} onOk={saveVendor} okText="บันทึก" cancelText="ยกเลิก" confirmLoading={saving} forceRender>
        <Form form={vendorForm} layout="vertical">
          <Form.Item name="name" label="ชื่อผู้รับจ้าง" rules={[{ required: true, message: 'กรุณาระบุชื่อ' }]}><Input maxLength={255} /></Form.Item>
          <Form.Item name="tax_id" label="เลขทะเบียนนิติบุคคล/ผู้เสียภาษี" extra="13 หลัก ใช้ผูกประวัติงานของบริษัทเดียวกัน"><Input maxLength={17} /></Form.Item>
          <Row gutter={12}>
            <Col xs={24} md={12}><Form.Item name="contact_name" label="ผู้ติดต่อ"><Input maxLength={150} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="phone" label="โทรศัพท์"><Input maxLength={50} /></Form.Item></Col>
          </Row>
          <Form.Item name="email" label="อีเมล"><Input maxLength={150} /></Form.Item>
          <Form.Item name="address" label="ที่อยู่"><TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {modals}
    </>
  )
}

export default function VendorsPage() {
  return (
    <ContractPage screen="vendors" title="ผู้รับจ้างและเจ้าหนี้" icon={<FaBuilding />} subtitle="เคยรับงานอะไร เป็นเจ้าหนี้เท่าไร ค้างจ่ายเท่าไร">
      {me => <VendorsContent me={me} />}
    </ContractPage>
  )
}
