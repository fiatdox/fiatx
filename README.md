# PYHOS-EXP

**PYHOS-EXP** (PYHOS **EX**perience Platform) — ระบบบริหารโรงพยาบาล (Ministry Hospital Portal) — Next.js App Router + Ant Design v6 + Tailwind CSS v4
UI ทั้งหมดเป็นภาษาไทย ใช้สำหรับเจ้าหน้าที่และผู้บริหารโรงพยาบาล ข้อมูลมาจาก backend `pyhos-erp-api` (Bun + Elysia)

## Tech Stack

- **Next.js 16** (App Router, Turbopack) + **React 19**
- **Ant Design v6** — โหมดสว่างเป็นค่าเริ่มต้น สลับโหมดมืดได้
- **Tailwind CSS v4**
- **Apache ECharts 6** + **@svar-ui/react-gantt** สำหรับกราฟและ Gantt
- **react-icons**, **SweetAlert2**, **dayjs** (แสดงปี พ.ศ.)
- **@react-pdf/renderer** (ใบลา PDF), **xlsx** (ส่งออก Excel — ไฟล์ package อยู่ใน `vendor/`)

## ติดตั้ง

### เครื่องพัฒนา

```bash
npm install
npm run dev       # dev server (port 5555)
npm run lint      # ESLint
npx tsc --noEmit  # typecheck
```

เปิด [http://localhost:5555](http://localhost:5555) — หน้าแรกคือหน้า Login แล้วเข้าสู่เมนูหลัก `/home`

> อย่ารัน `npm run build` บนเครื่องที่เปิด `npm run dev` ค้างอยู่ — build เขียนทับโฟลเดอร์ `.next` ทำให้ dev server พัง

### เครื่อง Production (Windows)

1. ตรวจ Node.js — ต้องเป็น **v20.9 ขึ้นไป (แนะนำ v22 LTS) และเป็นรุ่น 64-bit**
   ```bat
   node -v
   node -p "process.arch"
   ```
   ถ้าได้ `ia32` ให้ถอนแล้วติดตั้ง Windows Installer (.msi) 64-bit จาก nodejs.org
2. ดึงโค้ดล่าสุด (`git pull` หรือดาวน์โหลด zip) — ต้องมีโฟลเดอร์ `vendor/` มาด้วย
   และ **อย่าคัดลอก `node_modules` จากเครื่องอื่น**
3. ติดตั้ง package ใหม่ทั้งหมด (`npm ci` ติดตั้งตรงตาม `package-lock.json`)
   ```bat
   rmdir /s /q node_modules
   rmdir /s /q .next
   npm ci
   ```
4. ตรวจไฟล์ `.env` (ดูหัวข้อ [Environment Variables](#environment-variables))
5. Build แล้วรัน
   ```bat
   npm run build
   npm run start     # port 5555
   ```

### แก้ปัญหา build

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| `Attempted to load @next/swc-win32-x64-msvc ... is not a valid Win32 application` | ไฟล์ SWC ใน `node_modules` เสีย หรือ Node เป็น 32-bit — ทำข้อ 1 และ 3 ใหม่ |
| `__dirname is not defined in ES module scope` | ผลต่อเนื่องจาก SWC โหลดไม่ได้ (แก้ใน `next.config.ts` แล้ว) — ถ้ายังเจอ แปลว่าโค้ดยังเก่า ให้ดึงโค้ดล่าสุด |
| เปลี่ยน `NEXT_PUBLIC_*` แล้วไม่มีผล | ค่าเหล่านี้ฝังตอน build — ต้อง `npm run build` ใหม่ |

## Environment Variables

ไฟล์ `.env` ที่ root ของโปรเจกต์ — **ห้าม commit**

```env
NEXT_PUBLIC_API_URL=http://<backend-host>:5000   # ที่อยู่ backend (ฝั่ง server ของ Next เรียกผ่าน proxy route)
NEXT_PUBLIC_BASE_PATH=                           # ว่าง = เปิดที่ / · รันใต้ path หลัง reverse proxy เช่น /exp
SURVEY_SECRET=...                                # ลงนาม token ลิงก์แบบประเมินความพึงพอใจ
```

## Module Map

| Path | Module | Highlights |
| --- | --- | --- |
| `/` | Login | OTP / MFA |
| `/home` | หน้าเมนูหลัก | บริการของฉัน, ทางลัดทุกฝ่าย |
| `/account/*` | บัญชีผู้ใช้ / ผู้ดูแลระบบ | เปลี่ยนรหัสผ่าน/ชื่อผู้ใช้, MFA, role, เปิด-ปิดโมดูล, สถิติการใช้งาน |
| `/general/*` | งานบริหารทั่วไป | ยานพาหนะ, ซ่อมบำรุงอาคาร, ครุภัณฑ์, พัสดุ |
| `/hr/users` | ทะเบียนบุคลากร | อายุ / อายุงาน, แยกสีตามประเภท, ส่งออก Excel |
| `/hr/leave/*` | ระบบการลา | ยื่นลา, อนุมัติตามสายบังคับบัญชา, ปฏิทิน, ประวัติ, dashboard, ตั้งค่าแจ้งเตือนหมอพร้อม |
| `/hss/*` | งานยุทธศาสตร์ / พัฒนาบุคลากร | Gantt แผนยุทธศาสตร์ |
| `/information-technology/*` | งานคอมพิวเตอร์และ IT | แจ้งซ่อม, HAIT, ขอรหัสผู้ใช้, roadmap, เซสชัน HIS |
| `/accounting/*` | การเงินและบัญชี | สลิปเงินเดือน, เลขที่เงินเดือน, เจ้าหนี้ |
| `/medical-data/*` | ข้อมูลบริการทางการแพทย์ | สถิติบริการ, คำขอข้อมูลสถิติ |
| `/satisfaction/[token]` | แบบประเมินความพึงพอใจ | เปิดจากลิงก์ token (ไม่ต้องล็อกอิน) |

## Page Pattern

- ไม่มี Navbar กลางใน `layout.tsx` — แต่ละหน้าเรียก `<Navbar />` เอง
- ทุกหน้าห่อด้วย `<AppThemeProvider colorPrimary=...>` เพื่อกำหนดสีหลักของหน้า/ฝ่าย (เช่น HR `#006a5a`)
- สีพื้น / ตัวอักษรใช้ token `bg-app-bg`, `text-app-text`, `text-app-text-2` (เปลี่ยนตามโหมดสว่าง/มืด)
- Font: **Sarabun** ผ่าน `next/font` ใน `app/layout.tsx`

## Data & สิทธิ์

- หน้าเว็บเรียก backend ผ่าน proxy route ใน `app/api/**` — แนบ token จาก cookie `auth_token` เป็น `Authorization: Bearer` ให้อัตโนมัติ
- สิทธิ์เข้าหน้า: `app/lib/menuAccess.ts` (ซ่อนเมนู) + `proxy.ts` (กั้น URL ตรง) — backend ตรวจสิทธิ์ซ้ำอีกชั้น
- บางหน้ายังเป็นต้นแบบที่ใช้ mock data / localStorage (เช่น SLA, ขอติดตั้ง LAN, Smart Hospital)

## Project Structure

```
app/
├── layout.tsx, page.tsx     # Root layout + Login
├── api/                     # proxy route ไป backend
├── components/              # Navbar, EChart, ThemeProvider, LeaveFormPDF ฯลฯ
├── lib/                     # menuAccess, basePath, pdfSupport ฯลฯ
├── home/                    # หน้าเมนูหลัก
├── general/                 # งานบริหารงานทั่วไป
├── hr/                      # งานทรัพยากรบุคคล (บุคลากร, ระบบลา)
├── hss/                     # งานยุทธศาสตร์ / พัฒนาบุคลากร
├── information-technology/  # งานคอมพิวเตอร์และ IT
├── accounting/              # งานการเงินและบัญชี
├── medical-data/            # ข้อมูลบริการทางการแพทย์
└── satisfaction/            # แบบประเมินความพึงพอใจ
proxy.ts                     # กั้นสิทธิ์ระดับ URL (Next middleware)
vendor/                      # package ที่เก็บไว้ในโปรเจกต์ (xlsx)
```
