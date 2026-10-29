// ข่าว / เอกสาร / ป๊อปอัปของงานทรัพยากรบุคคล — ใช้ร่วมกันระหว่างหน้าอ่าน (/hr/leave) และหน้าจัดการ (/hr/leave/posts)
import React from 'react'
import {
  FilePdfOutlined, FileWordOutlined, FileExcelOutlined, FileImageOutlined, FilePptOutlined, FileOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import 'dayjs/locale/th'

dayjs.extend(buddhistEra)

export type HrPostKind = 'news' | 'document' | 'popup'

export interface HrPost {
  id: number
  kind: HrPostKind
  title: string
  body: string | null
  category: string | null
  link_url: string | null
  original_name: string | null
  file_size: number | null
  has_file: boolean
  is_pinned: boolean
  is_published: boolean
  show_from: string | null
  show_until: string | null
  created_at: string
  updated_at: string
  updated_by_name: string | null
}

export const KIND_LABEL: Record<HrPostKind, string> = { news: 'ข่าวประชาสัมพันธ์สำหรับเจ้าหน้าที่', document: 'เอกสาร / ระเบียบ', popup: 'ป๊อปอัปประกาศ' }
export const DEFAULT_CATEGORIES = ['ระเบียบการลา', 'แบบฟอร์ม', 'หนังสือเวียน', 'คู่มือ / แนวปฏิบัติ']
export const NO_CATEGORY = 'ทั่วไป'

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })

export const fmtDay = (d: string) => dayjs(d).locale('th').format('D MMM BBBB')

export const fmtSize = (n: number | null) =>
  n == null ? '' : n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`

export const fileIcon = (name: string | null) => {
  const ext = name?.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return <FilePdfOutlined style={{ color: '#ef4444' }} />
  if (ext === 'doc' || ext === 'docx') return <FileWordOutlined style={{ color: '#3b82f6' }} />
  if (ext === 'xls' || ext === 'xlsx') return <FileExcelOutlined style={{ color: '#10b981' }} />
  if (ext === 'ppt' || ext === 'pptx') return <FilePptOutlined style={{ color: '#f97316' }} />
  if (['jpg', 'jpeg', 'png'].includes(ext)) return <FileImageOutlined style={{ color: '#8b5cf6' }} />
  return <FileOutlined />
}

export const fileUrl = (id: number) => `/api/v1/hr-posts/${id}/file`
export const isImage = (name: string | null) => /\.(jpe?g|png)$/i.test(name ?? '')

/** หมวดมาตรฐานขึ้นก่อนตามลำดับ ที่เหลือเรียงตามชื่อ */
export const categoryRank = (a: string, b: string) => {
  const rank = (c: string) => { const i = DEFAULT_CATEGORIES.indexOf(c); return i < 0 ? 99 : i }
  return rank(a) - rank(b) || a.localeCompare(b, 'th')
}

/** ช่วงแสดงป๊อปอัป + สถานะเทียบกับวันนี้ (YYYY-MM-DD) */
export const popupPeriod = (p: HrPost, today: string) => {
  const text = p.show_from || p.show_until
    ? `${p.show_from ? fmtDay(p.show_from) : 'ตั้งแต่ตอนนี้'} – ${p.show_until ? fmtDay(p.show_until) : 'ไม่กำหนดวันสิ้นสุด'}`
    : 'แสดงตลอด'
  const state = !p.is_published ? null
    : p.show_from && p.show_from > today ? { color: 'blue', label: 'ยังไม่ถึงวันแสดง' }
    : p.show_until && p.show_until < today ? { color: 'default', label: 'หมดช่วงแสดง' }
    : { color: 'green', label: 'กำลังแสดง' }
  return { text, state }
}
