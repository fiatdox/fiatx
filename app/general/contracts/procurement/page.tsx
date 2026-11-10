'use client'
// หน้าจอกลุ่มงานพัสดุ: ทะเบียนสัญญา ผู้รับจ้าง ผู้รับผิดชอบ แฟ้มเอกสาร ติดตามชำรุด เสนอคืน
import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert, App, Button, Card, Col, Divider, Drawer, Empty, Form, Input, InputNumber, Modal, Radio, Row, Select, Table, Tag, Tooltip, Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { FaBoxOpen } from 'react-icons/fa'
import dayjs from 'dayjs'
import Link from 'next/link'
import {
  AMENDMENT_TYPES, api, ApiError, cardStyle, ContractDrawer, ContractPage, CONTRACT_STATUS, DATE_FORMAT, DOC_TYPES, DueTag, DUTIES, fmtDate, fmtMoney,
  ThaiDatePicker, toApiDate, toFormDate, toOptions, UserSelect, WORK_TYPES, type ContractMe,
} from '../contractShared'

const { Text } = Typography
const { TextArea } = Input

/* eslint-disable @typescript-eslint/no-explicit-any */
const DateInput = (p: any) => <ThaiDatePicker {...p} format={DATE_FORMAT} style={{ width: '100%' }} />
// ฟอร์มทุกตัวสร้างไว้ล่วงหน้า (forceRender) ก่อนลิ้นชักสัญญา ถ้าไม่ยกชั้นจะเปิดขึ้นไปอยู่หลังลิ้นชัก
// ลิ้นชัก/หน้าต่าง antd ค่าเริ่มต้น 1000 · ผู้รับจ้างเปิดจากฟอร์มสัญญาอีกชั้นจึง +100
const OVER_DRAWER = 1100

// ชี้ช่องที่ผิดตามที่ backend บอก ถ้าไม่มีช่องให้ขึ้นเป็นข้อความรวม
const useSubmit = (form?: any) => {
  const { message } = App.useApp()
  const [saving, setSaving] = useState(false)
  const run = async (fn: () => Promise<void>) => {
    setSaving(true)
    try { await fn() } catch (e) {
      const err = e as ApiError
      if (err.field && form) form.setFields([{ name: err.field, errors: [err.message] }])
      else message.error(err.message)
    } finally { setSaving(false) }
  }
  return { saving, run }
}

const ProcurementContent = ({ me }: { me: ContractMe }) => {
  const { message, modal } = App.useApp()
  const [rows, setRows] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [majors, setMajors] = useState<any[]>([])
  const [defaultMonths, setDefaultMonths] = useState<number | undefined>()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState<number | null>(null)
  const [refresh, setRefresh] = useState(0)

  const [editing, setEditing] = useState<any | null>(null)      // {} = สร้างใหม่
  const [vendorEdit, setVendorEdit] = useState<any | null>(null)
  const [amendFor, setAmendFor] = useState<any | null>(null)
  const [staffFor, setStaffFor] = useState<any | null>(null)
  const [docFor, setDocFor] = useState<{ contract: any; doc: any | null } | null>(null)
  const [defectEdit, setDefectEdit] = useState<any | null>(null)
  const [returnFor, setReturnFor] = useState<any | null>(null)
  const [cancelFor, setCancelFor] = useState<any | null>(null)
  const [deleteFor, setDeleteFor] = useState<any | null>(null)

  const [contractForm] = Form.useForm()
  const [vendorForm] = Form.useForm()
  const [amendForm] = Form.useForm()
  const [staffForm] = Form.useForm()
  const [docForm] = Form.useForm()
  const [defectForm] = Form.useForm()
  const [returnForm] = Form.useForm()
  const [cancelForm] = Form.useForm()
  const [deleteForm] = Form.useForm()

  const load = useCallback(async () => {
    try {
      const [c, v] = await Promise.all([api(`list?search=${encodeURIComponent(search)}`), api('vendors')])
      setRows(c)
      setVendors(v)
    } catch (e) { message.error((e as Error).message) } finally { setLoading(false) }
  }, [search, message])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])
  useEffect(() => { api('meta').then(m => { setMajors(m.majors); setDefaultMonths(m.defaults?.warranty_months) }).catch(() => {}) }, [])

  const changed = () => { load(); setRefresh(n => n + 1) }

  // ── สัญญา ──
  const openContractForm = (d?: any) => {
    contractForm.resetFields()
    contractForm.setFieldsValue(d ? {
      ...d,
      signed_date: toFormDate(d.signed_date), delivered_date: toFormDate(d.delivered_date),
      accepted_date: toFormDate(d.accepted_date), warranty_end_date: toFormDate(d.warranty_end_date),
    } : { warranty_months: defaultMonths })
    setEditing(d ?? {})
  }
  // ช่วยเติมวันหมดประกันเมื่อยังว่าง เจ้าหน้าที่แก้เองได้ และค่าที่กรอกแล้วจะไม่ถูกทับ
  const suggestWarrantyEnd = (changed: any, all: any) => {
    if (!('accepted_date' in changed || 'warranty_months' in changed)) return
    if (all.warranty_end_date || !all.accepted_date || !all.warranty_months) return
    contractForm.setFieldValue('warranty_end_date', all.accepted_date.add(all.warranty_months, 'month'))
  }
  const contractSubmit = useSubmit(contractForm)
  const saveContract = async () => {
    const v = await contractForm.validateFields().catch(() => null)
    if (!v) return
    await contractSubmit.run(async () => {
      const body = {
        ...v,
        signed_date: toApiDate(v.signed_date), delivered_date: toApiDate(v.delivered_date),
        accepted_date: toApiDate(v.accepted_date), warranty_end_date: toApiDate(v.warranty_end_date),
        contract_value: v.contract_value ?? null, periodic_months: v.periodic_months ?? null, owner_major_id: v.owner_major_id ?? null,
      }
      if (editing?.id) await api(`list/${editing.id}`, 'PUT', body)
      else await api('list', 'POST', body)
      message.success('บันทึกสัญญาแล้ว')
      setEditing(null)
      changed()
    })
  }

  // ── ผู้รับจ้าง ──
  const vendorSubmit = useSubmit(vendorForm)
  const saveVendor = async () => {
    const v = await vendorForm.validateFields().catch(() => null)
    if (!v) return
    await vendorSubmit.run(async () => {
      const r = await api('vendors', 'POST', v)
      if (editing) contractForm.setFieldValue('vendor_id', r.id)
      message.success('บันทึกผู้รับจ้างแล้ว')
      setVendorEdit(null)
      changed()
    })
  }

  // ── แก้ไขสัญญา ──
  const amendSubmit = useSubmit(amendForm)
  const saveAmend = async () => {
    const v = await amendForm.validateFields().catch(() => null)
    if (!v) return
    await amendSubmit.run(async () => {
      const r = await api(`list/${amendFor.id}/amendments`, 'POST', {
        ...v, amendment_date: toApiDate(v.amendment_date), new_warranty_end_date: toApiDate(v.new_warranty_end_date), add_warranty_months: v.add_warranty_months ?? 0,
      })
      setAmendFor(null)
      changed()
      if (r.warnings?.length) modal.warning({ title: 'ควรแจ้งการเงินเรียกต่ออายุหลักประกัน', content: r.warnings.join('\n') })
      else message.success('บันทึกแล้ว กำหนดงานถูกปรับตามวันหมดประกันล่าสุด')
    })
  }

  // ── ผู้รับผิดชอบ ──
  const staffSubmit = useSubmit()
  const openStaff = (d: any) => {
    staffForm.setFieldsValue({ staff: d.staff.length ? d.staff.map((s: any) => ({ duty: s.duty, user_id: s.user_id, backup_user_id: s.backup_user_id })) : [{ duty: 'committee' }] })
    setStaffFor(d)
  }
  const saveStaff = async () => {
    const v = await staffForm.validateFields().catch(() => null)
    if (!v) return
    await staffSubmit.run(async () => {
      await api(`list/${staffFor.id}/staff`, 'PUT', { staff: (v.staff ?? []).map((s: any) => ({ duty: s.duty, user_id: s.user_id, backup_user_id: s.backup_user_id ?? null })) })
      message.success('บันทึกผู้รับผิดชอบแล้ว')
      setStaffFor(null)
      changed()
    })
  }
  // ตัวเลือกชื่อคนเดิมในแถว ให้ช่องแสดงชื่อแทนตัวเลขตอนเปิดฟอร์ม
  const knownPeople = (d: any) => {
    if (!d) return []
    const m = new Map<number, string>()
    for (const s of d.staff ?? []) {
      if (s.user_id) m.set(s.user_id, s.user_name)
      if (s.backup_user_id) m.set(s.backup_user_id, s.backup_name)
    }
    for (const x of d.documents ?? []) {
      if (x.holder_user_id) m.set(x.holder_user_id, x.holder_name)
      if (x.backup_user_id) m.set(x.backup_user_id, x.backup_name)
    }
    return [...m].map(([value, label]) => ({ value, label }))
  }

  // ── เอกสาร ──
  const docSubmit = useSubmit(docForm)
  const openDoc = (contract: any, doc: any | null) => {
    docForm.resetFields()
    if (doc) docForm.setFieldsValue({ ...doc, last_checked_date: toFormDate(doc.last_checked_date) })
    setDocFor({ contract, doc })
  }
  const saveDoc = async () => {
    const v = await docForm.validateFields().catch(() => null)
    if (!v) return
    await docSubmit.run(async () => {
      const body = { ...v, last_checked_date: toApiDate(v.last_checked_date), backup_user_id: v.backup_user_id ?? null, check_result: v.check_result ?? null }
      if (docFor?.doc) await api(`documents/${docFor.doc.id}`, 'PUT', body)
      else await api(`list/${docFor?.contract.id}/documents`, 'POST', body)
      message.success('บันทึกเอกสารแล้ว')
      setDocFor(null)
      changed()
    })
  }

  // ── ชำรุด ──
  const defectSubmit = useSubmit(defectForm)
  const saveDefect = async () => {
    const v = await defectForm.validateFields().catch(() => null)
    if (!v) return
    await defectSubmit.run(async () => {
      await api(`defects/${defectEdit.id}`, 'PUT', { ...v, notified_vendor_date: toApiDate(v.notified_vendor_date), fixed_date: toApiDate(v.fixed_date) })
      message.success('บันทึกแล้ว')
      setDefectEdit(null)
      changed()
    })
  }

  // ── เสนอคืน / ยกเลิก ──
  const returnSubmit = useSubmit(returnForm)
  const saveReturn = async () => {
    const v = await returnForm.validateFields().catch(() => null)
    if (!v) return
    await returnSubmit.run(async () => {
      const r = await api(`list/${returnFor.id}/returns`, 'POST', { released_date: toApiDate(v.released_date), memo: v.memo })
      message.success(`เสนอคืนแล้ว กำหนดคืนไม่เกิน ${fmtDate(r.due_date)}`)
      setReturnFor(null)
      changed()
    })
  }
  const cancelSubmit = useSubmit(cancelForm)
  const saveCancel = async () => {
    const v = await cancelForm.validateFields().catch(() => null)
    if (!v) return
    await cancelSubmit.run(async () => {
      await api(`list/${cancelFor.id}/cancel`, 'POST', v)
      message.success('ยกเลิกรายการแล้ว')
      setCancelFor(null)
      changed()
    })
  }
  // ADMIN: ลบถาวร — ลิ้นชักของสัญญานั้นต้องปิดด้วย เพราะไม่มีข้อมูลให้แสดงแล้ว
  const deleteSubmit = useSubmit(deleteForm)
  const saveDelete = async () => {
    const v = await deleteForm.validateFields().catch(() => null)
    if (!v) return
    await deleteSubmit.run(async () => {
      await api(`list/${deleteFor.id}/delete`, 'POST', v)
      message.success(`ลบสัญญา ${deleteFor.contract_no} แล้ว`)
      setDeleteFor(null)
      setOpenId(null)
      changed()
    })
  }

  const doneTask = async (id: number) => {
    try { await api(`tasks/${id}/done`, 'POST', {}); message.success('ปิดงานแล้ว'); changed() } catch (e) { message.error((e as Error).message) }
  }

  const columns: ColumnsType<any> = [
    { title: 'เลขที่สัญญา', dataIndex: 'contract_no', width: 150, render: (v: string, r: any) => <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setOpenId(r.id)}>{v}</Button> },
    { title: 'โครงการ', dataIndex: 'project_name', render: (v: string, r: any) => <><div>{v}</div><Text type="secondary" style={{ fontSize: 12 }}>{r.vendor_name}{r.owner_major_name ? ` · ${r.owner_major_name}` : ''}</Text></> },
    { title: 'ประเภท', dataIndex: 'work_type', width: 90, render: (v: string) => WORK_TYPES[v] },
    { title: 'วงเงิน', dataIndex: 'contract_value', width: 130, align: 'right', render: fmtMoney },
    { title: 'หมดประกัน (T)', dataIndex: 'warranty_end_date', width: 120, render: (v: string | null) => v ? fmtDate(v) : <Tag>ยังไม่ตั้ง</Tag> },
    { title: 'งานถัดไป', dataIndex: 'next_task', width: 250, render: (v: string | null, r: any) => r.status !== 'active' ? <Tag color={CONTRACT_STATUS[r.status]?.color}>{CONTRACT_STATUS[r.status]?.label}</Tag> : v ? <><div style={{ fontSize: 13 }}>{v}</div><DueTag state={r.due_state} date={r.next_due} /></> : '—' },
    { title: 'ชำรุดค้าง', dataIndex: 'open_defects', width: 80, align: 'center', render: (v: number) => v > 0 ? <Tag color="error">{v}</Tag> : '—' },
    { title: 'เอกสาร', dataIndex: 'doc_count', width: 80, align: 'center', render: (v: number) => v > 0 ? v : <Tag color="warning">ยังไม่ลง</Tag> },
  ]

  return (
    <>
      <Card style={cardStyle} styles={{ body: { padding: 12 } }}>
        <div className="flex flex-wrap gap-2 justify-between mb-3">
          <Input.Search allowClear placeholder="ค้นหาเลขที่สัญญา โครงการ ผู้รับจ้าง" style={{ maxWidth: 360 }} onSearch={setSearch} aria-label="ค้นหาสัญญา" />
          <div className="flex gap-2">
            <Link href="/general/contracts/vendors"><Button>ทะเบียนผู้รับจ้าง</Button></Link>
            {me.editContracts && <Button type="primary" icon={<PlusOutlined />} onClick={() => openContractForm()}>เพิ่มสัญญา</Button>}
          </div>
        </div>
        <Table size="small" rowKey="id" loading={loading} columns={columns} dataSource={rows} pagination={{ pageSize: 20, hideOnSinglePage: true }} scroll={{ x: 'max-content' }}
          locale={{ emptyText: <Empty description="ยังไม่มีสัญญา กด “เพิ่มสัญญา” เพื่อเริ่มต้น" /> }} />
      </Card>

      <ContractDrawer id={openId} refreshKey={refresh} onClose={() => setOpenId(null)}
        renderActions={d => (
          <>
            {d.can.edit && (
              <>
                <Button size="small" onClick={() => openContractForm(d)}>แก้ไขข้อมูลสัญญา</Button>
                <Button size="small" onClick={() => { amendForm.resetFields(); setAmendFor(d) }}>บันทึกแก้ไข/ขยายสัญญา</Button>
                <Button size="small" onClick={() => openStaff(d)}>มอบหมายผู้รับผิดชอบ</Button>
                <Button size="small" onClick={() => openDoc(d, null)}>ลงทะเบียนเอกสาร</Button>
              </>
            )}
            {d.can.procure && <Button size="small" type="primary" onClick={() => { returnForm.resetFields(); setReturnFor(d) }}>เสนอคืนหลักประกัน</Button>}
            {d.can.edit && <Button size="small" danger onClick={() => { cancelForm.resetFields(); setCancelFor(d) }}>ยกเลิกรายการ</Button>}
            {me.isAdmin && (
              d.can.delete
                ? <Button size="small" danger type="primary" icon={<DeleteOutlined />} onClick={() => { deleteForm.resetFields(); setDeleteFor(d) }}>ลบสัญญา</Button>
                : <Tooltip title={d.can.delete_block}><Button size="small" danger icon={<DeleteOutlined />} disabled>ลบสัญญา</Button></Tooltip>
            )}
          </>
        )}
        renderExtraColumns={d => ({
          ...(d.can.procure ? {
            tasks: [{ title: '', render: (_: unknown, t: any) => t.status === 'open' && ['NOTIFY_WARRANTY', 'SCHEDULE_FINAL'].includes(t.code) ? <Button size="small" onClick={() => doneTask(t.id)}>ทำแล้ว</Button> : null }],
            defects: [{ title: '', render: (_: unknown, x: any) => <Button size="small" onClick={() => { defectForm.setFieldsValue({ notified_vendor_date: toFormDate(x.notified_vendor_date), fixed_date: toFormDate(x.fixed_date), fixed_note: x.fixed_note }); setDefectEdit(x) }}>ติดตาม</Button> }],
          } : {}),
          ...(d.can.edit ? {
            documents: [{ title: '', render: (_: unknown, x: any) => <Button size="small" onClick={() => openDoc(d, x)}>ตรวจนับ/แก้ไข</Button> }],
          } : {}),
        })}
      />

      {/* ฟอร์มสัญญา */}
      <Drawer title={editing?.id ? `แก้ไขสัญญา ${editing.contract_no}` : 'เพิ่มสัญญา'} open={!!editing} onClose={() => setEditing(null)} size={720} forceRender zIndex={OVER_DRAWER}
        extra={<Button type="primary" onClick={saveContract} loading={contractSubmit.saving}>บันทึก</Button>}>
        <Form form={contractForm} layout="vertical" onValuesChange={suggestWarrantyEnd}>
          <Row gutter={12}>
            <Col xs={24} md={12}><Form.Item name="contract_no" label="เลขที่สัญญา" rules={[{ required: true, message: 'กรุณาระบุเลขที่สัญญา' }]}><Input maxLength={60} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="work_type" label="ประเภทงาน" rules={[{ required: true, message: 'กรุณาเลือกประเภทงาน' }]}><Select options={toOptions(WORK_TYPES)} /></Form.Item></Col>
          </Row>
          <Form.Item name="project_name" label="ชื่อโครงการ" rules={[{ required: true, message: 'กรุณาระบุชื่อโครงการ' }]}><Input maxLength={500} /></Form.Item>
          <Form.Item label="ผู้รับจ้าง" required>
            <div className="flex gap-2">
              <Form.Item name="vendor_id" noStyle rules={[{ required: true, message: 'กรุณาเลือกผู้รับจ้าง' }]}>
                <Select showSearch={{ optionFilterProp: 'label' }} style={{ flex: 1, minWidth: 0 }} aria-label="ผู้รับจ้าง" options={vendors.map(v => ({ value: v.id, label: v.name }))} placeholder="เลือกผู้รับจ้าง" />
              </Form.Item>
              <Button icon={<PlusOutlined />} onClick={() => { vendorForm.resetFields(); setVendorEdit({}) }}>เพิ่ม</Button>
            </div>
          </Form.Item>
          <Row gutter={12}>
            <Col xs={24} md={12}><Form.Item name="contract_value" label="วงเงิน (บาท)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="owner_major_id" label="หน่วยงานเจ้าของโครงการ"><Select allowClear showSearch={{ optionFilterProp: 'label' }} options={majors.map(m => ({ value: m.major_id, label: m.name }))} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="signed_date" label="วันลงนาม"><DateInput /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="delivered_date" label="วันส่งมอบ"><DateInput /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="accepted_date" label="วันตรวจรับ"><DateInput /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="warranty_months" label="ระยะประกัน (เดือน)" extra="ใช้กำหนดวันตรวจรอบสุดท้าย"><InputNumber min={0} max={600} precision={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="warranty_end_date" label="วันหมดประกัน" extra="ระบบช่วยเติมให้ ตรวจกับสัญญาแล้วแก้ได้ ตั้งแล้วระบบจึงสร้างงาน"><DateInput /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="periodic_months" label="รอบตรวจตามสัญญา (เดือน)" extra="ว่าง = ไม่มี"><InputNumber min={1} precision={0} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="special_terms" label="เงื่อนไขพิเศษจากสัญญา/TOR"><TextArea rows={3} /></Form.Item>
        </Form>
      </Drawer>

      {/* ผู้รับจ้าง */}
      <Modal title="เพิ่มผู้รับจ้าง" open={!!vendorEdit} onCancel={() => setVendorEdit(null)} onOk={saveVendor} okText="บันทึก" cancelText="ยกเลิก" confirmLoading={vendorSubmit.saving} forceRender zIndex={OVER_DRAWER + 100}>
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

      {/* แก้ไขสัญญา */}
      <Modal title={`บันทึกแก้ไข/ขยายสัญญา ${amendFor?.contract_no ?? ''}`} open={!!amendFor} onCancel={() => setAmendFor(null)} onOk={saveAmend} okText="บันทึก" cancelText="ยกเลิก" confirmLoading={amendSubmit.saving} forceRender zIndex={OVER_DRAWER}>
        <Form form={amendForm} layout="vertical">
          <Row gutter={12}>
            <Col xs={24} md={12}><Form.Item name="amendment_no" label="เลขที่บันทึกแก้ไข" rules={[{ required: true, message: 'กรุณาระบุเลขที่' }]}><Input maxLength={60} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="amendment_date" label="วันที่" rules={[{ required: true, message: 'กรุณาระบุวันที่' }]}><DateInput /></Form.Item></Col>
          </Row>
          <Form.Item name="change_type" label="สิ่งที่เปลี่ยน" rules={[{ required: true, message: 'กรุณาเลือก' }]}><Select options={toOptions(AMENDMENT_TYPES)} /></Form.Item>
          <Form.Item name="detail" label="รายละเอียด" rules={[{ required: true, message: 'กรุณาระบุรายละเอียด' }]}><TextArea rows={2} /></Form.Item>
          <Row gutter={12}>
            <Col xs={24} md={12}><Form.Item name="add_warranty_months" label="บวก/ลบเดือนประกัน"><InputNumber precision={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="new_warranty_end_date" label="วันหมดประกันใหม่" extra="ว่าง = ใช้วันเดิม"><DateInput /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      {/* ผู้รับผิดชอบ */}
      <Modal title={`ผู้รับผิดชอบ ${staffFor?.contract_no ?? ''}`} open={!!staffFor} onCancel={() => setStaffFor(null)} onOk={saveStaff} okText="บันทึก" cancelText="ยกเลิก" confirmLoading={staffSubmit.saving} width={820} forceRender zIndex={OVER_DRAWER}>
        <Alert className="mb-3" type="info" showIcon title="ผู้รับผิดชอบและผู้สำรองจะเห็นสัญญานี้ในหน้าจอของหน้าที่นั้น" description="ผู้อนุมัติต้องไม่เป็นผู้ตรวจในสัญญาเดียวกัน ถ้าไม่ระบุผู้อนุมัติ ผอ. จะเป็นผู้พิจารณา" />
        <Form form={staffForm} layout="vertical">
          <Form.List name="staff">
            {(fields, { add, remove }) => (
              <>
                {fields.map(f => (
                  <Row gutter={8} key={f.key} align="top">
                    <Col xs={24} md={7}><Form.Item name={[f.name, 'duty']} rules={[{ required: true, message: 'เลือกหน้าที่' }]}><Select options={toOptions(DUTIES)} aria-label="หน้าที่" placeholder="หน้าที่" /></Form.Item></Col>
                    <Col xs={24} md={8}><Form.Item name={[f.name, 'user_id']} rules={[{ required: true, message: 'เลือกผู้รับผิดชอบ' }]}><UserSelect initial={knownPeople(staffFor)} placeholder="ผู้รับผิดชอบ" ariaLabel="ผู้รับผิดชอบ" /></Form.Item></Col>
                    <Col xs={20} md={7}><Form.Item name={[f.name, 'backup_user_id']}><UserSelect initial={knownPeople(staffFor)} placeholder="ผู้สำรอง" ariaLabel="ผู้สำรอง" allowClear /></Form.Item></Col>
                    <Col xs={4} md={2}><Button danger icon={<DeleteOutlined />} aria-label="ลบแถว" onClick={() => remove(f.name)} /></Col>
                  </Row>
                ))}
                <Button block icon={<PlusOutlined />} onClick={() => add()}>เพิ่มผู้รับผิดชอบ</Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* เอกสาร */}
      <Modal title={docFor?.doc ? 'ตรวจนับ/แก้ไขเอกสาร' : 'ลงทะเบียนเอกสาร'} open={!!docFor} onCancel={() => setDocFor(null)} onOk={saveDoc} okText="บันทึก" cancelText="ยกเลิก" confirmLoading={docSubmit.saving} forceRender zIndex={OVER_DRAWER}>
        <Form form={docForm} layout="vertical">
          <Form.Item name="doc_type" label="ประเภทเอกสาร" rules={[{ required: true, message: 'กรุณาเลือก' }]}><Select options={toOptions(DOC_TYPES)} /></Form.Item>
          <Form.Item name="title" label="ชื่อเอกสาร" rules={[{ required: true, message: 'กรุณาระบุชื่อเอกสาร' }]}><Input maxLength={300} /></Form.Item>
          <Form.Item name="holder_user_id" label="ผู้ถือต้นฉบับ" rules={[{ required: true, message: 'กรุณาเลือกผู้ถือ' }]}><UserSelect initial={knownPeople(docFor?.contract)} ariaLabel="ผู้ถือต้นฉบับ" /></Form.Item>
          <Form.Item name="backup_user_id" label="ผู้เก็บสำรอง"><UserSelect initial={knownPeople(docFor?.contract)} ariaLabel="ผู้เก็บสำรอง" allowClear /></Form.Item>
          <Form.Item name="location" label="สถานที่เก็บ (อาคาร/ห้อง/ตู้/เลขแฟ้ม)" rules={[{ required: true, message: 'กรุณาระบุที่เก็บ' }]}><Input maxLength={300} /></Form.Item>
          <Form.Item name="scan_ref" label="ที่อยู่ไฟล์สแกน" extra="ระยะแรกยังอัปโหลดในระบบไม่ได้ ให้ระบุตำแหน่งไฟล์"><Input maxLength={500} /></Form.Item>
          <Row gutter={12}>
            <Col xs={24} md={12}><Form.Item name="last_checked_date" label="วันที่ตรวจนับ"><DateInput /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="check_result" label="ผลตรวจนับ"><Radio.Group options={[{ value: 'found', label: 'พบ' }, { value: 'missing', label: 'ไม่พบ' }]} /></Form.Item></Col>
          </Row>
          <Form.Item name="note" label="หมายเหตุ"><TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* ติดตามชำรุด */}
      <Modal title="ติดตามความชำรุด" open={!!defectEdit} onCancel={() => setDefectEdit(null)} onOk={saveDefect} okText="บันทึก" cancelText="ยกเลิก" confirmLoading={defectSubmit.saving} forceRender zIndex={OVER_DRAWER}>
        <Text type="secondary">{defectEdit?.detail}</Text>
        <Divider />
        <Form form={defectForm} layout="vertical">
          <Form.Item name="notified_vendor_date" label="วันที่แจ้งผู้รับจ้าง"><DateInput /></Form.Item>
          <Form.Item name="fixed_date" label="วันที่ซ่อมเสร็จ"><DateInput disabledDate={(d: dayjs.Dayjs) => d.isAfter(dayjs(), 'day')} /></Form.Item>
          <Form.Item name="fixed_note" label="บันทึกการซ่อม"><TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* เสนอคืน */}
      <Modal title={`เสนอคืนหลักประกัน ${returnFor?.contract_no ?? ''}`} open={!!returnFor} onCancel={() => setReturnFor(null)} onOk={saveReturn} okText="ส่งเสนออนุมัติ" cancelText="ยกเลิก" confirmLoading={returnSubmit.saving} forceRender zIndex={OVER_DRAWER}>
        <Alert className="mb-3" type="info" showIcon title={`วันหมดประกัน ${fmtDate(returnFor?.warranty_end_date)}`} description="ระบบจะตรวจว่าผ่านตรวจรอบสุดท้าย ไม่มีชำรุดค้าง และการเงินบันทึกหลักประกันแล้ว กำหนดคืนนับจากวันพ้นภาระตามค่าที่ตั้งไว้" />
        <Form form={returnForm} layout="vertical">
          <Form.Item name="released_date" label="วันที่ผู้รับจ้างพ้นภาระตามสัญญา" rules={[{ required: true, message: 'กรุณาระบุวันที่' }]}><DateInput disabledDate={(d: dayjs.Dayjs) => d.isAfter(dayjs(), 'day')} /></Form.Item>
          <Form.Item name="memo" label="บันทึกเสนอ"><TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      {/* ยกเลิก */}
      <Modal title={`ยกเลิกรายการ ${cancelFor?.contract_no ?? ''}`} open={!!cancelFor} onCancel={() => setCancelFor(null)} onOk={saveCancel} okText="ยืนยันยกเลิก" okButtonProps={{ danger: true }} cancelText="ไม่ยกเลิก" confirmLoading={cancelSubmit.saving} forceRender zIndex={OVER_DRAWER}>
        <Alert className="mb-3" type="warning" showIcon title="ใช้เมื่อบันทึกผิดหรือสัญญาถูกยกเลิก" description="สัญญาที่ยังถือหลักประกันอยู่ยกเลิกไม่ได้ เพราะพัสดุหรือฝ่ายกฎหมายต้องตัดสินเรื่องหลักประกันก่อน" />
        <Form form={cancelForm} layout="vertical">
          <Form.Item name="reason" label="เหตุผล" rules={[{ required: true, message: 'กรุณาระบุเหตุผล' }]}><TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* ลบถาวร (ADMIN) */}
      <Modal title={`ลบสัญญา ${deleteFor?.contract_no ?? ''}`} open={!!deleteFor} onCancel={() => setDeleteFor(null)} onOk={saveDelete} okText="ลบถาวร" okButtonProps={{ danger: true }} cancelText="ไม่ลบ" confirmLoading={deleteSubmit.saving} forceRender zIndex={OVER_DRAWER}>
        <Alert className="mb-3" type="error" showIcon title="ลบแล้วกู้คืนไม่ได้"
          description="ผู้รับผิดชอบ เอกสาร ผลตรวจ รายการชำรุด เรื่องเสนอคืน และงานตามกำหนดของสัญญานี้จะถูกลบด้วย ระบบเก็บสำเนาไว้ในประวัติการแก้ไข ถ้าสัญญาเกิดขึ้นจริงแต่ถูกยกเลิก ให้ใช้ “ยกเลิกรายการ” แทน" />
        <Form form={deleteForm} layout="vertical">
          <Form.Item name="reason" label="เหตุผลที่ลบ" rules={[{ required: true, message: 'กรุณาระบุเหตุผล' }]}><TextArea rows={2} placeholder="เช่น บันทึกซ้ำกับสัญญาเลขที่ ..." /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default function ProcurementContractsPage() {
  return (
    <ContractPage screen="procurement" title="พัสดุ — ทะเบียนสัญญา" icon={<FaBoxOpen />} subtitle="กลุ่มงานพัสดุ">
      {me => <ProcurementContent me={me} />}
    </ContractPage>
  )
}
