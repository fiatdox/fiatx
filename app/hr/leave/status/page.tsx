'use client'
import React, { useState } from 'react'
import {
  Table,
  Tag,
  Card,
  Typography,
  Breadcrumb,
  ConfigProvider,
  App,
  Space,
  Button,
  Input,
  DatePicker,
  Row,
  Col,
  Statistic
} from 'antd'
import {
  HomeOutlined,
  FileTextOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  FilterOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { FaUmbrellaBeach, FaUserMd, FaBriefcase, FaBaby } from 'react-icons/fa'
import Navbar from '../../../components/Navbar'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

interface LeaveRequest {
  id: string
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  totalDays: number
  reason: string
  status1: 'approved' | 'pending' | 'rejected' // หัวหน้าหน่วยงาน
  status2: 'approved' | 'pending' | 'rejected' // หัวหน้ากลุ่มงาน
  status3: 'approved' | 'pending' | 'rejected' // หัวหน้าภารกิจ
}

const initialData: LeaveRequest[] = [
  {
    id: 'REQ-202310001',
    employeeName: 'สมชาย ใจดี',
    leaveType: 'ลาป่วย',
    startDate: '2023-10-01',
    endDate: '2023-10-02',
    totalDays: 2,
    reason: 'ไข้หวัดใหญ่',
    status1: 'approved',
    status2: 'approved',
    status3: 'pending',
  },
  {
    id: 'REQ-202310002',
    employeeName: 'สมหญิง รักเรียน',
    leaveType: 'ลาพักผ่อน',
    startDate: '2023-10-05',
    endDate: '2023-10-07',
    totalDays: 3,
    reason: 'พักผ่อนประจำปี',
    status1: 'approved',
    status2: 'pending',
    status3: 'pending',
  },
  {
    id: 'REQ-202310003',
    employeeName: 'วิชัย กล้าหาญ',
    leaveType: 'ลากิจ',
    startDate: '2023-10-10',
    endDate: '2023-10-10',
    totalDays: 1,
    reason: 'ติดต่อราชการ',
    status1: 'rejected',
    status2: 'pending',
    status3: 'pending',
  },
  {
    id: 'REQ-202310004',
    employeeName: 'มานี มีตา',
    leaveType: 'ลาคลอด',
    startDate: '2023-11-01',
    endDate: '2024-01-29',
    totalDays: 90,
    reason: 'ลาคลอดบุตร',
    status1: 'approved',
    status2: 'approved',
    status3: 'approved',
  },
]

const LeaveSummaryPageContent = () => {
  const [searchText, setSearchText] = useState('')

  // คำนวณยอดรวมวันลาแต่ละประเภท
  const sickLeaveDays = initialData.filter(r => r.leaveType === 'ลาป่วย').reduce((acc, cur) => acc + cur.totalDays, 0)
  const vacationLeaveDays = initialData.filter(r => r.leaveType === 'ลาพักผ่อน').reduce((acc, cur) => acc + cur.totalDays, 0)
  const personalLeaveDays = initialData.filter(r => r.leaveType === 'ลากิจ').reduce((acc, cur) => acc + cur.totalDays, 0)
  const maternityLeaveDays = initialData.filter(r => r.leaveType === 'ลาคลอด').reduce((acc, cur) => acc + cur.totalDays, 0)

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'approved':
        return <Tag icon={<CheckCircleOutlined />} color="success">อนุมัติ</Tag>
      case 'rejected':
        return <Tag icon={<CloseCircleOutlined />} color="error">ไม่อนุมัติ</Tag>
      case 'pending':
        return <Tag icon={<ClockCircleOutlined />} color="warning">รออนุมัติ</Tag>
      default:
        return <Tag color="default">{status}</Tag>
    }
  }

  const columns = [
    {
      title: 'เลขที่ใบลา',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => <span className="font-medium text-primary">{text}</span>
    },
    {
      title: 'ผู้ขอลา',
      dataIndex: 'employeeName',
      key: 'employeeName',
    },
    {
      title: 'ประเภท',
      dataIndex: 'leaveType',
      key: 'leaveType',
      render: (text: string) => {
        let color = 'default';
        if (text === 'ลาป่วย') color = 'volcano';
        if (text === 'ลาพักผ่อน') color = 'green';
        if (text === 'ลากิจ') color = 'blue';
        if (text === 'ลาคลอด') color = 'magenta';
        return <Tag color={color}>{text}</Tag>
      }
    },
    {
      title: 'ช่วงวันที่ลา',
      key: 'date',
      render: (_: any, record: LeaveRequest) => (
        <div className="flex items-center gap-2 text-sm">
          <span>{dayjs(record.startDate).format('DD/MM/YYYY')} - {dayjs(record.endDate).format('DD/MM/YYYY')}</span>
          <span className="text-blue-700 font-medium">({record.totalDays} วัน)</span>
        </div>
      )
    },
    {
      title: 'หน.หน่วยงาน',
      dataIndex: 'status1',
      key: 'status1',
      align: 'center' as const,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'หน.กลุ่มงาน',
      dataIndex: 'status2',
      key: 'status2',
      align: 'center' as const,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'หน.ภารกิจ',
      dataIndex: 'status3',
      key: 'status3',
      align: 'center' as const,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'จัดการ',
      key: 'action',
      align: 'center' as const,
      render: () => (
        <Button type="text" shape="circle" icon={<EyeOutlined />} className="text-slate-500 hover:text-primary" />
      )
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="p-6 md:p-8">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
          { title: <><FileTextOutlined /> ระบบงานบุคคล</> },
          { title: 'สรุปรายการลา' },
        ]}
        className="mb-10"
      />

      <div className="max-w-7xl mx-auto mt-10">
        {/* Cards สรุปจำนวนวันลา */}
        <Row gutter={[16, 16]} className="mb-8">
          <Col xs={24} sm={12} md={6}>
            <Card variant="borderless" style={{ backgroundColor: '#006a5a' }} className="shadow-md">
              <Statistic
                title={<span className="text-white/90">ลาพักผ่อน (ใช้ไป/สิทธิ์)</span>}
                value={`${vacationLeaveDays}/10`}
                prefix={<FaUmbrellaBeach className="text-white text-2xl" />}
                suffix={<span className="text-sm text-white/80">วัน</span>}
                styles={{ content: { color: '#fff' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card variant="borderless" style={{ backgroundColor: '#006a5a' }} className="shadow-md">
              <Statistic
                title={<span className="text-white/90">ลาป่วย</span>}
                value={sickLeaveDays}
                prefix={<FaUserMd className="text-white text-2xl" />}
                suffix={<span className="text-sm text-white/80">วัน</span>}
                styles={{ content: { color: '#fff' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card variant="borderless" style={{ backgroundColor: '#006a5a' }} className="shadow-md">
              <Statistic
                title={<span className="text-white/90">ลากิจ</span>}
                value={personalLeaveDays}
                prefix={<FaBriefcase className="text-white text-2xl" />}
                suffix={<span className="text-sm text-white/80">วัน</span>}
                styles={{ content: { color: '#fff' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card variant="borderless" style={{ backgroundColor: '#006a5a' }} className="shadow-md">
              <Statistic
                title={<span className="text-white/90">ลาคลอดบุตร</span>}
                value={maternityLeaveDays}
                prefix={<FaBaby className="text-white text-2xl" />}
                suffix={<span className="text-sm text-white/80">วัน</span>}
                styles={{ content: { color: '#fff' } }}
              />
            </Card>
          </Col>
        </Row>

        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <Title level={2} className="text-primary m-0">สรุปรายการลา</Title>
            <Text type="secondary">ติดตามสถานะและประวัติการลาของบุคลากร</Text>
          </div>
          <Space wrap>
             <Input 
                placeholder="ค้นหาชื่อ หรือ เลขที่ใบลา..." 
                prefix={<SearchOutlined className="text-slate-400" />} 
                style={{ width: 250 }}
                className="rounded-md"
             />
             <RangePicker className="rounded-md" />
             <Button icon={<FilterOutlined />}>ตัวกรอง</Button>
          </Space>
        </div>

        <Card variant="borderless" className="shadow-sm rounded-xl overflow-hidden">
          <Table 
            columns={columns} 
            dataSource={initialData} 
            rowKey="id"
            pagination={{ 
              pageSize: 10,
              showTotal: (total) => `ทั้งหมด ${total} รายการ`
            }}
            scroll={{ x: 1000 }}
            className="border border-slate-100 rounded-lg"
          />
        </Card>
      </div>
      </div>
    </div>
  )
}

const LeaveSummaryPage = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#006a5a',
          borderRadius: 8,
          fontFamily: 'var(--font-sarabun)',
        },
        components: {
          Table: {
            headerBg: '#f8fafc',
            headerColor: '#475569',
            rowHoverBg: '#f0fdf4',
          }
        }
      }}
    >
      <App>
        <LeaveSummaryPageContent />
      </App>
    </ConfigProvider>
  )
}

export default LeaveSummaryPage