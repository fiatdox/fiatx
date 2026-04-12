'use client'
import React, { useState } from 'react'
import {
  Table, Input, Button, Space, ConfigProvider, Card, Tag, Drawer, Form,
  Select, Breadcrumb, message, Tooltip, Row, Col, Statistic, Avatar, theme
} from 'antd'
import {
  EditOutlined, DeleteOutlined, SearchOutlined, UserOutlined,
  PlusOutlined, HomeOutlined, SettingOutlined, ToolOutlined
} from '@ant-design/icons'
import Navbar from '../../../components/Navbar'
import Swal from 'sweetalert2'

const { Search } = Input

interface MaintenanceChief {
  id: number
  name: string
  phone: string
  department: string
  status: 'ว่าง' | 'ติดภารกิจ' | 'ลาพักผ่อน'
  remark?: string
}

const initialChiefs: MaintenanceChief[] = [
  { id: 1, name: 'นายประสิทธิ์ ช่างเก่ง', phone: '081-111-2233', department: 'ไฟฟ้า', status: 'ว่าง' },
  { id: 2, name: 'นายสมศักดิ์ ประปาดี', phone: '082-222-3344', department: 'ประปา', status: 'ติดภารกิจ', remark: 'ดูแลงานซ่อมท่อ IPD ชั้น 3' },
  { id: 3, name: 'นายวิโรจน์ แอร์เย็น', phone: '083-333-4455', department: 'เครื่องปรับอากาศ', status: 'ว่าง' },
  { id: 4, name: 'นายสุรชัย อาคารมั่น', phone: '084-444-5566', department: 'อาคาร/โยธา', status: 'ลาพักผ่อน', remark: 'ลาถึง 15/04/2026' },
]

const departmentOptions = [
  { label: 'ไฟฟ้า', value: 'ไฟฟ้า' },
  { label: 'ประปา', value: 'ประปา' },
  { label: 'เครื่องปรับอากาศ', value: 'เครื่องปรับอากาศ' },
  { label: 'อาคาร/โยธา', value: 'อาคาร/โยธา' },
]

const statusOptions = [
  { label: 'ว่าง', value: 'ว่าง' },
  { label: 'ติดภารกิจ', value: 'ติดภารกิจ' },
  { label: 'ลาพักผ่อน', value: 'ลาพักผ่อน' },
]

const getStatusTag = (status: string) => {
  switch (status) {
    case 'ว่าง': return <Tag color="success">{status}</Tag>
    case 'ติดภารกิจ': return <Tag color="processing">{status}</Tag>
    case 'ลาพักผ่อน': return <Tag color="warning">{status}</Tag>
    default: return <Tag>{status}</Tag>
  }
}

export default function MaintenanceChefsPage() {
  const [chiefs, setChiefs] = useState<MaintenanceChief[]>(initialChiefs)
  const [searchText, setSearchText] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingChief, setEditingChief] = useState<MaintenanceChief | null>(null)
  const [form] = Form.useForm()

  const filteredChiefs = chiefs.filter(c =>
    c.name.toLowerCase().includes(searchText.toLowerCase()) ||
    c.phone.includes(searchText) ||
    c.department.includes(searchText)
  )

  const totalChiefs = chiefs.length
  const availableChiefs = chiefs.filter(c => c.status === 'ว่าง').length
  const onDutyChiefs = chiefs.filter(c => c.status === 'ติดภารกิจ').length
  const onLeaveChiefs = chiefs.filter(c => c.status === 'ลาพักผ่อน').length

  const openAddDrawer = () => {
    setEditingChief(null)
    form.resetFields()
    setIsDrawerOpen(true)
  }

  const openEditDrawer = (chief: MaintenanceChief) => {
    setEditingChief(chief)
    form.setFieldsValue({ ...chief })
    setIsDrawerOpen(true)
  }

  const handleDelete = (chief: MaintenanceChief) => {
    Swal.fire({
      title: 'ยืนยันการลบ?',
      text: `ต้องการลบข้อมูลของ "${chief.name}" ใช่หรือไม่`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
    }).then(result => {
      if (result.isConfirmed) {
        setChiefs(prev => prev.filter(c => c.id !== chief.id))
        message.success('ลบข้อมูลหัวหน้าช่างเรียบร้อยแล้ว')
      }
    })
  }

  const handleSave = (values: any) => {
    if (editingChief) {
      setChiefs(prev => prev.map(c => c.id === editingChief.id ? { ...c, ...values } : c))
      message.success('แก้ไขข้อมูลเรียบร้อยแล้ว')
    } else {
      const newChief: MaintenanceChief = {
        id: Date.now(),
        ...values,
      }
      setChiefs(prev => [...prev, newChief])
      message.success('เพิ่มหัวหน้าช่างเรียบร้อยแล้ว')
    }
    setIsDrawerOpen(false)
    form.resetFields()
  }

  const columns = [
    {
      title: 'ชื่อ-นามสกุล',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: MaintenanceChief) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#006a5a' }} />
          <div>
            <div className="font-medium">{name}</div>
            <div className="text-xs text-gray-400">{record.phone}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'แผนก/ความเชี่ยวชาญ',
      dataIndex: 'department',
      key: 'department',
      render: (dept: string) => (
        <Tag icon={<ToolOutlined />} color="blue">{dept}</Tag>
      ),
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'หมายเหตุ',
      dataIndex: 'remark',
      key: 'remark',
      render: (remark?: string) => remark ? <span className="text-gray-500 text-sm">{remark}</span> : '-',
    },
    {
      title: 'จัดการ',
      key: 'action',
      width: 100,
      render: (_: any, record: MaintenanceChief) => (
        <Space>
          <Tooltip title="แก้ไข">
            <Button type="text" icon={<EditOutlined />} onClick={() => openEditDrawer(record)} />
          </Tooltip>
          <Tooltip title="ลบ">
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#006a5a', borderRadius: 8 } }}>
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <div className="p-6 md:p-8">
          <Breadcrumb
            items={[
              { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
              { href: '/general', title: 'งานบริหารงานทั่วไป' },
              { href: '/general/settings', title: <><SettingOutlined /> ตั้งค่า</> },
              { title: 'จัดการหัวหน้าช่างซ่อมบำรุง' },
            ]}
            className="mb-6"
          />

          <div className="w-full">
            <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold m-0">จัดการหัวหน้าช่างซ่อมบำรุง</h1>
                <p className="text-slate-400 mt-1">บริหารจัดการข้อมูลหัวหน้าช่างประจำแผนกต่างๆ</p>
              </div>
              <Button type="primary" icon={<PlusOutlined />} size="large" onClick={openAddDrawer}>
                เพิ่มหัวหน้าช่าง
              </Button>
            </div>

            <Row gutter={[16, 16]} className="mb-6">
              <Col xs={12} sm={6}>
                <Card variant="borderless" className="shadow-sm" style={{ borderBottom: '3px solid #006a5a' }}>
                  <Statistic title="ทั้งหมด" value={totalChiefs} prefix={<UserOutlined />} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card variant="borderless" className="shadow-sm" style={{ borderBottom: '3px solid #22c55e' }}>
                  <Statistic title="ว่าง" value={availableChiefs} styles={{ content: { color: '#22c55e' } }} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card variant="borderless" className="shadow-sm" style={{ borderBottom: '3px solid #3b82f6' }}>
                  <Statistic title="ติดภารกิจ" value={onDutyChiefs} styles={{ content: { color: '#3b82f6' } }} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card variant="borderless" className="shadow-sm" style={{ borderBottom: '3px solid #f59e0b' }}>
                  <Statistic title="ลาพักผ่อน" value={onLeaveChiefs} styles={{ content: { color: '#f59e0b' } }} />
                </Card>
              </Col>
            </Row>

            <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 12 }}>
              <div className="mb-4">
                <Search
                  placeholder="ค้นหาด้วยชื่อ, เบอร์โทร, หรือแผนก"
                  allowClear
                  prefix={<SearchOutlined />}
                  onChange={e => setSearchText(e.target.value)}
                  style={{ maxWidth: 400 }}
                />
              </div>
              <Table
                columns={columns}
                dataSource={filteredChiefs}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                onHeaderRow={() => ({ style: { backgroundColor: '#f8fafc' } })}
                onRow={() => ({ style: { transition: 'background 0.2s' } })}
              />
            </Card>
          </div>
        </div>
      </div>

      <Drawer
        title={editingChief ? 'แก้ไขข้อมูลหัวหน้าช่าง' : 'เพิ่มหัวหน้าช่างใหม่'}
        open={isDrawerOpen}
        onClose={() => { setIsDrawerOpen(false); form.resetFields() }}
        width={480}
        footer={
          <Space className="float-right">
            <Button onClick={() => { setIsDrawerOpen(false); form.resetFields() }}>ยกเลิก</Button>
            <Button type="primary" onClick={() => form.submit()}>บันทึก</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item label="ชื่อ-นามสกุล" name="name" rules={[{ required: true, message: 'กรุณาระบุชื่อ-นามสกุล' }]}>
            <Input placeholder="ระบุชื่อ-นามสกุล" size="large" />
          </Form.Item>
          <Form.Item label="เบอร์ติดต่อ" name="phone" rules={[{ required: true, message: 'กรุณาระบุเบอร์ติดต่อ' }]}>
            <Input placeholder="เช่น 081-234-5678" size="large" />
          </Form.Item>
          <Form.Item label="แผนก/ความเชี่ยวชาญ" name="department" rules={[{ required: true, message: 'กรุณาเลือกแผนก' }]}>
            <Select placeholder="เลือกแผนก" options={departmentOptions} size="large" />
          </Form.Item>
          <Form.Item label="สถานะ" name="status" rules={[{ required: true, message: 'กรุณาเลือกสถานะ' }]}>
            <Select placeholder="เลือกสถานะ" options={statusOptions} size="large" />
          </Form.Item>
          <Form.Item label="หมายเหตุ" name="remark">
            <Input.TextArea rows={3} placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)" />
          </Form.Item>
        </Form>
      </Drawer>
    </ConfigProvider>
  )
}
