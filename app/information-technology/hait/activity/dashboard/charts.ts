// option ของ ECharts สำหรับ Dashboard บันทึกกิจกรรม IT
// สีลักษณะงานผูกกับความหมายตายตัวทั้งหน้า: เชิงรับ = ส้ม, เชิงรุก = เขียว, งานกลาง = ม่วง (ผ่าน validate_palette ทุกคู่)
// ที่มาของงานใช้คู่เดียวกัน: ขัดจังหวะ (ไม่ได้วางแผน) = ส้ม, วางแผน = เขียว
import type { Nature } from '../types'
import {
  type EChartsCoreOption, type Palette, base as kitBase, categoryAxis, gap, num, valueAxis,
} from '@/app/lib/chartKit'
import { NATURES, NATURE_LABEL, DOW_LABEL, type NatureRow, type heat } from './analytics'

export const hrsText = (min: number) => `${(min / 60).toLocaleString('th-TH', { maximumFractionDigits: 1 })} ชม.`
const hours = (min: number) => Math.round((min / 60) * 10) / 10

const base = (P: Palette) => kitBase(P, v => `${v.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ชม.`)

const dot = (c: string) => `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${c};margin-right:6px"></span>`

/** tooltip ของแท่งซ้อนตามลักษณะงาน: แยกทุกชิ้นที่มีค่า + รวม + จำนวนงาน */
const natureTooltip = (P: Palette, rows: NatureRow[]) => ({
  ...base(P).tooltip,
  formatter: (ps: { dataIndex: number }[]) => {
    const r = rows[ps[0].dataIndex]
    const lines = NATURES.filter(n => r.nature[n] > 0)
      .map(n => `${dot(P.nature[n])}${NATURE_LABEL[n]} <b>${hrsText(r.nature[n])}</b> (${Math.round((r.nature[n] * 100) / (r.minutes || 1))}%)`)
    return `${r.name}<br/>${lines.join('<br/>')}<br/>รวม <b>${hrsText(r.minutes)}</b> · ${num(r.n)} งาน${r.urgent ? ` · ด่วน ${num(r.urgent)}` : ''}`
  },
})

const natureSeries = (P: Palette, rows: NatureRow[], stack: string, barMaxWidth = 24) => NATURES
  .filter(n => rows.some(r => r.nature[n] > 0))
  .map(n => ({
    name: NATURE_LABEL[n], type: 'bar', stack, barMaxWidth,
    itemStyle: { color: P.nature[n], ...gap(P) },
    emphasis: { focus: 'series' },
    data: rows.map(r => hours(r.nature[n])),
  }))

/** ชั่วโมงงานรายเดือน ซ้อนตามลักษณะงาน (คลิกแท่ง = ดูเดือนนั้น) */
export const monthlyOption = (rows: NatureRow[], P: Palette): EChartsCoreOption => ({
  ...base(P),
  tooltip: natureTooltip(P, rows),
  grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
  xAxis: { type: 'category', data: rows.map(r => r.name), axisLabel: { color: P.muted }, axisLine: { lineStyle: { color: P.grid } }, axisTick: { show: false } },
  yAxis: valueAxis(P),
  series: natureSeries(P, rows, 'm', 36),
})

/** แท่งแนวนอนซ้อนตามลักษณะงาน (ระบบ / เจ้าหน้าที่) — ยอดชั่วโมงรวมอยู่ในป้ายแกน */
export const natureBarOption = (rows: NatureRow[], P: Palette): EChartsCoreOption => ({
  ...base(P),
  tooltip: natureTooltip(P, rows),
  grid: { left: 8, right: 24, top: 40, bottom: 8, containLabel: true },
  xAxis: valueAxis(P),
  yAxis: categoryAxis(P, rows.map(r => r.name), true, rows.map(r => hrsText(r.minutes)), 22),
  series: natureSeries(P, rows, 's'),
})

/** ประเภทกิจกรรม — สีตามลักษณะงานของประเภท ค่าชั่วโมงอยู่ปลายแท่ง */
export const typeOption = (rows: (NatureRow & { kind: Nature })[], P: Palette): EChartsCoreOption => ({
  ...base(P),
  tooltip: natureTooltip(P, rows),
  grid: { left: 8, right: 56, top: 40, bottom: 8, containLabel: true },
  xAxis: valueAxis(P),
  yAxis: categoryAxis(P, rows.map(r => r.name), true, undefined, 18),
  // ซีรีส์ละลักษณะงาน (ช่องที่ไม่ใช่ของตัวเองเป็น '-') เพื่อให้มี legend บอกความหมายของสี
  series: NATURES.filter(n => rows.some(r => r.kind === n)).map(n => ({
    name: NATURE_LABEL[n], type: 'bar', stack: 't', barMaxWidth: 22,
    itemStyle: { color: P.nature[n], borderRadius: [0, 4, 4, 0] },
    label: { show: true, position: 'right', color: P.text, formatter: (p: { value: number }) => `${p.value.toLocaleString('th-TH')} ชม.` },
    data: rows.map(r => (r.kind === n ? hours(r.minutes) : '-')),
  })),
})

/** ที่มาของงาน — ขัดจังหวะ (ส้ม) vs วางแผน (เขียว) จำนวนงานอยู่ปลายแท่ง */
export const sourceOption = (rows: { name: string; planned: boolean; n: number }[], P: Palette): EChartsCoreOption => ({
  ...base(P),
  tooltip: {
    ...base(P).tooltip,
    formatter: (ps: { dataIndex: number }[]) => {
      const r = rows[ps[0].dataIndex]
      return `${r.name}<br/>${dot(r.planned ? P.nature.proactive : P.nature.reactive)}${r.planned ? 'วางแผน' : 'ขัดจังหวะ'} <b>${num(r.n)}</b> งาน`
    },
  },
  grid: { left: 8, right: 48, top: 40, bottom: 8, containLabel: true },
  xAxis: valueAxis(P),
  yAxis: categoryAxis(P, rows.map(r => r.name), true, undefined, 18),
  series: [false, true].filter(pl => rows.some(r => r.planned === pl)).map(pl => ({
    name: pl ? 'วางแผน' : 'ขัดจังหวะ (ไม่ได้วางแผน)', type: 'bar', stack: 'src', barMaxWidth: 22,
    itemStyle: { color: pl ? P.nature.proactive : P.nature.reactive, borderRadius: [0, 4, 4, 0] },
    label: { show: true, position: 'right', color: P.text, formatter: (p: { value: number }) => num(p.value) },
    data: rows.map(r => (r.planned === pl ? r.n : '-')),
  })),
})

/** ชั่วโมงงานตามช่วงเวลา × วันในสัปดาห์ — สีเดียวไล่ระดับ ตัวเลขในช่องเปลี่ยนสีตามความเข้มให้อ่านออก */
export const heatOption = (h: ReturnType<typeof heat>, P: Palette, isDark: boolean): EChartsCoreOption => {
  const hourLabels = h.hours.map(x => `${String(x).padStart(2, '0')}:00`)
  const max = Math.max(1, ...h.minutes.flat()) / 60
  const data = h.days.flatMap((_, di) => h.hours.map((__, hi) => {
    const v = hours(h.minutes[di][hi])
    // ช่องค่าสูง (เกินครึ่งของค่าสูงสุด) สีตัดกับพื้นแรง ต้องสลับสีตัวอักษร:
    // โหมดสว่างช่องค่าสูงเป็นน้ำเงินเข้ม → ตัวขาว, โหมดมืด ramp กลับด้าน ช่องค่าสูงเป็นฟ้าอ่อน → ตัวเข้ม
    const strong = v > max * 0.5
    return { value: [hi, di, v], tasks: h.tasks[di][hi], label: { color: strong ? (isDark ? '#0f172a' : '#ffffff') : P.text } }
  }))
  return {
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: P.surface, borderColor: P.grid, textStyle: { color: P.text },
      formatter: (p: { data: { value: [number, number, number]; tasks: number } }) =>
        `${DOW_LABEL[h.days[p.data.value[1]]]} ${hourLabels[p.data.value[0]]}<br/><b>${p.data.value[2].toLocaleString('th-TH')}</b> ชม.งาน · ${num(p.data.tasks)} งาน`,
    },
    // top เว้นที่ให้ปุ่ม PNG/SVG ของการ์ด ไม่ให้ทับแถวบนสุด
    grid: { left: 8, right: 8, top: 32, bottom: 48, containLabel: true },
    xAxis: { type: 'category', data: hourLabels, axisLabel: { color: P.muted }, axisLine: { show: false }, axisTick: { show: false }, splitArea: { show: false } },
    yAxis: { type: 'category', data: h.days.map(d => DOW_LABEL[d]), inverse: true, axisLabel: { color: P.text }, axisLine: { show: false }, axisTick: { show: false } },
    visualMap: {
      min: 0, max: Math.ceil(max), calculable: false, orient: 'horizontal', left: 'center', bottom: 0,
      itemWidth: 12, itemHeight: 160, text: ['มาก', 'น้อย'], textStyle: { color: P.muted },
      inRange: { color: P.seq },
    },
    series: [{
      type: 'heatmap', data,
      itemStyle: { borderColor: P.surface, borderWidth: 2, borderRadius: 4 },
      label: { show: true, fontSize: 11, formatter: (p: { value: [number, number, number] }) => (p.value[2] > 0 ? p.value[2].toLocaleString('th-TH', { maximumFractionDigits: 0 }) : '') },
      emphasis: { itemStyle: { borderColor: P.text, borderWidth: 1 } },
    }],
  }
}
