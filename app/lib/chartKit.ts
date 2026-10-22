// ชุดเครื่องมือกราฟ ECharts ที่ใช้ร่วมกันหลายหน้า (HR Dashboard, บันทึกกิจกรรม IT)
// สีตามแนวทาง dataviz — ผ่าน validate_palette ทั้งโหมดสว่าง (พื้น #ffffff) และมืด (พื้น #1e293b) แล้ว
//   types   : categorical ช่อง 1–6 ใช้ตามลำดับของ entity (สีติดกับ entity ไม่ใช่อันดับ)
//   female/male : ช่อง 7–8
//   nature  : ลักษณะงาน IT เชิงรับ/เชิงรุก/กลาง (ส้ม/เขียว/ม่วง — ตรวจทุกคู่แล้ว)
//   seq     : ramp สีเดียวสำหรับความหนาแน่น (heatmap) จากน้อยไปมาก
// ECharts วาดบน canvas ใช้ var(--app-*) ไม่ได้ จึงต้องเป็นค่าสีจริงต่อโหมด
import type { EChartsCoreOption } from 'echarts'

export interface Palette {
  types: string[]; other: string; female: string; male: string; single: string
  nature: { reactive: string; proactive: string; neutral: string }
  seq: string[]
  text: string; muted: string; grid: string; surface: string
}

export const PALETTES: Record<'light' | 'dark', Palette> = {
  light: {
    types: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'],
    other: '#94a3b8', female: '#6250d6', male: '#e34948', single: '#2a78d6',
    nature: { reactive: '#eb6834', proactive: '#1baf7a', neutral: '#6250d6' },
    seq: ['#eef4fc', '#b9d3f3', '#6fa3e6', '#2a78d6', '#174a8a'],
    text: '#1e293b', muted: '#64748b', grid: '#e2e8f0', surface: '#ffffff',
  },
  dark: {
    types: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300'],
    other: '#64748b', female: '#9085e9', male: '#e66767', single: '#3987e5',
    nature: { reactive: '#d95926', proactive: '#199e70', neutral: '#9085e9' },
    seq: ['#243247', '#1f4a7a', '#2c6cb8', '#3987e5', '#9cc6f5'],
    text: '#e2e8f0', muted: '#94a3b8', grid: 'rgba(255,255,255,0.08)', surface: '#1e293b',
  },
}

export const num = (v: number) => v.toLocaleString('th-TH')

// ตัดชื่อยาวในป้ายแกนเอง (นับเป็นตัวอักษรที่มองเห็น สระ/วรรณยุกต์ไทยไม่หลุดจากพยัญชนะ)
// ให้จำนวนท้ายป้ายยังอยู่เสมอ — ถ้าปล่อยให้ ECharts ตัดเอง ตัวเลขท้ายชื่อจะหายไปด้วย
// ชื่อเต็มยังอยู่ใน tooltip และตาราง
const graphemes = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('th', { granularity: 'grapheme' }) : null
export const clip = (s: string, max = 26) => {
  const g = graphemes ? Array.from(graphemes.segment(s), x => x.segment) : Array.from(s)
  return g.length > max ? `${g.slice(0, max - 1).join('')}…` : s
}

// โครงร่วม: พื้นโปร่งใส (ใช้พื้นการ์ด) กริด/แกนเส้นบางสีจาง ตัวอักษรใช้สีข้อความ ไม่ใช้สีข้อมูล
export const base = (P: Palette, fmt: (v: number) => string) => ({
  backgroundColor: 'transparent',
  textStyle: { color: P.text },
  legend: { top: 0, left: 0, icon: 'roundRect', itemWidth: 12, itemHeight: 12, textStyle: { color: P.muted } },
  tooltip: {
    trigger: 'axis', axisPointer: { type: 'shadow' },
    backgroundColor: P.surface, borderColor: P.grid, textStyle: { color: P.text },
    valueFormatter: (v: unknown) => fmt(Math.abs(Number(v))),
  },
})
export const valueAxis = (P: Palette) => ({
  type: 'value', minInterval: 1,
  axisLabel: { color: P.muted }, splitLine: { lineStyle: { color: P.grid } },
})
export const categoryAxis = (P: Palette, data: string[], inverse = true, counts?: (number | string)[], max = 26) => ({
  type: 'category', inverse, data,
  axisLabel: {
    color: P.text,
    formatter: (v: string, i: number) => (counts ? `${clip(v, max)} (${typeof counts[i] === 'number' ? num(counts[i] as number) : counts[i]})` : clip(v, max)),
  },
  axisLine: { lineStyle: { color: P.grid } }, axisTick: { show: false },
})
// ช่องว่าง 1px สีพื้นระหว่างชิ้นที่ต่อกัน (ไม่ใช่เส้นขอบ) — แยกชิ้นในแท่งซ้อนให้อ่านออก
export const gap = (P: Palette) => ({ borderColor: P.surface, borderWidth: 1 })

/** ความสูงของกราฟแท่งแนวนอนตามจำนวนแถว — กันแท่งเบียดกัน และไม่ให้ป้ายแกนล่างถูกตัด */
export const barHeight = (rows: number, min = 220) => Math.max(min, rows * 34 + 64)

export type { EChartsCoreOption }
