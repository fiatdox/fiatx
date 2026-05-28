# IT Incident Report — Database & API Specification

เอกสารโครงสร้างฐานข้อมูลและ API สำหรับหน้า [/information-technology/hait/incident-reports](../app/information-technology/hait/incident-reports/page.tsx)

- **Database:** PostgreSQL
- **Schema:** `core_kon`
- **Table:** `it_incident_report`
- **Base URL:** `/api/v1/it/incident`
- **มาตรฐาน:** สกมช (NCSA) — ประกาศว่าด้วยการรับมือภัยคุกคามไซเบอร์สำหรับหน่วยงานรัฐ
- **Content-Type:** `application/json`
- **Timezone:** Asia/Bangkok (`YYYY-MM-DD`)

---

## สารบัญ

1. [โครงสร้างตาราง](#โครงสร้างตาราง)
2. [ภาพรวม Endpoints](#ภาพรวม-endpoints)
3. [Master Data](#1-get-apiv1itincidentmaster)
4. [Incident List](#2-get-apiv1itincident)
5. [Create Incident](#3-post-apiv1itincident)
6. [Get Incident Detail](#4-get-apiv1itincidentid)
7. [Update Incident](#5-put-apiv1itincidentid)
8. [Delete Incident](#6-delete-apiv1itincidentid)
9. [Dashboard](#7-get-apiv1itincidentdashboard)
10. [PDF Report](#8-get-apiv1itincidentreport)
11. [Error Response](#error-response-มาตรฐาน)
12. [Flow การใช้งาน](#flow-การใช้งานในหน้า)
13. [Mapping ไปยังตาราง](#mapping-ไปยังตาราง)

---

## โครงสร้างตาราง

ดูไฟล์ DDL เต็มที่ [db/it_incident_report.sql](./it_incident_report.sql)

### ER Diagram (ภาพรวมความสัมพันธ์)

```
it_threat_type          it_attack_vector        it_affected_system
──────────────          ────────────────        ──────────────────
PK id                   PK id                   PK id
   threat_code             vector_code              system_code
   name_th                 name_th                  name_th
   name_en                 name_en                  name_en
   ncsa_category           vector_category          system_category
   is_cyber_attack         is_cyber_attack          criticality
   severity_hint           sort_order               sort_order
   sort_order              is_active                is_active
   is_active
       │                       │                       │
       └───────────────────────┴───────────────────────┘
                               │ ref (logical relation, ไม่มี FK constraint)
                               ▼
                    it_incident_report
                    ──────────────────
                    PK id
                       incident_no          ← auto INC-{YYYY}-{NNN}
                       incident_date
                       detected_date
                       report_date
                       reported_by
                       department
                    ref threat_type_id      → it_threat_type.id
                    ref attack_vector_id    → it_attack_vector.id
                    ref affected_system_id  → it_affected_system.id
                       affected_assets      (รายละเอียดเพิ่มเติม)
                       description
                       severity             VARCHAR+CHECK
                       impact
                       affected_users
                       data_breached        Y/N
                       continuity_impact    Y/N
                       root_cause
                       immediate_actions
                       long_term_measures
                       resolution
                       resolved_date
                       resolved_by
                       status               VARCHAR+CHECK
                       ncsa_reported        Y/N
                       ncsa_report_date
                       is_sla_related       Y/N
                       is_active            Y/N  (Soft Delete)
                       created_by / created_at
                       updated_by / updated_at
```

### สรุป Tables

| Table | ประเภท | จำนวน Row (Seed) | จุดประสงค์ |
|-------|--------|-----------------|-----------|
| `it_threat_type` | Master | 13 | ประเภทภัยคุกคาม taxonomy สกมช |
| `it_attack_vector` | Master | 9 | ช่องทาง/เวกเตอร์การโจมตี |
| `it_affected_system` | Master | 18 | ระบบสารสนเทศในโรงพยาบาล |
| `it_incident_report` | Fact | — | บันทึกอุบัติการณ์ (อ้างอิง 3 ตารางข้างต้น) |

### Taxonomy ภัยคุกคาม (สกมช)

| ประเภทภัย | ช่องทาง (Attack Vector) |
|----------|------------------------|
| มัลแวร์ | อีเมล, USB, เว็บไซต์ |
| แรนซัมแวร์ | อีเมล, เว็บไซต์, เครือข่ายภายใน |
| การเข้าถึงโดยไม่ได้รับอนุญาต | เครือข่ายภายใน, อินเทอร์เน็ต, บุคคลภายใน |
| การรั่วไหลของข้อมูล (Data Breach) | ทุกช่องทาง |
| DoS/DDoS | อินเทอร์เน็ต |
| ฟิชชิง | อีเมล, เว็บไซต์ |
| Social Engineering | บุคคลภายใน, อีเมล |
| Exploit | แอปพลิเคชัน, อินเทอร์เน็ต |
| Insider Threat | บุคคลภายใน |
| Web Application Attack | อินเทอร์เน็ต, แอปพลิเคชัน |
| ระบบล้มเหลว | ไม่ใช่การโจมตี |
| ฮาร์ดแวร์ขัดข้อง | ไม่ใช่การโจมตี |
| อื่นๆ | ไม่ทราบ |

### ระดับความรุนแรง (สกมช)

| Level | Code | สี | ความหมาย | กำหนดรายงาน สกมช |
|-------|------|----|---------|-----------------|
| 4 | `critical` | แดง | กระทบโครงสร้างพื้นฐานสำคัญ/ระดับชาติ | ภายใน 24 ชม. |
| 3 | `high` | ส้ม | กระทบการให้บริการหลักของหน่วยงาน | ภายใน 72 ชม. |
| 2 | `medium` | เหลือง | กระทบบางส่วน ยังให้บริการได้ | ภายใน 7 วัน |
| 1 | `low` | เขียว | กระทบเล็กน้อย ไม่กระทบบริการ | รายงานรายเดือน |

---

## ภาพรวม Endpoints

| # | Method | Endpoint | จุดประสงค์ |
|---|--------|----------|-----------|
| 1 | GET    | `/master`        | โหลด dropdown options ทั้งหมด |
| 2 | GET    | `/`              | รายการอุบัติการณ์ (filter + pagination) |
| 3 | POST   | `/`              | บันทึกอุบัติการณ์ใหม่ |
| 4 | GET    | `/[id]`          | ดูรายละเอียดอุบัติการณ์ |
| 5 | PUT    | `/[id]`          | แก้ไขอุบัติการณ์ |
| 6 | DELETE | `/[id]`          | ลบอุบัติการณ์ (soft delete) |
| 7 | GET    | `/dashboard`     | ข้อมูลสรุปสำหรับ Dashboard (ทุก chart) |
| 8 | GET    | `/report`        | ข้อมูลสำหรับสร้าง PDF รายงานรายเดือน |

---

## 1) GET `/api/v1/it/incident/master`

โหลดครั้งเดียวตอนเปิดหน้า — ใช้สร้าง Select/Form ทั้งหมด

### Response 200
```json
{
  "success": true,
  "data": {
    "threat_types": [
      { "id": 1,  "threat_code": "malware",             "label": "มัลแวร์ (Malware)",                        "ncsa_category": "Malicious Code", "severity_hint": "high" },
      { "id": 2,  "threat_code": "ransomware",           "label": "แรนซัมแวร์ (Ransomware)",                  "ncsa_category": "Malicious Code", "severity_hint": "critical" },
      { "id": 3,  "threat_code": "unauthorized_access",  "label": "การเข้าถึงโดยไม่ได้รับอนุญาต",            "ncsa_category": "Intrusion",      "severity_hint": "high" },
      { "id": 4,  "threat_code": "data_breach",          "label": "การรั่วไหลของข้อมูล (Data Breach)",        "ncsa_category": "Data Breach",    "severity_hint": "critical" },
      { "id": 5,  "threat_code": "dos_ddos",             "label": "การโจมตี DoS/DDoS",                        "ncsa_category": "Availability",   "severity_hint": "high" },
      { "id": 6,  "threat_code": "phishing",             "label": "ฟิชชิง (Phishing)",                        "ncsa_category": "Social",         "severity_hint": "medium" },
      { "id": 7,  "threat_code": "social_engineering",   "label": "Social Engineering",                        "ncsa_category": "Social",         "severity_hint": "medium" },
      { "id": 8,  "threat_code": "exploit",              "label": "การโจมตีผ่านช่องโหว่ (Exploit)",           "ncsa_category": "Intrusion",      "severity_hint": "high" },
      { "id": 9,  "threat_code": "insider_threat",       "label": "ภัยคุกคามจากภายใน (Insider Threat)",       "ncsa_category": "Intrusion",      "severity_hint": "high" },
      { "id": 10, "threat_code": "web_app_attack",       "label": "Web Application Attack",                    "ncsa_category": "Intrusion",      "severity_hint": "high" },
      { "id": 11, "threat_code": "system_failure",       "label": "ระบบล้มเหลว (System Failure)",              "ncsa_category": "System Failure", "severity_hint": "medium" },
      { "id": 12, "threat_code": "hardware_failure",     "label": "ฮาร์ดแวร์ขัดข้อง (Hardware Failure)",      "ncsa_category": "System Failure", "severity_hint": "low" },
      { "id": 13, "threat_code": "other",                "label": "อื่นๆ (Other)",                            "ncsa_category": "Other",          "severity_hint": "low" }
    ],
    "attack_vectors": [
      { "id": 1, "vector_code": "email",            "label": "อีเมล / ไฟล์แนบ",              "vector_category": "External" },
      { "id": 2, "vector_code": "website",          "label": "เว็บไซต์ / URL อันตราย",        "vector_category": "External" },
      { "id": 3, "vector_code": "usb",              "label": "USB / สื่อบันทึกข้อมูล",        "vector_category": "Physical" },
      { "id": 4, "vector_code": "internal_network", "label": "เครือข่ายภายใน",               "vector_category": "Internal" },
      { "id": 5, "vector_code": "internet",         "label": "เครือข่ายอินเทอร์เน็ต",        "vector_category": "External" },
      { "id": 6, "vector_code": "application",      "label": "แอปพลิเคชัน / ระบบ",           "vector_category": "Internal" },
      { "id": 7, "vector_code": "insider",          "label": "บุคคลภายใน",                   "vector_category": "Internal" },
      { "id": 8, "vector_code": "unknown",          "label": "ไม่ทราบช่องทาง",              "vector_category": "External" },
      { "id": 9, "vector_code": "not_attack",       "label": "ไม่ใช่การโจมตี (ความผิดพลาด)", "vector_category": "NA" }
    ],
    "severities": [
      { "value": "critical", "label": "วิกฤต (Critical) - ระดับ 4", "color": "#dc2626" },
      { "value": "high",     "label": "สูง (High) - ระดับ 3",       "color": "#ea580c" },
      { "value": "medium",   "label": "กลาง (Medium) - ระดับ 2",    "color": "#ca8a04" },
      { "value": "low",      "label": "ต่ำ (Low) - ระดับ 1",        "color": "#16a34a" }
    ],
    "statuses": [
      { "value": "open",        "label": "เปิด (รายงานใหม่)",   "color": "#ef4444" },
      { "value": "in_progress", "label": "กำลังดำเนินการ",       "color": "#f59e0b" },
      { "value": "resolved",    "label": "แก้ไขแล้ว (รอปิด)",    "color": "#3b82f6" },
      { "value": "closed",      "label": "ปิดเคส",               "color": "#22c55e" }
    ],
    "affected_systems": [
      { "id": 1,  "system_code": "his",              "label": "ระบบ HIS (Hospital Information System)", "system_category": "Clinical",       "criticality": "high" },
      { "id": 2,  "system_code": "lis",              "label": "ระบบ LIS (Laboratory)",                  "system_category": "Clinical",       "criticality": "high" },
      { "id": 3,  "system_code": "ris_pacs",         "label": "ระบบ RIS/PACS (รังสีวิทยา)",            "system_category": "Clinical",       "criticality": "high" },
      { "id": 4,  "system_code": "opd_queue",        "label": "ระบบคิว OPD",                           "system_category": "Clinical",       "criticality": "medium" },
      { "id": 5,  "system_code": "email_server",     "label": "เซิร์ฟเวอร์อีเมล",                     "system_category": "Infrastructure", "criticality": "high" },
      { "id": 6,  "system_code": "file_server",      "label": "File Server",                            "system_category": "Infrastructure", "criticality": "high" },
      { "id": 7,  "system_code": "database_server",  "label": "Database Server",                        "system_category": "Infrastructure", "criticality": "high" },
      { "id": 8,  "system_code": "web_server",       "label": "Web Server / Application Server",        "system_category": "Infrastructure", "criticality": "high" },
      { "id": 9,  "system_code": "backup_system",    "label": "ระบบ Backup",                           "system_category": "Infrastructure", "criticality": "medium" },
      { "id": 10, "system_code": "network_firewall", "label": "Network / Firewall",                     "system_category": "Network",        "criticality": "high" },
      { "id": 11, "system_code": "vpn",              "label": "VPN",                                    "system_category": "Network",        "criticality": "medium" },
      { "id": 12, "system_code": "wifi",             "label": "ระบบ Wi-Fi",                            "system_category": "Network",        "criticality": "medium" },
      { "id": 13, "system_code": "workstation",      "label": "Workstation / PC",                       "system_category": "Endpoint",       "criticality": "low" },
      { "id": 14, "system_code": "printer",          "label": "เครื่องพิมพ์ / อุปกรณ์ต่อพ่วง",        "system_category": "Endpoint",       "criticality": "low" },
      { "id": 15, "system_code": "mobile_device",    "label": "อุปกรณ์มือถือ / Tablet",               "system_category": "Endpoint",       "criticality": "medium" },
      { "id": 16, "system_code": "active_directory", "label": "Active Directory / LDAP",               "system_category": "Security",       "criticality": "high" },
      { "id": 17, "system_code": "antivirus",        "label": "ระบบ Antivirus / EDR",                  "system_category": "Security",       "criticality": "medium" },
      { "id": 18, "system_code": "other",            "label": "อื่นๆ",                                 "system_category": "Other",          "criticality": "medium" }
    ]
  }
}
```

---

## 2) GET `/api/v1/it/incident`

รายการอุบัติการณ์ สำหรับ **tab "รายการอุบัติการณ์"**

### Query Parameters
| Param | Type | Required | คำอธิบาย |
|-------|------|----------|---------|
| `date_from`     | date   | - | filter วันที่เริ่ม (`YYYY-MM-DD`) |
| `date_to`       | date   | - | filter วันที่สิ้นสุด (`YYYY-MM-DD`) |
| `month`         | string | - | กรองรายเดือน เช่น `2026-05` (override `date_from`/`date_to`) |
| `status`        | string | - | `open` \| `in_progress` \| `resolved` \| `closed` |
| `severity`      | string | - | `critical` \| `high` \| `medium` \| `low` |
| `threat_type`   | string | - | ตามค่าใน master |
| `data_breached` | string | - | `Y` \| `N` |
| `ncsa_reported` | string | - | `Y` \| `N` |
| `search`        | string | - | ค้นหาใน `incident_no`, `description`, `reported_by`, `department`, `affected_system` |
| `page`          | int    | - | default `1` |
| `limit`         | int    | - | default `50`, max `200` |
| `sort`          | string | - | default `-incident_date` (prefix `-` = DESC) |

### Response 200
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "incident_no": "INC-2026-001",
      "incident_date": "2026-04-03",
      "detected_date": "2026-04-03",
      "report_date": "2026-04-03",
      "reported_by": "นายสมชาย ใจดี",
      "department": "งานเทคโนโลยีสารสนเทศ",
      "threat_type": "มัลแวร์",
      "attack_vector": "อีเมล",
      "affected_system": "Workstation / PC",
      "affected_assets": "PC-OPD-205 (192.168.1.105)",
      "description": "ผู้ใช้เปิดไฟล์แนบอีเมลที่ติดมัลแวร์...",
      "severity": "high",
      "impact": "เครื่องคอมพิวเตอร์ไม่สามารถใช้งานได้",
      "affected_users": 3,
      "data_breached": "N",
      "continuity_impact": "Y",
      "root_cause": "ผู้ใช้ขาดความตระหนักรู้ด้านความปลอดภัยไซเบอร์",
      "immediate_actions": "Isolate เครื่อง, Scan มัลแวร์, Format และติดตั้งใหม่",
      "long_term_measures": "จัดอบรม Security Awareness, อัปเดต Email Filter",
      "resolution": "ลบมัลแวร์ ติดตั้ง OS ใหม่ อัปเดต Antivirus",
      "resolved_date": "2026-04-05",
      "resolved_by": "นายสมชาย ใจดี",
      "status": "closed",
      "ncsa_reported": "N",
      "ncsa_report_date": null,
      "is_sla_related": "N",
      "is_active": "Y",
      "created_by": "admin",
      "created_at": "2026-04-03T09:00:00Z",
      "updated_at": "2026-04-05T14:30:00Z",
      "mttr_days": 2
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 6,
    "total_pages": 1
  }
}
```

> `mttr_days` = `resolved_date - incident_date` (คำนวณ server-side, `null` ถ้ายังไม่ resolved)

---

## 3) POST `/api/v1/it/incident`

บันทึกอุบัติการณ์ใหม่ — ใช้ตอนกดปุ่ม "บันทึก" ใน Drawer (mode = create)

### Request Body
```json
{
  "incident_date": "2026-05-01",
  "detected_date": "2026-05-01",
  "report_date": "2026-05-01",
  "reported_by": "นายสมชาย ใจดี",
  "department": "งานเทคโนโลยีสารสนเทศ",
  "threat_type_id": 6,
  "attack_vector_id": 1,
  "affected_system_id": 5,
  "affected_assets": "บัญชีผู้ใช้ user@hospital.go.th",
  "description": "ผู้ใช้ได้รับอีเมลหลอกลวงแอบอ้างเป็น HR...",
  "severity": "medium",
  "impact": "ข้อมูลบัญชีผู้ใช้อาจถูกขโมย",
  "affected_users": 1,
  "data_breached": "N",
  "continuity_impact": "N",
  "root_cause": "Email Filter ไม่ตรวจจับ Spoofed sender",
  "immediate_actions": "Reset รหัสผ่าน, แจ้งเตือนผู้ใช้ทุกคน",
  "long_term_measures": "ติดตั้ง DMARC/SPF, อบรม Phishing Awareness",
  "resolution": "",
  "resolved_date": null,
  "resolved_by": "",
  "status": "in_progress",
  "ncsa_reported": "N",
  "ncsa_report_date": null,
  "is_sla_related": "N"
}
```

### Field Validation
| Field | Type | Required | Constraint |
|-------|------|----------|-----------|
| `incident_date`   | date   | ✅ | `YYYY-MM-DD`, ≤ today |
| `detected_date`   | date   | ✅ | `YYYY-MM-DD`, ≥ `incident_date` |
| `report_date`     | date   | ✅ | `YYYY-MM-DD`, ≥ `detected_date` |
| `reported_by`     | string | ✅ | max 100 |
| `department`      | string | ✅ | max 100 |
| `threat_type_id`    | int  | ✅ | `id` จาก `it_threat_type` |
| `attack_vector_id`  | int  | ✅ | `id` จาก `it_attack_vector` |
| `affected_system_id`| int  | ✅ | `id` จาก `it_affected_system` |
| `description`     | string | ✅ | max 5000 |
| `severity`        | string | ✅ | `critical/high/medium/low` |
| `affected_users`  | int    | ✅ | ≥ 0 |
| `data_breached`   | string | ✅ | `Y` หรือ `N` |
| `continuity_impact` | string | ✅ | `Y` หรือ `N` |
| `status`          | string | ✅ | `open/in_progress/resolved/closed` |
| `ncsa_reported`   | string | ✅ | `Y` หรือ `N` |
| `is_sla_related`  | string | ✅ | `Y` หรือ `N` |
| `resolved_date`   | date   | -  | required ถ้า `status=resolved/closed` |
| `ncsa_report_date`| date   | -  | required ถ้า `ncsa_reported=Y` |

> Backend สร้าง `incident_no` อัตโนมัติ รูปแบบ `INC-{YYYY}-{NNN}` (running number ต่อปี)

### Response 201
```json
{
  "success": true,
  "data": {
    "id": 7,
    "incident_no": "INC-2026-007",
    "created_at": "2026-05-28T08:00:00Z"
  }
}
```

---

## 4) GET `/api/v1/it/incident/[id]`

ดูรายละเอียดอุบัติการณ์รายเดียว — ใช้ตอนเปิด Drawer (mode = edit)

### Response 200
คืน object เดียวกับแต่ละ item ใน [GET list](#2-get-apiv1itincident) (ทุก field)

---

## 5) PUT `/api/v1/it/incident/[id]`

แก้ไขอุบัติการณ์ — ใช้ตอนกดปุ่ม "บันทึก" ใน Drawer (mode = edit)

### Request Body
ใช้ field และ validation เดียวกับ [POST](#3-post-apiv1itincident)

### Response 200
```json
{
  "success": true,
  "data": {
    "id": 1,
    "incident_no": "INC-2026-001",
    "updated_at": "2026-05-28T09:00:00Z"
  }
}
```

---

## 6) DELETE `/api/v1/it/incident/[id]`

ลบอุบัติการณ์ (Soft Delete — ตั้ง `is_active = 'N'`)

### Response 200
```json
{
  "success": true,
  "data": { "id": 1, "incident_no": "INC-2026-001" }
}
```

---

## 7) GET `/api/v1/it/incident/dashboard`

ข้อมูลสรุปสำหรับ **tab "Dashboard"** — รวมทุก chart ใน 1 request

### Query Parameters
| Param | Type | Required | คำอธิบาย |
|-------|------|----------|---------|
| `month`      | string | - | กรองเดือน เช่น `2026-05` |
| `date_from`  | date   | - | ช่วงวันที่เริ่ม |
| `date_to`    | date   | - | ช่วงวันที่สิ้นสุด |

### Response 200
```json
{
  "success": true,
  "data": {
    "kpi": {
      "total": 6,
      "open": 1,
      "in_progress": 1,
      "resolved": 1,
      "closed": 3,
      "critical_count": 1,
      "data_breach_count": 2,
      "ncsa_pending": 2,
      "avg_mttr_days": 3.2
    },

    "by_threat_type": [
      { "threat_type": "มัลแวร์",  "count": 2 },
      { "threat_type": "ฟิชชิง",   "count": 1 },
      { "threat_type": "DoS/DDoS", "count": 1 }
    ],

    "by_severity": [
      { "severity": "critical", "count": 1 },
      { "severity": "high",     "count": 2 },
      { "severity": "medium",   "count": 2 },
      { "severity": "low",      "count": 1 }
    ],

    "by_affected_system": [
      { "affected_system": "HIS (Hospital Information System)", "count": 3 },
      { "affected_system": "Workstation / PC",                  "count": 2 },
      { "affected_system": "Network / Firewall",                "count": 1 }
    ],

    "by_attack_vector": [
      { "attack_vector": "อีเมล",          "count": 3 },
      { "attack_vector": "เครือข่ายภายใน", "count": 2 },
      { "attack_vector": "อินเทอร์เน็ต",   "count": 1 }
    ],

    "breach_sla_ncsa": [
      {
        "category": "มีข้อมูลรั่วไหล",
        "yes_count": 2, "no_count": 4
      },
      {
        "category": "กระทบ SLA",
        "yes_count": 1, "no_count": 5
      },
      {
        "category": "รายงาน สกมช แล้ว",
        "yes_count": 4, "no_count": 2
      }
    ]
  }
}
```

### Mapping Chart ↔ Field

| Chart | Field ที่ใช้ |
|-------|------------|
| KPI Cards                        | `kpi.*` |
| Chart 1 Donut ประเภทภัยคุกคาม   | `by_threat_type` |
| Chart 2 Donut ระดับความรุนแรง    | `by_severity` |
| Chart 3 Bar ระบบที่ได้รับผลกระทบ | `by_affected_system` |
| Chart 4 Bar ช่องทางการโจมตี      | `by_attack_vector` |
| Chart 5 Bar รั่วไหล/SLA/สกมช    | `breach_sla_ncsa` |

---

## 8) GET `/api/v1/it/incident/report`

ข้อมูลสำหรับสร้าง **PDF รายงานรายเดือน** เพื่อส่งผู้บริหาร

### Query Parameters
| Param | Type | Required | คำอธิบาย |
|-------|------|----------|---------|
| `month` | string | ✅ | เดือนที่ต้องการรายงาน เช่น `2026-05` |

### Response 200
```json
{
  "success": true,
  "data": {
    "month": "2026-05",
    "month_label_th": "พฤษภาคม 2569",
    "generated_at": "2026-05-28T08:00:00Z",
    "summary": {
      "total": 3,
      "by_severity": { "critical": 0, "high": 1, "medium": 2, "low": 0 },
      "data_breach_count": 1,
      "ncsa_reported_count": 1,
      "avg_mttr_days": 4.0,
      "open_count": 1
    },
    "incidents": [
      {
        "incident_no": "INC-2026-004",
        "incident_date": "2026-05-01",
        "threat_type": "ฟิชชิง",
        "severity": "medium",
        "affected_system": "Email Server",
        "status": "resolved",
        "mttr_days": 4,
        "ncsa_reported": "Y",
        "data_breached": "N"
      }
    ]
  }
}
```

> หน้า Frontend รับ response นี้แล้วสร้าง HTML ด้วย `buildPrintHtml()` และ `window.print()` — ไม่จำเป็นต้องสร้าง PDF ฝั่ง Server

---

## Error Response (มาตรฐาน)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "resolved_date ต้องระบุเมื่อ status เป็น resolved หรือ closed",
    "field": "resolved_date"
  }
}
```

### HTTP Status Codes

| HTTP | Code | กรณีใช้ |
|------|------|--------|
| 400 | `VALIDATION_ERROR` | ค่าผิด, ขาด required field, วันที่ไม่สอดคล้อง |
| 401 | `UNAUTHORIZED`     | ไม่ได้ login |
| 403 | `FORBIDDEN`        | ไม่มีสิทธิ์แก้ไข/ลบ |
| 404 | `NOT_FOUND`        | `id` ไม่มีในระบบ หรือ `is_active = 'N'` |
| 409 | `CONFLICT`         | `incident_no` ซ้ำ |
| 500 | `INTERNAL_ERROR`   | DB error, unexpected exception |

---

## Flow การใช้งานในหน้า

```text
เปิดหน้า /information-technology/hait/incident-reports
  └─► GET /master                   (ครั้งเดียว — สร้าง dropdown options)
  └─► GET /?month=2026-05           (โหลดรายการเริ่มต้น)

Tab "Dashboard"
  └─► GET /dashboard?month=2026-05  (โหลดทุก chart ใน 1 request)

Tab "รายการอุบัติการณ์"
  └─► GET /?search=...&severity=...&status=... (filter แบบ real-time)

กดปุ่ม "เพิ่มอุบัติการณ์"
  └─► POST /                        (mode = create)

กดปุ่ม "แก้ไข"
  ├─► GET  /[id]                    (โหลด detail เข้า Drawer)
  └─► PUT  /[id]                    (mode = edit, กดบันทึก)

กดปุ่ม "ลบ"
  └─► DELETE /[id]                  (soft delete, is_active = 'N')

กดปุ่ม "พิมพ์รายงาน PDF"
  └─► GET /report?month=2026-05     (รับข้อมูล → buildPrintHtml() → window.print())
```

---

## Mapping ไปยังตาราง

| API Field | ตาราง | Column |
|-----------|-------|--------|
| `id` | `it_incident_report` | `id` |
| `incident_no` | `it_incident_report` | `incident_no` |
| `incident_date` | `it_incident_report` | `incident_date` |
| `detected_date` | `it_incident_report` | `detected_date` |
| `report_date` | `it_incident_report` | `report_date` |
| `reported_by` | `it_incident_report` | `reported_by` |
| `department` | `it_incident_report` | `department` |
| `threat_type_id` | `it_incident_report` | `threat_type_id` (ref) |
| `threat_type` / `threat_type_en` | `it_threat_type` | `name_th` / `name_en` |
| `ncsa_category` | `it_threat_type` | `ncsa_category` |
| `attack_vector_id` | `it_incident_report` | `attack_vector_id` (ref) |
| `attack_vector` / `attack_vector_en` | `it_attack_vector` | `name_th` / `name_en` |
| `affected_system_id` | `it_incident_report` | `affected_system_id` (ref) |
| `affected_system` / `system_category` | `it_affected_system` | `name_th` / `system_category` |
| `affected_assets` | `it_incident_report` | `affected_assets` |
| `description` | `it_incident_report` | `description` |
| `severity` | `it_incident_report` | `severity` (VARCHAR+CHECK) |
| `impact` | `it_incident_report` | `impact` |
| `affected_users` | `it_incident_report` | `affected_users` |
| `data_breached` | `it_incident_report` | `data_breached` (Y/N) |
| `continuity_impact` | `it_incident_report` | `continuity_impact` (Y/N) |
| `root_cause` | `it_incident_report` | `root_cause` |
| `immediate_actions` | `it_incident_report` | `immediate_actions` |
| `long_term_measures` | `it_incident_report` | `long_term_measures` |
| `resolution` | `it_incident_report` | `resolution` |
| `resolved_date` | `it_incident_report` | `resolved_date` |
| `resolved_by` | `it_incident_report` | `resolved_by` |
| `status` | `it_incident_report` | `status` (VARCHAR+CHECK) |
| `ncsa_reported` | `it_incident_report` | `ncsa_reported` (Y/N) |
| `ncsa_report_date` | `it_incident_report` | `ncsa_report_date` |
| `is_sla_related` | `it_incident_report` | `is_sla_related` (Y/N) |
| `mttr_days` | คำนวณ | `(resolved_date - incident_date)` — PostgreSQL interval |
| `is_active` | `it_incident_report` | `is_active` (Y/N) — Soft Delete |
| `created_by` / `created_at` | `it_incident_report` | `created_by` / `created_at` |
| `updated_by` / `updated_at` | `it_incident_report` | `updated_by` / `updated_at` |

### ตัวอย่าง JOIN query สำหรับ list

```sql
SELECT
  r.id, r.incident_no,
  r.incident_date, r.detected_date, r.report_date,
  r.reported_by, r.department,
  tt.name_th  AS threat_type,
  tt.ncsa_category,
  av.name_th  AS attack_vector,
  asy.name_th AS affected_system,
  asy.system_category,
  r.affected_assets, r.description,
  r.severity, r.impact, r.affected_users,
  r.data_breached, r.continuity_impact,
  r.root_cause, r.immediate_actions, r.long_term_measures,
  r.resolution, r.resolved_date, r.resolved_by, r.status,
  r.ncsa_reported, r.ncsa_report_date, r.is_sla_related,
  (r.resolved_date - r.incident_date)        AS mttr_days,
  r.created_by, r.created_at, r.updated_at
FROM core_kon.it_incident_report r
  JOIN core_kon.it_threat_type    tt  ON r.threat_type_id     = tt.id
  JOIN core_kon.it_attack_vector  av  ON r.attack_vector_id   = av.id
  JOIN core_kon.it_affected_system asy ON r.affected_system_id = asy.id
WHERE r.is_active = 'Y'
ORDER BY r.incident_date DESC
;
```

ดูโครงสร้างตารางเต็มที่ [db/it_incident_report.sql](./it_incident_report.sql)

---

## Implementation Notes (Next.js App Router)

```text
app/api/v1/it/incident/
├── master/route.ts          ← GET
├── route.ts                 ← GET (list), POST (create)
├── [id]/route.ts            ← GET (detail), PUT, DELETE
├── dashboard/route.ts       ← GET
└── report/route.ts          ← GET (PDF data)
```

### ตัวอย่าง auto-generate incident_no

```ts
// สร้างเลขที่อุบัติการณ์รูปแบบ INC-2026-001
async function nextIncidentNo(year: number): Promise<string> {
  const result = await sql`
    SELECT COUNT(*) AS cnt
    FROM core_kon.it_incident_report
    WHERE EXTRACT(YEAR FROM incident_date) = ${year}
      AND is_active = 'Y'
  `
  const seq = (Number(result[0].cnt) + 1).toString().padStart(3, '0')
  return `INC-${year}-${seq}`
}
```
