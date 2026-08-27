'use client'
import React, { useEffect, useRef, useState } from 'react'
import {
  ConfigProvider, App, Typography, Breadcrumb, Card, Tag, theme, Button, Table,
  Input, Empty, Alert, Result, Modal, Form, Switch, Tabs, Tooltip, Progress,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  HomeOutlined, SearchOutlined, KeyOutlined, ReloadOutlined, HistoryOutlined,
  CheckCircleFilled, CloseCircleFilled,
} from '@ant-design/icons'
import { FaUserLock } from 'react-icons/fa'
import dayjs from 'dayjs'
import Cookies from 'js-cookie'
import Swal from 'sweetalert2'
import Navbar from '@/app/components/Navbar'
import { useThemeMode } from '@/app/components/ThemeProvider'

const { Title, Text } = Typography

const ALLOWED_ROLES = ['ADMIN', 'IT_STAFF']

type Row = {
  id: number
  username: string
  name: string
  is_active: string
  position_name?: string | null
  major_name?: string | null
  id_card_masked: string | null
  id_card_valid: boolean
  password_changed_at: string | null
}
type AuditRow = {
  id: number; target_user_id: number; target_username: string | null; target_name: string | null
  actor_username: string | null; field: string
  old_value: string | null; new_value: string | null; client_ip: string | null; created_at: string
}

const FIELD_LABEL: Record<string, { label: string; color: string }> = {
  username: { label: 'ชื่อผู้ใช้', color: 'blue' },
  password: { label: 'รหัสผ่าน', color: 'red' },
  id_card: { label: 'เลขบัตรประชาชน', color: 'orange' },
}

// กติกาความแข็งแรงของรหัสผ่าน — ต้องตรงกับ utils/passwordStrength.ts ฝั่ง backend
const PWD_RULES = [
  { key: 'len',     label: 'อย่างน้อย 8 ตัวอักษร',      test: (v: string) => v.length >= 8 },
  { key: 'upper',   label: 'มีตัวอักษรพิมพ์ใหญ่ (A-Z)',  test: (v: string) => /[A-Z]/.test(v) },
  { key: 'lower',   label: 'มีตัวอักษรพิมพ์เล็ก (a-z)',   test: (v: string) => /[a-z]/.test(v) },
  { key: 'number',  label: 'มีตัวเลข (0-9)',            test: (v: string) => /[0-9]/.test(v) },
  { key: 'special', label: 'มีอักขระพิเศษ (!@#$%^&*)',  test: (v: string) => /[!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?]/.test(v) },
]

// สุ่มรหัสผ่านที่ผ่านทุกกฎ — ช่วยผู้ดูแลตั้งรหัสชั่วคราวได้เร็ว
const genPassword = (): string => {
  const U = 'ABCDEFGHJKLMNPQRSTUVWXYZ', L = 'abcdefghijkmnpqrstuvwxyz'
  const N = '23456789', S = '!@#$%^&*'
  const all = U + L + N + S
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)]!
  const chars = [pick(U), pick(L), pick(N), pick(S)]
  while (chars.length < 12) chars.push(pick(all))
  // สลับตำแหน่งไม่ให้เดารูปแบบได้
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[chars[i], chars[j]] = [chars[j]!, chars[i]!]
  }
  return chars.join('')
}

const PageContent = () => {
  const { message } = App.useApp()

  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [audit, setAudit] = useState<AuditRow[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  const [editing, setEditing] = useState<Row | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  // ค่ารหัสผ่านที่กำลังพิมพ์ — ใช้แสดง checklist ความแข็งแรงแบบสด
  const [pwd, setPwd] = useState('')
  const pwdPassed = PWD_RULES.filter(r => r.test(pwd)).length

  const load = async (opts?: { search?: string; page?: number; pageSize?: number }) => {
    const s = opts?.search ?? search
    const p = opts?.page ?? page
    const ps = opts?.pageSize ?? pageSize
    setLoading(true)
    try {
      const qs = new URLSearchParams({ limit: String(ps), offset: String((p - 1) * ps) })
      if (s.trim()) qs.set('search', s.trim())
      const j = await fetch(`/api/v1/user-credentials?${qs.toString()}`).then(r => r.json())
      if (!j?.success) { message.error(j?.message || 'โหลดข้อมูลไม่สำเร็จ'); return }
      setRows(j.data.rows ?? [])
      setTotal(j.data.total ?? 0)
    } catch (e) { message.error((e as Error).message) } finally { setLoading(false) }
  }

  const loadAudit = async () => {
    setAuditLoading(true)
    try {
      const j = await fetch('/api/v1/user-credentials/audit?limit=200').then(r => r.json())
      if (j?.success) setAudit(j.data.rows ?? [])
    } catch { /* ignore */ } finally { setAuditLoading(false) }
  }

  useEffect(() => {
    Promise.all([load(), loadAudit()])
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSearchChange = (v: string) => {
    setSearch(v)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setPage(1); load({ search: v, page: 1 }) }, 400)
  }

  const openEdit = (r: Row) => setEditing(r)

  const submit = async () => {
    const v = await form.validateFields()
    if (!editing) return
    const payload: Record<string, unknown> = {}
    if (v.username?.trim() && v.username.trim() !== editing.username) payload.username = v.username.trim()
    if (v.password) payload.password = v.password
    if (v.id_card?.trim()) payload.id_card = v.id_card.trim()
    if (v.notify) payload.notify = true

    if (Object.keys(payload).filter(k => k !== 'notify').length === 0) {
      message.info('ไม่มีข้อมูลที่เปลี่ยนแปลง')
      return
    }

    const fields = Object.keys(payload).filter(k => k !== 'notify')
      .map(k => FIELD_LABEL[k]?.label ?? k).join(', ')
    const r = await Swal.fire({
      title: 'ยืนยันการแก้ไข?',
      html: `<div style="text-align:left;font-size:14px;line-height:1.8">
               <div>บัญชี: <b>${editing.name}</b> (${editing.username})</div>
               <div>สิ่งที่จะเปลี่ยน: <b>${fields}</b></div>
               <div style="margin-top:10px;padding:10px;border-radius:8px;background:#fee2e2;color:#991b1b">
                 การแก้ไขนี้ถูก<b>บันทึกประวัติ</b>ว่าท่านเป็นผู้ดำเนินการ
                 ${payload.id_card ? '<br>เปลี่ยนเลขบัตร = เปลี่ยนปลายทางรับ OTP ของบัญชีนี้ด้วย' : ''}
               </div>
             </div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ยืนยันแก้ไข',
      cancelButtonText: 'ยกเลิก',
    })
    if (!r.isConfirmed) return

    setSaving(true)
    try {
      const res = await fetch(`/api/v1/user-credentials/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await res.json()
      if (!res.ok || !j.success) { message.error(j.message || 'แก้ไขไม่สำเร็จ'); return }
      const changed = (j.data.changed ?? []).map((k: string) => FIELD_LABEL[k]?.label ?? k).join(', ')
      message.success(`แก้ไขเรียบร้อย: ${changed || 'ไม่มีการเปลี่ยนแปลง'}`)
      if (j.data.notified === false) message.warning('แก้ไขสำเร็จ แต่ส่งแจ้งเตือนทาง Line หมอพร้อมไม่สำเร็จ')
      setEditing(null)
      await Promise.all([load(), loadAudit()])
    } catch (e) { message.error((e as Error).message) } finally { setSaving(false) }
  }

  const cols: ColumnsType<Row> = [
    {
      title: 'ชื่อ-นามสกุล', dataIndex: 'name',
      render: (v: string, r) => (
        <div>
          <div>{v} {r.is_active !== 'Y' && <Tag color="default">ระงับ</Tag>}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.position_name ?? ''}{r.major_name ? ` · ${r.major_name}` : ''}</Text>
        </div>
      ),
    },
    {
      title: 'ชื่อผู้ใช้', dataIndex: 'username', width: 160,
      render: (v: string) => <Text style={{ fontFamily: 'monospace' }}>{v}</Text>,
    },
    {
      title: 'เลขบัตร', dataIndex: 'id_card_masked', width: 120, align: 'center' as const,
      render: (v: string | null, r) => v
        ? <Tooltip title="แสดงเฉพาะ 4 ตัวท้ายเพื่อความปลอดภัย"><Text style={{ fontFamily: 'monospace' }}>{v}</Text></Tooltip>
        : <Tag color={r.id_card_valid ? 'default' : 'error'}>ไม่มี</Tag>,
    },
    {
      title: 'เปลี่ยนรหัสล่าสุด', dataIndex: 'password_changed_at', width: 150, responsive: ['lg'],
      render: (v: string | null) => v
        ? <Text style={{ fontSize: 12 }}>{dayjs(v).format('DD/MM/')}{dayjs(v).year() + 543}</Text>
        : <Tag color="warning">ยังไม่ตั้งเอง</Tag>,
    },
    {
      title: '', width: 100, align: 'center' as const,
      render: (_, r) => <Button size="small" icon={<KeyOutlined />} onClick={() => openEdit(r)}>แก้ไข</Button>,
    },
  ]

  const auditCols: ColumnsType<AuditRow> = [
    { title: 'เวลา', dataIndex: 'created_at', width: 150, render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm:ss') },
    { title: 'บัญชีที่ถูกแก้', dataIndex: 'target_name', render: (v: string | null, r) => <div>{v ?? '-'}<div><Text type="secondary" style={{ fontSize: 11 }}>{r.target_username}</Text></div></div> },
    { title: 'รายการ', dataIndex: 'field', width: 140, render: (v: string) => <Tag color={FIELD_LABEL[v]?.color ?? 'default'}>{FIELD_LABEL[v]?.label ?? v}</Tag> },
    {
      title: 'เปลี่ยนจาก → เป็น', width: 240,
      render: (_, r) => r.field === 'password'
        ? <Text type="secondary" style={{ fontSize: 12 }}>(ไม่บันทึกค่ารหัสผ่าน)</Text>
        : <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>{r.old_value ?? '—'} → {r.new_value ?? '—'}</Text>,
    },
    { title: 'ผู้ดำเนินการ', dataIndex: 'actor_username', width: 130 },
  ]

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb className="mb-6" items={[
          { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
          { title: 'บัญชีผู้ใช้' },
          { title: 'จัดการบัญชีเข้าใช้งาน' },
        ]} />

        <div className="flex items-center gap-3 mb-2">
          <FaUserLock style={{ fontSize: 24, color: '#ef4444' }} />
          <Title level={3} style={{ margin: 0, color: 'var(--app-text)' }}>จัดการบัญชีเข้าใช้งานของบุคลากร</Title>
        </div>
        <Text type="secondary">แก้ไขชื่อผู้ใช้ รหัสผ่าน และเลขบัตรประชาชน — เฉพาะผู้ดูแลระบบและเจ้าหน้าที่ไอที</Text>

        <Alert
          type="warning" showIcon className="mt-4 mb-4"
          title="ข้อมูลในหน้านี้ใช้ยืนยันตัวตนเข้าระบบ"
          description="การแก้ไขทุกครั้งถูกบันทึกประวัติว่าใครแก้ของใครเมื่อไหร่ · เลขบัตรประชาชนเป็นปลายทางรับรหัส OTP ของ Line หมอพร้อม การแก้ไขจึงเปลี่ยนผู้รับ OTP ด้วย · ระบบไม่เก็บค่ารหัสผ่านไว้ที่ใดทั้งสิ้น"
        />

        <Card style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }} styles={{ body: { padding: 12 } }}>
          <Tabs
            defaultActiveKey="users"
            items={[
              {
                key: 'users',
                label: 'บุคลากร',
                children: (
                  <>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Input
                        allowClear prefix={<SearchOutlined />}
                        placeholder="ค้นหาชื่อ / ชื่อผู้ใช้ / เลขบัตร"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        style={{ maxWidth: 320 }}
                      />
                      <Button icon={<ReloadOutlined />} onClick={() => load()}>รีเฟรช</Button>
                    </div>
                    <Table
                      columns={cols} dataSource={rows} rowKey="id" loading={loading} size="small"
                      pagination={{
                        current: page, pageSize, total, showSizeChanger: true,
                        pageSizeOptions: [20, 50, 100, 200],
                        showTotal: (t) => `ทั้งหมด ${t.toLocaleString()} คน`,
                        onChange: (p, ps) => { setPage(p); setPageSize(ps); load({ page: p, pageSize: ps }) },
                      }}
                      locale={{ emptyText: <Empty description="ไม่พบบุคลากร" /> }}
                    />
                  </>
                ),
              },
              {
                key: 'audit',
                label: <span><HistoryOutlined /> ประวัติการแก้ไข ({audit.length})</span>,
                children: (
                  <>
                    <div className="flex justify-end mb-3">
                      <Button size="small" icon={<ReloadOutlined />} onClick={loadAudit}>รีเฟรช</Button>
                    </div>
                    <Table columns={auditCols} dataSource={audit} rowKey="id" loading={auditLoading} size="small"
                      pagination={{ pageSize: 20 }}
                      locale={{ emptyText: <Empty description="ยังไม่มีประวัติการแก้ไข" /> }} />
                  </>
                ),
              },
            ]}
          />
        </Card>
      </div>

      <Modal
        title={editing ? `แก้ไขบัญชี — ${editing.name}` : ''}
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={submit}
        confirmLoading={saving}
        okText="บันทึก"
        cancelText="ยกเลิก"
        destroyOnHidden
        afterOpenChange={(open) => {
          setPwd('')
          if (open && editing) {
            form.resetFields()
            form.setFieldsValue({ username: editing.username, password: '', id_card: '', notify: false })
          }
        }}
      >
        <Form form={form} layout="vertical" className="mt-2">
          <Form.Item
            label="ชื่อผู้ใช้" name="username"
            rules={[{ pattern: /^[a-zA-Z0-9._-]{4,50}$/, message: 'ยาว 4-50 ตัว ใช้ได้เฉพาะ a-z A-Z 0-9 . _ -' }]}
          >
            <Input style={{ fontFamily: 'monospace' }} />
          </Form.Item>

          <Form.Item
            label={
              <div className="flex items-center gap-2">
                <span>รหัสผ่านใหม่</span>
                <Button size="small" type="link" style={{ padding: 0, height: 'auto' }}
                  onClick={() => { const p = genPassword(); form.setFieldValue('password', p); setPwd(p) }}>
                  สุ่มรหัสผ่าน
                </Button>
              </div>
            }
            name="password"
            extra="เว้นว่างไว้ = ไม่เปลี่ยนรหัสผ่าน · ตั้งใหม่แล้วเจ้าของบัญชีจะถูกขอให้เปลี่ยนเป็นรหัสของตนเอง"
            rules={[{
              validator: (_, v) => {
                if (!v) return Promise.resolve()   // เว้นว่าง = ไม่เปลี่ยน
                const failed = PWD_RULES.filter(r => !r.test(v)).map(r => r.label)
                return failed.length ? Promise.reject(new Error(`ยังขาด: ${failed.join(' · ')}`)) : Promise.resolve()
              },
            }]}
          >
            <Input.Password autoComplete="new-password" placeholder="เว้นว่าง = ไม่เปลี่ยน"
              onChange={(e) => setPwd(e.target.value)} />
          </Form.Item>

          {pwd && (
            <div className="mb-4 -mt-2 rounded-lg p-3" style={{ background: 'var(--app-bg)', border: '1px solid var(--app-border-strong)' }}>
              <Progress
                percent={(PWD_RULES.filter(r => r.test(pwd)).length / PWD_RULES.length) * 100}
                size="small" showInfo={false}
                strokeColor={pwdPassed === PWD_RULES.length ? '#10b981' : pwdPassed >= 3 ? '#f59e0b' : '#ef4444'}
              />
              <div className="mt-2 flex flex-col gap-1">
                {PWD_RULES.map(r => {
                  const ok = r.test(pwd)
                  return (
                    <div key={r.key} className="flex items-center gap-2" style={{ fontSize: 12 }}>
                      {ok ? <CheckCircleFilled style={{ color: '#10b981' }} /> : <CloseCircleFilled style={{ color: '#94a3b8' }} />}
                      <span style={{ color: ok ? 'var(--app-text)' : 'var(--app-text-2)' }}>{r.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <Form.Item
            label="เลขบัตรประชาชน" name="id_card"
            extra={`เว้นว่างไว้ = ไม่เปลี่ยน · ปัจจุบัน ${editing?.id_card_masked ?? 'ไม่มีข้อมูล'}`}
            rules={[{ pattern: /^\d{13}$/, message: 'ต้องเป็นตัวเลข 13 หลัก' }]}
          >
            <Input maxLength={13} inputMode="numeric" placeholder="เว้นว่าง = ไม่เปลี่ยน" style={{ fontFamily: 'monospace' }} />
          </Form.Item>

          <Form.Item
            label="ส่งรหัสใหม่ให้เจ้าตัวทาง Line หมอพร้อม" name="notify" valuePropName="checked"
            extra="ใช้ได้เมื่อตั้งรหัสผ่านใหม่ และบัญชีมีเลขบัตรประชาชนถูกต้อง"
          >
            <Switch checkedChildren="ส่ง" unCheckedChildren="ไม่ส่ง" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default function UserCredentialsPage() {
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    const raw = Cookies.get('user_data')
    let roles: string[] = []
    if (raw) { try { roles = (JSON.parse(raw).roles ?? []).map((r: string) => String(r).toUpperCase()) } catch { /* ignore */ } }
    Promise.resolve().then(() => setAllowed(roles.some(r => ALLOWED_ROLES.includes(r))))
  }, [])

  return (
    <ConfigProvider theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: '#ef4444', borderRadius: 8 } }}>
      <App>
        {allowed === false ? (
          <div className="min-h-screen bg-app-bg text-app-text">
            <Navbar />
            <div className="p-6 md:p-8">
              <Result
                status="403"
                title="ไม่มีสิทธิ์เข้าถึงหน้านี้"
                subTitle="หน้าจัดการบัญชีเข้าใช้งานสงวนไว้สำหรับผู้ดูแลระบบและเจ้าหน้าที่ไอทีเท่านั้น"
                extra={<Button type="primary" href="/home">กลับหน้าหลัก</Button>}
              />
            </div>
          </div>
        ) : allowed === null ? null : <PageContent />}
      </App>
    </ConfigProvider>
  )
}
