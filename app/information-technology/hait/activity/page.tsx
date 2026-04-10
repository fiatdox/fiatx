'use client'
import React, { useState } from 'react'
import {
  Table, Input, Button, Space, ConfigProvider, Card, Tag, Drawer, Form,
  Select, Breadcrumb, message, Tooltip, Row, Col, Statistic, DatePicker,
  Typography, InputNumber, Tabs, Progress, Alert, Divider, theme
} from 'antd'
import {
  EditOutlined, DeleteOutlined, SearchOutlined, PlusOutlined, HomeOutlined,
  DesktopOutlined, UserOutlined, BarChartOutlined, CalendarOutlined,
  WarningOutlined, BulbOutlined, RiseOutlined, FallOutlined, FireOutlined
} from '@ant-design/icons'
import Navbar from '../../../components/Navbar'
import Swal from 'sweetalert2'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TextArea } = Input

interface ActivityLog {
  id: number
  logDate: string
  staffName: string
  activityType: string
  detail: string
  system: string
  hours: number
  outcome: string
}

const initialLogs: ActivityLog[] = [
  { id: 1, logDate: '01/04/2026', staffName: 'นายสมชาย ใจดี', activityType: 'ซ่อมบำรุง', detail: 'ซ่อมเครื่องคอมพิวเตอร์ห้องพยาบาลชั้น 2 จำนวน 2 เครื่อง', system: 'คอมพิวเตอร์', hours: 3, outcome: 'แก้ไขสำเร็จ ทั้ง 2 เครื่อง' },
  { id: 2, logDate: '02/04/2026', staffName: 'นางสาวสุดา รักงาน', activityType: 'ดูแลระบบ', detail: 'ตรวจสอบ backup รายวัน และ patch ระบบปฏิบัติการ server', system: 'เซิร์ฟเวอร์', hours: 2, outcome: 'Backup สมบูรณ์ Patch สำเร็จ 3/3 server' },
  { id: 3, logDate: '02/04/2026', staffName: 'นายวีระ มุ่งมั่น', activityType: 'ฝึกอบรม', detail: 'ฝึกอบรมการใช้งานระบบ HIS แผนกใหม่ให้กับเจ้าหน้าที่ 5 คน', system: 'ระบบ HIS', hours: 4, outcome: 'เจ้าหน้าที่ผ่านการทดสอบครบ 5 คน' },
  { id: 4, logDate: '03/04/2026', staffName: 'นายสมชาย ใจดี', activityType: 'ติดตั้งระบบ', detail: 'ติดตั้งและตั้งค่า Switch ใหม่อาคาร IPD ชั้น 3', system: 'เครือข่าย', hours: 5, outcome: 'ติดตั้งสำเร็จ เครือข่ายใช้งานได้ปกติ' },
  { id: 5, logDate: '04/04/2026', staffName: 'นายสมชาย ใจดี', activityType: 'ซ่อมบำรุง', detail: 'เครื่องพิมพ์ห้องการเงินพิมพ์ไม่ออก ทำความสะอาดหัวพิมพ์', system: 'เครื่องพิมพ์', hours: 1.5, outcome: 'พิมพ์ได้ปกติ' },
  { id: 6, logDate: '04/04/2026', staffName: 'นางสาวสุดา รักงาน', activityType: 'ดูแลระบบ', detail: 'Monitor performance HIS server ช่วง peak hour', system: 'ระบบ HIS', hours: 2, outcome: 'ไม่พบความผิดปกติ' },
  { id: 7, logDate: '05/04/2026', staffName: 'นายสมชาย ใจดี', activityType: 'ซ่อมบำรุง', detail: 'เครื่องพิมพ์ OPD กระดาษติด ซ่อมและเปลี่ยน roller', system: 'เครื่องพิมพ์', hours: 2, outcome: 'เปลี่ยน roller สำเร็จ' },
  { id: 8, logDate: '06/04/2026', staffName: 'นายวีระ มุ่งมั่น', activityType: 'พัฒนาระบบ', detail: 'พัฒนา dashboard รายงานสถิติผู้ป่วยสำหรับฝ่ายบริหาร', system: 'ระบบ HIS', hours: 6, outcome: 'Dashboard v1 เสร็จ รอ UAT' },
  { id: 9, logDate: '07/04/2026', staffName: 'นางสาวสุดา รักงาน', activityType: 'ประสานงาน', detail: 'ประสานงานกับบริษัท HIS เรื่องการ upgrade version', system: 'ระบบ HIS', hours: 1.5, outcome: 'นัดประชุม 20/04/2026' },
  { id: 10, logDate: '07/04/2026', staffName: 'นายสมชาย ใจดี', activityType: 'ซ่อมบำรุง', detail: 'คอมพิวเตอร์ห้องตรวจ 5 เปิดไม่ติด ตรวจสอบพบ power supply เสีย', system: 'คอมพิวเตอร์', hours: 2, outcome: 'สั่งอะไหล่ รอเปลี่ยน' },
  { id: 11, logDate: '08/04/2026', staffName: 'นายวีระ มุ่งมั่น', activityType: 'ประชุม', detail: 'ประชุมคณะกรรมการ IT เรื่องแผนงาน IT ปี 2570', system: 'อื่นๆ', hours: 3, outcome: 'ได้แผนงานเบื้องต้น' },
  { id: 12, logDate: '09/04/2026', staffName: 'นางสาวสุดา รักงาน', activityType: 'ดูแลระบบ', detail: 'ตรวจสอบ log ความปลอดภัยและ failed login attempts รายสัปดาห์', system: 'เซิร์ฟเวอร์', hours: 2, outcome: 'พบ 3 IP น่าสงสัย block แล้ว' },
]

const staffList = [
  { label: 'นายสมชาย ใจดี', value: 'นายสมชาย ใจดี' },
  { label: 'นางสาวสุดา รักงาน', value: 'นางสาวสุดา รักงาน' },
  { label: 'นายวีระ มุ่งมั่น', value: 'นายวีระ มุ่งมั่น' },
]

const activityTypeOptions = [
  { label: 'ซ่อมบำรุง', value: 'ซ่อมบำรุง' },
  { label: 'ดูแลระบบ', value: 'ดูแลระบบ' },
  { label: 'ติดตั้งระบบ', value: 'ติดตั้งระบบ' },
  { label: 'ฝึกอบรม', value: 'ฝึกอบรม' },
  { label: 'พัฒนาระบบ', value: 'พัฒนาระบบ' },
  { label: 'ประสานงาน', value: 'ประสานงาน' },
  { label: 'ประชุม', value: 'ประชุม' },
  { label: 'อื่นๆ', value: 'อื่นๆ' },
]

const systemOptions = [
  { label: 'ระบบ HIS', value: 'ระบบ HIS' },
  { label: 'เครือข่าย', value: 'เครือข่าย' },
  { label: 'เซิร์ฟเวอร์', value: 'เซิร์ฟเวอร์' },
  { label: 'คอมพิวเตอร์', value: 'คอมพิวเตอร์' },
  { label: 'เครื่องพิมพ์', value: 'เครื่องพิมพ์' },
  { label: 'ระบบสำรองข้อมูล', value: 'ระบบสำรองข้อมูล' },
  { label: 'อื่นๆ', value: 'อื่นๆ' },
]

const activityColors: Record<string, string> = {
  'ซ่อมบำรุง': 'orange',
  'ดูแลระบบ': 'blue',
  'ติดตั้งระบบ': 'green',
  'ฝึกอบรม': 'purple',
  'พัฒนาระบบ': 'cyan',
  'ประสานงาน': 'gold',
  'ประชุม': 'geekblue',
  'อื่นๆ': 'default',
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>(initialLogs)
  const [searchText, setSearchText] = useState('')
  const [filterStaff, setFilterStaff] = useState<string>('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<ActivityLog | null>(null)
  const [form] = Form.useForm()
  const [messageApi, contextHolder] = message.useMessage()

  const filtered = logs.filter(l => {
    const matchSearch =
      l.detail.toLowerCase().includes(searchText.toLowerCase()) ||
      l.staffName.includes(searchText) ||
      l.activityType.includes(searchText)
    const matchStaff = filterStaff ? l.staffName === filterStaff : true
    return matchSearch && matchStaff
  })

  const totalHours = logs.reduce((sum, l) => sum + l.hours, 0)
  const uniqueStaff = [...new Set(logs.map(l => l.staffName))].length

  // --- วิเคราะห์ชั่วโมงตามประเภทกิจกรรม ---
  const byActivityType = activityTypeOptions
    .map(opt => {
      const matching = logs.filter(l => l.activityType === opt.value)
      const hours = matching.reduce((s, l) => s + l.hours, 0)
      return { type: opt.value, count: matching.length, hours }
    })
    .filter(x => x.hours > 0)
    .sort((a, b) => b.hours - a.hours)

  // --- วิเคราะห์ชั่วโมงตามระบบ ---
  const bySystem = systemOptions
    .map(opt => {
      const matching = logs.filter(l => l.system === opt.value)
      const hours = matching.reduce((s, l) => s + l.hours, 0)
      return { system: opt.value, count: matching.length, hours }
    })
    .filter(x => x.hours > 0)
    .sort((a, b) => b.hours - a.hours)

  // --- สัดส่วนงานเชิงรับ vs งานเชิงรุก ---
  const reactiveTypes = ['ซ่อมบำรุง']
  const proactiveTypes = ['ดูแลระบบ', 'ติดตั้งระบบ', 'พัฒนาระบบ']
  const reactiveHours = logs.filter(l => reactiveTypes.includes(l.activityType)).reduce((s, l) => s + l.hours, 0)
  const proactiveHours = logs.filter(l => proactiveTypes.includes(l.activityType)).reduce((s, l) => s + l.hours, 0)
  const reactivePercent = totalHours > 0 ? Math.round((reactiveHours / totalHours) * 100) : 0

  // --- ภาระงานรายบุคคล ---
  const byStaff = staffList.map(s => {
    const staffLogs = logs.filter(l => l.staffName === s.value)
    const staffHours = staffLogs.reduce((sum, l) => sum + l.hours, 0)
    const topType = [...activityTypeOptions]
      .map(opt => ({ type: opt.value, hours: staffLogs.filter(l => l.activityType === opt.value).reduce((sum, l) => sum + l.hours, 0) }))
      .sort((a, b) => b.hours - a.hours)[0]
    return { name: s.value, count: staffLogs.length, hours: staffHours, topType: topType?.hours > 0 ? topType.type : '-' }
  }).filter(s => s.hours > 0).sort((a, b) => b.hours - a.hours)

  // --- Pain Point: ระบบที่ต้องซ่อมบ่อยที่สุด ---
  const maintenanceLogs = logs.filter(l => l.activityType === 'ซ่อมบำรุง')
  const painPointSystem = [...systemOptions]
    .map(opt => ({
      system: opt.value,
      hours: maintenanceLogs.filter(l => l.system === opt.value).reduce((s, l) => s + l.hours, 0),
      count: maintenanceLogs.filter(l => l.system === opt.value).length
    }))
    .filter(x => x.hours > 0)
    .sort((a, b) => b.hours - a.hours)

  // --- Auto Insights ---
  const insights: { type: 'warning' | 'info' | 'success'; message: string }[] = []
  if (reactivePercent > 50) {
    insights.push({ type: 'warning', message: `${reactivePercent}% ของชั่วโมงทั้งหมดเป็นงานซ่อมบำรุงเชิงรับ — ควรวางแผน Preventive Maintenance เพื่อลดงานฉุกเฉิน` })
  }
  if (painPointSystem[0]?.count >= 2) {
    insights.push({ type: 'warning', message: `"${painPointSystem[0].system}" เป็นระบบที่ต้องซ่อมบ่อยที่สุด (${painPointSystem[0].count} ครั้ง / ${painPointSystem[0].hours} ชม.) — ควรพิจารณาจัดหาอุปกรณ์สำรองหรืออัปเกรด` })
  }
  if (bySystem[0]?.hours / (totalHours || 1) > 0.4) {
    insights.push({ type: 'info', message: `ระบบ "${bySystem[0].system}" กินเวลาทีมมากที่สุด (${Math.round(bySystem[0].hours / totalHours * 100)}%) — ควรพิจารณาจัดสรรทรัพยากรหรือ Automation` })
  }
  if (proactiveHours > reactiveHours) {
    insights.push({ type: 'success', message: `ทีมใช้เวลากับงานเชิงรุก (${proactiveHours} ชม.) มากกว่างานซ่อมบำรุงเชิงรับ (${reactiveHours} ชม.) — ดีมาก แสดงถึงการบริหารงานเชิงป้องกัน` })
  }
  if (byStaff.length > 1 && byStaff[0].hours / byStaff[byStaff.length - 1].hours > 2) {
    insights.push({ type: 'info', message: `ภาระงานไม่สมดุล — ${byStaff[0].name} มีชั่วโมงงานสูงกว่าคนอื่นอย่างมีนัยสำคัญ ควรพิจารณาจัดสรรงานใหม่` })
  }

  const openAddDrawer = () => {
    setEditingLog(null)
    form.resetFields()
    form.setFieldsValue({ logDate: dayjs(), hours: 1 })
    setIsDrawerOpen(true)
  }

  const openEditDrawer = (log: ActivityLog) => {
    setEditingLog(log)
    form.setFieldsValue({ ...log, logDate: dayjs(log.logDate, 'DD/MM/YYYY') })
    setIsDrawerOpen(true)
  }

  const handleDelete = (log: ActivityLog) => {
    Swal.fire({
      title: 'ยืนยันการลบ?',
      text: 'ต้องการลบรายการกิจกรรมนี้ใช่หรือไม่',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
    }).then(result => {
      if (result.isConfirmed) {
        setLogs(prev => prev.filter(l => l.id !== log.id))
        messageApi.success('ลบรายการเรียบร้อยแล้ว')
      }
    })
  }

  const handleSave = (values: any) => {
    const logDate = values.logDate ? values.logDate.format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY')
    if (editingLog) {
      setLogs(prev => prev.map(l => l.id === editingLog.id ? { ...l, ...values, logDate } : l))
      messageApi.success('แก้ไขเรียบร้อยแล้ว')
    } else {
      setLogs(prev => [{ id: Date.now(), ...values, logDate }, ...prev])
      messageApi.success('บันทึกกิจกรรมเรียบร้อยแล้ว')
    }
    setIsDrawerOpen(false)
    form.resetFields()
  }

  const columns = [
    { title: 'วันที่', dataIndex: 'logDate', key: 'logDate', width: 110 },
    {
      title: 'เจ้าหน้าที่',
      dataIndex: 'staffName',
      key: 'staffName',
      render: (name: string) => (
        <Space><UserOutlined className="text-purple-600" /><Text>{name}</Text></Space>
      ),
    },
    {
      title: 'ประเภทกิจกรรม',
      dataIndex: 'activityType',
      key: 'activityType',
      render: (t: string) => <Tag color={activityColors[t] || 'default'}>{t}</Tag>,
      width: 130,
    },
    {
      title: 'รายละเอียด',
      dataIndex: 'detail',
      key: 'detail',
      render: (d: string, r: ActivityLog) => (
        <div>
          <div className="text-sm">{d}</div>
          <div className="text-xs text-gray-500">ระบบ: {r.system}</div>
        </div>
      ),
    },
    {
      title: 'ชั่วโมง',
      dataIndex: 'hours',
      key: 'hours',
      width: 80,
      render: (h: number) => <Text strong>{h} ชม.</Text>,
    },
    {
      title: 'ผลลัพธ์',
      dataIndex: 'outcome',
      key: 'outcome',
      render: (o: string) => <Text className="text-green-600 text-xs font-medium">{o}</Text>,
    },
    {
      title: 'จัดการ',
      key: 'action',
      width: 90,
      render: (_: any, record: ActivityLog) => (
        <Space>
          <Tooltip title="แก้ไข"><Button type="text" icon={<EditOutlined />} onClick={() => openEditDrawer(record)} /></Tooltip>
          <Tooltip title="ลบ"><Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} /></Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#6B21A8', borderRadius: 8 } }}>
      {contextHolder}
      <div className="min-h-screen bg-gray-50 text-gray-800">
        <Navbar />
        <div className="p-6 md:p-8">
          <Breadcrumb
            items={[
              { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
              { href: '/information-technology', title: <><DesktopOutlined /> งานคอมพิวเตอร์ฯ</> },
              { href: '/information-technology/hait', title: 'HAIT ข้อ 4' },
              { title: 'บันทึกกิจกรรม IT' },
            ]}
            className="mb-6"
          />

          <div className="max-w-6xl mx-auto">
            <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <Title level={2} style={{ color: '#6B21A8', margin: 0 }}>บันทึกกิจกรรมการทำงาน IT</Title>
                <Text type="secondary">HAIT 4.5 — เก็บข้อมูลกิจกรรมและการทำงานของเจ้าหน้าที่ฝ่าย IT ทุกคน</Text>
              </div>
              <Button type="primary" icon={<PlusOutlined />} size="large" onClick={openAddDrawer}>
                บันทึกกิจกรรมใหม่
              </Button>
            </div>

            <Row gutter={[24, 24]} className="mb-8">
              <Col xs={12} sm={6}>
                <Card variant="borderless" className="shadow-sm" style={{ borderBottom: '3px solid #a855f7' }}>
                  <Statistic title="รายการทั้งหมด" value={logs.length} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card variant="borderless" className="shadow-sm" style={{ borderBottom: '3px solid #3b82f6' }}>
                  <Statistic title="เจ้าหน้าที่ที่บันทึก" value={uniqueStaff} suffix="คน" />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card variant="borderless" className="shadow-sm" style={{ borderBottom: '3px solid #22c55e' }}>
                  <Statistic title="ชั่วโมงรวม" value={totalHours} suffix="ชม." styles={{ content: { color: '#22c55e' } }} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card variant="borderless" className="shadow-sm" style={{ borderBottom: '3px solid #f59e0b' }}>
                  <Statistic title="เฉลี่ยต่อรายการ" value={(totalHours / (logs.length || 1)).toFixed(1)} suffix="ชม." styles={{ content: { color: '#f59e0b' } }} />
                </Card>
              </Col>
            </Row>

            <Tabs
              defaultActiveKey="list"
              items={[
                {
                  key: 'list',
                  label: <span><CalendarOutlined /> รายการกิจกรรม</span>,
                  children: (
                    <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 12 }}>
                      <div className="mb-4 flex flex-col sm:flex-row gap-3">
                        <Input
                          placeholder="ค้นหากิจกรรม..."
                          prefix={<SearchOutlined />}
                          allowClear
                          onChange={e => setSearchText(e.target.value)}
                          style={{ maxWidth: 300 }}
                        />
                        <Select
                          placeholder="กรองตามเจ้าหน้าที่"
                          allowClear
                          options={staffList}
                          onChange={v => setFilterStaff(v || '')}
                          style={{ minWidth: 200 }}
                        />
                      </div>
                      <Table
                        columns={columns}
                        dataSource={filtered}
                        rowKey="id"
                        pagination={{ pageSize: 10 }}
                      />
                    </Card>
                  )
                },
                {
                  key: 'analysis',
                  label: <span><BarChartOutlined /> วิเคราะห์ Pain Points (4.6)</span>,
                  children: (
                    <div className="space-y-6">

                      {/* Insights อัตโนมัติ */}
                      {insights.length > 0 && (
                        <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 12, borderLeft: '4px solid #f59e0b' }}>
                          <div className="flex items-center gap-2 mb-4">
                            <BulbOutlined style={{ color: '#f59e0b', fontSize: 18 }} />
                            <Title level={5} style={{ color: '#f59e0b', margin: 0 }}>Insights อัตโนมัติ</Title>
                          </div>
                          <div className="space-y-3">
                            {insights.map((ins, i) => (
                              <Alert key={i} type={ins.type} title={ins.message} showIcon className="text-sm" />
                            ))}
                          </div>
                        </Card>
                      )}

                    <Row gutter={[24, 24]}>
                        {/* เวลาหายไปกับงานอะไร */}
                        <Col xs={24} lg={12}>
                          <Card variant="borderless" className="shadow-sm h-full" style={{ borderRadius: 12 }}>
                          <Title level={5} style={{ color: '#6B21A8' }} className="mb-1">
                              ⏱ เวลาหายไปกับงานอะไรมากที่สุด
                            </Title>
                            <Text type="secondary" className="text-xs block mb-4">เรียงตามชั่วโมงรวม (วิเคราะห์ภาระงานจริง)</Text>
                            <div className="space-y-3">
                              {byActivityType.map((item, idx) => {
                                const pct = Math.round((item.hours / totalHours) * 100)
                                const isTop = idx === 0
                                return (
                                  <div key={item.type}>
                                    <div className="flex justify-between items-center mb-1">
                                      <div className="flex items-center gap-2">
                                        {isTop && <FireOutlined style={{ color: '#ef4444' }} />}
                                        <Tag color={activityColors[item.type] || 'default'} className="m-0">{item.type}</Tag>
                                        <Text type="secondary" className="text-xs">{item.count} รายการ</Text>
                                      </div>
                                    <Text strong className={isTop ? 'text-red-600' : 'text-gray-700'}>
                                        {item.hours} ชม. ({pct}%)
                                      </Text>
                                    </div>
                                    <Progress
                                      percent={pct}
                                      showInfo={false}
                                      strokeColor={isTop ? '#ef4444' : '#a855f7'}
                                    trailColor="#f1f5f9"
                                      size="small"
                                    />
                                  </div>
                                )
                              })}
                            </div>
                          </Card>
                        </Col>

                        {/* ระบบที่กินเวลามากที่สุด */}
                        <Col xs={24} lg={12}>
                          <Card variant="borderless" className="shadow-sm h-full" style={{ borderRadius: 12 }}>
                          <Title level={5} style={{ color: '#6B21A8' }} className="mb-1">
                              🖥 ระบบที่กินเวลาทีมมากที่สุด
                            </Title>
                            <Text type="secondary" className="text-xs block mb-4">ระบุ Pain Point ว่าระบบไหนต้องการความสนใจมาก</Text>
                            <div className="space-y-3">
                              {bySystem.map((item, idx) => {
                                const pct = Math.round((item.hours / totalHours) * 100)
                                const isTop = idx === 0
                                return (
                                  <div key={item.system}>
                                    <div className="flex justify-between items-center mb-1">
                                      <div className="flex items-center gap-2">
                                        {isTop && <WarningOutlined style={{ color: '#f59e0b' }} />}
                                      <Text className={isTop ? 'text-amber-600 font-semibold' : 'text-gray-800'}>{item.system}</Text>
                                        <Text type="secondary" className="text-xs">{item.count} ครั้ง</Text>
                                      </div>
                                    <Text strong className={isTop ? 'text-amber-600' : 'text-gray-700'}>
                                        {item.hours} ชม. ({pct}%)
                                      </Text>
                                    </div>
                                    <Progress
                                      percent={pct}
                                      showInfo={false}
                                      strokeColor={isTop ? '#f59e0b' : '#3b82f6'}
                                    trailColor="#f1f5f9"
                                      size="small"
                                    />
                                  </div>
                                )
                              })}
                            </div>
                          </Card>
                        </Col>
                      </Row>

                      {/* งานเชิงรับ vs งานเชิงรุก */}
                      <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 12 }}>
                      <Title level={5} style={{ color: '#6B21A8' }} className="mb-1">
                          📊 สัดส่วนงานเชิงรับ vs งานเชิงรุก
                        </Title>
                        <Text type="secondary" className="text-xs block mb-4">
                          งานเชิงรับ = ซ่อมบำรุง | งานเชิงรุก = ดูแลระบบ, ติดตั้ง, พัฒนาระบบ
                          — ยิ่งงานเชิงรับสูง ยิ่งบ่งชี้ว่ามีปัญหาซ้ำซาก
                        </Text>
                      <Row gutter={[24, 24]} align="middle">
                          <Col xs={24} md={12}>
                            <div className="space-y-3">
                              <div>
                                <div className="flex justify-between mb-1">
                                  <span className="flex items-center gap-2">
                                    <FallOutlined style={{ color: '#ef4444' }} />
                                    <Text>งานเชิงรับ (Reactive)</Text>
                                  </span>
                                <Text strong className="text-red-600">{reactiveHours} ชม. ({reactivePercent}%)</Text>
                                </div>
                              <Progress percent={reactivePercent} showInfo={false} strokeColor="#ef4444" trailColor="#f1f5f9" />
                              </div>
                              <div>
                                <div className="flex justify-between mb-1">
                                  <span className="flex items-center gap-2">
                                    <RiseOutlined style={{ color: '#22c55e' }} />
                                    <Text>งานเชิงรุก (Proactive)</Text>
                                  </span>
                                <Text strong className="text-green-600">
                                    {proactiveHours} ชม. ({totalHours > 0 ? Math.round(proactiveHours / totalHours * 100) : 0}%)
                                  </Text>
                                </div>
                                <Progress
                                  percent={totalHours > 0 ? Math.round(proactiveHours / totalHours * 100) : 0}
                                  showInfo={false}
                                  strokeColor="#22c55e"
                                trailColor="#f1f5f9"
                                />
                              </div>
                            </div>
                          </Col>
                          <Col xs={24} md={12}>
                          <div className={`p-4 rounded-lg text-center ${reactivePercent > 50 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                              {reactivePercent > 50 ? (
                                <>
                                <WarningOutlined className="text-3xl text-red-500 mb-2 block" />
                                <Text strong className="text-red-600 block">⚠ งานเชิงรับสูงเกินไป</Text>
                                  <Text type="secondary" className="text-xs">แนะนำ: วางแผน Preventive Maintenance<br />เพื่อลดงานฉุกเฉินในปีถัดไป</Text>
                                </>
                              ) : (
                                <>
                                <RiseOutlined className="text-3xl text-green-500 mb-2 block" />
                                <Text strong className="text-green-600 block">✓ สัดส่วนดี</Text>
                                  <Text type="secondary" className="text-xs">ทีมให้ความสำคัญกับงานเชิงป้องกัน<br />มากกว่าการแก้ปัญหาเฉพาะหน้า</Text>
                                </>
                              )}
                            </div>
                          </Col>
                        </Row>
                      </Card>

                    <Row gutter={[24, 24]}>
                        {/* Pain Point: ระบบที่ซ่อมบ่อย */}
                        <Col xs={24} lg={12}>
                          <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 12 }}>
                          <Title level={5} style={{ color: '#6B21A8' }} className="mb-1">
                              🔧 Pain Point — ระบบที่ต้องซ่อมบ่อยที่สุด
                            </Title>
                            <Text type="secondary" className="text-xs block mb-4">ใช้วางแผนจัดหาอุปกรณ์สำรองหรืออัปเกรดในปีถัดไป</Text>
                            {painPointSystem.length === 0 ? (
                              <Text type="secondary">ยังไม่มีข้อมูลงานซ่อมบำรุง</Text>
                            ) : (
                              <div className="space-y-2">
                                {painPointSystem.map((item, idx) => (
                                <div key={item.system} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                                    <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold w-5 text-center ${idx === 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                        {idx + 1}
                                      </span>
                                    <Text className={idx === 0 ? 'text-red-600 font-semibold' : 'text-gray-800'}>{item.system}</Text>
                                    </div>
                                    <div className="text-right">
                                    <Text strong className={idx === 0 ? 'text-red-600' : 'text-gray-700'}>{item.count} ครั้ง</Text>
                                      <Text type="secondary" className="text-xs block">{item.hours} ชม.</Text>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </Card>
                        </Col>

                        {/* ภาระงานรายบุคคล */}
                        <Col xs={24} lg={12}>
                          <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 12 }}>
                          <Title level={5} style={{ color: '#6B21A8' }} className="mb-1">
                              👤 ภาระงานรายบุคคล
                            </Title>
                            <Text type="secondary" className="text-xs block mb-4">ดูว่าใครรับภาระมากเกินไป เพื่อวางแผนจัดสรรงาน</Text>
                            <div className="space-y-3">
                              {byStaff.map((s, idx) => {
                                const pct = Math.round((s.hours / totalHours) * 100)
                                const isTop = idx === 0 && byStaff.length > 1 && pct > 50
                                return (
                                  <div key={s.name}>
                                    <div className="flex justify-between items-center mb-1">
                                      <div className="flex items-center gap-2">
                                      <UserOutlined className={isTop ? 'text-orange-500' : 'text-purple-600'} />
                                      <Text className={isTop ? 'text-orange-600 font-semibold' : 'text-gray-800'}>{s.name}</Text>
                                      </div>
                                      <div className="text-right">
                                      <Text strong className={isTop ? 'text-orange-600' : 'text-gray-700'}>{s.hours} ชม.</Text>
                                        <Tag color={activityColors[s.topType] || 'default'} className="ml-2 text-xs">{s.topType}</Tag>
                                      </div>
                                    </div>
                                    <Progress
                                      percent={pct}
                                      showInfo={false}
                                      strokeColor={isTop ? '#f97316' : '#6B21A8'}
                                    trailColor="#f1f5f9"
                                      size="small"
                                    />
                                  </div>
                                )
                              })}
                            </div>
                          </Card>
                        </Col>
                      </Row>

                    </div>
                  )
                }
              ]}
            />
          </div>
        </div>
      </div>

      <Drawer
        title={editingLog ? 'แก้ไขกิจกรรม' : 'บันทึกกิจกรรมใหม่'}
        open={isDrawerOpen}
        onClose={() => { setIsDrawerOpen(false); form.resetFields() }}
        size="large"
        footer={
          <Space className="float-right">
            <Button onClick={() => { setIsDrawerOpen(false); form.resetFields() }}>ยกเลิก</Button>
            <Button type="primary" onClick={() => form.submit()}>บันทึก</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item label="วันที่" name="logDate" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item label="เจ้าหน้าที่" name="staffName" rules={[{ required: true, message: 'กรุณาเลือกเจ้าหน้าที่' }]}>
            <Select options={staffList} placeholder="เลือกเจ้าหน้าที่" showSearch optionFilterProp="label" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="ประเภทกิจกรรม" name="activityType" rules={[{ required: true }]}>
                <Select options={activityTypeOptions} placeholder="เลือกประเภท" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="ระบบที่เกี่ยวข้อง" name="system" rules={[{ required: true }]}>
                <Select options={systemOptions} placeholder="เลือกระบบ" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="รายละเอียดกิจกรรม" name="detail" rules={[{ required: true, message: 'กรุณาระบุรายละเอียด' }]}>
            <TextArea rows={3} placeholder="อธิบายกิจกรรมที่ทำในวันนี้" />
          </Form.Item>
          <Form.Item label="จำนวนชั่วโมงที่ใช้" name="hours" rules={[{ required: true }]}>
            <InputNumber min={0.5} max={24} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="ผลลัพธ์ / ผลการดำเนินการ" name="outcome" rules={[{ required: true, message: 'กรุณาระบุผลลัพธ์' }]}>
            <TextArea rows={2} placeholder="ระบุผลลัพธ์หรือสถานะงาน" />
          </Form.Item>
        </Form>
      </Drawer>
    </ConfigProvider>
  )
}
