'use client'
// งาน HR โอนข้อมูลจากโปรแกรมการลาเดิม — ประวัติการลา + วันเริ่มงาน (เฉพาะ ADMIN / HR)
// สั่งแล้วรันเบื้องหลังที่ backend หน้านี้ดึงความคืบหน้าและรายงานจากประวัติการโอน
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Card, Typography, Button, Modal, InputNumber, Space, App, Tag, Popconfirm, Segmented, Select,
  Table, Alert, Checkbox, Progress, Row, Col, Tooltip,
} from 'antd'
import Breadcrumb from '@/app/components/AppBreadcrumb'
import type { ColumnsType } from 'antd/es/table'
import {
  HomeOutlined, CloudDownloadOutlined, ExperimentOutlined, RollbackOutlined, FileTextOutlined, ReloadOutlined,
} from '@ant-design/icons'
import { FaUsersCog, FaCalendarAlt } from 'react-icons/fa'
import Navbar from '@/app/components/Navbar'
import { AppThemeProvider } from '@/app/components/ThemeProvider'

const { Title, Text, Paragraph } = Typography

type Kind = 'LEAVE' | 'SERVICE_DATES'
type Mode = 'DRY_RUN' | 'COMMIT' | 'UNDO'
type Scope = 'all' | 'mission' | 'user'

interface Run {
  id: number; kind: Kind; mode: Mode; status: 'RUNNING' | 'DONE' | 'FAILED'
  params: { fiscal_year?: number; scope?: Scope; scope_label?: string | null; fill_hire_date?: boolean }
  progress: number; total: number; totals: Record<string, number> | null; error: string | null
  created_at: string; finished_at: string | null; created_by_name: string | null; report?: string | null
}
interface Options { configured: boolean; current_fiscal_year: number; missions: { id: number; name: string }[]; running_id: number | null }

const MODE_TAG: Record<Mode, { color: string; label: string }> = {
  DRY_RUN: { color: 'default', label: 'ทดลอง' },
  COMMIT: { color: 'green', label: 'โอนจริง' },
  UNDO: { color: 'red', label: 'ถอนการโอน' },
}
const fmtTime = (s: string | null) => s
  ? new Date(s).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  : '-'

const scopeText = (r: Run) => {
  if (r.kind === 'SERVICE_DATES') return r.params.fill_hire_date ? 'ทุกคน · เติมวันเริ่มงานในทะเบียนที่ว่าง' : 'ทุกคน'
  const s = r.params.scope === 'all' ? 'ทุกคน' : r.params.scope_label ?? (r.params.scope === 'mission' ? 'กลุ่มภารกิจ' : 'รายบุคคล')
  return `ปีงบ ${r.params.fiscal_year} · ${s}`
}
const totalsText = (r: Run) => {
  const t = r.totals
  if (!t) return null
  if (r.kind === 'SERVICE_DATES') {
    return `จับคู่ ${t.matched} คน · ทะเบียนว่าง ${t.fills_missing_hire} คน`
      + (t.hire_date_filled != null ? ` · เติมแล้ว ${t.hire_date_filled} คน` : '')
      + (t.differs_from_hire ? ` · ไม่ตรงทะเบียน ${t.differs_from_hire} คน` : '')
  }
  if (r.mode === 'UNDO') return `ถอน ${t.undone} ใบ · ${t.employees} คน`
  return `${r.mode === 'DRY_RUN' ? 'จะโอน' : 'โอน'} ${t.imported} ใบ · โอนแล้วก่อนหน้า ${t.already} · ข้าม ${t.skipped} · ${t.employees}/${t.targets} คน`
}

const LegacyImportContent = () => {
  const { message } = App.useApp()
  const [options, setOptions] = useState<Options | null>(null)
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [staff, setStaff] = useState<{ value: number; label: string }[]>([])

  const [fy, setFy] = useState<number | null>(null)
  const [scope, setScope] = useState<Scope>('mission')
  const [missionId, setMissionId] = useState<number | null>(null)
  const [userId, setUserId] = useState<number | null>(null)
  const [fillHire, setFillHire] = useState(true)

  const [report, setReport] = useState<Run | null>(null)
  const watchId = useRef<number | null>(null)

  const openReport = useCallback(async (id: number) => {
    try {
      const j = await (await fetch(`/api/v1/hr/legacy-import/runs/${id}`)).json()
      if (j?.success) setReport(j.data)
      else message.error(j?.message ?? 'โหลดรายงานไม่สำเร็จ')
    } catch { message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ') }
  }, [message])

  const loadRuns = useCallback(async () => {
    try {
      const j = await (await fetch('/api/v1/hr/legacy-import/runs')).json()
      if (!j?.success) return
      const rows: Run[] = j.data
      setRuns(rows)
      // งานที่เพิ่งสั่งเสร็จแล้ว → เปิดรายงานให้ดูทันที
      const w = rows.find(r => r.id === watchId.current)
      if (w && w.status !== 'RUNNING') {
        watchId.current = null
        if (w.status === 'DONE') message.success(`งาน #${w.id} เสร็จแล้ว`)
        else message.error(`งาน #${w.id} ไม่สำเร็จ: ${w.error ?? ''}`)
        openReport(w.id)
      }
    } catch { /* ลองใหม่รอบถัดไป */ }
    finally { setLoading(false) }
  }, [message, openReport])

  useEffect(() => {
    fetch('/api/v1/hr/legacy-import/options')
      .then(r => r.json())
      .then(j => {
        if (!j?.success) return
        setOptions(j.data)
        setFy(f => f ?? j.data.current_fiscal_year)
      })
      .catch(() => message.error('โหลดตัวเลือกไม่สำเร็จ'))
    fetch('/api/v1/users')
      .then(r => r.json())
      .then(j => {
        if (!j?.success || !Array.isArray(j.data)) return
        type U = { id: number; pname?: string; fname?: string; lname?: string; position_name?: string }
        setStaff(j.data.map((u: U) => ({
          value: Number(u.id),
          label: `${u.pname ?? ''}${u.fname ?? ''} ${u.lname ?? ''}`.trim() + (u.position_name ? ` · ${u.position_name}` : ''),
        })))
      })
      .catch(() => { /* เลือกรายบุคคลไม่ได้ แต่ส่วนอื่นยังใช้ได้ */ })
  }, [message])

  // ดึงประวัติ — ระหว่างมีงานรันอยู่ ดึงทุก 2 วินาที
  const running = runs.some(r => r.status === 'RUNNING')
  useEffect(() => {
    const first = setTimeout(loadRuns, 0)
    if (!running && watchId.current == null) return () => clearTimeout(first)
    const t = setInterval(loadRuns, 2000)
    return () => { clearTimeout(first); clearInterval(t) }
  }, [loadRuns, running])

  const start = async (kind: Kind, mode: Mode) => {
    const body: Record<string, unknown> = { kind, mode }
    if (kind === 'LEAVE') {
      if (!fy) { message.warning('กรุณาระบุปีงบประมาณ'); return }
      if (scope === 'mission' && !missionId) { message.warning('กรุณาเลือกกลุ่มภารกิจ'); return }
      if (scope === 'user' && !userId) { message.warning('กรุณาเลือกบุคลากร'); return }
      Object.assign(body, { fiscal_year: fy, scope, mission_id: scope === 'mission' ? missionId : null, user_id: scope === 'user' ? userId : null })
    } else {
      body.fill_hire_date = fillHire
    }
    setStarting(true)
    try {
      const j = await (await fetch('/api/v1/hr/legacy-import/runs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })).json()
      if (!j?.success) { message.error(j?.message ?? 'เริ่มงานไม่สำเร็จ'); return }
      watchId.current = Number(j.data.id)
      message.info(`เริ่มงาน #${j.data.id} แล้ว — ${mode === 'DRY_RUN' ? 'ทดลอง ไม่บันทึกข้อมูล' : 'กำลังบันทึก'}`)
      await loadRuns()
    } catch { message.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ') }
    finally { setStarting(false) }
  }

  const busy = running || starting
  const disabled = !options?.configured || busy
  const scopeLabel = scope === 'all' ? 'บุคลากรทุกคน'
    : scope === 'mission' ? (options?.missions.find(m => m.id === missionId)?.name ?? 'กลุ่มภารกิจที่เลือก')
    : (staff.find(s => s.value === userId)?.label ?? 'บุคลากรที่เลือก')

  const columns: ColumnsType<Run> = [
    { title: '#', dataIndex: 'id', width: 60 },
    {
      title: 'งาน', key: 'kind', width: 210,
      render: (_, r) => (
        <div>
          <Text strong>{r.kind === 'LEAVE' ? 'ประวัติการลา' : 'วันเริ่มงาน'}</Text>{' '}
          <Tag color={MODE_TAG[r.mode].color}>{MODE_TAG[r.mode].label}</Tag>
          <div style={{ fontSize: 12, color: 'var(--app-text-2)' }}>{scopeText(r)}</div>
        </div>
      ),
    },
    {
      title: 'ผล', key: 'result',
      render: (_, r) => r.status === 'RUNNING' ? (
        <div style={{ minWidth: 200 }}>
          <Progress size="small" percent={r.total ? Math.round((r.progress / r.total) * 100) : 0} status="active" />
          <Text type="secondary" style={{ fontSize: 12 }}>{r.total ? `${r.progress} / ${r.total} คน` : 'กำลังเริ่ม…'}</Text>
        </div>
      ) : r.status === 'FAILED' ? (
        <Text type="danger" style={{ fontSize: 13 }}>ไม่สำเร็จ: {r.error}</Text>
      ) : <Text style={{ fontSize: 13 }}>{totalsText(r)}</Text>,
    },
    {
      title: 'ผู้สั่ง / เวลา', key: 'by', width: 190,
      render: (_, r) => (
        <div style={{ fontSize: 12 }}>
          <div>{r.created_by_name ?? '-'}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{fmtTime(r.created_at)}</Text>
        </div>
      ),
    },
    {
      title: '', key: 'act', width: 90, align: 'center',
      render: (_, r) => <Button size="small" icon={<FileTextOutlined />} disabled={r.status === 'RUNNING'} onClick={() => openReport(r.id)}>รายงาน</Button>,
    },
  ]

  return (
    <div className="min-h-dvh bg-app-bg text-app-text">
      <Navbar />
      <div className="p-4 md:p-8 max-w-350 mx-auto">
        <Breadcrumb
          items={[
            { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
            { title: <><FaUsersCog className="inline mr-1" /> งานทรัพยากรบุคคล</> },
            { href: '/hr/leave', title: <><FaCalendarAlt className="inline mr-1" /> การลา</> },
            { title: 'โอนข้อมูลจากโปรแกรมเดิม' },
          ]}
          className="mb-4"
        />
        <div className="mb-4">
          <Title level={3} className="m-0"><CloudDownloadOutlined /> โอนข้อมูลจากโปรแกรมการลาเดิม</Title>
          <Text type="secondary">ดึงประวัติการลาและวันเริ่มงานจากโปรแกรมเดิม จับคู่บุคลากรด้วยเลขประจำตัวประชาชน</Text>
        </div>

        {options && !options.configured && (
          <Alert style={{ marginBottom: 16 }} type="error" showIcon title="ยังไม่ได้ตั้งค่าการเชื่อมต่อฐานข้อมูลโปรแกรมเดิม" description="ติดต่อผู้ดูแลระบบให้ตั้งค่า DB_LEAVE_* ที่เซิร์ฟเวอร์" />
        )}

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card variant="borderless" className="shadow-sm rounded-xl h-full" title="ประวัติการลา">
              <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                <div className="flex flex-wrap items-center gap-3">
                  <Text>ปีงบประมาณ</Text>
                  <InputNumber value={fy} onChange={v => setFy(v)} min={2560} max={(options?.current_fiscal_year ?? 2570) + 1} style={{ width: 110 }} />
                  <Segmented<Scope>
                    value={scope}
                    onChange={setScope}
                    options={[
                      { value: 'user', label: 'รายบุคคล' },
                      { value: 'mission', label: 'กลุ่มภารกิจ' },
                      { value: 'all', label: 'ทุกคน' },
                    ]}
                  />
                </div>
                {scope === 'mission' && (
                  <Select
                    value={missionId} onChange={setMissionId} placeholder="เลือกกลุ่มภารกิจ" style={{ width: '100%' }}
                    showSearch={{ optionFilterProp: 'label' }}
                    options={(options?.missions ?? []).map(m => ({ value: m.id, label: m.name }))}
                  />
                )}
                {scope === 'user' && (
                  <Select
                    value={userId} onChange={setUserId} placeholder="พิมพ์ชื่อเพื่อค้นหาบุคลากร" style={{ width: '100%' }}
                    showSearch={{ optionFilterProp: 'label' }} options={staff}
                  />
                )}
                <Space wrap>
                  <Button icon={<ExperimentOutlined />} disabled={disabled} onClick={() => start('LEAVE', 'DRY_RUN')}>ทดลอง (ดูรายงานก่อน)</Button>
                  <Popconfirm
                    title="โอนประวัติการลาจริง"
                    description={`ปีงบ ${fy ?? '-'} · ${scopeLabel} — ใบที่โอนแล้วจะข้าม ไม่สร้างซ้ำ`}
                    okText="โอนจริง" cancelText="ปิด" onConfirm={() => start('LEAVE', 'COMMIT')} disabled={disabled}
                  >
                    <Button type="primary" icon={<CloudDownloadOutlined />} disabled={disabled}>โอนจริง</Button>
                  </Popconfirm>
                  <Popconfirm
                    title="ถอนใบลาที่โอนมาจากโปรแกรมเดิม"
                    description={`ปีงบ ${fy ?? '-'} · ${scopeLabel} — ลบใบที่โอนมา คืนยอดวันลา และล้างสิทธิ์ที่ตั้งจากโปรแกรมเดิม`}
                    okText="ถอน" okButtonProps={{ danger: true }} cancelText="ปิด" onConfirm={() => start('LEAVE', 'UNDO')} disabled={disabled}
                  >
                    <Button danger icon={<RollbackOutlined />} disabled={disabled}>ถอนการโอน</Button>
                  </Popconfirm>
                </Space>
                <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
                  อนุมัติ → อนุมัติแล้ว · รออนุมัติ → เริ่มสายอนุมัติใหม่ขั้นที่ 1 ตามผังปัจจุบัน · ไม่อนุมัติ / ขอยกเลิก / ยกเลิกแล้ว → ตามเดิม
                  · หักยอดวันลาตามใบที่ยังมีผล · ลาพักผ่อนตั้งสิทธิ์ทั้งปีจากโปรแกรมเดิม
                  · ไม่โอน: มาสาย ขาดราชการ ลาไปต่างประเทศ และใบที่ทับวันกับใบที่ยื่นในระบบใหม่แล้ว (แสดงในรายงาน)
                </Paragraph>
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card variant="borderless" className="shadow-sm rounded-xl h-full" title="วันเริ่มงาน (ใช้คิดอายุงาน / สิทธิ์ลาพักผ่อน)">
              <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                <Text style={{ fontSize: 13 }}>
                  ดึงวันบรรจุของทุกคนจากโปรแกรมเดิม — ข้าราชการอายุงานครบ 10 ปีสะสมลาพักผ่อนได้ 20 วัน ไม่ถึง 10 ปีได้ 10 วัน
                </Text>
                <Checkbox checked={fillHire} onChange={e => setFillHire(e.target.checked)}>
                  เติมวันเริ่มงานในทะเบียนบุคลากรที่ยังว่าง (ไม่เขียนทับค่าที่มีอยู่)
                </Checkbox>
                <Space wrap>
                  <Button icon={<ExperimentOutlined />} disabled={disabled} onClick={() => start('SERVICE_DATES', 'DRY_RUN')}>ทดลอง</Button>
                  <Popconfirm
                    title="บันทึกวันเริ่มงานจากโปรแกรมเดิม"
                    description={fillHire ? 'และเติมวันเริ่มงานในทะเบียนที่ยังว่าง' : 'ไม่แตะทะเบียนบุคลากร'}
                    okText="บันทึก" cancelText="ปิด" onConfirm={() => start('SERVICE_DATES', 'COMMIT')} disabled={disabled}
                  >
                    <Button type="primary" disabled={disabled}>บันทึก</Button>
                  </Popconfirm>
                </Space>
              </Space>
            </Card>
          </Col>
        </Row>

        <Card style={{ marginTop: 16 }}
          variant="borderless" className="shadow-sm rounded-xl" title="ประวัติการโอน"
          extra={
            <Tooltip title="โหลดใหม่">
              <Button size="small" icon={<ReloadOutlined />} onClick={loadRuns} />
            </Tooltip>
          }
        >
          {busy && <Alert style={{ marginBottom: 12 }} type="info" showIcon title="มีงานกำลังทำอยู่ — รอให้เสร็จก่อนสั่งงานใหม่" />}
          <Table
            rowKey="id" columns={columns} dataSource={runs} loading={loading} size="small"
            pagination={{ pageSize: 10 }} scroll={{ x: 'max-content' }}
          />
        </Card>
      </div>

      <Modal
        open={!!report} onCancel={() => setReport(null)} footer={null} width="min(960px, 95vw)"
        title={report && <span>รายงานงาน #{report.id} · {report.kind === 'LEAVE' ? 'ประวัติการลา' : 'วันเริ่มงาน'} <Tag color={MODE_TAG[report.mode].color}>{MODE_TAG[report.mode].label}</Tag></span>}
      >
        {report && (
          <>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary">{scopeText(report)} · {report.created_by_name ?? '-'} · {fmtTime(report.created_at)}</Text>
              {report.status === 'FAILED' && <Alert style={{ marginTop: 8 }} type="error" showIcon title={report.error} />}
              {report.status === 'DONE' && <div><Text strong>{totalsText(report)}</Text></div>}
            </div>
            <pre
              style={{
                maxHeight: '60vh', overflow: 'auto', fontSize: 12, lineHeight: 1.5, padding: 12, borderRadius: 8, margin: 0,
                background: 'var(--app-surface)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}
            >
              {report.report || 'ไม่มีรายละเอียด'}
            </pre>
          </>
        )}
      </Modal>
    </div>
  )
}

export default function LegacyImportPage() {
  return (
    <AppThemeProvider colorPrimary="#10b981">
      <LegacyImportContent />
    </AppThemeProvider>
  )
}
