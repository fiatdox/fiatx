'use client'
import { useEffect, useMemo, useState } from 'react'
import { Modal, Table, Select, Tag, Alert, App, Typography } from 'antd'

const { Text } = Typography

// ADMIN: ผูกเจ้าหน้าที่ในรายชื่อบันทึกกิจกรรมกับบัญชีผู้ใช้
// ระบบแจ้งซ่อมใช้บัญชีนี้หาว่าผู้กดรับงาน/อนุมัติคือใคร แล้วลงกิจกรรมให้อัตโนมัติ (ไม่ผูก = ไม่ลง)

interface StaffLink {
  staff_id: number
  staff_code: string | null
  full_name_th: string
  role_th: string | null
  is_active: string
  user_id: number | null
  user_name: string | null
}
interface UserRow { id: number; pname?: string; fname?: string; lname?: string; position_name?: string; is_active?: string }

export default function StaffLinkModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { message } = App.useApp()
  const [rows, setRows] = useState<StaffLink[]>([])
  const [users, setUsers] = useState<{ value: number; label: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    let alive = true
    void Promise.resolve().then(() => { if (alive) setLoading(true) })
    Promise.all([
      fetch('/api/v1/it/activity/staff-links').then(r => r.json()),
      fetch('/api/v1/users').then(r => r.json()),
    ])
      .then(([links, us]) => {
        if (!alive) return
        if (links?.success) setRows(links.data)
        else message.error(links?.error?.message || links?.message || 'โหลดรายชื่อไม่สำเร็จ')
        if (us?.success && Array.isArray(us.data)) {
          setUsers((us.data as UserRow[])
            .filter(u => u.is_active !== 'N')
            .map(u => ({
              value: Number(u.id),
              label: `${u.pname ?? ''}${u.fname ?? ''} ${u.lname ?? ''}`.trim() + (u.position_name ? ` · ${u.position_name}` : ''),
            })))
        }
      })
      .catch(() => { if (alive) message.error('โหลดรายชื่อไม่สำเร็จ') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [open, message])

  const usedBy = useMemo(() => new Map(rows.filter(r => r.user_id).map(r => [r.user_id as number, r.staff_id])), [rows])

  const save = async (row: StaffLink, userId: number | null) => {
    setSaving(row.staff_id)
    try {
      const res = await fetch(`/api/v1/it/activity/staff/${row.staff_id}/user`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      const json = await res.json()
      if (!json?.success) {
        message.error(json?.error?.message || json?.message || 'บันทึกไม่สำเร็จ')
        return
      }
      const label = users.find(u => u.value === userId)?.label.split(' · ')[0] ?? null
      setRows(prev => prev.map(r => r.staff_id === row.staff_id ? { ...r, user_id: userId, user_name: userId ? label : null } : r))
      message.success(userId ? 'ผูกบัญชีเรียบร้อย' : 'ยกเลิกการผูกบัญชีแล้ว')
    } catch {
      message.error('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(null)
    }
  }

  const unlinked = rows.filter(r => r.is_active === 'Y' && !r.user_id).length

  return (
    <Modal title="ผูกเจ้าหน้าที่กับบัญชีผู้ใช้" open={open} onCancel={onClose} footer={null} width={760} destroyOnHidden>
      <Alert
        type="info"
        showIcon
        className="mb-4"
        title="ใช้ลงกิจกรรมอัตโนมัติจากระบบแจ้งซ่อม"
        description="เมื่อบัญชีที่ผูกไว้กดรับงาน ประเมิน อัพเดทความคืบหน้า ปิดงาน อนุมัติ หรือบันทึกใบ PR ระบบจะเพิ่มกิจกรรมให้เจ้าหน้าที่คนนั้น · ไม่ผูก = ไม่ลงกิจกรรม"
      />
      {unlinked > 0 && <Alert type="warning" showIcon className="mb-4" title={`ยังไม่ได้ผูกบัญชี ${unlinked} คน`} />}
      <Table<StaffLink>
        rowKey="staff_id"
        size="small"
        loading={loading}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 'max-content' }}
        columns={[
          {
            title: 'เจ้าหน้าที่',
            key: 'staff',
            render: (_, r) => (
              <div>
                <Text>{r.full_name_th}</Text>
                {r.is_active !== 'Y' && <Tag className="ml-2">ไม่ใช้งาน</Tag>}
                <div className="text-xs text-app-text-2">{[r.staff_code, r.role_th].filter(Boolean).join(' · ')}</div>
              </div>
            ),
          },
          {
            title: 'บัญชีผู้ใช้',
            key: 'user',
            width: 340,
            render: (_, r) => (
              <Select
                style={{ width: 320 }}
                placeholder="เลือกบัญชีผู้ใช้"
                allowClear
                showSearch
                optionFilterProp="label"
                loading={saving === r.staff_id}
                disabled={saving != null}
                value={r.user_id ?? undefined}
                // ถ้ายังโหลดรายชื่อผู้ใช้ไม่ได้ ให้เห็นชื่อที่ผูกอยู่เดิม
                options={users.length ? users.map(u => ({ ...u, disabled: usedBy.has(u.value) && usedBy.get(u.value) !== r.staff_id }))
                  : r.user_id ? [{ value: r.user_id, label: r.user_name ?? `#${r.user_id}`, disabled: false }] : []}
                onChange={(v: number | undefined) => save(r, v ?? null)}
              />
            ),
          },
        ]}
      />
    </Modal>
  )
}
