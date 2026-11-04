'use client'
// ตรวจ / ปรับสายอนุมัติของใบลาใบเดียวตามผังปัจจุบัน — เฉพาะ ADMIN (backend ตรวจสิทธิ์)
// ใช้ร่วมกันระหว่างหน้าปรับสายอนุมัติตามผัง และรายละเอียดใบลาในประวัติการลาเจ้าหน้าที่
import { useEffect, useState } from 'react'
import { Alert, App, Input, Modal, Skeleton, Space, Typography } from 'antd'

const { Text } = Typography

export interface ChainStep {
  step: number; level: string; level_name: string; approver_id: number; approver_name: string; unit_name: string | null; is_acting: boolean
}
interface Preview {
  id: number; owner_name: string; chain: ChainStep[]; chart: ChainStep[]; changes: string[]
  blocked: string | null; rewrites_real_clicks: boolean; in_sync: boolean; log_ready: boolean
}

const lvNo = (id: number) => `LV-${String(id).padStart(6, '0')}`

export const ChainList = ({ steps, other }: { steps: ChainStep[]; other?: ChainStep[] }) => {
  if (!steps.length) return <Text type="secondary">—</Text>
  return (
    <div style={{ fontSize: 12, lineHeight: 1.6 }}>
      {steps.map(s => {
        // คนที่ไม่อยู่ในอีกฝั่ง = ส่วนที่เปลี่ยน เน้นให้เห็นทันที
        const changed = other && !other.some(o => Number(o.approver_id) === Number(s.approver_id) && o.level === s.level)
        return (
          <div key={`${s.step}-${s.level}`}>
            <Text type="secondary" style={{ fontSize: 11 }}>{s.step}. {s.level_name}</Text>{' '}
            <Text strong={!!changed} style={{ fontSize: 12, color: changed ? 'var(--ant-color-primary)' : undefined }}>
              {s.approver_name}{s.is_acting ? ' (รก.)' : ''}
            </Text>
          </div>
        )
      })}
    </div>
  )
}

export default function ChainResyncModal({ requestId, onClose, onDone }: {
  requestId: number | null
  onClose: () => void
  onDone: () => void
}) {
  const { message } = App.useApp()
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    if (requestId == null) return
    let alive = true
    fetch(`/api/v1/hr/leave-chain-resync/${requestId}`)
      .then(r => r.json())
      .then(j => {
        if (!alive) return
        if (j?.success) setPreview(j.data); else setError(j?.message ?? 'ตรวจสายอนุมัติไม่สำเร็จ')
      })
      .catch(() => { if (alive) setError('ตรวจสายอนุมัติไม่สำเร็จ') })
    return () => {
      alive = false
      setPreview(null)
      setError(null)
      setNote('')
    }
  }, [requestId])

  const canApply = !!preview && !preview.in_sync && !preview.blocked && preview.log_ready

  const apply = async () => {
    setApplying(true)
    try {
      const j = await fetch(`/api/v1/hr/leave-chain-resync/${requestId}/apply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note.trim() || undefined }),
      }).then(r => r.json())
      if (!j?.success) { message.error(j?.message ?? 'ปรับสายอนุมัติไม่สำเร็จ'); return }
      message.success(`ปรับสายอนุมัติ ${lvNo(Number(requestId))} แล้ว`)
      onDone()
    } catch {
      message.error('ปรับสายอนุมัติไม่สำเร็จ')
    } finally {
      setApplying(false)
    }
  }

  return (
    <Modal
      open={requestId != null}
      title={requestId != null ? `ปรับสายอนุมัติตามผัง — ${lvNo(requestId)}${preview ? ` ${preview.owner_name}` : ''}` : ''}
      width={640}
      okText="ยืนยันปรับใบนี้" cancelText="ปิด"
      okButtonProps={{ disabled: !canApply, danger: !!preview?.rewrites_real_clicks }}
      confirmLoading={applying}
      onOk={apply}
      onCancel={onClose}
      destroyOnHidden
    >
      {error ? <Alert type="error" showIcon title={error} />
        : !preview ? <Skeleton active paragraph={{ rows: 4 }} />
        : (
          <Space orientation="vertical" size={12} style={{ width: '100%' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Text strong style={{ fontSize: 13 }}>สายปัจจุบันของใบ</Text>
                <ChainList steps={preview.chain} other={preview.chart} />
              </div>
              <div>
                <Text strong style={{ fontSize: 13 }}>สายตามผังปัจจุบัน</Text>
                <ChainList steps={preview.chart} other={preview.chain} />
              </div>
            </div>

            {preview.in_sync ? (
              <Alert type="success" showIcon title="ใบนี้ตรงผังปัจจุบันแล้ว ไม่ต้องปรับ" />
            ) : preview.blocked ? (
              <Alert type="error" showIcon title={preview.blocked} />
            ) : (
              <>
                <div>
                  <Text strong style={{ fontSize: 13 }}>สิ่งที่จะเปลี่ยน</Text>
                  <div style={{ fontSize: 12, lineHeight: 1.6 }}>{preview.changes.map(c => <div key={c}>• {c}</div>)}</div>
                </div>
                {preview.rewrites_real_clicks && (
                  <Alert type="error" showIcon title="ใบนี้สร้างในระบบใหม่ การปรับจะแก้การกดอนุมัติจริงของผู้อนุมัติ" />
                )}
                {!preview.log_ready && (
                  <Alert type="error" showIcon title="ยังไม่ได้สร้างตารางประวัติ — รัน src/db/hr_leave_chain_resync.sql ก่อนจึงจะปรับได้" />
                )}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ใบเก่าอาจถูกต้องตามผังในวันที่ลา ตรวจก่อนยืนยัน · ไม่เปลี่ยนสถานะใบลาและยอดวันลา · ค่าเดิมเก็บในประวัติการปรับ
                </Text>
                <Input.TextArea
                  value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={500}
                  placeholder="หมายเหตุ เช่น เหตุผลที่ปรับ (ไม่บังคับ)"
                />
              </>
            )}
          </Space>
        )}
    </Modal>
  )
}
