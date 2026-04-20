'use client'
import React, { useState, useMemo } from 'react'
import {
  ConfigProvider, theme, Typography, Breadcrumb, Card, Tag, Button, Table,
  Input, Select, Tabs, Badge, Tooltip, Modal, Form, Space, Divider
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, SearchOutlined, PlusOutlined,
  ToolOutlined, UserOutlined, EyeOutlined
} from '@ant-design/icons'
import { FaWrench, FaFileAlt, FaBriefcaseMedical, FaDesktop } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import { useRouter } from 'next/navigation'
import { MOCK_WORK_ORDERS } from '../dashboard/page'

const { Title, Text } = Typography

type WOStatus = 'pending' | 'in_progress' | 'waiting_parts' | 'done'

const STATUS_TAG: Record<WOStatus, { label: string; color: string }> = {
  pending:       { label: 'รอรับงาน',   color: 'default'    },
  in_progress:   { label: 'กำลังซ่อม',  color: 'processing' },
  waiting_parts: { label: 'รออะไหล่',   color: 'warning'    },
  done:          { label: 'เสร็จแล้ว',  color: 'success'    },
}

const URGENCY_TAG: Record<string, string> = { normal: 'default', urgent: 'warning', critical: 'error' }
const URGENCY_LABEL: Record<string, string> = { normal: 'ปกติ', urgent: 'ด่วน', critical: 'ด่วนมาก' }
const TYPE_ICON: Record<string, React.ReactNode> = {
  maintenance: <FaWrench style={{ color: '#f59e0b' }} />,
  medical:     <FaBriefcaseMedical style={{ color: '#ef4444' }} />,
  it:          <FaDesktop style={{ color: '#a78bfa' }} />,
}

const TECHS = ['นายวิชัย เครื่องมือดี', 'นายเทคโน สมาร์ท', 'นายสมศักดิ์ แอร์เย็น', 'นางสาวมาลี อุปกรณ์ดี']

export default function WorkOrderListPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [form] = Form.useForm()

  const filtered = useMemo(() => {
    let list = [...MOCK_WORK_ORDERS]
    if (statusFilter !== 'all') list = list.filter(w => w.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(w =>
        w.id.toLowerCase().includes(q) ||
        w.assetName.toLowerCase().includes(q) ||
        w.department.toLowerCase().includes(q) ||
        (w.tech ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [search, statusFilter])

  const counts = useMemo(() => ({
    all:           MOCK_WORK_ORDERS.length,
    pending:       MOCK_WORK_ORDERS.filter(w => w.status === 'pending').length,
    in_progress:   MOCK_WORK_ORDERS.filter(w => w.status === 'in_progress').length,
    waiting_parts: MOCK_WORK_ORDERS.filter(w => w.status === 'waiting_parts').length,
    done:          MOCK_WORK_ORDERS.filter(w => w.status === 'done').length,
  }), [])

  const columns = [
    {
      title: 'เลขที่ใบงาน', dataIndex: 'id', key: 'id', width: 130,
      render: (v: string) => <Text style={{ color: '#FF6500', fontWeight: 600, cursor: 'pointer' }} onClick={() => router.push(`/general/maintenance/work-order/${v}`)}>{v}</Text>
    },
    {
      title: 'ประเภท', dataIndex: 'type', key: 'type', width: 60, align: 'center' as const,
      render: (v: string) => <Tooltip title={{ maintenance: 'ซ่อมบำรุง', medical: 'เครื่องมือแพทย์', it: 'คอมพิวเตอร์ IT' }[v]}><span style={{ fontSize: 16 }}>{TYPE_ICON[v]}</span></Tooltip>
    },
    {
      title: 'อุปกรณ์/ครุภัณฑ์', key: 'asset', render: (_: any, r: typeof MOCK_WORK_ORDERS[0]) => (
        <div>
          <div style={{ fontWeight: 500, color: '#e2e8f0' }}>{r.assetName}</div>
          {r.assetNo && <Text style={{ fontSize: 11, color: '#64748b' }}>{r.assetNo}</Text>}
        </div>
      )
    },
    {
      title: 'หน่วยงาน / สถานที่', key: 'dept', width: 200,
      render: (_: any, r: typeof MOCK_WORK_ORDERS[0]) => (
        <div>
          <div style={{ fontSize: 13 }}>{r.department}</div>
          <Text style={{ fontSize: 11, color: '#64748b' }}>{r.location}</Text>
        </div>
      )
    },
    {
      title: 'ความเร่งด่วน', dataIndex: 'urgency', key: 'urgency', width: 100,
      render: (v: string) => <Tag color={URGENCY_TAG[v]}>{URGENCY_LABEL[v]}</Tag>
    },
    {
      title: 'สถานะ', dataIndex: 'status', key: 'status', width: 120,
      render: (v: WOStatus) => <Tag color={STATUS_TAG[v].color}>{STATUS_TAG[v].label}</Tag>
    },
    {
      title: 'ช่างผู้รับผิดชอบ', dataIndex: 'tech', key: 'tech', width: 160,
      render: (v?: string) => v
        ? <Text style={{ color: '#6ee7b7', fontSize: 13 }}>{v}</Text>
        : <Tag color="default">ยังไม่มอบหมาย</Tag>
    },
    {
      title: 'วันที่สร้าง', dataIndex: 'createdDate', key: 'createdDate', width: 110,
      render: (v: string) => <Text style={{ fontSize: 13, color: '#94a3b8' }}>{v}</Text>
    },
    {
      title: 'ค่าใช้จ่าย', key: 'cost', width: 100, align: 'right' as const,
      render: (_: any, r: typeof MOCK_WORK_ORDERS[0]) => (
        <Text style={{ color: r.totalCost > 0 ? '#a78bfa' : '#475569', fontSize: 13 }}>
          {r.totalCost > 0 ? `฿${r.totalCost.toLocaleString()}` : '—'}
        </Text>
      )
    },
    {
      title: '', key: 'action', width: 80,
      render: (_: any, r: typeof MOCK_WORK_ORDERS[0]) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => router.push(`/general/maintenance/work-order/${r.id}`)}>
          เปิด
        </Button>
      )
    },
  ]

  const tabItems = [
    { key: 'all',           label: <span>ทั้งหมด <Badge count={counts.all} style={{ background: '#475569' }} /></span> },
    { key: 'pending',       label: <span>รอรับงาน <Badge count={counts.pending} style={{ background: '#475569' }} /></span> },
    { key: 'in_progress',   label: <span>กำลังซ่อม <Badge count={counts.in_progress} color="processing" /></span> },
    { key: 'waiting_parts', label: <span>รออะไหล่ <Badge count={counts.waiting_parts} color="warning" /></span> },
    { key: 'done',          label: <span>เสร็จแล้ว <Badge count={counts.done} color="success" /></span> },
  ]

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#FF6500', borderRadius: 8 } }}>
      <div className="min-h-screen bg-slate-900 text-slate-200">
        <Navbar />
        <div className="p-6 md:p-8">
          <Breadcrumb className="mb-6" items={[
            { href: '/',        title: <><HomeOutlined /> หน้าหลัก</> },
            { href: '/general', title: <><FileTextOutlined /> งานบริหารงานทั่วไป</> },
            { href: '/general/maintenance/dashboard', title: 'Dashboard งานซ่อม' },
            { title: 'ใบสั่งงานซ่อม' },
          ]} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <FaFileAlt style={{ fontSize: 24, color: '#FF6500' }} />
              <Title level={3} style={{ margin: 0, color: '#f1f5f9' }}>ใบสั่งงานซ่อม (Work Order)</Title>
            </div>
            <Space>
              <Button onClick={() => router.push('/general/maintenance/dashboard')}>Kanban View</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                สร้างใบงานซ่อม
              </Button>
            </Space>
          </div>

          <Card style={{ background: '#1e293b', border: '1px solid #334155' }}>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <Input
                prefix={<SearchOutlined style={{ color: '#64748b' }} />}
                placeholder="ค้นหาเลขที่ใบงาน ชื่ออุปกรณ์ หน่วยงาน ช่าง..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                allowClear
                style={{ width: 340 }}
              />
            </div>

            <Tabs
              activeKey={statusFilter}
              onChange={setStatusFilter}
              items={tabItems}
              style={{ marginBottom: 12 }}
            />

            <Table
              dataSource={filtered}
              columns={columns}
              rowKey="id"
              size="small"
              scroll={{ x: 1100 }}
              pagination={{ pageSize: 12, showSizeChanger: false }}
              rowClassName={r => r.urgency === 'critical' ? 'bg-red-950/20' : ''}
            />
          </Card>
        </div>
      </div>

      {/* Create WO Modal */}
      <Modal
        title={<span><PlusOutlined style={{ color: '#FF6500', marginRight: 8 }} />สร้างใบสั่งงานซ่อมใหม่</span>}
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields() }}
        onOk={() => form.submit()}
        okText="สร้างใบงาน"
        cancelText="ยกเลิก"
        width={560}
      >
        <Divider />
        <Form form={form} layout="vertical" onFinish={() => { setCreateOpen(false); form.resetFields() }}>
          <Form.Item label="เลขครุภัณฑ์ / ชื่ออุปกรณ์" name="asset" rules={[{ required: true, message: 'กรุณาระบุอุปกรณ์' }]}>
            <Input placeholder="เช่น MED-65-001 หรือ เครื่อง ECG..." />
          </Form.Item>
          <Form.Item label="อ้างอิงจากคำขอแจ้งซ่อม (ถ้ามี)" name="reqId">
            <Select placeholder="เลือกคำขอ" allowClear options={[
              { label: 'REQ-2026-001 — กล้อง CCTV', value: 'REQ-2026-001' },
              { label: 'REQ-2026-007 — Infusion Pump', value: 'REQ-2026-007' },
            ]} />
          </Form.Item>
          <Form.Item label="มอบหมายช่าง" name="tech" rules={[{ required: true, message: 'กรุณาเลือกช่าง' }]}>
            <Select placeholder="เลือกช่าง" options={TECHS.map(t => ({ label: t, value: t }))} />
          </Form.Item>
          <Form.Item label="ระดับความเร่งด่วน" name="urgency" initialValue="normal">
            <Select options={[
              { label: 'ปกติ', value: 'normal' },
              { label: 'ด่วน', value: 'urgent' },
              { label: 'ด่วนมาก', value: 'critical' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </ConfigProvider>
  )
}
