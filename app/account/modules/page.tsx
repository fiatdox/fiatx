'use client'
import React, { useEffect, useMemo, useState } from 'react'
import {
  ConfigProvider, App, Typography, Breadcrumb, Card, Tag, theme, Button, Switch,
  Alert, Empty, Row, Col, Space, Input, Spin,
} from 'antd'
import { HomeOutlined, ReloadOutlined, SaveOutlined, SearchOutlined } from '@ant-design/icons'
import { FaToggleOn } from 'react-icons/fa'
import Swal from 'sweetalert2'
import Navbar from '@/app/components/Navbar'
import { useThemeMode } from '@/app/components/ThemeProvider'

const { Title, Text } = Typography

type AppModule = {
  module_key: string
  label: string
  group_label: string
  route_prefix: string
  enabled: boolean
  sort: number
  note: string | null
  updated_at: string | null
  updated_by: string | null
}

const PageContent = () => {
  const { message } = App.useApp()

  const [modules, setModules] = useState<AppModule[]>([])
  // สถานะที่ผู้ใช้กำลังแก้ (ยังไม่บันทึก) — เทียบกับ modules เพื่อหาว่าอะไรเปลี่ยนบ้าง
  const [draft, setDraft] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [denied, setDenied] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/modules')
      if (res.status === 403) { setDenied(true); return }
      const j = await res.json()
      if (!j?.success) { message.error(j?.message || 'โหลดทะเบียนโมดูลไม่สำเร็จ'); return }
      const list = (j.data ?? []) as AppModule[]
      setModules(list)
      setDraft(Object.fromEntries(list.map(m => [m.module_key, m.enabled])))
    } catch {
      message.error('เชื่อมต่อไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  // รายการที่ต่างจากค่าที่บันทึกไว้ — ใช้ทั้งปุ่มบันทึกและกล่องยืนยัน
  const changes = useMemo(
    () => modules.filter(m => draft[m.module_key] !== m.enabled),
    [modules, draft],
  )
  const turningOff = changes.filter(m => !draft[m.module_key])
  const turningOn = changes.filter(m => draft[m.module_key])

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? modules.filter(m =>
          m.label.toLowerCase().includes(q)
          || m.route_prefix.toLowerCase().includes(q)
          || m.group_label.toLowerCase().includes(q))
      : modules
    const map = new Map<string, AppModule[]>()
    for (const m of filtered) {
      const arr = map.get(m.group_label) ?? []
      arr.push(m)
      map.set(m.group_label, arr)
    }
    return Array.from(map.entries())
  }, [modules, search])

  const save = async () => {
    if (changes.length === 0) { message.info('ไม่มีรายการที่เปลี่ยนแปลง'); return }

    // ปิดโมดูล = เมนูหายจากทุกคนทั้งองค์กร จึงต้องเห็นรายการชัด ๆ ก่อนยืนยัน
    const list = (arr: AppModule[]) =>
      arr.map(m => `<div>• ${m.label} <span style="opacity:.6">(${m.route_prefix})</span></div>`).join('')
    const r = await Swal.fire({
      title: `บันทึกการเปลี่ยนแปลง ${changes.length} รายการ?`,
      html: `
        <div style="text-align:left;font-size:14px;line-height:1.8">
          ${turningOff.length > 0 ? `
            <div style="margin-bottom:10px">
              <b style="color:#b91c1c">ปิดการมองเห็น ${turningOff.length} ระบบ</b>
              ${list(turningOff)}
            </div>` : ''}
          ${turningOn.length > 0 ? `
            <div style="margin-bottom:10px">
              <b style="color:#047857">เปิดการมองเห็น ${turningOn.length} ระบบ</b>
              ${list(turningOn)}
            </div>` : ''}
          ${turningOff.length > 0 ? `
            <div style="margin-top:12px;padding:10px;border-radius:8px;background:#fee2e2;color:#991b1b">
              <b>ผลกระทบ:</b> เมนูของระบบที่ปิดจะหายจากผู้ใช้ทุกคนทันที (รวมผู้ดูแลระบบ)
              ข้อมูลเดิมไม่ถูกลบ เปิดกลับเมื่อไรก็ได้
            </div>` : ''}
        </div>`,
      icon: turningOff.length > 0 ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: turningOff.length > 0 ? '#ef4444' : '#0ea5e9',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ยืนยันบันทึก',
      cancelButtonText: 'ยกเลิก',
    })
    if (!r.isConfirmed) return

    setSaving(true)
    try {
      const res = await fetch('/api/v1/modules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modules: changes.map(m => ({ module_key: m.module_key, enabled: draft[m.module_key] })),
        }),
      })
      const j = await res.json()
      if (!res.ok || !j.success) { message.error(j?.message || 'บันทึกไม่สำเร็จ'); return }
      message.success(j.message || 'บันทึกเรียบร้อย')
      await load()
    } catch {
      message.error('เชื่อมต่อไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const offCount = modules.filter(m => !m.enabled).length

  if (denied) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--app-bg)' }}>
        <Navbar />
        <div style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
          <Alert type="error" showIcon title="ไม่มีสิทธิ์เข้าถึงหน้านี้"
            description="หน้าจัดการโมดูลสงวนไว้สำหรับผู้ดูแลระบบ (ADMIN) เท่านั้น" />
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--app-bg)' }}>
      <Navbar />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 20px 48px' }}>
        <Breadcrumb
          className="mb-3"
          items={[
            { href: '/home', title: <HomeOutlined /> },
            { title: 'ผู้ดูแลระบบ' },
            { title: 'เปิด/ปิดการมองเห็นระบบ' },
          ]}
        />

        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center rounded-xl"
            style={{ width: 44, height: 44, background: '#0ea5e920', color: '#0ea5e9', fontSize: 20 }}>
            <FaToggleOn />
          </div>
          <div>
            <Title level={4} style={{ margin: 0 }}>เปิด/ปิดการมองเห็นระบบ</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              ซ่อนเมนูของระบบที่ยังไม่เปิดใช้งาน — มีผลกับเมนูหลักและเมนูลัดหน้าแรกของผู้ใช้ทุกคน
            </Text>
          </div>
        </div>

        <Alert
          type="info"
          showIcon
          className="mb-4"
          title="การปิดคือการซ่อนเมนู ไม่ใช่การลบข้อมูล"
          description="ระบบที่ปิดไว้จะไม่ปรากฏในเมนูของทุกคน แต่ข้อมูลเดิมและ API ยังอยู่ครบ เปิดกลับเมื่อไรก็ได้ — ผู้ที่ทราบ URL โดยตรงยังเข้าหน้านั้นได้ ถ้าต้องการปิดกั้นจริงต้องเพิ่มการตรวจสอบฝั่ง API ด้วย"
        />

        <Card
          style={{ borderRadius: 14 }}
          styles={{ body: { padding: 16 } }}
          title={
            <Space wrap>
              <span>ทะเบียนระบบ</span>
              <Tag color="blue">{modules.length} ระบบ</Tag>
              {offCount > 0 && <Tag color="red">ปิดอยู่ {offCount}</Tag>}
              {changes.length > 0 && <Tag color="orange">ยังไม่บันทึก {changes.length}</Tag>}
            </Space>
          }
          extra={
            <Space>
              <Input
                allowClear
                size="small"
                prefix={<SearchOutlined />}
                placeholder="ค้นหาระบบ"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: 190 }}
              />
              <Button size="small" icon={<ReloadOutlined />} onClick={() => void load()} disabled={saving}>
                รีเฟรช
              </Button>
              <Button
                size="small"
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                disabled={changes.length === 0}
                onClick={save}
              >
                บันทึก{changes.length > 0 ? ` (${changes.length})` : ''}
              </Button>
            </Space>
          }
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
          ) : groups.length === 0 ? (
            <Empty description="ไม่พบระบบที่ค้นหา" />
          ) : (
            groups.map(([groupLabel, items]) => (
              <div key={groupLabel} style={{ marginBottom: 20 }}>
                <Text style={{
                  color: 'var(--app-text-3)', fontSize: 12, fontWeight: 600,
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                }}>
                  {groupLabel}
                </Text>
                <Row gutter={[12, 12]} style={{ marginTop: 10 }}>
                  {items.map(m => {
                    const on = draft[m.module_key] ?? m.enabled
                    const dirty = on !== m.enabled
                    return (
                      <Col xs={24} md={12} key={m.module_key}>
                        <Card
                          size="small"
                          style={{
                            borderRadius: 12,
                            height: '100%',
                            borderColor: dirty ? '#f59e0b' : undefined,
                            background: on ? undefined : 'var(--app-bg)',
                            opacity: on ? 1 : 0.75,
                          }}
                          styles={{ body: { padding: 14 } }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, marginBottom: 2 }}>
                                {m.label}{' '}
                                {dirty && <Tag color="orange" style={{ marginInlineStart: 4 }}>แก้ไข</Tag>}
                              </div>
                              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                                {m.route_prefix}
                              </Text>
                              {m.note && (
                                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
                                  {m.note}
                                </Text>
                              )}
                              {m.updated_by && (
                                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                                  แก้ไขล่าสุดโดย {m.updated_by}
                                </Text>
                              )}
                            </div>
                            <Switch
                              checked={on}
                              checkedChildren="เปิด"
                              unCheckedChildren="ปิด"
                              onChange={v => setDraft(d => ({ ...d, [m.module_key]: v }))}
                            />
                          </div>
                        </Card>
                      </Col>
                    )
                  })}
                </Row>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  )
}

export default function ModuleSettingsPage() {
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  return (
    <ConfigProvider theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: '#0ea5e9', borderRadius: 8 } }}>
      <App>
        <PageContent />
      </App>
    </ConfigProvider>
  )
}
