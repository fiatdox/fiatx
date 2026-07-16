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
import { useThemeMode } from '@/app/components/ThemeProvider'

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


// สีป้าย Version — กำหนดสีจริงเอง (พื้น/ขอบ/ตัวอักษร) ให้ชัดทั้งโหมด light/dark
// เดิมใช้ preset ของ antd แล้วถูก token.colorText ทับ ทำให้ตัวอักษรกลายเป็นดำสนิทในโหมด light
const VERSION_STYLE: Record<string, { c: string; bg: string; b: string }> = {
  'v3.12.5': { c: '#16a34a', bg: 'rgba(34,197,94,0.14)',  b: 'rgba(34,197,94,0.45)' },
  'v3.11.2': { c: '#d97706', bg: 'rgba(245,158,11,0.14)', b: 'rgba(245,158,11,0.45)' },
  'v3.10.0': { c: '#dc2626', bg: 'rgba(239,68,68,0.14)',  b: 'rgba(239,68,68,0.45)' },
}
const versionStyle = (v: string) =>
  VERSION_STYLE[v] ?? { c: 'var(--app-text-2)', bg: 'var(--app-bg)', b: 'var(--app-border-strong)' }

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
      background: 'var(--app-surface)',
      color: 'var(--app-text)',
    }).then(async result => {
      if (!result.isConfirmed) return
      await fetch(`/api/v1/his/sessions/${record.onlineid}`, { method: 'DELETE' })
      setUsers(prev => prev.filter(u => u.key !== record.key))
      setSelectedRowKeys(prev => prev.filter(k => k !== record.key))
      Swal.fire({ title: 'Clear Session สำเร็จ', text: `${record.kskloginname} ออกจากระบบแล้ว`, icon: 'success', timer: 2000, showConfirmButton: false, background: 'var(--app-surface)', color: 'var(--app-text)' })
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
      background: 'var(--app-surface)',
      color: 'var(--app-text)',
    }).then(async result => {
      if (!result.isConfirmed) return
      await fetch('/api/v1/his/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selected.map(u => u.onlineid) }),
      })
      setUsers(prev => prev.filter(u => !selectedRowKeys.includes(u.key)))
      setSelectedRowKeys([])
      Swal.fire({ title: 'สำเร็จ', text: `Clear Session ${selected.length} รายการแล้ว`, icon: 'success', timer: 2000, showConfirmButton: false, background: 'var(--app-surface)', color: 'var(--app-text)' })
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
      render: (_, __, i) => <Text style={{ color: 'var(--app-text-3)', fontSize: 12 }}>{i + 1}</Text>,
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
          <Text strong style={{ color: 'var(--app-text)', fontFamily: 'monospace', fontSize: 13 }}>{v}</Text>
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
          <DesktopOutlined style={{ color: 'var(--app-text-3)' }} />
          <Text style={{ color: 'var(--app-text-2)', fontFamily: 'monospace', fontSize: 13 }}>{v}</Text>
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
          <DatabaseOutlined style={{ color: 'var(--app-text-3)' }} />
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
      render: v => {
        const s = versionStyle(v)
        return <Tag style={{ fontFamily: 'monospace', fontWeight: 600, margin: 0, color: s.c, background: s.bg, borderColor: s.b }}>{v || '—'}</Tag>
      },
    },
    {
      title: 'แผนก',
      dataIndex: 'department',
      key: 'department',
      render: v => <Text style={{ color: 'var(--app-text)' }}>{v}</Text>,
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
    <div className="min-h-screen bg-app-bg text-app-text">
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
            <Title level={3} style={{ color: 'var(--app-text)', margin: 0 }}>HIS User Sessions</Title>
            <Text style={{ color: 'var(--app-text-3)' }}>ผู้ใช้งานที่ Login อยู่ในระบบ HIS ขณะนี้</Text>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <Input
            prefix={<SearchOutlined style={{ color: 'var(--app-text-3)' }} />}
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
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#6B21A8',
          borderRadius: 8,
          colorBgContainer: 'var(--app-surface)',
          colorBgElevated: 'var(--app-elevated)',
          colorBorder: 'var(--app-border-strong)',
          colorText: 'var(--app-text)',
          colorTextSecondary: 'var(--app-text-2)',
        },
        components: {
          Table: {
            headerBg: isDark ? '#2e1065' : '#f3e8ff',
            headerColor: isDark ? '#c4b5fd' : '#6B21A8',
            rowHoverBg: isDark ? '#293548' : '#faf5ff',
            borderColor: 'var(--app-border)',
            colorBgContainer: 'var(--app-surface)',
            colorText: 'var(--app-text)',
          },
          Input: { colorBgContainer: 'var(--app-bg)', colorBorder: 'var(--app-border-strong)', colorText: 'var(--app-text)' },
          Select: { colorBgContainer: 'var(--app-bg)', colorBorder: 'var(--app-border-strong)', colorText: 'var(--app-text)', optionSelectedBg: isDark ? '#4a1d96' : '#ede9fe' },
          Button: { colorBgContainer: 'var(--app-surface)', colorBorder: 'var(--app-border-strong)', colorText: 'var(--app-text-2)' },
          Pagination: { colorText: 'var(--app-text-2)', colorPrimary: '#6B21A8' },
        },
      }}
    >
      <App>
        <PageContent />
        <style>{`
          .ant-table-cell-fix-left, .ant-table-cell-fix-right { background: var(--app-surface) !important; }
          .ant-table-tbody > tr.ant-table-row-selected > td { background: ${isDark ? '#2e1065' : '#f3e8ff'} !important; }
        `}</style>
      </App>
    </ConfigProvider>
  )
}
