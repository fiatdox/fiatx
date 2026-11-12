'use client'
import React, { createContext, useContext, useEffect, useState, useCallback, useSyncExternalStore } from 'react'
import { ConfigProvider, theme, App } from 'antd'
import { StyleProvider } from '@ant-design/cssinjs'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'app-theme'

interface ThemeModeContextValue {
  mode: ThemeMode
  setMode: (m: ThemeMode) => void
  toggle: () => void
}

const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: 'light',
  setMode: () => {},
  toggle: () => {},
})

const noopSubscribe = () => () => {}

/**
 * ระหว่าง hydrate ตอบ 'light' เสมอให้ตรงกับ HTML จาก server — ส่วนที่ hydrate ช้า (Suspense/โหลดช้าผ่าน LAN)
 * อาจ hydrate หลัง ThemeModeProvider อ่านโหมดมืดไปแล้ว ทำให้ปุ่มธีม/ไอคอนไม่ตรงกับ server (hydration mismatch)
 * useSyncExternalStore ใช้ค่า server ตอน hydrate แล้ว render ใหม่ด้วยค่าจริงทันที
 */
export const useThemeMode = (): ThemeModeContextValue => {
  const ctx = useContext(ThemeModeContext)
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false)
  return hydrated || ctx.mode === 'light' ? ctx : { ...ctx, mode: 'light' }
}

/**
 * อ่านค่าธีมเริ่มต้นจาก attribute ที่ inline-script (ใน layout) ตั้งไว้ก่อน hydrate
 * เพื่อกันจอกระพริบ (FOUC) เริ่มต้นเป็น 'light' หากยังไม่มีค่า
 */
function readInitialMode(): ThemeMode {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-theme')
    if (attr === 'light' || attr === 'dark') return attr
  }
  return 'light'
}

// ผู้ใช้ปิดเอฟเฟกต์ภาพเคลื่อนไหวของระบบ (Windows: ปิด "แสดงภาพเคลื่อนไหว") — globals.css บังคับ animation 0s
// แต่ antd ยังรอ animationend ตอนปิด modal ซึ่งบางครั้งไม่มา → modal ค้างแบบมองไม่เห็นทับทั้งหน้า คลิกอะไรไม่ได้
// จึงสั่ง antd ปิด motion เอง (ไม่ต้องรอ event) — ConfigProvider ของแต่ละหน้ารับ token นี้ต่อจากตัวนี้
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
const subscribeReducedMotion = (cb: () => void) => {
  const mq = window.matchMedia(REDUCED_MOTION)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const usePrefersReducedMotion = () =>
  useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => false)

/**
 * Provider ระดับ root — เก็บสถานะโหมดธีมไว้ที่เดียว ใช้ร่วมกันทั้ง Navbar และทุกหน้า
 * วางไว้ใน app/layout.tsx ครอบ children ทั้งหมด
 */
export const ThemeModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('light')
  const reducedMotion = usePrefersReducedMotion()

  // sync จาก attribute ที่ script ตั้งไว้ ตอน mount ฝั่ง client
  useEffect(() => {
    setModeState(readInitialMode())
  }, [])

  const applyMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', m)
      try { localStorage.setItem(STORAGE_KEY, m) } catch { /* ignore */ }
    }
  }, [])

  const toggle = useCallback(() => {
    applyMode(mode === 'dark' ? 'light' : 'dark')
  }, [mode, applyMode])

  return (
    <ThemeModeContext.Provider value={{ mode, setMode: applyMode, toggle }}>
      {/* สไตล์ antd ทั้งระบบอยู่ใน @layer antd — ให้ Tailwind utilities ทับได้ (ลำดับ layer อยู่ใน globals.css) */}
      <StyleProvider layer>
        <ConfigProvider theme={{ token: { motion: !reducedMotion } }}>{children}</ConfigProvider>
      </StyleProvider>
    </ThemeModeContext.Provider>
  )
}

interface AppThemeProviderProps {
  children: React.ReactNode
  /** สีหลักของหน้า เช่น '#006a5a' (teal) หรือ '#6B21A8' (purple) */
  colorPrimary?: string
}

/**
 * ใช้แทน <ConfigProvider><App> เดิมในแต่ละหน้า
 * เลือก algorithm (light/dark) ตามโหมดปัจจุบันอัตโนมัติ
 */
export const AppThemeProvider: React.FC<AppThemeProviderProps> = ({ children, colorPrimary = '#006a5a' }) => {
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary,
          borderRadius: 8,
          colorBgContainer: isDark ? '#1e293b' : '#ffffff',
          colorBgElevated: isDark ? '#1e293b' : '#ffffff',
          // ข้อความรองค่าเริ่มต้นของ antd ไม่ถึงเกณฑ์ 4.5:1 — ใช้ค่าเดียวกับ --app-text-3
          colorTextDescription: isDark ? '#8494a8' : '#5b6b80',
          colorTextTertiary: isDark ? '#8494a8' : '#5b6b80',
          colorTextPlaceholder: isDark ? '#8494a8' : '#5b6b80',
          motionEaseOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
        },
      }}
    >
      <App style={{ background: 'transparent' }}>{children}</App>
    </ConfigProvider>
  )
}
