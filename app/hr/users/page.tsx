'use client'
import React, { useState } from 'react'
import {
  Table,
  Input,
  Button,
  Space,
  ConfigProvider,
  Card,
  Statistic,
  Row,
  Col,
  Tag,
  Avatar,
  Drawer,
  Form,
  Select,
  Breadcrumb,
  Dropdown,
  message,
  Tooltip,
  theme,
  DatePicker,
  Upload,
  Descriptions,
  Timeline
} from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  UserOutlined,
  TeamOutlined,
  PlusOutlined,
  ExportOutlined,
  MoreOutlined,
  HomeOutlined,
  SolutionOutlined,
  ApartmentOutlined
} from '@ant-design/icons'
import Swal from 'sweetalert2'
import dayjs from 'dayjs'
import Navbar from '@/app/components/Navbar'

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

const Page = () => {
  const [employees, setEmployees] = useState<Employee[]>(initialData)
  const [searchText, setSearchText] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false)
  const [viewRecord, setViewRecord] = useState<Employee | null>(null)
  const [viewType, setViewType] = useState<string>('1')
  const [form] = Form.useForm()

  // --- Stats ---
  const totalEmployees = employees.length
  const activeEmployees = employees.filter(e => e.status === 'ปฏิบัติงาน').length
  const onLeaveEmployees = employees.filter(e => e.status !== 'ปฏิบัติงาน').length

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
    const file = info.fileList[info.fileList.length - 1]?.originFileObj || info.file;
    if (file) {
      if (!file.type?.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => setImageUrl(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImageUrl(null);
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
      message.success('อัปเดตข้อมูลสำเร็จ')
    } else {
      const newId = employees.length > 0 ? Math.max(...employees.map(e => e.id)) + 1 : 1
      setEmployees([...employees, { ...finalValues, id: newId }])
      message.success('เพิ่มพนักงานสำเร็จ')
    }
    setIsDrawerOpen(false)
  }

  // --- Table Columns ---
  const columns = [
    {
      title: 'พนักงาน',
      key: 'name',
      render: (_: any, record: Employee) => (
        <div className="flex items-center gap-3">
          <Avatar src={record.avatar} style={{ backgroundColor: '#006a5a' }} icon={<UserOutlined />} />
          <div>
            <div className="font-medium text-slate-200">{record.title} {record.firstName} {record.lastName}</div>
            {record.idCardNumber && <div className="text-xs text-slate-400 mt-1">เลขบัตร: {record.idCardNumber}</div>}
          </div>
        </div>
      ),
      sorter: (a: Employee, b: Employee) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
    },
    {
      title: 'ตำแหน่ง',
      dataIndex: 'position',
      key: 'position',
      render: (text: string, record: Employee) => (
        <div>
          <div className="text-slate-300">{text || '-'}</div>
          {record.staffType && <div className="text-xs text-slate-400 mt-1">{record.staffType}</div>}
        </div>
      ),
      sorter: (a: Employee, b: Employee) => a.position.localeCompare(b.position),
    },
    {
      title: 'ประเภทเจ้าหน้าที่',
      dataIndex: 'staffType',
      key: 'staffType',
      render: (text?: string) => <span className="text-slate-300">{text || '-'}</span>,
      sorter: (a: Employee, b: Employee) => (a.staffType || '').localeCompare(b.staffType || ''),
    },
    {
      title: 'แผนก',
      dataIndex: 'department',
      key: 'department',
      filters: [
        { text: 'IT', value: 'IT' },
        { text: 'HR', value: 'HR' },
        { text: 'Product', value: 'Product' },
        { text: 'Design', value: 'Design' },
      ],
      onFilter: (value: any, record: Employee) => record.department === value,
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'green'
        if (status === 'ลาออก') color = 'red'
        if (status === 'เกษียณอายุ') color = 'gray'
        if (status === 'ย้าย') color = 'orange'
        if (status === 'เสียชีวิต') color = 'default'
        return <Tag color={color} className="rounded-full px-3">{status}</Tag>
      },
    },
    {
      title: 'จัดการ',
      key: 'actions',
      render: (_: any, record: Employee) => (
        <Space size="small">
          <Tooltip title="แก้ไข">
            <Button type="text" shape="circle" icon={<EditOutlined className="text-blue-400" />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Dropdown
            menu={{
              items: [
                { key: '1', label: 'ดูรายละเอียด' },
                { key: '2', label: 'ประวัติการทำงาน' },
                { key: '3', label: 'ประวัติการเข้าออกงาน' }
              ],
              onClick: ({ key }) => handleMenuClick(key, record)
            }}
          >
            <Button type="text" shape="circle" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ]

  const filteredEmployees = employees.filter((employee) =>
    Object.values(employee).some((value) => String(value).toLowerCase().includes(searchText.toLowerCase()))
  )

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#006a5a',
          borderRadius: 8,
          fontFamily: 'var(--font-sarabun)',
        },
        components: {
          Card: {
            headerFontSize: 16,
          },
        }
      }}
    >
      <div className="min-h-screen bg-slate-900 text-slate-200">
        <Navbar />
        <div className="p-6 md:p-8">
          {/* Header & Breadcrumb */}
          <div className="mb-8">
          <Breadcrumb
            items={[
              { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
              { href: '/hr', title: <><SolutionOutlined /> ระบบงานบุคคล</> },
              { title: 'จัดการบุคลากร' },
            ]}
            className="mb-4"
          />
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-200 m-0">ระบบจัดการบุคลากร</h1>
              <p className="text-slate-400 mt-1">จัดการข้อมูลพนักงาน ตำแหน่ง และสิทธิ์การใช้งาน</p>
            </div>
            <div className="flex gap-3">
              <Button 
                type="default" 
                ghost 
                icon={<ApartmentOutlined />} 
                onClick={() => window.location.href = '/hr/supervisor'}
              >
                ผังผู้บริหาร
              </Button>
              <Button icon={<ExportOutlined />}>Export CSV</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} size="large">
                เพิ่มพนักงานใหม่
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <Row gutter={[16, 16]} className="mb-8">
          <Col xs={24} sm={8}>
            <Card variant="borderless" className="shadow-sm hover:shadow-md transition-shadow">
              <Statistic
                title="พนักงานทั้งหมด"
                value={totalEmployees}
                prefix={<TeamOutlined className="text-blue-400 bg-blue-900/30 p-2 rounded-lg mr-2" />}
                suffix="คน"
                styles={{ content: { fontWeight: 'bold' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card variant="borderless" className="shadow-sm hover:shadow-md transition-shadow">
              <Statistic
                title="กำลังปฏิบัติงาน"
                value={activeEmployees}
                prefix={<UserOutlined className="text-green-400 bg-green-900/30 p-2 rounded-lg mr-2" />}
                suffix="คน"
                styles={{ content: { color: '#4ade80', fontWeight: 'bold' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card variant="borderless" className="shadow-sm hover:shadow-md transition-shadow">
              <Statistic
                title="ไม่ได้ปฏิบัติงาน"
                value={onLeaveEmployees}
                prefix={<SolutionOutlined className="text-orange-400 bg-orange-900/30 p-2 rounded-lg mr-2" />}
                suffix="คน"
                styles={{ content: { color: '#fb923c', fontWeight: 'bold' } }}
              />
            </Card>
          </Col>
        </Row>

        {/* Main Content Card */}
        <Card variant="borderless" className="shadow-sm rounded-xl overflow-hidden">
          <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-slate-200">รายชื่อพนักงาน</span>
              <Tag color="blue">{totalEmployees} users</Tag>
            </div>
            <Input
              placeholder="ค้นหาชื่อ, ตำแหน่ง, อีเมล..."
              prefix={<SearchOutlined className="text-slate-400" />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
              allowClear
              className="rounded-lg"
            />
          </div>
          
          <Table
            columns={columns}
            dataSource={filteredEmployees}
            rowKey="id"
            pagination={{
              pageSize: 5,
              showTotal: (total, range) => `แสดง ${range[0]}-${range[1]} จาก ${total} รายการ`,
              className: "mt-4"
            }}
            className="border border-slate-700 rounded-lg"
          />
        </Card>

        {/* Drawer Form */}
        <Drawer
          title={editingEmployee ? "แก้ไขข้อมูลพนักงาน" : "เพิ่มพนักงานใหม่"}
          size="large"
          onClose={() => setIsDrawerOpen(false)}
          open={isDrawerOpen}
          styles={{
            body: { paddingBottom: 80 },
          }}
          extra={
            <Space>
              <Button onClick={() => setIsDrawerOpen(false)}>ยกเลิก</Button>
              <Button onClick={() => form.submit()} type="primary">
                บันทึก
              </Button>
            </Space>
          }
        >
          <Form layout="vertical" form={form} onFinish={onFinish} requiredMark="optional">
            <Row gutter={16} justify="center" className="mb-6">
              <Col>
                <Form.Item 
                  name="avatar" 
                  valuePropName="fileList" 
                  getValueFromEvent={(e: any) => {
                    handleAvatarChange(e);
                    return Array.isArray(e) ? e : e?.fileList;
                  }}
                >
                  <Upload
                    name="avatar"
                    listType="picture-circle"
                    showUploadList={false}
                    beforeUpload={() => false}
                  >
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
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item
                  name="title"
                  label="คำนำหน้า"
                  rules={[{ required: true, message: 'กรุณาเลือกคำนำหน้า' }]}
                >
                  <Select placeholder="ตัวเลือก">
                    <Select.Option value="นาย">นาย</Select.Option>
                    <Select.Option value="นาง">นาง</Select.Option>
                    <Select.Option value="นางสาว">นางสาว</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={9}>
                <Form.Item
                  name="firstName"
                  label="ชื่อ"
                  rules={[{ required: true, message: 'กรุณากรอกชื่อ' }]}
                >
                  <Input placeholder="ชื่อ" />
                </Form.Item>
              </Col>
              <Col span={9}>
                <Form.Item
                  name="lastName"
                  label="นามสกุล"
                  rules={[{ required: true, message: 'กรุณากรอกนามสกุล' }]}
                >
                  <Input placeholder="นามสกุล" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="idCardNumber"
                  label="เลขที่บัตรประชาชน"
                  rules={[{ pattern: /^\d{13}$/, message: 'กรุณากรอกเลขบัตร 13 หลัก' }]}
                >
                  <Input placeholder="กรอกเลขบัตรประชาชน 13 หลัก" maxLength={13} />
                </Form.Item>
              </Col>
            </Row>
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
                <Form.Item
                  name="department"
                  label="หอผู้ป่วย"
                >
                  <Select placeholder="เลือกหอผู้ป่วย">
                    <Select.Option value="หอผู้ป่วยอายุรกรรม">หอผู้ป่วยอายุรกรรม</Select.Option>
                    <Select.Option value="หอผู้ป่วยศัลยกรรม">หอผู้ป่วยศัลยกรรม</Select.Option>
                    <Select.Option value="IT">IT</Select.Option>
                    <Select.Option value="HR">HR</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="position"
                  label="ตำแหน่ง"
                  rules={[{ required: true, message: 'กรุณาเลือกตำแหน่ง' }]}
                >
                  <Select placeholder="เลือกตำแหน่ง">
                    <Select.Option value="นายแพทย์">นายแพทย์</Select.Option>
                    <Select.Option value="พยาบาลวิชาชีพ">พยาบาลวิชาชีพ</Select.Option>
                    <Select.Option value="เภสัชกร">เภสัชกร</Select.Option>
                    <Select.Option value="นักเทคนิคการแพทย์">นักเทคนิคการแพทย์</Select.Option>
                    <Select.Option value="นักวิชาการสาธารณสุข">นักวิชาการสาธารณสุข</Select.Option>
                    <Select.Option value="เจ้าพนักงานสาธารณสุข">เจ้าพนักงานสาธารณสุข</Select.Option>
                    <Select.Option value="นักจัดการงานทั่วไป">นักจัดการงานทั่วไป</Select.Option>
                    <Select.Option value="Developer">Developer</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
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
            </Row>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="staffType" label="ประเภทเจ้าหน้าที่">
                  <Select placeholder="เลือกประเภทเจ้าหน้าที่">
                    <Select.Option value="ข้าราชการ">ข้าราชการ</Select.Option>
                    <Select.Option value="พนักงานราชการ">พนักงานราชการ</Select.Option>
                    <Select.Option value="พนักงานกระทรวงสาธารณสุข">พนักงานกระทรวงสาธารณสุข</Select.Option>
                    <Select.Option value="ลูกจ้างชั่วคราวรายเดือน">ลูกจ้างชั่วคราวรายเดือน</Select.Option>
                    <Select.Option value="ลูกจ้างชั่วคราวรายวัน">ลูกจ้างชั่วคราวรายวัน</Select.Option>
                  </Select>
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
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="attendanceId" label="รหัสเข้าออกงาน">
                  <Input placeholder="กรอกรหัสเข้าออกงาน" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="status"
                  label="สถานะ"
                  initialValue="ปฏิบัติงาน"
                >
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
        {/* View Drawer */}
        <Drawer
          title={
            viewType === '1' ? 'รายละเอียดพนักงาน' :
            viewType === '2' ? 'ประวัติการทำงาน' :
            'ประวัติการเข้าออกงาน'
          }
          size="large"
          onClose={() => setViewDrawerOpen(false)}
          open={viewDrawerOpen}
          styles={{
            body: { backgroundColor: '#0f172a', padding: '24px' },
            header: { backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }
          }}
        >
          {viewRecord && viewType === '1' && (
            <Descriptions column={1} bordered size="small" styles={{ label: { width: '200px', backgroundColor: '#1e293b', color: '#94a3b8', borderColor: '#334155' }, content: { backgroundColor: '#0f172a', color: '#e2e8f0', borderColor: '#334155' } }}>
              <Descriptions.Item label="รูปประจำตัว">
                <Avatar src={viewRecord.avatar} size={64} icon={<UserOutlined />} style={{ backgroundColor: '#006a5a' }} />
              </Descriptions.Item>
              <Descriptions.Item label="ชื่อ-นามสกุล">{`${viewRecord.title} ${viewRecord.firstName} ${viewRecord.lastName}`}</Descriptions.Item>
              <Descriptions.Item label="เลขที่บัตรประชาชน">{viewRecord.idCardNumber || '-'}</Descriptions.Item>
              <Descriptions.Item label="ตำแหน่ง">{viewRecord.position}</Descriptions.Item>
              <Descriptions.Item label="ระดับ">{viewRecord.level || '-'}</Descriptions.Item>
              <Descriptions.Item label="สถานะ"><Tag color="green">{viewRecord.status}</Tag></Descriptions.Item>
              <Descriptions.Item label="กลุ่มภารกิจ">{viewRecord.missionGroup || '-'}</Descriptions.Item>
              <Descriptions.Item label="กลุ่มงาน">{viewRecord.workGroup || '-'}</Descriptions.Item>
              <Descriptions.Item label="หอผู้ป่วย">{viewRecord.department || '-'}</Descriptions.Item>
              <Descriptions.Item label="ประเภทเจ้าหน้าที่">{viewRecord.staffType || '-'}</Descriptions.Item>
              <Descriptions.Item label="รหัสเข้าออกงาน">{viewRecord.attendanceId || '-'}</Descriptions.Item>
            </Descriptions>
          )}

          {viewRecord && viewType === '2' && (
            <div className="pt-4">
              <Timeline
                items={[
                  { color: 'green', content: <span className="text-slate-200">ปัจจุบัน - เลื่อนระดับเป็น {viewRecord.level || 'ชำนาญการ'} ({viewRecord.position})</span> },
                  { color: 'blue', content: <span className="text-slate-300">พ.ศ. 2562 - เริ่มต้นปฏิบัติงานในตำแหน่ง {viewRecord.position} แผนก {viewRecord.department}</span> },
                  { color: 'gray', content: <span className="text-slate-400">พ.ศ. 2560 - จบการศึกษาและได้ใบประกอบวิชาชีพ</span> },
                ]}
              />
            </div>
          )}

          {viewRecord && viewType === '3' && (
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-200 font-semibold text-lg">สรุปยอดปีงบประมาณ 2569</span>
                <Select defaultValue="2569" style={{ width: 120 }}>
                  <Select.Option value="2569">ปี 2569</Select.Option>
                  <Select.Option value="2568">ปี 2568</Select.Option>
                </Select>
              </div>
              <Row gutter={16} className="mb-2">
                <Col span={6}>
                  <Card size="small" className="bg-[#0f172a] border-slate-700" styles={{ body: { padding: '12px', textAlign: 'center' } }}>
                    <div className="text-emerald-400 text-3xl font-bold mb-1">145</div>
                    <div className="text-slate-400 text-xs">มาปกติ (ครั้ง)</div>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" className="bg-[#0f172a] border-slate-700" styles={{ body: { padding: '12px', textAlign: 'center' } }}>
                    <div className="text-amber-400 text-3xl font-bold mb-1">12</div>
                    <div className="text-slate-400 text-xs">มาสาย (ครั้ง)</div>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" className="bg-[#0f172a] border-slate-700" styles={{ body: { padding: '12px', textAlign: 'center' } }}>
                    <div className="text-blue-400 text-3xl font-bold mb-1">5</div>
                    <div className="text-slate-400 text-xs">ลากิจ/ป่วย (ครั้ง)</div>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" className="bg-[#0f172a] border-slate-700" styles={{ body: { padding: '12px', textAlign: 'center' } }}>
                    <div className="text-rose-400 text-3xl font-bold mb-1">2</div>
                    <div className="text-slate-400 text-xs">ขาดสแกน (ครั้ง)</div>
                  </Card>
                </Col>
              </Row>

              <div className="flex justify-between items-center mt-2">
                <span className="text-slate-200 font-semibold text-base">รายการเข้า-ออกงานล่าสุด</span>
              </div>
              <div className="flex flex-col border border-slate-700 rounded-lg overflow-hidden">
                {[
                  { date: '30 มีนาคม 2569', in: '07:45', out: '16:10', status: 'ปกติ' },
                  { date: '29 มีนาคม 2569', in: '07:50', out: '16:05', status: 'ปกติ' },
                  { date: '28 มีนาคม 2569', in: '08:45', out: '16:00', status: 'สาย' },
                  { date: '27 มีนาคม 2569', in: '-', out: '-', status: 'ขาดสแกน' },
                  { date: '26 มีนาคม 2569', in: '08:20', out: '16:15', status: 'สาย' },
                ].map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-4 bg-[#0f172a] border-b border-slate-700 last:border-0 hover:bg-[#1e293b] transition-colors">
                    <div>
                      <div className="text-slate-200 font-medium mb-1">{item.date}</div>
                      <div className="text-slate-400 text-sm">
                        เข้า: <span className={item.status === 'สาย' || item.status === 'ขาดสแกน' ? 'text-rose-400 font-medium' : 'text-emerald-400'}>{item.in}</span> | ออก: <span className={item.status === 'ขาดสแกน' ? 'text-rose-400 font-medium' : ''}>{item.out}</span>
                      </div>
                    </div>
                    <Tag 
                      color={item.status === 'ปกติ' ? 'green' : (item.status === 'สาย' ? 'orange' : 'red')} 
                      className="m-0 rounded-full px-3 py-0.5 text-xs font-medium border-0"
                    >
                      {item.status}
                    </Tag>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Drawer>
        </div>
      </div>
    </ConfigProvider>
  )
}

export default Page
