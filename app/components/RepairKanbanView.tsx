'use client'
// Kanban board แสดงสถานะงานซ่อมแบบอ่านอย่างเดียว — หน้าตาเดียวกับบอร์ดหน้า "จัดการงานซ่อม"
// แต่ไม่มีปุ่มจัดการใด ๆ เหลือเฉพาะปุ่มรายละเอียด ใช้ในหน้าแจ้งซ่อม (/information-technology/maintenance)
import { useEffect, useState } from 'react'
import { Button, Tag, Typography } from 'antd'
import {
  ClockCircleOutlined, UserOutlined, EnvironmentOutlined, BarcodeOutlined,
  ToolOutlined, InfoCircleOutlined, CheckSquareOutlined, CloseCircleOutlined,
} from '@ant-design/icons'

const { Text } = Typography

// แถวข้อมูลดิบจาก API /it/repair-requests — ใช้เฉพาะ field ที่บอร์ดต้องแสดง
export interface RepairKanbanRow {
  it_repair_request_id: number
  equipment_number?: string | null
  brand?: string | null
  location?: string | null
  problem_description: string
  created_at: string
  equipment_type_name?: string
  problem_category_name?: string
  priority_name?: string
  process_status_id: number
  created_by_name?: string
  major_name?: string
  assigned_to_name?: string | null
  estimated_days?: number | null
  estimated_completion_date?: string | null
  technician_priority_name?: string | null
}

interface Extension {
  days: number
  reason: string
  date: string
  by?: string
  prevDueIso?: string
  newDueIso?: string
}

// ── ขั้นตอนออกเอกสาร / ติดตาม PO (อ่านอย่างเดียว — เหมือนบอร์ดหน้า manage) ──
interface WorkStep {
  id: number
  step_code: string
  name_th: string
  sort_order: number
}

// ขั้นตอนติดตาม PO ของพัสดุ (คอลัมน์ po_processing) — รายการคงที่ เช่นเดียวกับหน้า manage
const PO_TRACKING_STEPS: WorkStep[] = [
  { id: 1, step_code: 'pr_approved', name_th: 'อนุมัติ PR แล้ว', sort_order: 1 },
  { id: 2, step_code: 'po_approved', name_th: 'อนุมัติ PO แล้ว', sort_order: 2 },
]

// สถานะ PR จากระบบพัสดุ (ตรวจว่าออกเลข/อนุมัติแล้วหรือยัง)
interface PrStatus {
  found: boolean
  issued: boolean
  requestNo?: string
  approveDate?: string
  poApproveDate?: string
  paidStatusName?: string
}

// ข้อมูลความคืบหน้าออกเอกสาร/ติดตาม PO ต่อคำร้อง — โหลดจาก API
interface PrInfo {
  prStatus?: PrStatus
  prNumber?: string
  prTaskSteps?: number[]
  prTaskNote?: string
}

// ── คอลัมน์ตาม process_status_id (ชุดเดียวกับหน้า manage + เสร็จสิ้น/ยกเลิกต่อท้าย) ──
// คอลัมน์รออนุมัติรวม 2 สถานะ: 6 = รอหัวหน้า IT, 9 = หัวหน้า IT อนุมัติแล้ว รอหัวหน้าภารกิจ
const COLUMNS: { key: string; ids: number[]; title: string; accent: string }[] = [
  { key: 'pending',     ids: [1],    title: 'รอดำเนินการ',                              accent: '#f59e0b' },
  { key: 'in_progress', ids: [2],    title: 'กำลังดำเนินการ',                            accent: '#06b6d4' },
  { key: 'approval',    ids: [6, 9], title: 'รออนุมัติหัวหน้า IT / หัวหน้าภารกิจ',       accent: '#a855f7' },
  { key: 'pr',          ids: [3],    title: 'ออกใบ PR เจ้าหน้าที่ IT',                   accent: '#f97316' },
  { key: 'po',          ids: [7],    title: 'ขั้นตอน PO โดยพัสดุ / เสนอผู้อำนวยการ',     accent: '#0d9488' },
  { key: 'delivery',    ids: [8],    title: 'รอรับของ / รับอะไหล่',                      accent: '#0ea5e9' },
]

const URGENCY_BY_PRIORITY_NAME: Record<string, { color: string; label: string }> = {
  'วิกฤต':   { color: 'error',      label: 'วิกฤต' },
  'ด่วนมาก': { color: 'error',      label: 'ด่วนมาก' },
  'ด่วน':    { color: 'warning',    label: 'ด่วน' },
  'ปานกลาง': { color: 'processing', label: 'ปานกลาง' },
  'ปกติ':    { color: 'default',    label: 'ปกติ' },
}

const PROBLEM_CATEGORY_COLOR: Record<string, string> = {
  'ฮาร์ดแวร์': '#f87171', 'ซอฟต์แวร์': '#60a5fa', 'อุปกรณ์ต่อพ่วง': '#34d399',
  'เครือข่าย': '#fbbf24', 'อื่น ๆ': 'var(--app-text-2)',
}

// จุดสีระดับความเร่งด่วนที่ช่างประเมิน — เขียว → เหลือง → ส้ม → แดง (โทนเดียวกับหน้า manage)
const PRIORITY_DOT: Record<string, string> = {
  'วิกฤต': '#ef4444', 'ด่วนมาก': '#ef4444', 'ด่วน': '#f97316', 'ปานกลาง': '#eab308', 'ปกติ': '#22c55e',
}

// ── Date helpers (พ.ศ.) ──
const fmtDate = (iso: string): string => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear() + 543}`
}

const fmtDateTime = (iso?: string): string | null => {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return `${fmtDate(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} น.`
}

const daysSince = (iso: string): number | null => {
  const from = new Date(iso)
  if (isNaN(from.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - from.getTime()) / 86400000))
}

const daysColor = (days: number): string => {
  if (days <= 3)  return '#22c55e'
  if (days <= 7)  return '#f59e0b'
  if (days <= 14) return '#f97316'
  return '#ef4444'
}

const daysUntil = (iso?: string): number | null => {
  if (!iso) return null
  const due = new Date(iso)
  if (isNaN(due.getTime())) return null
  const t = new Date(); t.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - t.getTime()) / 86400000)
}

const dueStatus = (left: number): { color: string; label: string } => {
  if (left > 1)   return { color: '#22c55e', label: `เหลืออีก ${left} วัน` }
  if (left === 1) return { color: '#f59e0b', label: 'เหลืออีก 1 วัน' }
  if (left === 0) return { color: '#f59e0b', label: 'ครบกำหนดวันนี้' }
  return { color: '#ef4444', label: `เกินกำหนด ${Math.abs(left)} วัน` }
}

// กำหนดเสร็จล่าสุด — ถ้าเคยผลัดสัญญา ใช้กำหนดใหม่ของครั้งล่าสุด (extensions[0])
const effectiveDueIso = (row: RepairKanbanRow, exts: Extension[]): string | undefined => {
  const base = row.estimated_completion_date ?? undefined
  const latest = exts[0]?.newDueIso
  if (!latest) return base
  if (!base) return latest
  return new Date(latest) > new Date(base) ? latest : base
}

// กำหนดเสร็จครั้งแรกที่สัญญาไว้ — กำหนดเดิมของการขอครั้งแรกสุด
const originalDueIso = (row: RepairKanbanRow, exts: Extension[]): string | undefined => {
  const first = exts[exts.length - 1]?.prevDueIso
  return first ?? row.estimated_completion_date ?? undefined
}

// ประวัติผลัดสัญญาต่อท้ายการ์ด — ย่อเหลือรายการล่าสุด กดขยายดูทั้งหมดได้ (กันการ์ดยาว)
const ExtensionHistory = ({ exts }: { exts: Extension[] }) => {
  const [open, setOpen] = useState(false)
  if (exts.length === 0) return null
  const shown = open ? exts : exts.slice(0, 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 6 }}>
      {shown.map((ex, i) => (
        <div key={i} style={{
          fontSize: 10, lineHeight: 1.5, padding: '3px 7px', borderRadius: 6,
          background: '#f59e0b0d', border: '1px dashed #f59e0b2e',
        }}>
          <span style={{ color: '#f59e0b', fontWeight: 700 }}>+{ex.days} วัน</span>
          {ex.newDueIso && <span style={{ color: 'var(--app-text-2)' }}> → กำหนดใหม่ {fmtDate(ex.newDueIso)}</span>}
          <span style={{ color: 'var(--app-text-3)' }}> · {ex.date}</span>
          <div style={{ color: 'var(--app-text-2)' }}>
            {ex.reason}
            {ex.by && <span style={{ color: 'var(--app-text-3)' }}> — {ex.by}</span>}
          </div>
        </div>
      ))}
      {exts.length > 1 && (
        <a
          onClick={() => setOpen(o => !o)}
          style={{ fontSize: 10, color: '#f59e0b', userSelect: 'none' }}
        >
          {open ? '▲ ย่อประวัติผลัดสัญญา' : `▼ ดูประวัติผลัดสัญญาทั้งหมด (${exts.length} ครั้ง)`}
        </a>
      )}
    </div>
  )
}

export default function RepairKanbanView({
  rows,
  onDetail,
}: {
  rows: RepairKanbanRow[]
  onDetail?: (row: RepairKanbanRow) => void
}) {
  // ประวัติผลัดสัญญาต่อคำร้อง — โหลดจาก API เฉพาะงานที่ช่างรับแล้ว
  const [extMap, setExtMap] = useState<Record<number, Extension[]>>({})
  // เช็กลิสต์ขั้นงาน (ออกเอกสาร) + ความคืบหน้า PR/PO ต่อคำร้อง
  const [workSteps, setWorkSteps] = useState<WorkStep[]>([])
  const [prMap, setPrMap] = useState<Record<number, PrInfo>>({})

  // เลือกชุดเช็คลิสต์ตามสถานะ — คอลัมน์ PO ใช้ขั้นตอนติดตาม PO, ที่เหลือใช้ขั้นงานช่าง/IT
  const stepsFor = (statusId: number): WorkStep[] =>
    statusId === 7 ? PO_TRACKING_STEPS : workSteps

  // โหลดนิยามขั้นงานครั้งเดียว — ใช้แสดงเช็คลิสต์บนการ์ดช่วงออกเอกสาร
  useEffect(() => {
    fetch('/api/v1/it/repair-work-steps')
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          setWorkSteps([...json.data].sort((a: WorkStep, b: WorkStep) => a.sort_order - b.sort_order))
        }
      })
      .catch(() => {})
  }, [])

  // โหลดความคืบหน้า/เลข PR/สถานะพัสดุ เฉพาะคอลัมน์ออกใบ PR (3) และ PO (7)
  useEffect(() => {
    const targets = rows.filter(r => r.process_status_id === 3 || r.process_status_id === 7)
    if (targets.length === 0) return
    targets.forEach(r => {
      const id = r.it_repair_request_id
      // ความคืบหน้าล่าสุด → เช็คลิสต์ขั้นงานที่ทำเสร็จ + หมายเหตุ
      fetch(`/api/v1/it/repair-requests/${id}/progress`)
        .then(res => res.json())
        .then(json => {
          if (json.success && Array.isArray(json.data)) {
            const latest = json.data[0]
            setPrMap(prev => ({
              ...prev,
              [id]: {
                ...prev[id],
                prTaskSteps: latest ? latest.completed_steps.map((s: { id: number }) => s.id) : [],
                prTaskNote: latest?.note || undefined,
              },
            }))
          }
        })
        .catch(() => {})
      // เลขที่ใบ PR ที่บันทึกไว้ในฐานข้อมูล
      fetch(`/api/v1/it/repair-requests/${id}/pr`)
        .then(res => res.json())
        .then(json => {
          const d = json?.data
          if (json?.success && d) {
            setPrMap(prev => ({ ...prev, [id]: { ...prev[id], prNumber: d.pr_number || undefined } }))
          }
        })
        .catch(() => {})
      // สถานะ PR จากระบบพัสดุ — เฉพาะคอลัมน์ PO เพื่อแสดงวันที่อนุมัติ
      if (r.process_status_id === 7) {
        fetch(`/api/v1/it/repair-requests/${id}/pr-status`)
          .then(res => res.json())
          .then(json => {
            const d = json?.data
            if (json?.success && d) {
              setPrMap(prev => ({
                ...prev,
                [id]: {
                  ...prev[id],
                  prStatus: {
                    found: !!d.found,
                    issued: !!d.issued,
                    requestNo: d.request_no || undefined,
                    approveDate: d.stock_approve_date || undefined,
                    poApproveDate: d.request_receive_date || undefined,
                    paidStatusName: d.paid_status_name || undefined,
                  },
                },
              }))
            }
          })
          .catch(() => {})
      }
    })
  }, [rows])

  useEffect(() => {
    const targets = rows.filter(r => r.process_status_id !== 1)
    if (targets.length === 0) return
    Promise.all(targets.map(r =>
      fetch(`/api/v1/it/repair-requests/${r.it_repair_request_id}/extensions`)
        .then(res => res.json())
        .then(json => [
          r.it_repair_request_id,
          (json.success && Array.isArray(json.data))
            ? json.data.map((e: {
                extension_days: number; extension_reason: string; requested_at: string
                requested_by_name?: string; previous_estimated_completion_date?: string; new_estimated_completion_date?: string
              }): Extension => ({
                days:       e.extension_days,
                reason:     e.extension_reason,
                date:       fmtDateTime(e.requested_at) ?? '',
                by:         e.requested_by_name || undefined,
                prevDueIso: e.previous_estimated_completion_date || undefined,
                newDueIso:  e.new_estimated_completion_date || undefined,
              }))
            : [],
        ] as const)
        .catch(() => [r.it_repair_request_id, []] as const)
    )).then(entries => {
      setExtMap(Object.fromEntries(entries.filter(([, v]) => v.length > 0)))
    })
  }, [rows])

  // แถบกำหนดเวลาซ่อม — สัญญาแรก / ผลัดสัญญา / กำหนดล่าสุด (เหมือนบอร์ดหน้า manage)
  const renderDue = (row: RepairKanbanRow, exts: Extension[]) => {
    const dueIso = effectiveDueIso(row, exts)
    const left = daysUntil(dueIso)
    if (left === null) return null
    const ds = dueStatus(left)
    const firstIso = originalDueIso(row, exts)
    return (
      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '2px 5px', marginBottom: 6, fontSize: 10,
        padding: '4px 7px', borderRadius: 6, background: ds.color + '14', border: `1px solid ${ds.color}33`,
      }}>
        <ClockCircleOutlined style={{ fontSize: 10, color: ds.color }} />
        {exts.length > 0 && firstIso ? (
          <>
            <span style={{ color: 'var(--app-text-2)' }}>สัญญาแรก {fmtDate(firstIso)}</span>
            <span style={{ color: 'var(--app-text-3)' }}>·</span>
            <span style={{ color: '#f59e0b', fontWeight: 700 }}>ผลัดสัญญา {exts.length} ครั้ง</span>
            <span style={{ color: 'var(--app-text-3)' }}>·</span>
            {dueIso && <span style={{ color: 'var(--app-text)', fontWeight: 600 }}>ล่าสุด {fmtDate(dueIso)}</span>}
          </>
        ) : (
          <>
            {row.estimated_days != null && (
              <>
                <span style={{ color: 'var(--app-text-2)' }}>ขอเวลา {row.estimated_days} วัน</span>
                <span style={{ color: 'var(--app-text-3)' }}>·</span>
              </>
            )}
            {dueIso && <span style={{ color: 'var(--app-text-2)' }}>กำหนดเสร็จ {fmtDate(dueIso)}</span>}
          </>
        )}
        <span style={{ color: 'var(--app-text-3)' }}>·</span>
        <span style={{ color: ds.color, fontWeight: 600 }}>{ds.label}</span>
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <div style={{ display: 'flex', gap: 10, minWidth: 'max-content', alignItems: 'flex-start', padding: '4px 2px 12px' }}>
        {COLUMNS.map(col => {
          const items = rows
            .filter(r => col.ids.includes(r.process_status_id))
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          return (
            <div key={col.key} style={{ width: 252, flexShrink: 0 }}>
              {/* Column header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', borderRadius: 10, marginBottom: 8,
                background: `linear-gradient(135deg, ${col.accent}2e, ${col.accent}0f)`,
                borderLeft: `3px solid ${col.accent}`,
                boxShadow: `inset 0 0 0 1px ${col.accent}26, 0 1px 2px rgba(15,23,42,0.06)`,
              }}>
                <Text style={{ color: col.accent, fontSize: 12, fontWeight: 800 }}>{col.title}</Text>
                <span style={{
                  background: col.accent, color: '#fff',
                  borderRadius: 10, padding: '1px 9px', fontSize: 11, fontWeight: 700,
                  boxShadow: `0 2px 6px ${col.accent}55`,
                }}>{items.length}</span>
              </div>
              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minHeight: 80 }}>
                {items.length === 0 && (
                  <div style={{
                    textAlign: 'center', color: 'var(--app-text-3)', padding: '24px 0',
                    border: '1px dashed var(--app-border-strong)', borderRadius: 8, fontSize: 11,
                  }}>ไม่มีงาน</div>
                )}
                {items.map(r => {
                  const days = ![5, 10].includes(r.process_status_id) ? daysSince(r.created_at) : null
                  const urgency = URGENCY_BY_PRIORITY_NAME[r.priority_name ?? ''] ?? { color: 'default', label: r.priority_name ?? '-' }
                  const catColor = PROBLEM_CATEGORY_COLOR[r.problem_category_name ?? ''] ?? 'var(--app-text-2)'
                  const exts = extMap[r.it_repair_request_id] ?? []
                  const info: PrInfo = prMap[r.it_repair_request_id] ?? {}
                  return (
                    <div key={r.it_repair_request_id}
                      onClick={() => onDetail?.(r)}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 6px 16px ${col.accent}40`; e.currentTarget.style.transform = 'translateY(-2px)' }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)'; e.currentTarget.style.transform = 'none' }}
                      style={{
                        background: 'var(--app-surface)',
                        border: '1px solid var(--app-border)',
                        borderLeft: `3px solid ${col.accent}`,
                        borderRadius: 8, padding: '10px 11px',
                        cursor: 'pointer', transition: 'box-shadow .18s, transform .18s',
                        boxShadow: '0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)',
                      }}>
                      {/* Row 1: id + days + urgency */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 4 }}>
                        <code style={{ color: '#8b5cf6', fontSize: 10, fontWeight: 700 }}>
                          IT-{String(r.it_repair_request_id).padStart(4, '0')}
                        </code>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {days !== null && (
                            <span style={{ fontSize: 10, color: daysColor(days), whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                              <ClockCircleOutlined style={{ fontSize: 9 }} />{days} วัน
                            </span>
                          )}
                          <Tag color={urgency.color} style={{ margin: 0, fontSize: 10, padding: '0 5px', lineHeight: '16px' }}>
                            {urgency.label}
                          </Tag>
                        </div>
                      </div>
                      {/* Row 2: brand + type */}
                      <div style={{ color: 'var(--app-text)', fontWeight: 600, fontSize: 12, marginBottom: 2, lineHeight: 1.4 }}>
                        {r.brand || r.equipment_type_name}
                        {r.equipment_type_name && r.brand && (
                          <span style={{ color: 'var(--app-text-3)', fontSize: 10, fontWeight: 400 }}> · {r.equipment_type_name}</span>
                        )}
                      </div>
                      {/* Row 3: asset no */}
                      {r.equipment_number && (
                        <div style={{ color: '#fb923c', fontSize: 10, fontFamily: 'monospace', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <BarcodeOutlined style={{ fontSize: 10 }} />{r.equipment_number}
                        </div>
                      )}
                      {/* Row 4: location */}
                      {r.location && (
                        <div style={{ color: 'var(--app-text-2)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                          <EnvironmentOutlined style={{ fontSize: 10 }} />{r.location}
                        </div>
                      )}
                      {/* Row 5: requester + dept */}
                      {r.created_by_name && (
                        <div style={{ color: 'var(--app-text)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1 }}>
                          <UserOutlined style={{ fontSize: 10 }} />{r.created_by_name}
                        </div>
                      )}
                      {r.major_name && (
                        <div style={{ color: 'var(--app-text-3)', fontSize: 10, marginLeft: 14, marginBottom: 5 }}>{r.major_name}</div>
                      )}
                      {/* วันเวลาที่ส่งคำขอ */}
                      {fmtDateTime(r.created_at) && (
                        <div style={{ color: 'var(--app-text-3)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
                          <ClockCircleOutlined style={{ fontSize: 10 }} />
                          <span>ส่งคำขอ {fmtDateTime(r.created_at)}</span>
                        </div>
                      )}
                      {/* Row 6: category */}
                      {r.problem_category_name && (
                        <div style={{ marginBottom: 4 }}>
                          <Tag style={{
                            margin: 0, fontSize: 10, padding: '0 5px', lineHeight: '16px',
                            color: catColor, borderColor: catColor + '55', background: 'transparent',
                          }}>
                            {r.problem_category_name}
                          </Tag>
                        </div>
                      )}
                      {/* Row 7: symptom */}
                      <div style={{ color: 'var(--app-text-2)', fontSize: 10, marginBottom: 5, lineHeight: 1.45, fontStyle: 'italic' }}>
                        “{r.problem_description.length > 60 ? r.problem_description.slice(0, 60) + '…' : r.problem_description}”
                      </div>
                      {/* เส้นคั่น — แยกข้อมูลคำร้องออกจากส่วนงานของช่าง (ลำดับเดียวกับหน้า manage) */}
                      {r.assigned_to_name && (
                        <>
                          <div style={{ borderTop: '1px dashed var(--app-border-strong)', margin: '6px 0 7px' }} />
                          <div style={{ color: '#10b981', fontSize: 10, fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <ToolOutlined style={{ fontSize: 9 }} />{r.assigned_to_name}
                          </div>
                        </>
                      )}
                      {/* ความเร่งด่วนที่ช่างประเมิน */}
                      {r.technician_priority_name && (() => {
                        const dot = PRIORITY_DOT[r.technician_priority_name] ?? 'var(--app-text-2)'
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, fontSize: 10 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, boxShadow: `0 0 5px ${dot}99`, flexShrink: 0 }} />
                            <span style={{ color: 'var(--app-text-3)' }}>ช่างประเมิน:</span>
                            <span style={{ color: 'var(--app-text)', fontWeight: 600 }}>{r.technician_priority_name}</span>
                          </div>
                        )
                      })()}
                      {/* กำหนดเวลาซ่อม + ผลัดสัญญา (เฉพาะงานที่กำลังซ่อม) */}
                      {r.process_status_id === 2 && renderDue(r, exts)}
                      {/* ประวัติผลัดสัญญา — ต่อท้ายการ์ด */}
                      <ExtensionHistory exts={exts} />
                      {/* เลขที่ใบ PR บนหัวการ์ด — รวมคอลัมน์ PO ด้วย (ใช้เลขที่บันทึกไว้ หรือ request_no จากพัสดุ) */}
                      {(() => {
                        const prNo = info.prNumber ?? (r.process_status_id === 7 ? info.prStatus?.requestNo : undefined)
                        if (!prNo) return null
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--app-text-3)', fontSize: 10 }}>เลขที่ PR</span>
                            <code style={{ color: '#ea580c', fontSize: 10, background: 'rgba(249,115,22,0.14)', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                              {prNo}
                            </code>
                          </div>
                        )
                      })()}
                      {/* ความคืบหน้างาน (ออกเอกสาร / ขั้นตอน PO) — เช็คลิสต์อ่านอย่างเดียว เหมือนหน้า manage */}
                      {(r.process_status_id === 3 || r.process_status_id === 7) && ((info.prTaskSteps && info.prTaskSteps.length > 0) || info.prTaskNote || (r.process_status_id === 7 && (info.prStatus?.found || info.prStatus?.issued))) && (() => {
                        const cardSteps = stepsFor(r.process_status_id)
                        const sel = info.prTaskSteps ?? []
                        const isPo = r.process_status_id === 7
                        const accent = isPo ? '#0d9488' : '#f97316'
                        // PO นับจากสถานะพัสดุเท่านั้น: issued → 'อนุมัติ PR แล้ว', request_receive_date → 'อนุมัติ PO แล้ว'
                        let done: Set<number>
                        if (isPo) {
                          const ps = info.prStatus
                          done = new Set<number>()
                          cardSteps.forEach(s => {
                            if (s.step_code === 'pr_approved' && (ps?.issued || ps?.poApproveDate)) done.add(s.id)
                            if (s.step_code === 'po_approved' && ps?.poApproveDate) done.add(s.id)
                          })
                        } else {
                          done = new Set(sel)
                        }
                        return (
                          <div style={{
                            marginBottom: 6, fontSize: 10,
                            padding: '5px 7px', borderRadius: 6, background: `${accent}14`, border: `1px solid ${accent}33`,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                              <ToolOutlined style={{ fontSize: 10, color: accent }} />
                              <span style={{ color: 'var(--app-text-2)' }}>
                                ความคืบหน้างาน{' '}
                                <span style={{ color: accent, fontWeight: 700 }}>{done.size}/{cardSteps.length} ขั้น</span>
                              </span>
                            </div>
                            {cardSteps.map(s => {
                              const checked = done.has(s.id)
                              // ไม่มีข้อมูลยืนยันการอนุมัติ (found:false หรือ pr-status โหลดไม่ได้) → ขึ้นกากบาท
                              const notFound = isPo && (s.step_code === 'pr_approved' || s.step_code === 'po_approved') && !info.prStatus?.found
                              return (
                                <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 4, lineHeight: 1.5 }}>
                                  {notFound
                                    ? <CloseCircleOutlined style={{ fontSize: 10, marginTop: 1, color: '#ef4444' }} />
                                    : <CheckSquareOutlined style={{ fontSize: 10, marginTop: 1, color: checked ? '#22c55e' : 'var(--app-text-3)' }} />}
                                  <span style={{ color: notFound ? 'var(--app-text-2)' : (checked ? 'var(--app-text)' : 'var(--app-text-3)') }}>
                                    {s.name_th}
                                    {notFound && <span style={{ color: '#ef4444', marginLeft: 4 }}>· ไม่พบข้อมูล</span>}
                                    {isPo && s.step_code === 'pr_approved' && (() => {
                                      const prNo = info.prNumber ?? info.prStatus?.requestNo
                                      return (
                                        <>
                                          {prNo && <span style={{ marginLeft: 4 }}>เลขที่ <code style={{ color: '#fb923c', fontSize: 10 }}>{prNo}</code></span>}
                                          {info.prStatus?.issued && info.prStatus.approveDate && (
                                            <span style={{ color: '#22c55e', marginLeft: 4 }}>· อนุมัติวันที่ {fmtDate(info.prStatus.approveDate)}</span>
                                          )}
                                          {info.prStatus?.found && !info.prStatus.issued && (
                                            <span style={{ color: '#eab308', marginLeft: 4 }}>· รออนุมัติพัสดุ</span>
                                          )}
                                        </>
                                      )
                                    })()}
                                    {isPo && s.step_code === 'po_approved' && info.prStatus?.poApproveDate && (
                                      <>
                                        <span style={{ color: '#22c55e', marginLeft: 4 }}>· อนุมัติ PO วันที่ {fmtDate(info.prStatus.poApproveDate)}</span>
                                        {info.prStatus.paidStatusName && (
                                          <span style={{ color: '#38bdf8', marginLeft: 4 }}>· {info.prStatus.paidStatusName}</span>
                                        )}
                                      </>
                                    )}
                                  </span>
                                </div>
                              )
                            })}
                            {info.prTaskNote && (
                              <div style={{ marginTop: 4, paddingTop: 4, borderTop: `1px dashed ${accent}33`, color: 'var(--app-text-2)', lineHeight: 1.5 }}>
                                <span style={{ color: 'var(--app-text-3)' }}>หมายเหตุ: </span>{info.prTaskNote}
                              </div>
                            )}
                          </div>
                        )
                      })()}
                      {/* Badge สถานะย่อย — แยกให้เห็นว่างานค้างอยู่ขั้นไหน */}
                      {r.process_status_id === 3 && !info.prNumber && (
                        <Tag color="orange" style={{ fontSize: 10, marginBottom: 6 }}>อยู่ขั้นออกใบ PR — รออะไหล่</Tag>
                      )}
                      {r.process_status_id === 6 && (
                        <Tag color="purple" style={{ fontSize: 10, marginBottom: 6 }}>รอหัวหน้า IT</Tag>
                      )}
                      {r.process_status_id === 9 && (
                        <Tag color="magenta" style={{ fontSize: 10, marginBottom: 6 }}>หัวหน้า IT อนุมัติแล้ว — รอหัวหน้าภารกิจ</Tag>
                      )}
                      {r.process_status_id === 11 && (
                        <Tag color="cyan" style={{ fontSize: 10, marginBottom: 6 }}>อนุมัติซื้อทดแทนแล้ว</Tag>
                      )}
                      {/* สิทธิ์ดูอย่างเดียว — ไม่มีปุ่มจัดการ มีแค่ดูรายละเอียด */}
                      <Button size="small" block icon={<InfoCircleOutlined />}
                        style={{ fontSize: 11, marginTop: 4 }}
                        onClick={(e) => { e.stopPropagation(); onDetail?.(r) }}>
                        รายละเอียด
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
