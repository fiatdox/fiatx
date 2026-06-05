'use client'
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { ConfigProvider, theme, App } from 'antd'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'app-theme'

interface ThemeModeContextValue {
  mode: ThemeMode
  setMode: (m: ThemeMode) => void
  toggle: () => void
}

const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: 'dark',
  setMode: () => {},
  toggle: () => {},
})

export const useThemeMode = () => useContext(ThemeModeContext)

/**
 * อ่านค่าธีมเริ่มต้นจาก attribute ที่ inline-script (ใน layout) ตั้งไว้ก่อน hydrate
 * เพื่อกันจอกระพริบ (FOUC) เริ่มต้นเป็น 'dark' หากยังไม่มีค่า
 */
function readInitialMode(): ThemeMode {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-theme')
    if (attr === 'light' || attr === 'dark') return attr
  }
  return 'dark'
}

/**
 * Provider ระดับ root — เก็บสถานะโหมดธีมไว้ที่เดียว ใช้ร่วมกันทั้ง Navbar และทุกหน้า
 * วางไว้ใน app/layout.tsx ครอบ children ทั้งหมด
 */
export const ThemeModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('dark')

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
      {children}
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
        },
      }}
    >
      <App style={{ background: 'transparent' }}>{children}</App>
    </ConfigProvider>
  )
}
