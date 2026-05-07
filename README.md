# PYHOS-ERP

ระบบบริหารโรงพยาบาลอัจฉริยะ (Ministry Hospital Portal) — Next.js App Router + Ant Design v6 + Tailwind CSS v4
UI ทั้งหมดเป็นภาษาไทย ใช้สำหรับเจ้าหน้าที่และผู้บริหารโรงพยาบาล

## Tech Stack

- **Next.js 16** (App Router, Turbopack) + **React 19**
- **Ant Design v6** (Dark algorithm)
- **Tailwind CSS v4**
- **Apache ECharts 6** + **@svar-ui/react-gantt** สำหรับกราฟและ Gantt
- **react-icons**, **SweetAlert2**, **dayjs**
- **@react-pdf/renderer**, **xlsx** สำหรับ export

## Getting Started

```bash
npm install
npm run dev       # dev server (port 3000)
npm run build     # build production
npm run start     # start production server
npm run lint      # ESLint
```

เปิด [http://localhost:3000](http://localhost:3000) เพื่อเข้าใช้งาน — หน้าแรกคือหน้า Login (เข้าสู่หน้าเมนูหลัก `/home`)

## Module Map

| Path | Module | Highlights |
| --- | --- | --- |
| `/` | Login | Glass-card login, brand panel |
| `/home` | Dashboard ภาพรวม | สรุปทุกฝ่าย |
| `/general/vehicle/*` | งานยานพาหนะ | จองรถ, ติดตามสถานะ, dashboard |
| `/general/maintenance/*` | งานซ่อมบำรุง (อาคาร) | แจ้งซ่อม, dashboard |
| `/general/item-moving/*` | ขอย้ายสิ่งของ / จัดสถานที่ | dashboard |
| `/general/assets/*` | ระบบครุภัณฑ์ | ทะเบียน, QR, ตรวจนับ |
| `/general/procurement/*` | งานพัสดุ | PR/PO, ตรวจรับ, ใบรับ, dashboard |
| `/hr/users` | บุคลากร | ทะเบียนผู้ใช้ |
| `/hr/leave/*` | การลา | ขออนุมัติ, dashboard |
| `/hss/strategy/grant-charts` | แผนยุทธศาสตร์ — Gantt | โครงการ + KPI กระทรวง |
| `/hss/hrd` | งานพัฒนาบุคลากร | — |
| `/information-technology/maintenance/*` | งานซ่อมคอมพิวเตอร์ | แจ้งซ่อม, dashboard |
| `/information-technology/user-request` | ขอรหัสผู้ใช้งานระบบ | — |
| `/information-technology/lan-request` | ขอติดตั้ง LAN | — |
| `/information-technology/hait/*` | HAIT | SLA, อุบัติการณ์, กิจกรรม |
| `/information-technology/smart-hospital/*` | Smart Hospital | dashboard, แก้ไขคะแนน |
| `/information-technology/grant-charts` | แผนโครงการ IT — Gantt | โครงการของกลุ่มงาน IT + KPI IT |
| `/accounting/salary` | การเงิน — สลิปเงินเดือน | — |
| `/accounting/credentials` | ขอสิทธิ์ระบบบัญชี | — |
| `/accounting/accounts-payable` | เจ้าหนี้รอจ่าย | — |

## Page Pattern

- ไม่มี Navbar กลางใน `layout.tsx` — แต่ละหน้าเรียก `<Navbar />` เอง
- ทุกหน้าห่อด้วย `ConfigProvider` (theme.darkAlgorithm) เพื่อกำหนด `colorPrimary` ของฝ่ายตัวเอง
  - ฝ่ายทั่วไป / HR: `#006a5a` (teal)
  - IT / HAIT: `#6B21A8` หรือ `#a855f7` (purple)
  - Procurement: `#FF6500` (orange)
  - HSS Strategy: `#3b82f6` (blue)
- พื้นหลังหลัก `bg-slate-900`, ตัวอักษร `text-slate-200`
- Font: **Sarabun** ผ่าน `next/font` ใน `app/layout.tsx`

## Data

ทุกหน้ายังใช้ **mock data + React state + localStorage** สำหรับเดโม — ยังไม่ได้เชื่อม backend จริง
ตัวอย่างหน้า Gantt (`hss/strategy/grant-charts`, `information-technology/grant-charts`) ใช้ `localStorage` namespace แยกกันสำหรับเก็บ task/link

## Project Structure

```
app/
├── layout.tsx, page.tsx     # Root layout + Login
├── components/
│   ├── Navbar.tsx           # เมนูหลัก (Drawer ซ้าย/ขวา)
│   └── EChart.tsx           # Wrapper สำหรับ Apache ECharts
├── general/                 # งานบริหารงานทั่วไป
├── hr/                      # งานทรัพยากรบุคคล
├── hss/strategy/            # งานยุทธศาสตร์ (HSS)
├── information-technology/  # งานคอมพิวเตอร์และ IT
└── accounting/              # งานการเงินและบัญชี
```
