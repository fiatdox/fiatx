
'use client'
import React, { useState } from 'react';
import {
  Table, Input, Button, Space, ConfigProvider, Card, Tag, Drawer, Form, Select, Breadcrumb, DatePicker, message, Tooltip, Row, Col, Statistic, Avatar, theme
} from 'antd';
import {
  EditOutlined, DeleteOutlined, SearchOutlined, UserOutlined, PlusOutlined, HomeOutlined, PhoneOutlined, IdcardOutlined, CarOutlined, SafetyCertificateOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import Swal from 'sweetalert2';
import Navbar from '@/app/components/Navbar';

// --- Type Definitions ---
interface Driver {
  id: number;
  name: string;
  phone: string;
  licenseType: string;
  expiryDate: string; // YYYY-MM-DD
  status: 'ว่าง' | 'ติดภารกิจ' | 'ลาพักผ่อน';
  remark?: string;
}

// --- Mock Data ---
const initialData: Driver[] = [
  { id: 1, name: 'นายสมชาย ใจดี', phone: '081-111-1111', licenseType: 'ประเภท 2 (บ.2/ท.2)', expiryDate: dayjs().add(2, 'year').format('YYYY-MM-DD'), status: 'ว่าง' },
  { id: 2, name: 'นายสมศักดิ์ ขยันขับ', phone: '082-222-2222', licenseType: 'ประเภท 3 (บ.3/ท.3)', expiryDate: dayjs().subtract(5, 'day').format('YYYY-MM-DD'), status: 'ติดภารกิจ' }, // สมมติว่าหมดอายุแล้ว
  { id: 3, name: 'นายวิชัย กล้าหาญ', phone: '083-333-3333', licenseType: 'ประเภท 2 (บ.2/ท.2)', expiryDate: dayjs().add(15, 'day').format('YYYY-MM-DD'), status: 'ลาพักผ่อน' }, // สมมติว่าใกล้หมดอายุ
  { id: 4, name: 'นายประเสริฐ เดินทาง', phone: '084-444-4444', licenseType: 'ประเภท 1 (บ.1/ท.1)', expiryDate: dayjs().add(1, 'year').format('YYYY-MM-DD'), status: 'ว่าง' },
];

const Page = () => {
  const [drivers, setDrivers] = useState<Driver[]>(initialData);
  const [searchText, setSearchText] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [form] = Form.useForm();

  // --- Stats ---
  const totalDrivers = drivers.length;
  const availableDrivers = drivers.filter(d => d.status === 'ว่าง').length;
  const onDutyDrivers = drivers.filter(d => d.status === 'ติดภารกิจ').length;
  const onLeaveDrivers = drivers.filter(d => d.status === 'ลาพักผ่อน').length;

  // --- Handlers ---
  const handleAdd = () => {
    setEditingDriver(null);
    form.resetFields();
    setIsDrawerOpen(true);
  };

  const handleEdit = (record: Driver) => {
    setEditingDriver(record);
    form.setFieldsValue({
      ...record,
      expiryDate: record.expiryDate ? dayjs(record.expiryDate, 'YYYY-MM-DD') : null
    });
    setIsDrawerOpen(true);
  };

  const handleDelete = (id: number) => {
    Swal.fire({
      title: 'ยืนยันการลบ?',
      text: 'ข้อมูลพนักงานขับรถท่านนี้จะถูกลบถาวร',
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
        setDrivers(drivers.filter((d) => d.id !== id));
        message.success('ลบข้อมูลเรียบร้อยแล้ว');
      }
    });
  };

  const onFinish = (values: any) => {
    const formattedValues = {
      ...values,
      expiryDate: values.expiryDate ? values.expiryDate.format('YYYY-MM-DD') : ''
    };

    if (editingDriver) {
      setDrivers(drivers.map(d => d.id === editingDriver.id ? { ...formattedValues, id: editingDriver.id } : d));
      message.success('อัปเดตข้อมูลสำเร็จ');
    } else {
      const newId = drivers.length > 0 ? Math.max(...drivers.map(d => d.id)) + 1 : 1;
      setDrivers([...drivers, { ...formattedValues, id: newId }]);
      message.success('เพิ่มพนักงานขับรถสำเร็จ');
    }
    setIsDrawerOpen(false);
  };

  // --- Helpers ---
  const getExpiryStatus = (dateString: string) => {
    if (!dateString) return null;
    const exp = dayjs(dateString, 'YYYY-MM-DD');
    const now = dayjs().startOf('day');
    const diffDays = exp.diff(now, 'day');

    if (diffDays < 0) return <Tag color="red" className="ml-2 font-medium">หมดอายุ</Tag>;
    if (diffDays <= 30) return <Tag color="warning" className="ml-2 font-medium">ใกล้หมดอายุ ({diffDays} วัน)</Tag>;
    return <Tag color="green" className="ml-2 font-medium">ปกติ</Tag>;
  };

  // --- Table Columns ---
  const columns = [
    {
      title: 'พนักงานขับรถ',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Driver) => (
        <div className="flex items-center gap-3">
          <Avatar style={{ backgroundColor: '#006a5a' }} icon={<UserOutlined />} />
          <div>
            <div className="font-medium">{text}</div>
            <div className="text-xs text-slate-400 mt-0.5"><PhoneOutlined className="mr-1" />{record.phone}</div>
          </div>
        </div>
      ),
      sorter: (a: Driver, b: Driver) => a.name.localeCompare(b.name),
    },
    {
      title: 'ข้อมูลใบอนุญาตขับขี่',
      key: 'license',
      render: (_: any, record: Driver) => (
        <div>
          <div className="text-sm mb-1">
            <SafetyCertificateOutlined className="text-blue-500 mr-2" />
            {record.licenseType}
          </div>
          <div className="text-xs flex items-center">
            <span className="text-slate-400">หมดอายุ: {dayjs(record.expiryDate).format('DD/MM/YYYY')}</span>
            {getExpiryStatus(record.expiryDate)}
          </div>
        </div>
      ),
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: 'ว่าง', value: 'ว่าง' },
        { text: 'ติดภารกิจ', value: 'ติดภารกิจ' },
        { text: 'ลาพักผ่อน', value: 'ลาพักผ่อน' },
      ],
      onFilter: (value: any, record: Driver) => record.status === value,
      render: (status: string) => {
        let color = 'default';
        if (status === 'ว่าง') color = 'green';
        if (status === 'ติดภารกิจ') color = 'blue';
        if (status === 'ลาพักผ่อน') color = 'orange';
        return <Tag color={color} className="rounded-full px-3">{status}</Tag>;
      },
    },
    {
      title: 'จัดการ',
      key: 'actions',
      align: 'center' as const,
      render: (_: any, record: Driver) => (
        <Space size="small">
          <Tooltip title="แก้ไขข้อมูล">
            <Button type="text" shape="circle" icon={<EditOutlined className="text-blue-600" />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Tooltip title="ลบข้อมูล">
            <Button type="text" shape="circle" icon={<DeleteOutlined className="text-red-500" />} onClick={() => handleDelete(record.id)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const filteredDrivers = drivers.filter((driver) =>
    driver.name.toLowerCase().includes(searchText.toLowerCase()) ||
    driver.phone.includes(searchText)
  );

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
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <div className="p-6 md:p-8 w-full">
          {/* Header & Breadcrumb */}
          <div className="mb-8">
            <Breadcrumb
              items={[
                { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
                { href: '/general', title: <><CarOutlined /> ระบบบริหารงานทั่วไป</> },
                { title: 'ตั้งค่า' },
                { title: 'จัดการพนักงานขับรถ' },
              ]}
              className="mb-4"
            />
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold m-0">ระบบจัดการพนักงานขับรถ</h1>
                <p className="text-slate-400 mt-1">จัดการข้อมูลส่วนตัว เบอร์ติดต่อ และวันหมดอายุใบอนุญาตขับขี่ของพนักงานขับรถส่วนกลาง</p>
              </div>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} size="large" className="shadow-lg shadow-green-600/20">
                เพิ่มพนักงานขับรถ
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <Row gutter={[16, 16]} className="mb-8">
            <Col xs={12} sm={6}>
              <Card variant="borderless" className="shadow-sm hover:shadow-md transition-shadow">
                <Statistic
                  title="พนักงานขับรถทั้งหมด"
                  value={totalDrivers}
                  prefix={<IdcardOutlined className="text-slate-400 bg-slate-700 p-2 rounded-lg mr-2" />}
                  suffix="คน"
                  styles={{ content: { fontWeight: 'bold' } }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card variant="borderless" className="shadow-sm hover:shadow-md transition-shadow border-b-4 border-b-green-500">
                <Statistic
                  title="สถานะ: ว่าง"
                  value={availableDrivers}
                  prefix={<UserOutlined className="text-green-400 bg-slate-700 p-2 rounded-lg mr-2" />}
                  suffix="คน"
                  styles={{ content: { color: '#16a34a', fontWeight: 'bold' } }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card variant="borderless" className="shadow-sm hover:shadow-md transition-shadow border-b-4 border-b-blue-500">
                <Statistic
                  title="สถานะ: ติดภารกิจ"
                  value={onDutyDrivers}
                  prefix={<CarOutlined className="text-blue-400 bg-slate-700 p-2 rounded-lg mr-2" />}
                  suffix="คน"
                  styles={{ content: { color: '#2563eb', fontWeight: 'bold' } }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card variant="borderless" className="shadow-sm hover:shadow-md transition-shadow border-b-4 border-b-orange-500">
                <Statistic
                  title="สถานะ: ลาพักผ่อน"
                  value={onLeaveDrivers}
                  prefix={<UserOutlined className="text-orange-400 bg-slate-700 p-2 rounded-lg mr-2" />}
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
                <span className="text-base font-semibold">รายชื่อพนักงานขับรถ</span>
              </div>
              <Input
                placeholder="ค้นหาชื่อ, เบอร์ติดต่อ..."
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
              dataSource={filteredDrivers}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showTotal: (total, range) => `แสดง ${range[0]}-${range[1]} จาก ${total} รายการ`,
                className: "mt-4"
              }}
              className="border border-slate-100 rounded-lg"
            />
          </Card>

          {/* Drawer Form */}
          <Drawer
            title={editingDriver ? "แก้ไขข้อมูลพนักงานขับรถ" : "เพิ่มพนักงานขับรถใหม่"}
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
                  บันทึกข้อมูล
                </Button>
              </Space>
            }
          >
            <Form layout="vertical" form={form} onFinish={onFinish} requiredMark="optional">
              <h3 className="text-base font-medium mb-4 border-b border-slate-700 pb-2"><UserOutlined className="mr-2"/>ข้อมูลส่วนตัว</h3>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="ชื่อ-นามสกุล"
                    rules={[{ required: true, message: 'กรุณากรอกชื่อ-นามสกุล' }]}
                  >
                    <Input placeholder="เช่น นายสมชาย ใจดี" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="phone"
                    label="เบอร์ติดต่อ"
                    rules={[{ required: true, message: 'กรุณากรอกเบอร์ติดต่อ' }]}
                  >
                    <Input placeholder="08X-XXX-XXXX" />
                  </Form.Item>
                </Col>
              </Row>

              <h3 className="text-base font-medium text-slate-700 mb-4 mt-4 border-b pb-2"><SafetyCertificateOutlined className="mr-2"/>ข้อมูลใบอนุญาตขับขี่</h3>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="licenseType"
                    label="ประเภทใบอนุญาตขับขี่"
                    rules={[{ required: true, message: 'กรุณาเลือกประเภทใบขับขี่' }]}
                  >
                    <Select placeholder="เลือกประเภทใบอนุญาต">
                      <Select.Option value="ประเภท 1 (บ.1/ท.1)">ประเภท 1 (บ.1/ท.1)</Select.Option>
                      <Select.Option value="ประเภท 2 (บ.2/ท.2)">ประเภท 2 (บ.2/ท.2)</Select.Option>
                      <Select.Option value="ประเภท 3 (บ.3/ท.3)">ประเภท 3 (บ.3/ท.3)</Select.Option>
                      <Select.Option value="ประเภท 4 (บ.4/ท.4)">ประเภท 4 (บ.4/ท.4)</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="expiryDate"
                    label="วันหมดอายุใบขับขี่"
                    rules={[{ required: true, message: 'กรุณาระบุวันหมดอายุ' }]}
                  >
                    <DatePicker 
                      className="w-full" 
                      format="DD/MM/YYYY" 
                      placeholder="เลือกวันหมดอายุ" 
                    />
                  </Form.Item>
                </Col>
              </Row>

              <h3 className="text-base font-medium text-slate-700 mb-4 mt-4 border-b pb-2"><CarOutlined className="mr-2"/>สถานะปัจจุบัน</h3>
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    name="status"
                    label="สถานะการทำงาน"
                    initialValue="ว่าง"
                  >
                    <Select>
                      <Select.Option value="ว่าง"><Tag color="green">ว่าง</Tag></Select.Option>
                      <Select.Option value="ติดภารกิจ"><Tag color="blue">ติดภารกิจ</Tag></Select.Option>
                      <Select.Option value="ลาพักผ่อน"><Tag color="orange">ลาพักผ่อน</Tag></Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="remark" label="หมายเหตุเพิ่มเติม">
                <Input.TextArea rows={3} placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)..." />
              </Form.Item>
            </Form>
          </Drawer>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default Page;
