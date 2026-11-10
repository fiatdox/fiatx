'use client'
// ลายเซ็นของผู้ใช้ — วาดบนจอ หรืออัปโหลดรูป (ระบบลบพื้นขาว ครอปขอบ ย่อ แล้วแปลงเป็น PNG พื้นใส)
// ใช้ลงนามเอกสารที่อนุมัติผ่านระบบ เช่น ขออนุมัติเดินทางไปราชการ · เอกสารที่ลงนามแล้วไม่เปลี่ยนตามเมื่อแก้ลายเซ็นภายหลัง
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, App, Button, Empty, Popconfirm, Segmented, Space, Spin, Typography, Upload } from 'antd'
import { ClearOutlined, DeleteOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons'

const { Text } = Typography
const INK = '#0f2a7a'
const OUT_W = 600, OUT_H = 200            // ขนาดสูงสุดของภาพที่เก็บ
const PAD_W = 600, PAD_H = 220            // พื้นที่วาด (พิกัดภายใน)

interface Saved { image: string; width: number; height: number; updated_at: string }

/** ครอปส่วนที่มีหมึก (alpha > 0) + ขอบเล็กน้อย แล้วย่อให้อยู่ใน OUT_W×OUT_H → data URL PNG · ไม่มีหมึกคืน null */
const trimToPng = (src: HTMLCanvasElement): string | null => {
  const ctx = src.getContext('2d')!
  const { width: w, height: h } = src
  const px = ctx.getImageData(0, 0, w, h).data
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (px[(y * w + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  }
  if (x1 < 0) return null
  const pad = 6
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad)
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1
  const scale = Math.min(1, OUT_W / cw, OUT_H / ch)
  // ภาพเล็กมากขยายให้ถึงขั้นต่ำที่ server รับ (40×16)
  const up = Math.max(scale, 40 / cw, 16 / ch)
  const out = document.createElement('canvas')
  out.width = Math.max(40, Math.round(cw * up)); out.height = Math.max(16, Math.round(ch * up))
  out.getContext('2d')!.drawImage(src, x0, y0, cw, ch, 0, 0, out.width, out.height)
  return out.toDataURL('image/png')
}

/** รูปที่อัปโหลด → ลบพื้นสว่าง (ขาว/เทาอ่อนจากการสแกน) ให้ใส แล้วครอป */
const imageToSignature = (file: File): Promise<string | null> => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => {
    try {
      const scale = Math.min(1, 1600 / img.width, 1600 / img.height)
      const c = document.createElement('canvas')
      c.width = Math.max(1, Math.round(img.width * scale)); c.height = Math.max(1, Math.round(img.height * scale))
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0, c.width, c.height)
      const d = ctx.getImageData(0, 0, c.width, c.height)
      for (let i = 0; i < d.data.length; i += 4) {
        const lum = 0.299 * d.data[i] + 0.587 * d.data[i + 1] + 0.114 * d.data[i + 2]
        // สว่างกว่า 200 = พื้น → ใส · ไล่ความใสช่วงขอบเส้นให้เนียน
        d.data[i + 3] = lum > 200 ? 0 : lum > 150 ? Math.round(d.data[i + 3] * (200 - lum) / 50) : d.data[i + 3]
      }
      ctx.putImageData(d, 0, 0)
      resolve(trimToPng(c))
    } catch (e) { reject(e) } finally { URL.revokeObjectURL(url) }
  }
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('เปิดรูปไม่ได้')) }
  img.src = url
})

/** พื้นที่วาดลายเซ็นด้วยเมาส์/นิ้ว/ปากกา */
const DrawPad = ({ onChange }: { onChange: (hasInk: boolean) => void }) => {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawing = useRef<{ x: number; y: number } | null>(null)
  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (PAD_W / r.width), y: (e.clientY - r.top) * (PAD_H / r.height) }
  }
  const down = (e: React.PointerEvent) => { e.preventDefault(); ref.current!.setPointerCapture(e.pointerId); drawing.current = pos(e); move(e) }
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return
    const ctx = ref.current!.getContext('2d')!
    const p = pos(e)
    ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.lineWidth = e.pointerType === 'pen' && e.pressure > 0 ? 1.5 + e.pressure * 3 : 3
    ctx.beginPath(); ctx.moveTo(drawing.current.x, drawing.current.y); ctx.lineTo(p.x + 0.01, p.y); ctx.stroke()
    drawing.current = p
    onChange(true)
  }
  const up = () => { drawing.current = null }
  return (
    <canvas ref={ref} width={PAD_W} height={PAD_H} data-testid="signature-pad" aria-label="พื้นที่วาดลายเซ็น"
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}
      style={{ width: '100%', maxWidth: PAD_W, aspectRatio: `${PAD_W} / ${PAD_H}`, display: 'block', touchAction: 'none', cursor: 'crosshair',
        background: '#fff', border: '1px dashed #94a3b8', borderRadius: 10 }} />
  )
}

/** กล่องแสดงลายเซ็นบนพื้นขาวเสมอ (หมึกน้ำเงิน มองไม่เห็นบนพื้นมืด) */
export const SignaturePreview = ({ src, height = 72 }: { src: string; height?: number }) => (
  <div style={{ background: '#fff', border: '1px solid var(--app-border)', borderRadius: 10, padding: 8, display: 'inline-flex', minWidth: 160, justifyContent: 'center' }}>
    {/* eslint-disable-next-line @next/next/no-img-element -- data URL ภาพเล็ก ไม่ผ่าน next/image */}
    <img src={src} alt="ลายเซ็น" style={{ height, maxWidth: '100%', objectFit: 'contain' }} />
  </div>
)

export default function SignatureSettings() {
  const { message } = App.useApp()
  const [saved, setSaved] = useState<Saved | null | undefined>(undefined)
  const [mode, setMode] = useState<'draw' | 'upload'>('draw')
  const [padKey, setPadKey] = useState(0)
  const [hasInk, setHasInk] = useState(false)
  const [uploaded, setUploaded] = useState<string | null>(null)
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/v1/users/me/signature')
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j.success === false) throw new Error(j.message ?? 'โหลดลายเซ็นไม่สำเร็จ')
      setSaved(j.data ?? null)
    } catch (e) { message.error((e as Error).message); setSaved(null) }
  }, [message])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดข้อมูลจาก API
  useEffect(() => { load() }, [load])

  const save = async () => {
    const image = mode === 'draw'
      ? trimToPng(document.querySelector<HTMLCanvasElement>('[data-testid="signature-pad"]')!)
      : uploaded
    if (!image) { message.warning(mode === 'draw' ? 'วาดลายเซ็นก่อนบันทึก' : 'เลือกรูปลายเซ็นก่อนบันทึก'); return }
    setBusy('save')
    try {
      const r = await fetch('/api/v1/users/me/signature', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j.success === false) throw new Error(j.message ?? 'บันทึกลายเซ็นไม่สำเร็จ')
      message.success('บันทึกลายเซ็นแล้ว')
      setPadKey(k => k + 1); setHasInk(false); setUploaded(null)
      await load()
    } catch (e) { message.error((e as Error).message) } finally { setBusy(null) }
  }
  const remove = async () => {
    setBusy('delete')
    try {
      const r = await fetch('/api/v1/users/me/signature', { method: 'DELETE' })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j.success === false) throw new Error(j.message ?? 'ลบลายเซ็นไม่สำเร็จ')
      message.success('ลบลายเซ็นแล้ว')
      await load()
    } catch (e) { message.error((e as Error).message) } finally { setBusy(null) }
  }
  const pick = async (file: File) => {
    try {
      const img = await imageToSignature(file)
      if (!img) message.warning('ไม่พบเส้นลายเซ็นในรูป — ใช้รูปเซ็นปากกาสีเข้มบนกระดาษขาว')
      setUploaded(img)
    } catch { message.error('เปิดรูปไม่ได้ — ใช้ไฟล์ PNG หรือ JPG') }
    return false
  }

  if (saved === undefined) return <div style={{ padding: 24, textAlign: 'center' }}><Spin /></div>
  return (
    <div style={{ maxWidth: 720 }}>
      <Alert type="info" showIcon style={{ marginBottom: 16 }}
        title="ลายเซ็นใช้ลงนามเอกสารที่อนุมัติผ่านระบบ เช่น ขออนุมัติเดินทางไปราชการ"
        description="ต้องตั้งลายเซ็นก่อนจึงยื่นหรืออนุมัติเอกสารได้ · เอกสารที่ลงนามไปแล้วเก็บลายเซ็น ณ วันลงนามไว้ ไม่เปลี่ยนตามเมื่อแก้หรือลบลายเซ็นที่นี่ · ผู้อำนวยการยังลงนามจริงบนกระดาษ" />

      <Text strong style={{ display: 'block', marginBottom: 8 }}>ลายเซ็นปัจจุบัน</Text>
      {saved
        ? <Space wrap align="center" style={{ marginBottom: 20 }}>
          <SignaturePreview src={saved.image} />
          <Text type="secondary" style={{ fontSize: 12 }}>บันทึกเมื่อ {new Date(saved.updated_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</Text>
          <Popconfirm title="ลบลายเซ็น?" description="ยื่น/อนุมัติเอกสารไม่ได้จนกว่าจะตั้งใหม่ (เอกสารที่ลงนามแล้วไม่กระทบ)" okText="ลบ" okButtonProps={{ danger: true }} cancelText="ไม่ลบ" onConfirm={remove}>
            <Button danger icon={<DeleteOutlined />} loading={busy === 'delete'}>ลบลายเซ็น</Button>
          </Popconfirm>
        </Space>
        : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ยังไม่ได้ตั้งลายเซ็น" style={{ margin: '0 0 20px', textAlign: 'left' }} />}

      <Text strong style={{ display: 'block', marginBottom: 8 }}>{saved ? 'เปลี่ยนลายเซ็น' : 'ตั้งลายเซ็น'}</Text>
      <Segmented value={mode} onChange={v => setMode(v as 'draw' | 'upload')} style={{ marginBottom: 12 }}
        options={[{ value: 'draw', label: 'วาดบนจอ' }, { value: 'upload', label: 'อัปโหลดรูป' }]} />
      {mode === 'draw'
        ? <>
          <DrawPad key={padKey} onChange={setHasInk} />
          <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 6 }}>เซ็นด้วยเมาส์ นิ้ว หรือปากกาในกรอบ ระบบตัดขอบว่างให้อัตโนมัติ</Text>
        </>
        : <>
          <Upload accept="image/png,image/jpeg,image/webp" showUploadList={false} beforeUpload={pick} maxCount={1}>
            <Button icon={<UploadOutlined />}>เลือกรูปลายเซ็น</Button>
          </Upload>
          <Text type="secondary" style={{ display: 'block', fontSize: 12, margin: '6px 0 10px' }}>ถ่ายรูป/สแกนลายเซ็นปากกาสีเข้มบนกระดาษขาว ระบบลบพื้นขาวและครอปให้</Text>
          {uploaded && <SignaturePreview src={uploaded} />}
        </>}
      <Space style={{ marginTop: 12 }} wrap>
        {mode === 'draw' && <Button icon={<ClearOutlined />} onClick={() => { setPadKey(k => k + 1); setHasInk(false) }} disabled={!hasInk}>ล้าง</Button>}
        <Button type="primary" icon={<SaveOutlined />} loading={busy === 'save'} disabled={mode === 'draw' ? !hasInk : !uploaded} onClick={save}>บันทึกลายเซ็น</Button>
      </Space>
    </div>
  )
}
