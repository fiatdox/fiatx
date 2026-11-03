'use client'
// ไฟล์แนบของใบลาใน Modal — ใช้ร่วมกันระหว่างประวัติการลาของฉัน และประวัติการลาเจ้าหน้าที่ (HR)
// ไฟล์ดึงผ่าน /leave-requests/:id/document (backend ตรวจสิทธิ์ดูใบลา: เจ้าของ / สายอนุมัติ / HR / ADMIN)
import { useState } from 'react'
import { Alert, Button, Empty, Image, Modal, Space, Typography } from 'antd'
import { DownloadOutlined, ExportOutlined, FilePdfOutlined, PaperClipOutlined } from '@ant-design/icons'
import { canInlinePdf } from '@/app/lib/pdfSupport'

const { Text } = Typography

const IMAGE_EXT = ['jpg', 'jpeg', 'jfif', 'png', 'gif', 'webp']
const extOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? ''
export const docUrl = (id: number) => `/api/v1/hr/leave-requests/${id}/document`

export interface AttachmentDoc {
  id: number
  /** ชื่อไฟล์ (document_url) */
  name: string
  /** หัว Modal เช่น ชื่อผู้ลา */
  title?: string
  /** ข้อความรองในหัว Modal เช่น ประเภท · ช่วงวันที่ */
  subtitle?: string
}

/** ตัวอย่างไฟล์ — รูปแสดงพร้อมซูมได้ · PDF ฝังเต็มกรอบ · ชนิดอื่นให้ดาวน์โหลด */
const AttachmentPreview = ({ doc }: { doc: AttachmentDoc }) => {
  const [missing, setMissing] = useState(false)
  const ext = extOf(doc.name)
  if (missing) return <Alert type="warning" showIcon title="ยังไม่มีไฟล์นี้ในเซิร์ฟเวอร์" />
  if (IMAGE_EXT.includes(ext)) {
    return (
      <div className="flex justify-center">
        <Image
          src={docUrl(doc.id)} alt={doc.name} onError={() => setMissing(true)}
          style={{ maxHeight: '72vh', maxWidth: '100%', objectFit: 'contain' }}
        />
      </div>
    )
  }
  if (ext === 'pdf') {
    // Android แสดง PDF ใน iframe ไม่ได้ (ว่างเปล่า) — ให้เปิด/บันทึกไฟล์ไปเปิดด้วยแอป PDF ในเครื่องแทน
    if (!canInlinePdf()) {
      return (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <FilePdfOutlined style={{ fontSize: 48, color: '#dc2626' }} />
          <Text>{doc.name}</Text>
          <Text type="secondary" style={{ fontSize: 13 }}>เครื่องนี้แสดง PDF ในหน้าเว็บไม่ได้ — เปิดด้วยแอปในเครื่องเพื่อดูหรือสั่งพิมพ์</Text>
          <Button type="primary" size="large" icon={<DownloadOutlined />} href={docUrl(doc.id)} download={doc.name}>
            บันทึก / เปิดไฟล์ PDF
          </Button>
        </div>
      )
    }
    return <iframe src={docUrl(doc.id)} title={doc.name} style={{ width: '100%', height: '72vh', border: 0 }} />
  }
  return (
    <Empty
      description={<Text type="secondary">ไฟล์ชนิด .{ext} แสดงตัวอย่างในหน้าไม่ได้ — กด “ดาวน์โหลด” เพื่อเปิดด้วยโปรแกรมในเครื่อง</Text>}
    />
  )
}

export default function AttachmentModal({ doc, onClose }: { doc: AttachmentDoc | null; onClose: () => void }) {
  return (
    <Modal
      title={doc && (
        <span>
          <PaperClipOutlined className="mr-2" />ไฟล์แนบ{doc.title ? ` — ${doc.title}` : ''}
          {doc.subtitle && (
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 400, marginInlineStart: 8 }}>{doc.subtitle}</Text>
          )}
        </span>
      )}
      open={doc != null}
      onCancel={onClose}
      width={960}
      style={{ top: 24 }}
      destroyOnHidden
      footer={doc && (
        <Space wrap style={{ justifyContent: 'flex-end' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>{doc.name}</Text>
          <Button icon={<ExportOutlined />} href={docUrl(doc.id)} target="_blank" rel="noopener">ดาวน์โหลด / เปิดแท็บใหม่</Button>
          <Button type="primary" onClick={onClose}>ปิด</Button>
        </Space>
      )}
    >
      {doc && <AttachmentPreview key={doc.id} doc={doc} />}
    </Modal>
  )
}
