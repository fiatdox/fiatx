'use client'
import { useState, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Cookies from 'js-cookie'
import type { VehicleRequestForPDF } from '@/app/components/VehicleRequestPDF'

const VehicleRequestPDFDownload = dynamic(
  () => import('@/app/components/VehicleRequestPDF'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center" style={{ height: 560 }}>
        <Button loading size="large">กำลังโหลดตัวอย่าง PDF...</Button>
      </div>
    ),
  }
)
import {
  Form, Input, Button, DatePicker, Radio, Card, Row, Col, Typography, Breadcrumb,
  ConfigProvider, App, Badge, Calendar, Divider, Space, Tag, Tabs, Table, Statistic,
  Tooltip, Popover, Upload, Modal, Select, Empty, Alert, Result, theme,
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, CarOutlined, CalendarOutlined, UserOutlined,
  InfoCircleOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  UnorderedListOutlined, PlusOutlined, MinusCircleOutlined, FileProtectOutlined,
  ProjectOutlined, UploadOutlined, PaperClipOutlined, PrinterOutlined,
  EnvironmentOutlined, TeamOutlined, IdcardOutlined, SendOutlined, ThunderboltOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import Navbar from '@/app/components/Navbar'

dayjs.extend(customParseFormat)

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { TextArea } = Input

// role ที่จัดการจ่ายรถ/รับงานได้ (หัวหน้ายานยนต์) — ตรงกับที่ตกลงไว้
const DISPATCH_ROLES = ['VEHICLE_HEAD', 'ADMIN']
// ขอบเขตชั่วโมงทำงานที่ใช้คำนวณ "ช่วงว่าง" ในหนึ่งวัน
const DAY_START = '06:00'
const DAY_END = '20:00'
const DT_FMT = 'YYYY-MM-DD HH:mm'

// ============================================================================
// Types
// ============================================================================
type TripStatus = 'pending' | 'assigned' | 'rejected'

interface Vehicle {
  id: string
  plate: string
  type: string        // รถตู้ | รถกระบะ | รถเก๋ง
  typeColor: string
  seats: number
}
interface Driver {
  id: string
  name: string
  phone: string
}
interface Trip {
  id: string
  requestDate: string        // DD/MM/YYYY
  requester: string
  requesterLevel: 'senior' | 'junior'
  start: string              // YYYY-MM-DD HH:mm
  end: string                // YYYY-MM-DD HH:mm
  projectName: string
  destinations: string[]     // หลายปลายทางได้
  purpose: string
  passengers: string[]
  needDriver: boolean
  status: TripStatus
  vehicleId?: string
  driverId?: string
  remark?: string
  documentFiles?: { name: string; size?: number }[]
}

// ============================================================================
// Mock master data
// ============================================================================
const FLEET: Vehicle[] = [
  { id: 'v1', plate: 'นข-1111', type: 'รถตู้',   typeColor: 'blue',   seats: 12 },
  { id: 'v2', plate: 'ฮฮ-2222', type: 'รถตู้',   typeColor: 'blue',   seats: 12 },
  { id: 'v3', plate: 'บบ-3333', type: 'รถกระบะ', typeColor: 'orange', seats: 4 },
  { id: 'v4', plate: 'กก-4444', type: 'รถเก๋ง',  typeColor: 'green',  seats: 4 },
]
const DRIVERS: Driver[] = [
  { id: 'd1', name: 'นายสมชาย รักงาน',  phone: '081-111-1111' },
  { id: 'd2', name: 'นายสมศักดิ์ ใจดี',  phone: '081-222-2222' },
  { id: 'd3', name: 'นายวิโรจน์ ขยันดี', phone: '081-333-3333' },
]

const today = dayjs()
const d = (offset: number, hm: string) => today.add(offset, 'day').format('YYYY-MM-DD') + ' ' + hm

const INITIAL_TRIPS: Trip[] = [
  {
    id: 'VR-0001', requestDate: today.subtract(2, 'day').format('DD/MM/YYYY'), requester: 'นพ.ประสิทธิ์ สุขใจ',
    requesterLevel: 'senior', start: d(1, '08:00'), end: d(1, '12:00'),
    projectName: 'ประชุมเขตสุขภาพ', destinations: ['สำนักงานสาธารณสุขจังหวัด'], purpose: 'ประชุมหารือแนวทางพัฒนา',
    passengers: ['นพ.ประสิทธิ์ สุขใจ', 'นางสาวมาลี ดีงาม'], needDriver: true,
    status: 'assigned', vehicleId: 'v1', driverId: 'd1',
    documentFiles: [{ name: 'หนังสือสั่งการ สธ0201-ว1234.pdf', size: 245000 }],
  },
  {
    id: 'VR-0002', requestDate: today.subtract(2, 'day').format('DD/MM/YYYY'), requester: 'นางสาวสุดา รักงาน',
    requesterLevel: 'junior', start: d(1, '13:00'), end: d(1, '17:00'),
    projectName: 'งานพัสดุรับมอบวัสดุ', destinations: ['ศาลากลางจังหวัด', 'ร้านค้าตัวแทนจำหน่าย'], purpose: 'รับมอบวัสดุครุภัณฑ์',
    passengers: ['นางสาวสุดา รักงาน', 'นายอนันต์ มีสุข', 'นายวิชัย เจริญ'], needDriver: true,
    status: 'assigned', vehicleId: 'v1', driverId: 'd2',   // คันเดียวกับ VR-0001 แต่คนละช่วงเวลา (บ่าย)
  },
  {
    id: 'VR-0003', requestDate: today.subtract(1, 'day').format('DD/MM/YYYY'), requester: 'นางวราภรณ์ ตั้งใจ',
    requesterLevel: 'senior', start: d(2, '07:00'), end: d(2, '20:00'),
    projectName: 'สัมมนาระดับชาติ 2569', destinations: ['โรงแรมเซ็นทาราแกรนด์ กรุงเทพฯ'], purpose: 'เข้าร่วมสัมมนาประจำปี',
    passengers: ['ผอ.โรงพยาบาล', 'รอง ผอ.', 'พยาบาลหัวหน้า'], needDriver: true,
    status: 'pending',
  },
  {
    id: 'VR-0004', requestDate: today.format('DD/MM/YYYY'), requester: 'นายอนันต์ มีสุข',
    requesterLevel: 'junior', start: d(1, '09:00'), end: d(1, '11:00'),
    projectName: 'ส่งเอกสารด่วน', destinations: ['ไปรษณีย์จังหวัด'], purpose: 'ส่งเอกสารราชการ',
    passengers: ['นายอนันต์ มีสุข', 'นางสาวสุดา รักงาน', 'นายวิชัย เจริญ'], needDriver: false,
    status: 'pending',
  },
]

// ============================================================================
// Availability helpers (per time-slot, overlap-aware)
// ============================================================================
const parse = (s: string) => dayjs(s, DT_FMT)
// สองช่วงเวลาทับกันหรือไม่ (แตะขอบพอดีไม่ถือว่าทับ)
const rangesOverlap = (aS: Dayjs, aE: Dayjs, bS: Dayjs, bE: Dayjs) => aS.isBefore(bE) && bS.isBefore(aE)
const fmtRange = (s: string, e: string) => {
  const a = parse(s), b = parse(e)
  return a.isSame(b, 'day')
    ? `${a.format('DD/MM/YYYY')} ${a.format('HH:mm')}–${b.format('HH:mm')}`
    : `${a.format('DD/MM HH:mm')} → ${b.format('DD/MM HH:mm')}`
}

// ============================================================================
// Status config
// ============================================================================
const statusConfig: Record<TripStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:  { label: 'รอจ่ายรถ',  color: 'warning', icon: <ClockCircleOutlined /> },
  assigned: { label: 'จ่ายรถแล้ว', color: 'success', icon: <CheckCircleOutlined /> },
  rejected: { label: 'ไม่อนุมัติ',  color: 'error',   icon: <CloseCircleOutlined /> },
}

// ============================================================================
// Page
// ============================================================================
const VehicleRequestPageContent = () => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [trips, setTrips] = useState<Trip[]>(INITIAL_TRIPS)
  const [selectedDate, setSelectedDate] = useState<Dayjs>(today)
  const [printRequest, setPrintRequest] = useState<VehicleRequestForPDF | null>(null)

  const requesterLevel = Form.useWatch('requesterLevel', form)
  const watchedRange = Form.useWatch('dateRange', form) as [Dayjs, Dayjs] | undefined
  const minPassengers = requesterLevel === 'junior' ? 3 : 1

  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const canDispatch = useMemo(() => {
    try {
      const raw = Cookies.get('user_data')
      if (!raw) return false
      const roles: string[] = JSON.parse(raw).roles ?? []
      return roles.map(r => String(r).toUpperCase()).some(r => DISPATCH_ROLES.includes(r))
    } catch { return false }
  }, [])

  // ---- assigned trips = คิวที่จ่ายรถแล้ว ใช้คำนวณความว่าง ----
  const assignedTrips = useMemo(() => trips.filter(t => t.status === 'assigned' && t.vehicleId), [trips])

  const vehicleFreeForRange = (vehicleId: string, s: Dayjs, e: Dayjs, excludeId?: string) =>
    !assignedTrips.some(t =>
      t.vehicleId === vehicleId && t.id !== excludeId && rangesOverlap(s, e, parse(t.start), parse(t.end)))

  const driverFreeForRange = (driverId: string, s: Dayjs, e: Dayjs, excludeId?: string) =>
    !assignedTrips.some(t =>
      t.driverId === driverId && t.id !== excludeId && rangesOverlap(s, e, parse(t.start), parse(t.end)))

  // งานที่รถคันนี้รับในวันหนึ่ง (เรียงตามเวลา)
  const vehicleBookingsOnDate = (vehicleId: string, dateStr: string) =>
    assignedTrips
      .filter(t => t.vehicleId === vehicleId && parse(t.start).format('YYYY-MM-DD') === dateStr)
      .sort((a, b) => parse(a.start).valueOf() - parse(b.start).valueOf())

  // ช่วงเวลาที่ยังว่างของรถในวันหนึ่ง (gap ระหว่างงานภายใน DAY_START–DAY_END)
  const vehicleFreeWindows = (vehicleId: string, dateStr: string): string[] => {
    const dayS = dayjs(`${dateStr} ${DAY_START}`, DT_FMT)
    const dayE = dayjs(`${dateStr} ${DAY_END}`, DT_FMT)
    const booked = vehicleBookingsOnDate(vehicleId, dateStr).map(t => ({ s: parse(t.start), e: parse(t.end) }))
    const windows: string[] = []
    let cursor = dayS
    for (const b of booked) {
      if (b.s.isAfter(cursor)) windows.push(`${cursor.format('HH:mm')}–${b.s.format('HH:mm')}`)
      if (b.e.isAfter(cursor)) cursor = b.e
    }
    if (cursor.isBefore(dayE)) windows.push(`${cursor.format('HH:mm')}–${dayE.format('HH:mm')}`)
    return windows
  }

  // ---- availability สำหรับช่วงเวลาที่กำลังกรอกในฟอร์ม ----
  const formAvailability = useMemo(() => {
    if (!watchedRange?.[0] || !watchedRange?.[1]) return null
    const [s, e] = watchedRange
    return FLEET.map(v => {
      const free = vehicleFreeForRange(v.id, s, e)
      const conflicts = assignedTrips
        .filter(t => t.vehicleId === v.id && rangesOverlap(s, e, parse(t.start), parse(t.end)))
        .map(t => fmtRange(t.start, t.end))
      return { vehicle: v, free, conflicts }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedRange, assignedTrips])

  // ============================================================================
  // Submit new request
  // ============================================================================
  const onFinish = (values: any) => {
    const [dateFrom, dateTo] = values.dateRange ?? []
    if (!dateFrom || !dateTo || !dateFrom.isBefore(dateTo)) {
      message.error('ช่วงเวลาไป–กลับไม่ถูกต้อง'); return
    }
    const passengers: string[] = (values.passengers ?? []).map((p: { name: string }) => p?.name).filter(Boolean)
    const destinations: string[] = (values.destinations ?? []).map((x: { place: string }) => x?.place).filter(Boolean)
    const newTrip: Trip = {
      id: `VR-${String(Date.now()).slice(-6)}`,
      requestDate: dayjs().format('DD/MM/YYYY'),
      requester: passengers[0] ?? 'ผู้ขอ',
      requesterLevel: values.requesterLevel,
      start: dateFrom.format(DT_FMT),
      end: dateTo.format(DT_FMT),
      projectName: values.projectName,
      destinations,
      purpose: values.purpose,
      passengers,
      needDriver: values.needDriver,
      status: 'pending',
      documentFiles: (values.documentFiles ?? []).map((f: any) => ({ name: f.name, size: f.size })),
    }
    setTrips(prev => [newTrip, ...prev])
    message.success('ส่งคำขอใช้รถเรียบร้อยแล้ว — รอหัวหน้ายานยนต์จ่ายรถ')
    form.resetFields()
    form.setFieldsValue({ needDriver: true, passengers: [{ name: '' }], destinations: [{ place: '' }] })
  }

  // ============================================================================
  // Dispatch actions (หัวหน้ายานยนต์)
  // ============================================================================
  const assignTrip = (tripId: string, vehicleId: string, driverId: string | undefined, needDriver: boolean) => {
    const trip = trips.find(t => t.id === tripId)
    if (!trip) return
    const s = parse(trip.start), e = parse(trip.end)
    if (!vehicleFreeForRange(vehicleId, s, e, tripId)) {
      message.error('รถคันนี้มีคิวทับช่วงเวลานี้แล้ว กรุณาเลือกคันอื่น'); return
    }
    if (needDriver && driverId && !driverFreeForRange(driverId, s, e, tripId)) {
      message.error('คนขับคนนี้มีคิวทับช่วงเวลานี้แล้ว'); return
    }
    setTrips(prev => prev.map(t => t.id === tripId
      ? { ...t, status: 'assigned', vehicleId, driverId: needDriver ? driverId : undefined }
      : t))
    message.success('จ่ายรถเรียบร้อยแล้ว')
  }
  const rejectTrip = (tripId: string, remark: string) => {
    setTrips(prev => prev.map(t => t.id === tripId ? { ...t, status: 'rejected', remark } : t))
    message.warning('บันทึกการไม่อนุมัติแล้ว')
  }

  const vehicleLabel = (id?: string) => {
    const v = FLEET.find(x => x.id === id)
    return v ? `${v.type} ${v.plate}` : '—'
  }
  const driverLabel = (id?: string) => DRIVERS.find(x => x.id === id)?.name ?? '—'

  const openPrint = (t: Trip) => {
    setPrintRequest({
      id: t.id,
      requestDate: t.requestDate,
      dateFrom: parse(t.start).format('DD/MM/YYYY HH:mm'),
      dateTo: parse(t.end).format('DD/MM/YYYY HH:mm'),
      projectName: t.projectName,
      destination: t.destinations.join(', '),
      purpose: t.purpose,
      passengerCount: t.passengers.length,
      passengerNames: t.passengers,
      needDriver: t.needDriver,
      vehicle: vehicleLabel(t.vehicleId),
      driver: t.needDriver ? driverLabel(t.driverId) : undefined,
      documentFiles: t.documentFiles,
    })
  }

  // ============================================================================
  // Counts
  // ============================================================================
  const pendingCount  = trips.filter(t => t.status === 'pending').length
  const assignedCount = trips.filter(t => t.status === 'assigned').length
  const rejectedCount = trips.filter(t => t.status === 'rejected').length

  // ============================================================================
  // Calendar cell render (จำนวนงานที่จ่ายรถแล้วในวันนั้น)
  // ============================================================================
  const dateCellRender = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD')
    const dayTrips = assignedTrips.filter(t => parse(t.start).format('YYYY-MM-DD') === dateStr)
    if (dayTrips.length === 0) return null
    const content = (
      <div className="space-y-2" style={{ minWidth: 240 }}>
        {dayTrips.map(t => (
          <div key={t.id} className="border-b border-slate-600 pb-2 last:border-0 last:pb-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Tag color={FLEET.find(v => v.id === t.vehicleId)?.typeColor} className="m-0 text-xs">{vehicleLabel(t.vehicleId)}</Tag>
            </div>
            <div className="text-xs text-slate-400 space-y-0.5">
              <div>⏰ {parse(t.start).format('HH:mm')}–{parse(t.end).format('HH:mm')}</div>
              <div>📍 {t.destinations.join(', ')}</div>
              {t.needDriver && <div>🧑‍✈️ {driverLabel(t.driverId)}</div>}
            </div>
          </div>
        ))}
      </div>
    )
    return (
      <Popover content={content} title={<span className="text-sm">งานรับรถ {value.format('DD/MM/YYYY')}</span>} trigger="hover" placement="right">
        <div className="text-center cursor-pointer"><Badge status="processing" count={dayTrips.length} size="small" /></div>
      </Popover>
    )
  }
  const cellRender = (current: Dayjs, info: any) => info.type === 'date' ? dateCellRender(current) : info.originNode

  // ============================================================================
  // Status table columns
  // ============================================================================
  const columns = [
    { title: 'เลขที่', dataIndex: 'id', key: 'id', width: 110, render: (id: string) => <Text strong className="font-mono text-xs">{id}</Text> },
    { title: 'ช่วงเวลาใช้รถ', key: 'range', width: 190, render: (_: any, t: Trip) => <Text className="text-xs">{fmtRange(t.start, t.end)}</Text> },
    {
      title: 'โครงการ / ปลายทาง', key: 'project', render: (_: any, t: Trip) => (
        <div className="text-xs">
          <div className="font-medium">{t.projectName}</div>
          <div className="text-slate-400"><EnvironmentOutlined /> {t.destinations.join(' → ')}</div>
        </div>
      ),
    },
    { title: 'สถานะ', dataIndex: 'status', key: 'status', width: 120, render: (s: TripStatus) => <Tag icon={statusConfig[s].icon} color={statusConfig[s].color}>{statusConfig[s].label}</Tag> },
    {
      title: 'รถ / คนขับ', key: 'vehicle', width: 170, render: (_: any, t: Trip) => t.status === 'assigned'
        ? <div className="text-xs"><div className="font-medium">{vehicleLabel(t.vehicleId)}</div><div className="text-slate-400">{t.needDriver ? driverLabel(t.driverId) : 'ขับเอง'}</div></div>
        : <Text type="secondary" className="text-xs">—</Text>,
    },
    {
      title: '', key: 'print', width: 90, render: (_: any, t: Trip) => t.status === 'assigned'
        ? <Button size="small" icon={<PrinterOutlined />} onClick={() => openPrint(t)}>พิมพ์</Button> : null,
    },
  ]

  // ============================================================================
  // Tabs
  // ============================================================================
  const tabItems: any[] = [
    // ---- 1) ขอใช้รถ + availability ----
    {
      key: 'form',
      label: <span><CarOutlined /> ขอใช้รถ</span>,
      children: (
        <Row gutter={24}>
          <Col xs={24} lg={14}>
            <Card variant="borderless" className="shadow-sm mb-6">
              <Title level={4} className="mb-6 flex items-center gap-2"><CarOutlined style={{ color: '#006a5a' }} /> รายละเอียดการขอใช้รถ</Title>
              <Form form={form} layout="vertical" onFinish={onFinish}
                initialValues={{ needDriver: true, passengers: [{ name: '' }], destinations: [{ place: '' }] }}>
                <Form.Item name="projectName" label={<span><ProjectOutlined className="mr-1" />ชื่อโครงการ / งาน</span>} rules={[{ required: true, message: 'กรุณาระบุชื่อโครงการ' }]}>
                  <Input placeholder="เช่น ประชุมเขตสุขภาพ, งานพัสดุรับมอบวัสดุ" />
                </Form.Item>

                <Form.Item name="documentFiles" label={<span><FileProtectOutlined className="mr-1" />เอกสารที่ได้รับ / แนบไฟล์</span>}
                  valuePropName="fileList" getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)} extra="รองรับ PDF, Word, รูปภาพ — แนบได้หลายไฟล์">
                  <Upload multiple beforeUpload={() => false} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" listType="text">
                    <Button icon={<UploadOutlined />}>เลือกไฟล์แนบ</Button>
                  </Upload>
                </Form.Item>

                <Divider className="my-4" />

                <Form.Item name="dateRange" label="วันที่และเวลา (ไป – กลับ)" rules={[{ required: true, message: 'กรุณาเลือกวันเวลา' }]}>
                  <RangePicker showTime={{ format: 'HH:mm', minuteStep: 15 }} format="DD/MM/YYYY HH:mm" className="w-full" />
                </Form.Item>

                {/* ปลายทางหลายจุด */}
                <Form.Item label={<span><EnvironmentOutlined className="mr-1" />ปลายทาง / จุดที่จะไป (ระบุได้หลายจุด)</span>}>
                  <Form.List name="destinations" rules={[{ validator: async (_, items) => {
                    const filled = (items ?? []).filter((x: { place: string }) => x?.place?.trim())
                    if (filled.length < 1) return Promise.reject('กรุณาระบุปลายทางอย่างน้อย 1 จุด')
                  } }]}>
                    {(fields, { add, remove }, { errors }) => (
                      <div className="space-y-2">
                        {fields.map(({ key, ...field }, index) => (
                          <div key={key} className="flex gap-2 items-center">
                            <span className="text-slate-400 text-sm w-6 shrink-0 text-right">{index + 1}.</span>
                            <Form.Item {...field} name={[field.name, 'place']} validateTrigger={['onChange', 'onBlur']}
                              rules={[{ required: true, whitespace: true, message: 'กรุณาระบุปลายทาง' }]} className="mb-0 grow">
                              <Input placeholder={`ปลายทางจุดที่ ${index + 1} เช่น สสจ., ศาลากลางจังหวัด`} />
                            </Form.Item>
                            {fields.length > 1 && <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(field.name)} className="shrink-0" />}
                          </div>
                        ))}
                        <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} className="w-full mt-1">เพิ่มปลายทาง</Button>
                        <Form.ErrorList errors={errors} />
                      </div>
                    )}
                  </Form.List>
                </Form.Item>

                <Form.Item name="purpose" label="วัตถุประสงค์การเดินทาง" rules={[{ required: true, message: 'กรุณาระบุวัตถุประสงค์' }]}>
                  <TextArea rows={2} placeholder="เช่น ประชุมสัมมนา, ส่งเอกสารราชการ, รับมอบสิ่งของ" />
                </Form.Item>

                <Divider className="my-4" />

                <Form.Item name="requesterLevel" label={<span><UserOutlined className="mr-1" />ระดับผู้ขอ</span>} rules={[{ required: true, message: 'กรุณาระบุระดับผู้ขอ' }]}
                  extra={requesterLevel === 'senior' ? <span className="text-green-400 text-xs">ชำนาญการพิเศษขึ้นไป — ขอได้ตั้งแต่ 1 คน</span>
                    : requesterLevel === 'junior' ? <span className="text-yellow-400 text-xs">ต่ำกว่าชำนาญการพิเศษ — ต้องมีผู้ร่วมเดินทางอย่างน้อย 3 คน</span> : null}>
                  <Radio.Group>
                    <div className="flex flex-col gap-1">
                      <Radio value="senior">ชำนาญการพิเศษขึ้นไป</Radio>
                      <Radio value="junior">ต่ำกว่าชำนาญการพิเศษ</Radio>
                    </div>
                  </Radio.Group>
                </Form.Item>

                <Form.Item label={<span><TeamOutlined className="mr-1" />ผู้ที่จะไปด้วย</span>}>
                  <Form.List name="passengers" rules={[{ validator: async (_, items) => {
                    const filled = (items ?? []).filter((p: { name: string }) => p?.name?.trim())
                    if (filled.length < minPassengers) return Promise.reject(minPassengers === 3
                      ? 'ระดับต่ำกว่าชำนาญการพิเศษ ต้องมีผู้ร่วมเดินทางอย่างน้อย 3 คน' : 'กรุณาระบุผู้ร่วมเดินทางอย่างน้อย 1 คน')
                  } }]}>
                    {(fields, { add, remove }, { errors }) => (
                      <div className="space-y-2">
                        {fields.map(({ key, ...field }, index) => (
                          <div key={key} className="flex gap-2 items-center">
                            <span className="text-slate-400 text-sm w-6 shrink-0 text-right">{index + 1}.</span>
                            <Form.Item {...field} name={[field.name, 'name']} validateTrigger={['onChange', 'onBlur']}
                              rules={[{ required: true, whitespace: true, message: 'กรุณาระบุชื่อ' }]} className="mb-0 grow">
                              <Input placeholder={`ชื่อ-นามสกุล ผู้ร่วมเดินทางคนที่ ${index + 1}`} />
                            </Form.Item>
                            {fields.length > 1 && <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(field.name)} className="shrink-0" />}
                          </div>
                        ))}
                        <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} className="w-full mt-1">เพิ่มผู้ร่วมเดินทาง</Button>
                        <Form.ErrorList errors={errors} />
                      </div>
                    )}
                  </Form.List>
                </Form.Item>

                <Form.Item name="needDriver" label="ต้องการพนักงานขับรถหรือไม่" rules={[{ required: true, message: 'กรุณาระบุความต้องการ' }]}>
                  <Radio.Group>
                    <Space>
                      <Radio value={true}>ต้องการพนักงานขับรถ</Radio>
                      <Radio value={false}>ไม่ต้องการ (เจ้าหน้าที่ขับเอง)</Radio>
                    </Space>
                  </Radio.Group>
                </Form.Item>

                <Divider />
                <div className="flex justify-end gap-3">
                  <Button onClick={() => { form.resetFields(); form.setFieldsValue({ needDriver: true, passengers: [{ name: '' }], destinations: [{ place: '' }] }) }}>ล้างข้อมูล</Button>
                  <Button type="primary" htmlType="submit" size="large" className="px-8 shadow-md" icon={<SendOutlined />}>ส่งคำขอใช้รถ</Button>
                </div>
              </Form>
            </Card>
          </Col>

          {/* Availability panel ตามช่วงเวลาที่เลือก */}
          <Col xs={24} lg={10}>
            <Card variant="borderless" className="shadow-sm mb-6">
              <Title level={4} className="mb-3 flex items-center gap-2"><ThunderboltOutlined style={{ color: '#006a5a' }} /> รถว่างตามช่วงเวลาที่เลือก</Title>
              {!formAvailability ? (
                <Alert type="info" showIcon title="เลือกช่วงเวลา (ไป–กลับ) ด้านซ้าย เพื่อตรวจสอบว่ารถคันไหนว่าง" />
              ) : (
                <>
                  <Text type="secondary" className="text-xs block mb-3">ช่วงเวลา: {watchedRange?.[0]?.format('DD/MM HH:mm')} – {watchedRange?.[1]?.format('DD/MM HH:mm')}</Text>
                  <div className="flex flex-col gap-2">
                    {formAvailability.map(({ vehicle, free, conflicts }) => (
                      <div key={vehicle.id} className={`flex gap-3 p-3 rounded-md border ${free ? 'bg-green-950/30 border-green-700/50' : 'bg-red-950/20 border-red-800/40'}`}>
                        <CarOutlined className={`text-xl shrink-0 pt-0.5 ${free ? 'text-green-500' : 'text-red-400'}`} />
                        <div className="grow min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Tag color={vehicle.typeColor} className="m-0 text-xs">{vehicle.type}</Tag>
                            <span className="font-bold tracking-wide">{vehicle.plate}</span>
                            <span className="text-xs text-slate-500">{vehicle.seats} ที่นั่ง</span>
                            <span className="ml-auto">{free ? <Tag color="success" className="m-0">ว่าง</Tag> : <Tag color="error" className="m-0">ไม่ว่าง</Tag>}</span>
                          </div>
                          {!free && (
                            <div className="text-xs text-red-300 space-y-0.5">
                              {conflicts.map((c, i) => <div key={i}><InfoCircleOutlined className="mr-1" />ติดคิว {c}</div>)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {formAvailability.every(a => !a.free) && (
                      <Alert type="warning" showIcon className="mt-1" title="ช่วงเวลานี้รถเต็มทุกคัน — ลองปรับเวลา หรือแบ่งเป็นคนละช่วง" />
                    )}
                  </div>
                </>
              )}
            </Card>
          </Col>
        </Row>
      ),
    },

    // ---- 2) สถานะคำขอ ----
    {
      key: 'status',
      label: <span><UnorderedListOutlined /> สถานะคำขอ{pendingCount > 0 && <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-yellow-500 text-white">{pendingCount}</span>}</span>,
      children: (
        <div className="space-y-4">
          <Row gutter={[16, 16]}>
            <Col xs={8}><Card variant="borderless" className="text-center shadow-sm" style={{ borderBottom: '3px solid #f59e0b' }}><Statistic title="รอจ่ายรถ" value={pendingCount} styles={{ content: { color: '#f59e0b' } }} prefix={<ClockCircleOutlined />} /></Card></Col>
            <Col xs={8}><Card variant="borderless" className="text-center shadow-sm" style={{ borderBottom: '3px solid #10b981' }}><Statistic title="จ่ายรถแล้ว" value={assignedCount} styles={{ content: { color: '#10b981' } }} prefix={<CheckCircleOutlined />} /></Card></Col>
            <Col xs={8}><Card variant="borderless" className="text-center shadow-sm" style={{ borderBottom: '3px solid #ef4444' }}><Statistic title="ไม่อนุมัติ" value={rejectedCount} styles={{ content: { color: '#ef4444' } }} prefix={<CloseCircleOutlined />} /></Card></Col>
          </Row>
          <Card variant="borderless" className="shadow-sm">
            <Title level={5} style={{ color: '#006a5a', marginBottom: 16 }}>ประวัติคำขอใช้รถทั้งหมด</Title>
            <Table columns={columns} dataSource={trips} rowKey="id" pagination={{ pageSize: 10, showTotal: t => `ทั้งหมด ${t} รายการ` }} scroll={{ x: 'max-content' }} size="middle"
              expandable={{ expandedRowRender: (t: Trip) => (
                <div className="p-3 space-y-2 text-sm">
                  {t.documentFiles && t.documentFiles.length > 0 && (
                    <div><Text strong><FileProtectOutlined className="mr-1" />เอกสารแนบ ({t.documentFiles.length}): </Text>
                      <Space wrap size={4} className="mt-1">{t.documentFiles.map((f, i) => <Tag key={i} icon={<PaperClipOutlined />} color="blue">{f.name}</Tag>)}</Space></div>
                  )}
                  <div><Text strong>ปลายทาง: </Text><Text>{t.destinations.join(' → ')}</Text></div>
                  <div><Text strong>วัตถุประสงค์: </Text><Text>{t.purpose}</Text></div>
                  <div><Text strong>ผู้ร่วมเดินทาง ({t.passengers.length} คน): </Text><Space wrap size={4} className="mt-1">{t.passengers.map((n, i) => <Tag key={i} icon={<UserOutlined />}>{n}</Tag>)}</Space></div>
                  <div><Text strong>ต้องการคนขับ: </Text><Text>{t.needDriver ? 'ใช่' : 'ไม่ (ขับเอง)'}</Text></div>
                  {t.remark && <div><Text strong>หมายเหตุ: </Text><Text type="danger">{t.remark}</Text></div>}
                </div>
              ) }}
              locale={{ emptyText: 'ยังไม่มีคำขอใช้รถ' }} />
          </Card>
        </div>
      ),
    },

    // ---- 3) จัดการจ่ายรถ (หัวหน้ายานยนต์) ----
    {
      key: 'dispatch',
      label: <span><IdcardOutlined /> จัดการจ่ายรถ</span>,
      children: canDispatch
        ? <DispatchPanel trips={trips} pendingCount={pendingCount} fleet={FLEET} drivers={DRIVERS}
            vehicleFreeForRange={vehicleFreeForRange} driverFreeForRange={driverFreeForRange}
            vehicleFreeWindows={vehicleFreeWindows} assignTrip={assignTrip} rejectTrip={rejectTrip}
            vehicleLabel={vehicleLabel} driverLabel={driverLabel} />
        : <Result status="403" title="เฉพาะหัวหน้ายานยนต์" subTitle="เมนูจัดการจ่ายรถสงวนสิทธิ์ให้ผู้มีบทบาทหัวหน้ายานยนต์ (VEHICLE_HEAD) หรือผู้ดูแลระบบเท่านั้น" />,
    },

    // ---- 4) ปฏิทินรับงานในวัน ----
    {
      key: 'calendar',
      label: <span><CalendarOutlined /> ปฏิทินรับงาน</span>,
      children: (
        <Row gutter={24}>
          <Col xs={24} lg={14}>
            <Card variant="borderless" className="shadow-sm mb-6">
              <Title level={4} className="mb-4 flex items-center gap-2"><CalendarOutlined style={{ color: '#006a5a' }} /> ปฏิทินการรับงานรถ</Title>
              <Calendar fullscreen={false} onSelect={(dt) => setSelectedDate(dt)} cellRender={cellRender} />
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card variant="borderless" className="shadow-sm mb-6">
              <Title level={5} className="mb-3">งานรับรถวันที่ {selectedDate.format('DD/MM/YYYY')}</Title>
              {(() => {
                const dateStr = selectedDate.format('YYYY-MM-DD')
                const dayTrips = assignedTrips.filter(t => parse(t.start).format('YYYY-MM-DD') === dateStr)
                  .sort((a, b) => parse(a.start).valueOf() - parse(b.start).valueOf())
                if (dayTrips.length === 0) return <Empty description="ไม่มีงานรับรถในวันนี้" />
                return (
                  <div className="flex flex-col gap-2">
                    {dayTrips.map(t => {
                      const v = FLEET.find(x => x.id === t.vehicleId)
                      return (
                        <div key={t.id} className="p-3 rounded-md border bg-slate-800 border-slate-700">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Tag color={v?.typeColor} className="m-0 text-xs">{v?.type}</Tag>
                            <span className="font-bold tracking-wide">{v?.plate}</span>
                            <span className="ml-auto text-xs text-slate-400">{parse(t.start).format('HH:mm')}–{parse(t.end).format('HH:mm')}</span>
                          </div>
                          <div className="text-xs text-slate-400 space-y-0.5">
                            <div><EnvironmentOutlined className="mr-1" />{t.destinations.join(' → ')}</div>
                            <div><UserOutlined className="mr-1" />{t.needDriver ? driverLabel(t.driverId) : 'ขับเอง'} · {t.projectName}</div>
                          </div>
                        </div>
                      )
                    })}
                    {/* สรุปช่วงว่างของรถแต่ละคันในวันนี้ */}
                    <Divider className="my-2" />
                    <Text strong className="text-xs">ช่วงเวลาว่างของรถแต่ละคัน ({DAY_START}–{DAY_END})</Text>
                    {FLEET.map(v => {
                      const wins = vehicleFreeWindows(v.id, dateStr)
                      return (
                        <div key={v.id} className="text-xs flex gap-2 items-start">
                          <Tag color={v.typeColor} className="m-0 shrink-0">{v.plate}</Tag>
                          <span className="text-slate-400">{wins.length ? wins.join(', ') : <span className="text-red-400">เต็มทั้งวัน</span>}</span>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </Card>
          </Col>
        </Row>
      ),
    },
  ]

  if (!mounted) return <div className="min-h-screen bg-slate-900 text-slate-200"><Navbar /></div>

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb items={[
          { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
          { href: '/general', title: <><FileTextOutlined /> ระบบบริหารงานทั่วไป</> },
          { title: 'ขอใช้รถไปราชการ' },
        ]} className="mb-6" />

        <div className="w-full">
          <div className="mb-6">
            <Title level={2} className="m-0" style={{ color: '#006a5a' }}>แบบฟอร์มขอใช้รถไปราชการ</Title>
            <Text type="secondary">กรอกรายละเอียด ตรวจสอบรถว่างตามช่วงเวลา และให้หัวหน้ายานยนต์จัดการจ่ายรถ</Text>
          </div>
          <Tabs items={tabItems} size="large" />
        </div>
      </div>

      <Modal open={!!printRequest} onCancel={() => setPrintRequest(null)} footer={null} width="80vw"
        title={<span><PrinterOutlined className="mr-2" />ตัวอย่างใบอนุมัติการใช้รถราชการ — {printRequest?.id}</span>}
        style={{ top: '5vh' }} styles={{ body: { padding: '12px 0 0', height: 'calc(80vh - 57px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}>
        {printRequest && <VehicleRequestPDFDownload req={printRequest} />}
      </Modal>
    </div>
  )
}

// ============================================================================
// Dispatch Panel (หัวหน้ายานยนต์)
// ============================================================================
interface DispatchProps {
  trips: Trip[]
  pendingCount: number
  fleet: Vehicle[]
  drivers: Driver[]
  vehicleFreeForRange: (id: string, s: Dayjs, e: Dayjs, ex?: string) => boolean
  driverFreeForRange: (id: string, s: Dayjs, e: Dayjs, ex?: string) => boolean
  vehicleFreeWindows: (id: string, dateStr: string) => string[]
  assignTrip: (tripId: string, vehicleId: string, driverId: string | undefined, needDriver: boolean) => void
  rejectTrip: (tripId: string, remark: string) => void
  vehicleLabel: (id?: string) => string
  driverLabel: (id?: string) => string
}
const DispatchPanel = (p: DispatchProps) => {
  const pending = p.trips.filter(t => t.status === 'pending')
  const [sel, setSel] = useState<Record<string, { vehicleId?: string; driverId?: string }>>({})
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectText, setRejectText] = useState('')

  const setSelFor = (id: string, patch: Partial<{ vehicleId: string; driverId: string }>) =>
    setSel(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))

  return (
    <div className="space-y-4">
      <Alert type="info" showIcon title="โหมดหัวหน้ายานยนต์"
        description="เลือกรถที่ว่างตรงช่วงเวลาของคำขอ (ระบบซ่อนคันที่ติดคิว) และคนขับที่ว่าง แล้วกดจ่ายรถ" />

      {pending.length === 0 ? (
        <Card variant="borderless" className="shadow-sm"><Empty description="ไม่มีคำขอที่รอจ่ายรถ" /></Card>
      ) : pending.map(t => {
        const s = parse(t.start), e = parse(t.end)
        const dateStr = s.format('YYYY-MM-DD')
        const freeVehicles = p.fleet.filter(v => p.vehicleFreeForRange(v.id, s, e, t.id))
        const freeDrivers = p.drivers.filter(dr => p.driverFreeForRange(dr.id, s, e, t.id))
        const cur = sel[t.id] ?? {}
        return (
          <Card key={t.id} variant="borderless" className="shadow-sm">
            <Row gutter={16}>
              <Col xs={24} md={13}>
                <div className="flex items-center gap-2 mb-2">
                  <Text strong className="font-mono">{t.id}</Text>
                  <Tag color="warning" icon={<ClockCircleOutlined />}>รอจ่ายรถ</Tag>
                  {t.requesterLevel === 'junior' && <Tag color="gold">ต่ำกว่า ชนก.พิเศษ</Tag>}
                </div>
                <div className="text-sm space-y-1">
                  <div><ClockCircleOutlined className="mr-1 text-slate-400" />{fmtRange(t.start, t.end)}</div>
                  <div><EnvironmentOutlined className="mr-1 text-slate-400" />{t.destinations.join(' → ')}</div>
                  <div><ProjectOutlined className="mr-1 text-slate-400" />{t.projectName}</div>
                  <div><TeamOutlined className="mr-1 text-slate-400" />{t.passengers.length} คน · {t.needDriver ? 'ต้องการคนขับ' : 'ขับเอง'}</div>
                  <div className="text-xs text-slate-400">{t.purpose}</div>
                </div>
              </Col>
              <Col xs={24} md={11}>
                <div className="space-y-2">
                  <div>
                    <Text className="text-xs text-slate-400 block mb-1">เลือกรถ (ว่าง {freeVehicles.length}/{p.fleet.length} คัน)</Text>
                    <Select className="w-full" placeholder={freeVehicles.length ? 'เลือกรถที่ว่าง' : 'ไม่มีรถว่างช่วงนี้'}
                      value={cur.vehicleId} onChange={v => setSelFor(t.id, { vehicleId: v })} disabled={!freeVehicles.length}
                      options={freeVehicles.map(v => ({ value: v.id, label: `${v.type} ${v.plate} · ${v.seats} ที่นั่ง` }))} />
                  </div>
                  {t.needDriver && (
                    <div>
                      <Text className="text-xs text-slate-400 block mb-1">เลือกคนขับ (ว่าง {freeDrivers.length}/{p.drivers.length} คน)</Text>
                      <Select className="w-full" placeholder={freeDrivers.length ? 'เลือกคนขับที่ว่าง' : 'ไม่มีคนขับว่าง'}
                        value={cur.driverId} onChange={v => setSelFor(t.id, { driverId: v })} disabled={!freeDrivers.length}
                        options={freeDrivers.map(dr => ({ value: dr.id, label: `${dr.name} · ${dr.phone}` }))} />
                    </div>
                  )}
                  <div className="flex gap-2 justify-end pt-1">
                    <Button danger onClick={() => { setRejectId(t.id); setRejectText('') }}>ไม่อนุมัติ</Button>
                    <Button type="primary" icon={<SendOutlined />}
                      disabled={!cur.vehicleId || (t.needDriver && !cur.driverId)}
                      onClick={() => p.assignTrip(t.id, cur.vehicleId!, cur.driverId, t.needDriver)}>จ่ายรถ</Button>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    ช่วงว่างของรถวันนี้: {p.fleet.map(v => `${v.plate}: ${(p.vehicleFreeWindows(v.id, dateStr).join(', ') || 'เต็ม')}`).join(' | ')}
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        )
      })}

      <Modal open={!!rejectId} title="ไม่อนุมัติคำขอ" onCancel={() => setRejectId(null)}
        onOk={() => { if (rejectId) { p.rejectTrip(rejectId, rejectText || 'ไม่ระบุเหตุผล'); setRejectId(null) } }}
        okText="ยืนยันไม่อนุมัติ" okButtonProps={{ danger: true }} cancelText="ยกเลิก">
        <Text type="secondary" className="text-xs">ระบุเหตุผล (เช่น ช่วงเวลานี้รถเต็มทุกคัน)</Text>
        <TextArea rows={3} value={rejectText} onChange={e => setRejectText(e.target.value)} className="mt-2" placeholder="เหตุผลการไม่อนุมัติ" />
      </Modal>
    </div>
  )
}

const VehicleRequestPage = () => (
  <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#006a5a', borderRadius: 8, fontFamily: 'var(--font-sarabun)' } }}>
    <App>
      <VehicleRequestPageContent />
    </App>
  </ConfigProvider>
)

export default VehicleRequestPage
