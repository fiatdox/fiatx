'use client'
import React, { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

type Props = {
  option: echarts.EChartsCoreOption
  height?: number | string
  style?: React.CSSProperties
  className?: string
}

const EChart: React.FC<Props> = ({ option, height = 280, style, className }) => {
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
      chartRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.setOption(option, { notMerge: true })
    }
  }, [option])

  return <div ref={ref} className={className} style={{ width: '100%', height, ...style }} />
}

export default EChart
