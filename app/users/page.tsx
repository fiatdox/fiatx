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
  Tooltip
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
  SolutionOutlined
} from '@ant-design/icons'
import Swal from 'sweetalert2'

// --- Type Definitions ---
interface Employee {
  id: number
  name: string
  position: string
  email: string
  status: 'Active' | 'Inactive' | 'On Leave'
  department: string
}

type EmployeeFormData = Omit<Employee, 'id'>

// --- Mock Data ---
const initialData: Employee[] = [
  { id: 1, name: 'สมชาย ใจดี', position: 'Software Engineer', email: 'somchai@example.com', status: 'Active', department: 'IT' },
  { id: 2, name: 'สมหญิง รักเรียน', position: 'Product Manager', email: 'somying@example.com', status: 'Active', department: 'Product' },
  { id: 3, name: 'วิชัย กล้าหาญ', position: 'Designer', email: 'wichai@example.com', status: 'On Leave', department: 'Design' },
  { id: 4, name: 'มานี มีตา', position: 'HR Specialist', email: 'manee@example.com', status: 'Inactive', department: 'HR' },
  { id: 5, name: 'ปิติ ยินดี', position: 'Developer', email: 'piti@example.com', status: 'Active', department: 'IT' },
]

const Page = () => {
  const [employees, setEmployees] = useState<Employee[]>(initialData)
  const [searchText, setSearchText] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [form] = Form.useForm()

  // --- Stats ---
  const totalEmployees = employees.length
  const activeEmployees = employees.filter(e => e.status === 'Active').length
  const onLeaveEmployees = employees.filter(e => e.status === 'On Leave').length

  // --- Handlers ---
  const handleAdd = () => {
    setEditingEmployee(null)
    form.resetFields()
    setIsDrawerOpen(true)
  }

  const handleEdit = (record: Employee) => {
    setEditingEmployee(record)
    form.setFieldsValue(record)
    setIsDrawerOpen(true)
  }

  const handleDelete = (id: number) => {
    Swal.fire({
      title: 'ยืนยันการลบ?',
      text: 'ข้อมูลนี้จะถูกลบถาวร',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ลบข้อมูล',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'rounded-xl shadow-xl',
        confirmButton: 'rounded-lg',
        cancelButton: 'rounded-lg'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        setEmployees(employees.filter((emp) => emp.id !== id))
        message.success('ลบข้อมูลเรียบร้อยแล้ว')
      }
    })
  }

  const onFinish = (values: EmployeeFormData) => {
    if (editingEmployee) {
      setEmployees(employees.map(emp => emp.id === editingEmployee.id ? { ...values, id: editingEmployee.id } : emp))
      message.success('อัปเดตข้อมูลสำเร็จ')
    } else {
      const newId = employees.length > 0 ? Math.max(...employees.map(e => e.id)) + 1 : 1
      setEmployees([...employees, { ...values, id: newId }])
      message.success('เพิ่มพนักงานสำเร็จ')
    }
    setIsDrawerOpen(false)
  }

  // --- Table Columns ---
  const columns = [
    {
      title: 'พนักงาน',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Employee) => (
        <div className="flex items-center gap-3">
          <Avatar style={{ backgroundColor: '#006a5a' }} icon={<UserOutlined />} />
          <div>
            <div className="font-medium text-gray-900">{text}</div>
            <div className="text-xs text-gray-500">{record.email}</div>
          </div>
        </div>
      ),
      sorter: (a: Employee, b: Employee) => a.name.localeCompare(b.name),
    },
    {
      title: 'ตำแหน่ง',
      dataIndex: 'position',
      key: 'position',
      render: (text: string) => <span className="text-gray-700">{text}</span>,
      sorter: (a: Employee, b: Employee) => a.position.localeCompare(b.position),
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
        if (status === 'Inactive') color = 'red'
        if (status === 'On Leave') color = 'orange'
        return <Tag color={color} className="rounded-full px-3">{status}</Tag>
      },
    },
    {
      title: 'จัดการ',
      key: 'actions',
      render: (_: any, record: Employee) => (
        <Space size="small">
          <Tooltip title="แก้ไข">
            <Button type="text" shape="circle" icon={<EditOutlined className="text-blue-600" />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Tooltip title="ลบ">
            <Button type="text" shape="circle" icon={<DeleteOutlined className="text-red-500" />} onClick={() => handleDelete(record.id)} />
          </Tooltip>
          <Dropdown menu={{ items: [{ key: '1', label: 'ดูรายละเอียด' }, { key: '2', label: 'ประวัติการทำงาน' }] }}>
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
        token: {
          colorPrimary: '#006a5a',
          borderRadius: 8,
          fontFamily: 'var(--font-sarabun)',
        },
        components: {
          Card: {
            headerFontSize: 16,
          },
          Table: {
            headerBg: '#f8fafc',
            headerColor: '#475569',
            rowHoverBg: '#f0fdf4',
          }
        }
      }}
    >
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        {/* Header & Breadcrumb */}
        <div className="mb-8">
          <Breadcrumb
            items={[
              { href: '', title: <><HomeOutlined /> หน้าหลัก</> },
              { href: '', title: <><SolutionOutlined /> จัดการบุคลากร</> },
              { title: 'รายชื่อพนักงาน' },
            ]}
            className="mb-4"
          />
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 m-0">ระบบจัดการบุคลากร</h1>
              <p className="text-slate-500 mt-1">จัดการข้อมูลพนักงาน ตำแหน่ง และสิทธิ์การใช้งาน</p>
            </div>
            <div className="flex gap-3">
              <Button icon={<ExportOutlined />}>Export CSV</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} size="large" className="shadow-lg shadow-green-600/20">
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
                prefix={<TeamOutlined className="text-blue-500 bg-blue-50 p-2 rounded-lg mr-2" />}
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
                prefix={<UserOutlined className="text-green-500 bg-green-50 p-2 rounded-lg mr-2" />}
                suffix="คน"
                styles={{ content: { color: '#16a34a', fontWeight: 'bold' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card variant="borderless" className="shadow-sm hover:shadow-md transition-shadow">
              <Statistic
                title="ลาพักร้อน/หยุด"
                value={onLeaveEmployees}
                prefix={<SolutionOutlined className="text-orange-500 bg-orange-50 p-2 rounded-lg mr-2" />}
                suffix="คน"
                styles={{ content: { color: '#ea580c', fontWeight: 'bold' } }}
              />
            </Card>
          </Col>
        </Row>

        {/* Main Content Card */}
        <Card variant="borderless" className="shadow-sm rounded-xl overflow-hidden">
          <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-slate-700">รายชื่อพนักงาน</span>
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
            className="border border-slate-100 rounded-lg"
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
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="name"
                  label="ชื่อ-นามสกุล"
                  rules={[{ required: true, message: 'กรุณากรอกชื่อ-นามสกุล' }]}
                >
                  <Input placeholder="เช่น สมชาย ใจดี" prefix={<UserOutlined className="text-slate-400" />} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="email"
                  label="อีเมล"
                  rules={[{ required: true, message: 'กรุณากรอกอีเมล' }, { type: 'email', message: 'รูปแบบอีเมลไม่ถูกต้อง' }]}
                >
                  <Input placeholder="example@domain.com" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="position"
                  label="ตำแหน่ง"
                  rules={[{ required: true, message: 'กรุณากรอกตำแหน่ง' }]}
                >
                  <Input placeholder="เช่น Developer" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="department"
                  label="แผนก"
                  rules={[{ required: true, message: 'กรุณาเลือกแผนก' }]}
                >
                  <Select placeholder="เลือกแผนก">
                    <Select.Option value="IT">IT</Select.Option>
                    <Select.Option value="HR">HR</Select.Option>
                    <Select.Option value="Product">Product</Select.Option>
                    <Select.Option value="Design">Design</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="status"
                  label="สถานะ"
                  initialValue="Active"
                >
                  <Select>
                    <Select.Option value="Active"><Tag color="green">Active</Tag></Select.Option>
                    <Select.Option value="Inactive"><Tag color="red">Inactive</Tag></Select.Option>
                    <Select.Option value="On Leave"><Tag color="orange">On Leave</Tag></Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="รายละเอียดเพิ่มเติม">
              <Input.TextArea rows={4} placeholder="หมายเหตุ..." />
            </Form.Item>
          </Form>
        </Drawer>
      </div>
    </ConfigProvider>
  )
}

export default Page
