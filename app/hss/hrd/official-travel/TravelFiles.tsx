'use client'
// ไฟล์แนบของคำขอไปราชการ — หนังสือต้นเรื่อง (ทุกคำขอ) · อนุมัติเดินทางโดยเครื่องบิน · ขออนุมัติใช้รถยนต์ส่วนตัว
// backend: /api/v1/hrd/travel/requests/:id/files (ผ่าน /api/v1/hrd/travel-files/:id[/:fileId])
import React, { useState } from 'react'
import { Alert, App, Button, Popconfirm, Typography, Upload } from 'antd'
import type { UploadFile } from 'antd'
import { DeleteOutlined, FileImageOutlined, FilePdfOutlined, PaperClipOutlined, UploadOutlined } from '@ant-design/icons'
import type { CostMode, VehicleMode } from './travelCalc'

const { Text } = Typography

export type FileKind = 'source' | 'plane' | 'private_car' | 'vehicle_use' | 'receipt'
export interface TravelFile { id: number; kind: FileKind; original_name: string; mime: string; size_bytes: number; uploaded_at: string; uploaded_by_name: string | null }
export const FILE_KIND_LABEL: Record<FileKind, string> = {
  source: 'หนังสือต้นเรื่อง',
  plane: 'หนังสืออนุมัติเดินทางโดยเครื่องบิน',
  private_car: 'หนังสือขออนุมัติใช้รถยนต์ส่วนตัว',
  vehicle_use: 'หนังสือขออนุมัติใช้รถ',
  receipt: 'ใบเสร็จ/หลักฐานการเบิก',
}
export const FILE_KIND_HINT: Record<FileKind, string> = {
  source: 'หนังสือเชิญ / คำสั่ง / หนังสือที่เป็นเหตุให้ไปราชการ',
  plane: 'ผู้มีอำนาจอนุมัติให้เดินทางโดยเครื่องบิน',
  private_car: 'ผู้มีอำนาจอนุมัติให้ใช้รถยนต์ส่วนตัวเดินทาง',
  vehicle_use: 'แบบขออนุญาตใช้รถราชการ',
  receipt: 'ใบเสร็จค่าที่พัก ค่าลงทะเบียน ค่าทางด่วน ค่าโดยสาร ฯลฯ (ตอนเบิกจ่ายจริง)',
}
export const FILE_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/*'
export const FILE_MAX_MB = 10
export const FILE_MAX_PER_KIND = 5

/** ประเภทไฟล์ที่ต้องแนบ: หนังสือต้นเรื่อง (เฉพาะแบบเบิก) · เครื่องบิน · รถส่วนตัว · ขออนุมัติใช้รถราชการ — ตรงกับ backend missing_files */
export const requiredKinds = (mode?: VehicleMode | null, costMode?: CostMode | null, vehicleRequest?: boolean | null): FileKind[] => [
  ...(costMode === 'no_claim' ? [] : ['source' as const]),
  ...(mode === 'plane' ? ['plane' as const] : []), ...(mode === 'private' ? ['private_car' as const] : []),
  ...(mode === 'gov_car' && vehicleRequest ? ['vehicle_use' as const] : []),
]

export const fileUrl = (requestId: number, fileId: number) => `/api/v1/hrd/travel-files/${requestId}/${fileId}`
const sizeText = (b: number) => b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`

/** ตรวจก่อนแนบ (ซ้ำกับ backend) — คืนข้อความผิดพลาด หรือ null */
export const checkFile = (f: File): string | null => {
  const ext = f.name.includes('.') ? f.name.split('.').pop()!.toLowerCase() : ''
  const okType = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext) || f.type === 'application/pdf' || f.type.startsWith('image/')
  if (!okType) return `${f.name}: ต้องเป็น PDF หรือรูปภาพ`
  if (f.size > FILE_MAX_MB * 1024 * 1024) return `${f.name}: ขนาดเกิน ${FILE_MAX_MB}MB`
  return null
}

export async function uploadTravelFile(requestId: number, kind: FileKind, file: File) {
  const fd = new FormData()
  fd.append('kind', kind)
  fd.append('file', file)
  const res = await fetch(`/api/v1/hrd/travel-files/${requestId}`, { method: 'POST', body: fd })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || j.success === false) throw new Error(j.message ?? `แนบ ${file.name} ไม่สำเร็จ`)
}
export async function deleteTravelFile(requestId: number, fileId: number) {
  const res = await fetch(fileUrl(requestId, fileId), { method: 'DELETE' })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || j.success === false) throw new Error(j.message ?? 'ลบไฟล์ไม่สำเร็จ')
}

export const FileLink = ({ requestId, f }: { requestId: number; f: TravelFile }) => (
  <a href={fileUrl(requestId, f.id)} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all' }}>
    {f.mime === 'application/pdf' ? <FilePdfOutlined style={{ marginRight: 6, color: '#dc2626' }} /> : <FileImageOutlined style={{ marginRight: 6, color: '#2563eb' }} />}
    {f.original_name}
  </a>
)

/**
 * รายการไฟล์แนบของคำขอ (แสดงตามประเภท) — editable: แนบเพิ่ม/ลบได้ทันที (ผู้ขอ หรือ ADMIN/HRD ขณะคำขอยังไม่จบ)
 * แสดงประเภทที่ต้องแนบตามพาหนะเสมอ แม้ยังไม่มีไฟล์ · ประเภทอื่นที่มีไฟล์อยู่ก็แสดง
 */
export const RequestFiles = ({ requestId, files, mode, costMode, vehicleRequest, editable, onChanged }: {
  requestId: number; files: TravelFile[]; mode?: VehicleMode | null; costMode?: CostMode | null; vehicleRequest?: boolean | null; editable?: boolean; onChanged?: () => void
}) => {
  const { message } = App.useApp()
  const [busy, setBusy] = useState<string | null>(null)
  const need = requiredKinds(mode, costMode, vehicleRequest)
  const kinds = (['source', 'plane', 'private_car', 'vehicle_use'] as FileKind[]).filter(k => need.includes(k) || files.some(f => f.kind === k))
  const missing = need.filter(k => !files.some(f => f.kind === k))
  const add = async (kind: FileKind, file: File) => {
    const err = checkFile(file)
    if (err) { message.error(err); return }
    setBusy(kind)
    try { await uploadTravelFile(requestId, kind, file); message.success(`แนบ ${file.name} แล้ว`); onChanged?.() }
    catch (e) { message.error((e as Error).message) } finally { setBusy(null) }
  }
  const remove = async (f: TravelFile) => {
    setBusy(`d${f.id}`)
    try { await deleteTravelFile(requestId, f.id); message.success(`ลบ ${f.original_name} แล้ว`); onChanged?.() }
    catch (e) { message.error((e as Error).message) } finally { setBusy(null) }
  }
  return (
    <div data-testid="request-files">
      {missing.length > 0 && <Alert type="warning" showIcon style={{ marginBottom: 8 }} title={`ยังไม่ได้แนบ: ${missing.map(k => FILE_KIND_LABEL[k]).join(', ')}`} />}
      {kinds.map(k => {
        const list = files.filter(f => f.kind === k)
        return (
          <div key={k} style={{ padding: '6px 0', borderBottom: '1px dashed var(--app-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <Text strong style={{ fontSize: 13 }}><PaperClipOutlined /> {FILE_KIND_LABEL[k]}</Text>
              {editable && list.length < FILE_MAX_PER_KIND && (
                <Upload accept={FILE_ACCEPT} showUploadList={false} beforeUpload={f => { add(k, f); return false }}>
                  <Button size="small" icon={<UploadOutlined />} loading={busy === k}>แนบไฟล์</Button>
                </Upload>
              )}
            </div>
            {list.length === 0 ? <Text type="secondary" style={{ fontSize: 12 }}>ยังไม่มีไฟล์</Text> : list.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 2 }}>
                <span style={{ flex: 1, minWidth: 0 }}><FileLink requestId={requestId} f={f} /> <Text type="secondary" style={{ fontSize: 11.5 }}>{sizeText(f.size_bytes)}</Text></span>
                {editable && (
                  <Popconfirm title={`ลบ ${f.original_name}?`} okText="ลบ" okButtonProps={{ danger: true }} cancelText="ไม่ลบ" onConfirm={() => remove(f)}>
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} loading={busy === `d${f.id}`} aria-label={`ลบไฟล์ ${f.original_name}`} />
                  </Popconfirm>
                )}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

/** เลือกไฟล์ไว้ก่อน (ยังไม่อัปโหลด) ใช้ในแบบฟอร์มยื่นคำขอ — อัปโหลดหลังบันทึกคำขอสำเร็จ */
export const PendingFilePicker = ({ kind, value, onChange, existing = 0, error }: {
  kind: FileKind; value: UploadFile[]; onChange: (v: UploadFile[]) => void; existing?: number; error?: string | null
}) => {
  const { message } = App.useApp()
  return (
    <div data-testid={`pick-${kind}`} style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, marginBottom: 4 }}>
        <Text strong>{FILE_KIND_LABEL[kind]}</Text> <Text type="danger">*</Text>
        <Text type="secondary" style={{ fontSize: 12 }}> — {FILE_KIND_HINT[kind]} (PDF/รูป ไม่เกิน {FILE_MAX_MB}MB)</Text>
      </div>
      <Upload accept={FILE_ACCEPT} multiple fileList={value} onRemove={f => onChange(value.filter(x => x.uid !== f.uid))}
        beforeUpload={f => {
          const err = checkFile(f)
          if (err) message.error(err)
          else if (value.length + existing >= FILE_MAX_PER_KIND) message.error(`${FILE_KIND_LABEL[kind]}แนบได้ไม่เกิน ${FILE_MAX_PER_KIND} ไฟล์`)
          else onChange([...value, { uid: f.uid, name: f.name, size: f.size, type: f.type, originFileObj: f, status: 'done' }])
          return Upload.LIST_IGNORE
        }}>
        <Button icon={<UploadOutlined />} danger={!!error}>เลือกไฟล์</Button>
      </Upload>
      {error && <div style={{ color: 'var(--ant-color-error, #dc2626)', fontSize: 12.5, marginTop: 2 }}>{error}</div>}
    </div>
  )
}
