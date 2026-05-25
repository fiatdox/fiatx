'use client'
import React, { useState, useMemo, useCallback, useEffect } from 'react'
import {
  ConfigProvider, App, theme, Table, Tag, Button, Input,
  Typography, Breadcrumb, Space, Tooltip, Spin,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  HomeOutlined, LogoutOutlined, SearchOutlined,
  ReloadOutlined, DeleteOutlined, DesktopOutlined,
  DatabaseOutlined,
} from '@ant-design/icons'
import { FaUserClock, FaUserCheck } from 'react-icons/fa'
import Swal from 'sweetalert2'
import Navbar from '@/app/components/Navbar'

const { Title, Text } = Typography

interface OnlineUser {
  key: string
  onlineid: string | number
  kskloginname: string
  computername: string | null
  servername: string | null
  client_version: string | null
  department: string | null
}


const VERSION_COLOR: Record<string, string> = {
  'v3.12.5': 'green',
  'v3.11.2': 'gold',
  'v3.10.0': 'red',
}

const PageContent = () => {
  const { message } = App.useApp()
  const [users, setUsers] = useState<OnlineUser[]>([])
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(false)

  const filteredData = useMemo(() => {
    if (!searchText) return users
    const q = searchText.toLowerCase()
    return users.filter(u =>
      (u.kskloginname ?? '').toLowerCase().includes(q) ||
      (u.computername ?? '').toLowerCase().includes(q) ||
      (u.department ?? '').toLowerCase().includes(q) ||
      (u.servername ?? '').toLowerCase().includes(q)
    )
  }, [users, searchText])

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/his/sessions')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: Omit<OnlineUser, 'key'>[] = await res.json()
      setUsers(data.map((d, i) => ({ ...d, key: String(d.onlineid ?? i) })))
    } catch (err) {
      message.error('โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const handleClearSingle = (record: OnlineUser) => {
    Swal.fire({
      title: 'ยืนยันการ Clear Session',
      html: `บังคับออกจากระบบ<br/><b>${record.kskloginname}</b> (${record.computername}) ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ยืนยัน Clear Session',
      cancelButtonText: 'ยกเลิก',
      background: '#1e293b',
      color: '#e2e8f0',
    }).then(async result => {
      if (!result.isConfirmed) return
      await fetch(`/api/v1/his/sessions/${record.onlineid}`, { method: 'DELETE' })
      setUsers(prev => prev.filter(u => u.key !== record.key))
      setSelectedRowKeys(prev => prev.filter(k => k !== record.key))
      Swal.fire({ title: 'Clear Session สำเร็จ', text: `${record.kskloginname} ออกจากระบบแล้ว`, icon: 'success', timer: 2000, showConfirmButton: false, background: '#1e293b', color: '#e2e8f0' })
    })
  }

  const handleClearSelected = () => {
    if (selectedRowKeys.length === 0) { message.warning('กรุณาเลือกผู้ใช้งานก่อน'); return }
    const selected = users.filter(u => selectedRowKeys.includes(u.key))
    Swal.fire({
      title: `ยืนยัน Clear Session (${selected.length} รายการ)`,
      html: `<div style="text-align:left;max-height:160px;overflow-y:auto;background:#0f172a;padding:10px 14px;border-radius:8px;margin-top:8px;font-size:13px;">
        ${selected.map(u => `<div style="padding:3px 0;color:#e2e8f0">• <b>${u.kskloginname}</b> &nbsp;<span style="color:#64748b">${u.computername}</span></div>`).join('')}
      </div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Clear Session ${selected.length} รายการ`,
      cancelButtonText: 'ยกเลิก',
      background: '#1e293b',
      color: '#e2e8f0',
    }).then(async result => {
      if (!result.isConfirmed) return
      await fetch('/api/v1/his/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selected.map(u => u.onlineid) }),
      })
      setUsers(prev => prev.filter(u => !selectedRowKeys.includes(u.key)))
      setSelectedRowKeys([])
      Swal.fire({ title: 'สำเร็จ', text: `Clear Session ${selected.length} รายการแล้ว`, icon: 'success', timer: 2000, showConfirmButton: false, background: '#1e293b', color: '#e2e8f0' })
    })
  }

  const handleRefresh = () => {
    setSearchText('')
    setSelectedRowKeys([])
    fetchSessions()
  }

  const columns: TableColumnsType<OnlineUser> = [
    {
      title: '#',
      key: 'no',
      width: 48,
      align: 'center',
      render: (_, __, i) => <Text style={{ color: '#475569', fontSize: 12 }}>{i + 1}</Text>,
    },
    {
      title: 'Login Name',
      dataIndex: 'kskloginname',
      key: 'kskloginname',
      width: 160,
      render: v => (
        <Space size={8}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#2e1065', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FaUserCheck size={13} color="#a78bfa" />
          </div>
          <Text strong style={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: 13 }}>{v}</Text>
        </Space>
      ),
    },
    {
      title: 'Computer',
      dataIndex: 'computername',
      key: 'computername',
      width: 160,
      render: v => (
        <Space size={6}>
          <DesktopOutlined style={{ color: '#475569' }} />
          <Text style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 13 }}>{v}</Text>
        </Space>
      ),
    },
    {
      title: 'Server',
      dataIndex: 'servername',
      key: 'servername',
      width: 140,
      render: v => (
        <Space size={6}>
          <DatabaseOutlined style={{ color: '#475569' }} />
          <Text style={{ color: '#7dd3fc', fontFamily: 'monospace', fontSize: 13 }}>{v}</Text>
        </Space>
      ),
    },
    {
      title: 'Version',
      dataIndex: 'client_version',
      key: 'client_version',
      width: 100,
      align: 'center',
      render: v => <Tag color={VERSION_COLOR[v] ?? 'default'} style={{ fontFamily: 'monospace', fontWeight: 600, margin: 0 }}>{v}</Tag>,
    },
    {
      title: 'แผนก',
      dataIndex: 'department',
      key: 'department',
      render: v => <Text style={{ color: '#cbd5e1' }}>{v}</Text>,
    },
    {
      title: '',
      key: 'action',
      width: 95,
      align: 'center',
      render: (_, record) => (
        <Tooltip title="บังคับออกจากระบบ">
          <Button danger size="small" icon={<LogoutOutlined />} onClick={() => handleClearSingle(record)}>
            Clear
          </Button>
        </Tooltip>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <Navbar />
      <div className="p-6 md:p-8">

        <Breadcrumb
          className="mb-5"
          items={[
            { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: 'เทคโนโลยีสารสนเทศ' },
            { title: 'HIS User Sessions' },
          ]}
        />

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <FaUserClock size={26} color="#6B21A8" />
          <div>
            <Title level={3} style={{ color: '#e2e8f0', margin: 0 }}>HIS User Sessions</Title>
            <Text style={{ color: '#64748b' }}>ผู้ใช้งานที่ Login อยู่ในระบบ HIS ขณะนี้</Text>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#475569' }} />}
            placeholder="ค้นหา login name, computer, server, แผนก..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            allowClear
            style={{ width: 320 }}
          />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>รีเฟรช</Button>
            <Button
              danger
              icon={<DeleteOutlined />}
              disabled={selectedRowKeys.length === 0}
              onClick={handleClearSelected}
            >
              Clear Session{selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ''}
            </Button>
          </div>
        </div>

        {/* Selection banner */}
        {selectedRowKeys.length > 0 && (
          <div style={{ background: '#3b0764', border: '1px solid #6B21A8', borderRadius: 8, padding: '9px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#e9d5ff' }}>เลือกแล้ว <b>{selectedRowKeys.length}</b> รายการ</Text>
            <Space size={8}>
              <Button size="small" onClick={() => setSelectedRowKeys([])} style={{ borderColor: '#6B21A8', color: '#c4b5fd', background: 'transparent' }}>ยกเลิกการเลือก</Button>
              <Button size="small" danger icon={<LogoutOutlined />} onClick={handleClearSelected}>Clear Session ที่เลือก</Button>
            </Space>
          </div>
        )}

        {/* Table */}
        <Spin spinning={loading}>
          <Table
            rowSelection={{ type: 'checkbox', selectedRowKeys, onChange: setSelectedRowKeys }}
            columns={columns}
            dataSource={filteredData}
            rowKey="key"
            size="middle"
            scroll={{ x: 900 }}
            pagination={{
              pageSize: 15,
              showSizeChanger: true,
              showTotal: total => `Online ${total} รายการ`,
            }}
          />
        </Spin>

      </div>
    </div>
  )
}

export default function HisUsersSessionPage() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#6B21A8',
          borderRadius: 8,
          colorBgContainer: '#1e293b',
          colorBgElevated: '#1e293b',
          colorBorder: '#334155',
          colorText: '#e2e8f0',
          colorTextSecondary: '#94a3b8',
        },
        components: {
          Table: {
            headerBg: '#2e1065',
            headerColor: '#c4b5fd',
            rowHoverBg: '#293548',
            borderColor: '#334155',
            colorBgContainer: '#1e293b',
            colorText: '#e2e8f0',
          },
          Input: { colorBgContainer: '#0f172a', colorBorder: '#334155', colorText: '#e2e8f0' },
          Select: { colorBgContainer: '#0f172a', colorBorder: '#334155', colorText: '#e2e8f0', optionSelectedBg: '#4a1d96' },
          Button: { colorBgContainer: '#1e293b', colorBorder: '#334155', colorText: '#94a3b8' },
          Pagination: { colorText: '#94a3b8', colorPrimary: '#6B21A8' },
        },
      }}
    >
      <App>
        <PageContent />
        <style>{`
          .ant-table-cell-fix-left, .ant-table-cell-fix-right { background: #1e293b !important; }
          .ant-table-tbody > tr.ant-table-row-selected > td { background: #2e1065 !important; }
        `}</style>
      </App>
    </ConfigProvider>
  )
}
