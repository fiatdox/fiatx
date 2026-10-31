'use client'
// งาน HR ตรวจจำนวนวันลาที่คร่อมเสาร์-อาทิตย์ / วันหยุดราชการ + จัดการวันหยุดราชการ (เฉพาะ ADMIN / HR)
import React, { useCallback, useEffect, useState } from 'react'
import {
  Card, Typography, Button, Modal, Form, Input, InputNumber, Space, App, Tag, Tooltip,
  Popconfirm, Segmented, DatePicker, ConfigProvider, Table, Tabs, Select, Badge,
} from 'antd'
import Breadcrumb from '@/app/components/AppBreadcrumb'
import type { ColumnsType } from 'antd/es/table'
import {
  HomeOutlined, CheckOutlined, EditOutlined, RollbackOutlined, DeleteOutlined, PlusOutlined, CalendarOutlined, ReloadOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import thTH from 'antd/locale/th_TH'
import { FaUsersCog, FaCalendarAlt } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'

dayjs.extend(buddhistEra)

// locale ของ antd ไม่ได้แปลงปีในหัวปฏิทินเป็น พ.ศ. ให้
const TH_LOCALE = { ...thTH, DatePicker: { ...thTH.DatePicker!, lang: { ...thTH.DatePicker!.lang, yearFormat: 'BBBB' } } }

const { Title, Text } = Typography

const DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
/** 'YYYY-MM-DD' → 'ศ 04/12/2569' */
const be = (s: string, withDow = true) => {
  const [y, m, d] = s.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return `${withDow ? `${DOW[dow]} ` : ''}${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y + 543}`
}
const nf = (n: number) => Number(n).toLocaleString('th-TH', { maximumFractionDigits: 1 })

const STATUS_TAG: Record<string, { color: string; label: string }> = {
  PENDING: { color: 'gold', label: 'รออนุมัติ' },
  APPROVED: { color: 'green', label: 'อนุมัติแล้ว' },
  CANCEL_PENDING: { color: 'orange', label: 'ขอยกเลิก' },
}
const HOLIDAY_TYPE: Record<string, { color: string; label: string }> = {
  public: { color: 'blue', label: 'วันหยุดราชการ' },
  substitution: { color: 'purple', label: 'วันหยุดชดเชย' },
  special: { color: 'magenta', label: 'วันหยุดพิเศษ' },
}

interface DayCount {
  calendar_days: number; weekend_days: number; holidays: { date: string; name: string }[]
  working_days: number; working_days_only: boolean; computed_days: number; spans_non_working: boolean
}
interface CheckRow {
  id: number; employee_name: string; position_name: string | null; major_name: string | null; submajor_name: string | null
  leave_type_name: string; start_date: string; end_date: string; total_days: number; is_half_day: boolean
  status: string; reason: string | null
  day_check_status: 'VERIFIED' | 'ADJUSTED' | null; day_check_note: string | null; day_checked_by_name: string | null
  count: DayCount; mismatch: boolean; needs_review: boolean
  /** ระบุวันน้อยกว่าที่ปฏิทินนับได้ (อาจลักไก่ลดวันลา) */
  understated: boolean
  /** ถ้านับตามปฏิทิน สิทธิ์คงเหลือของปีงบนั้นไม่พอ */
  quota_short: boolean
  remaining: number | null
}
interface Summary { total: number; review: number; approved: number; understated: number; spans: number; mismatch: number; checked: number }
interface Holiday { id: number; holiday_date: string; name_th: string; holiday_type: string; note: string | null }

type Filter = 'review' | 'approved' | 'understated' | 'spans' | 'mismatch' | 'checked' | 'all'

// ── ตรวจจำนวนวันลา ─────────────────────────────────────────────────────────
const DayCheckTab = () => {
  const { message } = App.useApp()
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().startOf('month').subtract(1, 'month'), dayjs().add(2, 'month').endOf('month')])
  const [filter, setFilter] = useState<Filter>('review')
  const [rows, setRows] = useState<CheckRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [adjusting, setAdjusting] = useState<CheckRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm<{ total_days: number; note: string }>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ from: range[0].format('YYYY-MM-DD'), to: range[1].format('YYYY-MM-DD'), filter })
      const j = await fetch(`/api/v1/hr/leave-day-check?${qs}`).then(r => r.json())
      if (!j?.success) { message.error(j?.message ?? 'โหลดข้อมูลไม่สำเร็จ'); return }
      setRows(j.data); setSummary(j.summary)
    } catch { message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ') } finally { setLoading(false) }
  }, [range, filter, message])
  useEffect(() => { void Promise.resolve().then(load) }, [load])

  const post = async (url: string, body: unknown) => {
    const j = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(r => r.json()).catch(() => null)
    if (!j?.success) { message.error(j?.message ?? 'บันทึกไม่สำเร็จ'); return false }
    message.success(j.message ?? 'บันทึกแล้ว')
    return true
  }

  const verify = async (r: CheckRow) => { if (await post(`/api/v1/hr/leave-day-check/${r.id}/verify`, {})) void load() }
  // ยกเลิกผลการตรวจ — กลับเป็นยังไม่ตรวจ และแบบใบลาไม่พิมพ์ชื่อผู้ตรวจ (จำนวนวันที่แก้ไว้คงเดิม)
  const cancelCheck = async (r: CheckRow) => { if (await post(`/api/v1/hr/leave-day-check/${r.id}/cancel`, {})) void load() }
  const openAdjust = (r: CheckRow) => {
    setAdjusting(r)
    form.setFieldsValue({ total_days: r.count.computed_days || r.total_days, note: '' })
  }
  const saveAdjust = async () => {
    if (!adjusting) return
    const v = await form.validateFields()
    setSaving(true)
    const ok = await post(`/api/v1/hr/leave-day-check/${adjusting.id}/adjust`, v)
    setSaving(false)
    if (ok) { setAdjusting(null); void load() }
  }

  const columns: ColumnsType<CheckRow> = [
    {
      title: 'ผู้ลา', key: 'emp', width: 220,
      render: (_, r) => (
        <div style={{ minWidth: 0 }}>
          <Text strong>{r.employee_name}</Text>
          <div><Text type="secondary" style={{ fontSize: 12 }}>{[r.position_name, r.submajor_name ?? r.major_name].filter(Boolean).join(' · ') || '—'}</Text></div>
        </div>
      ),
    },
    {
      title: 'ประเภท / สถานะ', key: 'type', width: 170,
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          <Text>{r.leave_type_name}</Text>
          <Tag color={STATUS_TAG[r.status]?.color} style={{ margin: 0 }}>{STATUS_TAG[r.status]?.label ?? r.status}</Tag>
        </Space>
      ),
    },
    {
      title: 'ช่วงวันที่ลา', key: 'range', width: 200,
      render: (_, r) => (
        <div>
          <Text>{be(r.start_date)}{r.end_date !== r.start_date && <> – {be(r.end_date)}</>}</Text>
          <div><Text type="secondary" style={{ fontSize: 12 }}>{r.count.calendar_days} วันปฏิทิน{r.is_half_day ? ' · มีครึ่งวัน' : ''}</Text></div>
        </div>
      ),
    },
    {
      title: 'วันหยุดในช่วง', key: 'off', width: 210,
      render: (_, r) => (
        <Space size={[4, 4]} wrap>
          {r.count.weekend_days > 0 && <Tag style={{ margin: 0 }}>ส–อา {r.count.weekend_days} วัน</Tag>}
          {r.count.holidays.map(h => (
            <Tooltip key={h.date} title={h.name}><Tag color="red" style={{ margin: 0 }}>{be(h.date)}</Tag></Tooltip>
          ))}
          {!r.count.spans_non_working && <Text type="secondary">—</Text>}
        </Space>
      ),
    },
    {
      title: 'ควรเป็น', key: 'computed', width: 110, align: 'center',
      render: (_, r) => (
        <Tooltip title={r.count.working_days_only ? 'ประเภทนี้นับเฉพาะวันทำการ' : 'ประเภทนี้นับวันปฏิทินต่อเนื่อง'}>
          <Text strong>{nf(r.count.computed_days)}</Text> <Text type="secondary" style={{ fontSize: 11 }}>{r.count.working_days_only ? 'วันทำการ' : 'วันปฏิทิน'}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'ในใบลา', key: 'total', width: 90, align: 'center',
      render: (_, r) => (
        <Space direction="vertical" size={2} align="center">
          <Text strong type={r.mismatch ? 'danger' : undefined}>{nf(r.total_days)}</Text>
          {r.understated && <Tag color="red" style={{ margin: 0, fontSize: 11 }}>น้อยกว่าที่ควร</Tag>}
          {r.quota_short && (
            <Tooltip title={`ถ้านับตามปฏิทิน ต้องตัดเพิ่ม ${nf(r.count.computed_days - r.total_days)} วัน แต่สิทธิ์คงเหลือ ${nf(r.remaining ?? 0)} วัน`}>
              <Tag color="volcano" style={{ margin: 0, fontSize: 11 }}>สิทธิ์ไม่พอ</Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'ผลตรวจ', key: 'check', width: 170,
      render: (_, r) => r.day_check_status ? (
        <Tooltip title={r.day_check_note || undefined}>
          <Tag color={r.day_check_status === 'ADJUSTED' ? 'blue' : 'green'} style={{ margin: 0 }}>
            {r.day_check_status === 'ADJUSTED' ? 'แก้จำนวนวันแล้ว' : 'ยืนยันแล้ว'}
          </Tag>
          <div><Text type="secondary" style={{ fontSize: 11 }}>{r.day_checked_by_name}</Text></div>
        </Tooltip>
      ) : r.needs_review ? <Badge status="warning" text={r.mismatch ? 'จำนวนวันไม่ตรง' : 'รอตรวจ'} /> : <Text type="secondary">—</Text>,
    },
    {
      title: '', key: 'act', width: 220, fixed: 'right',
      render: (_, r) => (
        <Space size={4}>
          <Popconfirm
            title="ยืนยันจำนวนวันลา"
            description={`ใบนี้ลา ${nf(r.total_days)} วัน ถูกต้องแล้ว`}
            okText="ยืนยัน" cancelText="ยกเลิก"
            onConfirm={() => verify(r)}
          >
            <Button size="small" icon={<CheckOutlined />}>ถูกต้อง</Button>
          </Popconfirm>
          <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => openAdjust(r)}>แก้วัน</Button>
          {r.day_check_status && (
            <Popconfirm
              title="ยกเลิกผลการตรวจสอบ?"
              description={`ใบนี้จะกลับเป็น "ยังไม่ตรวจ" และแบบใบลาจะไม่พิมพ์ชื่อผู้ตรวจสอบ${r.day_check_status === 'ADJUSTED' ? ' (จำนวนวันที่แก้ไว้คงเดิม)' : ''}`}
              okText="ยกเลิกการตรวจ" cancelText="ไม่" okButtonProps={{ danger: true }}
              onConfirm={() => cancelCheck(r)}
            >
              <Tooltip title="ยกเลิกการตรวจสอบ"><Button size="small" danger icon={<RollbackOutlined />} /></Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  const seg = (value: Filter, label: string, n?: number) => ({ value, label: n == null ? label : `${label} (${n})` })

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
        <DatePicker.RangePicker
          value={range}
          format="DD/MM/BBBB"
          allowClear={false}
          onChange={v => { if (v?.[0] && v?.[1]) setRange([v[0], v[1]]) }}
        />
        <div className="overflow-x-auto">
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              seg('review', 'ต้องตรวจ', summary?.review),
              seg('approved', 'อนุมัติครบแล้ว รอ HR ตรวจ', summary?.approved),
              seg('understated', 'ใส่วันน้อยกว่าที่ควร', summary?.understated),
              seg('spans', 'คร่อมวันหยุด', summary?.spans),
              seg('mismatch', 'จำนวนวันไม่ตรง', summary?.mismatch),
              seg('checked', 'ตรวจแล้ว', summary?.checked),
              seg('all', 'ทั้งหมด', summary?.total),
            ]}
          />
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void load()} className="lg:ml-auto">รีเฟรช</Button>
      </div>
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
        ใบลาที่ยังมีผล (รออนุมัติ / อนุมัติแล้ว / ขอยกเลิก) ที่คร่อมเสาร์-อาทิตย์หรือวันหยุดราชการ หรือจำนวนวันในใบไม่ตรงกับที่ควรเป็น ·
        ใบที่ใส่วันน้อยกว่าที่ควรขึ้นก่อน และควรตรวจทุกใบหลังอนุมัติขั้นสุดท้าย (ตัวกรอง &quot;อนุมัติครบแล้ว รอ HR ตรวจ&quot;) ·
        &quot;ควรเป็น&quot; คำนวณจากปฏิทินวันหยุดปัจจุบัน — เพิ่มวันหยุดทีหลังใบเดิมจะกลับมาให้ตรวจ · แก้จำนวนวันแล้วปรับยอดวันลาคงเหลือทันที
      </Text>
      <Table<CheckRow>
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={rows}
        rowClassName={r => (r.understated && !r.day_check_status ? 'leave-understated-row' : '')}
        scroll={{ x: 1350 }}
        pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
        locale={{ emptyText: filter === 'review' ? 'ไม่มีใบลาที่ต้องตรวจในช่วงนี้' : 'ไม่มีข้อมูล' }}
      />

      <Modal
        title={adjusting ? `แก้จำนวนวันลา — ${adjusting.employee_name}` : ''}
        open={!!adjusting}
        onCancel={() => setAdjusting(null)}
        onOk={saveAdjust}
        okText="บันทึก"
        cancelText="ยกเลิก"
        confirmLoading={saving}
        destroyOnHidden
      >
        {adjusting && (
          <>
            <div className="mb-3">
              <Text>{adjusting.leave_type_name} · {be(adjusting.start_date)} – {be(adjusting.end_date)}</Text>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {adjusting.count.calendar_days} วันปฏิทิน · เสาร์-อาทิตย์ {adjusting.count.weekend_days} วัน · วันหยุดราชการ {adjusting.count.holidays.length} วัน
                  · ควรเป็น {nf(adjusting.count.computed_days)} วัน · ในใบ {nf(adjusting.total_days)} วัน
                </Text>
              </div>
            </div>
            <Form form={form} layout="vertical" requiredMark="optional">
              <Form.Item name="total_days" label="จำนวนวันที่ถูกต้อง" rules={[{ required: true, message: 'กรุณาระบุจำนวนวัน' }]}>
                <InputNumber min={0.5} step={0.5} className="w-full" addonAfter="วัน" />
              </Form.Item>
              <Form.Item name="note" label="เหตุผล" rules={[{ required: true, whitespace: true, message: 'กรุณาระบุเหตุผล' }]}>
                <Input.TextArea rows={2} placeholder="เช่น ไม่นับเสาร์-อาทิตย์ / วันหยุดชดเชย" maxLength={500} />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </>
  )
}

// ── วันหยุดราชการ ───────────────────────────────────────────────────────────
const HolidayTab = () => {
  const { message } = App.useApp()
  const [year, setYear] = useState(dayjs().year())
  const [rows, setRows] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Holiday | 'new' | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm<{ holiday_date: dayjs.Dayjs; name_th: string; holiday_type: string; note?: string }>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const j = await fetch(`/api/v1/hr/holidays?year=${year}`).then(r => r.json())
      if (!j?.success) { message.error(j?.message ?? 'โหลดวันหยุดไม่สำเร็จ'); return }
      setRows(j.data)
    } catch { message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ') } finally { setLoading(false) }
  }, [year, message])
  useEffect(() => { void Promise.resolve().then(load) }, [load])

  const open = (h: Holiday | 'new') => {
    setEditing(h)
    form.setFieldsValue(h === 'new'
      ? { holiday_date: undefined, name_th: '', holiday_type: 'public', note: '' }
      : { holiday_date: dayjs(h.holiday_date), name_th: h.name_th, holiday_type: h.holiday_type, note: h.note ?? '' })
  }
  const save = async () => {
    const v = await form.validateFields()
    setSaving(true)
    const isNew = editing === 'new'
    const res = await fetch(isNew ? '/api/v1/hr/holidays' : `/api/v1/hr/holidays/${(editing as Holiday).id}`, {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...v, holiday_date: v.holiday_date.format('YYYY-MM-DD'), note: v.note || null }),
    }).then(r => r.json()).catch(() => null)
    setSaving(false)
    if (!res?.success) { message.error(res?.message ?? 'บันทึกไม่สำเร็จ'); return }
    message.success(res.message ?? 'บันทึกแล้ว')
    setEditing(null)
    void load()
  }
  const remove = async (h: Holiday) => {
    const res = await fetch(`/api/v1/hr/holidays/${h.id}`, { method: 'DELETE' }).then(r => r.json()).catch(() => null)
    if (!res?.success) { message.error(res?.message ?? 'ลบไม่สำเร็จ'); return }
    message.success(res.message ?? 'ลบแล้ว')
    void load()
  }

  const thisYear = dayjs().year()
  const columns: ColumnsType<Holiday> = [
    { title: 'วันที่', key: 'date', width: 150, render: (_, h) => be(h.holiday_date) },
    { title: 'ชื่อวันหยุด', dataIndex: 'name_th', key: 'name', render: (v: string, h) => <>{v}{h.note && <div><Text type="secondary" style={{ fontSize: 12 }}>{h.note}</Text></div>}</> },
    {
      title: 'ประเภท', key: 'type', width: 150,
      render: (_, h) => <Tag color={HOLIDAY_TYPE[h.holiday_type]?.color} style={{ margin: 0 }}>{HOLIDAY_TYPE[h.holiday_type]?.label ?? h.holiday_type}</Tag>,
    },
    {
      title: '', key: 'act', width: 110, align: 'right',
      render: (_, h) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => open(h)} />
          <Popconfirm title="ลบวันหยุดนี้?" description="ใบลาที่คร่อมวันนี้จะถูกนับวันใหม่" okText="ลบ" okButtonProps={{ danger: true }} cancelText="ยกเลิก" onConfirm={() => remove(h)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select
          value={year}
          onChange={setYear}
          style={{ width: 140 }}
          options={[thisYear - 1, thisYear, thisYear + 1, thisYear + 2].map(y => ({ value: y, label: `ปี ${y + 543}` }))}
        />
        <Text type="secondary">{rows.length} วัน</Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => open('new')} className="ml-auto">เพิ่มวันหยุด</Button>
      </div>
      <Table<Holiday>
        rowKey="id" size="middle" loading={loading} columns={columns} dataSource={rows}
        scroll={{ x: 600 }} pagination={false}
        locale={{ emptyText: `ยังไม่มีวันหยุดของปี ${year + 543}` }}
      />
      <Modal
        title={editing === 'new' ? 'เพิ่มวันหยุดราชการ' : 'แก้ไขวันหยุดราชการ'}
        open={editing != null}
        onCancel={() => setEditing(null)}
        onOk={save}
        okText="บันทึก"
        cancelText="ยกเลิก"
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item name="holiday_date" label="วันที่" rules={[{ required: true, message: 'กรุณาเลือกวันที่' }]}>
            <DatePicker format="DD/MM/BBBB" className="w-full" />
          </Form.Item>
          <Form.Item name="name_th" label="ชื่อวันหยุด" rules={[{ required: true, whitespace: true, message: 'กรุณาระบุชื่อวันหยุด' }]}>
            <Input maxLength={300} />
          </Form.Item>
          <Form.Item name="holiday_type" label="ประเภท" rules={[{ required: true }]}>
            <Select options={Object.entries(HOLIDAY_TYPE).map(([value, t]) => ({ value, label: t.label }))} />
          </Form.Item>
          <Form.Item name="note" label="หมายเหตุ">
            <Input maxLength={300} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

const DayCheckContent = () => (
  <div className="min-h-dvh bg-app-bg text-app-text">
    <Navbar />
    <div className="p-4 md:p-8 max-w-350 mx-auto">
      <Breadcrumb
        items={[
          { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
          { title: <><FaUsersCog className="inline mr-1" /> งานทรัพยากรบุคคล</> },
          { href: '/hr/leave', title: <><FaCalendarAlt className="inline mr-1" /> การลา</> },
          { title: 'ตรวจวันลา / วันหยุด' },
        ]}
        className="mb-4"
      />
      <div className="mb-4">
        <Title level={3} className="m-0"><CalendarOutlined /> ตรวจวันลา / วันหยุดราชการ</Title>
        <Text type="secondary">ตรวจจำนวนวันของใบลาที่คร่อมเสาร์-อาทิตย์หรือวันหยุดราชการ ให้คิดวันลาถูกต้อง</Text>
      </div>
      <Card variant="borderless" className="shadow-sm rounded-xl">
        <Tabs
          items={[
            { key: 'check', label: 'ตรวจจำนวนวันลา', children: <DayCheckTab /> },
            { key: 'holidays', label: 'วันหยุดราชการ', children: <HolidayTab /> },
          ]}
        />
      </Card>
    </div>
  </div>
)

export default function LeaveDayCheckPage() {
  return (
    <AppThemeProvider colorPrimary="#10b981">
      <ConfigProvider locale={TH_LOCALE}>
        <DayCheckContent />
      </ConfigProvider>
    </AppThemeProvider>
  )
}
