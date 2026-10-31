'use client'
import React from 'react'
import Link from 'next/link'
import { Breadcrumb as AntBreadcrumb, type BreadcrumbProps } from 'antd'

// Breadcrumb กลางของระบบ — ใช้แทน Breadcrumb ของ antd ทุกหน้า
// 1) ชื่อหมวดที่ไม่ได้ใส่ href (เช่น "งานทรัพยากรบุคคล", "ระบบบริหารการลา") กดไปหน้าหลักของหมวดได้เอง
// 2) href ที่ชี้ไปหน้าที่ไม่มีอยู่ (เช่น /accounting, /information-technology) เปลี่ยนไปหน้าที่มีจริง
// 3) ลิงก์ใช้ next/link — เปลี่ยนหน้าแบบไม่โหลดใหม่ทั้งหน้า และเติม basePath ให้เอง (<a href> ธรรมดาไม่เติม)

/** ชื่อหมวด → หน้าหลักของหมวด (เลือกหน้าที่บุคลากรทั่วไปเข้าได้ ถ้าหมวดไม่มีหน้ารวม) */
const SECTION_HREF: Record<string, string> = {
  'งานทรัพยากรบุคคล': '/hr/leave',
  'ระบบบริหารการลา': '/hr/leave',
  'การลา': '/hr/leave',
  'บัญชีผู้ใช้': '/account/settings',
  'ผู้ดูแลระบบ': '/account/roles',
  'งานการเงินและบัญชี': '/accounting/salary',
  'การเงินและบัญชี': '/accounting/salary',
  'งานบริหารงานทั่วไป': '/general',
  'ระบบบริหารงานทั่วไป': '/general',
  'งานพัสดุ': '/general/procurement/dashboard',
  'งานครุภัณฑ์': '/general/procurement/asset-by-department',
  'ตั้งค่า': '/general/settings',
  'ตั้งค่าระบบ': '/general/settings',
  'รถราชการ': '/general/vehicle/request',
  'ขอย้ายสิ่งของ / จัดสถานที่': '/general/item-moving',
  'งานข้อมูลทางการแพทย์': '/medical-data/statistics-request',
  'งานพัฒนาระบบบริการ': '/hss/strategy',
  'งานยุทธศาสตร์': '/hss/strategy',
  'งานพัฒนาบุคลากรและการศึกษา': '/hss/hrd',
  'งานคอมพิวเตอร์และเทคโนโลยีสารสนเทศ': '/information-technology/maintenance',
  'งานคอมพิวเตอร์ฯ': '/information-technology/maintenance',
  'งานเทคโนโลยีสารสนเทศ': '/information-technology/maintenance',
  'เทคโนโลยีสารสนเทศ': '/information-technology/maintenance',
}

/** href เดิมที่ไม่มีหน้าจริง → หน้าที่ใช้แทน */
const HREF_ALIAS: Record<string, string> = {
  '/accounting': '/accounting/salary',
  '/information-technology': '/information-technology/maintenance',
}

/** ข้อความล้วนของ title (ตัดไอคอน / แท็ก) */
const textOf = (n: React.ReactNode): string => {
  if (n == null || typeof n === 'boolean') return ''
  if (typeof n === 'string' || typeof n === 'number') return String(n)
  if (Array.isArray(n)) return n.map(textOf).join('')
  if (React.isValidElement<{ children?: React.ReactNode }>(n)) return textOf(n.props.children)
  return ''
}

/** title ที่มีลิงก์/ปุ่มของตัวเองอยู่แล้ว ไม่ห่อลิงก์ซ้อน */
const hasOwnAction = (n: React.ReactNode): boolean => {
  if (Array.isArray(n)) return n.some(hasOwnAction)
  if (!React.isValidElement<{ children?: React.ReactNode; onClick?: unknown; href?: unknown }>(n)) return false
  if (n.type === 'a' || n.props.onClick || n.props.href) return true
  return hasOwnAction(n.props.children)
}

type Item = NonNullable<BreadcrumbProps['items']>[number]

export default function AppBreadcrumb({ items, itemRender, ...rest }: BreadcrumbProps) {
  const filled = items?.map((it: Item, i: number): Item => {
    if (i === items.length - 1 || ('type' in it && it.type === 'separator')) return it
    const own = 'href' in it ? it.href : undefined
    if (own) return HREF_ALIAS[own] ? { ...it, href: HREF_ALIAS[own] } : it
    if (!('title' in it) || hasOwnAction(it.title)) return it
    const href = SECTION_HREF[textOf(it.title).replace(/\s+/g, ' ').trim()]
    return href ? { ...it, href } : it
  })

  return (
    <AntBreadcrumb
      {...rest}
      items={filled}
      itemRender={itemRender ?? ((route, _params, routes) => {
        const last = routes.indexOf(route) === routes.length - 1
        // href ภายนอก / anchor ใช้ <a> ตามเดิม · ภายในแอปใช้ Link
        if (last || !route.href) return <span>{route.title}</span>
        return route.href.startsWith('/') ? <Link href={route.href}>{route.title}</Link> : <a href={route.href}>{route.title}</a>
      })}
    />
  )
}
