'use client'
import React, { useEffect, useState } from 'react'
import { Modal, Button, Checkbox, Typography } from 'antd'
import { LinkOutlined } from '@ant-design/icons'

const { Title, Paragraph } = Typography

interface Popup {
  id: number
  title: string
  body: string | null
  link_url: string | null
  updated_at: string
}

// แสดงครั้งเดียวต่อการเปิดเบราว์เซอร์ (sessionStorage) — เปิดหน้าแรกแล้วไปหน้างาน HR ไม่เด้งซ้ำ
const SEEN_KEY = 'hr-popup-seen'
// "ไม่ต้องแสดงอีกวันนี้" (localStorage) — เก็บวันที่ที่กดซ่อนไว้ต่อป๊อปอัป
const HIDE_KEY = 'hr-popup-hide'

// แก้ไขป๊อปอัปแล้ว key เปลี่ยน → คนที่ปิดไปแล้วเห็นฉบับใหม่อีกครั้ง
const keyOf = (p: Popup) => `${p.id}:${p.updated_at}`
const todayStr = () => new Date().toLocaleDateString('sv-SE')

function readJson<T>(store: () => Storage, key: string, fallback: T): T {
  try {
    const raw = store().getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function writeJson(store: () => Storage, key: string, value: unknown) {
  try { store().setItem(key, JSON.stringify(value)) } catch { /* private mode / storage ปิด — เด้งซ้ำได้ ไม่เป็นไร */ }
}

/** ป๊อปอัปประกาศจากงานทรัพยากรบุคคล — วางไว้ในหน้าที่ต้องการให้เด้งตอนเข้า */
export default function HrPopup() {
  const [queue, setQueue] = useState<Popup[]>([])
  const [index, setIndex] = useState(0)
  const [hideToday, setHideToday] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/v1/hr-posts/popups/active')
      .then(r => r.json())
      .then(json => {
        if (cancelled || !json.success) return
        const seen = readJson<string[]>(() => sessionStorage, SEEN_KEY, [])
        const hidden = readJson<Record<string, string>>(() => localStorage, HIDE_KEY, {})
        const today = todayStr()
        setQueue((json.data as Popup[]).filter(p => !seen.includes(keyOf(p)) && hidden[keyOf(p)] !== today))
      })
      .catch(() => { /* ไม่มีป๊อปอัปก็ไม่เป็นไร */ })
    return () => { cancelled = true }
  }, [])

  const current = queue[index]
  if (!current) return null

  const dismiss = () => {
    const k = keyOf(current)
    writeJson(() => sessionStorage, SEEN_KEY, [...readJson<string[]>(() => sessionStorage, SEEN_KEY, []), k])
    if (hideToday) {
      const hidden = readJson<Record<string, string>>(() => localStorage, HIDE_KEY, {})
      // เก็บเฉพาะของวันนี้ — ไม่ให้ค้างสะสมไปเรื่อย ๆ
      const today = todayStr()
      const kept = Object.fromEntries(Object.entries(hidden).filter(([, d]) => d === today))
      writeJson(() => localStorage, HIDE_KEY, { ...kept, [k]: today })
    }
    setHideToday(false)
    setIndex(i => i + 1)
  }

  const isLast = index === queue.length - 1
  return (
    <Modal
      open
      centered
      width={640}
      onCancel={dismiss}
      title={null}
      styles={{ body: { padding: 0 } }}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Checkbox checked={hideToday} onChange={e => setHideToday(e.target.checked)}>ไม่ต้องแสดงอีกวันนี้</Checkbox>
          <div className="flex gap-2">
            {current.link_url && (
              <Button icon={<LinkOutlined />} href={current.link_url} target="_blank" rel="noopener noreferrer">ดูรายละเอียด</Button>
            )}
            <Button type="primary" onClick={dismiss}>
              {isLast ? 'ปิด' : `ถัดไป (${index + 1}/${queue.length})`}
            </Button>
          </div>
        </div>
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- รูปมาจาก API ผ่าน cookie ใช้ next/image ไม่ได้ */}
      <img
        src={`/api/v1/hr-posts/${current.id}/file`}
        alt={current.title}
        style={{ display: 'block', width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8 }}
      />
      <div style={{ padding: '12px 4px 0' }}>
        <Title level={5} style={{ margin: 0 }}>{current.title}</Title>
        {current.body && (
          <Paragraph className="hr-news-text" style={{ whiteSpace: 'pre-wrap', margin: '6px 0 0' }}>{current.body}</Paragraph>
        )}
      </div>
    </Modal>
  )
}
