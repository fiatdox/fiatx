'use client'
import React, { useState } from 'react'
import {
  Table, Input, Button, Space, ConfigProvider, Card, Statistic, Row, Col, Tag,
  Avatar, Drawer, Form, Select, Breadcrumb, Dropdown, Tooltip, theme, DatePicker,
  Upload, Descriptions, Timeline, Segmented, App, Divider, Typography
} from 'antd'
import {
  EditOutlined, SearchOutlined, UserOutlined, TeamOutlined, PlusOutlined,
  ExportOutlined, MoreOutlined, HomeOutlined, SolutionOutlined, ApartmentOutlined,
  IdcardOutlined, PhoneOutlined, CalendarOutlined, ClockCircleOutlined,
  CheckCircleOutlined, EnvironmentOutlined
} from '@ant-design/icons'
import {
  FaUsersCog, FaUsers, FaUserCheck, FaUserTimes, FaChartBar
} from 'react-icons/fa'
import Swal from 'sweetalert2'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import Navbar from '@/app/components/Navbar'
import { FaFileExcel, FaFilter } from 'react-icons/fa'

const { Text, Title } = Typography

// --- Type Definitions ---
interface Employee {
  id: number
  title: string
  firstName: string
  lastName: string
  position: string
  idCardNumber?: string
  avatar?: string
  status: string
  department: string
  missionGroup?: string
  workGroup?: string
  level?: string
  staffType?: string
  birthDate?: any
  startDate?: any
  attendanceId?: string
}

type EmployeeFormData = Omit<Employee, 'id'>

// --- Mock Data ---
const initialData: Employee[] = [
  {
    id: 1, title: 'นาย', firstName: 'สมชาย', lastName: 'ใจดี', position: 'นายแพทย์', status: 'ปฏิบัติงาน', department: 'หอผู้ป่วยอายุรกรรม',
    missionGroup: 'กลุ่มภารกิจด้านบริการปฐมภูมิ', workGroup: 'กลุ่มงานการพยาบาลผู้ป่วยนอก', level: 'ชำนาญการ', staffType: 'ข้าราชการ',
    idCardNumber: '1100200300405', attendanceId: 'EMP001', birthDate: dayjs('1985-10-15'), startDate: dayjs('2015-06-01')
  },
  {
    id: 2, title: 'นางสาว', firstName: 'สมหญิง', lastName: 'รักเรียน', position: 'พยาบาลวิชาชีพ', status: 'ปฏิบัติงาน', department: 'หอผู้ป่วยศัลยกรรม',
    missionGroup: 'กลุ่มภารกิจด้านการพยาบาล', workGroup: 'กลุ่มงานการพยาบาลผู้ป่วยใน', level: 'ปฏิบัติการ', staffType: 'พนักงานราชการ',
    idCardNumber: '1100200300406', attendanceId: 'EMP002', birthDate: dayjs('1990-05-20'), startDate: dayjs('2018-03-12')
  },
  {
    id: 3, title: 'นาย', firstName: 'วิชัย', lastName: 'กล้าหาญ', position: 'เภสัชกร', status: 'ย้าย', department: 'IT',
    missionGroup: 'กลุ่มภารกิจด้านพัฒนาระบบบริการ', workGroup: 'กลุ่มงานเภสัชกรรม', level: 'ชำนาญการพิเศษ', staffType: 'พนักงานกระทรวงสาธารณสุข',
    idCardNumber: '1100200300407', attendanceId: 'EMP003', birthDate: dayjs('1982-11-04'), startDate: dayjs('2010-09-01')
  },
  {
    id: 4, title: 'นาง', firstName: 'มานี', lastName: 'มีตา', position: 'นักจัดการงานทั่วไป', status: 'ลาออก', department: 'HR',
    missionGroup: 'กลุ่มภารกิจด้านอำนวยการ', workGroup: 'กลุ่มงานเทคนิคการแพทย์', level: 'ปฏิบัติงาน', staffType: 'ลูกจ้างชั่วคราวรายเดือน',
    idCardNumber: '1100200300408', attendanceId: 'EMP004', birthDate: dayjs('1995-02-14'), startDate: dayjs('2021-01-15')
  },
  {
    id: 5, title: 'นาย', firstName: 'ปิติ', lastName: 'ยินดี', position: 'นักวิชาการสาธารณสุข', status: 'ปฏิบัติงาน', department: 'HR',
    missionGroup: 'กลุ่มภารกิจด้านบริการปฐมภูมิ', workGroup: 'กลุ่มงานการพยาบาลผู้ป่วยนอก', level: 'ชำนาญการ', staffType: 'ข้าราชการ',
    idCardNumber: '1100200300409', attendanceId: 'EMP005', birthDate: dayjs('1988-08-08'), startDate: dayjs('2016-04-01')
  },
]

const STATUS_MAP: Record<string, { color: string; dotColor: string }> = {
  'ปฏิบัติงาน': { color: 'success', dotColor: '#22c55e' },
  'ลาออก': { color: 'error', dotColor: '#ef4444' },
  'เกษียณอายุ': { color: 'default', dotColor: '#6b7280' },
  'ย้าย': { color: 'warning', dotColor: '#f59e0b' },
  'เสียชีวิต': { color: 'default', dotColor: '#374151' },
}

// ─── Page Content ────────────────────────────────────────────────────────────

const PageContent = () => {
  const [employees, setEmployees] = useState<Employee[]>(initialData)
  const [searchText, setSearchText] = useState('')
  const [filterWorkGroup, setFilterWorkGroup] = useState<string | null>(null)
  const [filterDepartment, setFilterDepartment] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false)
  const [viewRecord, setViewRecord] = useState<Employee | null>(null)
  const [viewType, setViewType] = useState<string>('1')
  const [form] = Form.useForm()

  // --- Unique filter options from data ---
  const workGroupOptions = Array.from(new Set(employees.map(e => e.workGroup).filter(Boolean))) as string[]
  const departmentOptions = Array.from(new Set(employees.map(e => e.department).filter(Boolean))) as string[]
  const statusOptions = Array.from(new Set(employees.map(e => e.status).filter(Boolean))) as string[]

  // --- Stats ---
  const totalEmployees = employees.length
  const activeEmployees = employees.filter(e => e.status === 'ปฏิบัติงาน').length
  const onLeaveEmployees = employees.filter(e => e.status !== 'ปฏิบัติงาน').length
  const activeFilterCount = [filterWorkGroup, filterDepartment, filterStatus].filter(Boolean).length

  // --- Handlers ---
  const handleAdd = () => {
    setEditingEmployee(null)
    setImageUrl(null)
    form.resetFields()
    setIsDrawerOpen(true)
  }

  const handleEdit = (record: Employee) => {
    setEditingEmployee(record)
    setImageUrl(record.avatar || null)
    form.setFieldsValue(record)
    setIsDrawerOpen(true)
  }

  const handleAvatarChange = (info: any) => {
    const file = info.fileList[info.fileList.length - 1]?.originFileObj || info.file
    if (file) {
      if (!file.type?.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = () => setImageUrl(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setImageUrl(null)
    }
  }

  const handleMenuClick = (key: string, record: Employee) => {
    setViewRecord(record)
    setViewType(key)
    setViewDrawerOpen(true)
  }

  const onFinish = (values: EmployeeFormData) => {
    const finalValues = { ...values, avatar: imageUrl || undefined }
    if (editingEmployee) {
      setEmployees(employees.map(emp => emp.id === editingEmployee.id ? { ...finalValues, id: editingEmployee.id } : emp))
    } else {
      const newId = employees.length > 0 ? Math.max(...employees.map(e => e.id)) + 1 : 1
      setEmployees([...employees, { ...finalValues, id: newId }])
    }
    setIsDrawerOpen(false)
  }

  const handleExportExcel = () => {
    const exportData = filteredEmployees.map((emp, index) => ({
      'ลำดับ': index + 1,
      'คำนำหน้า': emp.title,
      'ชื่อ': emp.firstName,
      'นามสกุล': emp.lastName,
      'เลขบัตรประชาชน': emp.idCardNumber || '-',
      'ตำแหน่ง': emp.position,
      'ระดับ': emp.level || '-',
      'ประเภทเจ้าหน้าที่': emp.staffType || '-',
      'กลุ่มภารกิจ': emp.missionGroup || '-',
      'กลุ่มงาน': emp.workGroup || '-',
      'สังกัด/หอผู้ป่วย': emp.department || '-',
      'สถานะ': emp.status,
      'รหัสเข้าออกงาน': emp.attendanceId || '-',
      'วันเกิด': emp.birthDate ? dayjs(emp.birthDate).format('DD/MM/YYYY') : '-',
      'วันที่เริ่มงาน': emp.startDate ? dayjs(emp.startDate).format('DD/MM/YYYY') : '-',
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(key.length * 2, ...exportData.map(row => String((row as any)[key]).length * 1.5), 10)
    }))
    ws['!cols'] = colWidths

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'ทะเบียนบุคลากร')
    XLSX.writeFile(wb, `ทะเบียนบุคลากร_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`)
  }

  const clearAllFilters = () => {
    setFilterWorkGroup(null)
    setFilterDepartment(null)
    setFilterStatus(null)
    setSearchText('')
  }

  const handleDelete = (record: Employee) => {
    Swal.fire({
      title: 'ยืนยันการลบ?',
      text: `ลบข้อมูล ${record.title}${record.firstName} ${record.lastName}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'ยกเลิก',
      confirmButtonText: 'ลบ',
      background: '#1e293b',
      color: '#e2e8f0',
    }).then((result) => {
      if (result.isConfirmed) {
        setEmployees(employees.filter(e => e.id !== record.id))
      }
    })
  }

  // --- Table Columns ---
  const columns = [
    {
      title: 'บุคลากร',
      key: 'name',
      width: 300,
      render: (_: any, record: Employee) => (
        <div className="flex items-center gap-3 py-1">
          <Avatar
            src={record.avatar}
            size={44}
            style={{
              backgroundColor: '#006a5a',
              border: '2px solid rgba(0,106,90,0.3)',
              flexShrink: 0,
            }}
            icon={<UserOutlined />}
          />
          <div>
            <div className="font-semibold text-slate-100 text-[14px]">
              {record.title}{record.firstName} {record.lastName}
            </div>
            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <IdcardOutlined /> {record.idCardNumber || '-'}
            </div>
          </div>
        </div>
      ),
      sorter: (a: Employee, b: Employee) => `${a.firstName}`.localeCompare(`${b.firstName}`),
    },
    {
      title: 'ตำแหน่ง / ระดับ',
      key: 'position',
      width: 220,
      render: (_: any, record: Employee) => (
        <div>
          <div className="text-slate-200 text-[13px] font-medium">{record.position}</div>
          {record.level && (
            <Tag color="cyan" style={{ marginTop: 4, fontSize: 11, borderRadius: 4 }}>
              {record.level}
            </Tag>
          )}
        </div>
      ),
      sorter: (a: Employee, b: Employee) => a.position.localeCompare(b.position),
    },
    {
      title: 'ประเภท',
      dataIndex: 'staffType',
      key: 'staffType',
      width: 200,
      render: (text?: string) => (
        <span className="text-slate-300 text-[13px]">{text || '-'}</span>
      ),
    },
    {
      title: 'สังกัด',
      dataIndex: 'department',
      key: 'department',
      width: 180,
      filters: [
        { text: 'หอผู้ป่วยอายุรกรรม', value: 'หอผู้ป่วยอายุรกรรม' },
        { text: 'หอผู้ป่วยศัลยกรรม', value: 'หอผู้ป่วยศัลยกรรม' },
        { text: 'IT', value: 'IT' },
        { text: 'HR', value: 'HR' },
      ],
      onFilter: (value: any, record: Employee) => record.department === value,
      render: (text: string) => (
        <div className="flex items-center gap-1.5">
          <EnvironmentOutlined className="text-slate-500 text-xs" />
          <span className="text-slate-300 text-[13px]">{text}</span>
        </div>
      ),
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      filters: [
        { text: 'ปฏิบัติงาน', value: 'ปฏิบัติงาน' },
        { text: 'ย้าย', value: 'ย้าย' },
        { text: 'ลาออก', value: 'ลาออก' },
      ],
      onFilter: (value: any, record: Employee) => record.status === value,
      render: (status: string) => {
        const config = STATUS_MAP[status] || { color: 'default', dotColor: '#6b7280' }
        return (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.dotColor }} />
            <span className="text-[13px]">{status}</span>
          </div>
        )
      },
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: any, record: Employee) => (
        <Space size="small">
          <Tooltip title="แก้ไข">
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={<EditOutlined style={{ color: '#60a5fa' }} />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Dropdown
            menu={{
              items: [
                { key: '1', icon: <UserOutlined />, label: 'ดูรายละเอียด' },
                { key: '2', icon: <ClockCircleOutlined />, label: 'ประวัติการทำงาน' },
                { key: '3', icon: <CalendarOutlined />, label: 'ประวัติเข้าออกงาน' },
                { type: 'divider' },
                { key: 'delete', icon: <SolutionOutlined />, label: 'ลบข้อมูล', danger: true },
              ],
              onClick: ({ key }) => {
                if (key === 'delete') {
                  handleDelete(record)
                } else {
                  handleMenuClick(key, record)
                }
              }
            }}
          >
            <Button type="text" shape="circle" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ]

  const filteredEmployees = employees.filter((employee) => {
    const matchSearch = searchText
      ? Object.values(employee).some((value) => String(value).toLowerCase().includes(searchText.toLowerCase()))
      : true
    const matchWorkGroup = filterWorkGroup ? employee.workGroup === filterWorkGroup : true
    const matchDepartment = filterDepartment ? employee.department === filterDepartment : true
    const matchStatus = filterStatus ? employee.status === filterStatus : true
    return matchSearch && matchWorkGroup && matchDepartment && matchStatus
  })

  return (
    <div className="min-h-dvh bg-slate-900 text-slate-200" style={{ minHeight: '100dvh' }}>
      <Navbar />
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto">

        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FaUsersCog className="inline mr-1" /> งานทรัพยากรบุคคล</> },
            { title: 'ทะเบียนบุคลากร' },
          ]}
          className="mb-4"
        />

        {/* Header Banner */}
        <Card
          style={{
            background: 'linear-gradient(135deg, #006a5a 0%, #059669 50%, #0d9488 100%)',
            border: 'none',
            borderRadius: 16,
            marginBottom: 24,
          }}
        >
          <Row gutter={[24, 16]} align="middle">
            <Col xs={24} md={14}>
              <div className="flex items-center gap-4">
                <div
                  className="flex items-center justify-center rounded-2xl"
                  style={{ width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.15)' }}
                >
                  <FaUsers className="text-2xl text-white" />
                </div>
                <div>
                  <Title level={3} style={{ color: '#fff', margin: 0 }}>ระบบทะเบียนบุคลากร</Title>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                    จัดการข้อมูลบุคลากร ตำแหน่ง ประเภทเจ้าหน้าที่ และประวัติการทำงาน
                  </Text>
                </div>
              </div>
            </Col>
            <Col xs={24} md={10}>
              <div className="flex gap-3 md:justify-end flex-wrap">
                <Button
                  icon={<ApartmentOutlined />}
                  onClick={() => window.location.href = '/hr/settings/supervisor'}
                  size="large"
                  style={{ backgroundColor: '#fff', color: '#006a5a', border: 'none', fontWeight: 600 }}
                >
                  ผังผู้บริหาร
                </Button>
                <Button
                  icon={<PlusOutlined />}
                  onClick={handleAdd}
                  size="large"
                  style={{ backgroundColor: '#facc15', color: '#1e293b', border: 'none', fontWeight: 600 }}
                >
                  เพิ่มบุคลากร
                </Button>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Stats Cards */}
        <Row gutter={[16, 16]} className="mb-6">
          {[
            { title: 'บุคลากรทั้งหมด', value: totalEmployees, icon: <TeamOutlined />, color: '#006a5a' },
            { title: 'ปฏิบัติงาน', value: activeEmployees, icon: <CheckCircleOutlined />, color: '#22c55e' },
            { title: 'ไม่ได้ปฏิบัติงาน', value: onLeaveEmployees, icon: <SolutionOutlined />, color: '#f59e0b' },
          ].map((stat, i) => (
            <Col xs={8} key={i}>
              <Card style={{ borderRadius: 12, border: 'none' }} styles={{ body: { padding: '20px 20px' } }}>
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center rounded-xl"
                    style={{ width: 48, height: 48, backgroundColor: `${stat.color}18`, color: stat.color, fontSize: 22 }}
                  >
                    {stat.icon}
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{stat.title}</Text>
                    <div>
                      <Text strong style={{ fontSize: 28, lineHeight: 1.1 }}>{stat.value}</Text>
                      <Text type="secondary" style={{ fontSize: 13, marginLeft: 4 }}>คน</Text>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Main Table Card */}
        <Card
          style={{ borderRadius: 12, border: 'none' }}
          styles={{ body: { padding: 0 } }}
        >
          {/* Toolbar */}
          <div className="px-6 pt-5 pb-4">
            <div className="flex justify-between items-center flex-wrap gap-4 mb-3">
              <div className="flex items-center gap-3">
                <Text strong style={{ fontSize: 16 }}>รายชื่อบุคลากร</Text>
                <Tag color="#006a5a" style={{ borderRadius: 12, fontSize: 12, padding: '0 10px' }}>
                  {filteredEmployees.length} รายการ
                </Tag>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="ค้นหาชื่อ, ตำแหน่ง, แผนก..."
                  prefix={<SearchOutlined className="text-slate-400" />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: 280 }}
                  allowClear
                />
                <Tooltip title="ตัวกรอง">
                  <Button
                    icon={<FaFilter />}
                    onClick={() => setShowFilters(!showFilters)}
                    type={showFilters || activeFilterCount > 0 ? 'primary' : 'default'}
                  >
                    กรอง {activeFilterCount > 0 && `(${activeFilterCount})`}
                  </Button>
                </Tooltip>
                <Button
                  icon={<FaFileExcel />}
                  onClick={handleExportExcel}
                  style={{ color: '#22c55e', borderColor: '#22c55e33' }}
                >
                  Excel
                </Button>
              </div>
            </div>

            {/* Filter Row */}
            {showFilters && (
              <div
                className="flex items-center gap-3 flex-wrap p-4 rounded-xl mb-2"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <Text type="secondary" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>กรองตาม:</Text>
                <Select
                  placeholder="กลุ่มงาน"
                  value={filterWorkGroup}
                  onChange={setFilterWorkGroup}
                  allowClear
                  style={{ minWidth: 220 }}
                  options={workGroupOptions.map(v => ({ label: v, value: v }))}
                />
                <Select
                  placeholder="สังกัด / หอผู้ป่วย"
                  value={filterDepartment}
                  onChange={setFilterDepartment}
                  allowClear
                  style={{ minWidth: 180 }}
                  options={departmentOptions.map(v => ({ label: v, value: v }))}
                />
                <Select
                  placeholder="สถานะ"
                  value={filterStatus}
                  onChange={setFilterStatus}
                  allowClear
                  style={{ minWidth: 140 }}
                  options={statusOptions.map(v => ({ label: v, value: v }))}
                />
                {activeFilterCount > 0 && (
                  <Button type="link" size="small" onClick={clearAllFilters} danger>
                    ล้างตัวกรองทั้งหมด
                  </Button>
                )}
              </div>
            )}
          </div>

          <Table
            columns={columns}
            dataSource={filteredEmployees}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showTotal: (total, range) => `แสดง ${range[0]}-${range[1]} จาก ${total} รายการ`,
              style: { padding: '0 24px' }
            }}
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          />
        </Card>

        {/* ── Add / Edit Drawer ── */}
        <Drawer
          title={
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center rounded-lg"
                style={{ width: 36, height: 36, backgroundColor: '#006a5a20', color: '#006a5a' }}
              >
                {editingEmployee ? <EditOutlined /> : <PlusOutlined />}
              </div>
              <span>{editingEmployee ? 'แก้ไขข้อมูลบุคลากร' : 'เพิ่มบุคลากรใหม่'}</span>
            </div>
          }
          size="large"
          onClose={() => setIsDrawerOpen(false)}
          open={isDrawerOpen}
          styles={{ body: { paddingBottom: 80 } }}
          extra={
            <Space>
              <Button onClick={() => setIsDrawerOpen(false)}>ยกเลิก</Button>
              <Button onClick={() => form.submit()} type="primary">บันทึก</Button>
            </Space>
          }
        >
          <Form layout="vertical" form={form} onFinish={onFinish} requiredMark="optional">
            {/* Avatar Upload */}
            <Row gutter={16} justify="center" className="mb-6">
              <Col>
                <Form.Item
                  name="avatar"
                  valuePropName="fileList"
                  getValueFromEvent={(e: any) => {
                    handleAvatarChange(e)
                    return Array.isArray(e) ? e : e?.fileList
                  }}
                >
                  <Upload name="avatar" listType="picture-circle" showUploadList={false} beforeUpload={() => false}>
                    {imageUrl ? (
                      <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center p-1">
                        <img src={imageUrl} alt="avatar" className="w-full h-full object-cover rounded-full" />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 hover:text-emerald-400 transition-colors mt-2">
                        <PlusOutlined className="text-2xl mb-1" />
                        <div className="text-xs">อัปโหลดรูป</div>
                      </div>
                    )}
                  </Upload>
                </Form.Item>
              </Col>
            </Row>

            <Divider titlePlacement="left" style={{ fontSize: 13, fontWeight: 600 }}>ข้อมูลส่วนตัว</Divider>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name="title" label="คำนำหน้า" rules={[{ required: true, message: 'กรุณาเลือก' }]}>
                  <Select placeholder="เลือก">
                    <Select.Option value="นาย">นาย</Select.Option>
                    <Select.Option value="นาง">นาง</Select.Option>
                    <Select.Option value="นางสาว">นางสาว</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={9}>
                <Form.Item name="firstName" label="ชื่อ" rules={[{ required: true, message: 'กรุณากรอกชื่อ' }]}>
                  <Input placeholder="ชื่อ" />
                </Form.Item>
              </Col>
              <Col span={9}>
                <Form.Item name="lastName" label="นามสกุล" rules={[{ required: true, message: 'กรุณากรอกนามสกุล' }]}>
                  <Input placeholder="นามสกุล" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="idCardNumber" label="เลขที่บัตรประชาชน" rules={[{ pattern: /^\d{13}$/, message: 'กรอก 13 หลัก' }]}>
                  <Input placeholder="กรอกเลขบัตรประชาชน 13 หลัก" maxLength={13} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="attendanceId" label="รหัสเข้าออกงาน">
                  <Input placeholder="กรอกรหัสเข้าออกงาน" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="birthDate" label="วันเกิด">
                  <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="เลือกวันเกิด" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="startDate" label="วันที่เริ่มงาน">
                  <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="เลือกวันที่เริ่มงาน" />
                </Form.Item>
              </Col>
            </Row>

            <Divider titlePlacement="left" style={{ fontSize: 13, fontWeight: 600 }}>ข้อมูลตำแหน่ง</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="missionGroup" label="กลุ่มภารกิจ">
                  <Select placeholder="เลือกกลุ่มภารกิจ">
                    <Select.Option value="กลุ่มภารกิจด้านการพยาบาล">กลุ่มภารกิจด้านการพยาบาล</Select.Option>
                    <Select.Option value="กลุ่มภารกิจด้านบริการปฐมภูมิ">กลุ่มภารกิจด้านบริการปฐมภูมิ</Select.Option>
                    <Select.Option value="กลุ่มภารกิจด้านอำนวยการ">กลุ่มภารกิจด้านอำนวยการ</Select.Option>
                    <Select.Option value="กลุ่มภารกิจด้านพัฒนาระบบบริการ">กลุ่มภารกิจด้านพัฒนาระบบบริการ</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="workGroup" label="กลุ่มงาน">
                  <Select placeholder="เลือกกลุ่มงาน">
                    <Select.Option value="กลุ่มงานการพยาบาลผู้ป่วยนอก">กลุ่มงานการพยาบาลผู้ป่วยนอก</Select.Option>
                    <Select.Option value="กลุ่มงานการพยาบาลผู้ป่วยใน">กลุ่มงานการพยาบาลผู้ป่วยใน</Select.Option>
                    <Select.Option value="กลุ่มงานเภสัชกรรม">กลุ่มงานเภสัชกรรม</Select.Option>
                    <Select.Option value="กลุ่มงานเทคนิคการแพทย์">กลุ่มงานเทคนิคการแพทย์</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="department" label="หอผู้ป่วย / สังกัด">
                  <Select placeholder="เลือก">
                    <Select.Option value="หอผู้ป่วยอายุรกรรม">หอผู้ป่วยอายุรกรรม</Select.Option>
                    <Select.Option value="หอผู้ป่วยศัลยกรรม">หอผู้ป่วยศัลยกรรม</Select.Option>
                    <Select.Option value="IT">IT</Select.Option>
                    <Select.Option value="HR">HR</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="position" label="ตำแหน่ง" rules={[{ required: true, message: 'กรุณาเลือก' }]}>
                  <Select placeholder="เลือกตำแหน่ง">
                    <Select.Option value="นายแพทย์">นายแพทย์</Select.Option>
                    <Select.Option value="พยาบาลวิชาชีพ">พยาบาลวิชาชีพ</Select.Option>
                    <Select.Option value="เภสัชกร">เภสัชกร</Select.Option>
                    <Select.Option value="นักเทคนิคการแพทย์">นักเทคนิคการแพทย์</Select.Option>
                    <Select.Option value="นักวิชาการสาธารณสุข">นักวิชาการสาธารณสุข</Select.Option>
                    <Select.Option value="เจ้าพนักงานสาธารณสุข">เจ้าพนักงานสาธารณสุข</Select.Option>
                    <Select.Option value="นักจัดการงานทั่วไป">นักจัดการงานทั่วไป</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="level" label="ระดับ">
                  <Select placeholder="เลือกระดับ">
                    <Select.Option value="ปฏิบัติการ">ปฏิบัติการ</Select.Option>
                    <Select.Option value="ชำนาญการ">ชำนาญการ</Select.Option>
                    <Select.Option value="ชำนาญการพิเศษ">ชำนาญการพิเศษ</Select.Option>
                    <Select.Option value="เชี่ยวชาญ">เชี่ยวชาญ</Select.Option>
                    <Select.Option value="ทรงคุณวุฒิ">ทรงคุณวุฒิ</Select.Option>
                    <Select.Option value="ปฏิบัติงาน">ปฏิบัติงาน</Select.Option>
                    <Select.Option value="ชำนาญงาน">ชำนาญงาน</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="staffType" label="ประเภทเจ้าหน้าที่">
                  <Select placeholder="เลือกประเภท">
                    <Select.Option value="ข้าราชการ">ข้าราชการ</Select.Option>
                    <Select.Option value="พนักงานราชการ">พนักงานราชการ</Select.Option>
                    <Select.Option value="พนักงานกระทรวงสาธารณสุข">พนักงานกระทรวงสาธารณสุข</Select.Option>
                    <Select.Option value="ลูกจ้างชั่วคราวรายเดือน">ลูกจ้างชั่วคราวรายเดือน</Select.Option>
                    <Select.Option value="ลูกจ้างชั่วคราวรายวัน">ลูกจ้างชั่วคราวรายวัน</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider titlePlacement="left" style={{ fontSize: 13, fontWeight: 600 }}>สถานะ</Divider>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="status" label="สถานะการปฏิบัติงาน" initialValue="ปฏิบัติงาน">
                  <Select>
                    <Select.Option value="ปฏิบัติงาน"><Tag color="green">ปฏิบัติงาน</Tag></Select.Option>
                    <Select.Option value="ลาออก"><Tag color="red">ลาออก</Tag></Select.Option>
                    <Select.Option value="เกษียณอายุ"><Tag color="gray">เกษียณอายุ</Tag></Select.Option>
                    <Select.Option value="ย้าย"><Tag color="orange">ย้าย</Tag></Select.Option>
                    <Select.Option value="เสียชีวิต"><Tag color="default">เสียชีวิต</Tag></Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Drawer>

        {/* ── View Drawer ── */}
        <Drawer
          title={null}
          size="large"
          onClose={() => setViewDrawerOpen(false)}
          open={viewDrawerOpen}
          styles={{
            body: { padding: 0 },
          }}
        >
          {viewRecord && (
            <>
              {/* Profile Header */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #006a5a 0%, #059669 100%)',
                  padding: '32px 24px 24px',
                }}
              >
                <div className="flex items-center gap-4">
                  <Avatar
                    src={viewRecord.avatar}
                    size={72}
                    icon={<UserOutlined />}
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: '3px solid rgba(255,255,255,0.3)' }}
                  />
                  <div>
                    <Title level={4} style={{ color: '#fff', margin: 0 }}>
                      {viewRecord.title}{viewRecord.firstName} {viewRecord.lastName}
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                      {viewRecord.position} {viewRecord.level ? `(${viewRecord.level})` : ''}
                    </Text>
                    <div className="mt-2">
                      <Tag color={STATUS_MAP[viewRecord.status]?.color || 'default'} style={{ borderRadius: 12 }}>
                        {viewRecord.status}
                      </Tag>
                      {viewRecord.staffType && (
                        <Tag style={{ borderRadius: 12 }}>{viewRecord.staffType}</Tag>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="px-6 pt-4">
                <Segmented
                  block
                  value={viewType}
                  onChange={(val) => setViewType(val as string)}
                  options={[
                    { label: 'รายละเอียด', value: '1' },
                    { label: 'ประวัติการทำงาน', value: '2' },
                    { label: 'เข้า-ออกงาน', value: '3' },
                  ]}
                  style={{ marginBottom: 20 }}
                />
              </div>

              <div className="px-6 pb-6">
                {/* Tab 1: Details */}
                {viewType === '1' && (
                  <Descriptions
                    column={1}
                    size="small"
                    styles={{
                      label: { width: 180, fontWeight: 500 },
                    }}
                  >
                    <Descriptions.Item label="เลขบัตรประชาชน">{viewRecord.idCardNumber || '-'}</Descriptions.Item>
                    <Descriptions.Item label="รหัสเข้าออกงาน">{viewRecord.attendanceId || '-'}</Descriptions.Item>
                    <Descriptions.Item label="วันเกิด">
                      {viewRecord.birthDate ? dayjs(viewRecord.birthDate).format('DD/MM/YYYY') : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="วันที่เริ่มงาน">
                      {viewRecord.startDate ? dayjs(viewRecord.startDate).format('DD/MM/YYYY') : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="กลุ่มภารกิจ">{viewRecord.missionGroup || '-'}</Descriptions.Item>
                    <Descriptions.Item label="กลุ่มงาน">{viewRecord.workGroup || '-'}</Descriptions.Item>
                    <Descriptions.Item label="สังกัด / หอผู้ป่วย">{viewRecord.department || '-'}</Descriptions.Item>
                  </Descriptions>
                )}

                {/* Tab 2: Work History */}
                {viewType === '2' && (
                  <Timeline
                    items={[
                      {
                        color: 'green',
                        content: (
                          <div>
                            <Text strong>ปัจจุบัน</Text>
                            <br />
                            <Text type="secondary">เลื่อนระดับเป็น {viewRecord.level || 'ชำนาญการ'} ({viewRecord.position})</Text>
                          </div>
                        ),
                      },
                      {
                        color: 'blue',
                        content: (
                          <div>
                            <Text strong>พ.ศ. 2562</Text>
                            <br />
                            <Text type="secondary">เริ่มปฏิบัติงานตำแหน่ง {viewRecord.position} สังกัด {viewRecord.department}</Text>
                          </div>
                        ),
                      },
                      {
                        color: 'gray',
                        content: (
                          <div>
                            <Text strong>พ.ศ. 2560</Text>
                            <br />
                            <Text type="secondary">จบการศึกษาและได้ใบประกอบวิชาชีพ</Text>
                          </div>
                        ),
                      },
                    ]}
                  />
                )}

                {/* Tab 3: Attendance */}
                {viewType === '3' && (
                  <div className="flex flex-col gap-4">
                    <Row gutter={[12, 12]}>
                      {[
                        { label: 'มาปกติ', value: 145, color: '#22c55e' },
                        { label: 'มาสาย', value: 12, color: '#f59e0b' },
                        { label: 'ลากิจ/ป่วย', value: 5, color: '#3b82f6' },
                        { label: 'ขาดสแกน', value: 2, color: '#ef4444' },
                      ].map((s, i) => (
                        <Col span={6} key={i}>
                          <Card size="small" style={{ borderRadius: 10, border: 'none', textAlign: 'center' }} styles={{ body: { padding: 12 } }}>
                            <div style={{ color: s.color, fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>{s.value}</div>
                            <Text type="secondary" style={{ fontSize: 11 }}>{s.label} (ครั้ง)</Text>
                          </Card>
                        </Col>
                      ))}
                    </Row>

                    <Text strong style={{ fontSize: 14, marginTop: 8 }}>รายการเข้า-ออกงานล่าสุด</Text>
                    <div className="flex flex-col rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                      {[
                        { date: '30 มี.ค. 2569', in: '07:45', out: '16:10', status: 'ปกติ' },
                        { date: '29 มี.ค. 2569', in: '07:50', out: '16:05', status: 'ปกติ' },
                        { date: '28 มี.ค. 2569', in: '08:45', out: '16:00', status: 'สาย' },
                        { date: '27 มี.ค. 2569', in: '-', out: '-', status: 'ขาดสแกน' },
                        { date: '26 มี.ค. 2569', in: '08:20', out: '16:15', status: 'สาย' },
                      ].map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-4"
                          style={{ borderBottom: index < 4 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                        >
                          <div>
                            <Text style={{ fontSize: 14 }}>{item.date}</Text>
                            <div className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                              เข้า: <span style={{ color: item.status === 'สาย' || item.status === 'ขาดสแกน' ? '#ef4444' : '#22c55e' }}>{item.in}</span>
                              {' | '}
                              ออก: <span style={{ color: item.status === 'ขาดสแกน' ? '#ef4444' : '#94a3b8' }}>{item.out}</span>
                            </div>
                          </div>
                          <Tag
                            color={item.status === 'ปกติ' ? 'green' : item.status === 'สาย' ? 'orange' : 'red'}
                            style={{ borderRadius: 12, margin: 0 }}
                          >
                            {item.status}
                          </Tag>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </Drawer>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#006a5a',
          borderRadius: 8,
        },
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
