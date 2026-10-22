// option ของ ECharts สำหรับ HR Dashboard — แยกจากหน้าเพื่อให้หน้าเหลือแค่การจัดวาง
// สีตามแนวทาง dataviz: ประเภทบุคลากรใช้ categorical ช่อง 1–6 ตามลำดับรหัส (สีติดกับประเภท ไม่ใช่อันดับ
// กรองแล้วประเภทที่เหลือไม่เปลี่ยนสี), เพศใช้ช่อง 7–8, กราฟชุดเดียวใช้ช่อง 1
// สาเหตุการออกจากงานใช้ช่อง 1–6 ชุดเดียวกันตามลำดับ exit_status_ids (อยู่คนละแท็บกับประเภทบุคลากร มี legend ของตัวเอง)
// ผ่าน validate_palette ทั้งโหมดสว่าง (พื้น #ffffff) และมืด (พื้น #1e293b) แล้ว
import type { EChartsCoreOption } from 'echarts'
import { AGE_BANDS, type Named, type UnitRow } from './insights'
import { PALETTES, type Palette, barHeight, categoryAxis, gap, num, valueAxis, base as kitBase } from '@/app/lib/chartKit'

export { PALETTES, barHeight, type Palette }

const base = (P: Palette) => kitBase(P, v => `${num(v)} คน`)

/** สีของประเภทบุคลากร — ผูกกับลำดับในตารางประเภท เกินช่องที่มีหรือไม่ระบุเป็นสีเทา */
export const typeColor = (types: Named[], id: number | null, P: Palette) => {
  const i = types.findIndex(t => t.id === id)
  return i >= 0 && i < P.types.length ? P.types[i] : P.other
}

/** สีของสาเหตุการออก — ผูกกับลำดับใน exit_status_ids ทั้งกราฟสาเหตุและกราฟแยกตามหน่วย สีจึงตรงกัน */
export const reasonColor = (exitIds: number[], id: number | null, P: Palette) => {
  const i = id == null ? -1 : exitIds.indexOf(id)
  return i >= 0 && i < P.types.length ? P.types[i] : P.other
}

/** บุคลากรตามหน่วยย่อย ซ้อนตามประเภทบุคลากร — ยอดรวมอยู่ในป้ายแกนแล้ว ไม่ต้องติดตัวเลขทุกชิ้น */
export const unitByTypeOption = (rows: UnitRow[], types: Named[], P: Palette): EChartsCoreOption => {
  const present = [...types.filter(t => rows.some(r => (r.byType.get(t.id) ?? 0) > 0))]
  const hasNone = rows.some(r => (r.byType.get(null) ?? 0) > 0)
  const shown = rows.filter(r => r.staff > 0)
  return {
    ...base(P),
    grid: { left: 8, right: 24, top: 40, bottom: 8, containLabel: true },
    xAxis: valueAxis(P),
    yAxis: categoryAxis(P, shown.map(r => r.name), true, shown.map(r => r.staff)),
    series: [
      ...present.map(t => ({
        name: t.name, type: 'bar', stack: 'staff', barMaxWidth: 24,
        itemStyle: { color: typeColor(types, t.id, P), ...gap(P) },
        emphasis: { focus: 'series' },
        data: shown.map(r => r.byType.get(t.id) ?? 0),
      })),
      ...(hasNone ? [{
        name: 'ไม่ระบุประเภท', type: 'bar', stack: 'staff', barMaxWidth: 24,
        itemStyle: { color: P.other, ...gap(P) }, data: shown.map(r => r.byType.get(null) ?? 0),
      }] : []),
    ],
  }
}

/** ปิรามิดอายุ: หญิงซ้าย ชายขวา (ค่าฝั่งหญิงเก็บเป็นลบเพื่อวาดไปทางซ้าย แต่แสดงเป็นบวก) */
export const pyramidOption = (female: number[], male: number[], P: Palette): EChartsCoreOption => {
  // แกนต้องสมมาตรสองฝั่ง ไม่งั้นความยาวแท่งหญิง/ชายเทียบกันด้วยตาไม่ได้
  const peak = Math.max(1, ...female, ...male)
  const step = peak > 50 ? 20 : peak > 20 ? 10 : 5
  const edge = Math.ceil(peak / step) * step
  return {
    ...base(P),
    grid: { left: 8, right: 24, top: 40, bottom: 8, containLabel: true },
    xAxis: { ...valueAxis(P), min: -edge, max: edge, interval: step, axisLabel: { color: P.muted, formatter: (v: number) => num(Math.abs(v)) } },
    yAxis: { ...categoryAxis(P, AGE_BANDS, false), axisLabel: { color: P.text } },
    series: [
      { name: 'หญิง', type: 'bar', stack: 'pyr', barMaxWidth: 24, itemStyle: { color: P.female, borderRadius: [4, 0, 0, 4] }, data: female.map(v => -v) },
      { name: 'ชาย', type: 'bar', stack: 'pyr', barMaxWidth: 24, itemStyle: { color: P.male, borderRadius: [0, 4, 4, 0] }, data: male },
    ],
  }
}

/** คาดการณ์เกษียณรายปีงบ ซ้อนตามประเภทบุคลากร */
export const retireOption = (fys: number[], byType: Map<number | null, number[]>, types: Named[], P: Palette): EChartsCoreOption => {
  const ids = [...byType.keys()].sort((a, b) => types.findIndex(t => t.id === a) - types.findIndex(t => t.id === b))
  return {
    ...base(P),
    grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: fys.map(String), axisLabel: { color: P.muted }, axisLine: { lineStyle: { color: P.grid } }, axisTick: { show: false } },
    yAxis: valueAxis(P),
    series: ids.map(id => ({
      name: id == null ? 'ไม่ระบุประเภท' : types.find(t => t.id === id)?.name ?? `ประเภท ${id}`,
      type: 'bar', stack: 'retire', barMaxWidth: 24,
      itemStyle: { color: typeColor(types, id, P), ...gap(P) },
      data: byType.get(id),
    })),
  }
}

/** ตำแหน่งที่มีคนมากที่สุด แยกหญิง/ชาย */
export const positionOption = (rows: { name: string; female: number; male: number; other: number; total: number }[], P: Palette): EChartsCoreOption => {
  const hasOther = rows.some(r => r.other > 0)
  return {
    ...base(P),
    grid: { left: 8, right: 24, top: 40, bottom: 8, containLabel: true },
    xAxis: valueAxis(P),
    yAxis: categoryAxis(P, rows.map(r => r.name), true, rows.map(r => r.total)),
    series: [
      { name: 'หญิง', type: 'bar', stack: 'g', barMaxWidth: 24, itemStyle: { color: P.female, ...gap(P) }, data: rows.map(r => r.female) },
      { name: 'ชาย', type: 'bar', stack: 'g', barMaxWidth: 24, itemStyle: { color: P.male, ...gap(P) }, data: rows.map(r => r.male) },
      ...(hasOther ? [{ name: 'ไม่ระบุเพศ', type: 'bar', stack: 'g', barMaxWidth: 24, itemStyle: { color: P.other, ...gap(P) }, data: rows.map(r => r.other) }] : []),
    ],
  }
}

/** ผู้ออกจากงานแยกตามหน่วยย่อย ซ้อนตามสาเหตุ — ยอดรวมอยู่ในป้ายแกน tooltip บอกอัตราการออกของหน่วย */
export const exitByUnitOption = (
  rows: UnitRow[], reasons: { id: number | null; name: string }[], exitIds: number[], P: Palette,
): EChartsCoreOption => ({
  ...base(P),
  tooltip: {
    ...base(P).tooltip,
    formatter: (ps: { dataIndex: number; seriesName: string; value: number; color: string }[]) => {
      const r = rows[ps[0].dataIndex]
      const parts = ps.filter(p => p.value > 0)
        .map(p => `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${p.color};margin-right:6px"></span>${p.seriesName} <b>${num(p.value)}</b> คน`)
      return `${r.name}<br/>${parts.join('<br/>')}<br/>รวม <b>${num(r.exits)}</b> คน · อัตราการออก ${r.exitRate.toLocaleString('th-TH', { maximumFractionDigits: 1 })}% (คงอยู่ ${num(r.staff)} คน)`
    },
  },
  grid: { left: 8, right: 24, top: 40, bottom: 8, containLabel: true },
  xAxis: valueAxis(P),
  yAxis: categoryAxis(P, rows.map(r => r.name), true, rows.map(r => r.exits)),
  series: reasons.map(x => ({
    name: x.name, type: 'bar', stack: 'exit', barMaxWidth: 24,
    itemStyle: { color: reasonColor(exitIds, x.id, P), ...gap(P) },
    emphasis: { focus: 'series' },
    data: rows.map(r => r.exitsBy.get(x.id) ?? 0),
  })),
})

/** แท่งชุดเดียวแนวนอน (ค่าอยู่ปลายแท่ง) — colors ใส่เมื่อแต่ละแท่งเป็นคนละกลุ่ม (เช่นสาเหตุ ให้สีตรงกับกราฟซ้อน) */
export const singleBarOption = (
  labels: string[], values: number[], P: Palette, tooltipExtra?: (i: number) => string, colors?: string[],
): EChartsCoreOption => ({
  ...base(P),
  legend: { show: false },
  tooltip: {
    ...base(P).tooltip,
    formatter: (ps: { dataIndex: number; name: string; value: number }[]) => {
      const p = ps[0]
      return `${p.name}<br/><b>${num(p.value)} คน</b>${tooltipExtra ? `<br/>${tooltipExtra(p.dataIndex)}` : ''}`
    },
  },
  grid: { left: 8, right: 48, top: 32, bottom: 8, containLabel: true },
  xAxis: valueAxis(P),
  yAxis: categoryAxis(P, labels),
  series: [{
    type: 'bar', barMaxWidth: 24,
    data: values.map((v, i) => (colors ? { value: v, itemStyle: { color: colors[i] } } : v)),
    itemStyle: { color: P.single, borderRadius: [0, 4, 4, 0] },
    label: { show: true, position: 'right', color: P.text, formatter: (p: { value: number }) => num(p.value) },
  }],
})
