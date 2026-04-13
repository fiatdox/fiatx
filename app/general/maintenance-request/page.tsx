'use client'
import React, { useState } from 'react'
import {
  Form, Input, Button, Select, DatePicker, Typography, Card, ConfigProvider,
  Result, Breadcrumb, Row, Col, Alert, Divider, Steps, Radio, Upload, Checkbox,
  Modal, Table, Tag, theme
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, CheckCircleOutlined, ToolOutlined, PlusOutlined,
  SearchOutlined, QrcodeOutlined
} from '@ant-design/icons'
import Navbar from '../../components/Navbar'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TextArea } = Input

const generalRepairOptions = [
  { label: 'ระบบไฟฟ้า / แสงสว่าง', value: 'electrical' },
  { label: 'ระบบประปา / สุขาภิบาล', value: 'plumbing' },
  { label: 'เครื่องปรับอากาศ', value: 'aircon' },
  { label: 'อาคารสถานที่ / โครงสร้าง', value: 'building' },
  { label: 'อื่นๆ (ระบุในรายละเอียด)', value: 'other' },
];

const urgencyOptions = [
  { label: 'ปกติ (ดำเนินการตามลำดับคิว)', value: 'normal' },
  { label: 'ด่วน (ส่งผลกระทบต่องานบางส่วน)', value: 'urgent' },
  { label: 'ด่วนมาก (ฉุกเฉิน / อันตราย)', value: 'critical' },
];

// ─── Mock asset database ──────────────────────────────────────────────────────
const MOCK_ASSETS = [
  { assetNo: 'ก.001-67-001', name: 'คอมพิวเตอร์ตั้งโต๊ะ Dell OptiPlex 3080', type: 'คอมพิวเตอร์',    department: 'งาน HR',            location: 'ห้อง HR ชั้น 2',        status: 'ปกติ' },
  { assetNo: 'ก.001-67-002', name: 'เครื่องพิมพ์ HP LaserJet Pro M404dn',      type: 'เครื่องพิมพ์',  department: 'งาน HR',            location: 'ห้อง HR ชั้น 2',        status: 'ปกติ' },
  { assetNo: 'ก.002-67-001', name: 'เครื่องปรับอากาศ Daikin 18000 BTU',        type: 'เครื่องปรับอากาศ', department: 'งานการพยาบาล OPD', location: 'ห้องตรวจโรค OPD 1',   status: 'ปกติ' },
  { assetNo: 'ก.002-67-002', name: 'โต๊ะทำงานแพทย์ไม้สัก',                    type: 'เฟอร์นิเจอร์',  department: 'งานการพยาบาล OPD', location: 'ห้องตรวจโรค OPD 2',   status: 'ปกติ' },
  { assetNo: 'ก.003-65-001', name: 'เครื่อง ECG 12 Leads Nihon Kohden',         type: 'เครื่องมือแพทย์', department: 'งานห้องผ่าตัด',  location: 'OR 1',                 status: 'ชำรุด' },
  { assetNo: 'ก.003-65-002', name: 'เตียงผ่าตัดไฮดรอลิก Maquet Alpha Star',    type: 'เครื่องมือแพทย์', department: 'งานห้องผ่าตัด',  location: 'OR 2',                 status: 'ปกติ' },
  { assetNo: 'ก.004-66-001', name: 'ตู้เย็นเก็บยา Thermo Fisher 4°C',          type: 'ตู้เย็น',        department: 'งานเภสัชกรรม',    location: 'ห้องยา ชั้น 1',        status: 'ปกติ' },
  { assetNo: 'ก.004-66-002', name: 'คอมพิวเตอร์โน้ตบุ๊ก Lenovo ThinkPad E15',  type: 'คอมพิวเตอร์',   department: 'งานเวชระเบียน',    location: 'เคาน์เตอร์เวชระเบียน', status: 'ปกติ' },
  { assetNo: 'ก.005-67-001', name: 'โปรเจคเตอร์ Epson EB-X49',                 type: 'โสตทัศนูปกรณ์', department: 'งาน HR',            location: 'ห้องประชุมชั้น 3',     status: 'เสื่อมสภาพ' },
  { assetNo: 'ก.005-67-002', name: 'กล้อง CCTV Hikvision 2MP',                 type: 'กล้องวงจรปิด',  department: 'งานรักษาความปลอดภัย', location: 'ประตูทางเข้าหลัก',  status: 'ชำรุด' },
  { assetNo: 'ก.006-66-001', name: 'เครื่องชั่งน้ำหนักดิจิทัล AND UC-321',    type: 'เครื่องมือแพทย์', department: 'งานการพยาบาล OPD', location: 'ห้องชั่งน้ำหนัก',    status: 'ปกติ' },
  { assetNo: 'ก.006-66-002', name: 'เตียงผู้ป่วย Hill-Rom เตียงไฟฟ้า',         type: 'เฟอร์นิเจอร์',  department: 'งานผู้ป่วยใน IPD', location: 'Ward A ชั้น 3',        status: 'ปกติ' },
  { assetNo: 'ก.007-65-001', name: 'สแกนเนอร์เอกสาร Fujitsu fi-7160',          type: 'เครื่องพิมพ์',   department: 'งานเวชระเบียน',    location: 'ห้องเวชระเบียน ชั้น 1', status: 'ปกติ' },
  { assetNo: 'ก.007-65-002', name: 'เครื่องกระตุ้นหัวใจ Zoll AED Plus',        type: 'เครื่องมือแพทย์', department: 'งานอุบัติเหตุ ER', location: 'ER ห้องฉุกเฉิน',      status: 'ปกติ' },
  { assetNo: 'ก.008-67-001', name: 'UPS APC Smart-UPS 1500VA',                  type: 'อุปกรณ์ไฟฟ้า',  department: 'งานคอมพิวเตอร์ IT', location: 'ห้อง Server ชั้น 2',  status: 'ปกติ' },
  { assetNo: 'ก.008-67-002', name: 'สวิตช์เครือข่าย Cisco Catalyst 2960',      type: 'อุปกรณ์เครือข่าย', department: 'งานคอมพิวเตอร์ IT', location: 'ห้อง Server ชั้น 2', status: 'เสื่อมสภาพ' },
]

const ASSET_STATUS_COLOR: Record<string, string> = {
  'ปกติ': 'success', 'ชำรุด': 'error', 'เสื่อมสภาพ': 'warning'
}

const buildingOptions = [
  { label: 'อาคารผู้ป่วยนอก (OPD)', value: 'opd' },
  { label: 'อาคารผู้ป่วยใน (IPD)', value: 'ipd' },
  { label: 'อาคารอุบัติเหตุและฉุกเฉิน (ER)', value: 'er' },
  { label: 'อาคารอำนวยการ', value: 'admin' },
  { label: 'บ้านพักเจ้าหน้าที่', value: 'staff_housing' },
  { label: 'อื่นๆ / บริเวณภายนอก', value: 'other' },
];

const MaintenanceRequestPage = () => {
  const [form] = Form.useForm();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [assetSearch, setAssetSearch] = useState('');
  const repairCategory = Form.useWatch('repairCategory', form);

  const filteredAssets = assetSearch.trim()
    ? MOCK_ASSETS.filter(a =>
        a.assetNo.toLowerCase().includes(assetSearch.toLowerCase()) ||
        a.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
        a.department.toLowerCase().includes(assetSearch.toLowerCase()) ||
        a.type.toLowerCase().includes(assetSearch.toLowerCase())
      )
    : MOCK_ASSETS;

  const handleSelectAsset = (assetNo: string) => {
    form.setFieldValue('assetNumber', assetNo);
    setAssetModalOpen(false);
    setAssetSearch('');
  };

  const onFinish = (values: any) => {
    console.log('Received values of form: ', values);
    setIsSubmitted(true); // เปลี่ยนสถานะเพื่อแสดงหน้าต่างติดตามผล
  };

  const onFinishFailed = (errorInfo: any) => {
    console.log('Failed:', errorInfo);
  };

  // ฟังก์ชันจัดการการอัปโหลดไฟล์ใน Form
  const normFile = (e: any) => {
    if (Array.isArray(e)) {
      return e;
    }
    return e?.fileList;
  };

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#FF6500', borderRadius: 8 } }}>
      <div className="min-h-screen bg-slate-900 text-slate-200">
        <Navbar />
        <div className="p-6 md:p-8">
          <Breadcrumb
            items={[
              { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
              { href: '/general', title: <><FileTextOutlined /> งานบริหารงานทั่วไป</> },
              { title: 'แจ้งซ่อมบำรุง' },
            ]}
            className="mb-6"
          />

          <div className="w-full">
            <div className="mb-8">
              <Title level={2} style={{ color: '#FF6500', margin: 0 }}>แบบฟอร์มแจ้งซ่อมบำรุง / แจ้งปัญหา</Title>
              <Text type="secondary">กรุณากรอกรายละเอียดปัญหาหรือความเสียหาย เพื่อให้ช่างซ่อมบำรุงดำเนินการแก้ไข</Text>
            </div>

            {isSubmitted ? (
              <Card style={{ maxWidth: 800, margin: '0 auto', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderRadius: 12, borderTop: '4px solid #FF6500' }}>
                <Result
                  status="success"
                  title="ส่งคำขอแจ้งซ่อมสำเร็จ!"
                  subTitle="ระบบได้รับข้อมูลการแจ้งซ่อมของท่านแล้ว เจ้าหน้าที่จะทำการตรวจสอบและดำเนินการตามลำดับคิว"
                  extra={[
                    <div key="steps" style={{ padding: '24px 0', textAlign: 'left' }}>
                      <Steps
                        current={1}
                        items={[
                          { title: 'แจ้งซ่อม', content: 'ระบบรับเรื่องแล้ว' },
                          { title: 'รอดำเนินการ', content: 'งานพัสดุ/ช่าง ตรวจสอบ' },
                          { title: 'กำลังซ่อมแซม', content: 'ช่างกำลังปฏิบัติงาน' },
                          { title: 'เสร็จสิ้น', content: 'ปิดงานซ่อม' },
                        ]}
                      />
                    </div>,
                    <Button type="primary" key="back" onClick={() => { setIsSubmitted(false); form.resetFields(); }}>แจ้งซ่อมรายการใหม่</Button>
                  ]}
                />
              </Card>
            ) : (
              <Form
                form={form}
                name="maintenance_request_form"
                layout="vertical"
                onFinish={onFinish}
                onFinishFailed={onFinishFailed}
                autoComplete="off"
                initialValues={{ 
                  repairCategory: 'equipment',
                  requestDate: dayjs(),
                  urgencyLevel: 'normal'
                }}
              >
                <Row gutter={24}>
                  {/* คอลัมน์ซ้าย: ข้อมูลฟอร์มหลัก */}
                  <Col xs={24} lg={16}>
                    <Card variant="borderless" className="shadow-sm mb-6" style={{ borderRadius: 12, borderTop: '4px solid #FF6500' }}>
                      <Title level={4} className="mb-6 flex items-center gap-2">
                        <ToolOutlined style={{ color: '#FF6500' }} /> รายละเอียดการแจ้งซ่อม
                      </Title>
                      
                      <Form.Item label="ประเภทการแจ้งซ่อม" name="repairCategory" rules={[{ required: true }]}>
                        <Radio.Group className="w-full">
                          <Row gutter={[16, 16]}>
                            <Col xs={24} sm={12}>
                              <Card size="small" hoverable className={repairCategory === 'equipment' ? 'border-[#FF6500] bg-[#FF6500]/10' : ''}>
                                <Radio value="equipment" className="w-full">
                                  <span className="font-semibold text-base text-slate-200">งานซ่อมครุภัณฑ์</span>
                                  <div className="text-xs text-slate-400 whitespace-normal mt-1">มีเลขครุภัณฑ์ (เช่น คอมพิวเตอร์, เครื่องพิมพ์, โต๊ะ)</div>
                                </Radio>
                              </Card>
                            </Col>
                            <Col xs={24} sm={12}>
                              <Card size="small" hoverable className={repairCategory === 'general' ? 'border-[#FF6500] bg-[#FF6500]/10' : ''}>
                                <Radio value="general" className="w-full">
                                  <span className="font-semibold text-base text-slate-200">งานซ่อมทั่วไป</span>
                                  <div className="text-xs text-slate-400 whitespace-normal mt-1">ไม่มีเลขครุภัณฑ์ (เช่น หลอดไฟ, ท่อน้ำ, ผนัง)</div>
                                </Radio>
                              </Card>
                            </Col>
                          </Row>
                        </Radio.Group>
                      </Form.Item>

                      <Form.Item
                        label="หมายเลขครุภัณฑ์ (ถ้ามี / ถ้าทราบ)"
                        name="assetNumber"
                        tooltip="หากไม่แน่ใจหรือไม่มีข้อมูล ให้เว้นว่างไว้ เจ้าหน้าที่จะทำการตรวจสอบอีกครั้ง"
                      >
                        <Input
                          placeholder="ระบุเลขครุภัณฑ์ (เช่น ก.001-67-001)"
                          size="large"
                          addonAfter={
                            <Button
                              type="text"
                              size="small"
                              icon={<QrcodeOutlined />}
                              onClick={() => { setAssetSearch(''); setAssetModalOpen(true); }}
                              style={{ color: '#FF6500', fontWeight: 600, padding: '0 8px' }}
                            >
                              ค้นหาในระบบ
                            </Button>
                          }
                        />
                      </Form.Item>

                      {/* แสดงฟิลด์ประเภทงาน เมื่อเลือก "งานซ่อมทั่วไป" */}
                      {repairCategory === 'general' && (
                        <Form.Item label="ประเภทงานซ่อมทั่วไป" name="generalType" rules={[{ required: true, message: 'กรุณาเลือกประเภทงานซ่อม' }]}>
                          <Select placeholder="เลือกประเภทงาน" options={generalRepairOptions} size="large" />
                        </Form.Item>
                      )}

                      <Form.Item label="ระดับความเร่งด่วน" name="urgencyLevel" rules={[{ required: true, message: 'กรุณาระบุระดับความเร่งด่วน' }]}>
                        <Radio.Group buttonStyle="solid" className="flex w-full">
                          {urgencyOptions.map(opt => {
                            const color = opt.value === 'critical' ? '#ef4444' : opt.value === 'urgent' ? '#f59e0b' : '#22c55e';
                            return (
                              <ConfigProvider key={opt.value} theme={{ token: { colorPrimary: color } }}>
                                <Radio.Button value={opt.value} className="flex-1 text-center">
                                  {opt.label}
                                </Radio.Button>
                              </ConfigProvider>
                            );
                          })}
                        </Radio.Group>
                      </Form.Item>

                      <Row gutter={16}>
                        <Col xs={24} sm={12}>
                          <Form.Item label="ตึก/อาคาร" name="building" rules={[{ required: true, message: 'กรุณาเลือกตึก/อาคาร' }]}>
                            <Select placeholder="เลือกตึก/อาคาร" options={buildingOptions} size="large" showSearch optionFilterProp="label" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Form.Item label="สถานที่/บริเวณที่เกิดปัญหา" name="location" rules={[{ required: true, message: 'กรุณาระบุสถานที่' }]}>
                            <Input placeholder="เช่น ชั้น 2 ห้อง 201, หน้าลิฟต์" size="large" />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Form.Item label="อาการความเสียหาย / ปัญหาที่พบ" name="symptoms" rules={[{ required: true, message: 'กรุณาระบุอาการความเสียหาย' }]}>
                        <TextArea rows={4} placeholder="อธิบายรายละเอียดความเสียหาย หรือสิ่งที่ต้องการให้แก้ไข" />
                      </Form.Item>

                      <Form.Item 
                        label="อัปโหลดรูปภาพความเสียหาย (ถ้ามี)" 
                        name="images" 
                        valuePropName="fileList" 
                        getValueFromEvent={normFile}
                        extra="สามารถอัปโหลดได้สูงสุด 3 รูปภาพ เพื่อช่วยให้ช่างประเมินงานได้เร็วขึ้น"
                      >
                        <Upload 
                          listType="picture-card" 
                          maxCount={3}
                          beforeUpload={() => false} // ป้องกันการอัปโหลดจริงในหน้า UI Demo
                        >
                          <div>
                            <PlusOutlined />
                            <div style={{ marginTop: 8 }}>เพิ่มรูปภาพ</div>
                          </div>
                        </Upload>
                      </Form.Item>
                    </Card>

                    <Card variant="borderless" className="shadow-sm mb-6" style={{ borderRadius: 12 }}>
                      <Title level={5} className="mb-4">ข้อมูลผู้แจ้ง</Title>
                      <Row gutter={16}>
                        <Col xs={24} sm={12}>
                          <Form.Item label="วันที่แจ้ง" name="requestDate">
                            <DatePicker style={{ width: '100%' }} disabled format="DD/MM/YYYY" size="large" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Form.Item label="ชื่อ-นามสกุล ผู้แจ้ง" name="reporterName" rules={[{ required: true, message: 'กรุณาระบุชื่อผู้แจ้ง' }]}>
                            <Input placeholder="ระบุชื่อ-นามสกุล" size="large" />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Row gutter={16}>
                        <Col xs={24} sm={12}>
                          <Form.Item label="เบอร์ติดต่อ" name="contactNumber" rules={[{ required: true, message: 'กรุณาระบุเบอร์ติดต่อ' }]}>
                            <Input placeholder="ระบุเบอร์โทรศัพท์ที่ติดต่อได้" size="large" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Form.Item label="หน่วยงานที่แจ้ง" name="department" rules={[{ required: true, message: 'กรุณาระบุหน่วยงาน' }]}>
                            <Input placeholder="ระบุหน่วยงานของท่าน" size="large" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>
                  </Col>

                  {/* คอลัมน์ขวา: คำแนะนำและปุ่มกด */}
                  <Col xs={24} lg={8}>
                    <Card variant="borderless" className="shadow-sm mb-6 bg-slate-800 border-slate-700" style={{ borderRadius: 12 }}>
                      <Title level={4} className="mb-4" style={{ color: '#FF6500' }}>ข้อแนะนำ</Title>
                      <Alert
                        title="การระบุข้อมูล"
                        description={
                          <ul className="list-disc pl-4 mt-2 mb-0 text-slate-300 text-sm">
                            <li>หากเป็น <b>ครุภัณฑ์</b> การมีเลขครุภัณฑ์จะช่วยให้งานพัสดุค้นหาประวัติได้รวดเร็วขึ้น (หากหาไม่พบ ให้เว้นว่างไว้)</li>
                            <li>การแนบรูปภาพจุดเกิดเหตุหรือป้ายอุปกรณ์ จะทำให้ช่างเตรียมเครื่องมือได้ตรงจุด</li>
                            <li>กรณีเร่งด่วนฉุกเฉิน (เช่น ท่อประปาแตกน้ำท่วม, ไฟช็อต) กรุณาโทรแจ้งงานซ่อมบำรุงโดยตรง</li>
                          </ul>
                        }
                        type="info"
                        showIcon
                      />
                    </Card>

                    <Card variant="borderless" className="shadow-sm mt-4" style={{ borderRadius: 12 }}>
                      <Title level={4} className="mb-6 flex items-center gap-2">
                        <CheckCircleOutlined style={{ color: '#FF6500' }} /> การดำเนินการ
                      </Title>
                      <Divider />
                      <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        block
                        className="h-12 text-lg font-semibold"
                        style={{ boxShadow: '0 4px 14px rgba(255,101,0,0.3)' }}
                      >
                        ส่งเรื่องแจ้งซ่อม
                      </Button>
                      <Button type="link" block className="mt-2 text-slate-400" onClick={() => form.resetFields()}>
                        ล้างข้อมูล
                      </Button>
                    </Card>
                  </Col>
                </Row>
              </Form>
            )}
          </div>
        </div>
      </div>
      {/* ── Asset Search Modal ─────────────────────────────────────────────── */}
      <Modal
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <QrcodeOutlined style={{ color: '#FF6500' }} />
            ค้นหาครุภัณฑ์ในระบบ
          </span>
        }
        open={assetModalOpen}
        onCancel={() => { setAssetModalOpen(false); setAssetSearch(''); }}
        footer={null}
        width={820}
        destroyOnHidden
      >
        <Input
          size="large"
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          placeholder="ค้นหาด้วย เลขครุภัณฑ์ / ชื่อครุภัณฑ์ / ประเภท / หน่วยงาน"
          value={assetSearch}
          onChange={e => setAssetSearch(e.target.value)}
          allowClear
          autoFocus
          style={{ marginBottom: 16 }}
        />

        <Table
          dataSource={filteredAssets}
          rowKey="assetNo"
          size="small"
          pagination={{ pageSize: 8, showTotal: t => `พบ ${t} รายการ` }}
          scroll={{ x: 700 }}
          locale={{ emptyText: 'ไม่พบครุภัณฑ์ที่ตรงกับคำค้นหา' }}
          columns={[
            {
              title: 'เลขครุภัณฑ์', dataIndex: 'assetNo', key: 'assetNo', width: 140,
              render: (v: string) => <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#FF6500' }}>{v}</span>
            },
            {
              title: 'ชื่อครุภัณฑ์', dataIndex: 'name', key: 'name',
              render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span>
            },
            {
              title: 'ประเภท', dataIndex: 'type', key: 'type', width: 120,
              render: (v: string) => <Tag>{v}</Tag>
            },
            {
              title: 'หน่วยงาน', dataIndex: 'department', key: 'department', width: 150,
              render: (v: string) => <span style={{ fontSize: 12, color: '#94a3b8' }}>{v}</span>
            },
            {
              title: 'สภาพ', dataIndex: 'status', key: 'status', align: 'center' as const, width: 90,
              render: (v: string) => <Tag color={ASSET_STATUS_COLOR[v]}>{v}</Tag>
            },
            {
              title: '', key: 'action', width: 80, align: 'center' as const,
              render: (_: any, r: typeof MOCK_ASSETS[0]) => (
                <Button
                  type="primary"
                  size="small"
                  onClick={() => handleSelectAsset(r.assetNo)}
                  style={{ background: '#FF6500', borderColor: '#FF6500' }}
                >
                  เลือก
                </Button>
              )
            },
          ]}
        />
      </Modal>
    </ConfigProvider>
  )
}

export default MaintenanceRequestPage