'use client'
import React, { useState, useEffect, useMemo } from 'react'
import {
  ConfigProvider, theme, Typography, Breadcrumb, Card, Alert, App,
  Button, Space, Table, Row, Col, Select, Statistic, Tabs, Modal, Spin, Tag, Tooltip, InputNumber, Input,
} from 'antd'
import {
  HomeOutlined, FileTextOutlined, ReloadOutlined, PrinterOutlined, FilePdfOutlined, SearchOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import dynamic from 'next/dynamic'
import { FaChartPie, FaFileExcel } from 'react-icons/fa'
import Cookies from 'js-cookie'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import Navbar from '@/app/components/Navbar'
import { useThemeMode } from '@/app/components/ThemeProvider'
import {
  currentFyBE, money, thaiDate, buildSchedule, CAPITAL_MIN_FROM_2563, CAPITAL_MIN_BEFORE_2563,
} from '../depreciation/calc'
import { computeGfmis } from '../depreciation/gfmis'
import { buildFyReport, buildGfmisReport, type ReportAsset } from '../depreciation/report'
import type { AssetRegisterData } from '@/app/components/AssetRegisterPDF'
import {
  summarizeByCategory, summarizeFullyDepreciated, listExcluded, upcomingExpiry, EXCLUDED_REASON,
  type AssetDetailRow, type Basis, type CategoryRow, type ResidualDetailRow, type YearAsset,
  type ExcludedDetailRow,
} from './summary'
import EChart, { type ChartTheme } from '@/app/components/EChart'
import type { AnnualDepreciationData } from '@/app/components/AnnualDepreciationPDF'

const { Title, Text } = Typography

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

// ทะเบียนคุมทรัพย์สินรายตัว — แบบฟอร์มเดียวกับที่หน้าคำนวณค่าเสื่อมรายตัวใช้พิมพ์
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

/** คีย์ของแถวสรุปที่ต่อท้ายตารางสรุปหมวดของแท็บทะเบียนที่ถือครอง */
const EXCLUDED_CAT_KEY = 'excluded'
const INCOMPLETE_CAT_KEY = 'incomplete'
const EXTRA_CAT_KEYS = [EXCLUDED_CAT_KEY, INCOMPLETE_CAT_KEY]

export interface DepreciationSummaryViewProps {
  /** endpoint ข้อมูลดิบ เช่น /api/v1/equipment/depreciation-year */
  apiPath: string
  /** ข้อความต่อท้ายหัวข้อ เช่น '(V3)' */
  titleSuffix: string
  /** ชื่อแหล่งข้อมูล แสดงใต้หัวข้อ */
  sourceLabel: string
  /**
   * แท็บที่ 3 เอาของที่ยังคิดค่าเสื่อมอยู่มาด้วย (พร้อมปีงบที่จะคิดครบ)
   * กลายเป็นทะเบียนรวมของที่ถือครองอยู่ ไม่ใช่เฉพาะของที่เหลือราคาซาก
   */
  residualIncludesActive?: boolean
  /**
   * ข้อความบอกว่า API ของทะเบียนนี้ตัดอะไรออกไปแล้ว — แต่ละทะเบียนมีคอลัมน์ไม่เหมือนกัน
   * (V2 มีทั้ง trans และ iscode · V3 เป็นฐานใหม่ที่แยกเฉพาะครุภัณฑ์ออกมา มีแค่ iscode)
   */
  exclusionNote?: string
}

const PageContent = ({
  apiPath, titleSuffix, sourceLabel, residualIncludesActive = false, exclusionNote,
}: DepreciationSummaryViewProps) => {
  const { message } = App.useApp()
  // กราฟต้องรู้โหมดของแอป เพราะสีตัวอักษรแกน/เส้นกริดมาจากธีมของ ECharts
  const { mode } = useThemeMode()
  const chartTheme: ChartTheme = mode === 'dark' ? 'dark' : 'light'

  const thisFy = currentFyBE()
  const [fy, setFy] = useState<number>(thisFy)
  const [residual, setResidual] = useState(1)
  const [assets, setAssets] = useState<YearAsset[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  // ชุดข้อมูลเต็มสำหรับแท็บ "คิดค่าเสื่อมครบแล้ว"
  const [allAssets, setAllAssets] = useState<YearAsset[]>([])
  const [allLoading, setAllLoading] = useState(false)
  const [allError, setAllError] = useState<string | null>(null)
  // แท็บหลัก: สองเกณฑ์การคิด + ทะเบียนที่ถือครองอีกสองแท็บ (เกณฑ์รายวัน / GFMIS)
  //
  // ทะเบียนที่ถือครองต้องแยกเป็นสองแท็บ ไม่ใช่ตัวเลือกในแท็บเดียว เพราะสองเกณฑ์
  // ตัดสิน "ปีที่คิดค่าเสื่อมครบ" ไม่ตรงกัน (GFMIS นับเป็นเดือน รับวันที่ 16–31
  // ยกยอดไปเดือนถัดไป) รายการที่เข้ารายงานและปีที่ครบจึงต่างกัน ต้องเทียบกันได้
  type Tab = 'daily' | 'gfmis' | 'residual' | 'residualGfmis'
  const [tab, setTab] = useState<Tab>('daily')
  const isResidual = tab === 'residual' || tab === 'residualGfmis'
  const residualBasis: Basis = tab === 'residualGfmis' ? 'gfmis' : 'daily'
  const basis: Basis = isResidual ? residualBasis : tab
  const [pdfOpen, setPdfOpen] = useState(false)

  // พิมพ์ทะเบียนคุมทรัพย์สินรายตัวจากตารางรายการ
  // รายงานนี้ต้องใช้ข้อมูลครุภัณฑ์เต็มใบ (รุ่น ผู้ขาย วิธีได้มา ฯลฯ) ซึ่ง endpoint
  // ของรายงานค่าเสื่อมไม่ได้ส่งมา จึงต้องไปดึงจาก endpoint ค้นหาตอนกดปุ่มพิมพ์
  const [assetPdf, setAssetPdf] = useState<{ noid: string; data: AssetRegisterData } | null>(null)
  const [assetPdfLoading, setAssetPdfLoading] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  // ตัวกรองของตารางรายตัว
  const [detailSearch, setDetailSearch] = useState('')
  const [detailCat, setDetailCat] = useState<string | null>(null)

  // ตัวกรองของตาราง "รายการที่ไม่เข้าเงื่อนไขการคำนวณ" — แยกจากตารางหลัก
  // เพราะเป็นข้อมูลคนละชุด ค้นหาทีละตารางจะได้ไม่กวนกัน
  const [exSearch, setExSearch] = useState('')
  const [exReason, setExReason] = useState<ExcludedDetailRow['reason'] | null>(null)
  const [exCat, setExCat] = useState<string | null>(null)
  // ตัวกรองสถานะของแท็บที่ 3 — null = ทั้งหมด · true = คิดครบแล้ว · false = ยังคิดอยู่
  const [doneStatus, setDoneStatus] = useState<boolean | null>(null)
  // แท็บย่อยของตารางรายตัวท้ายหน้า — นับเข้ารายงาน / ไม่เข้าเงื่อนไข / แดชบอร์ด
  const [rowTab, setRowTab] = useState<'counted' | 'excluded' | 'dashboard'>('counted')

  // หน้าปัจจุบันของแต่ละตาราง — ใช้ให้เลขลำดับเดินต่อเนื่องข้ามหน้า
  // (ค่า index ที่ antd ส่งให้ นับใหม่ทุกหน้า ถ้าใช้ตรง ๆ หน้า 2 จะเริ่มที่ 1 อีกครั้ง)
  const [detailPage, setDetailPage] = useState({ current: 1, pageSize: 20 })
  const [donePage, setDonePage] = useState({ current: 1, pageSize: 20 })
  const [exPage, setExPage] = useState({ current: 1, pageSize: 20 })

  // กรองใหม่แล้วต้องกลับไปหน้าแรกเสมอ ไม่งั้นค้างอยู่หน้าเดิมที่อาจไม่มีแถวแล้ว
  const firstPage = (p: { current: number; pageSize: number }) => ({ ...p, current: 1 })
  const resetDetailPages = () => { setDetailPage(firstPage); setDonePage(firstPage) }

  /** คอลัมน์ลำดับ — เลขเดินตามลำดับที่เห็นบนตาราง (เรียงคอลัมน์ใหม่แล้วเลขก็ไล่ใหม่ตาม) */
  const seqColumn = (page: { current: number; pageSize: number }) => ({
    title: 'ลำดับ', key: 'seq', width: 70, align: 'center' as const, fixed: 'left' as const,
    render: (_: unknown, __: unknown, index: number) => (
      <span style={{ fontFamily: 'monospace', color: 'var(--app-text-3)' }}>
        {(page.current - 1) * page.pageSize + index + 1}
      </span>
    ),
  })

  // ผู้พิมพ์ = คนที่กำลังใช้งานอยู่ (คุกกี้ user_data.name = pname+fname+lname)
  const preparedBy = useMemo(() => {
    try {
      const u = JSON.parse(Cookies.get('user_data') || '{}')
      return { name: (u?.name as string) ?? '', position: (u?.position_name as string) ?? '' }
    } catch { return { name: '', position: '' } }
  }, [])

  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const json = await (await fetch(`${apiPath}?fy=${fy}`)).json()
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

  // ชุดข้อมูลเต็ม (รวมของที่คิดค่าเสื่อมครบไปแล้ว) — ใหญ่กว่าชุดปกติหลายเท่า
  // จึงโหลดเฉพาะตอนเปิดแท็บที่ต้องใช้ ไม่ถ่วงการเปิดหน้าครั้งแรก
  useEffect(() => {
    if (!isResidual) return
    let alive = true
    const load = async () => {
      setAllLoading(true)
      setAllError(null)
      try {
        const json = await (await fetch(`${apiPath}?fy=${fy}&scope=all`)).json()
        if (!alive) return
        if (json?.success && Array.isArray(json.data)) setAllAssets(json.data)
        else { setAllAssets([]); setAllError(json?.message || 'ดึงข้อมูลไม่สำเร็จ') }
      } catch {
        if (alive) { setAllAssets([]); setAllError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ') }
      } finally {
        if (alive) setAllLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [tab, isResidual, fy, reloadKey, apiPath])

  // คำนวณทั้งสองเกณฑ์ไว้เลย สลับแท็บจะได้ไม่ต้องรอคำนวณใหม่
  const daily = useMemo(() => summarizeByCategory(assets, fy, 'daily', residual), [assets, fy, residual])
  const gfmis = useMemo(() => summarizeByCategory(assets, fy, 'gfmis', residual), [assets, fy, residual])
  const current = basis === 'gfmis' ? gfmis : daily

  // ของที่คิดค่าเสื่อมครบแล้ว มูลค่าสุทธิเหลือเท่าราคาซาก
  // ต้องใช้ข้อมูลชุดเต็ม (scope=all) เพราะชุดปกติตัดของที่คิดครบไปแล้วออกตั้งแต่ฝั่ง API
  const done = useMemo(
    () => summarizeFullyDepreciated(allAssets, fy, residualBasis, residual, residualIncludesActive),
    [allAssets, fy, residualBasis, residual, residualIncludesActive],
  )
  // ชุดตัวเลขที่แท็บปัจจุบันแสดงอยู่ — ใช้สร้าง PDF ให้ตรงกับที่เห็น
  const view = isResidual ? done : current

  // รายการที่ไม่เข้าเงื่อนไขการคำนวณ — ชุดข้อมูลตามแท็บที่เปิดอยู่
  // (แท็บคิดครบแล้วใช้ทะเบียนชุดเต็ม ตัวเลขจึงมากกว่าสองแท็บแรก)
  const excludedSet = isResidual ? allAssets : assets
  const excluded = useMemo(() => listExcluded(excludedSet), [excludedSet])

  // ── สรุปหมวดของแท็บ 3 ───────────────────────────────────────────────────────
  // ต่อท้ายด้วยแถวรวมของที่ไม่เข้าเงื่อนไขการคำนวณ ให้เห็นทั้งทะเบียนในตารางเดียว
  // มีแค่จำนวนกับราคาทุน ช่องค่าเสื่อมเป็น 0 เพราะของพวกนี้ไม่ได้คิดค่าเสื่อม
  const doneRows: CategoryRow[] = useMemo(() => {
    // แยกสองเหตุผลออกจากกัน ชื่อแถวจะได้ตรงกับของที่อยู่ในแถวนั้นจริง ๆ
    const below = excluded.rows.filter(r => r.reason === 'BELOW_THRESHOLD')
    const incomplete = excluded.rows.filter(r => r.reason !== 'BELOW_THRESHOLD')
    const extra = (key: string, category: string, rows: ExcludedDetailRow[]): CategoryRow => ({
      key, assetcatid: null, category,
      count: rows.length,
      cost: rows.reduce((t, r) => t + r.cost, 0),
      opening: 0, expense: 0, closing: 0, nbv: 0,
    })
    return [
      ...done.rows,
      ...(below.length ? [extra(EXCLUDED_CAT_KEY, 'ครุภัณฑ์ต่ำกว่าเกณฑ์', below)] : []),
      ...(incomplete.length
        ? [extra(INCOMPLETE_CAT_KEY, 'ข้อมูลไม่ครบ คำนวณค่าเสื่อมไม่ได้', incomplete)]
        : []),
    ]
  }, [done.rows, excluded.rows])

  // ── แดชบอร์ด ────────────────────────────────────────────────────────────────
  // ของที่จะคิดค่าเสื่อมครบภายใน 5 ปีงบข้างหน้า — คำนวณตารางค่าเสื่อมทุกรายการ
  // จึงหนักพอตัว ทำเฉพาะตอนเปิดแท็บแดชบอร์ด
  const expiry = useMemo(
    () => rowTab === 'dashboard' ? upcomingExpiry(excludedSet, fy, basis, residual, 5) : null,
    [rowTab, excludedSet, fy, basis, residual],
  )

  // ยอดรวมของตารางต้องรวมแถวนั้นด้วย ไม่งั้นบวกตามคอลัมน์แล้วไม่ตรง
  const doneTotal: CategoryRow = useMemo(() => {
    const extras = doneRows.filter(r => EXTRA_CAT_KEYS.includes(r.key))
    if (!extras.length) return done.total
    return {
      ...done.total,
      count: done.total.count + extras.reduce((t, r) => t + r.count, 0),
      cost: done.total.cost + extras.reduce((t, r) => t + r.cost, 0),
    }
  }, [doneRows, done.total])

  const fyCE = fy - 543
  const periodLabel = `1 ต.ค. ${fy - 1} – 30 ก.ย. ${fy}`

  // ชื่อแท็บทะเบียนที่ถือครอง — เปลี่ยนตามว่าเอาของที่ยังคิดค่าเสื่อมอยู่มาด้วยไหม
  // และต่อท้ายด้วยเกณฑ์ เพราะมีสองแท็บที่ต่างกันแค่เกณฑ์
  const residualLabelOf = (b: Basis) => (residualIncludesActive
    ? 'ทะเบียนที่ถือครอง'
    : `คิดค่าเสื่อมครบแล้ว (เหลือ ${money(residual)} บาท)`)
    + (b === 'gfmis' ? ' · GFMIS' : ' · รายวัน')
  const residualTabLabel = residualLabelOf(residualBasis)

  // คำอธิบายของแท็บทะเบียนที่ถือครอง — เคยเป็น Alert เต็มความกว้างบนตาราง
  // ย้ายมาเป็นไอคอน hover ข้างปุ่มพิมพ์ เพื่อคืนพื้นที่ให้ตาราง
  const residualNote = () => {
    const finishedThisYear = done.details.filter(r => r.finished && r.finishedFy === fy).length
    return (
      <div style={{ fontSize: 12, lineHeight: 1.7 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          {residualIncludesActive
            ? `ทะเบียนครุภัณฑ์ที่ถือครองอยู่ ณ สิ้นปีงบ ${fy} — ทั้งที่คิดค่าเสื่อมครบแล้วและที่ยังคิดอยู่`
            : `ครุภัณฑ์ที่คิดค่าเสื่อมครบแล้ว มูลค่าสุทธิเหลือ ${money(residual)} บาท`}
          {' · '}คิดด้วย{BASIS_LABEL[residualBasis]}
        </div>
        {residualIncludesActive ? (
          <div>
            คิดครบแล้ว {int(done.finishedCount)} รายการ (เหลือ {money(residual)} บาท) ·
            ยังคิดค่าเสื่อมอยู่ {int(done.activeCount)} รายการ
            โดยคอลัมน์ปีงบที่คิดครบบอกว่าแต่ละรายการจะคิดครบในปีงบไหน
          </div>
        ) : (
          <div>
            นับทั้งของที่คิดครบมาตั้งแต่ปีก่อน ๆ และของที่เพิ่งคิดครบในปีงบ {fy}
            {finishedThisYear > 0 && ` (คิดครบในปีนี้ ${int(finishedThisYear)} รายการ)`}
          </div>
        )}
        <div>
          แท็บนี้ดึงทะเบียนชุดเต็ม {int(allAssets.length)} รายการ
          ต่างจากสองแท็บแรกที่ดึงเฉพาะของที่ยังคิดค่าเสื่อมอยู่ {int(assets.length)} รายการ
        </div>
        {exclusionNote && <div>{exclusionNote}</div>}
      </div>
    )
  }

  const reportData: AnnualDepreciationData | null = useMemo(() => {
    if (!view.rows.length) return null
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
      registryLabel: sourceLabel,
      fiscalYear: String(fy),
      periodLabel,
      basisLabel: isResidual
        ? `${residualTabLabel} · ${BASIS_LABEL[basis]}`
        : BASIS_LABEL[basis],
      // แท็บ 3 พิมพ์ให้ตรงกับที่เห็นบนจอ คือมีแถวของที่ไม่เข้าเงื่อนไขต่อท้ายด้วย
      rows: (isResidual ? doneRows : view.rows).map(fmt),
      total: fmt(isResidual ? doneTotal : view.total),
      preparedBy: preparedBy.name,
      preparedByPosition: preparedBy.position,
    }
  }, [view, doneRows, doneTotal, fy, basis, isResidual, residualTabLabel, periodLabel, preparedBy, sourceLabel])

  // ปีงบให้เลือก: ย้อนหลัง 10 ปี ถึงล่วงหน้า 1 ปี
  const fyOptions = useMemo(() => {
    const out: { value: number; label: string }[] = []
    for (let y = thisFy + 1; y >= thisFy - 10; y--) {
      out.push({ value: y, label: `ปีงบประมาณ ${y}${y === thisFy ? ' (ปีปัจจุบัน)' : ''}` })
    }
    return out
  }, [thisFy])

  const columns = [
    {
      title: 'หมวดครุภัณฑ์', dataIndex: 'category', key: 'category',
      render: (v: string, r: CategoryRow) => (
        <Space size={6}>
          <span style={{ fontWeight: 600 }}>{v}</span>
          {!EXTRA_CAT_KEYS.includes(r.key) && r.assetcatid == null && <Tag color="warning">ไม่ระบุ</Tag>}
        </Space>
      ),
    },
    {
      title: 'จำนวน (รายการ)', dataIndex: 'count', key: 'count', width: 120, align: 'right' as const,
      sorter: (a: CategoryRow, b: CategoryRow) => a.count - b.count,
      render: (v: number) => <span style={{ fontFamily: 'monospace' }}>{int(v)}</span>,
    },
    {
      title: 'ราคาทุนรวม', dataIndex: 'cost', key: 'cost', width: 150, align: 'right' as const,
      sorter: (a: CategoryRow, b: CategoryRow) => a.cost - b.cost,
      render: (v: number) => <span style={{ fontFamily: 'monospace' }}>{money(v)}</span>,
    },
    {
      title: 'สะสมยกมาต้นปี', dataIndex: 'opening', key: 'opening', width: 150, align: 'right' as const,
      render: (v: number) => <span style={{ fontFamily: 'monospace' }}>{money(v)}</span>,
    },
    {
      title: 'ค่าเสื่อมประจำปี', dataIndex: 'expense', key: 'expense', width: 150, align: 'right' as const,
      sorter: (a: CategoryRow, b: CategoryRow) => a.expense - b.expense,
      render: (v: number) => <span style={{ fontFamily: 'monospace', color: '#f59e0b', fontWeight: 600 }}>{money(v)}</span>,
    },
    {
      title: 'สะสมปลายปี', dataIndex: 'closing', key: 'closing', width: 150, align: 'right' as const,
      render: (v: number) => <span style={{ fontFamily: 'monospace' }}>{money(v)}</span>,
    },
    {
      title: 'มูลค่าสุทธิปลายปี', dataIndex: 'nbv', key: 'nbv', width: 150, align: 'right' as const,
      sorter: (a: CategoryRow, b: CategoryRow) => a.nbv - b.nbv,
      render: (v: number) => <span style={{ fontFamily: 'monospace', color: '#10b981' }}>{money(v)}</span>,
    },
  ]

  // endpoint ค้นหาครุภัณฑ์ของทะเบียนเดียวกัน — ทั้งสองทะเบียนใช้รูปแบบ URL เหมือนกัน
  // (/api/v1/equipment/depreciation-year → /api/v1/equipment/search)
  const searchPath = apiPath.replace(/\/[^/]+$/, '/search')

  /** ดึงข้อมูลครุภัณฑ์เต็มใบแล้วสร้างรายงานทะเบียนคุมทรัพย์สินตามเกณฑ์ของแท็บที่เปิดอยู่ */
  const openAssetPdf = async (noid: string) => {
    setAssetPdfLoading(noid)
    // ขึ้นเป็น message ไม่ใช่แถบค้างในหน้า เพราะเป็นผลของการกดปุ่มครั้งนั้น ๆ
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

      // ใช้เกณฑ์เดียวกับแท็บที่เปิดอยู่ ตัวเลขในใบทะเบียนจะได้ตรงกับที่เห็นในตาราง
      const data = basis === 'gfmis'
        ? (() => {
          const g = computeGfmis(
            { cost, lifeYears, receive: asset.receive!, residual },
            `${fy - 543}-09-30`,
          )
          return g ? buildGfmisReport({ asset, gfmis: g, lifeYears, currentFyBE: fy, preparedBy }) : null
        })()
        : (() => {
          const s = buildSchedule({ cost, lifeYears, receive: asset.receive!, residual, mode: 'daily' })
          return s ? buildFyReport({ asset, result: s, lifeYears, currentFyBE: fy, preparedBy }) : null
        })()

      if (!data) { fail('คำนวณค่าเสื่อมของรายการนี้ไม่ได้'); return }
      setAssetPdf({ noid, data })
    } catch {
      fail('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setAssetPdfLoading(null)
    }
  }

  /** ปุ่มพิมพ์ทะเบียนคุมทรัพย์สินของแถวนั้น — ใช้ร่วมกันทั้งสองตารางรายตัว */
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
    {
      title: 'เลขครุภัณฑ์', dataIndex: 'noid', key: 'noid', width: 150, fixed: 'left' as const,
      render: (v: string) => <code style={{ color: '#a78bfa' }}>{v}</code>,
    },
    // ทะเบียนบางรายการไม่ได้กรอกชื่อไว้ ต้องขึ้นให้เห็นว่าไม่มีชื่อ ไม่ใช่ช่องว่างเปล่า ๆ
    {
      title: 'รายการ', dataIndex: 'names', key: 'names', width: 280, ellipsis: true,
      render: (v: string) => v || <Text type="secondary">(ไม่มีชื่อรายการ)</Text>,
    },
    { title: 'หมวดครุภัณฑ์', dataIndex: 'category', key: 'category', width: 170, ellipsis: true },
    {
      title: 'วันที่รับ', dataIndex: 'receive', key: 'receive', width: 110,
      render: (v: string) => <span style={{ fontFamily: 'monospace' }}>{thaiDate(v) || '-'}</span>,
      sorter: (a: AssetDetailRow, b: AssetDetailRow) => a.receive.localeCompare(b.receive),
    },
    {
      title: 'ราคาทุน', dataIndex: 'cost', key: 'cost', width: 130, align: 'right' as const,
      sorter: (a: AssetDetailRow, b: AssetDetailRow) => a.cost - b.cost,
      render: (v: number) => <span style={{ fontFamily: 'monospace' }}>{money(v)}</span>,
    },
    {
      title: 'สะสมยกมา', dataIndex: 'opening', key: 'opening', width: 130, align: 'right' as const,
      render: (v: number) => <span style={{ fontFamily: 'monospace' }}>{money(v)}</span>,
    },
    {
      title: `ค่าเสื่อมปีงบ ${fy}`, dataIndex: 'expense', key: 'expense', width: 140, align: 'right' as const,
      defaultSortOrder: 'descend' as const,
      sorter: (a: AssetDetailRow, b: AssetDetailRow) => a.expense - b.expense,
      render: (v: number) => <span style={{ fontFamily: 'monospace', color: '#f59e0b', fontWeight: 600 }}>{money(v)}</span>,
    },
    {
      title: 'สะสมปลายปี', dataIndex: 'closing', key: 'closing', width: 140, align: 'right' as const,
      sorter: (a: AssetDetailRow, b: AssetDetailRow) => a.closing - b.closing,
      render: (v: number) => <span style={{ fontFamily: 'monospace' }}>{money(v)}</span>,
    },
    {
      title: (
        <Tooltip title={`ค่าเสื่อมที่ยังคิดได้อีก จนมูลค่าสุทธิเหลือ ${money(residual)} บาท`}>
          <span style={{ cursor: 'help' }}>คงเหลือจนถึง {money(residual)} บาท</span>
        </Tooltip>
      ),
      dataIndex: 'remaining', key: 'remaining', width: 170, align: 'right' as const,
      sorter: (a: AssetDetailRow, b: AssetDetailRow) => a.remaining - b.remaining,
      render: (v: number) => v <= 0
        ? <Tag color="default">คิดครบแล้ว</Tag>
        : <span style={{ fontFamily: 'monospace', color: '#60a5fa' }}>{money(v)}</span>,
    },
    {
      title: 'มูลค่าสุทธิปลายปี', dataIndex: 'nbv', key: 'nbv', width: 150, align: 'right' as const,
      sorter: (a: AssetDetailRow, b: AssetDetailRow) => a.nbv - b.nbv,
      render: (v: number) => <span style={{ fontFamily: 'monospace', color: '#10b981' }}>{money(v)}</span>,
    },
    printColumn,
  ]

  const detailTableFor = (key: Basis) => {
    const all = (key === 'gfmis' ? gfmis : daily).details
    const q = detailSearch.trim().toLowerCase()
    const rows = all.filter(r =>
      (!detailCat || r.category === detailCat) &&
      (!q || r.noid.toLowerCase().includes(q) || r.names.toLowerCase().includes(q)))

    const sum = (f: (r: AssetDetailRow) => number) => rows.reduce((t, r) => t + f(r), 0)

    return (
      <>
        <Space wrap size={12} className="mb-3">
          <Input
            prefix={<SearchOutlined style={{ color: 'var(--app-text-2)' }} />}
            placeholder="ค้นหาเลขครุภัณฑ์ หรือชื่อรายการ..."
            value={detailSearch}
            onChange={e => { setDetailSearch(e.target.value); resetDetailPages() }}
            allowClear
            style={{ width: 320 }}
          />
          <Select
            placeholder="ทุกหมวดครุภัณฑ์"
            value={detailCat}
            onChange={v => { setDetailCat(v ?? null); resetDetailPages() }}
            allowClear
            style={{ width: 240 }}
            options={(key === 'gfmis' ? gfmis : daily).rows.map(c => ({
              value: c.category, label: `${c.category} (${int(c.count)})`,
            }))}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            แสดง {int(rows.length)} จาก {int(all.length)} รายการ · ค่าเสื่อมปีนี้รวม {money(sum(r => r.expense))} บาท
          </Text>
          <Button icon={<FaFileExcel />} onClick={() => exportDetails(key, rows)} disabled={loading}>
            ส่งออก Excel
          </Button>
        </Space>

        <Table
          dataSource={rows}
          rowKey="key"
          size="small"
          loading={loading}
          columns={detailColumns}
          scroll={{ x: 1670 }}
          pagination={{
            ...detailPage,
            showSizeChanger: true,
            pageSizeOptions: [20, 50, 100, 200],
            showTotal: (t, r) => `${r[0]}-${r[1]} จาก ${int(t)} รายการ`,
            onChange: (current, pageSize) => setDetailPage({ current, pageSize }),
          }}
        />
      </>
    )
  }

  // ── ส่งออก Excel ────────────────────────────────────────────────────────────
  // ส่งออกเฉพาะแถวที่กรองอยู่บนหน้าจอ เพื่อให้ไฟล์ตรงกับที่เห็น ไม่ใช่ทั้งทะเบียน
  // ตัวเลขส่งเป็น number ไม่ใช่ข้อความจัดรูปแบบ จะได้เอาไปคำนวณต่อใน Excel ได้
  // ปัดเป็นทศนิยม 2 ตำแหน่งให้ตรงกับที่แสดงบนหน้าจอ ไม่งั้นไฟล์จะได้ค่าดิบแบบ 41048.83825136612
  // แล้วยอดรวมใน Excel จะไม่ตรงกับยอดในรายงาน
  const n2 = (v: number) => Math.round(v * 100) / 100

  const saveXlsx = (data: Record<string, string | number>[], sheet: string, name: string) => {
    if (data.length === 0) { message.info('ไม่มีรายการให้ส่งออก'); return }
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheet)
    const tag = titleSuffix.replace(/[()\s]/g, '')
    XLSX.writeFile(wb, `${name}_ปีงบ${fy}_${tag}_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`)
  }

  const exportDetails = (key: Basis, rows: AssetDetailRow[]) =>
    saveXlsx(rows.map((r, i) => ({
      'ลำดับ': i + 1,
      'เลขครุภัณฑ์': r.noid,
      'รายการ': r.names,
      'หมวดครุภัณฑ์': r.category,
      'วันที่รับ': thaiDate(r.receive),
      'ราคาทุน': n2(r.cost),
      'ค่าเสื่อมสะสมยกมา': n2(r.opening),
      [`ค่าเสื่อมปีงบ ${fy}`]: n2(r.expense),
      'ค่าเสื่อมสะสมปลายปี': n2(r.closing),
      [`คงเหลือจนถึง ${residual} บาท`]: n2(r.remaining),
      'มูลค่าสุทธิปลายปี': n2(r.nbv),
      'เกณฑ์ที่ใช้คิด': BASIS_LABEL[key],
    })), `รายการปีงบ ${fy}`, 'รายการครุภัณฑ์ที่นับเข้ารายงาน')

  const exportResidual = (rows: ResidualDetailRow[]) =>
    saveXlsx(rows.map((r, i) => ({
      'ลำดับ': i + 1,
      'เลขครุภัณฑ์': r.noid,
      'รายการ': r.names,
      'หมวดครุภัณฑ์': r.category,
      'วันที่รับ': thaiDate(r.receive),
      'ราคาทุน': n2(r.cost),
      'ค่าเสื่อมสะสมทั้งหมด': n2(r.closing),
      [`ค่าเสื่อมปีงบ ${fy}`]: n2(r.expense),
      'ปีงบที่คิดครบ': r.finishedFy,
      ...(residualIncludesActive ? {
        'คงเหลือรอคิด': n2(r.remaining),
        'สถานะ': r.finished ? 'คิดครบแล้ว' : 'ยังคิดค่าเสื่อมอยู่',
      } : {}),
      'มูลค่าสุทธิ': n2(r.nbv),
      'เกณฑ์ที่ใช้คิด': BASIS_LABEL[residualBasis],
    })),
      residualIncludesActive ? `ทะเบียนที่ถือครอง ${fy}` : `คิดครบแล้ว ${fy}`,
      residualIncludesActive ? 'ทะเบียนครุภัณฑ์ที่ถือครอง' : 'ครุภัณฑ์ที่คิดค่าเสื่อมครบแล้ว')

  // ── แท็บ: ครุภัณฑ์ที่คิดค่าเสื่อมครบแล้ว ──────────────────────────────────
  const residualDetailColumns = [
    seqColumn(donePage),
    {
      title: 'เลขครุภัณฑ์', dataIndex: 'noid', key: 'noid', width: 150, fixed: 'left' as const,
      render: (v: string) => <code style={{ color: '#a78bfa' }}>{v}</code>,
    },
    {
      title: 'รายการ', dataIndex: 'names', key: 'names', width: 300, ellipsis: true,
      render: (v: string) => v || <Text type="secondary">(ไม่มีชื่อรายการ)</Text>,
    },
    { title: 'หมวดครุภัณฑ์', dataIndex: 'category', key: 'category', width: 170, ellipsis: true },
    {
      title: 'วันที่รับ', dataIndex: 'receive', key: 'receive', width: 110,
      render: (v: string) => <span style={{ fontFamily: 'monospace' }}>{thaiDate(v) || '-'}</span>,
      sorter: (a: ResidualDetailRow, b: ResidualDetailRow) => a.receive.localeCompare(b.receive),
    },
    {
      title: 'ราคาทุน', dataIndex: 'cost', key: 'cost', width: 140, align: 'right' as const,
      sorter: (a: ResidualDetailRow, b: ResidualDetailRow) => a.cost - b.cost,
      render: (v: number) => <span style={{ fontFamily: 'monospace' }}>{money(v)}</span>,
    },
    {
      title: 'ค่าเสื่อมสะสมทั้งหมด', dataIndex: 'closing', key: 'closing', width: 175, align: 'right' as const,
      render: (v: number) => <span style={{ fontFamily: 'monospace' }}>{money(v)}</span>,
    },
    {
      title: `ค่าเสื่อมปีงบ ${fy}`, dataIndex: 'expense', key: 'expense', width: 150, align: 'right' as const,
      sorter: (a: ResidualDetailRow, b: ResidualDetailRow) => a.expense - b.expense,
      render: (v: number) => v > 0
        ? <span style={{ fontFamily: 'monospace', color: '#f59e0b', fontWeight: 600 }}>{money(v)}</span>
        : <span style={{ color: 'var(--app-text-3)' }}>—</span>,
    },
    {
      title: 'ปีงบที่คิดครบ', dataIndex: 'finishedFy', key: 'finishedFy', width: 140, align: 'center' as const,
      defaultSortOrder: 'descend' as const,
      sorter: (a: ResidualDetailRow, b: ResidualDetailRow) => a.finishedFy - b.finishedFy,
      render: (v: number, r: ResidualDetailRow) => {
        if (!r.finished) return <Tag color="blue">จะครบปี {v}</Tag>
        return v === fy ? <Tag color="orange">ครบปีนี้ ({v})</Tag> : <Tag>{v}</Tag>
      },
    },
    // คอลัมน์นี้มีความหมายเฉพาะตอนที่มีของที่ยังคิดค่าเสื่อมอยู่ปนอยู่ในตาราง
    ...(residualIncludesActive ? [{
      title: (
        <Tooltip title={`ค่าเสื่อมที่ยังคิดได้อีก จนมูลค่าสุทธิเหลือ ${money(residual)} บาท`}>
          <span style={{ cursor: 'help' }}>คงเหลือรอคิด (?)</span>
        </Tooltip>
      ),
      dataIndex: 'remaining', key: 'remaining', width: 150, align: 'right' as const,
      sorter: (a: ResidualDetailRow, b: ResidualDetailRow) => a.remaining - b.remaining,
      render: (v: number) => v <= 0
        ? <span style={{ color: 'var(--app-text-3)' }}>—</span>
        : <span style={{ fontFamily: 'monospace', color: '#60a5fa' }}>{money(v)}</span>,
    }] : []),
    {
      title: 'มูลค่าสุทธิ', dataIndex: 'nbv', key: 'nbv', width: 130, align: 'right' as const,
      sorter: (a: ResidualDetailRow, b: ResidualDetailRow) => a.nbv - b.nbv,
      render: (v: number) => <span style={{ fontFamily: 'monospace', color: '#10b981' }}>{money(v)}</span>,
    },
    ...(residualIncludesActive ? [{
      title: 'สถานะ', dataIndex: 'finished', key: 'finished', width: 140, align: 'center' as const,
      render: (v: boolean) => v
        ? <Tag color="default">คิดครบแล้ว</Tag>
        : <Tag color="green">ยังคิดค่าเสื่อมอยู่</Tag>,
    }] : []),
    printColumn,
  ]

  // ลำดับของตารางสรุปหมวด — ไม่มีการแบ่งหน้า เลขจึงไล่ตามแถวได้ตรง ๆ
  const doneColumns = [
    {
      title: 'ลำดับ', key: 'seq', width: 70, align: 'center' as const,
      render: (_: unknown, __: unknown, index: number) => (
        <span style={{ fontFamily: 'monospace', color: 'var(--app-text-3)' }}>{index + 1}</span>
      ),
    },
    ...columns,
  ]

  const residualTable = () => {
    const q = detailSearch.trim().toLowerCase()
    const rows = done.details.filter(r =>
      (!detailCat || r.category === detailCat) &&
      (doneStatus === null || r.finished === doneStatus) &&
      (!q || r.noid.toLowerCase().includes(q) || r.names.toLowerCase().includes(q)))
    const finishedThisYear = done.details.filter(r => r.finished && r.finishedFy === fy).length

    return (
      <>
        {allError && (
          <Alert type="error" showIcon className="mb-4" title="ดึงข้อมูลชุดเต็มไม่สำเร็จ" description={allError} />
        )}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={12} md={6}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Statistic
                title={residualIncludesActive
                  ? 'ครุภัณฑ์ที่ถือครองทั้งหมด'
                  : `คิดค่าเสื่อมครบแล้ว (เหลือ ${money(residual)} บาท)`}
                value={done.total.count}
                suffix="รายการ"
              />
              {residualIncludesActive && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  คิดครบแล้ว {int(done.finishedCount)} · ยังคิดอยู่ {int(done.activeCount)}
                </Text>
              )}
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Statistic title="ราคาทุนรวม" value={done.total.cost} precision={2} suffix="บาท" />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Statistic
                title={residualIncludesActive ? `ค่าเสื่อมประจำปี ${fy}` : `เพิ่งคิดครบในปีงบ ${fy}`}
                value={residualIncludesActive ? done.total.expense : finishedThisYear}
                precision={residualIncludesActive ? 2 : 0}
                suffix={residualIncludesActive ? 'บาท' : 'รายการ'}
                styles={{ content: { color: '#f59e0b' } }}
              />
              {residualIncludesActive && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  คิดครบในปีนี้ {int(finishedThisYear)} รายการ
                </Text>
              )}
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Statistic
                title="มูลค่าสุทธิคงเหลือรวม"
                value={done.total.nbv}
                precision={2}
                suffix="บาท"
                styles={{ content: { color: '#10b981' } }}
              />
            </Card>
          </Col>
        </Row>

        <Table
          dataSource={doneRows}
          rowKey="key"
          size="small"
          loading={allLoading}
          pagination={false}
          scroll={{ x: 1120 }}
          columns={doneColumns}
          rowClassName={r => EXTRA_CAT_KEYS.includes(r.key) ? 'depreciation-excluded-row' : ''}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row style={{ background: 'rgba(255, 101, 0, 0.08)' }}>
                <Table.Summary.Cell index={0} colSpan={2}><Text strong>รวมทั้งสิ้น</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <Text strong style={{ fontFamily: 'monospace' }}>{int(doneTotal.count)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <Text strong style={{ fontFamily: 'monospace' }}>{money(doneTotal.cost)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <Text strong style={{ fontFamily: 'monospace' }}>{money(doneTotal.opening)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <Text strong style={{ fontFamily: 'monospace', color: '#f59e0b' }}>{money(doneTotal.expense)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <Text strong style={{ fontFamily: 'monospace' }}>{money(doneTotal.closing)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right">
                  <Text strong style={{ fontFamily: 'monospace', color: '#10b981' }}>{money(doneTotal.nbv)}</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />

        {rowSection((
          <>
            <Space wrap size={12} className="mb-3">
              <Input
                prefix={<SearchOutlined style={{ color: 'var(--app-text-2)' }} />}
                placeholder="ค้นหาเลขครุภัณฑ์ หรือชื่อรายการ..."
                value={detailSearch}
                onChange={e => { setDetailSearch(e.target.value); resetDetailPages() }}
                allowClear
                style={{ width: 320 }}
              />
              <Select
                placeholder="ทุกหมวดครุภัณฑ์"
                value={detailCat}
                onChange={v => { setDetailCat(v ?? null); resetDetailPages() }}
                allowClear
                style={{ width: 240 }}
                options={done.rows.map(c => ({ value: c.category, label: `${c.category} (${int(c.count)})` }))}
              />
              {residualIncludesActive && (
                <Select
                  placeholder="ทุกสถานะ"
                  value={doneStatus}
                  onChange={v => { setDoneStatus(v ?? null); setDonePage(firstPage) }}
                  allowClear
                  style={{ width: 210 }}
                  options={[
                    { value: true, label: `คิดครบแล้ว (${int(done.finishedCount)})` },
                    { value: false, label: `ยังคิดค่าเสื่อมอยู่ (${int(done.activeCount)})` },
                  ]}
                />
              )}
              <Text type="secondary" style={{ fontSize: 12 }}>
                แสดง {int(rows.length)} จาก {int(done.details.length)} รายการ
              </Text>
              <Button icon={<FaFileExcel />} onClick={() => exportResidual(rows)} disabled={allLoading}>
                ส่งออก Excel
              </Button>
            </Space>

            <Table
              dataSource={rows}
              rowKey="key"
              size="small"
              loading={allLoading}
              columns={residualDetailColumns}
              scroll={{ x: residualIncludesActive ? 1870 : 1570 }}
              pagination={{
                ...donePage,
                showSizeChanger: true,
                pageSizeOptions: [20, 50, 100, 200],
                showTotal: (t, r) => `${r[0]}-${r[1]} จาก ${int(t)} รายการ`,
                onChange: (current, pageSize) => setDonePage({ current, pageSize }),
              }}
            />
          </>
        ), done.details.length)}
      </>
    )
  }

  // ── ตาราง: รายการที่ไม่เข้าเงื่อนไขการคำนวณ ────────────────────────────────
  const excludedColumns = [
    seqColumn(exPage),
    {
      title: 'เลขครุภัณฑ์', dataIndex: 'noid', key: 'noid', width: 150, fixed: 'left' as const,
      render: (v: string) => <code style={{ color: '#a78bfa' }}>{v}</code>,
    },
    {
      title: 'รายการ', dataIndex: 'names', key: 'names', width: 300, ellipsis: true,
      render: (v: string) => v || <Text type="secondary">(ไม่มีชื่อรายการ)</Text>,
    },
    { title: 'หมวดครุภัณฑ์', dataIndex: 'category', key: 'category', width: 170, ellipsis: true },
    {
      title: 'วันที่รับ', dataIndex: 'receive', key: 'receive', width: 110,
      sorter: (a: ExcludedDetailRow, b: ExcludedDetailRow) => a.receive.localeCompare(b.receive),
      render: (v: string) => v
        ? <span style={{ fontFamily: 'monospace' }}>{thaiDate(v)}</span>
        : <Tag color="warning">ไม่มีข้อมูล</Tag>,
    },
    {
      title: 'ราคาต่อหน่วย', dataIndex: 'cost', key: 'cost', width: 140, align: 'right' as const,
      defaultSortOrder: 'descend' as const,
      sorter: (a: ExcludedDetailRow, b: ExcludedDetailRow) => a.cost - b.cost,
      render: (v: number) => v > 0
        ? <span style={{ fontFamily: 'monospace' }}>{money(v)}</span>
        : <Tag color="warning">ไม่มีข้อมูล</Tag>,
    },
    {
      title: (
        <Tooltip title="เกณฑ์มูลค่าขั้นต่ำที่ใช้กับวันที่รับของรายการนั้น">
          <span style={{ cursor: 'help' }}>เกณฑ์ที่ใช้ (?)</span>
        </Tooltip>
      ),
      dataIndex: 'threshold', key: 'threshold', width: 130, align: 'right' as const,
      render: (v: number | null) => v == null
        ? <span style={{ color: 'var(--app-text-3)' }}>—</span>
        : <span style={{ fontFamily: 'monospace', color: 'var(--app-text-2)' }}>{money(v)}</span>,
    },
    {
      title: 'อายุใช้งาน (ปี)', dataIndex: 'lifeYears', key: 'lifeYears', width: 130, align: 'right' as const,
      render: (v: number | null) => v == null
        ? <Tag color="warning">ไม่มีข้อมูล</Tag>
        : <span style={{ fontFamily: 'monospace' }}>{v}</span>,
    },
    {
      title: 'สาเหตุที่ไม่เข้าเงื่อนไข', dataIndex: 'reason', key: 'reason', width: 220,
      render: (v: ExcludedDetailRow['reason']) => v === 'BELOW_THRESHOLD'
        ? <Tag color="orange">{EXCLUDED_REASON[v]}</Tag>
        : <Tag color="red">{EXCLUDED_REASON[v]}</Tag>,
    },
  ]

  const exportExcluded = (rows: ExcludedDetailRow[]) =>
    saveXlsx(rows.map((r, i) => ({
      'ลำดับ': i + 1,
      'เลขครุภัณฑ์': r.noid,
      'รายการ': r.names,
      'หมวดครุภัณฑ์': r.category,
      'วันที่รับ': thaiDate(r.receive),
      'ราคาต่อหน่วย': n2(r.cost),
      'เกณฑ์ที่ใช้': r.threshold ?? '',
      'อายุใช้งาน (ปี)': r.lifeYears ?? '',
      'สาเหตุที่ไม่เข้าเงื่อนไข': EXCLUDED_REASON[r.reason],
    })), `ไม่เข้าเงื่อนไข ${fy}`, 'รายการที่ไม่เข้าเงื่อนไขการคำนวณ')

  // หมวดครุภัณฑ์ของตารางนี้ต้องนับจากรายการที่ถูกคัดออกเอง
  // ใช้รายชื่อหมวดจากรายงานหลักไม่ได้ เพราะของที่ไม่เข้าเงื่อนไขไม่ได้อยู่ในนั้น
  const excludedCatOptions = useMemo(() => {
    const byCat = new Map<string, number>()
    for (const r of excluded.rows) byCat.set(r.category, (byCat.get(r.category) ?? 0) + 1)
    return [...byCat.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'th'))
      .map(([category, n]) => ({ value: category, label: `${category} (${int(n)})` }))
  }, [excluded])

  const excludedSection = () => {
    const q = exSearch.trim().toLowerCase()
    const rows = excluded.rows.filter(r =>
      (!exReason || r.reason === exReason) &&
      (!exCat || r.category === exCat) &&
      (!q || r.noid.toLowerCase().includes(q) || r.names.toLowerCase().includes(q)))
    const busy = isResidual ? allLoading : loading

    return (
      <>
        <Alert
          type="info"
          showIcon
          className="mb-3"
          title="รายการเหล่านี้ไม่ถูกนับในยอดค่าเสื่อมของรายงานข้างบน"
          description={
            <>
              ของที่ราคาต่ำกว่าเกณฑ์ถือเป็นวัสดุ ตัดเป็นค่าใช้จ่ายทั้งจำนวนในปีที่ได้มา จึงไม่คิดค่าเสื่อม ·
              ส่วนที่ขึ้นว่าไม่มีข้อมูล คือทะเบียนกรอกไม่ครบจนคำนวณให้ไม่ได้ ควรแจ้งงานพัสดุแก้ต้นทาง
              {' · '}นับจากทะเบียนชุดที่แท็บ
              {isResidual ? 'ทะเบียนที่ถือครอง' : 'นี้'}ใช้ ({int(excludedSet.length)} รายการ)
            </>
          }
        />

        <Space wrap size={12} className="mb-3">
          <Input
            prefix={<SearchOutlined style={{ color: 'var(--app-text-2)' }} />}
            placeholder="ค้นหาเลขครุภัณฑ์ หรือชื่อรายการ..."
            value={exSearch}
            onChange={e => { setExSearch(e.target.value); setExPage(firstPage) }}
            allowClear
            style={{ width: 320 }}
          />
          <Select
            showSearch
            placeholder="ทุกหมวดครุภัณฑ์"
            value={exCat}
            onChange={v => { setExCat(v ?? null); setExPage(firstPage) }}
            allowClear
            optionFilterProp="label"
            style={{ width: 260 }}
            options={excludedCatOptions}
          />
          <Select
            placeholder="ทุกสาเหตุ"
            value={exReason}
            onChange={v => { setExReason(v ?? null); setExPage(firstPage) }}
            allowClear
            style={{ width: 300 }}
            options={(Object.keys(EXCLUDED_REASON) as ExcludedDetailRow['reason'][])
              .filter(k => excluded.byReason[k] > 0)
              .map(k => ({ value: k, label: `${EXCLUDED_REASON[k]} (${int(excluded.byReason[k])})` }))}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            แสดง {int(rows.length)} จาก {int(excluded.rows.length)} รายการ ·
            มูลค่าที่ต่ำกว่าเกณฑ์ของที่แสดงอยู่{' '}
            {money(rows.reduce((t, r) => t + (r.reason === 'BELOW_THRESHOLD' ? r.cost : 0), 0))} บาท
          </Text>
          <Button icon={<FaFileExcel />} onClick={() => exportExcluded(rows)} disabled={busy}>
            ส่งออก Excel
          </Button>
        </Space>

        <Table
          dataSource={rows}
          rowKey="key"
          size="small"
          loading={busy}
          columns={excludedColumns}
          scroll={{ x: 1420 }}
          pagination={{
            ...exPage,
            showSizeChanger: true,
            pageSizeOptions: [20, 50, 100, 200],
            showTotal: (t, r) => `${r[0]}-${r[1]} จาก ${int(t)} รายการ`,
            onChange: (current, pageSize) => setExPage({ current, pageSize }),
          }}
        />
      </>
    )
  }

  /**
   * ส่วนตารางรายตัวท้ายแท็บ — รวมของที่นับเข้ารายงาน ของที่ไม่เข้าเงื่อนไข
   * และแดชบอร์ดกราฟ ไว้เป็นแท็บย่อย ดูสลับกันได้ในที่เดียว
   */
  /** แดชบอร์ดผู้บริหาร — 4 มุมที่ข้อมูลค่าเสื่อมราคาตอบได้ */
  const dashboardSection = () => {
    const rows = view.rows
    const total = view.total
    const cats = [...rows].sort((a, b) => b.expense - a.expense)
    // ยอดใหญ่ระดับร้อยล้าน อ่านเป็นบาทบนแกนไม่รู้เรื่อง จึงคิดเป็นล้านบาท
    const mn = (v: number) => Math.round((v / 1e6) * 100) / 100
    const bahtTip = (v: number) => `${money(v)} บาท`
    const pct = total.cost > 0 ? (total.closing / total.cost) * 100 : 0
    const excludedCost = excluded.rows.reduce((t, r) => t + r.cost, 0)

    // ค่าคงที่ของกราฟที่ใช้ซ้ำ
    // พื้นหลังต้องโปร่งใส ไม่งั้นธีม dark ของ ECharts จะทาสีพื้นของตัวเองทับพื้นการ์ด
    const chartBase = { backgroundColor: 'transparent' }
    const grid = { left: 8, right: 16, top: 30, bottom: 8, containLabel: true }
    const axisMn = { type: 'value' as const, name: 'ล้านบาท', nameTextStyle: { fontSize: 10 } }

    // ── ข้อ 1 ต้นทุนที่แท้จริงของการให้บริการ ──
    const top = cats.slice(0, 10).reverse()
    const expenseOption = {
      ...chartBase,
      grid,
      tooltip: {
        trigger: 'axis' as const, axisPointer: { type: 'shadow' as const },
        valueFormatter: (v: number) => `${money(v * 1e6)} บาท`,
      },
      xAxis: axisMn,
      yAxis: { type: 'category' as const, data: top.map(r => r.category), axisLabel: { fontSize: 11 } },
      series: [{
        type: 'bar' as const,
        name: `ค่าเสื่อมปีงบ ${fy}`,
        data: top.map(r => mn(r.expense)),
        itemStyle: { color: '#f59e0b', borderRadius: [0, 4, 4, 0] },
        label: {
          show: true, position: 'right' as const, fontSize: 10,
          formatter: (p: { value: number }) => p.value >= 0.01 ? `${p.value.toFixed(2)} ล.` : '',
        },
      }],
    }

    const sharePie = {
      ...chartBase,
      tooltip: { trigger: 'item' as const, valueFormatter: (v: number) => bahtTip(v) },
      legend: { type: 'scroll' as const, bottom: 0, textStyle: { fontSize: 10 } },
      series: [{
        type: 'pie' as const,
        radius: ['42%', '68%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        label: { show: true, formatter: '{d}%', fontSize: 10 },
        data: cats.filter(r => r.expense > 0).map(r => ({ name: r.category, value: r.expense })),
      }],
    }

    // ── ข้อ 2 มูลค่าสินทรัพย์ในงบแสดงฐานะการเงิน ──
    const byCost = [...rows].sort((a, b) => b.cost - a.cost).slice(0, 10).reverse()
    const bookValueOption = {
      ...chartBase,
      grid,
      tooltip: {
        trigger: 'axis' as const, axisPointer: { type: 'shadow' as const },
        valueFormatter: (v: number) => `${money(v * 1e6)} บาท`,
      },
      legend: { top: 0, textStyle: { fontSize: 10 } },
      xAxis: axisMn,
      yAxis: { type: 'category' as const, data: byCost.map(r => r.category), axisLabel: { fontSize: 11 } },
      series: [
        {
          type: 'bar' as const, stack: 'cost', name: 'ค่าเสื่อมสะสม',
          data: byCost.map(r => mn(r.closing)), itemStyle: { color: '#6366f1' },
        },
        {
          type: 'bar' as const, stack: 'cost', name: 'มูลค่าสุทธิตามบัญชี',
          data: byCost.map(r => mn(r.nbv)), itemStyle: { color: '#10b981' },
        },
      ],
    }

    const nbvGauge = {
      ...chartBase,
      tooltip: { trigger: 'item' as const, valueFormatter: (v: number) => bahtTip(v) },
      legend: { bottom: 0, textStyle: { fontSize: 11 } },
      series: [{
        type: 'pie' as const,
        radius: ['58%', '78%'],
        center: ['50%', '44%'],
        label: {
          show: true, position: 'center' as const,
          formatter: `เสื่อมแล้ว\n{a|${pct.toFixed(1)}%}`,
          rich: { a: { fontSize: 20, fontWeight: 'bold', color: '#6366f1', lineHeight: 28 } },
          fontSize: 11,
        },
        labelLine: { show: false },
        data: [
          { name: 'ค่าเสื่อมสะสม', value: total.closing, itemStyle: { color: '#6366f1' } },
          { name: 'มูลค่าสุทธิคงเหลือ', value: total.nbv, itemStyle: { color: '#10b981' } },
        ],
      }],
    }

    // ── ข้อ 3 สินทรัพย์ใกล้หมดอายุการใช้งาน ──
    const buckets = expiry?.buckets ?? []
    const expiryOption = {
      ...chartBase,
      grid: { ...grid, right: 60 },
      tooltip: { trigger: 'axis' as const, axisPointer: { type: 'cross' as const } },
      legend: { top: 0, textStyle: { fontSize: 10 } },
      xAxis: {
        type: 'category' as const,
        data: buckets.map(b => `ปีงบ ${b.fyBE}${b.fyBE === fy ? ' (ปีนี้)' : ''}`),
        axisLabel: { fontSize: 10 },
      },
      yAxis: [
        { type: 'value' as const, name: 'รายการ', nameTextStyle: { fontSize: 10 } },
        { type: 'value' as const, name: 'ล้านบาท', nameTextStyle: { fontSize: 10 }, splitLine: { show: false } },
      ],
      series: [
        {
          type: 'bar' as const, name: 'จำนวนที่จะครบอายุ', yAxisIndex: 0,
          data: buckets.map(b => b.count),
          itemStyle: { color: '#60a5fa', borderRadius: [4, 4, 0, 0] },
          label: { show: true, position: 'top' as const, fontSize: 10 },
        },
        {
          type: 'line' as const, name: 'ราคาทุนรวม (กรอบงบทดแทน)', yAxisIndex: 1, smooth: true,
          data: buckets.map(b => mn(b.cost)),
          itemStyle: { color: '#f59e0b' }, lineStyle: { width: 2 },
        },
      ],
    }

    const expiringSoon = (expiry?.items ?? []).slice(0, 8)

    // ── ข้อ 4 การควบคุมทรัพย์สิน ──
    const controlOption = {
      ...chartBase,
      tooltip: { trigger: 'item' as const, valueFormatter: (v: number) => `${int(v)} รายการ` },
      legend: { type: 'scroll' as const, bottom: 0, textStyle: { fontSize: 10 } },
      series: [{
        type: 'pie' as const,
        radius: ['40%', '66%'],
        center: ['50%', '44%'],
        label: { show: true, formatter: '{b}\n{c} ({d}%)', fontSize: 10 },
        data: [
          {
            name: residualIncludesActive && isResidual ? 'ยังคิดค่าเสื่อมอยู่' : 'อยู่ในรายงานค่าเสื่อม',
            value: isResidual ? done.activeCount : total.count,
            itemStyle: { color: '#10b981' },
          },
          ...(isResidual ? [{
            name: 'คิดครบแล้ว — ควรตรวจสภาพ/พิจารณาจำหน่าย',
            value: done.finishedCount,
            itemStyle: { color: '#94a3b8' },
          }] : []),
          {
            name: 'ไม่เข้าเงื่อนไขการคำนวณ',
            value: excluded.rows.length,
            itemStyle: { color: '#f59e0b' },
          },
        ].filter(d => d.value > 0),
      }],
    }

    const reasonOption = {
      ...chartBase,
      grid: { left: 8, right: 40, top: 10, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
      xAxis: { type: 'value' as const },
      yAxis: {
        type: 'category' as const,
        data: (Object.keys(EXCLUDED_REASON) as ExcludedDetailRow['reason'][])
          .filter(k => excluded.byReason[k] > 0).reverse().map(k => EXCLUDED_REASON[k]),
        axisLabel: { fontSize: 11 },
      },
      series: [{
        type: 'bar' as const, name: 'จำนวนรายการ',
        data: (Object.keys(EXCLUDED_REASON) as ExcludedDetailRow['reason'][])
          .filter(k => excluded.byReason[k] > 0).reverse().map(k => excluded.byReason[k]),
        itemStyle: { color: '#f59e0b', borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right' as const, fontSize: 10 },
      }],
    }

    const cardStyle = { borderRadius: 14, height: '100%' } as const
    const note = (text: string) => (
      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>{text}</Text>
    )

    if (!rows.length) {
      return <Alert type="info" showIcon title={`ปีงบ ${fy} ยังไม่มีข้อมูลพอสำหรับทำแดชบอร์ด`} />
    }

    return (
      <>
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={12} md={6}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Statistic title="ราคาทุนรวม (ทรัพย์สินที่ถือครอง)" value={total.cost} precision={2} suffix="บาท" />
              <Text type="secondary" style={{ fontSize: 11 }}>{int(total.count)} รายการ</Text>
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Statistic
                title={`ค่าเสื่อมประจำปี ${fy} (ต้นทุนบริการปีนี้)`}
                value={total.expense} precision={2} suffix="บาท"
                styles={{ content: { color: '#f59e0b' } }}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                เฉลี่ยเดือนละ {money(total.expense / 12)} บาท
              </Text>
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Statistic
                title="ค่าเสื่อมสะสมปลายปี" value={total.closing} precision={2} suffix="บาท"
                styles={{ content: { color: '#6366f1' } }}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>คิดไปแล้ว {pct.toFixed(1)}% ของราคาทุน</Text>
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Statistic
                title="มูลค่าสุทธิตามบัญชีปลายปี" value={total.nbv} precision={2} suffix="บาท"
                styles={{ content: { color: '#10b981' } }}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>ยอดที่แสดงในงบแสดงฐานะการเงิน</Text>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          {/* ข้อ 1 */}
          <Col xs={24} xl={16}>
            <Card size="small" style={cardStyle} title={<Space size={6}><Tag color="orange">1</Tag>ต้นทุนที่แท้จริงของการให้บริการ — ค่าเสื่อมปีงบ {fy} แยกตามหมวด</Space>}>
              {note(`ค่าเสื่อมราคาคือต้นทุนการใช้ทรัพย์สินที่เกิดขึ้นจริงในปีนั้น แม้ไม่มีการจ่ายเงิน · แสดง ${Math.min(10, cats.length)} หมวดที่สูงสุด`)}
              <EChart option={expenseOption} height={320} theme={chartTheme} showToolbar />
            </Card>
          </Col>
          <Col xs={24} xl={8}>
            <Card size="small" style={cardStyle} title="สัดส่วนต้นทุนค่าเสื่อมตามหมวด">
              {note('หมวดที่กินต้นทุนบริการมากที่สุดควรถูกทบทวนอัตราการใช้งานและแผนทดแทนก่อน')}
              <EChart option={sharePie} height={320} theme={chartTheme} showToolbar />
            </Card>
          </Col>

          {/* ข้อ 2 */}
          <Col xs={24} xl={16}>
            <Card size="small" style={cardStyle} title={<Space size={6}><Tag color="orange">2</Tag>มูลค่าสินทรัพย์ในงบแสดงฐานะการเงิน</Space>}>
              {note('ราคาทุน = ค่าเสื่อมสะสม + มูลค่าสุทธิตามบัญชี · ส่วนสีเขียวคือยอดที่ยกไปแสดงในงบแสดงฐานะการเงิน')}
              <EChart option={bookValueOption} height={320} theme={chartTheme} showToolbar />
            </Card>
          </Col>
          <Col xs={24} xl={8}>
            <Card size="small" style={cardStyle} title="สัดส่วนที่คิดค่าเสื่อมไปแล้วทั้งทะเบียน">
              {note(`ราคาทุนรวม ${money(total.cost)} บาท · คิดค่าเสื่อมไปแล้ว ${pct.toFixed(1)}%`)}
              <EChart option={nbvGauge} height={320} theme={chartTheme} showToolbar />
            </Card>
          </Col>

          {/* ข้อ 3 */}
          <Col xs={24} xl={16}>
            <Card size="small" style={cardStyle} title={<Space size={6}><Tag color="orange">3</Tag>การบริหารจัดการ — ครุภัณฑ์ที่จะครบอายุการใช้งานใน 5 ปีงบข้างหน้า</Space>}>
              {note('ใช้วางแผนจัดหาทดแทนหรือซ่อมบำรุงล่วงหน้า · เส้นสีเหลืองคือราคาทุนรวมของปีนั้น ใช้เป็นกรอบงบประมาณถ้าจะทดแทนทั้งหมด'
                + (expiry?.beyond
                  ? ` · อีก ${int(expiry.beyond)} รายการ (ราคาทุน ${money(expiry.beyondCost)} บาท) จะครบอายุหลังปีงบ ${fy + 5} จึงไม่อยู่ในกราฟนี้`
                  : ''))}
              {expiry
                ? <EChart option={expiryOption} height={320} theme={chartTheme} showToolbar />
                : <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>}
            </Card>
          </Col>
          <Col xs={24} xl={8}>
            <Card size="small" style={cardStyle} title="รายการที่ต้องเตรียมแผนก่อน (ราคาทุนสูงสุด)">
              {note('เรียงตามปีที่จะครบอายุ แล้วตามราคาทุน')}
              <Table
                dataSource={expiringSoon}
                rowKey="key"
                size="small"
                pagination={false}
                scroll={{ y: 268 }}
                columns={[
                  {
                    title: 'ครุภัณฑ์', key: 'asset',
                    render: (_: unknown, r: (typeof expiringSoon)[number]) => (
                      <div style={{ lineHeight: 1.35 }}>
                        <code style={{ color: '#a78bfa', fontSize: 11 }}>{r.noid}</code>
                        <div style={{ fontSize: 11, color: 'var(--app-text-2)' }}>
                          {r.names || '(ไม่มีชื่อรายการ)'}
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: 'ครบปีงบ', dataIndex: 'finishFy', key: 'finishFy', width: 90, align: 'center' as const,
                    render: (v: number, r: (typeof expiringSoon)[number]) => r.yearsLeft === 0
                      ? <Tag color="orange">{v} (ปีนี้)</Tag>
                      : <Tag color="blue">{v}</Tag>,
                  },
                  {
                    title: 'ราคาทุน', dataIndex: 'cost', key: 'cost', width: 120, align: 'right' as const,
                    render: (v: number) => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{money(v)}</span>,
                  },
                ]}
              />
            </Card>
          </Col>

          {/* ข้อ 4 */}
          <Col xs={24} xl={12}>
            <Card size="small" style={cardStyle} title={<Space size={6}><Tag color="orange">4</Tag>การควบคุมทรัพย์สิน — สถานะของทะเบียนชุดนี้</Space>}>
              {note(`ทะเบียนชุดที่แท็บนี้ใช้ ${int(excludedSet.length)} รายการ · ของที่คิดค่าเสื่อมครบแล้วควรตรวจนับสภาพและพิจารณาจำหน่ายถ้าหมดสภาพ`)}
              <EChart option={controlOption} height={300} theme={chartTheme} showToolbar />
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card size="small" style={cardStyle} title="คุณภาพข้อมูลทะเบียน — สาเหตุที่ไม่เข้าเงื่อนไขการคำนวณ">
              {note(`รวม ${int(excluded.rows.length)} รายการ ราคาทุน ${money(excludedCost)} บาท · ของที่ขึ้นว่าไม่มีข้อมูลควรแจ้งงานพัสดุแก้ต้นทาง`)}
              {excluded.rows.length
                ? <EChart option={reasonOption} height={300} theme={chartTheme} showToolbar />
                : <Alert type="success" showIcon title="ทุกรายการในทะเบียนชุดนี้เข้าเงื่อนไขการคำนวณครบ" />}
            </Card>
          </Col>
        </Row>
      </>
    )
  }

  const rowSection = (counted: React.ReactNode, countedTotal: number) => (
    <div style={{
      marginTop: 32,
      borderTop: '1px solid var(--app-border)',
      paddingTop: 24,
    }}>
    <Tabs
      size="small"
      type="card"
      className="depreciation-row-tabs"
      tabBarStyle={{ marginBottom: 18 }}
      activeKey={rowTab}
      onChange={k => setRowTab(k as typeof rowTab)}
      items={[
        {
          key: 'counted',
          label: (
            <Space size={6}>
              <span>รายการครุภัณฑ์ที่นับเข้ารายงาน</span>
              <Tag style={{ marginInlineEnd: 0 }}>{int(countedTotal)}</Tag>
            </Space>
          ),
          children: counted,
        },
        {
          key: 'excluded',
          label: (
            <Space size={6}>
              <span>รายการที่ไม่เข้าเงื่อนไขการคำนวณ</span>
              <Tag color={excluded.rows.length ? 'orange' : 'default'} style={{ marginInlineEnd: 0 }}>
                {int(excluded.rows.length)}
              </Tag>
            </Space>
          ),
          children: excludedSection(),
        },
        {
          key: 'dashboard',
          label: (
            <Space size={6}>
              <FaChartPie style={{ fontSize: 12 }} />
              <span>แดชบอร์ดผู้บริหาร</span>
            </Space>
          ),
          children: dashboardSection(),
        },
      ]}
    />
    </div>
  )

  const tableFor = (key: Basis) => {
    const r = key === 'gfmis' ? gfmis : daily
    return (
      <>
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={12} md={6}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Statistic title="ครุภัณฑ์ที่ยังคิดค่าเสื่อม" value={r.total.count} suffix="รายการ" />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Statistic title="ราคาทุนรวม" value={r.total.cost} precision={2} suffix="บาท" />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Statistic
                title={`ค่าเสื่อมประจำปี ${fy}`}
                value={r.total.expense}
                precision={2}
                suffix="บาท"
                styles={{ content: { color: '#f59e0b' } }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" style={{ borderRadius: 12 }}>
              <Statistic
                title="มูลค่าสุทธิปลายปี"
                value={r.total.nbv}
                precision={2}
                suffix="บาท"
                styles={{ content: { color: '#10b981' } }}
              />
            </Card>
          </Col>
        </Row>

        <Table
          dataSource={r.rows}
          rowKey="key"
          size="small"
          loading={loading}
          pagination={false}
          scroll={{ x: 1050 }}
          columns={columns}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row style={{ background: 'rgba(255, 101, 0, 0.08)' }}>
                <Table.Summary.Cell index={0}><Text strong>รวมทั้งสิ้น</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <Text strong style={{ fontFamily: 'monospace' }}>{int(r.total.count)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <Text strong style={{ fontFamily: 'monospace' }}>{money(r.total.cost)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <Text strong style={{ fontFamily: 'monospace' }}>{money(r.total.opening)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <Text strong style={{ fontFamily: 'monospace', color: '#f59e0b' }}>{money(r.total.expense)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <Text strong style={{ fontFamily: 'monospace' }}>{money(r.total.closing)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <Text strong style={{ fontFamily: 'monospace', color: '#10b981' }}>{money(r.total.nbv)}</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />

        {rowSection(detailTableFor(key), r.details.length)}
      </>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--app-bg)' }}>
      <Navbar />
      {/* ไม่จำกัดความกว้าง — ตารางรายการมีคอลัมน์เยอะ ยิ่งกว้างยิ่งไม่ต้องเลื่อนแนวนอน */}
      <div style={{ width: '100%', padding: '20px 24px 48px' }}>
        <Breadcrumb className="mb-6" items={[
          { href: '/home', title: <><HomeOutlined /> หน้าหลัก</> },
          { href: '/general', title: <><FileTextOutlined /> งานบริหารงานทั่วไป</> },
          { title: 'งานพัสดุ' },
          { title: `สรุปค่าเสื่อมราคาประจำปี ${titleSuffix}` },
        ]} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <FaChartPie style={{ fontSize: 26, color: '#FF6500' }} />
          <Title level={3} style={{ margin: 0 }}>สรุปค่าเสื่อมราคาประจำปี {titleSuffix}</Title>
        </div>
        <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
          ค่าเสื่อมราคาประจำปีแยกตามหมวดครุภัณฑ์ · ข้อมูลจาก{sourceLabel}
        </Text>

        <Card style={{ borderRadius: 14, marginBottom: 16 }} styles={{ body: { padding: 14 } }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Space wrap size={16} align="center">
            <Space size={8}>
              <Text type="secondary" style={{ fontSize: 12 }}>ปีงบประมาณ</Text>
              <Select value={fy} onChange={setFy} style={{ width: 210 }} options={fyOptions} />
            </Space>

            <span style={{ borderLeft: '1px solid var(--app-border)', height: 20 }} />

            <Space size={8}>
              <Tooltip title="มูลค่าที่คงไว้เมื่อคิดค่าเสื่อมครบอายุการใช้งาน ตามระเบียบพัสดุคือ 1 บาท">
                <Text type="secondary" style={{ fontSize: 12, cursor: 'help' }}>ราคาซาก (?)</Text>
              </Tooltip>
              <InputNumber
                size="small" min={0} value={residual}
                onChange={v => setResidual(Number(v ?? 0))}
                style={{ width: 90 }}
              />
            </Space>

            <span style={{ borderLeft: '1px solid var(--app-border)', height: 20 }} />

            <Text type="secondary" style={{ fontSize: 12 }}>
              ช่วงปีงบ {periodLabel} (ค.ศ. {fyCE - 1}/{fyCE})
            </Text>

            <Button
              icon={<ReloadOutlined />}
              onClick={() => { setReloadKey(k => k + 1); message.info('กำลังโหลดข้อมูลใหม่') }}
              disabled={loading}
            >
              โหลดใหม่
            </Button>
          </Space>

          {/* เกณฑ์มูลค่าขั้นต่ำเคยเป็นแถบเตือนเต็มความกว้าง กินพื้นที่แสดงข้อมูลไปมาก
              ย้ายมาเป็นไอคอนมุมขวาของการ์ดนี้ รายละเอียดอยู่ใน tooltip */}
          {excluded.byReason.BELOW_THRESHOLD > 0 && (
            <Tooltip
              styles={{ root: { maxWidth: 460 } }}
              title={
                <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    ไม่นับ {int(excluded.byReason.BELOW_THRESHOLD)} รายการที่ราคาต่ำกว่าเกณฑ์ครุภัณฑ์
                    (รวม {money(excluded.belowThresholdCost)} บาท)
                  </div>
                  ของที่รับตั้งแต่ 1 ต.ค. 2562 (ต้นปีงบ 2563) ต้องมีราคาต่อหน่วยตั้งแต่{' '}
                  {int(CAPITAL_MIN_FROM_2563)} บาทขึ้นไป · ที่รับก่อนหน้านั้นใช้เกณฑ์{' '}
                  {int(CAPITAL_MIN_BEFORE_2563)} บาท — ของที่ต่ำกว่าเกณฑ์ถือเป็นวัสดุ
                  ตัดเป็นค่าใช้จ่ายทั้งจำนวนในปีที่ได้มา จึงไม่คิดค่าเสื่อมและไม่อยู่ในยอดทรัพย์สินของรายงานนี้
                  <div style={{ marginTop: 6, opacity: 0.85 }}>
                    ดูรายตัวได้ที่แท็บ “รายการที่ไม่เข้าเงื่อนไขการคำนวณ” ท้ายหน้า
                  </div>
                </div>
              }
            >
              <Space size={6} style={{ marginLeft: 'auto', cursor: 'help', color: '#f59e0b' }}>
                <ExclamationCircleOutlined />
                <Text style={{ fontSize: 12, color: '#f59e0b' }}>
                  ไม่นับ {int(excluded.byReason.BELOW_THRESHOLD)} รายการที่ต่ำกว่าเกณฑ์
                </Text>
              </Space>
            </Tooltip>
          )}
          </div>
        </Card>

        {loadError && (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            title="ดึงข้อมูลครุภัณฑ์ไม่สำเร็จ"
            description={loadError}
          />
        )}

        {!loading && !loadError && assets.length === 0 && (
          <Alert
            type="info"
            showIcon
            className="mb-4"
            title={`ปีงบประมาณ ${fy} ไม่มีครุภัณฑ์ที่ยังคิดค่าเสื่อมราคา`}
          />
        )}

        {!isResidual && current.skipped > 0 && (
          <Alert
            type="info"
            showIcon
            className="mb-4"
            title={`มี ${int(current.skipped)} รายการที่ปีงบ ${fy} ไม่มีค่าเสื่อมเกิดขึ้น จึงไม่นับในรายงานนี้`}
            description={
              <>
                รายงานสองแท็บแรกนับเฉพาะครุภัณฑ์ที่ยังมีค่าเสื่อมเกิดขึ้นจริงในปีงบที่เลือก ·
                ของที่คิดค่าเสื่อมครบแล้วดูได้ที่แท็บ
                <Button type="link" size="small" style={{ padding: '0 4px' }} onClick={() => setTab('residual')}>
                  {residualTabLabel}
                </Button>
              </>
            }
          />
        )}

        <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 16 } }}>
          <Tabs
            type="card"
            className="depreciation-main-tabs"
            tabBarStyle={{ marginBottom: 18 }}
            activeKey={tab}
            onChange={k => {
              setTab(k as Tab)
              // ตัวกรองใช้ร่วมกันทุกแท็บ แต่รายชื่อหมวดของแต่ละแท็บไม่เหมือนกัน
              // ถ้าไม่ล้าง อาจค้างค่าที่แท็บใหม่ไม่มี แล้วเห็นตารางว่างโดยไม่รู้สาเหตุ
              setDetailCat(null)
              setDetailSearch('')
              setDoneStatus(null)
              resetDetailPages()
              setExPage(firstPage)
              // ตารางท้ายหน้าก็เปลี่ยนชุดข้อมูลตามแท็บ รายชื่อหมวดจึงไม่เหมือนกันด้วย
              setExCat(null)
            }}
            tabBarExtraContent={
              // ปุ่มนี้เคยผูก disabled กับข้อมูลที่โหลดหลัง mount ทำให้ค่าที่ SSR เรนเดอร์ไว้
              // ไม่ตรงกับตอน hydrate (React hydration error) จึงเปิดปุ่มไว้เสมอแล้วเช็คตอนกดแทน
              <Space size={8}>
                {isResidual && (
                  <Tooltip
                    title={residualNote()}
                    styles={{ root: { maxWidth: 460 } }}
                    placement="bottomRight"
                  >
                    <InfoCircleOutlined
                      style={{ color: '#FF6500', fontSize: 16, cursor: 'help' }}
                    />
                  </Tooltip>
                )}
                <Tooltip title="พิมพ์รายงานสรุปตามเกณฑ์ของแท็บนี้">
                  <Button
                    icon={<PrinterOutlined />}
                    onClick={() => {
                      if (!reportData) { message.info('ยังไม่มีข้อมูลให้พิมพ์ในแท็บนี้'); return }
                      setPdfOpen(true)
                    }}
                  >
                    พิมพ์รายงาน
                  </Button>
                </Tooltip>
              </Space>
            }
            items={[
              { key: 'daily', label: BASIS_LABEL.daily, children: tableFor('daily') },
              { key: 'gfmis', label: BASIS_LABEL.gfmis, children: tableFor('gfmis') },
              {
                key: 'residual',
                label: (
                  <Space size={6}>
                    <span>{residualLabelOf('daily')}</span>
                    {tab === 'residual' && done.total.count > 0 && (
                      <Tag color="orange" style={{ marginInlineEnd: 0 }}>{int(done.total.count)}</Tag>
                    )}
                  </Space>
                ),
                children: residualTable(),
              },
              {
                // แท็บเดียวกันแต่ตัดสินด้วยเกณฑ์นับเดือนของ GFMIS — ปีที่คิดครบ
                // และรายการที่เข้ารายงานจึงไม่เหมือนแท็บรายวัน เปิดเทียบกันได้
                key: 'residualGfmis',
                label: (
                  <Space size={6}>
                    <span>{residualLabelOf('gfmis')}</span>
                    {tab === 'residualGfmis' && done.total.count > 0 && (
                      <Tag color="orange" style={{ marginInlineEnd: 0 }}>{int(done.total.count)}</Tag>
                    )}
                  </Space>
                ),
                children: residualTable(),
              },
            ]}
          />
        </Card>

        <style>{`
          .depreciation-excluded-row > td { background: rgba(245, 158, 11, 0.06) !important; }

          /* แท็บหลักของเกณฑ์คำนวณ และแท็บย่อยของตารางรายตัว — แบบ card อยู่แล้ว
             แต่ยังกลืนกับพื้นหลัง จึงเน้นแท็บที่เลือกด้วยสีหลักของหน้า
             ให้เห็นชัดว่าคลิกสลับได้ ใช้หน้าตาชุดเดียวกันทั้งสองระดับ */
          .depreciation-main-tabs .ant-tabs-nav::before,
          .depreciation-row-tabs .ant-tabs-nav::before { border-bottom-color: var(--app-border); }
          .depreciation-main-tabs .ant-tabs-tab,
          .depreciation-row-tabs .ant-tabs-tab {
            padding: 8px 18px !important;
            font-weight: 600;
          }
          .depreciation-main-tabs .ant-tabs-tab-btn,
          .depreciation-row-tabs .ant-tabs-tab-btn { color: var(--app-text-2); }
          .depreciation-main-tabs .ant-tabs-tab:hover .ant-tabs-tab-btn,
          .depreciation-row-tabs .ant-tabs-tab:hover .ant-tabs-tab-btn { color: #FF6500; }
          .depreciation-main-tabs .ant-tabs-tab-active,
          .depreciation-row-tabs .ant-tabs-tab-active {
            border-top: 2px solid #FF6500 !important;
            background: rgba(255, 101, 0, 0.10) !important;
          }
          .depreciation-main-tabs .ant-tabs-tab-active .ant-tabs-tab-btn,
          .depreciation-row-tabs .ant-tabs-tab-active .ant-tabs-tab-btn { color: #FF6500 !important; }

          /* แท็บหลักเป็นตัวนำของหน้า จึงให้ตัวอักษรใหญ่กว่าแท็บย่อยหนึ่งขั้น */
          .depreciation-main-tabs .ant-tabs-tab { font-size: 15px; }
        `}</style>

      </div>

      <Modal
        title={
          <Space>
            <FilePdfOutlined style={{ color: '#FF6500' }} />
            <span>สรุปค่าเสื่อมราคาประจำปี {fy} {titleSuffix} · {BASIS_LABEL[basis]}</span>
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
            <span>
              ทะเบียนคุมทรัพย์สิน · {assetPdf?.noid}
              {' · '}{BASIS_LABEL[basis]}
            </span>
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

export default function DepreciationSummaryView(props: DepreciationSummaryViewProps) {
  const { mode } = useThemeMode()
  const isDark = mode === 'dark'
  return (
    <ConfigProvider theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: '#FF6500', borderRadius: 8 } }}>
      <App>
        <PageContent {...props} />
      </App>
    </ConfigProvider>
  )
}
