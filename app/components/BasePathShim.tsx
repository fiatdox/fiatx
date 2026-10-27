'use client'

import { useEffect } from 'react'
import { BASE_PATH, withBase } from '@/app/lib/basePath'

// ครอบ window.fetch ครั้งเดียวตอนโหลด bundle: fetch('/api/...') ทั่วแอปจะวิ่งเข้า `${BASE_PATH}/api/...` เอง
// (Next เติม basePath ให้เฉพาะ <Link>, router และ /_next ไม่เติมให้ fetch)
if (typeof window !== 'undefined' && BASE_PATH) {
  const w = window as Window & { __basePathFetch?: boolean }
  if (!w.__basePathFetch) {
    w.__basePathFetch = true
    const original = window.fetch.bind(window)
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === 'string') return original(withBase(input), init)
      if (input instanceof URL && input.origin === window.location.origin) {
        return original(new URL(withBase(input.pathname) + input.search + input.hash, input.origin), init)
      }
      return original(input, init)
    }
  }
}

// <a href="/..."> ธรรมดา (เช่น Breadcrumb ของ antd, ลิงก์ดาวน์โหลดไฟล์) ไม่ผ่าน Link ของ Next
// จึงเขียน href ให้มี basePath ก่อนผู้ใช้กด/คลิกขวา/เปิดแท็บใหม่ — ทำซ้ำกี่ครั้งก็ผลเท่าเดิม
function fixAnchor(e: Event) {
  const a = (e.target as Element | null)?.closest?.('a[href^="/"]')
  if (!a) return
  const href = a.getAttribute('href') ?? ''
  const fixed = withBase(href)
  if (fixed !== href) a.setAttribute('href', fixed)
}

export default function BasePathShim() {
  useEffect(() => {
    if (!BASE_PATH) return
    const events = ['pointerdown', 'mouseover', 'focusin', 'contextmenu', 'touchstart'] as const
    events.forEach(ev => document.addEventListener(ev, fixAnchor, { capture: true, passive: true }))
    return () => events.forEach(ev => document.removeEventListener(ev, fixAnchor, { capture: true }))
  }, [])
  return null
}
