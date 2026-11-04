'use client'
// ตั้งค่าการแจ้งเตือนระบบลาออนไลน์ (MOPH Alert — หมอพร้อมรายคน) — เฉพาะ ADMIN (proxy.ts กั้น URL ตรง, backend ตรวจสิทธิ์)
// เพื่อนร่วมงานในหน่วยงาน/กลุ่มงานเดียวกัน · ผู้อนุมัติรายระดับ (ทันที / สรุปตามรอบ / ปิด) · กลุ่มภารกิจตั้งรายภารกิจได้ · ผลถึงผู้ลา
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Cookies from 'js-cookie'
import dayjs from 'dayjs'
import {
  Alert, App, Button, Card, Col, Empty, Input, Popconfirm, Radio, Row, Segmented, ConfigProvider, Select, Space, Switch, Table, Tag, Tooltip, Typography,
} from 'antd'
import {
  HomeOutlined, BellOutlined, ThunderboltOutlined, FieldTimeOutlined, StopOutlined, CloseCircleOutlined, SaveOutlined, SendOutlined, ReloadOutlined, EyeOutlined, UndoOutlined,
} from '@ant-design/icons'
import { FaUsersCog, FaCalendarAlt } from 'react-icons/fa'
import Breadcrumb from '@/app/components/AppBreadcrumb'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'
import { normalizeRoles } from '@/app/lib/menuAccess'

const { Title, Text } = Typography

type Mode = 'instant' | 'digest' | 'off'
type Level = 'SUBMAJOR' | 'MAJOR' | 'MISSION' | 'DIRECTOR'
interface NotifyConfig {
  enabled: boolean
  colleague: { enabled: boolean; scope: 'unit_or_group' | 'unit_only' }
  approver: Record<Level, Mode>
  mission_overrides: Record<string, Mode>
  digest_times: string[]
  digest_skip_holidays: boolean
  applicant_submitted: boolean
  applicant_result: boolean
  app_url: string | null
}
interface ConfigResponse {
  config: NotifyConfig
  defaults: NotifyConfig
  ready: boolean
  moph_configured: boolean
  updated_at: string | null
  updated_by_name: string | null
  missions: { id: number; name: string; staff: number }[]
}
interface LogRow { id: number; kind: string; request_id: number | null; recipients: number; status: string; detail: string | null; created_at: string }
interface PreviewRow {
  approver_id: number; name: string; has_cid: boolean; level: string; count: number; cancel: number; oldest: string
  units: { unit: string; n: number }[]
}

const LEVELS: { key: Level; label: string; hint: string }[] = [
  { key: 'SUBMAJOR', label: 'หัวหน้าหน่วยงาน / ตึก', hint: 'คนน้อย ใบเข้าไม่บ่อย' },
  { key: 'MAJOR', label: 'หัวหน้ากลุ่มงาน', hint: '' },
  { key: 'MISSION', label: 'หัวหน้ากลุ่มภารกิจ', hint: 'คนมาก — แนะนำสรุปตามรอบ' },
  { key: 'DIRECTOR', label: 'ผู้อำนวยการ / รักษาการ', hint: 'ใบของหัวหน้ากลุ่มภารกิจ' },
]
const MODE_OPTIONS = [
  { value: 'instant', label: 'ทันที' },
  { value: 'digest', label: 'สรุปตามรอบ' },
  { value: 'off', label: 'ปิด' },
]
// ปุ่มเลือกโหมด — ปุ่มที่เลือกเป็นสีทึบตามโหมด (เขียว / ส้ม / เทาเข้ม) ให้เห็นชัดกว่า Segmented
const MODE_COLOR: Record<Mode, string> = { instant: '#16a34a', digest: '#d97706', off: '#475569' }
const MODE_ICON: Record<Mode, React.ReactNode> = { instant: <ThunderboltOutlined />, digest: <FieldTimeOutlined />, off: <StopOutlined /> }
const ModeSwitch = ({ value, onChange }: { value: Mode; onChange: (v: Mode) => void }) => (
  <ConfigProvider theme={{ token: { colorPrimary: MODE_COLOR[value] } }}>
    <Radio.Group
      size="small" optionType="button" buttonStyle="solid" value={value}
      onChange={e => onChange(e.target.value as Mode)}
      options={MODE_OPTIONS.map(o => ({ value: o.value, label: <span>{MODE_ICON[o.value as Mode]} {o.label}</span> }))}
    />
  </ConfigProvider>
)
// ส่งข้อความแบบที่ผู้รับกลุ่มนี้จะได้รับ ถึงหมอพร้อมของผู้ดูแลระบบเอง (ใช้ใบที่รออยู่จริง ไม่มีใช้ใบล่าสุด)
const TestButton = ({ label, off, loading, onSend }: { label: string; off: boolean; loading: boolean; onSend: () => void }) => (
  <Popconfirm
    title={`ทดสอบ: ${label}`} okText="ส่งถึงฉัน" cancelText="ไม่" onConfirm={onSend} disabled={off}
    description={<div style={{ maxWidth: 280 }}>ส่งข้อความแบบที่{label}จะได้รับตามค่าที่ตั้งอยู่ตอนนี้ ไปที่หมอพร้อมของท่าน (ยังไม่ต้องกดบันทึก)</div>}
  >
    <Tooltip title={off ? 'ตั้งเป็น "ปิด" — ไม่มีข้อความให้ทดสอบ' : 'ทดสอบส่งถึงฉัน'}>
      <Button size="small" color="primary" variant="outlined" icon={<SendOutlined />} loading={loading} disabled={off} aria-label={`ทดสอบ ${label}`}>ทดสอบ</Button>
    </Tooltip>
  </Popconfirm>
)
const MODE_TAG: Record<Mode, { color: string; label: string }> = {
  instant: { color: 'green', label: 'ทันที' }, digest: { color: 'gold', label: 'สรุปตามรอบ' }, off: { color: 'default', label: 'ปิด' },
}
const KIND_LABEL: Record<string, string> = {
  SUBMITTED: 'ยื่นใบถึงผู้ลา', COLLEAGUE: 'เพื่อนร่วมงาน', APPROVER: 'ผู้อนุมัติ (ทันที)', DIGEST: 'สรุปรออนุมัติ', RESULT: 'ผลถึงผู้ลา', TEST: 'ทดสอบ',
}
const STATUS_COLOR: Record<string, string> = { SENT: 'success', SKIPPED: 'default', FAILED: 'error' }
const TIME_OPTIONS = Array.from({ length: 24 * 2 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`)
  .map(t => ({ value: t, label: `${t} น.` }))
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

const PageContent = () => {
  const { message } = App.useApp()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  useEffect(() => {
    let ok = false
    try { ok = normalizeRoles(JSON.parse(Cookies.get('user_data') ?? '{}')?.roles).includes('ADMIN') } catch { /* cookie เสีย */ }
    void Promise.resolve().then(() => setHasAccess(ok))
  }, [])

  const [meta, setMeta] = useState<ConfigResponse | null>(null)
  const [draft, setDraft] = useState<NotifyConfig | null>(null)
  const [saving, setSaving] = useState(false)
  // ปุ่มทดสอบที่กำลังส่ง: 'basic' = ทดสอบทั่วไป · 'L:<ระดับ>' · 'M:<mission_id>'
  const [testing, setTesting] = useState<string | null>(null)
  const [log, setLog] = useState<LogRow[]>([])
  const [logLoading, setLogLoading] = useState(false)
  const [preview, setPreview] = useState<PreviewRow[] | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const loadConfig = useCallback(async () => {
    const j = await fetch('/api/v1/hr/leave-notify/config').then(r => r.json()).catch(() => null)
    if (!j?.success) { message.error(j?.message ?? 'โหลดค่าตั้งไม่สำเร็จ'); return }
    setMeta(j.data)
    setDraft(j.data.config)
  }, [message])
  const loadLog = useCallback(async () => {
    setLogLoading(true)
    const j = await fetch('/api/v1/hr/leave-notify/log?limit=100').then(r => r.json()).catch(() => null)
    setLog(j?.success ? j.data : [])
    setLogLoading(false)
  }, [])
  useEffect(() => {
    if (!hasAccess) return
    void Promise.resolve().then(() => { void loadConfig(); void loadLog() })
  }, [hasAccess, loadConfig, loadLog])

  const dirty = useMemo(() => !!draft && !!meta && JSON.stringify(draft) !== JSON.stringify(meta.config), [draft, meta])
  const patch = (p: Partial<NotifyConfig>) => setDraft(d => d ? { ...d, ...p } : d)

  const save = async () => {
    if (!draft) return
    if (draft.digest_times.some(t => !TIME_RE.test(t))) { message.error('เวลาสรุปต้องเป็นรูปแบบ HH:MM เช่น 08:00'); return }
    setSaving(true)
    try {
      const j = await fetch('/api/v1/hr/leave-notify/config', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config: draft }),
      }).then(r => r.json())
      if (!j?.success) { message.error(j?.message ?? 'บันทึกไม่สำเร็จ'); return }
      message.success(j.message ?? 'บันทึกแล้ว')
      await loadConfig()
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  // ไม่ระบุ level = ข้อความทดสอบทั่วไป · ระบุ = ข้อความแบบที่ผู้อนุมัติระดับนั้น/ภารกิจนั้นจะได้รับ ตามค่าที่กำลังแก้ (ยังไม่ต้องบันทึก)
  const test = async (key: string, scenario?: { level?: Level; mission_id?: number; kind?: 'COLLEAGUE' }) => {
    setTesting(key)
    try {
      const j = await fetch('/api/v1/hr/leave-notify/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario ? { ...scenario, config: draft } : {}),
      }).then(r => r.json())
      if (j?.success) message.success(j.message); else message.error(j?.message ?? 'ทดสอบไม่สำเร็จ')
      void loadLog()
    } catch {
      message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setTesting(null)
    }
  }

  const runPreview = async () => {
    setPreviewLoading(true)
    const j = await fetch('/api/v1/hr/leave-notify/preview', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config: draft }),
    }).then(r => r.json()).catch(() => null)
    if (!j?.success) message.error(j?.message ?? 'คำนวณตัวอย่างไม่สำเร็จ')
    setPreview(j?.success ? j.data : [])
    setPreviewLoading(false)
  }

  if (hasAccess === false) {
    return (
      <div className="min-h-dvh bg-app-bg text-app-text">
        <Navbar />
        <div className="p-6 md:p-8 flex justify-center">
          <Card style={{ borderRadius: 12, maxWidth: 480, marginTop: 60, textAlign: 'center' }}>
            <CloseCircleOutlined style={{ fontSize: 48, color: '#ef4444', marginBottom: 16 }} />
            <Title level={4} style={{ marginTop: 0 }}>ไม่มีสิทธิ์เข้าถึง</Title>
            <Text type="secondary">หน้าตั้งค่าการแจ้งเตือนระบบลาเปิดให้เฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้น</Text>
            <div className="mt-5"><Button type="primary" href="/home"><HomeOutlined /> กลับหน้าหลัก</Button></div>
          </Card>
        </div>
      </div>
    )
  }

  const missionMode = (id: number): Mode | 'level' => draft?.mission_overrides[String(id)] ?? 'level'
  const setMissionMode = (id: number, v: Mode | 'level') => setDraft(d => {
    if (!d) return d
    const next = { ...d.mission_overrides }
    if (v === 'level') delete next[String(id)]; else next[String(id)] = v
    return { ...d, mission_overrides: next }
  })
  const off = !draft?.enabled

  return (
    <div className="min-h-dvh bg-app-bg text-app-text">
      <Navbar />
      <div className="p-4 md:p-8 max-w-350 mx-auto">
        <Breadcrumb
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FaUsersCog className="inline mr-1" /> งานทรัพยากรบุคคล</> },
            { href: '/hr/leave', title: <><FaCalendarAlt className="inline mr-1" /> การลา</> },
            { title: 'ตั้งค่าการแจ้งเตือน' },
          ]}
          className="mb-4"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <Title level={3} style={{ margin: 0 }}><BellOutlined style={{ color: '#f59e0b' }} /> ตั้งค่าการแจ้งเตือนระบบลา</Title>
            <Text type="secondary">ส่งผ่านหมอพร้อม (MOPH Alert) ถึงแต่ละคนตามเลขบัตรประชาชน · เฉพาะผู้ดูแลระบบแก้ไขได้</Text>
          </div>
          <Space wrap>
            <Popconfirm title="ส่งข้อความทดสอบถึงหมอพร้อมของท่าน?" okText="ส่ง" cancelText="ไม่" onConfirm={() => test('basic')}>
              <Button icon={<SendOutlined />} loading={testing === 'basic'}>ทดสอบส่งถึงตัวเอง</Button>
            </Popconfirm>
            <Button icon={<UndoOutlined />} disabled={!dirty} onClick={() => meta && setDraft(meta.config)}>ยกเลิกการแก้ไข</Button>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} disabled={!dirty} onClick={save}>บันทึก</Button>
          </Space>
        </div>

        {meta && !meta.ready && (
          <Alert className="mb-4" type="error" showIcon title="ยังไม่ได้สร้างตารางการแจ้งเตือน" description="รัน src/db/hr_leave_notify.sql ที่ฐานข้อมูลก่อน — ระหว่างนี้ระบบไม่ส่งแจ้งเตือนใด ๆ" />
        )}
        {meta && !meta.moph_configured && (
          <Alert className="mb-4" type="warning" showIcon title="เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า MOPH_ALERT_*" description="ตั้งค่าได้ แต่ระบบจะบันทึกว่า &quot;ข้าม&quot; แทนการส่งจริง จนกว่าจะตั้งค่าหมอพร้อมที่ backend" />
        )}

        {!draft ? <Card loading style={{ borderRadius: 12, border: 'none' }} /> : (
          <>
            <Card style={{ borderRadius: 12, border: 'none', marginBottom: 16 }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Text strong style={{ fontSize: 16 }}>เปิดการแจ้งเตือนระบบลา</Text>
                  <div><Text type="secondary" style={{ fontSize: 12 }}>
                    ปิด = ไม่ส่งอะไรเลย (ค่าตั้งต้น) · {meta?.updated_at ? `แก้ไขล่าสุด ${dayjs(meta.updated_at).format('DD/MM/')}${dayjs(meta.updated_at).year() + 543} ${dayjs(meta.updated_at).format('HH:mm')} น. โดย ${meta.updated_by_name ?? '-'}` : 'ยังไม่เคยบันทึก'}
                  </Text></div>
                </div>
                <Switch checked={draft.enabled} onChange={v => patch({ enabled: v })} checkedChildren="เปิด" unCheckedChildren="ปิด" />
              </div>
            </Card>
            {off && (
              <Alert
                className="mb-4" type="warning" showIcon
                title="การแจ้งเตือนปิดอยู่ — ตั้งค่าด้านล่างได้ แต่ยังไม่ส่งข้อความจนกว่าจะเปิดสวิตช์ด้านบนและกดบันทึก"
              />
            )}

            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card title="ผู้อนุมัติ — แยกตามระดับ" style={{ borderRadius: 12, border: 'none', height: '100%' }}>
                  <div className="flex flex-col gap-3">
                    {LEVELS.map(l => (
                      <div key={l.key} className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <Text strong>{l.label}</Text>
                          {l.hint && <div><Text type="secondary" style={{ fontSize: 12 }}>{l.hint}</Text></div>}
                        </div>
                        <Space size={6}>
                          <ModeSwitch
                            value={draft.approver[l.key]}
                            onChange={v => patch({ approver: { ...draft.approver, [l.key]: v } })}
                          />
                          <TestButton
                            label={l.label} off={draft.approver[l.key] === 'off'} loading={testing === `L:${l.key}`}
                            onSend={() => test(`L:${l.key}`, { level: l.key })}
                          />
                        </Space>
                      </div>
                    ))}
                  </div>
                  <Alert
                    className="mt-4" type="info" showIcon
                    title="ทันที = รวมใบที่เข้าคิวคนเดียวกันภายใน 1 นาทีเป็นข้อความเดียว"
                    description="กดอนุมัติแบบกลุ่มหลายใบ ผู้อนุมัติขั้นถัดไปได้ข้อความเดียว ไม่เตือนรัว · สรุปตามรอบ = ยอดรออนุมัติ แยกตามหน่วยงาน พร้อมใบที่รอนานสุด ไม่มีใบรอ = ไม่ส่ง"
                  />
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card title="รอบสรุปรออนุมัติ" style={{ borderRadius: 12, border: 'none', height: '100%' }}>
                  <Text>เวลาที่ส่งสรุป</Text>
                  <Select
                    mode="tags" className="w-full mt-1" value={draft.digest_times} options={TIME_OPTIONS}
                    tokenSeparators={[',', ' ']} placeholder="เช่น 08:00"
                    onChange={(v: string[]) => patch({ digest_times: [...new Set(v.map(t => t.trim()))].sort() })}
                    tagRender={({ value, closable, onClose }) => (
                      <Tag color={TIME_RE.test(String(value)) ? 'gold' : 'error'} closable={closable} onClose={onClose} style={{ marginInlineEnd: 4 }}>
                        {String(value)} น.
                      </Tag>
                    )}
                  />
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      <Text>ไม่ส่งวันเสาร์-อาทิตย์ และวันหยุดราชการ</Text>
                      <div><Text type="secondary" style={{ fontSize: 12 }}>ตามตารางวันหยุดที่งาน HR บันทึก</Text></div>
                    </div>
                    <Switch checked={draft.digest_skip_holidays} onChange={v => patch({ digest_skip_holidays: v })} />
                  </div>
                  <div className="mt-4">
                    <Text>ที่อยู่หน้าเว็บ (ปุ่มเปิดระบบในข้อความ)</Text>
                    <Input
                      className="mt-1" placeholder="เช่น https://erp.hospital.go.th" value={draft.app_url ?? ''}
                      onChange={e => patch({ app_url: e.target.value.trim() || null })}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>เว้นว่าง = ข้อความไม่มีปุ่มลิงก์</Text>
                  </div>
                </Card>
              </Col>

              <Col xs={24}>
                <Card
                  title="หัวหน้ากลุ่มภารกิจ — ตั้งรายภารกิจ"
                  extra={<Text type="secondary" style={{ fontSize: 12 }}>ค่าระดับตอนนี้: <Tag color={MODE_TAG[draft.approver.MISSION].color}>{MODE_TAG[draft.approver.MISSION].label}</Tag></Text>}
                  style={{ borderRadius: 12, border: 'none' }}
                >
                  <Table
                    size="small" rowKey="id" pagination={false} dataSource={meta?.missions ?? []}
                    columns={[
                      { title: 'กลุ่มภารกิจ', dataIndex: 'name' },
                      { title: 'บุคลากร', dataIndex: 'staff', width: 110, align: 'right', render: (n: number) => `${n.toLocaleString('th-TH')} คน` },
                      {
                        title: 'การแจ้งหัวหน้ากลุ่มภารกิจ', key: 'mode', width: 260,
                        render: (_: unknown, m: { id: number }) => (
                          <Select
                            size="small" style={{ width: 230 }} value={missionMode(m.id)}
                            onChange={(v: Mode | 'level') => setMissionMode(m.id, v)}
                            options={[{ value: 'level', label: `ตามค่าระดับ (${MODE_TAG[draft.approver.MISSION].label})` }, ...MODE_OPTIONS]}
                          />
                        ),
                      },
                      {
                        title: 'ทดสอบ', key: 'test', width: 100, align: 'center',
                        render: (_: unknown, m: { id: number; name?: string }) => (
                          <TestButton
                            label={`หัวหน้ากลุ่มภารกิจ ${m.name ?? ""}`} loading={testing === `M:${m.id}`}
                            off={(missionMode(m.id) === 'level' ? draft.approver.MISSION : missionMode(m.id)) === 'off'}
                            onSend={() => test(`M:${m.id}`, { level: 'MISSION', mission_id: m.id })}
                          />
                        ),
                      },
                    ]}
                  />
                </Card>
              </Col>

              <Col xs={24} lg={12}>
                <Card title="เพื่อนร่วมงาน" style={{ borderRadius: 12, border: 'none', height: '100%' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <Text>แจ้งเพื่อนร่วมงานเมื่อมีคนยื่นใบลา</Text>
                      <TestButton
                        label="เพื่อนร่วมงาน" off={!draft.colleague.enabled} loading={testing === 'C'}
                        onSend={() => test('C', { kind: 'COLLEAGUE' })}
                      />
                      <div><Text type="secondary" style={{ fontSize: 12 }}>บอกแค่ชื่อ วันที่ และว่า &quot;ลา&quot; — ไม่บอกประเภทและเหตุผลการลา</Text></div>
                    </div>
                    <Switch checked={draft.colleague.enabled} onChange={v => patch({ colleague: { ...draft.colleague, enabled: v } })} />
                  </div>
                  <div className="mt-4">
                    <Text>ผู้รับ</Text>
                    <Segmented
                      block className="mt-1" disabled={!draft.colleague.enabled} value={draft.colleague.scope}
                      onChange={v => patch({ colleague: { ...draft.colleague, scope: v as NotifyConfig['colleague']['scope'] } })}
                      options={[
                        { value: 'unit_or_group', label: 'หน่วยงาน (ไม่มีหน่วยงาน → กลุ่มงาน)' },
                        { value: 'unit_only', label: 'เฉพาะหน่วยงาน' },
                      ]}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ผู้ลาที่ไม่มีหน่วยงาน แจ้งเฉพาะคนในกลุ่มงานที่ไม่มีหน่วยงานเช่นกัน (ไม่แจ้งทั้งกลุ่มงาน)
                    </Text>
                  </div>
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card title="ผู้ลา" style={{ borderRadius: 12, border: 'none', height: '100%' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Text>แจ้งผู้ลาเมื่อยื่นใบลา</Text>
                      <div><Text type="secondary" style={{ fontSize: 12 }}>ยืนยันประเภท วันที่ และจำนวนวัน รวมกรณีงาน HR ยื่นแทน</Text></div>
                    </div>
                    <Switch checked={draft.applicant_submitted} onChange={v => patch({ applicant_submitted: v })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Text>แจ้งผลถึงผู้ลา</Text>
                      <div><Text type="secondary" style={{ fontSize: 12 }}>อนุมัติครบทุกขั้น / ไม่อนุมัติ (พร้อมเหตุผล) / ยกเลิกใบลาสำเร็จ</Text></div>
                    </div>
                    <Switch checked={draft.applicant_result} onChange={v => patch({ applicant_result: v })} />
                  </div>
                </Card>
              </Col>

              <Col xs={24}>
                <Card
                  title="ตัวอย่างรอบสรุป ถ้าส่งตอนนี้"
                  extra={<Button size="small" icon={<EyeOutlined />} loading={previewLoading} onClick={runPreview}>คำนวณ (ไม่ส่งจริง)</Button>}
                  style={{ borderRadius: 12, border: 'none' }}
                >
                  {preview == null ? (
                    <Text type="secondary">กด &quot;คำนวณ&quot; เพื่อดูว่าแต่ละคนจะได้สรุปกี่ใบ — ใช้ค่าตั้งที่กำลังแก้อยู่ (ยังไม่บันทึกก็ได้)</Text>
                  ) : preview.length === 0 ? <Empty description="ไม่มีผู้อนุมัติที่จะได้รับสรุป" /> : (
                    <Table
                      size="small" rowKey="approver_id" dataSource={preview} pagination={{ pageSize: 10, hideOnSinglePage: true }}
                      columns={[
                        {
                          title: 'ผู้อนุมัติ', key: 'name',
                          render: (_: unknown, r: PreviewRow) => (
                            <Space size={6} wrap>
                              <Text strong>{r.name}</Text>
                              {!r.has_cid && <Tooltip title="ไม่มีเลขบัตรประชาชน 13 หลัก — ส่งไม่ได้"><Tag color="error">ไม่มีเลขบัตร</Tag></Tooltip>}
                            </Space>
                          ),
                        },
                        { title: 'ในฐานะ', dataIndex: 'level', width: 170 },
                        { title: 'รออนุมัติ', dataIndex: 'count', width: 100, align: 'right', render: (n: number, r: PreviewRow) => <Text strong>{n} ใบ{r.cancel ? ` (ยกเลิก ${r.cancel})` : ''}</Text> },
                        { title: 'แยกตามหน่วยงาน', key: 'units', render: (_: unknown, r: PreviewRow) => <Text style={{ fontSize: 12 }}>{r.units.slice(0, 4).map(u => `${u.unit} ${u.n}`).join(' · ')}{r.units.length > 4 ? ` · อื่น ๆ ${r.units.length - 4} หน่วย` : ''}</Text> },
                      ]}
                    />
                  )}
                </Card>
              </Col>

              <Col xs={24}>
                <Card
                  title="ประวัติการส่ง (100 รายการล่าสุด)"
                  extra={<Button size="small" icon={<ReloadOutlined />} loading={logLoading} onClick={loadLog}>โหลดใหม่</Button>}
                  style={{ borderRadius: 12, border: 'none' }}
                >
                  <Table
                    size="small" rowKey="id" loading={logLoading} dataSource={log} pagination={{ pageSize: 15, hideOnSinglePage: true }}
                    locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ยังไม่มีการส่ง" /> }}
                    columns={[
                      { title: 'เวลา', dataIndex: 'created_at', width: 150, render: (d: string) => `${dayjs(d).format('DD/MM/')}${dayjs(d).year() + 543} ${dayjs(d).format('HH:mm')}` },
                      { title: 'ประเภท', dataIndex: 'kind', width: 140, render: (k: string) => KIND_LABEL[k] ?? k },
                      { title: 'ผู้รับ', dataIndex: 'recipients', width: 80, align: 'right', render: (n: number) => `${n} คน` },
                      { title: 'ผล', dataIndex: 'status', width: 90, render: (s: string) => <Tag color={STATUS_COLOR[s]}>{s === 'SENT' ? 'ส่งแล้ว' : s === 'SKIPPED' ? 'ข้าม' : 'ไม่สำเร็จ'}</Tag> },
                      { title: 'รายละเอียด', dataIndex: 'detail', render: (d: string | null) => <Text style={{ fontSize: 12 }}>{d}</Text> },
                    ]}
                  />
                </Card>
              </Col>
            </Row>
          </>
        )}
      </div>
    </div>
  )
}

export default function LeaveNotifySettingsPage() {
  return (
    <AppThemeProvider colorPrimary="#f59e0b">
      <PageContent />
    </AppThemeProvider>
  )
}
