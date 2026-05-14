'use client'
import React, { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'
import { Button, Modal, Tooltip } from 'antd'
import { FullscreenOutlined, FullscreenExitOutlined, DownloadOutlined } from '@ant-design/icons'

type Props = {
  option: echarts.EChartsCoreOption
  height?: number | string
  style?: React.CSSProperties
  className?: string
  showToolbar?: boolean
}

const InnerChart: React.FC<{ option: echarts.EChartsCoreOption; height: number | string }> = ({ option, height }) => {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current, 'dark', { renderer: 'canvas' })
    chartRef.current = chart
    chart.setOption(option)
    const resize = () => chart.resize()
    window.addEventListener('resize', resize)
    const ro = new ResizeObserver(resize)
    ro.observe(ref.current)
    return () => {
      window.removeEventListener('resize', resize)
      ro.disconnect()
      chart.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true })
  }, [option])

  return <div ref={ref} style={{ width: '100%', height }} />
}

const exportAsSVG = (option: echarts.EChartsCoreOption) => {
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1400px;height:700px'
  document.body.appendChild(container)
  const tempChart = echarts.init(container, 'dark', { renderer: 'svg', width: 1400, height: 700 })
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

const exportAsPNG = (option: echarts.EChartsCoreOption) => {
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1400px;height:700px'
  document.body.appendChild(container)
  const tempChart = echarts.init(container, 'dark', { renderer: 'canvas', width: 1400, height: 700 })
  tempChart.setOption(option)
  const url = tempChart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#0f172a' })
  const a = document.createElement('a')
  a.href = url
  a.download = `chart-${Date.now()}.png`
  a.click()
  tempChart.dispose()
  document.body.removeChild(container)
}

const EChart: React.FC<Props> = ({ option, height = 280, style, className, showToolbar = false }) => {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current, 'dark', { renderer: 'canvas' })
    chartRef.current = chart
    chart.setOption(option)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.setOption(option, { notMerge: true })
    }
  }, [option])

  return (
    <div style={{ position: 'relative' }}>
      {showToolbar && (
        <div style={{ position: 'absolute', top: 4, right: 4, zIndex: 10, display: 'flex', gap: 4 }}>
          <Tooltip title="ส่งออก PNG">
            <Button
              size="small"
              type="text"
              icon={<DownloadOutlined />}
              onClick={() => exportAsPNG(option)}
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
              onClick={() => exportAsSVG(option)}
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
            <Button icon={<DownloadOutlined />} onClick={() => exportAsPNG(option)}>
              ส่งออก PNG
            </Button>
            <Button icon={<DownloadOutlined />} onClick={() => exportAsSVG(option)}>
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
        <InnerChart option={option} height="76vh" />
      </Modal>
    </div>
  )
}

export default EChart
