# IT User Request — Database & API Specification

เอกสารโครงสร้างฐานข้อมูลและ API สำหรับหน้า [/information-technology/user-request](../app/information-technology/user-request/page.tsx)

- **Database:** PostgreSQL
- **Schema:** `core_kon`
- **Tables:** `it_user_systems` (master), `it_user_requests` (fact)
- **Base URL:** `/api/v1/it/user-requests`
- **Content-Type:** `application/json`
- **Timezone:** Asia/Bangkok (`YYYY-MM-DD`)
- **หลักความปลอดภัย:** `username`/`password` ที่ออกให้ผู้ใช้ **ส่งผ่าน "หมอพร้อม" เท่านั้น ไม่เก็บลงฐานข้อมูล** — ตัวตนผู้ใช้ถูกระบุไว้ในระบบแล้วผ่าน `requester_user_id`

---

## สารบัญ

1. [โครงสร้างตาราง](#โครงสร้างตาราง)
2. [วงจรสถานะคำร้อง (Status Lifecycle)](#วงจรสถานะคำร้อง-status-lifecycle)
3. [ภาพรวม Endpoints](#ภาพรวม-endpoints)
4. [Systems Master](#1-get-apiv1ituser-requestssystems)
5. [Request List](#2-get-apiv1ituser-requests)
6. [Create Request](#3-post-apiv1ituser-requests)
7. [Get Request Detail](#4-get-apiv1ituser-requestsid)
8. [Issue Credential](#5-post-apiv1ituser-requestsidissue)
9. [Reject / Cancel](#6-post-apiv1ituser-requestsidreject--cancel)
10. [Dashboard](#7-get-apiv1ituser-requestsdashboard)
11. [ดึงข้อมูลบุคลากร](#8-get-apiv1usersidinfo)
12. [Error Response](#error-response-มาตรฐาน)
13. [Flow การใช้งาน](#flow-การใช้งานในหน้า)
14. [Mapping ไปยังตาราง](#mapping-ไปยังตาราง)
15. [Implementation Notes](#implementation-notes-nextjs-app-router)

---

## โครงสร้างตาราง

ดูไฟล์ DDL เต็มที่ [db/it_user_request.sql](./it_user_request.sql)

### ER Diagram (ภาพรวมความสัมพันธ์)

```
it_user_systems                  it_user_requests
───────────────                  ────────────────
PK id                            PK id
   system_code                      request_no        ← auto REQ-{YYYYMM}{NNN}
   name_th                          request_date
   name_en                          requester_user_id → users.id (ระบบกลาง)
   icon_key                         requester_name    (snapshot)
   color                            position_name     (snapshot)
   sort_order                       department        (snapshot)
   is_active                        phone
       │                         ref system_id        → it_user_systems.id
       │                            purpose
       │  ref (logical relation,    status            VARCHAR+CHECK
       └──── ไม่มี FK constraint) ─► issued_by
                                     issued_date
                                     notified_at      ← เวลาที่ส่งหมอพร้อม
                                     note
                                     is_active         Y/N (Soft Delete)
                                     created_by / created_at
                                     updated_by / updated_at

  ✗ ไม่มีคอลัมน์ username / password — ส่งผ่านหมอพร้อม ไม่บันทึกใน DB
```

### สรุป Tables

| Table | ประเภท | จำนวน Row (Seed) | จุดประสงค์ |
|-------|--------|-----------------|-----------|
| `it_user_systems` | Master | 6 | ระบบที่เปิดให้ขอใช้งาน (HOSxP, Inventory, ...) |
| `it_user_requests` | Fact | — | คำร้องขอบัญชี + สถานะการออกรหัส |

### ระบบที่เปิดให้ขอใช้งาน (seed)

| id | system_code | name_th | icon_key | color |
|----|-------------|---------|----------|-------|
| 1 | `hosxp` | HOSxP | hospital | `#7c3aed` |
| 2 | `inventory` | Inventory | boxes | `#0891b2` |
| 3 | `ipd_chart` | IPD CHART | bed | `#16a34a` |
| 4 | `smart_office` | Smart Office | building | `#2563eb` |
| 5 | `payroll` | โปรแกรมเงินเดือน | money | `#d97706` |
| 6 | `wifi` | WI-FI | wifi | `#dc2626` |

---

## วงจรสถานะคำร้อง (Status Lifecycle)

```text
                    ┌──────────────────────────────────────┐
                    │            pending (รอออกรหัส)         │
                    └──────────────────────────────────────┘
                         │                        │
          IT ตรวจ & อนุมัติ                  IT ปฏิเสธ / ผู้ขอยกเลิก
       POST /[id]/issue                     POST /[id]/reject | /cancel
                         │                        │
                         ▼                        ▼
        ┌────────────────────────────┐     ┌──────────────────────┐
        │  ขั้นตอนออกรหัส (in-memory) │     │ rejected / cancelled │
        │  • genPassword() ฝั่ง client │     └──────────────────────┘
        │  • กำหนด username           │
        └────────────────────────────┘
                         │
                         ▼
        ┌──────────────────────────────────────────────────┐
        │   ส่ง username + password ผ่าน "หมอพร้อม"          │
        │   (backend relay → ไม่เก็บ credential ลง DB)        │
        └──────────────────────────────────────────────────┘
                         │  แจ้งสำเร็จ
                         ▼
        ┌──────────────────────────────────────────────────┐
        │  UPDATE it_user_requests SET                      │
        │    status      = 'issued',                        │
        │    issued_by   = <เจ้าหน้าที่>,                    │
        │    issued_date = วันที่ออก,                        │
        │    notified_at = วันเวลาที่ส่งหมอพร้อม             │
        └──────────────────────────────────────────────────┘
                         │
                         ▼
                    issued (ออกรหัสแล้ว) ✓
```

| สถานะ | ความหมาย | เปลี่ยนได้เป็น |
|-------|---------|---------------|
| `pending` | รอออกรหัส | `issued`, `rejected`, `cancelled` |
| `issued` | ออกรหัส + แจ้งหมอพร้อมแล้ว | (สถานะปลายทาง) |
| `rejected` | ไอทีปฏิเสธคำร้อง | (สถานะปลายทาง) |
| `cancelled` | ผู้ขอ/ไอทียกเลิก | (สถานะปลายทาง) |

---

## ภาพรวม Endpoints

| # | Method | Endpoint | จุดประสงค์ |
|---|--------|----------|-----------|
| 1 | GET    | `/systems`        | โหลด dropdown "ระบบที่ขอใช้งาน" |
| 2 | GET    | `/`               | รายการคำร้อง (filter + pagination) |
| 3 | POST   | `/`               | สร้างคำร้องใหม่ (ผู้ขอยื่นเอง / ไอทีเพิ่มให้) |
| 4 | GET    | `/[id]`           | ดูรายละเอียดคำร้อง |
| 5 | POST   | `/[id]/issue`     | ออกรหัส + ส่งหมอพร้อม → `issued` |
| 6 | POST   | `/[id]/reject`    | ปฏิเสธคำร้อง → `rejected` |
| 6 | POST   | `/[id]/cancel`    | ยกเลิกคำร้อง → `cancelled` |
| 7 | GET    | `/dashboard`      | ข้อมูลสรุปสำหรับ tab "แดชบอร์ด" |
| 8 | GET    | `/api/v1/users/[id]/info` | ดึงข้อมูลบุคลากร (ใช้ตอนไอทีเพิ่มเอง) |

---

## 1) GET `/api/v1/it/user-requests/systems`

โหลด master ระบบ — ใช้สร้าง Select "ระบบที่ขอใช้งาน" (แทน `SYSTEM_OPTIONS` ฝั่ง client)

### Query Parameters
| Param | Type | Required | คำอธิบาย |
|-------|------|----------|---------|
| `active_only` | bool | - | default `true` — คืนเฉพาะ `is_active = 'Y'` |

### Response 200
```json
{
  "success": true,
  "data": [
    { "id": 1, "system_code": "hosxp",        "label": "HOSxP",            "icon_key": "hospital", "color": "#7c3aed" },
    { "id": 2, "system_code": "inventory",    "label": "Inventory",        "icon_key": "boxes",    "color": "#0891b2" },
    { "id": 3, "system_code": "ipd_chart",    "label": "IPD CHART",        "icon_key": "bed",      "color": "#16a34a" },
    { "id": 4, "system_code": "smart_office", "label": "Smart Office",     "icon_key": "building", "color": "#2563eb" },
    { "id": 5, "system_code": "payroll",      "label": "โปรแกรมเงินเดือน", "icon_key": "money",    "color": "#d97706" },
    { "id": 6, "system_code": "wifi",         "label": "WI-FI",            "icon_key": "wifi",     "color": "#dc2626" }
  ]
}
```

> `label` = `name_th`, `icon_key`/`color` ใช้ map ไอคอน react-icons (`hospital`→FaHospital, `boxes`→FaBoxes, ...)

---

## 2) GET `/api/v1/it/user-requests`

รายการคำร้อง สำหรับ **tab "รายการคำร้อง"**

### Query Parameters
| Param | Type | Required | คำอธิบาย |
|-------|------|----------|---------|
| `status`    | string | - | `pending` \| `issued` \| `rejected` \| `cancelled` |
| `system_id` | int    | - | กรองตามระบบ |
| `date_from` | date   | - | filter วันที่เริ่ม (`request_date`) |
| `date_to`   | date   | - | filter วันที่สิ้นสุด |
| `search`    | string | - | ค้นหาใน `request_no`, `requester_name`, `department`, `purpose`, ชื่อระบบ |
| `page`      | int    | - | default `1` |
| `limit`     | int    | - | default `50`, max `200` |
| `sort`      | string | - | default `-request_date` (prefix `-` = DESC) |

### Response 200
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "request_no": "REQ-202606001",
      "request_date": "2026-06-12",
      "requester_user_id": 1,
      "requester_name": "นางสาวสมศรี รักษาดี",
      "position_name": "พยาบาลวิชาชีพ",
      "department": "งานผู้ป่วยใน (IPD)",
      "phone": "081-234-5678",
      "system_id": 1,
      "system_code": "hosxp",
      "system_name": "HOSxP",
      "purpose": "เริ่มปฏิบัติงานใหม่ ต้องการบัญชีเข้าใช้ระบบ HOSxP",
      "status": "pending",
      "issued_by": null,
      "issued_date": null,
      "notified_at": null,
      "note": null,
      "created_at": "2026-06-12T08:30:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 3, "total_pages": 1 }
}
```

> `system_code` / `system_name` มาจาก JOIN `it_user_systems` — ฝั่ง client ใช้ map ไอคอน/สี

---

## 3) POST `/api/v1/it/user-requests`

สร้างคำร้องใหม่ — ใช้ทั้ง **กรณีผู้ขอยื่นเอง** และ **ไอทีเพิ่มให้** (ดึงผู้ใช้จาก [GET /users/{id}/info](#8-get-apiv1usersidinfo))

### Request Body
```json
{
  "requester_user_id": 1,
  "requester_name": "นางสาวสมศรี รักษาดี",
  "position_name": "พยาบาลวิชาชีพ",
  "department": "งานผู้ป่วยใน (IPD)",
  "phone": "081-234-5678",
  "system_id": 1,
  "purpose": "เริ่มปฏิบัติงานใหม่ ต้องการบัญชีเข้าใช้ระบบ HOSxP",
  "note": ""
}
```

### Field Validation
| Field | Type | Required | Constraint |
|-------|------|----------|-----------|
| `requester_user_id` | int    | -  | `id` จาก users (NULL ได้ถ้าผู้ขอเป็นบุคคลภายนอกระบบ) |
| `requester_name`    | string | ✅ | max 150 — snapshot ชื่อผู้ขอ |
| `position_name`     | string | -  | max 150 |
| `department`        | string | -  | max 150 |
| `phone`             | string | -  | max 30 |
| `system_id`         | int    | ✅ | `id` จาก `it_user_systems` (`is_active='Y'`) |
| `purpose`           | string | -  | max 2000 |
| `note`              | string | -  | max 2000 |

> Backend สร้าง `request_no` อัตโนมัติ รูปแบบ `REQ-{YYYYMM}{NNN}` (running number ต่อเดือน), `status` เริ่มต้น = `pending`

### Response 201
```json
{
  "success": true,
  "data": { "id": 4, "request_no": "REQ-202606004", "status": "pending", "created_at": "2026-06-15T03:10:00Z" }
}
```

---

## 4) GET `/api/v1/it/user-requests/[id]`

ดูรายละเอียดคำร้องรายเดียว — ใช้ตอนเปิด Drawer "ดูรหัส"/"ออกรหัส"

### Response 200
คืน object เดียวกับแต่ละ item ใน [GET list](#2-get-apiv1ituser-requests) (ทุก field)

---

## 5) POST `/api/v1/it/user-requests/[id]/issue`

ออกรหัสให้ผู้ใช้ — **client generate `username`/`password` แล้วส่งมาให้ backend relay เข้าหมอพร้อม** จากนั้น backend อัปเดตสถานะเป็น `issued`

> ⚠️ **`password` เป็นข้อมูลชั่วคราว (transient)** — backend ส่งต่อให้หมอพร้อมแล้ว **ห้ามเขียนลงตาราง/ลง log** บันทึกเพียง `notified_at`

### Request Body
```json
{
  "username": "somsri.r",
  "password": "Xy7@kPmQ2r",
  "morprom_target": {
    "citizen_id": "1100xxxxxxxxx",
    "user_ref": 1
  },
  "issued_by": "เจ้าหน้าที่ไอที",
  "note": "บัญชีเริ่มต้น บังคับเปลี่ยนรหัสเมื่อเข้าใช้ครั้งแรก"
}
```

### Field Validation
| Field | Type | Required | Constraint |
|-------|------|----------|-----------|
| `username`        | string | ✅ | max 60 — **ไม่ถูกบันทึกใน DB** (relay เท่านั้น) |
| `password`        | string | ✅ | transient — **ไม่ถูกบันทึก/ไม่ log** |
| `morprom_target`  | object | ✅ | ปลายทางแจ้งเตือนผ่านหมอพร้อม (เช่น `citizen_id`/`user_ref`) |
| `issued_by`       | string | ✅ | ชื่อเจ้าหน้าที่ผู้ออกรหัส |
| `note`            | string | -  | หมายเหตุ |

### พฤติกรรมฝั่ง Backend
1. ตรวจว่าคำร้องอยู่สถานะ `pending` (ไม่งั้นคืน `409 CONFLICT`)
2. เรียก **หมอพร้อม Notification API** ส่งข้อความ username/password ให้ผู้ใช้
3. ถ้าแจ้งสำเร็จ → `UPDATE` ตั้ง `status='issued'`, `issued_by`, `issued_date=CURRENT_DATE`, `notified_at=CURRENT_TIMESTAMP`
4. ถ้าหมอพร้อมล้มเหลว → คงสถานะ `pending`, คืน `502 NOTIFY_FAILED` (ให้ลองใหม่)

### Response 200
```json
{
  "success": true,
  "data": {
    "id": 1,
    "request_no": "REQ-202606001",
    "status": "issued",
    "issued_by": "เจ้าหน้าที่ไอที",
    "issued_date": "2026-06-15",
    "notified_at": "2026-06-15T03:20:00Z"
  }
}
```

> ตัว `username`/`password` **ไม่ปรากฏใน response** (ฝั่ง client มีอยู่แล้วในหน่วยความจำ สำหรับแสดงครั้งเดียวให้เจ้าหน้าที่ทวนสอบ)

---

## 6) POST `/api/v1/it/user-requests/[id]/reject` | `/cancel`

ปฏิเสธ (`reject`) หรือยกเลิก (`cancel`) คำร้อง — เปลี่ยนสถานะจาก `pending`

### Request Body
```json
{ "reason": "ข้อมูลผู้ขอไม่ครบถ้วน", "actor": "เจ้าหน้าที่ไอที" }
```

| Field | Type | Required | คำอธิบาย |
|-------|------|----------|---------|
| `reason` | string | - | เหตุผล (เก็บต่อท้าย `note`) |
| `actor`  | string | ✅ | ผู้ดำเนินการ |

### Response 200
```json
{ "success": true, "data": { "id": 2, "request_no": "REQ-202606002", "status": "rejected" } }
```

---

## 7) GET `/api/v1/it/user-requests/dashboard`

ข้อมูลสรุปสำหรับ **tab "แดชบอร์ด"** — รวมทุก chart ใน 1 request

### Query Parameters
| Param | Type | Required | คำอธิบาย |
|-------|------|----------|---------|
| `date_from` | date | - | ช่วงเริ่ม |
| `date_to`   | date | - | ช่วงสิ้นสุด |

### Response 200
```json
{
  "success": true,
  "data": {
    "kpi": {
      "total": 3,
      "pending": 2,
      "issued": 1,
      "rejected": 0,
      "issued_rate": 33.3
    },

    "by_system": [
      { "system_code": "hosxp",     "system_name": "HOSxP",     "count": 1 },
      { "system_code": "inventory", "system_name": "Inventory", "count": 1 },
      { "system_code": "ipd_chart", "system_name": "IPD CHART", "count": 1 }
    ],

    "by_department": [
      { "department": "งานผู้ป่วยใน (IPD)", "count": 1 },
      { "department": "งานเวชระเบียน",      "count": 1 }
    ],

    "by_status": [
      { "status": "pending", "count": 2 },
      { "status": "issued",  "count": 1 }
    ],

    "fiscal_by_system": {
      "fiscal_years": [2565, 2566, 2567, 2568, 2569],
      "systems": [
        { "system_code": "hosxp",     "system_name": "HOSxP",     "data": [12, 18, 22, 25, 9] },
        { "system_code": "inventory", "system_name": "Inventory", "data": [4, 6, 8, 10, 3] }
      ],
      "total_line": [16, 24, 30, 35, 12]
    }
  }
}
```

### Mapping Chart ↔ Field
| Chart (หน้า DashboardPanel) | Field ที่ใช้ |
|------------------------------|------------|
| KPI Cards                                  | `kpi.*` |
| Gauge อัตราการออกรหัส                       | `kpi.issued_rate` |
| Donut สถานะ                                | `by_status` |
| Bar ระบบที่ขอ                              | `by_system` |
| Bar หน่วยงาน                               | `by_department` |
| สรุปปีงบ (แท่ง=ระบบ, เส้น smooth=รวม)       | `fiscal_by_system` |

> ปีงบประมาณไทย (ปีงบ) = `EXTRACT(MONTH) >= 10 ? year+1 : year`, ปี พ.ศ. = ค.ศ. + 543

---

## 8) GET `/api/v1/users/[id]/info`

ดึงข้อมูลบุคลากรจากระบบกลาง — ใช้ตอน **ไอทีเพิ่มคำร้องเอง** (เลือกชื่อใน dropdown)

### Response 200
```json
{
  "success": true,
  "data": {
    "id": 1,
    "id_card": "454545",
    "employee_name": "นายณัฐ",
    "mission_name": "ด้านดิจิทัลทางการแพทย์และสุขภาพ",
    "major_name": "กลุ่มงานสุขภาพดิจิทัล",
    "submajor_name": null,
    "position_name": "นักวิชาการคอมพิวเตอร์",
    "user_type_name": "ข้าราชการ"
  }
}
```

> Mapping → ฟอร์ม: `employee_name`→requester_name, `position_name`→position, `mission_name`/`major_name`→department/หน่วยงาน, `id`→requester_user_id

---

## Error Response (มาตรฐาน)

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "คำร้องนี้ออกรหัสไปแล้ว ไม่สามารถออกซ้ำได้",
    "field": "status"
  }
}
```

### HTTP Status Codes
| HTTP | Code | กรณีใช้ |
|------|------|--------|
| 400 | `VALIDATION_ERROR` | ค่าผิด, ขาด required field |
| 401 | `UNAUTHORIZED`     | ไม่ได้ login |
| 403 | `FORBIDDEN`        | ไม่มีสิทธิ์ออกรหัส |
| 404 | `NOT_FOUND`        | `id` ไม่มี หรือ `is_active='N'` |
| 409 | `CONFLICT`         | `request_no` ซ้ำ / ออกรหัสซ้ำ (สถานะไม่ใช่ pending) |
| 502 | `NOTIFY_FAILED`    | ส่งหมอพร้อมไม่สำเร็จ (สถานะคงเป็น pending ให้ลองใหม่) |
| 500 | `INTERNAL_ERROR`   | DB error, unexpected exception |

---

## Flow การใช้งานในหน้า

```text
เปิดหน้า /information-technology/user-request
  └─► GET /systems                  (ครั้งเดียว — สร้าง dropdown ระบบ)
  └─► GET /                         (โหลดรายการคำร้อง)

Tab "แดชบอร์ด"
  └─► GET /dashboard                (โหลดทุก chart ใน 1 request)

กดปุ่ม "เพิ่ม" (ไอทีเพิ่มเอง)
  ├─► GET  /api/v1/users            (โหลดรายชื่อใน dropdown)
  ├─► GET  /api/v1/users/[id]/info  (เลือกชื่อ → ดึงข้อมูลเต็ม)
  └─► POST /                        (บันทึกคำร้อง status=pending)

กดปุ่ม "ออกรหัส" (จากคำร้อง pending)
  ├─ client: genPassword() + กำหนด username
  └─► POST /[id]/issue              (relay หมอพร้อม → status=issued, notified_at)

กดปุ่ม "ปฏิเสธ" / "ยกเลิก"
  └─► POST /[id]/reject | /cancel   (status=rejected | cancelled)

กดปุ่ม "ดูรหัส" (คำร้องที่ issued)
  └─► GET  /[id]                    (โหลด detail — ไม่มี password, แสดงสถานะ/เวลาแจ้ง)
```

---

## Mapping ไปยังตาราง

| API Field | ตาราง | Column |
|-----------|-------|--------|
| `id` | `it_user_requests` | `id` |
| `request_no` | `it_user_requests` | `request_no` |
| `request_date` | `it_user_requests` | `request_date` |
| `requester_user_id` | `it_user_requests` | `requester_user_id` (ref → users) |
| `requester_name` | `it_user_requests` | `requester_name` (snapshot) |
| `position_name` | `it_user_requests` | `position_name` (snapshot) |
| `department` | `it_user_requests` | `department` (snapshot) |
| `phone` | `it_user_requests` | `phone` |
| `system_id` | `it_user_requests` | `system_id` (ref) |
| `system_code` / `system_name` | `it_user_systems` | `system_code` / `name_th` |
| `purpose` | `it_user_requests` | `purpose` |
| `status` | `it_user_requests` | `status` (VARCHAR+CHECK) |
| `issued_by` | `it_user_requests` | `issued_by` |
| `issued_date` | `it_user_requests` | `issued_date` |
| `notified_at` | `it_user_requests` | `notified_at` |
| `note` | `it_user_requests` | `note` |
| `username` / `password` | — | **ไม่เก็บ** (ส่งผ่านหมอพร้อม) |
| `is_active` | `it_user_requests` | `is_active` (Y/N) — Soft Delete |
| `created_by` / `created_at` | `it_user_requests` | `created_by` / `created_at` |
| `updated_by` / `updated_at` | `it_user_requests` | `updated_by` / `updated_at` |

### ตัวอย่าง JOIN query สำหรับ list

```sql
SELECT
  r.id, r.request_no, r.request_date,
  r.requester_user_id, r.requester_name, r.position_name, r.department, r.phone,
  r.system_id, s.system_code, s.name_th AS system_name,
  r.purpose, r.status,
  r.issued_by, r.issued_date, r.notified_at, r.note,
  r.created_by, r.created_at, r.updated_at
FROM core_kon.it_user_requests r
  JOIN core_kon.it_user_systems s ON r.system_id = s.id
WHERE r.is_active = 'Y'
ORDER BY r.request_date DESC, r.id DESC
;
```

ดูโครงสร้างตารางเต็มที่ [db/it_user_request.sql](./it_user_request.sql)

---

## Implementation Notes (Next.js App Router)

```text
app/api/v1/it/user-requests/
├── systems/route.ts          ← GET (master ระบบ)
├── route.ts                  ← GET (list), POST (create)
├── [id]/route.ts             ← GET (detail)
├── [id]/issue/route.ts       ← POST (relay หมอพร้อม → issued)
├── [id]/reject/route.ts      ← POST
├── [id]/cancel/route.ts      ← POST
└── dashboard/route.ts        ← GET

app/api/v1/users/[id]/info/route.ts   ← GET (ดึงข้อมูลบุคลากร — มีอยู่แล้ว)
```

### ตัวอย่าง auto-generate request_no

```ts
// สร้างเลขที่คำร้องรูปแบบ REQ-202606001 (running ต่อเดือน)
async function nextRequestNo(d = new Date()): Promise<string> {
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
  const result = await sql`
    SELECT COUNT(*) AS cnt
    FROM core_kon.it_user_requests
    WHERE to_char(request_date, 'YYYYMM') = ${ym}
  `
  const seq = (Number(result[0].cnt) + 1).toString().padStart(3, '0')
  return `REQ-${ym}${seq}`
}
```

### หมายเหตุการเชื่อมหมอพร้อม (Issue flow)

```ts
// POST /[id]/issue — relay credential ให้หมอพร้อม โดยไม่บันทึกลง DB
async function issueCredential(id: number, body: IssueBody) {
  // 1) ส่งหมอพร้อม (transient — ไม่ persist password)
  await morpromNotify({
    target: body.morprom_target,
    title: 'บัญชีเข้าใช้งานระบบโรงพยาบาล',
    message: `Username: ${body.username}\nPassword: ${body.password}\nกรุณาเปลี่ยนรหัสผ่านเมื่อเข้าใช้ครั้งแรก`,
  })
  // 2) อัปเดตสถานะ — บันทึกเฉพาะ metadata ห้ามบันทึก username/password
  return sql`
    UPDATE core_kon.it_user_requests
       SET status = 'issued',
           issued_by = ${body.issued_by},
           issued_date = CURRENT_DATE,
           notified_at = CURRENT_TIMESTAMP,
           updated_by = ${body.issued_by}
     WHERE id = ${id} AND status = 'pending'
     RETURNING id, request_no, status, issued_by, issued_date, notified_at
  `
}
```

> **ข้อควรระวัง:** อย่าใส่ `username`/`password` ลงใน log, error message, หรือ audit table — ให้มีอยู่เฉพาะใน payload ที่ยิงเข้าหมอพร้อมเท่านั้น
