'use client'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ConfigProvider, theme, Typography, Breadcrumb, Card, Alert, App,
  Button, Space, Table, Row, Col, Select, Statistic, Tabs, Modal, Spin, Tag, Tooltip,
  InputNumber, Input, DatePicker, Segmented, Switch,
} from 'antd'
import {
  HomeOutlined, ReloadOutlined, PrinterOutlined, FilePdfOutlined,
  SearchOutlined, InfoCircleOutlined,
} from '@ant-design/icons'
import dynamic from 'next/dynamic'
import { FaCalendarAlt, FaChartPie, FaFileExcel, FaTable } from 'react-icons/fa'
import Cookies from 'js-cookie'
import dayjs from 'dayjs'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import 'dayjs/locale/th'
import thTH from 'antd/locale/th_TH'
import * as XLSX from 'xlsx'
import Navbar from '@/app/components/Navbar'
import { useThemeMode } from '@/app/components/ThemeProvider'
import { money, thaiDate } from '../depreciation/calc'
import { buildMonthlyReport, type ReportAsset } from '../depreciation/report'
import type { AssetRegisterData } from '@/app/components/AssetRegisterPDF'
import { summarizePeriod, type Basis, type CategoryRow, type PeriodAssetRow, type YearAsset } from '../depreciation-summary/summary'
import EChart, { type ChartTheme } from '@/app/components/EChart'
import type { AnnualDepreciationData } from '@/app/components/AnnualDepreciationPDF'

const { Title, Text } = Typography

// ปฏิทินและช่องกรอกวันที่แสดงเป็น พ.ศ. — ต้องมีปลั๊กอิน buddhistEra ไว้ใช้โทเคน BBBB
dayjs.extend(buddhistEra)
// ชื่อเดือนต้องจัดรูปด้วย locale ไทยตรง ๆ — locale ตั้งต้นของ dayjs ฝั่ง server เป็นอังกฤษ
// (dayjs.locale('th') ถูกตั้งแค่ในหน้า home) ถ้าพึ่ง locale ตั้งต้น server ได้ "September" แต่ browser ได้ "กันยายน" → hydration error
const th = (d: dayjs.Dayjs) => d.locale('th')
const TH_DATE = 'DD/MM/BBBB'
const TH_MONTH = 'MMMM BBBB'
const TH_MONTH_SHORT = 'MMM BBBB'

// locale ของ antd ไม่ได้แปลงปีในหัวปฏิทินเป็น พ.ศ. ให้ (yearFormat ตั้งต้นเป็น YYYY)
const TH_LOCALE = {
  ...thTH,
  DatePicker: {
    ...thTH.DatePicker!,
    lang: { ...thTH.DatePicker!.lang, yearFormat: 'BBBB' },
  },
}

// โหลด PDFViewer เฉพาะฝั่งเบราว์เซอร์ — @react-pdf/renderer ทำงานกับ SSR ไม่ได้
const AnnualDepreciationPDFViewer = dynamic(() => import('@/app/components/AnnualDepreciationPDF'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 560, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <Spin size="large" />
      <Text type="secondary">กำลังสร้างรายงาน...</Text>
    </div>
  ),
})

// ทะเบียนคุมทรัพย์สินรายตัว — แบบฟอร์มเดียวกับหน้าคำนวณค่าเสื่อมรายตัวและรายงานรายปี
const AssetRegisterPDFViewer = dynamic(() => import('@/app/components/AssetRegisterPDF'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 560, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <Spin size="large" />
      <Text type="secondary">กำลังสร้างรายงาน...</Text>
    </div>
  ),
})

const BASIS_LABEL: Record<Basis, string> = {
  daily: 'เกณฑ์รายวัน (ตามปีงบประมาณ)',
  gfmis: 'เกณฑ์นับเดือน (GFMIS)',
}

const int = (v: number) => v.toLocaleString('th-TH')
const n2 = (v: number) => Math.round(v * 100) / 100

/** ทะเบียนบางรายการไม่ได้ผูกรหัสประเภทเงินไว้ */
const NO_MONEY_TYPE = 'ไม่ระบุประเภทเงิน'

/** โหมดการเลือกงวด */
type PeriodMode = 'month' | 'ytd' | 'range'

const PERIOD_MODE_LABEL: Record<PeriodMode, string> = {
  month: 'รายเดือน',
  ytd: 'ต้นปีงบถึงวันที่',
  range: 'กำหนดช่วงเอง',
}

/** ปีงบประมาณ (พ.ศ.) ของวันที่ — ตั้งแต่ 1 ต.ค. นับเป็นปีงบถัดไป */
const fyOfDate = (d: dayjs.Dayjs) => (d.month() >= 9 ? d.year() + 1 : d.year()) + 543

export interface DepreciationPeriodViewProps {
  /** endpoint ข้อมูลดิบ เช่น /api/v1/equipment/depreciation-year */
  apiPath: string
  /** ข้อความต่อท้ายหัวข้อ เช่น '(V3)' */
  titleSuffix: string
  /** ชื่อแหล่งข้อมูล แสดงใต้หัวข้อ */
  sourceLabel: string
  /** ข้อความบอกว่า API ของทะเบียนนี้ตัดอะไรออกไปแล้ว */
  exclusionNote?: string
}

const PageContent = ({ apiPath, titleSuffix, sourceLabel, exclusionNote }: DepreciationPeriodViewProps) => {
  const { message } = App.useApp()
  // กราฟต้องรู้โหมดของแอป เพราะสีตัวอักษรแกน/เส้นกริดมาจากธีมของ ECharts
  const { mode: themeMode } = useThemeMode()
  const chartTheme: ChartTheme = themeMode === 'dark' ? 'dark' : 'light'

  // ── ตัวเลือกงวด ─────────────────────────────────────────────────────────────
  // ตั้งต้นเป็นเดือนที่แล้ว เพราะงวดที่ปิดบัญชีจริงคือเดือนที่ผ่านไปแล้ว
  const [mode, setMode] = useState<PeriodMode>('month')
  const [month, setMonth] = useState<dayjs.Dayjs>(dayjs().subtract(1, 'month'))
  const [asOf, setAsOf] = useState<dayjs.Dayjs>(dayjs())
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'), dayjs(),
  ])
  const [residual, setResidual] = useState(1)
  const [basis, setBasis] = useState<Basis>('daily')

  // ช่วงวันที่จริงที่ใช้คำนวณ ตามโหมดที่เลือก
  const period = useMemo<{ from: string; to: string; label: string }>(() => {
    if (mode === 'month') {
      const from = month.startOf('month')
      const to = month.endOf('month')
      return {
        from: from.format('YYYY-MM-DD'),
        to: to.format('YYYY-MM-DD'),
        label: `เดือน${th(month).format(TH_MONTH)}`,
      }
    }
    if (mode === 'ytd') {
      // ต้นปีงบของวันที่ที่เลือก = 1 ต.ค. ของปีงบนั้น
      const fy = fyOfDate(asOf)
      const from = dayjs(`${fy - 544}-10-01`)
      return {
        from: from.format('YYYY-MM-DD'),
        to: asOf.format('YYYY-MM-DD'),
        label: `${thaiDate(from.format('YYYY-MM-DD'))} – ${thaiDate(asOf.format('YYYY-MM-DD'))}`,
      }
    }
    return {
      from: range[0].format('YYYY-MM-DD'),
      to: range[1].format('YYYY-MM-DD'),
      label: `${thaiDate(range[0].format('YYYY-MM-DD'))} – ${thaiDate(range[1].format('YYYY-MM-DD'))}`,
    }
  }, [mode, month, asOf, range])

  // ปีงบของวันสุดท้ายในงวด — ใช้ขอข้อมูลจาก API (ทะเบียนชุดเต็มของปีงบนั้น)
  const fy = useMemo(() => fyOfDate(dayjs(period.to)), [period.to])

  const [assets, setAssets] = useState<YearAsset[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [pdfOpen, setPdfOpen] = useState(false)

  // พิมพ์ทะเบียนคุมทรัพย์สินรายตัวจากตารางรายการ — ใบนี้ต้องใช้ข้อมูลครุภัณฑ์เต็มใบ
  // (รุ่น ผู้ขาย วิธีได้มา ฯลฯ) ซึ่ง endpoint ของรายงานค่าเสื่อมไม่ได้ส่งมา
  // จึงไปดึงจาก endpoint ค้นหาตอนกดปุ่มพิมพ์
  const [assetPdf, setAssetPdf] = useState<{ noid: string; data: AssetRegisterData } | null>(null)
  const [assetPdfLoading, setAssetPdfLoading] = useState<string | null>(null)

  // ประเภทเงินที่เลือกดู — null = ทุกประเภท
  const [moneyType, setMoneyType] = useState<string | null>(null)

  // ตัวกรองตารางรายตัว
  // แท็บย่อยใต้ตารางสรุปหมวด — ตารางรายตัว / แดชบอร์ด
  const [rowTab, setRowTab] = useState<'detail' | 'dashboard'>('detail')
  const [detailCat, setDetailCat] = useState<string | null>(null)
  const [detailSearch, setDetailSearch] = useState('')
  const [onlyActive, setOnlyActive] = useState(true)
  const firstPage = { current: 1, pageSize: 20 }
  const [catPage, setCatPage] = useState(firstPage)
  const [detailPage, setDetailPage] = useState(firstPage)

  // ผู้พิมพ์ = คนที่กำลังใช้งานอยู่ (คุกกี้ user_data)
  const preparedBy = useMemo(() => {
    try {
      const u = JSON.parse(Cookies.get('user_data') || '{}')
      return { name: (u?.name as string) ?? '', position: (u?.position_name as string) ?? '' }
    } catch { return { name: '', position: '' } }
  }, [])

  // ต้องใช้ทะเบียนชุดเต็ม (scope=all) เพราะงวดกลางปีต้องรู้ของที่คิดครบไปแล้วด้วย
  // จึงจะแสดงราคาทุน ค่าเสื่อมสะสม และมูลค่าสุทธิ ณ วันสิ้นงวดได้ครบทั้งทะเบียน
  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const json = await (await fetch(`${apiPath}?fy=${fy}&scope=all`)).json()
        if (!alive) return
        if (json?.success && Array.isArray(json.data)) setAssets(json.data)
        else { setAssets([]); setLoadError(json?.message || 'ดึงข้อมูลไม่สำเร็จ') }
      } catch {
        if (alive) { setAssets([]); setLoadError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ') }
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [fy, reloadKey, apiPath])

  // ── ตัวกรองประเภทเงิน ──────────────────────────────────────────────────────
  // กรองที่ชุดข้อมูลดิบก่อนคำนวณ ตารางสรุป รายตัว แดชบอร์ด และ PDF จึงอิงชุดเดียวกัน
  const moneyOptions = useMemo(() => {
    const count = new Map<string, number>()
    for (const a of assets) {
      const k = a.moneytype?.trim() || NO_MONEY_TYPE
      count.set(k, (count.get(k) ?? 0) + 1)
    }
    return [...count.keys()].sort().map(k => ({ value: k, label: k }))
  }, [assets])

  const matchMoney = useCallback(
    (a: YearAsset) => !moneyType || (a.moneytype?.trim() || NO_MONEY_TYPE) === moneyType,
    [moneyType],
  )
  const assetsView = useMemo(() => assets.filter(matchMoney), [assets, matchMoney])

  const result = useMemo(
    () => summarizePeriod(assetsView, period.from, period.to, basis, residual),
    [assetsView, period.from, period.to, basis, residual],
  )

  // เปลี่ยนงวด/เกณฑ์แล้วต้องกลับไปหน้าแรกของทุกตาราง ไม่งั้นจะค้างหน้าที่ไม่มีข้อมูล
  useEffect(() => {
    setCatPage(firstPage)
    setDetailPage(firstPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period.from, period.to, basis, residual])

  const catOptions = useMemo(
    () => result.rows.map(r => ({ value: r.category, label: r.category })),
    [result.rows],
  )

  const detailRows = useMemo(() => {
    const q = detailSearch.trim().toLowerCase()
    return result.details.filter(r =>
      (!detailCat || r.category === detailCat) &&
      (!onlyActive || r.expense > 0.005) &&
      (!q || r.noid.toLowerCase().includes(q) || r.names.toLowerCase().includes(q)))
  }, [result.details, detailCat, detailSearch, onlyActive])

  const seqColumn = (page: { current: number; pageSize: number }) => ({
    title: 'ลำดับ', key: 'seq', width: 70, align: 'center' as const, fixed: 'left' as const,
    render: (_: unknown, __: unknown, index: number) => (
      <span style={{ fontFamily: 'monospace', color: 'var(--app-text-3)' }}>
        {(page.current - 1) * page.pageSize + index + 1}
      </span>
    ),
  })

  const moneyCell = (v: number) => <span>{money(v)}</span>

  // ── ตารางสรุปตามหมวด ────────────────────────────────────────────────────────
  const catColumns = [
    seqColumn(catPage),
    { title: 'หมวดครุภัณฑ์', dataIndex: 'category', key: 'category', width: 260 },
    {
      title: 'จำนวน', dataIndex: 'count', key: 'count', width: 100, align: 'right' as const,
      render: (v: number) => int(v),
    },
    {
      title: 'ราคาทุนรวม', dataIndex: 'cost', key: 'cost', width: 150, align: 'right' as const,
      render: moneyCell,
    },
    {
      title: 'ค่าเสื่อมสะสมยกมาต้นงวด', dataIndex: 'opening', key: 'opening', width: 170,
      align: 'right' as const, render: moneyCell,
    },
    {
      title: 'ค่าเสื่อมราคางวดนี้', dataIndex: 'expense', key: 'expense', width: 160,
      align: 'right' as const,
      render: (v: number) => <Text strong style={{ color: '#FF6500' }}>{money(v)}</Text>,
    },
    {
      title: 'ค่าเสื่อมสะสมปลายงวด', dataIndex: 'closing', key: 'closing', width: 170,
      align: 'right' as const, render: moneyCell,
    },
    {
      title: 'มูลค่าสุทธิปลายงวด', dataIndex: 'nbv', key: 'nbv', width: 160,
      align: 'right' as const, render: moneyCell,
    },
  ]

  const searchPath = apiPath.replace(/\/[^/]+$/, '/search')

  /** ดึงข้อมูลครุภัณฑ์เต็มใบแล้วสร้างทะเบียนคุมทรัพย์สินตามเกณฑ์ของแท็บที่เปิดอยู่ */
  const openAssetPdf = async (noid: string) => {
    setAssetPdfLoading(noid)
    const fail = (text: string) => message.warning(text)
    try {
      const json = await (await fetch(`${searchPath}?keyword=${encodeURIComponent(noid)}`)).json()
      const list: (ReportAsset & { expired: number | null; deprec: number | null })[] =
        Array.isArray(json?.data) ? json.data : []
      // ค้นหาแบบ LIKE จึงได้หลายแถว ต้องหยิบเลขครุภัณฑ์ที่ตรงเป๊ะ
      const asset = list.find(a => a.noid === noid)
      if (!asset) { fail(`ไม่พบครุภัณฑ์ ${noid} ในทะเบียน`); return }

      const cost = Number(asset.perunits)
      const lifeYears = Number(asset.expired)
      if (!asset.receive || !Number.isFinite(cost) || cost <= 0 || !Number.isFinite(lifeYears) || lifeYears <= 0) {
        fail('ข้อมูลในทะเบียนไม่ครบสำหรับออกรายงาน (ต้องมีราคา วันที่รับ และอายุการใช้งาน)')
        return
      }

      // ทะเบียนของหน้านี้ไล่เป็นรายเดือนภายในงวด ไม่ใช่รายปีงบ
      // เพื่อให้ตรวจได้ว่าเดือนไหนคิดค่าเสื่อมไปเท่าไร ตามเกณฑ์ของแท็บที่เปิดอยู่
      const data = buildMonthlyReport({
        asset,
        cost,
        lifeYears,
        residual,
        basis,
        from: period.from,
        to: period.to,
        preparedBy,
      })

      if (!data) { fail('คำนวณค่าเสื่อมของรายการนี้ไม่ได้'); return }
      setAssetPdf({ noid, data })
    } catch {
      fail('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setAssetPdfLoading(null)
    }
  }

  /** ปุ่มพิมพ์ทะเบียนคุมทรัพย์สินของแถวนั้น — ใช้ตรวจสอบความถูกต้องรายเลขครุภัณฑ์ */
  const printColumn = {
    title: 'พิมพ์', key: 'print', width: 80, align: 'center' as const, fixed: 'right' as const,
    render: (_: unknown, r: { noid: string }) => (
      <Tooltip title={`ทะเบียนคุมทรัพย์สิน ${r.noid}`}>
        <Button
          size="small"
          type="text"
          icon={<PrinterOutlined />}
          loading={assetPdfLoading === r.noid}
          onClick={() => openAssetPdf(r.noid)}
        />
      </Tooltip>
    ),
  }

  const detailColumns = [
    seqColumn(detailPage),
    { title: 'เลขครุภัณฑ์', dataIndex: 'noid', key: 'noid', width: 170, fixed: 'left' as const },
    {
      title: 'รายการ', dataIndex: 'names', key: 'names', width: 280,
      render: (v: string) => v || <Text type="secondary">(ไม่มีชื่อรายการ)</Text>,
    },
    { title: 'หมวด', dataIndex: 'category', key: 'category', width: 180 },
    {
      title: 'วันที่รับ', dataIndex: 'receive', key: 'receive', width: 120,
      render: (v: string) => thaiDate(v),
    },
    { title: 'ราคาทุน', dataIndex: 'cost', key: 'cost', width: 130, align: 'right' as const, render: moneyCell },
    { title: 'สะสมยกมา', dataIndex: 'opening', key: 'opening', width: 140, align: 'right' as const, render: moneyCell },
    {
      title: 'ค่าเสื่อมงวดนี้', dataIndex: 'expense', key: 'expense', width: 140, align: 'right' as const,
      render: (v: number) => <Text strong style={{ color: '#FF6500' }}>{money(v)}</Text>,
    },
    { title: 'สะสมปลายงวด', dataIndex: 'closing', key: 'closing', width: 150, align: 'right' as const, render: moneyCell },
    { title: 'มูลค่าสุทธิ', dataIndex: 'nbv', key: 'nbv', width: 140, align: 'right' as const, render: moneyCell },
    {
      title: 'สถานะ', dataIndex: 'finished', key: 'finished', width: 130, align: 'center' as const,
      render: (v: boolean) => v
        ? <Tag color="default">คิดครบแล้ว</Tag>
        : <Tag color="green">ยังคิดค่าเสื่อมอยู่</Tag>,
    },
    printColumn,
  ]

  // ── ส่งออก Excel — เฉพาะแถวที่กรองอยู่บนหน้าจอ ───────────────────────────────
  const exportExcel = (what: 'category' | 'detail') => {
    const data = what === 'category'
      ? result.rows.map((r, i) => ({
        'ลำดับ': i + 1,
        'หมวดครุภัณฑ์': r.category,
        'จำนวน (รายการ)': r.count,
        'ราคาทุนรวม': n2(r.cost),
        'ค่าเสื่อมสะสมยกมาต้นงวด': n2(r.opening),
        'ค่าเสื่อมราคางวดนี้': n2(r.expense),
        'ค่าเสื่อมสะสมปลายงวด': n2(r.closing),
        'มูลค่าสุทธิปลายงวด': n2(r.nbv),
      }))
      : detailRows.map((r, i) => ({
        'ลำดับ': i + 1,
        'เลขครุภัณฑ์': r.noid,
        'รายการ': r.names,
        'หมวด': r.category,
        'วันที่รับ': thaiDate(r.receive),
        'ราคาทุน': n2(r.cost),
        'ค่าเสื่อมสะสมยกมาต้นงวด': n2(r.opening),
        'ค่าเสื่อมราคางวดนี้': n2(r.expense),
        'ค่าเสื่อมสะสมปลายงวด': n2(r.closing),
        'มูลค่าสุทธิปลายงวด': n2(r.nbv),
        'สถานะ': r.finished ? 'คิดครบแล้ว' : 'ยังคิดค่าเสื่อมอยู่',
      }))
    if (data.length === 0) { message.info('ไม่มีรายการให้ส่งออก'); return }
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data),
      what === 'category' ? 'สรุปตามหมวด' : 'รายการครุภัณฑ์')
    XLSX.writeFile(wb, `ค่าเสื่อมราคา-${period.from}-ถึง-${period.to}-${what}.xlsx`)
  }

  // ── แยกค่าเสื่อมรายเดือนภายในงวด (ใช้ในรายงาน PDF) ─────────────────────────
  // คิดทีละเดือนด้วยสูตรเดียวกับทั้งงวด ผลรวมทุกเดือนจึงเท่ากับยอดของงวดเสมอ
  // คำนวณเฉพาะตอนเปิด modal พิมพ์ เพราะต้องวนทะเบียนทั้งชุดเดือนละรอบ
  const monthlyBreakdown = useMemo(() => {
    if (!pdfOpen || !assetsView.length) return [] as {
      month: string; from: string; to: string; count: number; expense: number; closing: number; nbv: number
    }[]
    const out: { month: string; from: string; to: string; count: number; expense: number; closing: number; nbv: number }[] = []
    let cursor = dayjs(period.from).startOf('month')
    const last = dayjs(period.to)
    while (cursor.isBefore(last) || cursor.isSame(last, 'month')) {
      // เดือนแรกและเดือนสุดท้ายอาจไม่เต็มเดือน ต้องตัดตามขอบงวดจริง
      const from = cursor.isBefore(dayjs(period.from)) ? dayjs(period.from) : cursor
      const monthEnd = cursor.endOf('month')
      const to = monthEnd.isAfter(last) ? last : monthEnd
      const r = summarizePeriod(assetsView, from.format('YYYY-MM-DD'), to.format('YYYY-MM-DD'), basis, residual)
      out.push({
        month: th(cursor).format(TH_MONTH_SHORT),
        from: from.format('YYYY-MM-DD'),
        to: to.format('YYYY-MM-DD'),
        count: r.activeCount,
        expense: r.total.expense,
        closing: r.total.closing,
        nbv: r.total.nbv,
      })
      cursor = cursor.add(1, 'month').startOf('month')
    }
    return out
  }, [pdfOpen, assetsView, period.from, period.to, basis, residual])

  // ── ข้อมูลสำหรับ PDF ────────────────────────────────────────────────────────
  const reportData: AnnualDepreciationData | null = useMemo(() => {
    if (!result.rows.length) return null
    const fmt = (r: CategoryRow) => ({
      category: r.category,
      count: int(r.count),
      cost: money(r.cost),
      opening: money(r.opening),
      expense: money(r.expense),
      closing: money(r.closing),
      nbv: money(r.nbv),
    })
    return {
      orgName: 'โรงพยาบาลพะเยา',
      // บอกในรายงานด้วยว่ากรองประเภทเงินไว้ ไม่งั้นยอดในกระดาษจะอธิบายไม่ได้
      registryLabel: moneyType ? `${sourceLabel} · เฉพาะ${moneyType}` : sourceLabel,
      fiscalYear: String(fy),
      heading: mode === 'month'
        ? 'รายงานสรุปค่าเสื่อมราคาครุภัณฑ์ประจำเดือน'
        : 'รายงานสรุปค่าเสื่อมราคาครุภัณฑ์ตามงวด',
      periodText: period.label,
      monthly: monthlyBreakdown.map(m => ({
        month: m.month,
        days: `${thaiDate(m.from)} – ${thaiDate(m.to)}`,
        count: int(m.count),
        expense: money(m.expense),
        closing: money(m.closing),
        nbv: money(m.nbv),
      })),
      monthlyTotal: monthlyBreakdown.length > 0 ? {
        month: 'รวมทั้งงวด',
        days: '',
        count: int(result.activeCount),
        expense: money(monthlyBreakdown.reduce((s, m) => s + m.expense, 0)),
        closing: money(result.total.closing),
        nbv: money(result.total.nbv),
      } : undefined,
      summary: [
        { label: 'ครุภัณฑ์ที่ถือครอง (รายการ)', value: int(result.total.count) },
        { label: 'ราคาทุนรวม (บาท)', value: money(result.total.cost) },
        { label: 'ค่าเสื่อมราคางวดนี้ (บาท)', value: money(result.total.expense) },
        { label: 'ค่าเสื่อมสะสมปลายงวด (บาท)', value: money(result.total.closing) },
        { label: 'มูลค่าสุทธิปลายงวด (บาท)', value: money(result.total.nbv) },
      ],
      // รายงานนี้เป็นรายงวด หัวคอลัมน์จึงต้องเป็น "งวด" ไม่ใช่ "ปี"
      columnTitles: {
        opening: 'ค่าเสื่อมสะสม\nยกมาต้นงวด',
        expense: 'ค่าเสื่อมราคา\nงวดนี้',
        closing: 'ค่าเสื่อมสะสม\nปลายงวด',
        nbv: 'มูลค่าสุทธิ\nปลายงวด',
      },
      basisLabel: BASIS_LABEL[basis],
      rows: result.rows.map(fmt),
      total: fmt(result.total),
      preparedBy: preparedBy.name,
      preparedByPosition: preparedBy.position,
    }
  }, [result.rows, result.total, result.activeCount, sourceLabel, fy, mode, period.label, basis, preparedBy, monthlyBreakdown, moneyType])

  // ── แดชบอร์ด ────────────────────────────────────────────────────────────────
  // ค่าเสื่อมรายเดือนทั้งปีงบของงวดที่เลือก — คำนวณเฉพาะตอนเปิดแท็บแดชบอร์ด
  // เพราะต้องเรียก summarizePeriod 12 ครั้งกับทะเบียนทั้งชุด
  const monthlyTrend = useMemo(() => {
    if (rowTab !== 'dashboard' || !assetsView.length) return [] as { label: string; value: number; inPeriod: boolean }[]
    const out: { label: string; value: number; inPeriod: boolean }[] = []
    for (let m = 0; m < 12; m++) {
      const first = dayjs(`${fy - 544}-10-01`).add(m, 'month')
      const from = first.format('YYYY-MM-DD')
      const to = first.endOf('month').format('YYYY-MM-DD')
      out.push({
        label: th(first).format('MMM BB'),
        value: summarizePeriod(assetsView, from, to, basis, residual).total.expense,
        // ไฮไลต์เดือนที่อยู่ในงวดที่ผู้ใช้เลือก ให้เห็นว่ารายงานกำลังตัดช่วงไหน
        inPeriod: to >= period.from && from <= period.to,
      })
    }
    return out
  }, [rowTab, assetsView, fy, basis, residual, period.from, period.to])

  const chartBase = { backgroundColor: 'transparent' }

  const dashboardSection = () => {
    const topExpense = [...result.rows].sort((a, b) => b.expense - a.expense).slice(0, 10).reverse()
    const topValue = [...result.rows].sort((a, b) => b.cost - a.cost).slice(0, 8).reverse()

    return (
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card
            size="small"
            style={{ borderRadius: 12 }}
            title={<Text strong>ค่าเสื่อมราคารายเดือน ปีงบ {fy} — แท่งสีส้มคือเดือนที่อยู่ในงวดที่เลือก</Text>}
          >
            {monthlyTrend.length === 0 ? (
              <div style={{ height: 300, display: 'grid', placeItems: 'center' }}><Spin /></div>
            ) : (
              <EChart
                theme={chartTheme}
                height={300}
                option={{
                  ...chartBase,
                  tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${money(v)} บาท` },
                  grid: { left: 80, right: 20, top: 20, bottom: 40 },
                  xAxis: { type: 'category', data: monthlyTrend.map(r => r.label) },
                  yAxis: { type: 'value', axisLabel: { formatter: (v: number) => int(Math.round(v)) } },
                  series: [{
                    type: 'bar',
                    name: 'ค่าเสื่อมราคา',
                    data: monthlyTrend.map(r => ({
                      value: r.value,
                      itemStyle: { color: r.inPeriod ? '#FF6500' : '#64748b' },
                    })),
                  }],
                }}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            size="small"
            style={{ borderRadius: 12 }}
            title={<Text strong>ต้นทุนบริการงวดนี้ — ค่าเสื่อมราคาสูงสุด 10 หมวด</Text>}
          >
            <EChart
              theme={chartTheme}
              height={340}
              option={{
                ...chartBase,
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => `${money(v)} บาท` },
                grid: { left: 150, right: 30, top: 20, bottom: 30 },
                xAxis: { type: 'value', axisLabel: { formatter: (v: number) => int(Math.round(v)) } },
                yAxis: {
                  type: 'category',
                  data: topExpense.map(r => r.category),
                  axisLabel: { width: 140, overflow: 'truncate' },
                },
                series: [{
                  type: 'bar',
                  name: 'ค่าเสื่อมงวดนี้',
                  data: topExpense.map(r => r.expense),
                  itemStyle: { color: '#FF6500', borderRadius: [0, 4, 4, 0] },
                }],
              }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            size="small"
            style={{ borderRadius: 12 }}
            title={<Text strong>ฐานะสินทรัพย์ ณ {thaiDate(period.to)}</Text>}
          >
            <EChart
              theme={chartTheme}
              height={340}
              option={{
                ...chartBase,
                tooltip: { trigger: 'item', valueFormatter: (v: number) => `${money(v)} บาท` },
                legend: { bottom: 0 },
                series: [{
                  type: 'pie',
                  radius: ['45%', '70%'],
                  avoidLabelOverlap: true,
                  label: { formatter: '{b}\n{d}%' },
                  data: [
                    { name: 'มูลค่าสุทธิคงเหลือ', value: result.total.nbv, itemStyle: { color: '#22c55e' } },
                    { name: 'ค่าเสื่อมสะสม', value: result.total.closing, itemStyle: { color: '#f59e0b' } },
                  ],
                }],
              }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card
            size="small"
            style={{ borderRadius: 12 }}
            title={<Text strong>ราคาทุนเทียบมูลค่าสุทธิ — 8 หมวดที่มูลค่าสูงสุด</Text>}
          >
            <EChart
              theme={chartTheme}
              height={340}
              option={{
                ...chartBase,
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => `${money(v)} บาท` },
                legend: { bottom: 0 },
                grid: { left: 150, right: 30, top: 20, bottom: 40 },
                xAxis: { type: 'value', axisLabel: { formatter: (v: number) => int(Math.round(v)) } },
                yAxis: {
                  type: 'category',
                  data: topValue.map(r => r.category),
                  axisLabel: { width: 140, overflow: 'truncate' },
                },
                series: [
                  {
                    type: 'bar', stack: 'v', name: 'มูลค่าสุทธิคงเหลือ',
                    data: topValue.map(r => r.nbv),
                    itemStyle: { color: '#22c55e' },
                  },
                  {
                    type: 'bar', stack: 'v', name: 'ค่าเสื่อมสะสม',
                    data: topValue.map(r => r.closing),
                    itemStyle: { color: '#f59e0b' },
                  },
                ],
              }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            size="small"
            style={{ borderRadius: 12 }}
            title={<Text strong>สถานะรายการที่ถือครอง — ใช้วางแผนจัดหาทดแทน</Text>}
          >
            <EChart
              theme={chartTheme}
              height={340}
              option={{
                ...chartBase,
                tooltip: { trigger: 'item', valueFormatter: (v: number) => `${int(v)} รายการ` },
                legend: { bottom: 0 },
                series: [{
                  type: 'pie',
                  radius: ['45%', '70%'],
                  label: { formatter: '{b}\n{c} รายการ' },
                  data: [
                    { name: 'ยังคิดค่าเสื่อมอยู่', value: result.activeCount, itemStyle: { color: '#0ea5e9' } },
                    { name: 'คิดครบแล้ว — ควรตรวจสภาพ', value: result.finishedCount, itemStyle: { color: '#94a3b8' } },
                  ],
                }],
              }}
            />
          </Card>
        </Col>
      </Row>
    )
  }

  // ตารางรายการครุภัณฑ์รายตัวของงวดที่เลือก — อยู่ในแท็บย่อยคู่กับแดชบอร์ด
  const detailTable = (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Select
          allowClear
          placeholder="ทุกหมวด"
          value={detailCat}
          onChange={v => { setDetailCat(v ?? null); setDetailPage(firstPage) }}
          options={catOptions}
          style={{ minWidth: 220 }}
        />
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="ค้นเลขครุภัณฑ์ / ชื่อรายการ"
          value={detailSearch}
          onChange={e => { setDetailSearch(e.target.value); setDetailPage(firstPage) }}
          style={{ width: 280 }}
        />
        <Space size={6}>
          <Switch
            checked={onlyActive}
            onChange={v => { setOnlyActive(v); setDetailPage(firstPage) }}
          />
          <Text type="secondary">เฉพาะรายการที่มีค่าเสื่อมในงวดนี้</Text>
        </Space>
        <Button
          icon={<FaFileExcel />}
          onClick={() => exportExcel('detail')}
          disabled={loading}
          style={{ marginLeft: 'auto' }}
        >
          ส่งออก Excel
        </Button>
      </div>
      <Table<PeriodAssetRow>
        columns={detailColumns}
        dataSource={detailRows}
        rowKey="key"
        size="small"
        scroll={{ x: 'max-content' }}
        pagination={{
          ...detailPage,
          showSizeChanger: true,
          showTotal: (t, r) => `${int(r[0])}-${int(r[1])} จาก ${int(t)} รายการ`,
          onChange: (current, pageSize) => setDetailPage({ current, pageSize }),
        }}
      />
    </div>
  )

  const identityOk = Math.abs(result.total.cost - (result.total.closing + result.total.nbv)) < 0.5

  return (
    <div className="min-h-screen" style={{ background: 'var(--app-bg)' }}>
      <Navbar />
      <div className="px-4 md:px-8 py-6" style={{ maxWidth: '100%' }}>
        <Breadcrumb
          className="mb-4"
          items={[
            { href: '/home', title: <span><HomeOutlined /> หน้าหลัก</span> },
            { title: 'งานพัสดุ' },
            { title: 'งานครุภัณฑ์' },
            { title: `สรุปค่าเสื่อมราคาตามงวด ${titleSuffix}` },
          ]}
        />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Title level={3} style={{ margin: 0 }}>
              <FaCalendarAlt style={{ color: '#FF6500', marginRight: 10 }} />
              สรุปค่าเสื่อมราคาตามงวด {titleSuffix}
            </Title>
            <Text type="secondary">
              {sourceLabel} · {period.label} · {BASIS_LABEL[basis]}
            </Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => setReloadKey(k => k + 1)} loading={loading}>
              โหลดใหม่
            </Button>
            <Tooltip title="พิมพ์รายงานสรุปตามหมวดของงวดนี้">
              <Button
                type="primary"
                icon={<PrinterOutlined />}
                style={{ background: '#FF6500' }}
                onClick={() => {
                  if (!reportData) { message.info('ยังไม่มีข้อมูลให้พิมพ์'); return }
                  setPdfOpen(true)
                }}
              >
                พิมพ์รายงาน
              </Button>
            </Tooltip>
          </Space>
        </div>

        {loadError && (
          <Alert type="error" showIcon className="mb-4" title="ดึงข้อมูลไม่สำเร็จ" description={loadError} />
        )}

        {/* ── เลือกงวด ── */}
        <Card className="mb-4" style={{ borderRadius: 14 }} styles={{ body: { padding: 16 } }}>
          <div className="flex flex-wrap items-center gap-4">
            <Segmented
              value={mode}
              onChange={v => setMode(v as PeriodMode)}
              options={(Object.keys(PERIOD_MODE_LABEL) as PeriodMode[])
                .map(k => ({ value: k, label: PERIOD_MODE_LABEL[k] }))}
            />

            {mode === 'month' && (
              <Space size={8}>
                <Text type="secondary">เดือน:</Text>
                <DatePicker
                  picker="month"
                  value={month}
                  onChange={d => d && setMonth(d)}
                  format={TH_MONTH}
                  allowClear={false}
                  style={{ width: 200 }}
                />
              </Space>
            )}

            {mode === 'ytd' && (
              <Space size={8}>
                <Text type="secondary">คิดถึงวันที่:</Text>
                <DatePicker
                  value={asOf}
                  onChange={d => d && setAsOf(d)}
                  format={TH_DATE}
                  allowClear={false}
                  style={{ width: 170 }}
                />
              </Space>
            )}

            {mode === 'range' && (
              <Space size={8}>
                <Text type="secondary">ช่วงวันที่:</Text>
                <DatePicker.RangePicker
                  value={range}
                  onChange={v => v?.[0] && v?.[1] && setRange([v[0], v[1]])}
                  format={TH_DATE}
                  allowClear={false}
                />
              </Space>
            )}

            <Space size={8}>
              <Text type="secondary">ประเภทเงิน:</Text>
              <Select
                allowClear
                placeholder="ทุกประเภทเงิน"
                value={moneyType}
                onChange={v => {
                  setMoneyType(v ?? null)
                  // ชุดข้อมูลเปลี่ยน ตัวกรองหมวดอาจค้างค่าที่ไม่มีอยู่แล้ว
                  setDetailCat(null)
                  setCatPage(firstPage)
                  setDetailPage(firstPage)
                }}
                options={moneyOptions}
                style={{ width: 200 }}
              />
            </Space>

            <Space size={8}>
              <Text type="secondary">ราคาซาก:</Text>
              <InputNumber
                value={residual}
                onChange={v => setResidual(Number(v) || 0)}
                min={0}
                style={{ width: 90 }}
              />
              <Text type="secondary">บาท</Text>
            </Space>

            <Tooltip
              placement="bottomRight"
              styles={{ root: { maxWidth: 460 } }}
              title={
                <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    คิดจากค่าเสื่อมสะสม ณ วันก่อนเริ่มงวด เทียบกับวันสิ้นงวด
                  </div>
                  <div>
                    ยกมาต้นงวด = สะสมถึง {thaiDate(dayjs(period.from).subtract(1, 'day').format('YYYY-MM-DD'))} ·
                    ปลายงวด = สะสมถึง {thaiDate(period.to)}
                  </div>
                  <div>
                    นับครุภัณฑ์ที่ถือครองอยู่ทั้งหมด ณ วันสิ้นงวด (รับของไม่เกินวันนั้น)
                    ของที่คิดครบไปก่อนงวดนี้มีค่าเสื่อมงวดนี้เป็น 0 แต่ยังอยู่ในราคาทุน
                    ค่าเสื่อมสะสม และมูลค่าสุทธิ
                  </div>
                  <div>
                    เลือกงวด 1 ต.ค. – 30 ก.ย. จะได้ยอดเท่ากับรายงานรายปีงบเป๊ะ
                    และ 12 เดือนรวมกันเท่ากับทั้งปี
                  </div>
                  <div>ข้ามรายการที่ไม่เข้าเงื่อนไขการคำนวณ {int(result.skipped)} รายการ</div>
                  {moneyType && <div>กรองเฉพาะ{moneyType}</div>}
                  {exclusionNote && <div>{exclusionNote}</div>}
                </div>
              }
            >
              <InfoCircleOutlined style={{ color: '#FF6500', fontSize: 16, cursor: 'help', marginLeft: 'auto' }} />
            </Tooltip>
          </div>
        </Card>

        <Spin spinning={loading} description="กำลังดึงข้อมูลทะเบียน...">
          {/* ── KPI ── */}
          <Row gutter={[16, 16]} className="mb-4">
            <Col xs={12} md={6}>
              <Card size="small" style={{ borderRadius: 12 }}>
                <Statistic
                  title="ค่าเสื่อมราคางวดนี้"
                  value={result.total.expense}
                  precision={2}
                  suffix="บาท"
                  styles={{ content: { color: '#FF6500' } }}
                />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  มีค่าเสื่อม {int(result.activeCount)} · คิดครบแล้ว {int(result.finishedCount)}
                </Text>
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small" style={{ borderRadius: 12 }}>
                <Statistic title="ครุภัณฑ์ที่ถือครอง" value={result.total.count} suffix="รายการ" />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small" style={{ borderRadius: 12 }}>
                <Statistic title="ราคาทุนรวม" value={result.total.cost} precision={2} suffix="บาท" />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small" style={{ borderRadius: 12 }}>
                <Statistic title="มูลค่าสุทธิปลายงวด" value={result.total.nbv} precision={2} suffix="บาท" />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  ค่าเสื่อมสะสม {money(result.total.closing)} บาท
                </Text>
              </Card>
            </Col>
          </Row>

          {!identityOk && result.total.count > 0 && (
            <Alert
              type="warning"
              showIcon
              className="mb-4"
              title="ยอดไม่ลงตัว"
              description="ราคาทุนรวมไม่เท่ากับค่าเสื่อมสะสมบวกมูลค่าสุทธิ กรุณาแจ้งผู้ดูแลระบบ"
            />
          )}

          <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 16 } }}>
            <Tabs
              type="card"
              className="depreciation-period-tabs"
              tabBarStyle={{ marginBottom: 18 }}
              activeKey={basis}
              onChange={k => setBasis(k as Basis)}
              items={(Object.keys(BASIS_LABEL) as Basis[]).map(b => ({
                key: b,
                label: BASIS_LABEL[b],
                children: (
                  <>
                    {/* ── สรุปตามหมวด ── */}
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <Text strong>สรุปตามหมวดครุภัณฑ์</Text>
                      <Button icon={<FaFileExcel />} onClick={() => exportExcel('category')} disabled={loading}>
                        ส่งออก Excel
                      </Button>
                    </div>
                    <Table<CategoryRow>
                      columns={catColumns}
                      dataSource={result.rows}
                      rowKey="key"
                      size="small"
                      scroll={{ x: 'max-content' }}
                      pagination={{
                        ...catPage,
                        showSizeChanger: true,
                        onChange: (current, pageSize) => setCatPage({ current, pageSize }),
                      }}
                      summary={() => (
                        <Table.Summary fixed>
                          <Table.Summary.Row style={{ fontWeight: 700 }}>
                            <Table.Summary.Cell index={0} colSpan={2} align="center">รวมทั้งสิ้น</Table.Summary.Cell>
                            <Table.Summary.Cell index={2} align="right">{int(result.total.count)}</Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="right">{money(result.total.cost)}</Table.Summary.Cell>
                            <Table.Summary.Cell index={4} align="right">{money(result.total.opening)}</Table.Summary.Cell>
                            <Table.Summary.Cell index={5} align="right">
                              <Text strong style={{ color: '#FF6500' }}>{money(result.total.expense)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={6} align="right">{money(result.total.closing)}</Table.Summary.Cell>
                            <Table.Summary.Cell index={7} align="right">{money(result.total.nbv)}</Table.Summary.Cell>
                          </Table.Summary.Row>
                        </Table.Summary>
                      )}
                    />

                    {/* ── แท็บย่อย: ตารางรายตัว / แดชบอร์ด ── */}
                    <div style={{ marginTop: 32, borderTop: '1px solid var(--app-border)', paddingTop: 24 }}>
                      <Tabs
                        size="small"
                        type="card"
                        className="depreciation-period-subtabs"
                        tabBarStyle={{ marginBottom: 18 }}
                        activeKey={rowTab}
                        onChange={k => setRowTab(k as typeof rowTab)}
                        items={[
                          {
                            key: 'detail',
                            label: (
                              <Space size={6}>
                                <FaTable />
                                <span>รายการครุภัณฑ์</span>
                                <Tag style={{ marginInlineEnd: 0 }}>{int(detailRows.length)}</Tag>
                              </Space>
                            ),
                            children: detailTable,
                          },
                          {
                            key: 'dashboard',
                            label: (
                              <Space size={6}>
                                <FaChartPie />
                                <span>Dashboard</span>
                              </Space>
                            ),
                            children: dashboardSection(),
                          },
                        ]}
                      />
                    </div>
                  </>
                ),
              }))}
            />
          </Card>
        </Spin>

        <style>{`
          /* แท็บหลัก (เกณฑ์คำนวณ) และแท็บย่อย (ตาราง/แดชบอร์ด) ใช้หน้าตาชุดเดียวกัน
             ต่างแค่ขนาดตัวอักษร เพื่อให้เห็นลำดับชั้น */
          .depreciation-period-tabs .ant-tabs-nav::before,
          .depreciation-period-subtabs .ant-tabs-nav::before { border-bottom-color: var(--app-border); }
          .depreciation-period-tabs .ant-tabs-tab,
          .depreciation-period-subtabs .ant-tabs-tab {
            padding: 8px 18px !important;
            font-weight: 600;
          }
          .depreciation-period-tabs .ant-tabs-tab { font-size: 15px; }
          .depreciation-period-tabs .ant-tabs-tab-btn,
          .depreciation-period-subtabs .ant-tabs-tab-btn { color: var(--app-text-2); }
          .depreciation-period-tabs .ant-tabs-tab:hover .ant-tabs-tab-btn,
          .depreciation-period-subtabs .ant-tabs-tab:hover .ant-tabs-tab-btn { color: #FF6500; }
          .depreciation-period-tabs .ant-tabs-tab-active,
          .depreciation-period-subtabs .ant-tabs-tab-active {
            border-top: 2px solid #FF6500 !important;
            background: rgba(255, 101, 0, 0.10) !important;
          }
          .depreciation-period-tabs .ant-tabs-tab-active .ant-tabs-tab-btn,
          .depreciation-period-subtabs .ant-tabs-tab-active .ant-tabs-tab-btn { color: #FF6500 !important; }
        `}</style>
      </div>

      <Modal
        title={
          <Space>
            <FilePdfOutlined style={{ color: '#FF6500' }} />
            <span>สรุปค่าเสื่อมราคา {period.label} {titleSuffix} · {BASIS_LABEL[basis]}</span>
          </Space>
        }
        open={pdfOpen}
        onCancel={() => setPdfOpen(false)}
        footer={null}
        width="92%"
        styles={{ body: { padding: '16px 0 0', display: 'flex', flexDirection: 'column', minHeight: 600 } }}
        destroyOnHidden
      >
        {reportData && <AnnualDepreciationPDFViewer data={reportData} />}
      </Modal>

      {/* ทะเบียนคุมทรัพย์สินรายตัว — เปิดจากปุ่มพิมพ์ในตารางรายการ */}
      <Modal
        title={
          <Space>
            <FilePdfOutlined style={{ color: '#FF6500' }} />
            <span>ทะเบียนคุมทรัพย์สิน · {assetPdf?.noid} · {BASIS_LABEL[basis]}</span>
          </Space>
        }
        open={assetPdf !== null}
        onCancel={() => setAssetPdf(null)}
        footer={null}
        width="92%"
        styles={{ body: { padding: '16px 0 0', display: 'flex', flexDirection: 'column', minHeight: 600 } }}
        destroyOnHidden
      >
        {assetPdf && <AssetRegisterPDFViewer data={assetPdf.data} />}
      </Modal>
    </div>
  )
}

export default function DepreciationPeriodView(props: DepreciationPeriodViewProps) {
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  return (
    <ConfigProvider
      locale={TH_LOCALE}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { colorPrimary: '#FF6500', borderRadius: 8 },
      }}
    >
      <App>
        <PageContent {...props} />
      </App>
    </ConfigProvider>
  )
}
