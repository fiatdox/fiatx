'use client'
// Kanban board แสดงสถานะงานซ่อมแบบอ่านอย่างเดียว — หน้าตาเดียวกับบอร์ดหน้า "จัดการงานซ่อม"
// แต่ไม่มีปุ่มจัดการใด ๆ เหลือเฉพาะปุ่มรายละเอียด ใช้ในหน้าแจ้งซ่อม (/information-technology/maintenance)
import { useEffect, useState } from 'react'
import { Button, Tag, Typography } from 'antd'
import {
  ClockCircleOutlined, UserOutlined, EnvironmentOutlined, BarcodeOutlined,
  ToolOutlined, InfoCircleOutlined,
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

// ── คอลัมน์ตาม process_status_id (ชุดเดียวกับหน้า manage + เสร็จสิ้น/ยกเลิกต่อท้าย) ──
// คอลัมน์รออนุมัติรวม 2 สถานะ: 6 = รอหัวหน้า IT, 9 = หัวหน้า IT อนุมัติแล้ว รอหัวหน้าภารกิจ
const COLUMNS: { key: string; ids: number[]; title: string; accent: string }[] = [
  { key: 'pending',     ids: [1],    title: 'รอดำเนินการ',                              accent: '#f59e0b' },
  { key: 'in_progress', ids: [2],    title: 'กำลังดำเนินการ',                            accent: '#06b6d4' },
  { key: 'approval',    ids: [6, 9], title: 'รออนุมัติหัวหน้า IT / หัวหน้าภารกิจ',       accent: '#a855f7' },
  { key: 'replace',     ids: [4, 11], title: 'แนะนำซื้อทดแทน',                           accent: '#f472b6' },
  { key: 'pr',          ids: [3],    title: 'ออกใบ PR เจ้าหน้าที่ IT',                   accent: '#f97316' },
  { key: 'po',          ids: [7],    title: 'ขั้นตอน PO โดยพัสดุ / เสนอผู้อำนวยการ',     accent: '#6366f1' },
  { key: 'delivery',    ids: [8],    title: 'รอรับของ / รับอะไหล่',                      accent: '#0ea5e9' },
  { key: 'completed',   ids: [5],    title: 'เสร็จสิ้น',                                  accent: '#22c55e' },
  { key: 'cancelled',   ids: [10],   title: 'ยกเลิก',                                     accent: '#ef4444' },
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
  'เครือข่าย': '#fbbf24', 'อื่น ๆ': '#94a3b8',
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
          {ex.newDueIso && <span style={{ color: '#94a3b8' }}> → กำหนดใหม่ {fmtDate(ex.newDueIso)}</span>}
          <span style={{ color: '#475569' }}> · {ex.date}</span>
          <div style={{ color: '#94a3b8' }}>
            {ex.reason}
            {ex.by && <span style={{ color: '#64748b' }}> — {ex.by}</span>}
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
            <span style={{ color: '#94a3b8' }}>สัญญาแรก {fmtDate(firstIso)}</span>
            <span style={{ color: '#475569' }}>·</span>
            <span style={{ color: '#f59e0b', fontWeight: 700 }}>ผลัดสัญญา {exts.length} ครั้ง</span>
            <span style={{ color: '#475569' }}>·</span>
            {dueIso && <span style={{ color: '#e2e8f0', fontWeight: 600 }}>ล่าสุด {fmtDate(dueIso)}</span>}
          </>
        ) : (
          <>
            {row.estimated_days != null && (
              <>
                <span style={{ color: '#94a3b8' }}>ขอเวลา {row.estimated_days} วัน</span>
                <span style={{ color: '#475569' }}>·</span>
              </>
            )}
            {dueIso && <span style={{ color: '#94a3b8' }}>กำหนดเสร็จ {fmtDate(dueIso)}</span>}
          </>
        )}
        <span style={{ color: '#475569' }}>·</span>
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
                padding: '7px 12px', borderRadius: 8, marginBottom: 8,
                background: '#0f172a', borderLeft: `3px solid ${col.accent}`,
                boxShadow: `inset 0 0 0 1px ${col.accent}22`,
              }}>
                <Text style={{ color: col.accent, fontSize: 12, fontWeight: 700 }}>{col.title}</Text>
                <span style={{
                  background: col.accent + '22', color: col.accent,
                  borderRadius: 10, padding: '0 8px', fontSize: 11, fontWeight: 700,
                }}>{items.length}</span>
              </div>
              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minHeight: 80 }}>
                {items.length === 0 && (
                  <div style={{
                    textAlign: 'center', color: '#334155', padding: '24px 0',
                    border: '1px dashed #1e3a5f', borderRadius: 8, fontSize: 11,
                  }}>ไม่มีงาน</div>
                )}
                {items.map(r => {
                  const days = ![5, 10].includes(r.process_status_id) ? daysSince(r.created_at) : null
                  const urgency = URGENCY_BY_PRIORITY_NAME[r.priority_name ?? ''] ?? { color: 'default', label: r.priority_name ?? '-' }
                  const catColor = PROBLEM_CATEGORY_COLOR[r.problem_category_name ?? ''] ?? '#94a3b8'
                  const exts = extMap[r.it_repair_request_id] ?? []
                  return (
                    <div key={r.it_repair_request_id}
                      onClick={() => onDetail?.(r)}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = col.accent)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e293b')}
                      style={{
                        background: '#0f172a',
                        border: '1px solid #1e293b',
                        borderLeft: `3px solid ${col.accent}`,
                        borderRadius: 8, padding: '10px 11px',
                        cursor: 'pointer', transition: 'border-color .15s',
                      }}>
                      {/* Row 1: id + days + urgency */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 4 }}>
                        <code style={{ color: '#a78bfa', fontSize: 10, fontWeight: 600 }}>
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
                      <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 12, marginBottom: 2, lineHeight: 1.4 }}>
                        {r.brand || r.equipment_type_name}
                        {r.equipment_type_name && r.brand && (
                          <span style={{ color: '#64748b', fontSize: 10, fontWeight: 400 }}> · {r.equipment_type_name}</span>
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
                        <div style={{ color: '#94a3b8', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                          <EnvironmentOutlined style={{ fontSize: 10 }} />{r.location}
                        </div>
                      )}
                      {/* Row 5: requester + dept */}
                      {r.created_by_name && (
                        <div style={{ color: '#cbd5e1', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1 }}>
                          <UserOutlined style={{ fontSize: 10 }} />{r.created_by_name}
                        </div>
                      )}
                      {r.major_name && (
                        <div style={{ color: '#64748b', fontSize: 10, marginLeft: 14, marginBottom: 5 }}>{r.major_name}</div>
                      )}
                      {/* วันเวลาที่ส่งคำขอ */}
                      {fmtDateTime(r.created_at) && (
                        <div style={{ color: '#64748b', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
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
                      <div style={{ color: '#94a3b8', fontSize: 10, marginBottom: 5, lineHeight: 1.45, fontStyle: 'italic' }}>
                        “{r.problem_description.length > 60 ? r.problem_description.slice(0, 60) + '…' : r.problem_description}”
                      </div>
                      {/* เส้นคั่น — แยกข้อมูลคำร้องออกจากส่วนงานของช่าง (ลำดับเดียวกับหน้า manage) */}
                      {r.assigned_to_name && (
                        <>
                          <div style={{ borderTop: '1px dashed #334155', margin: '6px 0 7px' }} />
                          <div style={{ color: '#6ee7b7', fontSize: 10, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <ToolOutlined style={{ fontSize: 9 }} />{r.assigned_to_name}
                          </div>
                        </>
                      )}
                      {/* ความเร่งด่วนที่ช่างประเมิน */}
                      {r.technician_priority_name && (() => {
                        const dot = PRIORITY_DOT[r.technician_priority_name] ?? '#94a3b8'
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, fontSize: 10 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, boxShadow: `0 0 5px ${dot}99`, flexShrink: 0 }} />
                            <span style={{ color: '#64748b' }}>ช่างประเมิน:</span>
                            <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{r.technician_priority_name}</span>
                          </div>
                        )
                      })()}
                      {/* กำหนดเวลาซ่อม + ผลัดสัญญา (เฉพาะงานที่กำลังซ่อม) */}
                      {r.process_status_id === 2 && renderDue(r, exts)}
                      {/* ประวัติผลัดสัญญา — ต่อท้ายการ์ด */}
                      <ExtensionHistory exts={exts} />
                      {/* Badge สถานะย่อย — แยกให้เห็นว่างานค้างอยู่ขั้นไหน */}
                      {r.process_status_id === 3 && (
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
