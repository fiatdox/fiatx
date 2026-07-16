'use client'
import React from 'react'

/**
 * ชุด UI ไล่ระดับสี (gradient) ใช้ร่วมกันในหน้า information-technology
 * - StatCard : การ์ดสถิติไล่ระดับสี พร้อมชิปไอคอน glow + hover
 * - gBtn     : สไตล์ปุ่มไล่ระดับสี (override พื้นหลัง antd)
 * - ACCENTS  : จานสีมาตรฐาน
 * - hexA     : hex → rgba สำหรับ glow / พื้นโปร่งใส
 */

// hex → rgba ช่วยทำสีโปร่งใสสำหรับ glow / พื้นไล่ระดับ
export const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

export const ACCENTS = {
  purple:  { from: '#a855f7', to: '#d946ef' },
  emerald: { from: '#10b981', to: '#34d399' },
  amber:   { from: '#f59e0b', to: '#fb923c' },
  cyan:    { from: '#06b6d4', to: '#3b82f6' },
  rose:    { from: '#f43f5e', to: '#fb7185' },
  indigo:  { from: '#6366f1', to: '#818cf8' },
  sky:     { from: '#0ea5e9', to: '#38bdf8' },
  violet:  { from: '#7c3aed', to: '#a78bfa' },
  teal:    { from: '#14b8a6', to: '#2dd4bf' },
  slate:   { from: '#64748b', to: '#94a3b8' },
} as const

export type Accent = keyof typeof ACCENTS

// ปุ่มไล่ระดับสี — override พื้นหลัง antd ด้วย inline style
export const gBtn = (from: string, to: string): React.CSSProperties => ({
  background: `linear-gradient(135deg, ${from}, ${to})`,
  border: 'none',
  color: '#fff',
  fontWeight: 600,
  boxShadow: `0 4px 14px ${hexA(from, 0.35)}`,
})

// เตรียม accent จากชื่อ หรือคู่สี [from,to] เอง
const resolveAccent = (accent: Accent | [string, string]) =>
  Array.isArray(accent) ? { from: accent[0], to: accent[1] } : ACCENTS[accent]

export const StatCard = ({
  label, value, suffix, icon, accent, isDark, footer, onClick,
}: {
  label: React.ReactNode
  value: React.ReactNode
  suffix?: string
  icon: React.ReactNode
  accent: Accent | [string, string]
  isDark: boolean
  footer?: React.ReactNode
  onClick?: () => void
}) => {
  const { from, to } = resolveAccent(accent)
  const soft = isDark
    ? `linear-gradient(135deg, ${hexA(from, 0.16)}, transparent 62%)`
    : `linear-gradient(135deg, ${hexA(from, 0.10)}, transparent 68%)`
  return (
    <div
      onClick={onClick}
      className={`group relative h-full overflow-hidden rounded-2xl border border-app-border p-5 shadow-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl${onClick ? ' cursor-pointer' : ''}`}
      style={{ background: `${soft}, var(--app-surface)` }}
    >
      <div className="absolute inset-x-0 top-0 h-0.75" style={{ background: `linear-gradient(90deg, ${from}, ${to})` }} />
      <div
        className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-40"
        style={{ background: `radial-gradient(circle, ${to}, transparent 70%)` }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 text-xs font-medium text-app-text-2">{label}</div>
          <div className="flex items-baseline gap-1">
            <span className="text-[26px] font-black leading-none" style={{ color: from }}>{value}</span>
            {suffix && <span className="text-sm font-bold" style={{ color: from }}>{suffix}</span>}
          </div>
        </div>
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg text-white transition-transform duration-300 group-hover:scale-110"
          style={{ background: `linear-gradient(135deg, ${from}, ${to})`, boxShadow: `0 6px 16px ${hexA(from, 0.4)}` }}
        >
          {icon}
        </div>
      </div>
      {footer && <div className="relative mt-3">{footer}</div>}
    </div>
  )
}
