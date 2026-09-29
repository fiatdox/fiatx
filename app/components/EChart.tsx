'use client'
import React, { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'
import { Button, Modal, Tooltip } from 'antd'
import { FullscreenOutlined, FullscreenExitOutlined, DownloadOutlined } from '@ant-design/icons'

/** ธีมของ ECharts — สีตัวอักษรแกนและเส้นกริดมาจากตัวนี้ ไม่ใช่จาก option */
export type ChartTheme = 'dark' | 'light'

type Props = {
  option: echarts.EChartsCoreOption
  height?: number | string
  style?: React.CSSProperties
  className?: string
  showToolbar?: boolean
  /**
   * ธีมกราฟ — ค่าตั้งต้นเป็น dark เหมือนเดิม เพื่อไม่ให้หน้าที่ใช้อยู่แล้วเปลี่ยนหน้าตา
   * หน้าที่รองรับสองโหมดให้ส่งค่าตามโหมดของแอปเข้ามา
   */
  theme?: ChartTheme
}

const InnerChart: React.FC<{
  option: echarts.EChartsCoreOption
  height: number | string
  theme: ChartTheme
}> = ({ option, height, theme }) => {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  // เปลี่ยนธีมกลางทางไม่ได้ ต้องสร้างกราฟใหม่ทั้งตัว
  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current, theme, { renderer: 'canvas' })
    chartRef.current = chart
    const resize = () => chart.resize()
    window.addEventListener('resize', resize)
    const ro = new ResizeObserver(resize)
    ro.observe(ref.current)
    return () => {
      window.removeEventListener('resize', resize)
      ro.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [theme])

  // ใส่ option ให้ทั้งตอนแรกและตอนสร้างใหม่เพราะเปลี่ยนธีม (effect นี้อยู่หลังตัวบน
  // จึงได้กราฟตัวใหม่ไปแล้วเสมอ) — ไม่ต้องเรียก setOption ในตัวบนซ้ำอีก
  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true })
  }, [option, theme])

  return <div ref={ref} style={{ width: '100%', height }} />
}

const exportAsSVG = (option: echarts.EChartsCoreOption, theme: ChartTheme) => {
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1400px;height:700px'
  document.body.appendChild(container)
  const tempChart = echarts.init(container, theme, { renderer: 'svg', width: 1400, height: 700 })
  tempChart.setOption(option)
  const svgEl = container.querySelector('svg')
  if (svgEl) {
    const blob = new Blob([svgEl.outerHTML], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chart-${Date.now()}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }
  tempChart.dispose()
  document.body.removeChild(container)
}

const exportAsPNG = (option: echarts.EChartsCoreOption, theme: ChartTheme) => {
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1400px;height:700px'
  document.body.appendChild(container)
  const tempChart = echarts.init(container, theme, { renderer: 'canvas', width: 1400, height: 700 })
  tempChart.setOption(option)
  // ไฟล์ภาพต้องมีพื้นหลังทึบ ไม่งั้นตัวอักษรของธีมสว่างจะจมไปกับพื้นโปร่งใส
  const url = tempChart.getDataURL({
    type: 'png', pixelRatio: 2,
    backgroundColor: theme === 'light' ? '#ffffff' : '#0f172a',
  })
  const a = document.createElement('a')
  a.href = url
  a.download = `chart-${Date.now()}.png`
  a.click()
  tempChart.dispose()
  document.body.removeChild(container)
}

const EChart: React.FC<Props> = ({
  option, height = 280, style, className, showToolbar = false, theme = 'dark',
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  // เปลี่ยนธีมกลางทางไม่ได้ ต้องสร้างกราฟใหม่ทั้งตัว
  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current, theme, { renderer: 'canvas' })
    chartRef.current = chart
    const resize = () => chart.resize()
    window.addEventListener('resize', resize)
    const ro = new ResizeObserver(resize)
    ro.observe(ref.current)
    return () => {
      window.removeEventListener('resize', resize)
      ro.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [theme])

  // ใส่ option ให้ทั้งตอนแรกและตอนสร้างกราฟใหม่เพราะเปลี่ยนธีม
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.setOption(option, { notMerge: true })
    }
  }, [option, theme])

  return (
    <div style={{ position: 'relative' }}>
      {showToolbar && (
        <div style={{ position: 'absolute', top: 4, right: 4, zIndex: 10, display: 'flex', gap: 4 }}>
          <Tooltip title="ส่งออก PNG">
            <Button
              size="small"
              type="text"
              icon={<DownloadOutlined />}
              onClick={() => exportAsPNG(option, theme)}
              style={{ color: '#94a3b8', fontSize: 10 }}
            >
              PNG
            </Button>
          </Tooltip>
          <Tooltip title="ส่งออก SVG">
            <Button
              size="small"
              type="text"
              icon={<DownloadOutlined />}
              onClick={() => exportAsSVG(option, theme)}
              style={{ color: '#94a3b8', fontSize: 10 }}
            >
              SVG
            </Button>
          </Tooltip>
          <Tooltip title="เต็มจอ">
            <Button
              size="small"
              type="text"
              icon={<FullscreenOutlined />}
              onClick={() => setFullscreen(true)}
              style={{ color: '#94a3b8' }}
            />
          </Tooltip>
        </div>
      )}

      <div ref={ref} className={className} style={{ width: '100%', height, ...style }} />

      <Modal
        open={fullscreen}
        onCancel={() => setFullscreen(false)}
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button icon={<DownloadOutlined />} onClick={() => exportAsPNG(option, theme)}>
              ส่งออก PNG
            </Button>
            <Button icon={<DownloadOutlined />} onClick={() => exportAsSVG(option, theme)}>
              ส่งออก SVG
            </Button>
          </div>
        }
        width="92vw"
        style={{ top: 16 }}
        styles={{ body: { padding: 8, height: '78vh' } }}
        closeIcon={<FullscreenExitOutlined />}
        destroyOnHidden
      >
        <InnerChart option={option} height="76vh" theme={theme} />
      </Modal>
    </div>
  )
}

export default EChart
