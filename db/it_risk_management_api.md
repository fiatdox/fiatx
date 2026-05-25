# IT Risk Management — API Specification

เอกสาร API สำหรับหน้า [/information-technology/hait/risk-management](../app/information-technology/hait/risk-management/page.tsx)

- **Schema:** `core_kon`
- **Base URL:** `/api/v1/it/risk`
- **มาตรฐาน:** TMI Risk Analysis Worksheet (ISO/IEC 27001:2013)
- **Content-Type:** `application/json`

---

## สารบัญ

1. [ภาพรวม Endpoints](#ภาพรวม-endpoints)
2. [Master Data](#1-get-apiv1itriskmaster)
3. [Assessments — List](#2-get-apiv1itriskassessments)
4. [Assessments — Create](#3-post-apiv1itriskassessments)
5. [Assessments — Detail](#4-get-apiv1itriskassessmentsid)
6. [Assessments — Update Header](#5-patch-apiv1itriskassessmentsid)
7. [Items — Update One](#6-put-apiv1itriskassessmentsiditemsitemid)
8. [Items — Bulk Update](#7-post-apiv1itriskassessmentsiditemsbulk)
9. [Summary + Matrix](#8-get-apiv1itriskassessmentsidsummary)
10. [Error Response](#error-response-มาตรฐาน)
11. [Flow การใช้งาน](#flow-การใช้งานในหน้า)
12. [Mapping ไปยังตาราง](#mapping-ไปยังตาราง-postgresql)

---

## ภาพรวม Endpoints

| # | Method | Endpoint | จุดประสงค์ |
|---|--------|----------|-----------|
| 1 | GET    | `/master`                                          | โหลด master data (categories + items + scale) |
| 2 | GET    | `/assessments`                                     | รายการรอบประเมินทั้งหมด |
| 3 | POST   | `/assessments`                                     | สร้างรอบประเมินใหม่ |
| 4 | GET    | `/assessments/[id]`                                | ดูรายละเอียดรอบประเมิน (พร้อม items) |
| 5 | PATCH  | `/assessments/[id]`                                | แก้ไข header (status, approved_by) |
| 6 | PUT    | `/assessments/[id]/items/[itemId]`                 | บันทึก P/I รายข้อ (auto-save) |
| 7 | POST   | `/assessments/[id]/items/bulk`                     | บันทึกหลายข้อพร้อมกัน |
| 8 | GET    | `/assessments/[id]/summary`                        | สรุป + Matrix data |

---

## 1) GET `/api/v1/it/risk/master`

โหลดครั้งเดียวตอนเปิดหน้า — ใช้สร้าง form (สามารถ cache ฝั่ง client ได้)

### Request
ไม่มี body / query param

### Response 200
```json
{
  "success": true,
  "data": {
    "categories": [
      { "category_id": 1, "category_no": 1, "category_name_th": "IT – Hardware" },
      { "category_id": 2, "category_no": 2, "category_name_th": "IT – System Software" }
    ],
    "items": [
      {
        "item_id": 1,
        "category_id": 1,
        "item_code": "1",
        "item_name_th": "1. IT – Hardware (ภาพรวม)",
        "is_summary": true,
        "sort_order": 100
      },
      {
        "item_id": 2,
        "category_id": 1,
        "item_code": "1.1",
        "item_name_th": "1.1 Servers Crash or Failure",
        "is_summary": false,
        "sort_order": 101
      }
    ],
    "scale_levels": [
      {
        "level": 1,
        "label_th": "ต่ำมาก",
        "probability_desc": "แทบไม่น่าจะเกิดขึ้น หรือ < 1 ครั้ง/ปี",
        "impact_desc": "ไม่มีผลกระทบต่อการให้บริการ หรือน้อยมาก"
      },
      {
        "level": 5,
        "label_th": "สูงมาก",
        "probability_desc": "มีจุดอ่อนรอบด้าน พบทุกสัปดาห์",
        "impact_desc": "กระทบวงกว้าง อาจเกิดอันตรายต่อผู้ป่วย"
      }
    ]
  }
}
```

---

## 2) GET `/api/v1/it/risk/assessments`

รายการรอบประเมินทั้งหมด พร้อมสรุปสถิติ

### Query Parameters
| Param | Type | Required | คำอธิบาย |
|-------|------|----------|---------|
| `year`   | int    | -  | กรองตามปี เช่น `2569` |
| `status` | string | -  | `draft` \| `submitted` \| `approved` \| `cancelled` |
| `page`   | int    | -  | default `1` |
| `limit`  | int    | -  | default `20`, max `100` |

### Response 200
```json
{
  "success": true,
  "data": [
    {
      "assessment_id": 1,
      "assessment_code": "RISK-2569-01",
      "assessment_year": 2569,
      "assessment_round": 1,
      "department": "งานเทคโนโลยีสารสนเทศ",
      "assessed_by": "นายไอที ใจดี",
      "assessed_date": "2026-05-25",
      "status": "draft",
      "total_items": 38,
      "assessed_items": 12,
      "high_risk_count": 3,
      "updated_at": "2026-05-25T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "total_pages": 1
  }
}
```

---

## 3) POST `/api/v1/it/risk/assessments`

สร้างรอบประเมินใหม่ — backend จะ auto-insert แถวเปล่า 38 รายการลง `it_risk_assessment_details`

### Request Body
```json
{
  "assessment_code": "RISK-2569-01",
  "assessment_year": 2569,
  "assessment_round": 1,
  "department": "งานเทคโนโลยีสารสนเทศ",
  "assessed_by": "นายไอที ใจดี",
  "assessed_date": "2026-05-25",
  "notes": "รอบประเมินประจำปี 2569"
}
```

### Field Validation
| Field | Type | Required | Constraint |
|-------|------|----------|-----------|
| `assessment_code`  | string  | ✅ | unique, max 50 |
| `assessment_year`  | int     | ✅ | 2500-2700 |
| `assessment_round` | int     | -  | default 1 |
| `department`       | string  | -  | max 255 |
| `assessed_by`      | string  | -  | max 255 |
| `assessed_date`    | date    | -  | YYYY-MM-DD |
| `notes`            | string  | -  | - |

### Response 201
```json
{
  "success": true,
  "data": {
    "assessment_id": 6,
    "assessment_code": "RISK-2569-01",
    "status": "draft",
    "items_initialized": 38
  }
}
```

---

## 4) GET `/api/v1/it/risk/assessments/[id]`

ดูรายละเอียดรอบประเมิน (พร้อม items ทั้ง 38 ข้อ) — ตรงกับ shape ที่หน้า React ใช้

### Response 200
```json
{
  "success": true,
  "data": {
    "header": {
      "assessment_id": 1,
      "assessment_code": "RISK-2569-01",
      "assessment_year": 2569,
      "assessment_round": 1,
      "department": "งานเทคโนโลยีสารสนเทศ",
      "assessed_by": "นายไอที ใจดี",
      "assessed_date": "2026-05-25",
      "status": "draft",
      "approved_by": null,
      "approved_date": null,
      "notes": null,
      "created_at": "2026-05-25T09:00:00Z",
      "updated_at": "2026-05-25T10:30:00Z"
    },
    "items": [
      {
        "detail_id": 101,
        "item_id": 2,
        "category_no": 1,
        "category_name_th": "IT – Hardware",
        "item_code": "1.1",
        "item_name_th": "1.1 Servers Crash or Failure",
        "is_summary": false,
        "probability": 3,
        "impact": 4,
        "risk_score": 12,
        "risk_level": "high",
        "existing_control": "มี backup รายวัน",
        "additional_control": null,
        "responsible_person": "นายเอ",
        "target_date": "2026-12-31",
        "notes": null
      }
    ]
  }
}
```

### Risk Level Mapping
| Score (P×I) | risk_level | สี (UI) |
|-------------|-----------|---------|
| 17–25 | `critical` | แดง |
| 9–16  | `high`     | ส้ม |
| 4–8   | `medium`   | เหลือง |
| 1–3   | `low`      | เขียว |
| null  | `null`     | เทา (ยังไม่ประเมิน) |

---

## 5) PATCH `/api/v1/it/risk/assessments/[id]`

แก้ไข header — ส่งเฉพาะ field ที่ต้องการแก้

### Request Body (ทุก field optional)
```json
{
  "status": "approved",
  "approved_by": "ผอ. สมชาย",
  "approved_date": "2026-05-30",
  "notes": "ผ่านการอนุมัติแล้ว"
}
```

### Response 200
```json
{
  "success": true,
  "data": {
    "assessment_id": 1,
    "status": "approved",
    "updated_at": "2026-05-30T14:00:00Z"
  }
}
```

---

## 6) PUT `/api/v1/it/risk/assessments/[id]/items/[itemId]`

บันทึก P/I รายข้อ — ใช้ตอน user เปลี่ยน dropdown ในตาราง (auto-save)

### Request Body
```json
{
  "probability": 3,
  "impact": 4,
  "existing_control": "มี UPS สำรอง",
  "additional_control": "ติดตั้ง Generator",
  "responsible_person": "นายบี",
  "target_date": "2026-09-30",
  "notes": "ดำเนินการ Q3/2569"
}
```

### Field Validation
| Field | Type | Constraint |
|-------|------|-----------|
| `probability` | int \| null | 1–5 |
| `impact`      | int \| null | 1–5 |
| ที่เหลือ      | string \| null | optional |

### Response 200
```json
{
  "success": true,
  "data": {
    "detail_id": 101,
    "item_id": 2,
    "probability": 3,
    "impact": 4,
    "risk_score": 12,
    "risk_level": "high"
  }
}
```

> `risk_score` และ `risk_level` คำนวณอัตโนมัติจาก PostgreSQL Generated Column

---

## 7) POST `/api/v1/it/risk/assessments/[id]/items/bulk`

บันทึกหลายข้อพร้อมกัน — ใช้ตอนกด "บันทึก" รวมทั้งหน้า

### Request Body
```json
{
  "items": [
    { "item_id": 2, "probability": 3, "impact": 4 },
    { "item_id": 3, "probability": 2, "impact": 5 },
    { "item_id": 4, "probability": null, "impact": null }
  ]
}
```

### Response 200
```json
{
  "success": true,
  "data": {
    "updated_count": 3,
    "failed": []
  }
}
```

> Backend ควรใช้ transaction — ทั้ง batch ต้อง commit หรือ rollback พร้อมกัน

---

## 8) GET `/api/v1/it/risk/assessments/[id]/summary`

ใช้ render Summary Cards + Risk Matrix + Top Risks

### Response 200
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_items": 38,
      "assessed_items": 12,
      "critical_count": 2,
      "high_count": 5,
      "medium_count": 3,
      "low_count": 2
    },
    "matrix": [
      {
        "probability": 3,
        "impact": 4,
        "score": 12,
        "level": "high",
        "items": [
          { "item_code": "1.1", "item_name_th": "1.1 Servers Crash or Failure" },
          { "item_code": "4.2", "item_name_th": "4.2 Internet" }
        ]
      },
      {
        "probability": 5,
        "impact": 5,
        "score": 25,
        "level": "critical",
        "items": [
          { "item_code": "9", "item_name_th": "9. IT – Hacking" }
        ]
      }
    ],
    "top_risks": [
      {
        "item_code": "9",
        "item_name_th": "9. IT – Hacking, Unauthorized Intrusions",
        "probability": 5,
        "impact": 5,
        "risk_score": 25,
        "risk_level": "critical"
      },
      {
        "item_code": "6.3",
        "item_name_th": "6.3 PDPA Implementation",
        "probability": 4,
        "impact": 5,
        "risk_score": 20,
        "risk_level": "critical"
      }
    ]
  }
}
```

---

## Error Response (มาตรฐาน)

ทุก endpoint คืน error ในรูปแบบเดียวกัน

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "probability ต้องอยู่ระหว่าง 1-5",
    "field": "probability"
  }
}
```

### HTTP Status Codes

| HTTP | code | กรณีใช้ |
|------|------|--------|
| 400 | `VALIDATION_ERROR` | ค่าผิด range, ขาด required field |
| 401 | `UNAUTHORIZED`     | ไม่ได้ login |
| 403 | `FORBIDDEN`        | สิทธิ์ไม่ถึง (เช่น approve ต้องเป็น manager) |
| 404 | `NOT_FOUND`        | `assessment_id` หรือ `item_id` ไม่มี |
| 409 | `DUPLICATE`        | `assessment_code` ซ้ำ |
| 500 | `INTERNAL_ERROR`   | DB error, unexpected exception |

---

## Flow การใช้งานในหน้า

```text
เปิดหน้า /information-technology/hait/risk-management
  ├─► GET /master                              (ครั้งเดียว, cache ฝั่ง client)
  └─► GET /assessments?year=2569               (รายการรอบประเมิน)

ผู้ใช้เลือกรอบประเมิน
  ├─► GET /assessments/[id]                    (header + items)
  └─► GET /assessments/[id]/summary            (matrix + stats)

ผู้ใช้แก้ค่า P/I ในตาราง (auto-save แต่ละ cell)
  └─► PUT /assessments/[id]/items/[itemId]

ผู้ใช้กดปุ่ม "บันทึกทั้งหมด"
  └─► POST /assessments/[id]/items/bulk

ผู้บริหารกดอนุมัติ
  └─► PATCH /assessments/[id]  { status: "approved" }
```

---

## Mapping ไปยังตาราง PostgreSQL

| API Field | ตาราง | คอลัมน์ |
|-----------|-------|--------|
| `assessment_id`        | `core_kon.it_risk_assessments`         | `assessment_id` |
| `assessment_code`      | `core_kon.it_risk_assessments`         | `assessment_code` |
| `item_id` / `item_code`| `core_kon.it_risk_items`               | `item_id` / `item_code` |
| `category_no`          | `core_kon.it_risk_categories`          | `category_no` |
| `probability`          | `core_kon.it_risk_assessment_details`  | `probability` |
| `impact`               | `core_kon.it_risk_assessment_details`  | `impact` |
| `risk_score`           | `core_kon.it_risk_assessment_details`  | `risk_score` (GENERATED) |
| `risk_level`           | `core_kon.it_risk_assessment_details`  | `risk_level` (GENERATED) |
| view รวม               | `core_kon.it_risk_assessment_summary`  | - |

ดูโครงสร้างเต็มที่ [db/it_risk_management.sql](./it_risk_management.sql)

---

## Implementation Notes (Next.js App Router)

แต่ละ endpoint จะอยู่ที่:

```text
app/api/v1/it/risk/
├── master/route.ts
├── assessments/
│   ├── route.ts                              ← GET (list), POST (create)
│   └── [id]/
│       ├── route.ts                          ← GET (detail), PATCH
│       ├── summary/route.ts                  ← GET
│       └── items/
│           ├── bulk/route.ts                 ← POST
│           └── [itemId]/route.ts             ← PUT
```

### ตัวอย่าง Route Handler skeleton

```ts
// app/api/v1/it/risk/master/route.ts
import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    const [categories, items, scaleLevels] = await Promise.all([
      sql`SELECT category_id, category_no, category_name_th
          FROM core_kon.it_risk_categories
          WHERE is_active = TRUE
          ORDER BY category_no`,
      sql`SELECT item_id, category_id, item_code, item_name_th, is_summary, sort_order
          FROM core_kon.it_risk_items
          WHERE is_active = TRUE
          ORDER BY sort_order`,
      sql`SELECT level, label_th, probability_desc, impact_desc
          FROM core_kon.it_risk_scale_levels
          ORDER BY level`,
    ])

    return NextResponse.json({
      success: true,
      data: { categories, items, scale_levels: scaleLevels },
    })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: String(e) } },
      { status: 500 },
    )
  }
}
```
