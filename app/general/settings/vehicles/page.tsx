'use client'
import React, { useState } from 'react';
import {
  Table, Input, Button, Space, ConfigProvider, Card, Tag, Drawer, Form, Select, Breadcrumb, message, Tooltip, Row, Col, Statistic, Avatar, Modal, DatePicker, Radio, theme
} from 'antd';
import {
  FaEdit, FaTrashAlt, FaSearch, FaCar, FaPlus, FaHome, FaTools, FaBan, FaCheckCircle, FaTachometerAlt, FaHistory
} from 'react-icons/fa';
import dayjs from 'dayjs';
import Swal from 'sweetalert2';
import Navbar from '@/app/components/Navbar';

// --- Type Definitions ---
interface RepairRecord {
  id: string;
  date: string;
  type: 'ศูนย์บริการ' | 'อู่ซ่อมรถ';
  symptoms: string;
  status: 'กำลังซ่อม' | 'ซ่อมเสร็จ';
}

interface Vehicle {
  id: number;
  licensePlate: string;
  brand: string;
  model: string;
  fuelType: string;
  status: 'พร้อมใช้งาน' | 'กำลังใช้งาน' | 'ส่งซ่อม' | 'ยกเลิกการใช้งาน';
  remark?: string;
  repairType?: 'ศูนย์บริการ' | 'อู่ซ่อมรถ';
  repairSymptoms?: string;
  repairDate?: string;
  repairHistory?: RepairRecord[];
}

// --- Mock Data ---
const initialData: Vehicle[] = [
  { 
    id: 1, 
    licensePlate: 'นข-1111 นนทบุรี', 
    brand: 'Toyota', 
    model: 'Commuter', 
    fuelType: 'ดีเซล (Diesel)', 
    status: 'พร้อมใช้งาน',
    repairHistory: [
      { id: '1-1', date: '2026-01-15', type: 'ศูนย์บริการ', symptoms: 'แอร์ไม่เย็น', status: 'ซ่อมเสร็จ' },
      { id: '1-2', date: '2025-11-20', type: 'อู่ซ่อมรถ', symptoms: 'เปลี่ยนยางรถ', status: 'ซ่อมเสร็จ' }
    ]
  },
  { 
    id: 2, 
    licensePlate: 'ฮฮ-2222 กรุงเทพมหานคร', 
    brand: 'Nissan', 
    model: 'Urvan', 
    fuelType: 'ดีเซล (Diesel)', 
    status: 'กำลังใช้งาน',
    repairHistory: [
      { id: '2-1', date: '2025-12-10', type: 'ศูนย์บริการ', symptoms: 'ซ่อมเบรก', status: 'ซ่อมเสร็จ' }
    ]
  },
  { 
    id: 3, 
    licensePlate: 'บบ-3333 ปทุมธานี', 
    brand: 'Isuzu', 
    model: 'D-Max', 
    fuelType: 'ดีเซล (Diesel)', 
    status: 'ส่งซ่อม',
    repairHistory: [
      { id: '3-1', date: '2026-02-01', type: 'อู่ซ่อมรถ', symptoms: 'ซ่อมเครื่องยนต์', status: 'กำลังซ่อม' }
    ]
  },
  { 
    id: 4, 
    licensePlate: 'กต-4444 นนทบุรี', 
    brand: 'Honda', 
    model: 'Accord', 
    fuelType: 'เบนซิน (Gasoline)', 
    status: 'ยกเลิกการใช้งาน' 
  },
  { 
    id: 5, 
    licensePlate: 'EV-5555 กรุงเทพมหานคร', 
    brand: 'BYD', 
    model: 'Atto 3', 
    fuelType: 'ไฟฟ้า (EV)', 
    status: 'พร้อมใช้งาน',
    repairHistory: []
  },
];

const Page = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialData);
  const [searchText, setSearchText] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [form] = Form.useForm();
  const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);
  const [repairingVehicleId, setRepairingVehicleId] = useState<number | null>(null);
  const [repairForm] = Form.useForm();
  const [isRepairHistoryModalOpen, setIsRepairHistoryModalOpen] = useState(false);
  const [selectedVehicleForHistory, setSelectedVehicleForHistory] = useState<Vehicle | null>(null);

  // --- Stats ---
  const totalVehicles = vehicles.length;
  const availableVehicles = vehicles.filter(v => v.status === 'พร้อมใช้งาน').length;
  const inUseVehicles = vehicles.filter(v => v.status === 'กำลังใช้งาน').length;
  const maintenanceVehicles = vehicles.filter(v => v.status === 'ส่งซ่อม').length;

  // --- Handlers ---
  const handleAdd = () => {
    setEditingVehicle(null);
    form.resetFields();
    setIsDrawerOpen(true);
  };

  const handleEdit = (record: Vehicle) => {
    setEditingVehicle(record);
    form.setFieldsValue({
      ...record,
      repairDate: record.repairDate ? dayjs(record.repairDate, 'YYYY-MM-DD') : undefined
    });
    setIsDrawerOpen(true);
  };

  const handleDelete = (id: number) => {
    Swal.fire({
      title: 'ยืนยันการลบ?',
      text: 'ข้อมูลรถยนต์คันนี้จะถูกลบถาวร',
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
        setVehicles(vehicles.filter((v) => v.id !== id));
        message.success('ลบข้อมูลเรียบร้อยแล้ว');
      }
    });
  };

  const handleStatusChange = (id: number, newStatus: Vehicle['status']) => {
    Swal.fire({
      title: `ยืนยันการเปลี่ยนสถานะเป็น "${newStatus}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#006a5a',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'rounded-xl shadow-xl',
        confirmButton: 'rounded-lg',
        cancelButton: 'rounded-lg'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        setVehicles(vehicles.map(v => v.id === id ? { ...v, status: newStatus } : v));
        message.success('อัปเดตสถานะเรียบร้อยแล้ว');
      }
    });
  };

  const openRepairModal = (id: number) => {
    setRepairingVehicleId(id);
    repairForm.resetFields();
    repairForm.setFieldsValue({ repairDate: dayjs(), repairType: 'ศูนย์บริการ' });
    setIsRepairModalOpen(true);
  };

  const handleRepairSubmit = () => {
    repairForm.validateFields().then(values => {
      const repairDate = values.repairDate ? values.repairDate.format('YYYY-MM-DD') : '';
      const newRepairRecord: RepairRecord = {
        id: `${repairingVehicleId}-${Date.now()}`,
        date: repairDate,
        type: values.repairType,
        symptoms: values.repairSymptoms,
        status: 'กำลังซ่อม'
      };

      setVehicles(vehicles.map(v => v.id === repairingVehicleId ? {
        ...v,
        status: 'ส่งซ่อม',
        repairType: values.repairType,
        repairSymptoms: values.repairSymptoms,
        repairDate: repairDate,
        repairHistory: [...(v.repairHistory || []), newRepairRecord]
      } : v));
      message.success('บันทึกข้อมูลแจ้งซ่อมเรียบร้อยแล้ว');
      setIsRepairModalOpen(false);
    });
  };

  const openRepairHistoryModal = (vehicle: Vehicle) => {
    setSelectedVehicleForHistory(vehicle);
    setIsRepairHistoryModalOpen(true);
  };

  const onFinish = (values: any) => {
    const formattedValues = {
      ...values,
      repairDate: values.repairDate ? values.repairDate.format('YYYY-MM-DD') : undefined
    };

    if (editingVehicle) {
      setVehicles(vehicles.map(v => v.id === editingVehicle.id ? { ...formattedValues, id: editingVehicle.id, repairHistory: v.repairHistory } : v));
      message.success('อัปเดตข้อมูลสำเร็จ');
    } else {
      const newId = vehicles.length > 0 ? Math.max(...vehicles.map(v => v.id)) + 1 : 1;
      setVehicles([...vehicles, { ...formattedValues, id: newId, repairHistory: [] }]);
      message.success('เพิ่มรถยนต์สำเร็จ');
    }
    setIsDrawerOpen(false);
  };

  // --- Table Columns ---
  const columns = [
    {
      title: 'ทะเบียนรถ',
      dataIndex: 'licensePlate',
      key: 'licensePlate',
      render: (text: string) => (
        <div className="flex items-center gap-3">
          <Avatar style={{ backgroundColor: '#006a5a' }} icon={<FaCar />} />
          <div className="font-semibold">{text}</div>
        </div>
      ),
      sorter: (a: Vehicle, b: Vehicle) => a.licensePlate.localeCompare(b.licensePlate),
    },
    {
      title: 'ยี่ห้อ / รุ่น',
      key: 'brandModel',
      render: (_: any, record: Vehicle) => (
        <div>
          <div className="font-medium">{record.brand}</div>
          <div className="text-xs text-slate-400">{record.model}</div>
        </div>
      ),
    },
    {
      title: 'ประเภทเชื้อเพลิง',
      dataIndex: 'fuelType',
      key: 'fuelType',
      render: (text: string) => <Tag color="cyan"><FaTachometerAlt className="mr-1" />{text}</Tag>
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: 'พร้อมใช้งาน', value: 'พร้อมใช้งาน' },
        { text: 'กำลังใช้งาน', value: 'กำลังใช้งาน' },
        { text: 'ส่งซ่อม', value: 'ส่งซ่อม' },
        { text: 'ยกเลิกการใช้งาน', value: 'ยกเลิกการใช้งาน' },
      ],
      onFilter: (value: any, record: Vehicle) => record.status === value,
      render: (status: string) => {
        let color = 'default';
        if (status === 'พร้อมใช้งาน') color = 'green';
        if (status === 'กำลังใช้งาน') color = 'blue';
        if (status === 'ส่งซ่อม') color = 'orange';
        if (status === 'ยกเลิกการใช้งาน') color = 'red';
        return <Tag color={color} className="rounded-full px-3">{status}</Tag>;
      },
    },
    {
      title: 'จัดการ',
      key: 'actions',
      align: 'center' as const,
      render: (_: any, record: Vehicle) => (
        <Space size="small">
          {/* ปุ่มประวัติการซ่อม */}
          <Tooltip title="ประวัติการซ่อม">
            <Button 
              type="text" 
              shape="circle" 
              icon={<FaHistory className="text-purple-500" />} 
              onClick={() => openRepairHistoryModal(record)}
            />
          </Tooltip>
          {/* ปุ่มลัดจัดการสถานะ */}
          {record.status !== 'ส่งซ่อม' && record.status !== 'ยกเลิกการใช้งาน' && (
            <Tooltip title="แจ้งส่งซ่อม">
              <Button type="text" shape="circle" icon={<FaTools className="text-orange-500" />} onClick={() => openRepairModal(record.id)} />
            </Tooltip>
          )}
          {record.status === 'ส่งซ่อม' && (
            <Tooltip title="ซ่อมเสร็จ / พร้อมใช้งาน">
              <Button type="text" shape="circle" icon={<FaCheckCircle className="text-green-500" />} onClick={() => handleStatusChange(record.id, 'พร้อมใช้งาน')} />
            </Tooltip>
          )}
          {record.status !== 'ยกเลิกการใช้งาน' && (
            <Tooltip title="ยกเลิกการใช้งาน">
              <Button type="text" shape="circle" icon={<FaBan className="text-red-500" />} onClick={() => handleStatusChange(record.id, 'ยกเลิกการใช้งาน')} />
            </Tooltip>
          )}
          {/* ปุ่มแก้ไข / ลบ */}
          <Tooltip title="แก้ไขข้อมูล">
            <Button type="text" shape="circle" icon={<FaEdit className="text-blue-600" />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Tooltip title="ลบข้อมูล">
            <Button type="text" shape="circle" icon={<FaTrashAlt className="text-red-500" />} onClick={() => handleDelete(record.id)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const filteredVehicles = vehicles.filter((vehicle) =>
    vehicle.licensePlate.toLowerCase().includes(searchText.toLowerCase()) ||
    vehicle.brand.toLowerCase().includes(searchText.toLowerCase()) ||
    vehicle.model.toLowerCase().includes(searchText.toLowerCase())
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
                { href: '/', title: <><FaHome className="inline mr-1" /> หน้าหลัก</> },
                { href: '/general', title: <><FaCar className="inline mr-1" /> ระบบบริหารงานทั่วไป</> },
                { title: 'ตั้งค่า' },
                { title: 'จัดการรถขอไปใช้ราชการ' },
              ]}
              className="mb-4"
            />
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold m-0">ระบบจัดการรถยนต์ราชการ</h1>
                <p className="text-slate-400 mt-1">จัดการข้อมูลรถยนต์ สถานะ และประวัติการซ่อมบำรุง</p>
              </div>
              <Button type="primary" size="large" icon={<FaPlus />} onClick={handleAdd}>
                เพิ่มรถยนต์
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <Row gutter={[16, 16]} className="mb-8">
            <Col xs={12} sm={6}>
              <Card variant="borderless" className="shadow-sm hover:shadow-md transition-shadow">
                <Statistic
                  title="รถยนต์ทั้งหมด"
                  value={totalVehicles}
                  prefix={<FaCar className="text-slate-400 bg-slate-700 p-2 rounded-lg mr-2" />}
                  suffix="คัน"
                  styles={{ content: { fontWeight: 'bold' } }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card variant="borderless" className="shadow-sm hover:shadow-md transition-shadow border-b-4 border-b-green-500">
                <Statistic
                  title="พร้อมใช้งาน"
                  value={availableVehicles}
                  prefix={<FaCheckCircle className="text-green-400 bg-slate-700 p-2 rounded-lg mr-2" />}
                  suffix="คัน"
                  styles={{ content: { color: '#16a34a', fontWeight: 'bold' } }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card variant="borderless" className="shadow-sm hover:shadow-md transition-shadow border-b-4 border-b-blue-500">
                <Statistic
                  title="กำลังใช้งาน"
                  value={inUseVehicles}
                  prefix={<FaCar className="text-blue-400 bg-slate-700 p-2 rounded-lg mr-2" />}
                  suffix="คัน"
                  styles={{ content: { color: '#2563eb', fontWeight: 'bold' } }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card variant="borderless" className="shadow-sm hover:shadow-md transition-shadow border-b-4 border-b-orange-500">
                <Statistic
                  title="ส่งซ่อม"
                  value={maintenanceVehicles}
                  prefix={<FaTools className="text-orange-400 bg-slate-700 p-2 rounded-lg mr-2" />}
                  suffix="คัน"
                  styles={{ content: { color: '#ea580c', fontWeight: 'bold' } }}
                />
              </Card>
            </Col>
          </Row>

          {/* Main Content Card */}
          <Card variant="borderless" className="shadow-sm rounded-xl overflow-hidden">
            <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold">รายการรถยนต์ราชการ</span>
              </div>
              <Input
                placeholder="ค้นหาทะเบียน, ยี่ห้อ, รุ่น..."
                prefix={<FaSearch className="text-slate-400" />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 300 }}
                allowClear
                className="rounded-lg"
              />
            </div>
            
            <Table
              columns={columns}
              dataSource={filteredVehicles}
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
            title={editingVehicle ? "แก้ไขข้อมูลรถยนต์" : "เพิ่มรถยนต์ใหม่"}
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
              <h3 className="text-base font-medium mb-4 border-b border-slate-700 pb-2"><FaCar className="inline mr-2"/>ข้อมูลรถยนต์</h3>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="licensePlate"
                    label="ทะเบียนรถ (เช่น นข-1111 นนทบุรี)"
                    rules={[{ required: true, message: 'กรุณากรอกทะเบียนรถ' }]}
                  >
                    <Input placeholder="ระบุหมวดอักษร-เลข จังหวัด" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="fuelType"
                    label="ประเภทเชื้อเพลิง"
                    rules={[{ required: true, message: 'กรุณาเลือกประเภทเชื้อเพลิง' }]}
                  >
                    <Select placeholder="เลือกประเภทเชื้อเพลิง">
                      <Select.Option value="ดีเซล (Diesel)">ดีเซล (Diesel)</Select.Option>
                      <Select.Option value="เบนซิน (Gasoline)">เบนซิน (Gasoline)</Select.Option>
                      <Select.Option value="ไฟฟ้า (EV)">ไฟฟ้า (EV)</Select.Option>
                      <Select.Option value="ไฮบริด (Hybrid)">ไฮบริด (Hybrid)</Select.Option>
                      <Select.Option value="NGV/LPG">NGV/LPG</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="brand"
                    label="ยี่ห้อ (Brand)"
                    rules={[{ required: true, message: 'กรุณากรอกยี่ห้อรถ' }]}
                  >
                    <Input placeholder="เช่น Toyota, Honda, Isuzu" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="model"
                    label="รุ่น (Model)"
                    rules={[{ required: true, message: 'กรุณากรอกรุ่นรถ' }]}
                  >
                    <Input placeholder="เช่น Commuter, D-Max, Atto 3" />
                  </Form.Item>
                </Col>
              </Row>

              <h3 className="text-base font-medium text-slate-700 mb-4 mt-4 border-b pb-2"><FaTachometerAlt className="inline mr-2"/>สถานะปัจจุบัน</h3>
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    name="status"
                    label="สถานะการใช้งาน"
                    initialValue="พร้อมใช้งาน"
                  >
                    <Select>
                      <Select.Option value="พร้อมใช้งาน"><Tag color="green">พร้อมใช้งาน</Tag></Select.Option>
                      <Select.Option value="กำลังใช้งาน"><Tag color="blue">กำลังใช้งาน</Tag></Select.Option>
                      <Select.Option value="ส่งซ่อม"><Tag color="orange">ส่งซ่อม</Tag></Select.Option>
                      <Select.Option value="ยกเลิกการใช้งาน"><Tag color="red">ยกเลิกการใช้งาน</Tag></Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              {/* ส่วนกรอกข้อมูลซ่อม (แสดงเฉพาะเมื่อสถานะเป็น "ส่งซ่อม") */}
              <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.status !== currentValues.status}>
                {({ getFieldValue }) =>
                  getFieldValue('status') === 'ส่งซ่อม' ? (
                    <div className="bg-slate-800 p-4 rounded-xl mb-4 border border-orange-900">
                      <h3 className="text-sm font-semibold text-orange-400 mb-4"><FaTools className="inline mr-2"/>รายละเอียดการส่งซ่อม</h3>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item name="repairDate" label="วันที่แจ้งซ่อม" rules={[{ required: true, message: 'กรุณาเลือกวันที่' }]}>
                            <DatePicker className="w-full" format="DD/MM/YYYY" placeholder="เลือกวันที่" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item name="repairType" label="สถานที่ซ่อม" rules={[{ required: true, message: 'กรุณาเลือกสถานที่' }]}>
                            <Radio.Group>
                              <Radio value="ศูนย์บริการ">ศูนย์บริการ</Radio>
                              <Radio value="อู่ซ่อมรถ">อู่ซ่อมรถ</Radio>
                            </Radio.Group>
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item name="repairSymptoms" label="อาการที่เสีย / สาเหตุ" rules={[{ required: true, message: 'กรุณาระบุอาการที่เสีย' }]}>
                        <Input.TextArea rows={3} placeholder="ระบุอาการเบื้องต้น เช่น แอร์ไม่เย็น, สตาร์ทไม่ติด..." />
                      </Form.Item>
                    </div>
                  ) : null
                }
              </Form.Item>

              <Form.Item name="remark" label="หมายเหตุเพิ่มเติม">
                <Input.TextArea rows={3} placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)..." />
              </Form.Item>
            </Form>
          </Drawer>

          {/* Repair Quick Action Modal */}
          <Modal
            title={<><FaTools className="text-orange-500 mr-2" /> บันทึกการแจ้งซ่อมรถยนต์</>}
            open={isRepairModalOpen}
            onOk={handleRepairSubmit}
            onCancel={() => setIsRepairModalOpen(false)}
            okText="ยืนยันแจ้งซ่อม"
            cancelText="ยกเลิก"
            okButtonProps={{ className: 'bg-orange-500 hover:bg-orange-600 border-none' }}
          >
            <Form form={repairForm} layout="vertical" className="mt-4">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="repairDate" label="วันที่แจ้งซ่อม" rules={[{ required: true, message: 'กรุณาเลือกวันที่แจ้งซ่อม' }]}>
                    <DatePicker className="w-full" format="DD/MM/YYYY" placeholder="เลือกวันที่" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="repairType" label="สถานที่ซ่อม" rules={[{ required: true, message: 'กรุณาเลือกสถานที่ซ่อม' }]}>
                    <Radio.Group>
                      <Radio value="ศูนย์บริการ">ศูนย์บริการ</Radio>
                      <Radio value="อู่ซ่อมรถ">อู่ซ่อมรถทั่วไป</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="repairSymptoms" label="อาการที่เสีย / สาเหตุ" rules={[{ required: true, message: 'กรุณาระบุอาการที่เสีย' }]}>
                <Input.TextArea rows={4} placeholder="ระบุอาการเบื้องต้น เช่น แอร์ไม่เย็น, เครื่องสั่น..." />
              </Form.Item>
            </Form>
          </Modal>

          {/* Repair History Modal */}
          <Modal
            title={<><FaHistory className="text-purple-500 mr-2" /> ประวัติการซ่อม - {selectedVehicleForHistory?.licensePlate}</>}
            open={isRepairHistoryModalOpen}
            onCancel={() => setIsRepairHistoryModalOpen(false)}
            footer={[
              <Button key="close" onClick={() => setIsRepairHistoryModalOpen(false)}>
                ปิด
              </Button>
            ]}
            width={700}
          >
            {selectedVehicleForHistory && selectedVehicleForHistory.repairHistory && selectedVehicleForHistory.repairHistory.length > 0 ? (
              <div className="space-y-4">
                {(selectedVehicleForHistory.repairHistory || []).map((record, index) => (
                  <Card key={record.id} className="mb-3 border-l-4 border-l-purple-500">
                    <Row gutter={16}>
                      <Col span={24}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold mb-1">
                              ครั้งที่ {(selectedVehicleForHistory.repairHistory || []).length - index}
                            </h4>
                            <p className="text-sm text-slate-400">
                              <span className="font-medium">วันที่:</span> {dayjs(record.date).format('DD/MM/YYYY')}
                            </p>
                          </div>
                          <Tag color={record.status === 'ซ่อมเสร็จ' ? 'green' : 'orange'}>
                            {record.status}
                          </Tag>
                        </div>
                        <div className="mt-3 space-y-2">
                          <p className="text-sm">
                            <span className="font-medium">สถานที่ซ่อม:</span>
                            <span className="ml-2 text-slate-400">{record.type}</span>
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">อาการที่เสีย:</span>
                            <span className="ml-2 text-slate-400">{record.symptoms}</span>
                          </p>
                        </div>
                      </Col>
                    </Row>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FaHistory className="text-4xl text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400">ไม่มีประวัติการซ่อมสำหรับรถคันนี้</p>
              </div>
            )}
          </Modal>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default Page;
