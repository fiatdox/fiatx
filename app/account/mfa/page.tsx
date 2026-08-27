'use client'
import React, { useEffect, useRef, useState } from 'react'
import {
  ConfigProvider, App, Typography, Breadcrumb, Card, Tag, theme, Button, Modal,
  Form, InputNumber, Select, Table, Tabs, Switch, Empty, Alert, Statistic, Row, Col,
  DatePicker, Space, Input,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { HomeOutlined, PlusOutlined, DeleteOutlined, ReloadOutlined, UsergroupAddOutlined } from '@ant-design/icons'
import { FaShieldAlt } from 'react-icons/fa'
import dayjs, { type Dayjs } from 'dayjs'
import Swal from 'sweetalert2'
import Navbar from '@/app/components/Navbar'
import { useThemeMode } from '@/app/components/ThemeProvider'

const { Title, Text } = Typography

type MfaSettings = {
  enabled: boolean
  scope: 'users' | 'roles' | 'all'
  roles: string[]
  otpTtlSeconds: number
  maxAttempts: number
  resendCooldownSeconds: number
  challengeTtlSeconds: number
}
type Member = {
  user_id: number; username: string; name: string
  position_name?: string; has_valid_idcard: boolean; added_at: string
}
type AuditRow = {
  id: number; user_id: number | null; username: string | null; event: string
  detail: string | null; send_ms: number | null; client_ip: string | null; created_at: string
}
type AuditStats = {
  sent: number; resent: number; send_failed: number; verified: number
  wrong: number; expired: number; locked: number
  avg_send_ms: number | null; max_send_ms: number | null
}
type UserOption = { id: number; name: string; position_name?: string }
type PasswordPolicy = { enabled: boolean; expiryDays: number; warnDays: number }
type PwdImpact = { active_users: number; never_changed: number; already_expired: number }
type UsernamePolicy = { mode: 'off' | 'warn' | 'force'; scope: 'all' | 'pilot'; pilot: string[] }
type UnameImpact = { active_users: number; username_is_id_card: number }

const EVENT_LABEL: Record<string, { label: string; color: string }> = {
  otp_sent:         { label: 'ส่งรหัส',          color: 'blue' },
  otp_resent:       { label: 'ส่งรหัสใหม่',      color: 'cyan' },
  otp_send_failed:  { label: 'ส่งไม่สำเร็จ',     color: 'error' },
  otp_verified:     { label: 'ยืนยันสำเร็จ',     color: 'success' },
  otp_wrong:        { label: 'กรอกผิด',          color: 'warning' },
  otp_expired:      { label: 'รหัสหมดอายุ',      color: 'default' },
  otp_locked:       { label: 'ตัดรอบ',           color: 'error' },
  settings_changed: { label: 'แก้ค่าตั้ง',       color: 'purple' },
}

const PageContent = () => {
  const { message } = App.useApp()

  const [settings, setSettings] = useState<MfaSettings | null>(null)
  const [pwdPolicy, setPwdPolicy] = useState<PasswordPolicy | null>(null)
  const [pwdImpact, setPwdImpact] = useState<PwdImpact | null>(null)
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdForm] = Form.useForm()
  const [unamePolicy, setUnamePolicy] = useState<UsernamePolicy | null>(null)
  const [unameImpact, setUnameImpact] = useState<UnameImpact | null>(null)
  const [unameSaving, setUnameSaving] = useState(false)
  const [unameForm] = Form.useForm()
  const [members, setMembers] = useState<Member[]>([])
  const [audit, setAudit] = useState<AuditRow[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  // ช่วงเวลาของแท็บประวัติ — ค่าเริ่มต้นคือ "วันนี้" (เที่ยงคืน → สิ้นวัน)
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('day'), dayjs().endOf('day')])
  const [truncated, setTruncated] = useState(false)

  const [memberSearch, setMemberSearch] = useState('')
  const [bulkAdding, setBulkAdding] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [userOptions, setUserOptions] = useState<UserOption[]>([])
  const [userSearching, setUserSearching] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [addForm] = Form.useForm()

  const reload = async (r: [Dayjs, Dayjs] = range) => {
    try {
      const qs = new URLSearchParams({
        limit: '200',
        from: r[0].toISOString(),
        to: r[1].toISOString(),
      })
      const [c, a] = await Promise.all([
        fetch('/api/v1/mfa/config').then(r => r.json()),
        fetch(`/api/v1/mfa/audit?${qs.toString()}`).then(r => r.json()),
      ])
      if (c?.success) {
        setSettings(c.data.settings)
        setMembers(c.data.members ?? [])
        // roles เป็น Select mode="tags" — ต้องเป็น array ไม่ใช่ string
        form.setFieldsValue({
          ...c.data.settings,
          roles: c.data.settings.roles ?? [],
        })
        setPwdPolicy(c.data.passwordPolicy ?? null)
        setPwdImpact(c.data.pwdImpact ?? null)
        if (c.data.passwordPolicy) pwdForm.setFieldsValue(c.data.passwordPolicy)
        setUnamePolicy(c.data.usernamePolicy ?? null)
        setUnameImpact(c.data.unameImpact ?? null)
        // pilot เป็น Select mode="tags" — ต้องเป็น array
        if (c.data.usernamePolicy) unameForm.setFieldsValue({
          ...c.data.usernamePolicy,
          pilot: c.data.usernamePolicy.pilot ?? [],
        })
      } else {
        message.error(c?.message || 'โหลดค่าตั้งไม่สำเร็จ')
      }
      if (a?.success) {
        setAudit(a.data.rows ?? [])
        setStats(a.data.stats ?? null)
        setTruncated(!!a.data.truncated)
      }
    } catch (e) {
      message.error((e as Error).message)
    }
  }

  useEffect(() => {
    Promise.all([reload()]).finally(() => setLoading(false))
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveSettings = async () => {
    const v = await form.validateFields()
    setSaving(true)
    try {
      const payload: Record<string, string> = {
        mfa_enabled: String(v.enabled),
        mfa_scope: v.scope,
        // backend เก็บเป็น string คั่นจุลภาค — แปลงกลับจาก array ของ Select
        mfa_roles: (Array.isArray(v.roles) ? v.roles : [])
          .map((r: string) => r.trim().toUpperCase())
          .filter(Boolean)
          .join(','),
        mfa_otp_ttl_seconds: String(v.otpTtlSeconds),
        mfa_max_attempts: String(v.maxAttempts),
        mfa_resend_cooldown_seconds: String(v.resendCooldownSeconds),
        mfa_challenge_ttl_seconds: String(v.challengeTtlSeconds),
      }
      const res = await fetch('/api/v1/mfa/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await res.json()
      if (!res.ok || !j.success) { message.error(j.message || 'บันทึกไม่สำเร็จ'); return }
      message.success('บันทึกค่าตั้งเรียบร้อย')
      if (j.warning) {
        Swal.fire({ title: 'บันทึกแล้ว', text: j.warning, icon: 'warning', confirmButtonColor: '#a855f7' })
      }
      await reload()
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  // ค้นหาผู้ใช้เมื่อพิมพ์ครบ 3 ตัวอักษร (debounce 350ms) — ใช้ endpoint เดียวกับระบบบริจาค
  const searchUsers = (search: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    const q = search.trim()
    if (q.length < 3) { setUserSearching(false); setUserOptions([]); return }
    setUserSearching(true)
    searchTimer.current = setTimeout(async () => {
      try {
        const j = await fetch(`/api/v1/asset-donation/user-options?search=${encodeURIComponent(q)}`).then(r => r.json())
        setUserOptions(j?.data ?? [])
      } catch { setUserOptions([]) }
      finally { setUserSearching(false) }
    }, 350)
  }

  const addMember = async () => {
    const v = await addForm.validateFields()
    try {
      const res = await fetch('/api/v1/mfa/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: v.user_id }),
      })
      const j = await res.json()
      if (!res.ok || !j.success) { message.error(j.message || 'เพิ่มไม่สำเร็จ'); return }
      message.success('เพิ่มผู้ใช้เข้าขอบเขต MFA แล้ว')
      setAddOpen(false)
      await reload()
    } catch (e) { message.error((e as Error).message) }
  }

  const saveUsernamePolicy = async () => {
    const v = await unameForm.validateFields()
    const pilot: string[] = (Array.isArray(v.pilot) ? v.pilot : [])
      .map((s: string) => s.trim().toLowerCase()).filter(Boolean)

    // โหมด force + ทุกคน = ผู้ใช้เกือบทั้งองค์กรใช้งานไม่ได้จนกว่าจะตั้งชื่อใหม่ ต้องยืนยันแบบเห็นตัวเลข
    if (v.mode === 'force' && v.scope === 'all') {
      const n = unameImpact?.username_is_id_card ?? 0
      const r = await Swal.fire({
        title: 'บังคับตั้งชื่อผู้ใช้ใหม่กับทุกคน?',
        html: `<div style="text-align:left;font-size:14px;line-height:1.8">
                 <div>มีผู้ปฏิบัติงาน <b>${n.toLocaleString()}</b> คนที่ใช้เลขบัตรประชาชนเป็นชื่อผู้ใช้</div>
                 <div style="margin-top:10px;padding:10px;border-radius:8px;background:#fee2e2;color:#991b1b">
                   คนกลุ่มนี้จะ<b>ใช้งานระบบต่อไม่ได้</b>จนกว่าจะตั้งชื่อผู้ใช้ใหม่ — โดนพร้อมกันทันทีที่บันทึก
                 </div>
                 <div style="margin-top:10px">แนะนำให้ทดสอบด้วยโหมด <b>นำร่อง</b> หรือ <b>เตือนอย่างเดียว</b> ก่อน</div>
               </div>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'ยืนยันบังคับทุกคน',
        cancelButtonText: 'ยกเลิก',
      })
      if (!r.isConfirmed) return
    }

    setUnameSaving(true)
    try {
      const res = await fetch('/api/v1/mfa/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username_policy_mode: v.mode,
          username_policy_scope: v.scope,
          username_policy_pilot: pilot.join(','),
        }),
      })
      const j = await res.json()
      if (!res.ok || !j.success) { message.error(j.message || 'บันทึกไม่สำเร็จ'); return }
      message.success('บันทึกนโยบายชื่อผู้ใช้เรียบร้อย')
      if (j.warning) {
        Swal.fire({ title: 'บันทึกแล้ว', text: j.warning, icon: 'warning', confirmButtonColor: '#a855f7' })
      }
      await reload()
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setUnameSaving(false)
    }
  }

  const savePasswordPolicy = async () => {
    const v = await pwdForm.validateFields()
    // เปิดใช้ทั้งที่มีคนค้างอยู่ = คนกลุ่มนั้นโดนบังคับเปลี่ยนทันที ต้องยืนยันก่อน
    const affected = (pwdImpact?.never_changed ?? 0) + (pwdImpact?.already_expired ?? 0)
    if (v.enabled && affected > 0) {
      const r = await Swal.fire({
        title: 'เปิดนโยบายอายุรหัสผ่าน?',
        html: `<div style="text-align:left;font-size:14px;line-height:1.8">
                 <div>มีผู้ใช้ <b>${affected.toLocaleString()}</b> คนที่รหัสผ่านเกินกำหนดแล้ว</div>
                 <div style="margin-top:10px;padding:10px;border-radius:8px;background:#fef3c7;color:#92400e">
                   คนกลุ่มนี้จะเห็น<b>แถบเตือนให้เปลี่ยนรหัสผ่าน</b>ทันที แต่ยังเข้าใช้งานระบบได้ตามปกติ
                 </div>
               </div>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#a855f7',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'ยืนยันเปิดใช้',
        cancelButtonText: 'ยกเลิก',
      })
      if (!r.isConfirmed) return
    }

    setPwdSaving(true)
    try {
      const res = await fetch('/api/v1/mfa/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password_expiry_enabled: String(v.enabled),
          password_expiry_days: String(v.expiryDays),
          password_expiry_warn_days: String(v.warnDays),
        }),
      })
      const j = await res.json()
      if (!res.ok || !j.success) { message.error(j.message || 'บันทึกไม่สำเร็จ'); return }
      message.success('บันทึกนโยบายรหัสผ่านเรียบร้อย')
      if (j.warning) Swal.fire({ title: 'บันทึกแล้ว', text: j.warning, icon: 'warning', confirmButtonColor: '#a855f7' })
      await reload()
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setPwdSaving(false)
    }
  }

  // เพิ่มผู้ปฏิบัติงานทั้งหมด — ถามยืนยันด้วยตัวเลขจริงจาก dry-run ก่อนเขียน
  const addAllActive = async () => {
    setBulkAdding(true)
    try {
      const pre = await fetch('/api/v1/mfa/users/all-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run: true }),
      }).then(r => r.json())
      if (!pre?.success) { message.error(pre?.message || 'ตรวจสอบจำนวนไม่สำเร็จ'); return }

      const { will_add, skipped_no_idcard, eligible } = pre.data
      if (will_add === 0) {
        message.info('ผู้ปฏิบัติงานที่ส่ง OTP ได้อยู่ในขอบเขตครบแล้ว')
        return
      }

      const r = await Swal.fire({
        title: `เพิ่ม ${will_add.toLocaleString()} คนเข้าขอบเขต MFA?`,
        html: `
          <div style="text-align:left;font-size:14px;line-height:1.8">
            <div>• เพิ่มใหม่ <b>${will_add.toLocaleString()}</b> คน (รวมในขอบเขตเป็น <b>${eligible.toLocaleString()}</b> คน)</div>
            ${skipped_no_idcard > 0 ? `<div>• ข้าม <b>${skipped_no_idcard.toLocaleString()}</b> คนที่ไม่มีเลขบัตรประชาชน (ส่ง OTP ไม่ได้)</div>` : ''}
            <div style="margin-top:12px;padding:10px;border-radius:8px;background:#fee2e2;color:#991b1b">
              <b>คำเตือน:</b> หากระบบ MFA เปิดอยู่ ผู้ที่ยังไม่ได้เพิ่มเพื่อน/ผูกบัญชี Line หมอพร้อม
              <b>จะเข้าระบบไม่ได้ทันที</b> แนะนำให้แจ้งผู้ใช้ล่วงหน้าก่อนดำเนินการ
            </div>
          </div>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: `ยืนยัน เพิ่ม ${will_add.toLocaleString()} คน`,
        cancelButtonText: 'ยกเลิก',
      })
      if (!r.isConfirmed) return

      const res = await fetch('/api/v1/mfa/users/all-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const j = await res.json()
      if (!res.ok || !j.success) { message.error(j.message || 'เพิ่มไม่สำเร็จ'); return }
      message.success(`เพิ่ม ${j.data.added.toLocaleString()} คนเข้าขอบเขต MFA แล้ว`)
      await reload()
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setBulkAdding(false)
    }
  }

  const applyRange = (from: Dayjs, to: Dayjs) => {
    const next: [Dayjs, Dayjs] = [from, to]
    setRange(next)
    reload(next)
  }

  const removeMember = (m: Member) => {
    Swal.fire({
      title: 'ยืนยันการนำออก?',
      text: `นำ "${m.name}" ออกจากขอบเขต MFA — ผู้ใช้รายนี้จะเข้าระบบด้วยรหัสผ่านอย่างเดียว`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'นำออก',
      cancelButtonText: 'ยกเลิก',
    }).then(async r => {
      if (!r.isConfirmed) return
      try {
        const res = await fetch(`/api/v1/mfa/users/${m.user_id}`, { method: 'DELETE' })
        const j = await res.json()
        if (!res.ok || !j.success) { message.error(j.message || 'นำออกไม่สำเร็จ'); return }
        message.success('นำออกเรียบร้อย')
        await reload()
      } catch (e) { message.error((e as Error).message) }
    })
  }

  // กรองรายชื่อฝั่ง client — ชุดข้อมูลไม่เกินหลักพัน ไม่ต้องยิง API ทุกตัวอักษร
  const q = memberSearch.trim().toLowerCase()
  const filteredMembers = q
    ? members.filter(m =>
        [m.name, m.username, m.position_name].some(f => String(f ?? '').toLowerCase().includes(q)))
    : members

  const memberCols: ColumnsType<Member> = [
    { title: 'ชื่อ-นามสกุล', dataIndex: 'name' },
    { title: 'ชื่อผู้ใช้', dataIndex: 'username', width: 140 },
    { title: 'ตำแหน่ง', dataIndex: 'position_name' },
    {
      title: 'เลขบัตร ปชช.', dataIndex: 'has_valid_idcard', width: 130, align: 'center' as const,
      render: (v: boolean) => v
        ? <Tag color="success">พร้อมส่ง OTP</Tag>
        : <Tag color="error">ไม่มี/ไม่ถูกต้อง</Tag>,
    },
    {
      title: '', width: 60, align: 'center' as const,
      render: (_, r) => <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeMember(r)} />,
    },
  ]

  const auditCols: ColumnsType<AuditRow> = [
    { title: 'เวลา', dataIndex: 'created_at', width: 150, render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm:ss') },
    { title: 'ผู้ใช้', dataIndex: 'username', width: 130, render: (v: string | null) => v ?? '-' },
    {
      title: 'เหตุการณ์', dataIndex: 'event', width: 130,
      render: (v: string) => <Tag color={EVENT_LABEL[v]?.color ?? 'default'}>{EVENT_LABEL[v]?.label ?? v}</Tag>,
    },
    { title: 'รายละเอียด', dataIndex: 'detail', render: (v: string | null) => <Text style={{ fontSize: 12 }}>{v ?? '-'}</Text> },
    {
      title: 'เวลาส่ง', dataIndex: 'send_ms', width: 100, align: 'right' as const,
      render: (v: number | null) => v == null ? '-' : <Text style={{ fontSize: 12, color: v > 5000 ? '#ef4444' : undefined }}>{v.toLocaleString()} ms</Text>,
    },
  ]

  const deliverySuccess = stats && (stats.sent + stats.resent + stats.send_failed) > 0
    ? Math.round(((stats.sent + stats.resent) / (stats.sent + stats.resent + stats.send_failed)) * 100)
    : null

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <Navbar />
      <div className="p-6 md:p-8">
        <Breadcrumb className="mb-6" items={[
          { href: '/', title: <><HomeOutlined /> หน้าหลัก</> },
          { title: 'บัญชีผู้ใช้' },
          { title: 'ยืนยันตัวตนสองชั้น (MFA)' },
        ]} />

        <div className="flex items-center gap-3 mb-2">
          <FaShieldAlt style={{ fontSize: 24, color: '#a855f7' }} />
          <Title level={3} style={{ margin: 0, color: 'var(--app-text)' }}>ยืนยันตัวตนสองชั้น — OTP ผ่าน Line หมอพร้อม</Title>
        </div>
        <Text type="secondary">ส่งรหัส OTP เข้า Line หมอพร้อมด้วยเลขบัตรประชาชน ผ่านช่องทาง MOPH Alert</Text>

        <div className="mt-6">
          {settings?.enabled ? (
            <Alert
              type="warning" showIcon className="mb-4"
              title="ระบบ MFA เปิดใช้งานอยู่"
              description={
                settings.scope === 'all'
                  ? 'บังคับกับผู้ใช้ทุกคน — ผู้ที่ยังไม่ได้ผูกบัญชี Line หมอพร้อมจะเข้าระบบไม่ได้'
                  : settings.scope === 'users'
                    ? `บังคับเฉพาะรายชื่อในขอบเขต (${members.length} คน)`
                    : `บังคับเฉพาะ role: ${settings.roles.join(', ') || '(ยังไม่ได้ระบุ)'}`
              }
            />
          ) : (
            <Alert
              type="info" showIcon className="mb-4"
              title="ระบบ MFA ปิดอยู่"
              description="ผู้ใช้ทุกคนเข้าระบบด้วยชื่อผู้ใช้และรหัสผ่านตามปกติ"
            />
          )}
        </div>

        <Card style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border-strong)' }} styles={{ body: { padding: 12 } }}>
          <Tabs
            defaultActiveKey="settings"
            items={[
              {
                key: 'settings',
                label: 'ตั้งค่า',
                children: (
                  <Form form={form} layout="vertical" disabled={loading} className="max-w-2xl">
                    <Form.Item
                      label="เปิดใช้งาน MFA" name="enabled" valuePropName="checked"
                      extra="ปิด = ทุกคน login ด้วยรหัสผ่านอย่างเดียว (สวิตช์ฉุกเฉินเมื่อ Line หมอพร้อมมีปัญหา)"
                    >
                      <Switch checkedChildren="เปิด" unCheckedChildren="ปิด" />
                    </Form.Item>

                    <Form.Item
                      label="ขอบเขตการบังคับ" name="scope"
                      extra="ระยะทดสอบแนะนำ 'เฉพาะรายชื่อ' เพื่อไม่ให้กระทบผู้ใช้คนอื่น"
                    >
                      <Select options={[
                        { value: 'users', label: 'เฉพาะรายชื่อที่กำหนด (แนะนำสำหรับทดสอบ)' },
                        { value: 'roles', label: 'เฉพาะ role ที่ระบุ' },
                        { value: 'all', label: 'ผู้ใช้ทุกคน' },
                      ]} />
                    </Form.Item>

                    <Form.Item
                      label="role ที่บังคับ" name="roles"
                      extra="คั่นด้วยจุลภาค เช่น ADMIN,HR — ใช้เมื่อเลือกขอบเขตเป็น 'เฉพาะ role'"
                    >
                      <Select mode="tags" tokenSeparators={[',']} placeholder="เช่น ADMIN, HR" />
                    </Form.Item>

                    <Row gutter={12}>
                      <Col xs={24} md={12}>
                        <Form.Item label="อายุรหัส OTP (วินาที)" name="otpTtlSeconds" rules={[{ required: true }]}>
                          <InputNumber style={{ width: '100%' }} min={60} max={900} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item label="กรอกผิดได้กี่ครั้ง" name="maxAttempts" rules={[{ required: true }]}>
                          <InputNumber style={{ width: '100%' }} min={1} max={10} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item label="รอกี่วินาทีก่อนขอรหัสใหม่" name="resendCooldownSeconds" rules={[{ required: true }]}>
                          <InputNumber style={{ width: '100%' }} min={15} max={600} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item label="อายุรอบยืนยันรวม (วินาที)" name="challengeTtlSeconds" rules={[{ required: true }]}>
                          <InputNumber style={{ width: '100%' }} min={120} max={1800} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Button type="primary" loading={saving} onClick={saveSettings}
                      style={{ background: '#a855f7', borderColor: '#a855f7' }}>บันทึกค่าตั้ง</Button>
                  </Form>
                ),
              },
              {
                key: 'password',
                label: 'นโยบายรหัสผ่าน',
                // mount ตั้งแต่แรก — reload() ตั้งค่าฟอร์มนี้ตอนโหลดหน้า ถ้ารอจนกดแท็บ
                // useForm จะยังไม่ผูกกับ <Form> จริง (antd เตือน "not connected to any Form element")
                forceRender: true,
                children: (
                  <div className="max-w-2xl">
                    {pwdImpact && (
                      <Row gutter={[12, 12]} className="mb-4">
                        <Col xs={8}>
                          <Card size="small" style={{ background: 'var(--app-bg)', border: '1px solid var(--app-border-strong)' }}>
                            <Statistic title="ผู้ปฏิบัติงาน" value={pwdImpact.active_users} />
                          </Card>
                        </Col>
                        <Col xs={8}>
                          <Card size="small" style={{ background: 'var(--app-bg)', border: '1px solid var(--app-border-strong)' }}>
                            <Statistic title="เกินกำหนดแล้ว" value={pwdImpact.already_expired}
                              styles={{ content: { color: pwdImpact.already_expired > 0 ? '#f59e0b' : undefined } }} />
                          </Card>
                        </Col>
                        <Col xs={8}>
                          <Card size="small" style={{ background: 'var(--app-bg)', border: '1px solid var(--app-border-strong)' }}>
                            <Statistic title="ยังไม่เคยตั้งรหัสเอง" value={pwdImpact.never_changed}
                              styles={{ content: { color: pwdImpact.never_changed > 0 ? '#f59e0b' : undefined } }} />
                          </Card>
                        </Col>
                      </Row>
                    )}

                    <Alert
                      type={pwdPolicy?.enabled ? 'warning' : 'info'} showIcon className="mb-4"
                      title={pwdPolicy?.enabled
                        ? `เตือนให้เปลี่ยนรหัสผ่านทุก ${pwdPolicy.expiryDays} วัน (เตือนล่วงหน้า ${pwdPolicy.warnDays} วัน)`
                        : 'นโยบายอายุรหัสผ่านปิดอยู่ — ไม่มีการแจ้งเตือนอายุรหัสผ่าน'}
                      description="ระบบนับจำนวนวันจากวันที่เปลี่ยนรหัสผ่านล่าสุด เมื่อครบกำหนดจะขึ้นแถบเตือนบนทุกหน้าพร้อมปุ่มลัดไปเปลี่ยนรหัส — ผู้ใช้ยังเข้าใช้งานระบบได้ตามปกติ"
                    />

                    <Form form={pwdForm} layout="vertical" disabled={loading}>
                      <Form.Item
                        label="เตือนให้เปลี่ยนรหัสผ่านตามรอบ" name="enabled" valuePropName="checked"
                        extra="ปิด = ไม่แจ้งเตือนอายุรหัสผ่าน (พฤติกรรมเดิมของระบบ)"
                      >
                        <Switch checkedChildren="เปิด" unCheckedChildren="ปิด" />
                      </Form.Item>

                      <Row gutter={12}>
                        <Col xs={24} md={12}>
                          <Form.Item label="อายุรหัสผ่าน (วัน)" name="expiryDays" rules={[{ required: true }]}
                            extra="มาตรฐานทั่วไปคือ 90 วัน">
                            <InputNumber style={{ width: '100%' }} min={1} max={3650} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item label="เตือนล่วงหน้า (วัน)" name="warnDays" rules={[{ required: true }]}
                            extra="แจ้งผู้ใช้ก่อนรหัสผ่านหมดอายุ">
                            <InputNumber style={{ width: '100%' }} min={1} max={90} />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Button type="primary" loading={pwdSaving} onClick={savePasswordPolicy}
                        style={{ background: '#a855f7', borderColor: '#a855f7' }}>บันทึกนโยบายรหัสผ่าน</Button>
                    </Form>
                  </div>
                ),
              },
              {
                key: 'username',
                label: 'นโยบายชื่อผู้ใช้',
                // เหตุผลเดียวกับแท็บนโยบายรหัสผ่าน — reload() ตั้งค่าฟอร์มนี้ตั้งแต่โหลดหน้า
                forceRender: true,
                children: (
                  <div className="max-w-2xl">
                    {unameImpact && (
                      <Row gutter={[12, 12]} className="mb-4">
                        <Col xs={12}>
                          <Card size="small" style={{ background: 'var(--app-bg)', border: '1px solid var(--app-border-strong)' }}>
                            <Statistic title="ผู้ปฏิบัติงาน" value={unameImpact.active_users} />
                          </Card>
                        </Col>
                        <Col xs={12}>
                          <Card size="small" style={{ background: 'var(--app-bg)', border: '1px solid var(--app-border-strong)' }}>
                            <Statistic
                              title="ใช้เลขบัตรเป็นชื่อผู้ใช้" value={unameImpact.username_is_id_card}
                              suffix={unameImpact.active_users > 0
                                ? `(${Math.round(unameImpact.username_is_id_card / unameImpact.active_users * 100)}%)`
                                : undefined}
                              styles={{ content: { color: unameImpact.username_is_id_card > 0 ? '#f59e0b' : undefined } }}
                            />
                          </Card>
                        </Col>
                      </Row>
                    )}

                    <Alert
                      type={unamePolicy?.mode === 'force' ? 'warning' : 'info'} showIcon className="mb-4"
                      title={
                        unamePolicy?.mode === 'force' ? 'บังคับตั้งชื่อผู้ใช้ใหม่ก่อนใช้งานระบบ'
                          : unamePolicy?.mode === 'warn' ? 'เตือนอย่างเดียว — ผู้ใช้ยังใช้งานได้ตามปกติ'
                            : 'นโยบายชื่อผู้ใช้ปิดอยู่ — ไม่มีการตรวจสอบ'
                      }
                      description="หน้าเพิ่มบุคลากรตั้ง username = เลขบัตรประชาชนให้อัตโนมัติ ทำให้ผู้ใช้เกือบทั้งองค์กรใช้เลขบัตรเป็นชื่อผู้ใช้ — เท่ากับเปิดเผยครึ่งหนึ่งของข้อมูลที่ใช้เข้าสู่ระบบ นโยบายนี้ให้เจ้าของบัญชีตั้งชื่อใหม่ได้เองโดยไม่ต้องผ่าน IT"
                    />

                    <Form form={unameForm} layout="vertical" disabled={loading}>
                      <Form.Item
                        label="โหมด" name="mode" rules={[{ required: true }]}
                        extra="เริ่มที่ เตือน ก่อนเสมอ — บังคับ จะทำให้ผู้ใช้ที่เข้าเงื่อนไขใช้งานระบบไม่ได้ทันที"
                      >
                        <Select options={[
                          { value: 'off', label: 'ปิด — ไม่ตรวจสอบ' },
                          { value: 'warn', label: 'เตือน — ขึ้นแถบเตือน แต่ใช้งานได้ตามปกติ' },
                          { value: 'force', label: 'บังคับ — ต้องตั้งชื่อใหม่ก่อนจึงใช้งานต่อได้' },
                        ]} />
                      </Form.Item>

                      <Form.Item
                        label="ขอบเขต" name="scope" rules={[{ required: true }]}
                        extra="นำร่อง = มีผลเฉพาะรายชื่อด้านล่าง (ว่างไว้ = ไม่มีผลกับใครเลย)"
                      >
                        <Select options={[
                          { value: 'pilot', label: 'นำร่อง — เฉพาะรายชื่อที่กำหนด (แนะนำสำหรับทดสอบ)' },
                          { value: 'all', label: 'ผู้ใช้ทุกคนที่ใช้เลขบัตรเป็นชื่อผู้ใช้' },
                        ]} />
                      </Form.Item>

                      <Form.Item
                        label="รายชื่อนำร่อง (username)" name="pilot"
                        extra="พิมพ์ชื่อผู้ใช้แล้วกด Enter ทีละคน — ใช้เมื่อขอบเขตเป็น นำร่อง เท่านั้น"
                      >
                        <Select mode="tags" tokenSeparators={[',', ' ']} placeholder="เช่น fiatx" />
                      </Form.Item>

                      <Button type="primary" loading={unameSaving} onClick={saveUsernamePolicy}
                        style={{ background: '#a855f7', borderColor: '#a855f7' }}>บันทึกนโยบายชื่อผู้ใช้</Button>
                    </Form>
                  </div>
                ),
              },
              {
                key: 'members',
                label: `รายชื่อในขอบเขต (${members.length})`,
                children: (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <Input.Search
                        allowClear
                        placeholder="ค้นหาชื่อ / ชื่อผู้ใช้ / ตำแหน่ง"
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        style={{ maxWidth: 320 }}
                      />
                      <Space wrap size="small">
                        <Button icon={<UsergroupAddOutlined />} loading={bulkAdding} onClick={addAllActive}>
                          เพิ่มทั้งหมดที่ยังทำงาน
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />}
                          onClick={() => { setUserOptions([]); setAddOpen(true) }}
                          style={{ background: '#a855f7', borderColor: '#a855f7' }}>เพิ่มผู้ใช้</Button>
                      </Space>
                    </div>

                    {memberSearch.trim() && (
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                        พบ {filteredMembers.length.toLocaleString()} จาก {members.length.toLocaleString()} รายชื่อ
                      </Text>
                    )}

                    <Table columns={memberCols} dataSource={filteredMembers} rowKey="user_id" loading={loading} size="small"
                      pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `ทั้งหมด ${t.toLocaleString()} รายชื่อ` }}
                      locale={{ emptyText: <Empty description={memberSearch.trim() ? 'ไม่พบรายชื่อที่ค้นหา' : 'ยังไม่มีผู้ใช้ในขอบเขต MFA'} /> }} />
                  </>
                ),
              },
              {
                key: 'audit',
                label: 'ประวัติ & สถิติ',
                children: (
                  <>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                      สถิติของช่วง {range[0].format('DD/MM/YYYY HH:mm')} – {range[1].format('DD/MM/YYYY HH:mm')}
                    </Text>
                    <Row gutter={[12, 12]} className="mb-4">
                      <Col xs={12} md={6}>
                        <Card size="small" style={{ background: 'var(--app-bg)', border: '1px solid var(--app-border-strong)' }}>
                          <Statistic title="อัตราส่งสำเร็จ" value={deliverySuccess ?? 0} suffix="%"
                            styles={{ content: { color: deliverySuccess != null && deliverySuccess < 90 ? '#ef4444' : '#10b981' } }} />
                        </Card>
                      </Col>
                      <Col xs={12} md={6}>
                        <Card size="small" style={{ background: 'var(--app-bg)', border: '1px solid var(--app-border-strong)' }}>
                          <Statistic title="ความหน่วงเฉลี่ย" value={stats?.avg_send_ms ?? 0} suffix="ms"
                            styles={{ content: { color: (stats?.avg_send_ms ?? 0) > 5000 ? '#ef4444' : undefined } }} />
                        </Card>
                      </Col>
                      <Col xs={12} md={6}>
                        <Card size="small" style={{ background: 'var(--app-bg)', border: '1px solid var(--app-border-strong)' }}>
                          <Statistic title="ยืนยันสำเร็จ" value={stats?.verified ?? 0} />
                        </Card>
                      </Col>
                      <Col xs={12} md={6}>
                        <Card size="small" style={{ background: 'var(--app-bg)', border: '1px solid var(--app-border-strong)' }}>
                          <Statistic title="ส่งไม่สำเร็จ" value={stats?.send_failed ?? 0}
                            styles={{ content: { color: (stats?.send_failed ?? 0) > 0 ? '#ef4444' : undefined } }} />
                        </Card>
                      </Col>
                    </Row>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <Space wrap size="small">
                        <DatePicker.RangePicker
                          showTime={{ format: 'HH:mm' }}
                          format="DD/MM/YYYY HH:mm"
                          allowClear={false}
                          value={range}
                          onChange={(v) => {
                            if (!v || !v[0] || !v[1]) return
                            const next: [Dayjs, Dayjs] = [v[0], v[1]]
                            setRange(next)
                            reload(next)
                          }}
                        />
                        <Button size="small" onClick={() => applyRange(dayjs().startOf('day'), dayjs().endOf('day'))}>วันนี้</Button>
                        <Button size="small" onClick={() => applyRange(dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day'))}>เมื่อวาน</Button>
                        <Button size="small" onClick={() => applyRange(dayjs().subtract(6, 'day').startOf('day'), dayjs().endOf('day'))}>7 วัน</Button>
                        <Button size="small" onClick={() => applyRange(dayjs().subtract(29, 'day').startOf('day'), dayjs().endOf('day'))}>30 วัน</Button>
                      </Space>
                      <Button size="small" icon={<ReloadOutlined />} onClick={() => reload()}>รีเฟรช</Button>
                    </div>

                    {truncated && (
                      <Alert type="warning" showIcon className="mb-3"
                        title={`แสดงได้สูงสุด ${audit.length.toLocaleString()} รายการ — มีข้อมูลมากกว่านี้ กรุณาลดช่วงเวลาลง`} />
                    )}

                    <Table columns={auditCols} dataSource={audit} rowKey="id" loading={loading} size="small"
                      pagination={{ pageSize: 15, showSizeChanger: false }}
                      locale={{ emptyText: <Empty description="ไม่มีเหตุการณ์ในช่วงเวลาที่เลือก" /> }} />
                  </>
                ),
              },
            ]}
          />
        </Card>
      </div>

      <Modal title="เพิ่มผู้ใช้เข้าขอบเขต MFA" open={addOpen} onCancel={() => setAddOpen(false)}
        onOk={addMember} okText="เพิ่ม" cancelText="ยกเลิก" destroyOnHidden
        afterOpenChange={(open) => { if (open) addForm.resetFields() }}>
        <Form form={addForm} layout="vertical" className="mt-2">
          <Form.Item label="เลือกผู้ใช้" name="user_id" rules={[{ required: true, message: 'กรุณาเลือก' }]}>
            <Select
              showSearch filterOption={false} placeholder="พิมพ์ชื่ออย่างน้อย 3 ตัวอักษรเพื่อค้นหา"
              onSearch={searchUsers}
              loading={userSearching}
              notFoundContent={userSearching ? 'กำลังค้นหา…' : 'พิมพ์ชื่ออย่างน้อย 3 ตัวอักษร'}
              options={userOptions.map(u => ({ value: u.id, label: u.position_name ? `${u.name} — ${u.position_name}` : u.name }))}
            />
          </Form.Item>
          <Alert type="info" showIcon
            title="ผู้ใช้ต้องมีเลขบัตรประชาชนในระบบ และเพิ่มเพื่อน/ผูกบัญชี Line หมอพร้อมไว้แล้ว จึงจะรับ OTP ได้" />
        </Form>
      </Modal>
    </div>
  )
}

export default function MfaSettingsPage() {
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  return (
    <ConfigProvider theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: '#a855f7', borderRadius: 8 } }}>
      <App>
        <PageContent />
      </App>
    </ConfigProvider>
  )
}
