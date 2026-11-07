'use client'
// เจ้าหนี้การค้า — กำหนดจ่าย อ่านจากทะเบียนเจ้าหนี้กลาง (fin_payables) ชุดเดียวกับหน้าผู้รับจ้าง
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, App, Button, Card, Col, Empty, Input, Row, Select, Statistic, Table, Tabs, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { FieldTimeOutlined, FundOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { FaMoneyCheckAlt } from 'react-icons/fa'
import Link from 'next/link'
import dayjs, { type Dayjs } from 'dayjs'
import {
  api, cardStyle, ContractPage, DATE_FORMAT, DueTag, fmtDate, fmtMoney, PAY_STATUS, ThaiDatePicker, type ContractMe,
} from '@/app/general/contracts/contractShared'
import { usePayableActions } from '@/app/general/contracts/payableActions'

const { Text } = Typography

/* eslint-disable @typescript-eslint/no-explicit-any */
type View = 'open' | 'overdue' | 'paid' | 'all'
type DateField = 'due_date' | 'invoice_date' | 'last_paid_date'
const DATE_FIELD_LABEL: Record<DateField, string> = { due_date: 'ครบกำหนดจ่าย', invoice_date: 'วันที่ใบแจ้งหนี้', last_paid_date: 'วันที่จ่าย' }

const isOpen = (p: any) => p.pay_status === 'unpaid' || p.pay_status === 'partial'
const daysLeft = (due: string) => dayjs(due).diff(dayjs().startOf('day'), 'day')
// จ่ายตรงเวลา = จ่ายครบไม่เกินวันครบกำหนด รายการที่ไม่มีวันครบกำหนดไม่นับ
const onTime = (p: any) => p.pay_status === 'paid' && p.due_date && p.last_paid_date ? p.last_paid_date <= p.due_date : null

const DueCell = ({ p }: { p: any }) => {
  if (!p.due_date) return <Text type="secondary">ไม่ระบุ</Text>
  if (!isOpen(p)) return <>{fmtDate(p.due_date)}</>
  const d = daysLeft(p.due_date)
  return (
    <div>
      <DueTag state={p.due_state} date={p.due_date} />
      <div style={{ fontSize: 12 }}><Text type={d < 0 ? 'danger' : 'secondary'}>{d < 0 ? `เกิน ${-d} วัน` : d === 0 ? 'ครบกำหนดวันนี้' : `เหลือ ${d} วัน`}</Text></div>
    </div>
  )
}

const PayableContent = ({ me }: { me: ContractMe }) => {
  const { message } = App.useApp()
  const [rows, setRows] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<View>('open')
  const [dateField, setDateField] = useState<DateField>('due_date')
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null)

  const load = useCallback(async () => {
    try {
      const [p, v] = await Promise.all([api(`payables?search=${encodeURIComponent(search)}`), api('vendors')])
      setRows(p)
      setVendors(v)
    } catch (e) { message.error((e as Error).message) } finally { setLoading(false) }
  }, [search, message])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])
  const { openPayableForm, openPay, askReason, modals } = usePayableActions({ vendors, onChanged: load })

  const filtered = useMemo(() => {
    if (!range) return rows
    const [from, to] = [range[0].format('YYYY-MM-DD'), range[1].format('YYYY-MM-DD')]
    return rows.filter(p => p[dateField] && p[dateField] >= from && p[dateField] <= to)
  }, [rows, range, dateField])

  const summary = useMemo(() => {
    const open = filtered.filter(isOpen)
    const overdue = open.filter(p => p.due_state === 'overdue')
    const near = open.filter(p => p.due_state === 'near')
    const judged = filtered.map(onTime).filter(v => v !== null)
    return {
      open, overdue, near,
      outstanding: open.reduce((n, p) => n + p.balance, 0),
      overdueAmount: overdue.reduce((n, p) => n + p.balance, 0),
      nearAmount: near.reduce((n, p) => n + p.balance, 0),
      onTimePct: judged.length ? Math.round(judged.filter(Boolean).length / judged.length * 100) : null,
      judged: judged.length,
    }
  }, [filtered])

  const lists: Record<View, any[]> = useMemo(() => {
    // ค้างจ่ายเรียงตามวันครบกำหนดก่อน รายการไม่ระบุวันไว้ท้าย
    const byDue = (a: any, b: any) => (a.due_date ?? '9999') < (b.due_date ?? '9999') ? -1 : (a.due_date ?? '9999') > (b.due_date ?? '9999') ? 1 : 0
    return {
      open: [...summary.open].sort(byDue),
      overdue: [...summary.overdue].sort(byDue),
      paid: filtered.filter(p => p.pay_status === 'paid').sort((a, b) => (b.last_paid_date ?? '').localeCompare(a.last_paid_date ?? '')),
      all: filtered,
    }
  }, [filtered, summary])

  const cols: ColumnsType<any> = [
    { title: 'ผู้รับจ้าง', dataIndex: 'vendor_name', width: 190 },
    { title: 'รายการ', dataIndex: 'description', render: (v: string, r: any) => <><div>{v}</div><Text type="secondary" style={{ fontSize: 12 }}>{[r.invoice_no && `ใบแจ้งหนี้ ${r.invoice_no}`, r.contract_no && `สัญญา ${r.contract_no}`, r.source_module && `จาก ${r.source_module}`].filter(Boolean).join(' · ') || 'ไม่ได้ผูกสัญญา'}</Text></> },
    { title: 'วันที่', dataIndex: 'invoice_date', width: 95, render: fmtDate },
    { title: 'ครบกำหนด', dataIndex: 'due_date', width: 175, render: (_: unknown, r: any) => <DueCell p={r} /> },
    { title: 'ยอดหนี้', dataIndex: 'amount', width: 110, align: 'right', render: fmtMoney },
    { title: 'ค้างจ่าย', dataIndex: 'balance', width: 110, align: 'right', render: (v: number, r: any) => r.pay_status === 'cancelled' || v <= 0 ? '—' : <Text strong>{fmtMoney(v)}</Text> },
    {
      title: 'สถานะ', dataIndex: 'pay_status', width: 135, render: (v: string, r: any) => {
        const t = onTime(r)
        return (
          <>
            <Tag color={PAY_STATUS[v]?.color} title={r.cancel_reason ?? undefined}>{PAY_STATUS[v]?.label}</Tag>
            {r.last_paid_date && <div style={{ fontSize: 12 }}><Text type="secondary">จ่าย {fmtDate(r.last_paid_date)}</Text></div>}
            {t !== null && <div style={{ fontSize: 12 }}><Text type={t ? 'success' : 'warning'}>{t ? 'ตรงเวลา' : 'จ่ายช้า'}</Text></div>}
          </>
        )
      },
    },
    ...(me.finance ? [{
      title: '', width: 170, align: 'right' as const, fixed: 'right' as const, render: (_: unknown, r: any) => (
        <>
          {isOpen(r) && <Button size="small" type="primary" onClick={() => openPay(r)}>จ่าย</Button>}{' '}
          {isOpen(r) && <Button size="small" onClick={() => openPayableForm(r)}>แก้ไข</Button>}{' '}
          {r.pay_status === 'unpaid' && <Button size="small" danger onClick={() => askReason('cancel', r.id, `ยกเลิกรายการ ${r.invoice_no ?? r.description}`)}>ยกเลิก</Button>}
        </>
      ),
    }] : []),
  ]
  const table = (data: any[]) => (
    <Table size="small" rowKey="id" loading={loading} columns={cols} dataSource={data} pagination={{ pageSize: 20, hideOnSinglePage: true }} scroll={{ x: 1150 }}
      locale={{ emptyText: <Empty description={range ? 'ไม่มีรายการในช่วงที่เลือก' : 'ไม่มีรายการ'} /> }} />
  )

  return (
    <>
      <div className="flex flex-wrap gap-2 justify-end mb-4" style={{ marginTop: -8 }}>
        <Link href="/accounting/accounts-payable/dashboard"><Button icon={<FundOutlined />}>Dashboard</Button></Link>
        <Link href="/general/contracts/vendors"><Button>ทะเบียนผู้รับจ้าง</Button></Link>
        {me.finance && <Button type="primary" icon={<PlusOutlined />} onClick={() => openPayableForm()}>บันทึกเจ้าหนี้</Button>}
      </div>

      <Row gutter={[12, 12]} className="mb-4">
        <Col xs={12} md={6}><Card style={cardStyle}><Statistic title={`ค้างจ่าย (${summary.open.length} รายการ)`} value={fmtMoney(summary.outstanding)} suffix="บาท" /></Card></Col>
        <Col xs={12} md={6}><Card style={cardStyle}><Statistic title={`เกินกำหนด (${summary.overdue.length} รายการ)`} value={fmtMoney(summary.overdueAmount)} suffix="บาท" styles={summary.overdue.length ? { content: { color: 'var(--ant-color-error)' } } : undefined} /></Card></Col>
        <Col xs={12} md={6}><Card style={cardStyle}><Statistic title={`ใกล้ครบกำหนด (${summary.near.length} รายการ)`} value={fmtMoney(summary.nearAmount)} suffix="บาท" prefix={<FieldTimeOutlined />} /></Card></Col>
        <Col xs={12} md={6}><Card style={cardStyle}><Statistic title={`KPI จ่ายตรงเวลา (${summary.judged} รายการ)`} value={summary.onTimePct ?? '—'} suffix={summary.onTimePct == null ? undefined : '%'} /></Card></Col>
      </Row>

      {summary.overdue.length > 0 && (
        <Alert className="mb-4" type="error" showIcon title={`มีเจ้าหนี้เกินกำหนดชำระ ${summary.overdue.length} รายการ รวม ${fmtMoney(summary.overdueAmount)} บาท`} description="กระทบ KPI การจ่ายตรงเวลา โปรดดำเนินการจ่าย หรือบันทึกเหตุผลที่จ่ายช้าในหมายเหตุการจ่าย" />
      )}

      <Card style={cardStyle} styles={{ body: { padding: 12 } }}>
        <div className="flex flex-wrap gap-2 items-center mb-2">
          <Input.Search allowClear placeholder="ค้นหาผู้รับจ้าง เลขใบแจ้งหนี้ รายการ เลขที่สัญญา" style={{ maxWidth: 340 }} onSearch={setSearch} aria-label="ค้นหาเจ้าหนี้" />
          <Select value={dateField} onChange={setDateField} style={{ width: 160 }} aria-label="ช่วงวันที่ของ"
            options={(Object.keys(DATE_FIELD_LABEL) as DateField[]).map(k => ({ value: k, label: DATE_FIELD_LABEL[k] }))} />
          <ThaiDatePicker.RangePicker format={DATE_FORMAT} value={range} allowClear style={{ maxWidth: 280 }}
            onChange={d => setRange(d && d[0] && d[1] ? [d[0], d[1]] : null)}
            presets={[
              { label: '7 วันข้างหน้า', value: [dayjs(), dayjs().add(7, 'day')] },
              { label: '30 วันข้างหน้า', value: [dayjs(), dayjs().add(30, 'day')] },
              { label: 'เดือนนี้', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
              { label: '30 วันที่ผ่านมา', value: [dayjs().subtract(30, 'day'), dayjs()] },
            ]} />
          {range && (
            <>
              <Text type="secondary" style={{ fontSize: 12 }}>พบ {filtered.length}/{rows.length} รายการ</Text>
              <Button size="small" icon={<ReloadOutlined />} onClick={() => setRange(null)}>ล้างตัวกรอง</Button>
            </>
          )}
        </div>
        <Tabs activeKey={view} onChange={k => setView(k as View)} items={[
          { key: 'open', label: `ค้างจ่าย เรียงตามครบกำหนด (${lists.open.length})`, children: table(lists.open) },
          { key: 'overdue', label: `เกินกำหนด (${lists.overdue.length})`, children: table(lists.overdue) },
          { key: 'paid', label: `จ่ายครบ (${lists.paid.length})`, children: table(lists.paid) },
          { key: 'all', label: `ทั้งหมด (${lists.all.length})`, children: table(lists.all) },
        ]} />
      </Card>

      {modals}
    </>
  )
}

export default function AccountsPayablePage() {
  return (
    <ContractPage screen="vendors" title="เจ้าหนี้การค้า — กำหนดจ่าย" icon={<FaMoneyCheckAlt />}
      subtitle="ข้อมูลชุดเดียวกับทะเบียนผู้รับจ้าง การเงินบันทึกหนี้และการจ่ายได้จากหน้านี้"
      crumbs={[{ href: '/accounting', title: 'งานการเงินและบัญชี' }]}>
      {me => <PayableContent me={me} />}
    </ContractPage>
  )
}
