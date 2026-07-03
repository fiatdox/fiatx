'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card, Row, Col, Select, Transfer, Button, Breadcrumb, Typography,
  App, Spin, Tag, Empty, Space, Result,
} from 'antd'
import type { TransferProps } from 'antd'
import {
  HomeOutlined, SafetyCertificateOutlined, SaveOutlined,
  ReloadOutlined, TeamOutlined,
} from '@ant-design/icons'
import { FaUserShield } from 'react-icons/fa'
import Cookies from 'js-cookie'
import Swal from 'sweetalert2'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'

// สิทธิ์ที่เข้าถึงหน้าจัดการสิทธิ์ได้ — admin หรือ CHIEF_GROUP_IT เท่านั้น
const ALLOWED_ROLES = ['ADMIN', 'CHIEF_GROUP_IT']
function canAccessRoles(): boolean {
  try {
    const raw = Cookies.get('user_data')
    if (!raw) return false
    const roles = JSON.parse(raw)?.roles
    return Array.isArray(roles) && roles.some((r: unknown) => ALLOWED_ROLES.includes(String(r).toUpperCase()))
  } catch {
    return false
  }
}

const { Text, Title } = Typography

// ── Types ──────────────────────────────────────────────────────────────────

interface User {
  id: number
  pname?: string
  fname: string
  lname: string
  username?: string
  major_id?: number
  major_name?: string
  mission_name?: string
  position_name?: string
}

interface RoleItem {
  key: string
  title: string
  description?: string
}

interface Major { id: number; name: string }

// dataSource ของ Transfer (ฝั่งผู้ใช้งาน)
interface UserTransferItem {
  key: string
  title: string
  description: string
  major_id?: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(path, opts)
  return res.json()
}

// API ตอบกลับได้หลายรูปแบบ (array ตรง ๆ / {data:[]} / {result:[]}) → ดึงเป็น array
function extractArray(d: unknown): unknown[] {
  if (Array.isArray(d)) return d
  const obj = (d ?? {}) as Record<string, unknown>
  const found = obj.data ?? obj.result ?? obj.items ?? obj.users ?? obj.roles
  return Array.isArray(found) ? found : []
}

function normalizeRole(item: unknown): RoleItem {
  if (typeof item === 'string' || typeof item === 'number') {
    return { key: String(item), title: String(item) }
  }
  const o = item as Record<string, unknown>
  // key สำหรับใช้อ้างอิง role (ใช้ใน URL) — เลือก id ก่อน แล้วค่อย code/name
  const key = String(o.id ?? o.role_id ?? o.code ?? o.role ?? o.name ?? '')
  // ชื่อที่แสดง — หา field ที่ดูเป็น "ชื่อ" แบบ generic เพื่อกันโชว์เป็นตัวเลข
  const explicitName = o.name ?? o.role_name ?? o.display_name ?? o.title ?? o.label ?? o.name_th
  let title = explicitName != null ? String(explicitName) : ''
  if (!title) {
    const nameKey = Object.keys(o).find(
      (k) => /name|title|label/i.test(k) && typeof o[k] === 'string' && (o[k] as string).trim(),
    )
    if (nameKey) title = String(o[nameKey])
  }
  if (!title) title = String(o.code ?? o.role ?? key)
  const description = o.description ?? o.detail ?? o.desc
  return { key, title, description: description ? String(description) : undefined }
}

// major อาจตอบกลับเป็น {id,name} หรือ {major_id,major_name} → ปรับเป็น {id,name}
function normalizeMajor(item: unknown): Major {
  const o = (item ?? {}) as Record<string, unknown>
  const id = o.id ?? o.major_id ?? 0
  const name = o.name ?? o.major_name ?? ''
  return { id: Number(id), name: String(name) }
}

// ดึง user id จากข้อมูลผู้ใช้ของ role (อาจเป็น number ตรง ๆ / {id} / {user_id})
function userIdOf(item: unknown): string {
  if (typeof item === 'string' || typeof item === 'number') return String(item)
  const o = item as Record<string, unknown>
  return String(o.id ?? o.user_id ?? o.userId ?? '')
}

const fullName = (u: User) => `${u.pname ?? ''}${u.fname} ${u.lname}`.trim()

// ── Page ───────────────────────────────────────────────────────────────────

const PageContent = () => {
  const { message } = App.useApp()
  const router = useRouter()

  // ตรวจสิทธิ์เข้าถึง — admin / CHIEF_GROUP_IT เท่านั้น (null = ยังตรวจไม่เสร็จ)
  const [allowed, setAllowed] = useState<boolean | null>(null)
  useEffect(() => { setAllowed(canAccessRoles()) }, [])

  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [majors, setMajors] = useState<Major[]>([])
  const [loadingInit, setLoadingInit] = useState(false)

  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [filterMajor, setFilterMajor] = useState<number | null>(null)
  const [targetKeys, setTargetKeys] = useState<string[]>([])
  // ชุดผู้ใช้เดิมตอนโหลด role มา — ใช้เทียบหา "เพิ่ม/เอาออก" ตอนบันทึก
  const [originalKeys, setOriginalKeys] = useState<string[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [saving, setSaving] = useState(false)

  const currentRole = useMemo(
    () => roles.find((r) => r.key === selectedRole) ?? null,
    [roles, selectedRole],
  )

  // โหลดผู้ใช้ + roles + กลุ่มงาน ทั้งหมด
  const loadInit = useCallback(async () => {
    setLoadingInit(true)
    try {
      const [usersData, rolesData, majorsData] = await Promise.all([
        apiFetch('/api/users'),
        apiFetch('/api/roles'),
        apiFetch('/api/v1/system/majors'),
      ])
      setUsers(extractArray(usersData) as User[])
      setRoles(extractArray(rolesData).map(normalizeRole).filter((r) => r.key))
      setMajors(extractArray(majorsData).map(normalizeMajor).filter((m) => m.id))
    } catch {
      message.error('โหลดข้อมูลผู้ใช้/สิทธิ์ไม่สำเร็จ')
    } finally {
      setLoadingInit(false)
    }
  }, [message])

  useEffect(() => { if (allowed) loadInit() }, [allowed, loadInit])

  // ── ตัวเลือก ────────────────────────────────────────────────────────────
  const roleOptions = useMemo(
    () => roles.map((r) => ({ value: r.key, label: r.title })),
    [roles],
  )

  const majorOptions = useMemo(
    () => majors.map((m) => ({ value: m.id, label: m.name })),
    [majors],
  )

  // dataSource ของ Transfer = ผู้ใช้ทั้งหมด (กรองตามกลุ่มงาน แต่ยังคงผู้ใช้ที่ถูกเลือกไว้เสมอ)
  const userTransferData: UserTransferItem[] = useMemo(() => {
    return users
      .filter((u) => !filterMajor || u.major_id === filterMajor || targetKeys.includes(String(u.id)))
      .map((u) => ({
        key: String(u.id),
        title: fullName(u),
        description: [u.position_name, u.major_name].filter(Boolean).join(' · '),
        major_id: u.major_id,
      }))
  }, [users, filterMajor, targetKeys])

  // เมื่อเลือกสิทธิ์ → โหลดรายชื่อผู้ใช้ที่มีสิทธิ์นี้มาใส่ฝั่งขวาของ Transfer
  const handleSelectRole = async (roleKey: string | null) => {
    setSelectedRole(roleKey)
    setTargetKeys([])
    setOriginalKeys([])
    if (!roleKey) return
    setLoadingUsers(true)
    try {
      const data = await apiFetch(`/api/roles/${encodeURIComponent(roleKey)}/users`)
      const keys = extractArray(data).map(userIdOf).filter(Boolean)
      setTargetKeys(keys)
      setOriginalKeys(keys)
    } catch {
      message.error('โหลดรายชื่อผู้ใช้ของสิทธิ์นี้ไม่สำเร็จ')
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleSave = async () => {
    if (!selectedRole) { message.warning('กรุณาเลือกสิทธิ์ก่อน'); return }

    // เทียบกับชุดเดิม → หาคนที่เพิ่มเข้ามา และคนที่เอาออก
    const original = new Set(originalKeys)
    const current = new Set(targetKeys)
    const added = targetKeys.filter((k) => !original.has(k))
    const removed = originalKeys.filter((k) => !current.has(k))

    if (!added.length && !removed.length) {
      message.info('ไม่มีการเปลี่ยนแปลง')
      return
    }

    setSaving(true)
    try {
      const roleId = Number(selectedRole)

      // เพิ่ม: POST เป็นชุด (array) ครั้งเดียว
      if (added.length) {
        await apiFetch('/api/user-roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(added.map((uid) => ({ user_id: Number(uid), role_id: roleId }))),
        })
      }

      // เอาออก: DELETE ทีละคู่ user_id/role_id
      if (removed.length) {
        await Promise.all(
          removed.map((uid) =>
            apiFetch(`/api/user-roles/${uid}/${roleId}`, { method: 'DELETE' }),
          ),
        )
      }

      setOriginalKeys(targetKeys) // sync ชุดเดิมเป็นค่าล่าสุด
      await Swal.fire({
        title: 'บันทึกสำเร็จ',
        text: `สิทธิ์ "${currentRole?.title ?? ''}" — เพิ่ม ${added.length} คน, เอาออก ${removed.length} คน`,
        icon: 'success',
        confirmButtonColor: '#006a5a',
        background: 'var(--app-surface)',
        color: 'var(--app-text)',
      })
    } catch {
      message.error('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const filterTransferOption: TransferProps<UserTransferItem>['filterOption'] = (input, item) =>
    `${item.title} ${item.description}`.toLowerCase().includes(input.toLowerCase())

  // ── Render ───────────────────────────────────────────────────────────────

  // ยังตรวจสิทธิ์ไม่เสร็จ
  if (allowed === null) {
    return (
      <div className="min-h-dvh bg-app-bg text-app-text flex items-center justify-center" style={{ minHeight: '100dvh' }}>
        <Spin size="large" />
      </div>
    )
  }

  // ไม่มีสิทธิ์เข้าถึง
  if (!allowed) {
    return (
      <div className="min-h-dvh bg-app-bg text-app-text" style={{ minHeight: '100dvh' }}>
        <Navbar />
        <Result
          status="403"
          title="ไม่มีสิทธิ์เข้าถึง"
          subTitle="หน้านี้สำหรับผู้ดูแลระบบ (admin) หรือหัวหน้ากลุ่มงานเทคโนโลยีสารสนเทศเท่านั้น"
          extra={
            <Button type="primary" onClick={() => router.replace('/home')} style={{ backgroundColor: '#006a5a', borderColor: '#006a5a' }}>
              กลับหน้าหลัก
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-app-bg text-app-text" style={{ minHeight: '100dvh' }}>
      <Navbar />
      <div className="p-4 md:p-8 max-w-300 mx-auto">

        <Breadcrumb
          className="mb-4"
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FaUserShield className="inline mr-1" /> บัญชีผู้ใช้</> },
            { title: 'จัดการสิทธิ์การใช้งาน' },
          ]}
        />

        {/* Header */}
        <Card style={{ background: 'linear-gradient(135deg, #006a5a 0%, #059669 50%, #0d9488 100%)', border: 'none', borderRadius: 16, marginBottom: 24 }}>
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center rounded-2xl" style={{ width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.15)' }}>
              <SafetyCertificateOutlined style={{ fontSize: 28, color: '#fff' }} />
            </div>
            <div>
              <Title level={3} style={{ color: '#fff', margin: 0 }}>จัดการสิทธิ์การใช้งาน</Title>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>เลือกสิทธิ์ แล้วกำหนดผู้ใช้งานที่จะได้รับสิทธิ์นั้น</Text>
            </div>
          </div>
        </Card>

        <Spin spinning={loadingInit}>
          {/* Step 1: เลือกสิทธิ์ */}
          <Card
            style={{ borderRadius: 12, border: 'none', marginBottom: 20 }}
            title={
              <Space>
                <Tag color="#006a5a" style={{ borderRadius: 999, fontSize: 12 }}>ขั้นตอนที่ 1</Tag>
                <span>เลือกสิทธิ์ (Role)</span>
              </Space>
            }
            extra={<Button icon={<ReloadOutlined />} onClick={loadInit} size="small">รีเฟรช</Button>}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={9}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                  <TeamOutlined className="mr-1" />เลือกกลุ่มงาน
                </Text>
                <Select
                  placeholder="ทุกกลุ่มงาน"
                  value={filterMajor}
                  onChange={(v) => setFilterMajor(v ?? null)}
                  allowClear
                  style={{ width: '100%' }}
                  options={majorOptions}
                  showSearch
                  optionFilterProp="label"
                />
              </Col>
              <Col xs={24} md={15}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                  <SafetyCertificateOutlined className="mr-1" />ค้นหา / เลือกสิทธิ์
                </Text>
                <Select
                  placeholder="เลือกสิทธิ์ที่ต้องการกำหนด..."
                  value={selectedRole}
                  onChange={handleSelectRole}
                  allowClear
                  style={{ width: '100%' }}
                  showSearch
                  optionFilterProp="label"
                  options={roleOptions}
                  notFoundContent={<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่พบสิทธิ์" />}
                />
                {currentRole?.description && (
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                    {currentRole.description}
                  </Text>
                )}
              </Col>
            </Row>
          </Card>

          {/* Step 2: เลือกผู้ใช้งานด้วย Transfer */}
          <Card
            style={{ borderRadius: 12, border: 'none' }}
            title={
              <Space>
                <Tag color="#006a5a" style={{ borderRadius: 999, fontSize: 12 }}>ขั้นตอนที่ 2</Tag>
                <span>เลือกผู้ใช้งาน</span>
                {(filterMajor != null || selectedRole != null) && (
                  <Tag color="green" style={{ borderRadius: 999 }}>{targetKeys.length} คน</Tag>
                )}
              </Space>
            }
          >
            {filterMajor == null && selectedRole == null ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="เลือกกลุ่มงาน หรือ สิทธิ์ ในขั้นตอนที่ 1 ก่อน เพื่อแสดงรายชื่อผู้ใช้งาน"
                style={{ padding: '32px 0' }}
              />
            ) : (
              <Spin spinning={loadingUsers}>
                <Transfer<UserTransferItem>
                  dataSource={userTransferData}
                  targetKeys={targetKeys}
                  onChange={(keys) => setTargetKeys(keys as string[])}
                  showSearch
                  filterOption={filterTransferOption}
                  titles={['ผู้ใช้งานทั้งหมด', 'ผู้ใช้ที่ได้รับสิทธิ์']}
                  render={(item) => (
                    <div className="py-0.5">
                      <span className="text-app-text">{item.title}</span>
                      {item.description && (
                        <span className="text-app-text-3 text-xs ml-2">{item.description}</span>
                      )}
                    </div>
                  )}
                  styles={{ section: { width: '100%', height: 440 } }}
                  locale={{ itemUnit: 'คน', itemsUnit: 'คน', searchPlaceholder: 'ค้นหาผู้ใช้งาน...' }}
                />

                <div className="flex justify-end mt-6">
                  <Button
                    type="primary"
                    size="large"
                    icon={<SaveOutlined />}
                    loading={saving}
                    onClick={handleSave}
                    style={{ backgroundColor: '#006a5a', borderColor: '#006a5a', minWidth: 160 }}
                  >
                    บันทึก
                  </Button>
                </div>
              </Spin>
            )}
          </Card>
        </Spin>
      </div>

      <style jsx global>{`
        .ant-transfer { width: 100%; }
        .ant-transfer-list { flex: 1; }
      `}</style>
    </div>
  )
}

export default function Page() {
  return (
    <AppThemeProvider colorPrimary="#006a5a">
      <PageContent />
    </AppThemeProvider>
  )
}
