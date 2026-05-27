# IT Activity — API Specification

เอกสาร API สำหรับหน้า [/information-technology/hait/activity](../app/information-technology/hait/activity/page.tsx)

- **Schema:** `core_kon`
- **Base URL:** `/api/v1/it/activity`
- **มาตรฐาน:** HAIT ข้อ 4.5 — บันทึกกิจกรรมและการทำงานของเจ้าหน้าที่ฝ่าย IT
- **Content-Type:** `application/json`
- **Timezone:** Asia/Bangkok — เวลาทั้งหมดส่งเป็น local string (`YYYY-MM-DD`, `HH:mm`)
- **ปีงบประมาณ (BE):** ต.ค. ปีก่อน – ก.ย. ปีถัดมา (FY2569 = 1 ต.ค. 2568 – 30 ก.ย. 2569)

---

## สารบัญ

1. [ภาพรวม Endpoints](#ภาพรวม-endpoints)
2. [Master Data](#1-get-apiv1itactivitymaster)
3. [Logs — List](#2-get-apiv1itactivitylogs)
4. [Logs — Create](#3-post-apiv1itactivitylogs)
5. [Logs — Detail](#4-get-apiv1itactivitylogsid)
6. [Logs — Update](#5-put-apiv1itactivitylogsid)
7. [Logs — Delete](#6-delete-apiv1itactivitylogsid)
8. [Daily Schedule](#7-get-apiv1itactivitydaily)
9. [Dashboard](#8-get-apiv1itactivitydashboard)
10. [Error Response](#error-response-มาตรฐาน)
11. [Flow การใช้งาน](#flow-การใช้งานในหน้า)
12. [Mapping ไปยังตาราง](#mapping-ไปยังตาราง-postgresql)

---

## ภาพรวม Endpoints

| # | Method | Endpoint | จุดประสงค์ |
|---|--------|----------|-----------|
| 1 | GET    | `/master`                | โหลด master data (staff + types + systems + statuses + priorities + sources) |
| 2 | GET    | `/logs`                  | รายการกิจกรรม (filter + pagination) |
| 3 | POST   | `/logs`                  | บันทึกกิจกรรมใหม่ |
| 4 | GET    | `/logs/[id]`             | ดูรายละเอียดกิจกรรม |
| 5 | PUT    | `/logs/[id]`             | แก้ไขกิจกรรม |
| 6 | DELETE | `/logs/[id]`             | ลบกิจกรรม |
| 7 | GET    | `/daily`                 | ตารางงานรายวัน (slot-based) |
| 8 | GET    | `/dashboard`             | ข้อมูลสรุปสำหรับ Dashboard (ทุก chart) |

---

## 1) GET `/api/v1/it/activity/master`

โหลดครั้งเดียวตอนเปิดหน้า — ใช้สร้าง Select / Form ทั้งหมด (สามารถ cache ฝั่ง client ได้)

### Request
ไม่มี body / query param

### Response 200
```json
{
  "success": true,
  "data": {
    "staff": [
      { "staff_id": 1, "staff_code": "IT001", "full_name_th": "นายสมชาย ใจดี", "role_th": "IT Support / Hardware" },
      { "staff_id": 2, "staff_code": "IT002", "full_name_th": "นางสาวสุดา รักงาน", "role_th": "System Admin" },
      { "staff_id": 3, "staff_code": "IT003", "full_name_th": "นายวีระ มุ่งมั่น", "role_th": "System Developer" }
    ],
    "types": [
      { "type_code": "maintenance", "type_name_th": "ซ่อมบำรุง", "nature": "reactive", "color_hint": "orange" },
      { "type_code": "admin",       "type_name_th": "ดูแลระบบ",  "nature": "proactive", "color_hint": "blue" }
    ],
    "systems": [
      { "system_code": "his",     "system_name_th": "ระบบ HIS" },
      { "system_code": "network", "system_name_th": "เครือข่าย" }
    ],
    "statuses": [
      { "status_code": "done",        "status_name_th": "เสร็จสิ้น",       "color_hex": "#22c55e", "is_closed": true,  "sort_order": 1 },
      { "status_code": "in_progress", "status_name_th": "กำลังดำเนินการ", "color_hex": "#3b82f6", "is_closed": false, "sort_order": 2 },
      { "status_code": "waiting",     "status_name_th": "รอดำเนินการ",   "color_hex": "#f59e0b", "is_closed": false, "sort_order": 3 },
      { "status_code": "pending",     "status_name_th": "งานค้าง",        "color_hex": "#ef4444", "is_closed": false, "sort_order": 4 }
    ],
    "priorities": [
      { "priority_code": "urgent", "priority_name_th": "เร่งด่วน", "color_hex": "#ef4444" },
      { "priority_code": "normal", "priority_name_th": "ปกติ",     "color_hex": "#3b82f6" },
      { "priority_code": "low",    "priority_name_th": "ต่ำ",       "color_hex": "#94a3b8" }
    ],
    "request_sources": [
      { "source_code": "call",       "source_name_th": "โทรศัพท์แจ้ง",            "is_planned": false },
      { "source_code": "walk_in",    "source_name_th": "เดินมาแจ้งด้วยตนเอง",     "is_planned": false },
      { "source_code": "email",      "source_name_th": "อีเมล",                   "is_planned": false },
      { "source_code": "alert",      "source_name_th": "ระบบ Monitoring แจ้งเตือน","is_planned": false },
      { "source_code": "scheduled",  "source_name_th": "งานวางแผนล่วงหน้า",        "is_planned": true  },
      { "source_code": "inspection", "source_name_th": "ตรวจรอบ/PM",              "is_planned": true  },
      { "source_code": "other",      "source_name_th": "อื่นๆ",                    "is_planned": false }
    ],
    "config": {
      "day_start_hour": 8,
      "day_end_hour": 17
    }
  }
}
```

---

## 2) GET `/api/v1/it/activity/logs`

รายการกิจกรรม สำหรับ **tab "รายการกิจกรรม"** — ทุก field พร้อมแสดงในตารางและ Tooltip

### Query Parameters
| Param | Type | Required | คำอธิบาย |
|-------|------|----------|---------|
| `date_from`    | date    | -  | filter เริ่ม (`YYYY-MM-DD`) |
| `date_to`      | date    | -  | filter สิ้นสุด (`YYYY-MM-DD`) |
| `fiscal_year`  | int     | -  | ปีงบ BE เช่น `2569` (override `date_from`/`date_to`) |
| `staff_id`     | int     | -  | กรองตามผู้บันทึก |
| `type_code`    | string  | -  | `maintenance` \| `admin` \| ... |
| `system_code`  | string  | -  | `his` \| `network` \| ... |
| `status_code`  | string  | -  | `done` \| `in_progress` \| `waiting` \| `pending` |
| `priority`     | string  | -  | `urgent` \| `normal` \| `low` |
| `source`       | string  | -  | source_code |
| `is_overtime`  | bool    | -  | `true`/`false` |
| `is_closed`    | bool    | -  | filter งานปิด/ยังไม่ปิด |
| `search`       | string  | -  | ค้นหาใน `detail`, `outcome`, `staff_name`, `asset_code`, `ticket_id`, `location` |
| `page`         | int     | -  | default `1` |
| `limit`        | int     | -  | default `50`, max `200` |
| `sort`         | string  | -  | default `-log_date,start_time` (prefix `-` = DESC) |

### Response 200
```json
{
  "success": true,
  "data": [
    {
      "log_id": 10,
      "log_date": "2026-04-07",
      "log_date_th": "07/04/2026",
      "staff_id": 1,
      "staff_name": "นายสมชาย ใจดี",
      "staff_role": "IT Support / Hardware",
      "type_code": "maintenance",
      "type_name_th": "ซ่อมบำรุง",
      "activity_nature": "reactive",
      "system_code": "pc",
      "system_name": "คอมพิวเตอร์",
      "status_code": "waiting",
      "status_name": "รอดำเนินการ",
      "status_color": "#f59e0b",
      "is_closed": false,
      "start_time": "10:00",
      "end_time": "12:00",
      "time_slot": "10:00 – 12:00",
      "duration_hours": 2.00,
      "minutes_used": 100,
      "hours_used": 1.67,
      "detail": "คอมพิวเตอร์ห้องตรวจ 5 เปิดไม่ติด ตรวจสอบพบ power supply เสีย",
      "outcome": "สั่งอะไหล่ รอเปลี่ยน",
      "priority_code": "urgent",
      "priority_name": "เร่งด่วน",
      "priority_color": "#ef4444",
      "source_code": "call",
      "source_name": "โทรศัพท์แจ้ง",
      "source_is_planned": false,
      "location": "อาคาร OPD ชั้น 2 ห้องตรวจ 5",
      "asset_code": "PC-OPD-205",
      "affected_users": 3,
      "is_overtime": false,
      "ticket_id": "HD-2026-0412",
      "created_at": "2026-04-07T10:05:00Z",
      "updated_at": "2026-04-07T12:10:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 128,
    "total_pages": 3
  }
}
```

---

## 3) POST `/api/v1/it/activity/logs`

สร้างกิจกรรมใหม่ — ใช้ตอนกดปุ่ม "บันทึก" ใน Drawer (mode = create)

### Request Body
```json
{
  "log_date": "2026-04-07",
  "staff_id": 1,
  "type_code": "maintenance",
  "system_code": "pc",
  "status_code": "waiting",
  "start_time": "10:00",
  "end_time": "12:00",
  "minutes_used": 100,
  "detail": "คอมพิวเตอร์ห้องตรวจ 5 เปิดไม่ติด ตรวจสอบพบ power supply เสีย",
  "outcome": "สั่งอะไหล่ รอเปลี่ยน",
  "priority_code": "urgent",
  "source_code": "call",
  "location": "อาคาร OPD ชั้น 2 ห้องตรวจ 5",
  "asset_code": "PC-OPD-205",
  "affected_users": 3,
  "is_overtime": false,
  "ticket_id": "HD-2026-0412"
}
```

### Field Validation
| Field | Type | Required | Constraint |
|-------|------|----------|-----------|
| `log_date`        | date     | ✅ | `YYYY-MM-DD` |
| `staff_id`        | int      | ✅ | FK → `it_activity_staff` |
| `type_code`       | string   | ✅ | FK → `it_activity_types` |
| `system_code`     | string   | ✅ | FK → `it_activity_systems` |
| `status_code`     | string   | ✅ | FK → `it_activity_statuses` |
| `start_time`      | time     | ✅ | `HH:mm` (08:00 – 17:00) |
| `end_time`        | time     | ✅ | `HH:mm`, **ต้อง > start_time** |
| `minutes_used`    | int      | ✅ | 1 – 600 |
| `detail`          | string   | ✅ | ไม่เกิน 2000 ตัวอักษร |
| `outcome`         | string   | -  | nullable |
| `priority_code`   | string   | -  | default `normal` |
| `source_code`     | string   | -  | default `other` |
| `location`        | string   | -  | max 200 |
| `asset_code`      | string   | -  | max 60 |
| `affected_users`  | int      | -  | 0 – 10000, default 1 |
| `is_overtime`     | bool     | -  | default false |
| `ticket_id`       | string   | -  | max 50 |

> Backend ตรวจสอบ overlap slot ของ `staff_id` เดียวกันใน `log_date` เดียวกันได้ แต่**อนุญาตให้ซ้อนกันได้** (1 คนทำงานควบใน slot เดียวกันได้ตามข้อตกลง)

### Response 201
```json
{
  "success": true,
  "data": {
    "log_id": 142,
    "log_date": "2026-04-07",
    "duration_hours": 2.00,
    "hours_used": 1.67,
    "created_at": "2026-05-27T08:15:00Z"
  }
}
```

---

## 4) GET `/api/v1/it/activity/logs/[id]`

ดูรายละเอียดกิจกรรมรายเดียว — ใช้ตอนเปิด Drawer (mode = edit)

### Response 200
```json
{
  "success": true,
  "data": {
    "log_id": 10,
    "log_date": "2026-04-07",
    "log_date_th": "07/04/2026",
    "staff_id": 1,
    "staff_name": "นายสมชาย ใจดี",
    "type_code": "maintenance",
    "type_name_th": "ซ่อมบำรุง",
    "activity_nature": "reactive",
    "system_code": "pc",
    "system_name": "คอมพิวเตอร์",
    "status_code": "waiting",
    "status_name": "รอดำเนินการ",
    "status_color": "#f59e0b",
    "is_closed": false,
    "start_time": "10:00",
    "end_time": "12:00",
    "minutes_used": 100,
    "detail": "...",
    "outcome": "...",
    "priority_code": "urgent",
    "source_code": "call",
    "location": "อาคาร OPD ชั้น 2 ห้องตรวจ 5",
    "asset_code": "PC-OPD-205",
    "affected_users": 3,
    "is_overtime": false,
    "ticket_id": "HD-2026-0412",
    "created_at": "2026-04-07T10:05:00Z",
    "updated_at": "2026-04-07T12:10:00Z"
  }
}
```

---

## 5) PUT `/api/v1/it/activity/logs/[id]`

แก้ไขกิจกรรม — ใช้ตอนกดปุ่ม "บันทึก" ใน Drawer (mode = edit)

### Request Body
ใช้ field และ validation เดียวกับ [POST](#3-post-apiv1itactivitylogs) — ส่งทั้งหมด หรือเฉพาะ field ที่แก้ก็ได้ (server ใช้ PATCH semantics)

### Response 200
```json
{
  "success": true,
  "data": {
    "log_id": 10,
    "updated_at": "2026-05-27T08:20:00Z"
  }
}
```

---

## 6) DELETE `/api/v1/it/activity/logs/[id]`

ลบกิจกรรม (hard delete)

### Response 200
```json
{
  "success": true,
  "data": { "log_id": 10 }
}
```

---

## 7) GET `/api/v1/it/activity/daily`

ข้อมูลสำหรับ **tab "ตารางงานรายวัน"** — จัด row เป็น staff, column เป็น slot 1 ชม.

### Query Parameters
| Param | Type | Required | คำอธิบาย |
|-------|------|----------|---------|
| `date`      | date | ✅ | `YYYY-MM-DD` |
| `staff_id`  | int  | -  | กรองเฉพาะคน |

### Response 200
```json
{
  "success": true,
  "data": {
    "date": "2026-04-07",
    "date_th": "07/04/2026",
    "day_of_week_th": "อังคาร",
    "slots": [
      { "hour": 8, "label": "08:00" },
      { "hour": 9, "label": "09:00" },
      { "hour": 10, "label": "10:00" },
      { "hour": 11, "label": "11:00" },
      { "hour": 12, "label": "12:00" },
      { "hour": 13, "label": "13:00" },
      { "hour": 14, "label": "14:00" },
      { "hour": 15, "label": "15:00" },
      { "hour": 16, "label": "16:00" }
    ],
    "rows": [
      {
        "staff_id": 1,
        "staff_name": "นายสมชาย ใจดี",
        "total_minutes": 235,
        "task_count": 4,
        "tasks": [
          {
            "log_id": 10,
            "type_name_th": "ซ่อมบำรุง",
            "type_color": "orange",
            "status_code": "waiting",
            "status_color": "#f59e0b",
            "priority_code": "urgent",
            "is_overtime": false,
            "start_hour": 10,
            "end_hour": 12,
            "minutes_used": 100,
            "detail": "คอมพิวเตอร์ห้องตรวจ 5 เปิดไม่ติด"
          }
        ]
      }
    ]
  }
}
```

> หน้า React render `tasks` ใน column ที่ตรงกับ `start_hour` (block แรก) + render "↕ ต่อเนื่อง" ใน column ระหว่าง `start_hour + 1` ถึง `end_hour - 1`

---

## 8) GET `/api/v1/it/activity/dashboard`

ข้อมูลสรุปสำหรับ **tab "Dashboard"** — รวมทุก chart ใน 1 request เพื่อลด round trip

### Query Parameters
| Param | Type | Required | คำอธิบาย |
|-------|------|----------|---------|
| `fiscal_year` | int  | ✅ | ปีงบ BE เช่น `2569` |
| `staff_id`    | int  | -  | กรองเฉพาะคน |

### Response 200
```json
{
  "success": true,
  "data": {
    "fiscal_year": 2569,
    "period": { "start": "2025-10-01", "end": "2026-09-30" },

    "kpi": {
      "total_tasks": 128,
      "total_minutes": 14820,
      "total_hours": 247.0,
      "closed_tasks": 110,
      "open_tasks": 18,
      "overtime_tasks": 4,
      "reactive_pct": 38.5,
      "proactive_pct": 47.2,
      "neutral_pct": 14.3
    },

    "by_type": [
      { "type_code": "maintenance", "type_name_th": "ซ่อมบำรุง", "task_count": 42, "minutes": 5100 },
      { "type_code": "admin",       "type_name_th": "ดูแลระบบ",  "task_count": 30, "minutes": 3600 }
    ],

    "by_system": [
      { "system_code": "his",     "system_name_th": "ระบบ HIS",   "task_count": 35, "minutes": 4200 },
      { "system_code": "network", "system_name_th": "เครือข่าย",  "task_count": 18, "minutes": 1800 }
    ],

    "monthly_trend": [
      { "month_idx": 0,  "month_label": "ต.ค.", "year_be": 2568, "total_minutes": 1320, "reactive_minutes": 480 },
      { "month_idx": 1,  "month_label": "พ.ย.", "year_be": 2568, "total_minutes": 1100, "reactive_minutes": 350 },
      { "month_idx": 11, "month_label": "ก.ย.", "year_be": 2569, "total_minutes": 1500, "reactive_minutes": 620 }
    ],

    "nature_by_month": [
      { "month_idx": 0, "reactive": 480, "proactive": 700, "neutral": 140 }
    ],

    "staff_by_status": [
      {
        "staff_name": "นายสมชาย ใจดี",
        "done": 28, "in_progress": 4, "waiting": 6, "pending": 2
      }
    ],

    "slot_heatmap": [
      { "dow": 1, "hour": 8,  "count": 3 },
      { "dow": 1, "hour": 9,  "count": 7 },
      { "dow": 1, "hour": 10, "count": 12 }
    ],

    "by_priority": [
      { "priority_code": "urgent", "priority_name_th": "เร่งด่วน", "task_count": 22, "minutes": 2800 },
      { "priority_code": "normal", "priority_name_th": "ปกติ",     "task_count": 88, "minutes": 9200 },
      { "priority_code": "low",    "priority_name_th": "ต่ำ",       "task_count": 18, "minutes": 1400 }
    ],

    "by_source": [
      {
        "source_code": "call", "source_name_th": "โทรศัพท์แจ้ง",
        "is_planned": false, "task_count": 45, "minutes": 4100
      },
      {
        "source_code": "scheduled", "source_name_th": "งานวางแผนล่วงหน้า",
        "is_planned": true,  "task_count": 30, "minutes": 4200
      }
    ],
    "source_summary": {
      "planned_pct": 42.0,
      "interrupt_pct": 58.0
    },

    "top_assets": [
      { "asset_code": "PC-OPD-205",  "repair_count": 4, "minutes": 380 },
      { "asset_code": "PRT-PHARM-02","repair_count": 3, "minutes": 240 }
    ]
  }
}
```

### Mapping Chart ↔ Field

| Chart | Field ที่ใช้ |
|-------|------|
| KPI cards                     | `kpi.*` |
| Chart 1 Donut by type         | `by_type` |
| Chart 2 Bar by system         | `by_system` |
| Chart 3 Line monthly          | `monthly_trend` |
| Chart 4 Stacked nature×month  | `nature_by_month` |
| Chart 5 Stacked staff×status  | `staff_by_status` |
| Chart 6 Heatmap slot×DOW      | `slot_heatmap` (`dow`: 0=อา. … 6=ส.) |
| Chart 7 Rose Priority         | `by_priority` |
| Chart 8 Donut Source          | `by_source` + `source_summary` |
| Chart 9 Bar Top Assets        | `top_assets` |

---

## Error Response (มาตรฐาน)

ทุก endpoint คืน error ในรูปแบบเดียวกัน

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "end_time ต้องมากกว่า start_time",
    "field": "end_time"
  }
}
```

### HTTP Status Codes

| HTTP | code | กรณีใช้ |
|------|------|--------|
| 400 | `VALIDATION_ERROR` | ค่าผิด range, ขาด required field, `end_time <= start_time` |
| 401 | `UNAUTHORIZED`     | ไม่ได้ login |
| 403 | `FORBIDDEN`        | ลบ/แก้ไขกิจกรรมของคนอื่นโดยไม่มีสิทธิ์ |
| 404 | `NOT_FOUND`        | `log_id` ไม่มี / FK ไม่พบ (`staff_id`, `type_code` ฯลฯ) |
| 409 | `CONFLICT`         | `ticket_id` ซ้ำ (ถ้าตั้ง unique) |
| 500 | `INTERNAL_ERROR`   | DB error, unexpected exception |

---

## Flow การใช้งานในหน้า

```text
เปิดหน้า /information-technology/hait/activity
  └─► GET /master                                        (ครั้งเดียว, cache ฝั่ง client)

Tab "รายการกิจกรรม"
  └─► GET /logs?fiscal_year=2569&staff_id=...&search=... (filter ผ่าน query)

กดปุ่ม "เพิ่มกิจกรรม"
  └─► POST /logs                                         (mode = create)

กดปุ่ม "แก้ไข"
  ├─► GET  /logs/[id]                                    (โหลด detail เข้า Drawer)
  └─► PUT  /logs/[id]                                    (mode = edit)

กดปุ่ม "ลบ"
  └─► DELETE /logs/[id]

Tab "ตารางงานรายวัน"
  └─► GET /daily?date=2026-04-07

Tab "Dashboard"
  └─► GET /dashboard?fiscal_year=2569

เปลี่ยน DatePicker / Select ปีงบ
  └─► เรียก endpoint ตาม tab ใหม่
```

---

## Mapping ไปยังตาราง PostgreSQL

| API Field | ตาราง | คอลัมน์ |
|-----------|-------|--------|
| `log_id`             | `core_kon.it_activity_logs`             | `log_id` |
| `log_date`           | `core_kon.it_activity_logs`             | `log_date` |
| `staff_id` / `staff_name` | `core_kon.it_activity_staff`       | `staff_id` / `full_name_th` |
| `type_code`          | `core_kon.it_activity_logs`             | `type_code` (FK → `it_activity_types.type_code`) |
| `type_name_th` / `activity_nature` | `core_kon.it_activity_types` | `type_name_th` / `nature` |
| `system_code`        | `core_kon.it_activity_logs`             | `system_code` (FK → `it_activity_systems.system_code`) |
| `system_name`        | `core_kon.it_activity_systems`         | `system_name_th` |
| `status_code` / `status_name` / `status_color` / `is_closed` | `core_kon.it_activity_statuses` | `status_code` / `status_name_th` / `color_hex` / `is_closed` |
| `start_time` / `end_time` / `minutes_used` | `core_kon.it_activity_logs` | `start_time` / `end_time` / `minutes_used` |
| `duration_hours` / `hours_used` | `core_kon.it_activity_logs` | GENERATED (อ่านอย่างเดียว) |
| `detail` / `outcome` | `core_kon.it_activity_logs`             | `detail` / `outcome` |
| `priority_code` / `priority_name` / `priority_color` | `core_kon.it_activity_priorities` | `priority_code` / `priority_name_th` / `color_hex` |
| `source_code` / `source_name` / `source_is_planned`  | `core_kon.it_activity_request_sources` | `source_code` / `source_name_th` / `is_planned` |
| `location` / `asset_code` / `affected_users` / `is_overtime` / `ticket_id` | `core_kon.it_activity_logs` | (ตรงชื่อ) |
| view รวม              | `core_kon.it_activity_log_summary`     | — |

ดูโครงสร้างเต็มที่ [db/it_activity.sql](./it_activity.sql)

---

## Implementation Notes (Next.js App Router)

แต่ละ endpoint จะอยู่ที่:

```text
app/api/v1/it/activity/
├── master/route.ts                          ← GET
├── logs/
│   ├── route.ts                             ← GET (list), POST (create)
│   └── [id]/route.ts                        ← GET (detail), PUT, DELETE
├── daily/route.ts                           ← GET
└── dashboard/route.ts                       ← GET
```

### ตัวอย่าง Route Handler skeleton

```ts
// app/api/v1/it/activity/logs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const fy = sp.get('fiscal_year')           // BE
  const dateFrom = sp.get('date_from')
  const dateTo   = sp.get('date_to')
  const staffId  = sp.get('staff_id')
  const search   = sp.get('search')
  const page     = Math.max(1, Number(sp.get('page') ?? 1))
  const limit    = Math.min(200, Math.max(1, Number(sp.get('limit') ?? 50)))
  const offset   = (page - 1) * limit

  // ปีงบ → date range (ต.ค. ปี (fy-543-1) – ก.ย. ปี (fy-543))
  let start = dateFrom, end = dateTo
  if (fy) {
    const ce = Number(fy) - 543
    start = `${ce - 1}-10-01`
    end   = `${ce}-09-30`
  }

  try {
    const rows = await sql`
      SELECT * FROM core_kon.it_activity_log_summary
      WHERE (${start}::date IS NULL OR log_date >= ${start}::date)
        AND (${end}::date   IS NULL OR log_date <= ${end}::date)
        AND (${staffId}::int IS NULL OR staff_id = ${staffId}::int)
        AND (${search}::text IS NULL
             OR detail ILIKE '%' || ${search} || '%'
             OR outcome ILIKE '%' || ${search} || '%'
             OR staff_name ILIKE '%' || ${search} || '%'
             OR COALESCE(asset_code,'') ILIKE '%' || ${search} || '%'
             OR COALESCE(ticket_id,'')  ILIKE '%' || ${search} || '%')
      ORDER BY log_date DESC, start_time ASC
      LIMIT ${limit} OFFSET ${offset}
    `
    return NextResponse.json({ success: true, data: rows })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: String(e) } },
      { status: 500 },
    )
  }
}
```
