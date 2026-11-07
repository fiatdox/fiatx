'use client'
// หน้าจอหัวหน้าหน่วยงาน / ผู้รับมอบอำนาจ: ดูสรุปเรื่องเสนอคืน แล้วอนุมัติหรือส่งกลับ
import React, { useCallback, useEffect, useState } from 'react'
import { App, Button, Card, Empty, Form, Input, Modal, Radio, Table, Tabs, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { FaSignature } from 'react-icons/fa'
import { api, ApiError, cardStyle, ContractDrawer, ContractPage, DueTag, fmtDate, fmtMoney, RETURN_STATUS } from '../contractShared'

const { Text } = Typography

/* eslint-disable @typescript-eslint/no-explicit-any */
const ApprovalContent = () => {
  const { message } = App.useApp()
  const [pending, setPending] = useState<any[]>([])
  const [decided, setDecided] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<number | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [target, setTarget] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const decision = Form.useWatch('decision', form)

  const load = useCallback(async () => {
    try {
      const [p, d] = await Promise.all([api('returns?status=pending'), api('returns?status=decided')])
      setPending(p)
      setDecided(d)
    } catch (e) { message.error((e as Error).message) } finally { setLoading(false) }
  }, [message])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])

  const save = async () => {
    const v = await form.validateFields().catch(() => null)
    if (!v) return
    setSaving(true)
    try {
      await api(`returns/${target.id}/decision`, 'POST', v)
      message.success(v.decision === 'approved' ? 'อนุมัติแล้ว ส่งงานต่อให้การเงิน' : 'ส่งกลับให้พัสดุแล้ว')
      setTarget(null)
      setRefresh(n => n + 1)
      load()
    } catch (e) {
      const err = e as ApiError
      if (err.field) form.setFields([{ name: err.field, errors: [err.message] }])
      else message.error(err.message)
    } finally { setSaving(false) }
  }

  const base: ColumnsType<any> = [
    { title: 'สัญญา', dataIndex: 'contract_no', render: (v: string, r: any) => <><Button type="link" size="small" style={{ padding: 0 }} onClick={() => setOpenId(r.contract_id)}>{v}</Button><div style={{ fontSize: 12 }}><Text type="secondary">{r.project_name} · {r.vendor_name}</Text></div></> },
    { title: 'ยอดหลักประกัน', dataIndex: 'held_amount', width: 130, align: 'right', render: fmtMoney },
    { title: 'หมดประกัน / พ้นภาระ', dataIndex: 'released_date', width: 170, render: (v: string, r: any) => <>{fmtDate(r.warranty_end_date)}<div style={{ fontSize: 12 }}><Text type="secondary">พ้นภาระ {fmtDate(v)}</Text></div></> },
    { title: 'ผู้เสนอ', dataIndex: 'proposer_name', width: 180 },
  ]
  const pendingCols: ColumnsType<any> = [
    ...base,
    { title: 'ตรวจรอบสุดท้าย', dataIndex: 'final_date', width: 130, render: (v: string | null) => v ? <Tag color="success">ไม่พบชำรุด {fmtDate(v)}</Tag> : '—' },
    { title: 'กำหนดคืน', dataIndex: 'due_date', width: 210, render: (v: string, r: any) => <DueTag state={r.due_state} date={v} /> },
    { title: '', width: 120, align: 'right', render: (_: unknown, r: any) => r.can_decide
      ? <Button size="small" type="primary" onClick={() => { form.resetFields(); setTarget(r) }}>พิจารณา</Button>
      : <Text type="secondary" style={{ fontSize: 12 }}>{r.conflict ? 'คุณเป็นผู้เสนอ/ผู้ตรวจ' : 'ดูอย่างเดียว'}</Text> },
  ]
  const decidedCols: ColumnsType<any> = [
    ...base,
    { title: 'ผล', dataIndex: 'status', width: 130, render: (v: string) => <Tag color={RETURN_STATUS[v]?.color}>{RETURN_STATUS[v]?.label}</Tag> },
    { title: 'ผู้พิจารณา', dataIndex: 'decider_name', width: 180 },
    { title: 'หมายเหตุ', dataIndex: 'decision_note', render: (v: string | null) => v ?? '—' },
  ]

  return (
    <>
      <Card style={cardStyle} styles={{ body: { padding: 12 } }}>
        <Tabs items={[
          { key: 'pending', label: `รออนุมัติ (${pending.length})`, children: <Table size="small" rowKey="id" loading={loading} columns={pendingCols} dataSource={pending} pagination={{ pageSize: 20, hideOnSinglePage: true }} scroll={{ x: 'max-content' }} locale={{ emptyText: <Empty description="ไม่มีเรื่องรออนุมัติ" /> }} /> },
          { key: 'decided', label: `พิจารณาแล้ว (${decided.length})`, children: <Table size="small" rowKey="id" loading={loading} columns={decidedCols} dataSource={decided} pagination={{ pageSize: 20, hideOnSinglePage: true }} scroll={{ x: 'max-content' }} locale={{ emptyText: <Empty description="ยังไม่มีประวัติ" /> }} /> },
        ]} />
      </Card>
      <ContractDrawer id={openId} refreshKey={refresh} onClose={() => setOpenId(null)} />
      <Modal title={`พิจารณาคืนหลักประกัน ${target?.contract_no ?? ''}`} open={!!target} onCancel={() => setTarget(null)} onOk={save} okText="บันทึกผล" cancelText="ยกเลิก" confirmLoading={saving} forceRender>
        {target && (
          <div className="mb-3" style={{ fontSize: 13 }}>
            <div>{target.project_name}</div>
            <Text type="secondary">ยอด {fmtMoney(target.held_amount)} บาท · ตรวจรอบสุดท้าย {fmtDate(target.final_date)} · เอกสารที่ลงทะเบียน {target.doc_count} รายการ</Text>
            {target.memo && <div className="mt-2"><Text type="secondary">บันทึกเสนอ:</Text> {target.memo}</div>}
          </div>
        )}
        <Form form={form} layout="vertical">
          <Form.Item name="decision" label="ผลการพิจารณา" rules={[{ required: true, message: 'กรุณาเลือกผลการพิจารณา' }]}>
            <Radio.Group options={[{ value: 'approved', label: 'อนุมัติคืน' }, { value: 'sent_back', label: 'ส่งกลับแก้ไข' }]} />
          </Form.Item>
          <Form.Item name="note" label="หมายเหตุ" rules={[{ required: decision === 'sent_back', message: 'ส่งกลับต้องระบุเหตุผล' }]}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default function ApprovalContractsPage() {
  return (
    <ContractPage screen="approval" title="หัวหน้าหน่วยงาน / ผู้รับมอบอำนาจ" icon={<FaSignature />} subtitle="อนุมัติการคืนหลักประกันสัญญา">
      {() => <ApprovalContent />}
    </ContractPage>
  )
}
