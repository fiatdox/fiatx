'use client'
// ยกเว้นการแจ้งเตือนระบบลารายคน (หมอพร้อม) — เฉพาะ ADMIN (proxy.ts กั้น URL ตรง, backend ตรวจสิทธิ์)
// กติกาการแจ้งอยู่ที่ services/leaveNotify.ts ฝั่ง backend — ยกเว้นได้แค่ลดการแจ้ง ไม่เพิ่มเกินค่าระดับ
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Cookies from 'js-cookie'
import dayjs from 'dayjs'
import { Alert, App, Button, Card, Empty, Input, Radio, Segmented, Select, Space, Table, Tag, Tooltip, Typography } from 'antd'
import { HomeOutlined, BellOutlined, CloseCircleOutlined, ReloadOutlined, SearchOutlined, SettingOutlined, UserAddOutlined } from '@ant-design/icons'
import { FaUsersCog, FaCalendarAlt } from 'react-icons/fa'
import Breadcrumb from '@/app/components/AppBreadcrumb'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import { normalizeRoles } from '@/app/lib/menuAccess'

const { Title, Text } = Typography

type Mode = 'instant' | 'digest' | 'off'
type Exempt = 'digest' | 'off'
interface HeadTitle { level: string; level_name: string; unit_name: string | null; is_acting: boolean; mode: Mode }
interface Row {
  id: number; name: string; unit_name: string | null; has_cid: boolean; working: boolean; titles: HeadTitle[]
  exempt: Exempt | null; updated_at: string | null; updated_by_name: string | null
}
interface StaffOption { id: number; name: string; unit_name: string | null }
interface ExemptResponse { ready: boolean; enabled: boolean; digest_times: string[]; rows: Row[]; staff: StaffOption[] }

const MODE_TAG: Record<Mode, { color: string; label: string }> = {
  instant: { color: 'green', label: 'ทันที' }, digest: { color: 'gold', label: 'สรุปตามรอบ' }, off: { color: 'default', label: 'ไม่แจ้ง' },
}
// ต้องตรงกับ modeOfStep ฝั่ง backend — ระดับที่ปิดอยู่แล้วไม่ถูกเปิดด้วยการยกเว้น
const effectiveMode = (base: Mode, exempt: Exempt | null): Mode => (!exempt || base === 'off' ? base : exempt)
const fmtThai = (d: string) => `${dayjs(d).format('DD/MM/')}${dayjs(d).year() + 543} ${dayjs(d).format('HH:mm')} น.`

const PageContent = () => {
  const { message, modal } = App.useApp()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  useEffect(() => {
    let ok = false
    try { ok = normalizeRoles(JSON.parse(Cookies.get('user_data') ?? '{}')?.roles).includes('ADMIN') } catch { /* cookie เสีย */ }
    void Promise.resolve().then(() => setHasAccess(ok))
  }, [])

  const [data, setData] = useState<ExemptResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'all' | 'exempt'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const j = await fetch('/api/v1/hr/leave-notify/exempt').then(r => r.json()).catch(() => null)
    if (j?.success) setData(j.data); else message.error(j?.message ?? 'โหลดรายการไม่สำเร็จ')
    setLoading(false)
  }, [message])
  useEffect(() => {
    if (!hasAccess) return
    void Promise.resolve().then(() => { void load() })
  }, [hasAccess, load])

  const save = async (id: number, mode: Exempt | null) => {
    setSavingId(id)
    try {
      const j = await fetch(`/api/v1/hr/leave-notify/exempt/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }),
      }).then(r => r.json())
      if (!j?.success) { message.error(j?.message ?? 'บันทึกไม่สำเร็จ'); return }
      message.success(j.message)
      await load()
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setSavingId(null)
    }
  }

  // หัวหน้าที่ปิดการแจ้งจะไม่รู้ว่ามีใบรออนุมัติ ถ้าไม่เข้าระบบเอง — ยืนยันก่อน
  const change = (r: Row, mode: Exempt | null) => {
    if (mode !== 'off' || r.titles.length === 0) { void save(r.id, mode); return }
    modal.confirm({
      title: `ปิดการแจ้งใบรออนุมัติของ ${r.name}?`,
      content: 'ใบลาจะยังรอท่านนี้อนุมัติตามสาย แต่จะไม่มีข้อความแจ้งเลย ผู้ลาอาจรอนานถ้าท่านไม่ได้เข้าระบบเอง',
      okText: 'ปิดการแจ้ง', cancelText: 'ไม่', okButtonProps: { danger: true },
      onOk: () => save(r.id, 'off'),
    })
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data?.rows ?? [])
      .filter(r => view === 'all' || r.exempt)
      .filter(r => !q || [r.name, r.unit_name, ...r.titles.map(t => t.unit_name)].some(s => s?.toLowerCase().includes(q)))
      .sort((a, z) => Number(!!z.exempt) - Number(!!a.exempt) || a.name.localeCompare(z.name, 'th'))
  }, [data, search, view])
  const exemptCount = useMemo(() => (data?.rows ?? []).filter(r => r.exempt).length, [data])
  const staffOptions = useMemo(
    () => (data?.staff ?? []).map(s => ({ value: s.id, label: s.unit_name ? `${s.name} (${s.unit_name})` : s.name })),
    [data],
  )

  if (hasAccess === false) {
    return (
      <div className="min-h-dvh bg-app-bg text-app-text">
        <Navbar />
        <div className="p-6 md:p-8 flex justify-center">
          <Card style={{ borderRadius: 12, maxWidth: 480, marginTop: 60, textAlign: 'center' }}>
            <CloseCircleOutlined style={{ fontSize: 48, color: '#ef4444', marginBottom: 16 }} />
            <Title level={4} style={{ marginTop: 0 }}>ไม่มีสิทธิ์เข้าถึง</Title>
            <Text type="secondary">หน้านี้เปิดให้เฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้น</Text>
            <div className="mt-5"><Button type="primary" href="/home"><HomeOutlined /> กลับหน้าหลัก</Button></div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-app-bg text-app-text">
      <Navbar />
      <div className="p-4 md:p-8 max-w-350 mx-auto">
        <Breadcrumb
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FaUsersCog className="inline mr-1" /> งานทรัพยากรบุคคล</> },
            { href: '/hr/leave', title: <><FaCalendarAlt className="inline mr-1" /> การลา</> },
            { title: 'ยกเว้นการแจ้งเตือน' },
          ]}
          className="mb-4"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <Title level={3} style={{ margin: 0 }}><BellOutlined style={{ color: '#f59e0b' }} /> ยกเว้นการแจ้งเตือนรายคน</Title>
            <Text type="secondary">กำหนดว่าใครไม่ต้องรับการแจ้งเตือนระบบลาผ่านหมอพร้อม · มีผลภายใน 30 วินาทีหลังบันทึก</Text>
          </div>
          <Space wrap>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={load}>โหลดใหม่</Button>
            <Button icon={<SettingOutlined />} href="/hr/leave/notify-settings">ตั้งค่าการแจ้งเตือน</Button>
          </Space>
        </div>

        {data && !data.ready && (
          <Alert className="mb-4" type="error" showIcon title="ยังไม่ได้สร้างตารางการยกเว้น" description="รัน src/db/hr_leave_notify.sql ที่ฐานข้อมูลก่อน — ระหว่างนี้ยังบันทึกการยกเว้นไม่ได้" />
        )}
        {data && !data.enabled && (
          <Alert className="mb-4" type="warning" showIcon title="การแจ้งเตือนระบบลาปิดอยู่ทั้งระบบ — ตอนนี้ไม่มีใครได้รับข้อความ" />
        )}
        {data && data.digest_times.length === 0 && (
          <Alert className="mb-4" type="warning" showIcon title="ยังไม่ได้ตั้งเวลารอบสรุป — คนที่ตั้งเป็น &quot;สรุปตามรอบ&quot; จะไม่ได้รับข้อความ" />
        )}

        <Alert
          className="mb-4" type="info" showIcon
          title="ผลของแต่ละตัวเลือก"
          description={(
            <ul className="list-disc pl-4 m-0">
              <li><b>ตามค่าระบบ</b> — ได้รับตามที่ตั้งไว้ของแต่ละระดับ</li>
              <li><b>สรุปตามรอบ</b> — ไม่แจ้งทันที ใบรออนุมัติส่งเป็นสรุป{data?.digest_times.length ? ` เวลา ${data.digest_times.join(', ')} น.` : ''} ไม่มีใบรอก็ไม่ส่ง</li>
              <li><b>ไม่แจ้ง</b> — ไม่มีข้อความเรื่องใบรออนุมัติเลย ต้องเข้าระบบเพื่อดูเอง</li>
              <li>ทั้งสองแบบที่ยกเว้นจะไม่ได้รับแจ้งว่าเพื่อนร่วมงานลา แต่ยังได้รับการแจ้งเรื่องใบลาของตัวเอง</li>
            </ul>
          )}
        />

        <Card style={{ borderRadius: 12, border: 'none' }}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <Space wrap>
              <Segmented
                value={view} onChange={v => setView(v as 'all' | 'exempt')}
                options={[
                  { value: 'all', label: `ทั้งหมด ${(data?.rows.length ?? 0).toLocaleString('th-TH')} คน` },
                  { value: 'exempt', label: `ยกเว้นอยู่ ${exemptCount.toLocaleString('th-TH')} คน` },
                ]}
              />
              <Input
                allowClear prefix={<SearchOutlined />} placeholder="ค้นหาชื่อหรือหน่วยงาน" style={{ width: 260 }}
                value={search} onChange={e => setSearch(e.target.value)}
              />
            </Space>
            <Select<number>
              showSearch value={null as unknown as number} style={{ width: 320, maxWidth: '100%' }}
              placeholder={<><UserAddOutlined /> เพิ่มบุคลากรที่ไม่ได้เป็นหัวหน้า</>}
              options={staffOptions} optionFilterProp="label" disabled={!data?.ready} loading={savingId != null}
              onChange={id => { void save(id, 'digest') }}
            />
          </div>
          <Table
            size="small" rowKey="id" loading={loading && !data} dataSource={rows} scroll={{ x: 900 }}
            pagination={{ pageSize: 20, hideOnSinglePage: true }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={view === 'exempt' ? 'ยังไม่มีใครถูกยกเว้น' : 'ไม่พบรายชื่อ'} /> }}
            columns={[
              {
                title: 'ชื่อ', key: 'name', width: 260,
                render: (_: unknown, r: Row) => (
                  <div>
                    <Space size={6} wrap>
                      <Text strong>{r.name}</Text>
                      {!r.working && <Tag>พ้นการปฏิบัติงาน</Tag>}
                      {!r.has_cid && <Tooltip title="ไม่มีเลขบัตรประชาชน 13 หลัก — ส่งหมอพร้อมไม่ได้อยู่แล้ว"><Tag color="error">ไม่มีเลขบัตร</Tag></Tooltip>}
                    </Space>
                    {r.unit_name && <div><Text type="secondary" style={{ fontSize: 12 }}>{r.unit_name}</Text></div>}
                  </div>
                ),
              },
              {
                title: 'ตำแหน่งหัวหน้า และการแจ้งใบรออนุมัติ', key: 'titles',
                render: (_: unknown, r: Row) => r.titles.length === 0
                  ? <Text type="secondary" style={{ fontSize: 12 }}>ไม่ได้เป็นผู้อนุมัติ</Text>
                  : (
                    <div className="flex flex-col gap-1">
                      {r.titles.map(t => {
                        const m = MODE_TAG[effectiveMode(t.mode, r.exempt)]
                        return (
                          <div key={`${t.level}-${t.unit_name}-${t.is_acting}`} className="flex flex-wrap items-center gap-1.5">
                            <Tag color={m.color} style={{ marginInlineEnd: 0 }}>{m.label}</Tag>
                            <Text style={{ fontSize: 13 }}>{t.is_acting ? `รักษาการ${t.level_name}` : t.level_name}{t.unit_name ? ` ${t.unit_name}` : ''}</Text>
                          </div>
                        )
                      })}
                    </div>
                  ),
              },
              {
                title: 'การยกเว้น', key: 'exempt', width: 290,
                render: (_: unknown, r: Row) => (
                  <div>
                    <Radio.Group
                      size="small" optionType="button" buttonStyle="solid" disabled={savingId === r.id || !data?.ready}
                      value={r.exempt ?? 'none'}
                      onChange={e => change(r, e.target.value === 'none' ? null : e.target.value as Exempt)}
                      options={[
                        { value: 'none', label: 'ตามค่าระบบ' },
                        { value: 'digest', label: 'สรุปตามรอบ' },
                        { value: 'off', label: 'ไม่แจ้ง' },
                      ]}
                    />
                    {r.updated_at && (
                      <div className="mt-1"><Text type="secondary" style={{ fontSize: 12 }}>ตั้งเมื่อ {fmtThai(r.updated_at)} โดย {r.updated_by_name ?? '-'}</Text></div>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </div>
    </div>
  )
}

export default function LeaveNotifyExemptPage() {
  return (
    <AppThemeProvider colorPrimary="#f59e0b">
      <PageContent />
    </AppThemeProvider>
  )
}
