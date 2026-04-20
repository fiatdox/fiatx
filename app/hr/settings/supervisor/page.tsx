'use client'
import React, { useState } from 'react'
import {
  Button, ConfigProvider, Card, Tag, Avatar, Drawer, Input, Breadcrumb, theme,
  Table, Space, Empty, Tooltip, Select, Row, Col, Typography, App
} from 'antd'
import {
  SearchOutlined, UserOutlined, HomeOutlined, PlusOutlined,
  ApartmentOutlined, CrownOutlined, DeleteOutlined, SwapOutlined,
  AlertOutlined, TeamOutlined, CheckCircleOutlined
} from '@ant-design/icons'
import { FaUsersCog, FaSitemap } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'

const { Text, Title } = Typography

// --- Types ---
interface MinimalEmployee {
  id: number
  title: string
  firstName: string
  lastName: string
  position: string
  avatar?: string
}

type SlotType = 'ผู้อำนวยการ' | 'หัวหน้ากลุ่มภารกิจ' | 'หัวหน้ากลุ่มงาน' | 'หัวหน้าหน่วยงาน'

interface OrgSlot {
  id: string
  type: SlotType
  title: string
  employeeId: number | null
  actingEmployeeId: number | null
  groupName: string
}

// --- Mock Data ---
const MOCK_EMPLOYEES: MinimalEmployee[] = [
  { id: 1, title: 'นายแพทย์', firstName: 'สมชาย', lastName: 'ใจดี', position: 'นายแพทย์เชี่ยวชาญ' },
  { id: 2, title: 'นางสาว', firstName: 'สมหญิง', lastName: 'รักเรียน', position: 'พยาบาลวิชาชีพชำนาญการ' },
  { id: 3, title: 'นาย', firstName: 'วิชัย', lastName: 'กล้าหาญ', position: 'เภสัชกรชำนาญการพิเศษ' },
  { id: 4, title: 'นาง', firstName: 'มานี', lastName: 'มีตา', position: 'นักจัดการงานทั่วไป' },
  { id: 5, title: 'นาย', firstName: 'ปิติ', lastName: 'ยินดี', position: 'นักวิชาการสาธารณสุข' },
]

const INITIAL_SLOTS: OrgSlot[] = [
  { id: 'dir-1', type: 'ผู้อำนวยการ', title: 'ผู้อำนวยการโรงพยาบาล', employeeId: 1, actingEmployeeId: null, groupName: 'ผู้บริหารสูงสุด' },
  { id: 'm-nursing', type: 'หัวหน้ากลุ่มภารกิจ', title: 'หัวหน้ากลุ่มภารกิจ', employeeId: null, actingEmployeeId: 3, groupName: 'กลุ่มภารกิจด้านการพยาบาล' },
  { id: 'm-primary', type: 'หัวหน้ากลุ่มภารกิจ', title: 'หัวหน้ากลุ่มภารกิจ', employeeId: null, actingEmployeeId: null, groupName: 'กลุ่มภารกิจด้านบริการปฐมภูมิ' },
  { id: 'w-inpatient', type: 'หัวหน้ากลุ่มงาน', title: 'หัวหน้ากลุ่มงาน', employeeId: 2, actingEmployeeId: null, groupName: 'กลุ่มงานการพยาบาลผู้ป่วยใน' },
  { id: 'w-outpatient', type: 'หัวหน้ากลุ่มงาน', title: 'หัวหน้ากลุ่มงาน', employeeId: null, actingEmployeeId: null, groupName: 'กลุ่มงานการพยาบาลผู้ป่วยนอก' },
  { id: 'w-er', type: 'หัวหน้ากลุ่มงาน', title: 'หัวหน้ากลุ่มงาน', employeeId: null, actingEmployeeId: null, groupName: 'กลุ่มงานอุบัติเหตุและฉุกเฉิน' },
  { id: 'u-medward', type: 'หัวหน้าหน่วยงาน', title: 'หัวหน้าหอผู้ป่วย', employeeId: 2, actingEmployeeId: null, groupName: 'หอผู้ป่วยอายุรกรรม' },
  { id: 'u-surgward', type: 'หัวหน้าหน่วยงาน', title: 'หัวหน้าหอผู้ป่วย', employeeId: null, actingEmployeeId: null, groupName: 'หอผู้ป่วยศัลยกรรม' },
  { id: 'u-icu', type: 'หัวหน้าหน่วยงาน', title: 'หัวหน้าหอผู้ป่วย', employeeId: null, actingEmployeeId: null, groupName: 'หอผู้ป่วยหนัก (ICU)' },
]

const SLOT_TYPE_CONFIG: Record<SlotType, { color: string; tagColor: string }> = {
  'ผู้อำนวยการ': { color: '#d97706', tagColor: 'gold' },
  'หัวหน้ากลุ่มภารกิจ': { color: '#3b82f6', tagColor: 'blue' },
  'หัวหน้ากลุ่มงาน': { color: '#059669', tagColor: 'green' },
  'หัวหน้าหน่วยงาน': { color: '#7c3aed', tagColor: 'purple' },
}

// ─── Page Content ────────────────────────────────────────────────────────────

const PageContent = () => {
  const [slots, setSlots] = useState<OrgSlot[]>(INITIAL_SLOTS)
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [activeRef, setActiveRef] = useState<{ id: string; mode: 'main' | 'acting' } | null>(null)
  const [searchText, setSearchText] = useState('')
  const [slotSearchText, setSlotSearchText] = useState('')
  const [filterLevel, setFilterLevel] = useState<string>('all')

  const handleOpenAssign = (slotId: string, mode: 'main' | 'acting') => {
    setActiveRef({ id: slotId, mode })
    setSearchText('')
    setIsAssignOpen(true)
  }

  const handleAssignEmployee = (employeeId: number | null) => {
    if (!activeRef) return
    setSlots(slots.map(s =>
      s.id === activeRef.id
        ? { ...s, [activeRef.mode === 'main' ? 'employeeId' : 'actingEmployeeId']: employeeId }
        : s
    ))
    setIsAssignOpen(false)
    setActiveRef(null)
  }

  const getEmployee = (id: number | null) => MOCK_EMPLOYEES.find(e => e.id === id)

  // Stats
  const totalSlots = slots.length
  const filledSlots = slots.filter(s => s.employeeId !== null).length
  const actingSlots = slots.filter(s => s.actingEmployeeId !== null).length
  const vacantSlots = slots.filter(s => s.employeeId === null && s.actingEmployeeId === null).length

  const filteredSlots = slots.filter(slot => {
    if (filterLevel !== 'all') {
      if (filterLevel === 'ผู้อำนวยการ' && slot.type !== 'ผู้อำนวยการ') return false
      if (filterLevel === 'ภารกิจ' && !slot.type.includes('ภารกิจ')) return false
      if (filterLevel === 'กลุ่มงาน' && !slot.type.includes('กลุ่มงาน')) return false
      if (filterLevel === 'หน่วยงาน' && !slot.type.includes('หน่วยงาน')) return false
    }
    const emp = getEmployee(slot.employeeId)
    const actingEmp = getEmployee(slot.actingEmployeeId)
    const searchString = `${slot.title} ${slot.groupName} ${emp ? `${emp.firstName} ${emp.lastName}` : ''} ${actingEmp ? `${actingEmp.firstName} ${actingEmp.lastName}` : ''}`.toLowerCase()
    return searchString.includes(slotSearchText.toLowerCase())
  })

  const renderEmpCell = (empId: number | null, slotId: string, mode: 'main' | 'acting') => {
    const emp = getEmployee(empId)
    const isActing = mode === 'acting'

    if (!emp) return (
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all"
        style={{ border: '1px dashed rgba(255,255,255,0.1)' }}
        onClick={() => handleOpenAssign(slotId, mode)}
      >
        <Avatar size={32} icon={<PlusOutlined />} style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#64748b' }} />
        <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>
          คลิกเพื่อแต่งตั้ง{isActing ? 'รักษาการ' : ''}
        </Text>
      </div>
    )

    return (
      <div className="flex items-center justify-between group py-1">
        <div className="flex items-center gap-3">
          <Avatar
            src={emp.avatar}
            size={36}
            icon={<UserOutlined />}
            style={{
              backgroundColor: isActing ? '#92400e' : '#006a5a',
              border: `2px solid ${isActing ? 'rgba(245,158,11,0.3)' : 'rgba(0,106,90,0.3)'}`,
            }}
          />
          <div>
            <div className="flex items-center gap-2">
              <Text strong style={{ fontSize: 13 }}>{emp.title}{emp.firstName} {emp.lastName}</Text>
              {isActing && <Tag color="warning" style={{ fontSize: 10, borderRadius: 4, margin: 0, lineHeight: '16px', padding: '0 6px' }}>รักษาการ</Tag>}
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>{emp.position}</Text>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip title="เปลี่ยนคน">
            <Button
              size="small"
              type="text"
              icon={<SwapOutlined style={{ color: '#60a5fa', fontSize: 12 }} />}
              onClick={(e) => { e.stopPropagation(); handleOpenAssign(slotId, mode) }}
            />
          </Tooltip>
          <Tooltip title="ลบออก">
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined style={{ fontSize: 12 }} />}
              onClick={(e) => {
                e.stopPropagation()
                setActiveRef({ id: slotId, mode })
                handleAssignEmployee(null)
              }}
            />
          </Tooltip>
        </div>
      </div>
    )
  }

  const columns = [
    {
      title: 'ระดับ / สังกัด',
      key: 'level',
      width: '22%',
      render: (_: any, record: OrgSlot) => {
        const config = SLOT_TYPE_CONFIG[record.type]
        return (
          <div>
            <Tag color={config.tagColor} style={{ borderRadius: 12, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
              {record.type}
            </Tag>
            <div>
              <Text style={{ fontSize: 13, fontWeight: 500 }}>{record.groupName}</Text>
            </div>
          </div>
        )
      },
    },
    {
      title: 'ตำแหน่งทางบริหาร',
      dataIndex: 'title',
      key: 'title',
      width: '16%',
      render: (text: string) => <Text style={{ fontSize: 13, fontWeight: 500 }}>{text}</Text>,
    },
    {
      title: <div className="flex items-center gap-2"><CrownOutlined style={{ color: '#22c55e' }} /> ผู้ดำรงตำแหน่ง</div>,
      key: 'main',
      width: '28%',
      render: (_: any, record: OrgSlot) => renderEmpCell(record.employeeId, record.id, 'main'),
    },
    {
      title: <div className="flex items-center gap-2"><AlertOutlined style={{ color: '#f59e0b' }} /> ผู้รักษาการ</div>,
      key: 'acting',
      width: '28%',
      render: (_: any, record: OrgSlot) => renderEmpCell(record.actingEmployeeId, record.id, 'acting'),
    },
  ]

  const filteredEmployees = MOCK_EMPLOYEES.filter(emp =>
    `${emp.title}${emp.firstName} ${emp.lastName} ${emp.position}`.toLowerCase().includes(searchText.toLowerCase())
  )

  const activeSlot = slots.find(s => s.id === activeRef?.id)

  return (
    <div className="min-h-dvh bg-slate-900 text-slate-200" style={{ minHeight: '100dvh' }}>
      <Navbar />
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto">

        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FaUsersCog className="inline mr-1" /> งานทรัพยากรบุคคล</> },
            { title: 'ผังผู้บริหาร' },
          ]}
          className="mb-4"
        />

        {/* ── Header Banner ── */}
        <Card
          style={{
            background: 'linear-gradient(135deg, #006a5a 0%, #059669 50%, #0d9488 100%)',
            border: 'none',
            borderRadius: 16,
            marginBottom: 24,
          }}
        >
          <Row gutter={[24, 16]} align="middle">
            <Col xs={24} md={16}>
              <div className="flex items-center gap-4">
                <div
                  className="flex items-center justify-center rounded-2xl"
                  style={{ width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.15)' }}
                >
                  <FaSitemap className="text-2xl text-white" />
                </div>
                <div>
                  <Title level={3} style={{ color: '#fff', margin: 0 }}>ผังผู้บริหารและหัวหน้างาน</Title>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                    กำหนดผู้ดำรงตำแหน่งตัวจริงและรักษาการ สำหรับ Workflow อนุมัติ
                  </Text>
                </div>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="flex gap-3 md:justify-end">
                <Button
                  icon={<TeamOutlined />}
                  onClick={() => window.location.href = '/hr/users'}
                  size="large"
                  style={{ backgroundColor: '#fff', color: '#006a5a', border: 'none', fontWeight: 600 }}
                >
                  ทะเบียนบุคลากร
                </Button>
              </div>
            </Col>
          </Row>
        </Card>

        {/* ── Stats Cards ── */}
        <Row gutter={[12, 12]} className="mb-6">
          {[
            { title: 'ตำแหน่งทั้งหมด', value: totalSlots, icon: <ApartmentOutlined />, color: '#006a5a' },
            { title: 'มีผู้ดำรงตำแหน่ง', value: filledSlots, icon: <CheckCircleOutlined />, color: '#22c55e' },
            { title: 'มีรักษาการ', value: actingSlots, icon: <AlertOutlined />, color: '#f59e0b' },
            { title: 'ยังว่าง', value: vacantSlots, icon: <UserOutlined />, color: '#ef4444' },
          ].map((stat, i) => (
            <Col xs={12} sm={6} key={i}>
              <Card style={{ borderRadius: 12, border: 'none' }} styles={{ body: { padding: '18px 16px' } }}>
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center rounded-xl"
                    style={{ width: 44, height: 44, backgroundColor: `${stat.color}18`, color: stat.color, fontSize: 20 }}
                  >
                    {stat.icon}
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 11 }}>{stat.title}</Text>
                    <div>
                      <Text strong style={{ fontSize: 26, lineHeight: 1.1 }}>{stat.value}</Text>
                      <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>ตำแหน่ง</Text>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* ── Main Table Card ── */}
        <Card
          style={{ borderRadius: 12, border: 'none' }}
          styles={{ body: { padding: 0 } }}
        >
          {/* Toolbar */}
          <div className="px-6 pt-5 pb-4">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Text strong style={{ fontSize: 16 }}>โครงสร้างตำแหน่ง</Text>
                <Tag color="#006a5a" style={{ borderRadius: 12, fontSize: 12, padding: '0 10px' }}>
                  {filteredSlots.length} รายการ
                </Tag>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={filterLevel}
                  onChange={setFilterLevel}
                  style={{ width: 180 }}
                  options={[
                    { value: 'all', label: 'ทุกระดับ' },
                    { value: 'ผู้อำนวยการ', label: 'ผู้อำนวยการ' },
                    { value: 'ภารกิจ', label: 'กลุ่มภารกิจ' },
                    { value: 'กลุ่มงาน', label: 'กลุ่มงาน' },
                    { value: 'หน่วยงาน', label: 'หน่วยงาน / หอผู้ป่วย' },
                  ]}
                />
                <Input
                  placeholder="ค้นหาตำแหน่ง, ชื่อ..."
                  prefix={<SearchOutlined className="text-slate-400" />}
                  value={slotSearchText}
                  onChange={e => setSlotSearchText(e.target.value)}
                  allowClear
                  style={{ width: 260 }}
                />
              </div>
            </div>
          </div>

          <Table
            dataSource={filteredSlots}
            columns={columns}
            rowKey="id"
            pagination={false}
            size="middle"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            locale={{
              emptyText: <Empty description="ไม่พบตำแหน่งบริหารที่ค้นหา" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
            }}
          />
        </Card>

        {/* ── Info Note ── */}
        <div
          className="mt-6 p-4 rounded-xl flex gap-3 items-start"
          style={{ backgroundColor: 'rgba(0,106,90,0.06)', border: '1px solid rgba(0,106,90,0.12)' }}
        >
          <ApartmentOutlined style={{ color: '#006a5a', fontSize: 18, marginTop: 2 }} />
          <div>
            <Text style={{ fontSize: 13, fontWeight: 600 }}>โครงสร้างการบริหาร</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              แบ่งคอลัมน์ชัดเจนระหว่าง "ผู้ดำรงตำแหน่ง" ตามประกาศ และ "ผู้รักษาการ" ที่ได้รับมอบหมาย
              เพื่อให้ระบบ Workflow อนุมัติสามารถตรวจสอบสิทธิ์ได้จากฐานข้อมูลเดียวกัน
              คลิกที่ช่องว่างเพื่อแต่งตั้ง หรือ hover เพื่อเปลี่ยน/ลบ
            </Text>
          </div>
        </div>
      </div>

      {/* ── Drawer: Assign Employee ── */}
      <Drawer
        title={null}
        size="large"
        onClose={() => setIsAssignOpen(false)}
        open={isAssignOpen}
        styles={{ body: { padding: 0 } }}
      >
        {/* Drawer Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #006a5a 0%, #059669 100%)',
            padding: '24px',
          }}
        >
          <Title level={5} style={{ color: '#fff', margin: 0 }}>แต่งตั้งบุคลากร</Title>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
            {activeSlot?.title} — {activeSlot?.groupName}
          </Text>
          <div className="mt-2">
            <Tag
              color={activeRef?.mode === 'main' ? 'green' : 'warning'}
              style={{ borderRadius: 12, fontSize: 12 }}
            >
              {activeRef?.mode === 'main' ? 'ตำแหน่งตัวจริง' : 'รักษาการแทน'}
            </Tag>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Input
            placeholder="ค้นหาชื่อ หรือ ตำแหน่ง..."
            prefix={<SearchOutlined className="text-slate-400" />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            allowClear
            size="large"
          />
        </div>

        {/* Employee List */}
        <div className="px-4 py-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
          {filteredEmployees.map(emp => (
            <div
              key={emp.id}
              className="group flex items-center gap-3 p-4 cursor-pointer rounded-xl transition-all"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              onClick={() => handleAssignEmployee(emp.id)}
            >
              <Avatar
                src={emp.avatar}
                size={44}
                icon={<UserOutlined />}
                style={{ backgroundColor: '#006a5a', border: '2px solid rgba(0,106,90,0.3)', flexShrink: 0 }}
              />
              <div className="flex-1 min-w-0">
                <Text strong style={{ fontSize: 14 }}>{emp.title}{emp.firstName} {emp.lastName}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>{emp.position}</Text>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Tag color="green" style={{ borderRadius: 12, margin: 0, fontSize: 11 }}>เลือก</Tag>
              </div>
            </div>
          ))}
          {filteredEmployees.length === 0 && (
            <Empty description="ไม่พบรายชื่อบุคลากร" className="py-12" />
          )}
        </div>
      </Drawer>
    </div>
  )
}

export default function SupervisorPage() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: { colorPrimary: '#006a5a', borderRadius: 8 },
        components: {
          App: { colorBgBase: 'transparent' },
        },
      }}
    >
      <App style={{ background: 'transparent' }}>
        <PageContent />
      </App>
    </ConfigProvider>
  )
}
