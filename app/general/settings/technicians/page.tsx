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

interface Technician {
  id: number
  name: string
  phone: string
  specialty: string
  chiefName: string
  status: 'ว่าง' | 'ติดภารกิจ' | 'ลาพักผ่อน'
  remark?: string
}

const initialTechnicians: Technician[] = [
  { id: 1, name: 'นายสมเกียรติ ช่างไฟ', phone: '085-111-2233', specialty: 'ไฟฟ้า', chiefName: 'นายประสิทธิ์ ช่างเก่ง', status: 'ว่าง' },
  { id: 2, name: 'นายวิชัย ใจสู้', phone: '086-222-3344', specialty: 'ไฟฟ้า', chiefName: 'นายประสิทธิ์ ช่างเก่ง', status: 'ติดภารกิจ', remark: 'ซ่อมไฟ OPD ชั้น 2' },
  { id: 3, name: 'นายสมศักดิ์ น้ำดี', phone: '087-333-4455', specialty: 'ประปา', chiefName: 'นายสมศักดิ์ ประปาดี', status: 'ว่าง' },
  { id: 4, name: 'นายสมชาย แอร์เย็น', phone: '088-444-5566', specialty: 'เครื่องปรับอากาศ', chiefName: 'นายวิโรจน์ แอร์เย็น', status: 'ว่าง' },
  { id: 5, name: 'นายวีระ อาคารแกร่ง', phone: '089-555-6677', specialty: 'อาคาร/โยธา', chiefName: 'นายสุรชัย อาคารมั่น', status: 'ลาพักผ่อน', remark: 'ลาถึง 12/04/2026' },
]

const specialtyOptions = [
  { label: 'ไฟฟ้า', value: 'ไฟฟ้า' },
  { label: 'ประปา', value: 'ประปา' },
  { label: 'เครื่องปรับอากาศ', value: 'เครื่องปรับอากาศ' },
  { label: 'อาคาร/โยธา', value: 'อาคาร/โยธา' },
  { label: 'เครื่องมือแพทย์', value: 'เครื่องมือแพทย์' },
]

const chiefOptions = [
  { label: 'นายประสิทธิ์ ช่างเก่ง (ไฟฟ้า)', value: 'นายประสิทธิ์ ช่างเก่ง' },
  { label: 'นายสมศักดิ์ ประปาดี (ประปา)', value: 'นายสมศักดิ์ ประปาดี' },
  { label: 'นายวิโรจน์ แอร์เย็น (แอร์)', value: 'นายวิโรจน์ แอร์เย็น' },
  { label: 'นายสุรชัย อาคารมั่น (อาคาร)', value: 'นายสุรชัย อาคารมั่น' },
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

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<Technician[]>(initialTechnicians)
  const [searchText, setSearchText] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingTech, setEditingTech] = useState<Technician | null>(null)
  const [form] = Form.useForm()

  const filteredTechnicians = technicians.filter(t =>
    t.name.toLowerCase().includes(searchText.toLowerCase()) ||
    t.phone.includes(searchText) ||
    t.specialty.includes(searchText)
  )

  const totalTechs = technicians.length
  const availableTechs = technicians.filter(t => t.status === 'ว่าง').length
  const onDutyTechs = technicians.filter(t => t.status === 'ติดภารกิจ').length
  const onLeaveTechs = technicians.filter(t => t.status === 'ลาพักผ่อน').length

  const openAddDrawer = () => {
    setEditingTech(null)
    form.resetFields()
    setIsDrawerOpen(true)
  }

  const openEditDrawer = (tech: Technician) => {
    setEditingTech(tech)
    form.setFieldsValue({ ...tech })
    setIsDrawerOpen(true)
  }

  const handleDelete = (tech: Technician) => {
    Swal.fire({
      title: 'ยืนยันการลบ?',
      text: `ต้องการลบข้อมูลของ "${tech.name}" ใช่หรือไม่`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
    }).then(result => {
      if (result.isConfirmed) {
        setTechnicians(prev => prev.filter(t => t.id !== tech.id))
        message.success('ลบข้อมูลช่างเรียบร้อยแล้ว')
      }
    })
  }

  const handleSave = (values: any) => {
    if (editingTech) {
      setTechnicians(prev => prev.map(t => t.id === editingTech.id ? { ...t, ...values } : t))
      message.success('แก้ไขข้อมูลเรียบร้อยแล้ว')
    } else {
      const newTech: Technician = { id: Date.now(), ...values }
      setTechnicians(prev => [...prev, newTech])
      message.success('เพิ่มช่างเรียบร้อยแล้ว')
    }
    setIsDrawerOpen(false)
    form.resetFields()
  }

  const columns = [
    {
      title: 'ชื่อ-นามสกุล',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Technician) => (
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
      title: 'ความเชี่ยวชาญ',
      dataIndex: 'specialty',
      key: 'specialty',
      render: (specialty: string) => (
        <Tag icon={<ToolOutlined />} color="cyan">{specialty}</Tag>
      ),
    },
    {
      title: 'หัวหน้าสังกัด',
      dataIndex: 'chiefName',
      key: 'chiefName',
      render: (chiefName: string) => <span className="text-gray-600 text-sm">{chiefName}</span>,
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
      render: (_: any, record: Technician) => (
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
              { title: 'จัดการช่างซ่อมบำรุง' },
            ]}
            className="mb-6"
          />

          <div className="w-full">
            <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold m-0">จัดการช่างซ่อมบำรุง</h1>
                <p className="text-slate-400 mt-1">บริหารจัดการข้อมูลช่างซ่อมบำรุงทั้งหมดในโรงพยาบาล</p>
              </div>
              <Button type="primary" icon={<PlusOutlined />} size="large" onClick={openAddDrawer}>
                เพิ่มช่างซ่อม
              </Button>
            </div>

            <Row gutter={[16, 16]} className="mb-6">
              <Col xs={12} sm={6}>
                <Card variant="borderless" className="shadow-sm" style={{ borderBottom: '3px solid #006a5a' }}>
                  <Statistic title="ทั้งหมด" value={totalTechs} prefix={<UserOutlined />} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card variant="borderless" className="shadow-sm" style={{ borderBottom: '3px solid #22c55e' }}>
                  <Statistic title="ว่าง" value={availableTechs} styles={{ content: { color: '#22c55e' } }} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card variant="borderless" className="shadow-sm" style={{ borderBottom: '3px solid #3b82f6' }}>
                  <Statistic title="ติดภารกิจ" value={onDutyTechs} styles={{ content: { color: '#3b82f6' } }} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card variant="borderless" className="shadow-sm" style={{ borderBottom: '3px solid #f59e0b' }}>
                  <Statistic title="ลาพักผ่อน" value={onLeaveTechs} styles={{ content: { color: '#f59e0b' } }} />
                </Card>
              </Col>
            </Row>

            <Card variant="borderless" className="shadow-sm" style={{ borderRadius: 12 }}>
              <div className="mb-4">
                <Search
                  placeholder="ค้นหาด้วยชื่อ, เบอร์โทร, หรือความเชี่ยวชาญ"
                  allowClear
                  prefix={<SearchOutlined />}
                  onChange={e => setSearchText(e.target.value)}
                  style={{ maxWidth: 400 }}
                />
              </div>
              <Table
                columns={columns}
                dataSource={filteredTechnicians}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                onHeaderRow={() => ({ style: { backgroundColor: '#f8fafc' } })}
              />
            </Card>
          </div>
        </div>
      </div>

      <Drawer
        title={editingTech ? 'แก้ไขข้อมูลช่างซ่อม' : 'เพิ่มช่างซ่อมใหม่'}
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
          <Form.Item label="ความเชี่ยวชาญ" name="specialty" rules={[{ required: true, message: 'กรุณาเลือกความเชี่ยวชาญ' }]}>
            <Select placeholder="เลือกความเชี่ยวชาญ" options={specialtyOptions} size="large" />
          </Form.Item>
          <Form.Item label="หัวหน้าสังกัด" name="chiefName" rules={[{ required: true, message: 'กรุณาเลือกหัวหน้าสังกัด' }]}>
            <Select placeholder="เลือกหัวหน้า" options={chiefOptions} size="large" showSearch optionFilterProp="label" />
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
