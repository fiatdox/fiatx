-- ============================================================
-- MODULE: IT Incident Report — Cybersecurity Incident Management
-- DESCRIPTION: บันทึกและวิเคราะห์อุบัติการณ์ความมั่นคงปลอดภัยไซเบอร์
--              ตามมาตรฐาน สกมช (NCSA) สำหรับหน่วยงานรัฐ
-- PAGE: /information-technology/hait/incident-reports
-- DATABASE: PostgreSQL
-- SCHEMA: core_kon
-- CREATED: 2026-05-28
--
-- TABLES:
--   1. it_threat_type       — master ประเภทภัยคุกคาม (taxonomy สกมช)
--   2. it_attack_vector     — master ช่องทาง/เวกเตอร์การโจมตี
--   3. it_affected_system   — master ระบบที่ได้รับผลกระทบ
--   4. it_incident_report   — fact บันทึกอุบัติการณ์ (อ้างอิง 3 ตารางข้างต้น)
-- ============================================================

CREATE SCHEMA IF NOT EXISTS core_kon;

-- ─────────────────────────────────────────────────────────────
-- TRIGGER FUNCTION: auto-update updated_at on every UPDATE
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION core_kon.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────────
-- TABLE 1: it_threat_type
-- DESCRIPTION: Master ประเภทภัยคุกคามไซเบอร์ตาม taxonomy สกมช
-- ─────────────────────────────────────────────────────────────
CREATE TABLE core_kon.it_threat_type (

  id              SMALLINT     NOT NULL GENERATED ALWAYS AS IDENTITY,
  threat_code     VARCHAR(40)  NOT NULL,
  name_th         VARCHAR(100) NOT NULL,
  name_en         VARCHAR(100) NOT NULL,
  ncsa_category   VARCHAR(60),
  is_cyber_attack CHAR(1)      NOT NULL DEFAULT 'Y',
  severity_hint   VARCHAR(10),
  sort_order      SMALLINT     NOT NULL DEFAULT 99,
  is_active       CHAR(1)      NOT NULL DEFAULT 'Y',

  PRIMARY KEY (id),
  CONSTRAINT uq_threat_code        UNIQUE (threat_code),
  CONSTRAINT chk_tt_is_cyber       CHECK (is_cyber_attack IN ('Y','N')),
  CONSTRAINT chk_tt_severity_hint  CHECK (severity_hint IS NULL OR severity_hint IN ('critical','high','medium','low')),
  CONSTRAINT chk_tt_is_active      CHECK (is_active IN ('Y','N'))

);

COMMENT ON TABLE  core_kon.it_threat_type              IS 'Master ประเภทภัยคุกคามไซเบอร์ตาม taxonomy สกมช — ใช้เป็น dropdown ในฟอร์มอุบัติการณ์';
COMMENT ON COLUMN core_kon.it_threat_type.id           IS 'รหัสประเภทภัยคุกคาม (PK)';
COMMENT ON COLUMN core_kon.it_threat_type.threat_code  IS 'รหัสภัยคุกคาม เช่น malware, ransomware, phishing (ใช้ใน API/code)';
COMMENT ON COLUMN core_kon.it_threat_type.name_th      IS 'ชื่อภัยคุกคาม ภาษาไทย เช่น มัลแวร์, ฟิชชิง';
COMMENT ON COLUMN core_kon.it_threat_type.name_en      IS 'ชื่อภัยคุกคาม ภาษาอังกฤษ เช่น Malware, Phishing';
COMMENT ON COLUMN core_kon.it_threat_type.ncsa_category IS 'หมวดหมู่ตาม สกมช: Malicious Code, Intrusion, Social, Availability, Data Breach, System Failure, Other';
COMMENT ON COLUMN core_kon.it_threat_type.is_cyber_attack IS 'Y=ภัยคุกคามจริง, N=ความผิดพลาดของระบบ';
COMMENT ON COLUMN core_kon.it_threat_type.severity_hint IS 'ระดับความรุนแรงที่แนะนำ: critical/high/medium/low';
COMMENT ON COLUMN core_kon.it_threat_type.sort_order   IS 'ลำดับการแสดงผลใน dropdown';
COMMENT ON COLUMN core_kon.it_threat_type.is_active    IS 'Y=ใช้งาน, N=ซ่อนจาก dropdown (Soft Disable)';

-- Seed: ประเภทภัยคุกคาม 13 รายการ
INSERT INTO core_kon.it_threat_type
  (threat_code,           name_th,                             name_en,                      ncsa_category,    is_cyber_attack, severity_hint, sort_order)
VALUES
  ('malware',             'มัลแวร์',                            'Malware',                    'Malicious Code', 'Y', 'high',     1),
  ('ransomware',          'แรนซัมแวร์',                         'Ransomware',                 'Malicious Code', 'Y', 'critical', 2),
  ('unauthorized_access', 'การเข้าถึงโดยไม่ได้รับอนุญาต',     'Unauthorized Access',         'Intrusion',      'Y', 'high',     3),
  ('data_breach',         'การรั่วไหลของข้อมูล',                'Data Breach',                 'Data Breach',    'Y', 'critical', 4),
  ('dos_ddos',            'การโจมตี DoS/DDoS',                  'DoS/DDoS Attack',             'Availability',   'Y', 'high',     5),
  ('phishing',            'ฟิชชิง',                             'Phishing',                    'Social',         'Y', 'medium',   6),
  ('social_engineering',  'Social Engineering',                 'Social Engineering',          'Social',         'Y', 'medium',   7),
  ('exploit',             'การโจมตีผ่านช่องโหว่',               'Exploit / Vulnerability',     'Intrusion',      'Y', 'high',     8),
  ('insider_threat',      'ภัยคุกคามจากภายใน',                 'Insider Threat',              'Intrusion',      'Y', 'high',     9),
  ('web_app_attack',      'Web Application Attack',             'Web Application Attack',      'Intrusion',      'Y', 'high',    10),
  ('system_failure',      'ระบบล้มเหลว',                        'System Failure',              'System Failure', 'N', 'medium',  11),
  ('hardware_failure',    'ฮาร์ดแวร์ขัดข้อง',                  'Hardware Failure',            'System Failure', 'N', 'low',     12),
  ('other',               'อื่นๆ',                              'Other',                       'Other',          'Y', 'low',     13)
;


-- ─────────────────────────────────────────────────────────────
-- TABLE 2: it_attack_vector
-- DESCRIPTION: Master ช่องทาง/เวกเตอร์การโจมตี
-- ─────────────────────────────────────────────────────────────
CREATE TABLE core_kon.it_attack_vector (

  id              SMALLINT     NOT NULL GENERATED ALWAYS AS IDENTITY,
  vector_code     VARCHAR(40)  NOT NULL,
  name_th         VARCHAR(100) NOT NULL,
  name_en         VARCHAR(100) NOT NULL,
  vector_category VARCHAR(40),
  is_cyber_attack CHAR(1)      NOT NULL DEFAULT 'Y',
  sort_order      SMALLINT     NOT NULL DEFAULT 99,
  is_active       CHAR(1)      NOT NULL DEFAULT 'Y',

  PRIMARY KEY (id),
  CONSTRAINT uq_vector_code      UNIQUE (vector_code),
  CONSTRAINT chk_av_is_cyber     CHECK (is_cyber_attack IN ('Y','N')),
  CONSTRAINT chk_av_is_active    CHECK (is_active IN ('Y','N'))

);

COMMENT ON TABLE  core_kon.it_attack_vector              IS 'Master ช่องทาง/เวกเตอร์การโจมตีไซเบอร์ — ใช้เป็น dropdown ในฟอร์มอุบัติการณ์';
COMMENT ON COLUMN core_kon.it_attack_vector.id           IS 'รหัสเวกเตอร์การโจมตี (PK)';
COMMENT ON COLUMN core_kon.it_attack_vector.vector_code  IS 'รหัสเวกเตอร์ เช่น email, usb, internal_network (ใช้ใน API/code)';
COMMENT ON COLUMN core_kon.it_attack_vector.name_th      IS 'ชื่อช่องทาง ภาษาไทย เช่น อีเมล / ไฟล์แนบ';
COMMENT ON COLUMN core_kon.it_attack_vector.name_en      IS 'ชื่อช่องทาง ภาษาอังกฤษ เช่น Email / Attachment';
COMMENT ON COLUMN core_kon.it_attack_vector.vector_category IS 'หมวดหมู่: External=ภายนอก, Internal=ภายใน, Physical=อุปกรณ์, NA=ไม่ใช่การโจมตี';
COMMENT ON COLUMN core_kon.it_attack_vector.is_cyber_attack IS 'Y=ช่องทางโจมตีจริง, N=ไม่ใช่การโจมตี';
COMMENT ON COLUMN core_kon.it_attack_vector.sort_order   IS 'ลำดับการแสดงผลใน dropdown';
COMMENT ON COLUMN core_kon.it_attack_vector.is_active    IS 'Y=ใช้งาน, N=ซ่อนจาก dropdown';

-- Seed: เวกเตอร์การโจมตี 9 รายการ
INSERT INTO core_kon.it_attack_vector
  (vector_code,        name_th,                       name_en,                            vector_category, is_cyber_attack, sort_order)
VALUES
  ('email',            'อีเมล / ไฟล์แนบ',             'Email / Attachment',               'External', 'Y', 1),
  ('website',          'เว็บไซต์ / URL อันตราย',       'Malicious Website / URL',          'External', 'Y', 2),
  ('usb',              'USB / สื่อบันทึกข้อมูล',       'USB / Removable Media',            'Physical', 'Y', 3),
  ('internal_network', 'เครือข่ายภายใน',               'Internal Network',                 'Internal', 'Y', 4),
  ('internet',         'เครือข่ายอินเทอร์เน็ต',        'Internet',                         'External', 'Y', 5),
  ('application',      'แอปพลิเคชัน / ระบบ',          'Application / System',             'Internal', 'Y', 6),
  ('insider',          'บุคคลภายใน',                   'Insider',                          'Internal', 'Y', 7),
  ('unknown',          'ไม่ทราบช่องทาง',               'Unknown',                          'External', 'Y', 8),
  ('not_attack',       'ไม่ใช่การโจมตี (ความผิดพลาด)', 'Not an Attack (Error/Failure)',    'NA',       'N', 9)
;


-- ─────────────────────────────────────────────────────────────
-- TABLE 3: it_affected_system
-- DESCRIPTION: Master ระบบสารสนเทศที่อาจได้รับผลกระทบในโรงพยาบาล
-- ─────────────────────────────────────────────────────────────
CREATE TABLE core_kon.it_affected_system (

  id              INTEGER      NOT NULL GENERATED ALWAYS AS IDENTITY,
  system_code     VARCHAR(40)  NOT NULL,
  name_th         VARCHAR(150) NOT NULL,
  name_en         VARCHAR(150) NOT NULL,
  system_category VARCHAR(40)  NOT NULL,
  criticality     VARCHAR(10)  NOT NULL DEFAULT 'medium',
  sort_order      INTEGER      NOT NULL DEFAULT 99,
  is_active       CHAR(1)      NOT NULL DEFAULT 'Y',

  PRIMARY KEY (id),
  CONSTRAINT uq_system_code       UNIQUE (system_code),
  CONSTRAINT chk_as_criticality   CHECK (criticality IN ('high','medium','low')),
  CONSTRAINT chk_as_is_active     CHECK (is_active IN ('Y','N'))

);

COMMENT ON TABLE  core_kon.it_affected_system               IS 'Master ระบบสารสนเทศในโรงพยาบาลที่อาจได้รับผลกระทบจากอุบัติการณ์ไซเบอร์';
COMMENT ON COLUMN core_kon.it_affected_system.id            IS 'รหัสระบบ (PK)';
COMMENT ON COLUMN core_kon.it_affected_system.system_code   IS 'รหัสระบบ เช่น his, email_server, active_directory';
COMMENT ON COLUMN core_kon.it_affected_system.name_th       IS 'ชื่อระบบ ภาษาไทย เช่น ระบบ HIS';
COMMENT ON COLUMN core_kon.it_affected_system.name_en       IS 'ชื่อระบบ ภาษาอังกฤษ เช่น HIS (Hospital Information System)';
COMMENT ON COLUMN core_kon.it_affected_system.system_category IS 'หมวดหมู่: Clinical, Infrastructure, Endpoint, Network, Security, Other';
COMMENT ON COLUMN core_kon.it_affected_system.criticality   IS 'ระดับความสำคัญ: high=สำคัญมาก, medium=ปานกลาง, low=ต่ำ';
COMMENT ON COLUMN core_kon.it_affected_system.sort_order    IS 'ลำดับการแสดงผลใน dropdown (จัดกลุ่มตาม system_category)';
COMMENT ON COLUMN core_kon.it_affected_system.is_active     IS 'Y=ใช้งาน, N=ซ่อนจาก dropdown';

-- Seed: ระบบสารสนเทศ 18 รายการ แยกตามหมวดหมู่
INSERT INTO core_kon.it_affected_system
  (system_code,        name_th,                                   name_en,                               system_category,  criticality, sort_order)
VALUES
  -- Clinical
  ('his',              'ระบบ HIS (Hospital Information System)',  'HIS (Hospital Information System)',    'Clinical',       'high',    1),
  ('lis',              'ระบบ LIS (Laboratory)',                   'LIS (Laboratory Information System)', 'Clinical',       'high',    2),
  ('ris_pacs',         'ระบบ RIS/PACS (รังสีวิทยา)',             'RIS/PACS (Radiology)',                 'Clinical',       'high',    3),
  ('opd_queue',        'ระบบคิว OPD',                            'OPD Queue System',                    'Clinical',       'medium',  4),
  -- Infrastructure
  ('email_server',     'เซิร์ฟเวอร์อีเมล',                       'Email Server',                        'Infrastructure', 'high',   10),
  ('file_server',      'File Server',                             'File Server',                         'Infrastructure', 'high',   11),
  ('database_server',  'Database Server',                         'Database Server',                     'Infrastructure', 'high',   12),
  ('web_server',       'Web Server / Application Server',         'Web / Application Server',            'Infrastructure', 'high',   13),
  ('backup_system',    'ระบบ Backup',                            'Backup System',                       'Infrastructure', 'medium', 14),
  -- Network
  ('network_firewall', 'Network / Firewall',                      'Network / Firewall',                  'Network',        'high',   20),
  ('vpn',              'VPN',                                     'VPN',                                 'Network',        'medium', 21),
  ('wifi',             'ระบบ Wi-Fi',                             'Wi-Fi System',                        'Network',        'medium', 22),
  -- Endpoint
  ('workstation',      'Workstation / PC',                        'Workstation / PC',                    'Endpoint',       'low',    30),
  ('printer',          'เครื่องพิมพ์ / อุปกรณ์ต่อพ่วง',          'Printer / Peripheral',                'Endpoint',       'low',    31),
  ('mobile_device',    'อุปกรณ์มือถือ / Tablet',                 'Mobile Device / Tablet',              'Endpoint',       'medium', 32),
  -- Security
  ('active_directory', 'Active Directory / LDAP',                 'Active Directory / LDAP',             'Security',       'high',   40),
  ('antivirus',        'ระบบ Antivirus / EDR',                   'Antivirus / EDR System',              'Security',       'medium', 41),
  -- Other
  ('other',            'อื่นๆ',                                   'Other',                               'Other',          'medium', 99)
;


-- ─────────────────────────────────────────────────────────────
-- TABLE 4: it_incident_report
-- DESCRIPTION: Fact table บันทึกอุบัติการณ์ความมั่นคงปลอดภัยไซเบอร์
--              อ้างอิง it_threat_type, it_attack_vector, it_affected_system
--              (logical relation — ไม่มี FK constraint)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE core_kon.it_incident_report (

  -- ─── PRIMARY KEY ─────────────────────────────────────────────────
  id                  INTEGER       NOT NULL GENERATED ALWAYS AS IDENTITY,
  incident_no         VARCHAR(20)   NOT NULL,

  -- ─── ส่วนที่ 1: ข้อมูลทั่วไป ─────────────────────────────────────
  incident_date       TIMESTAMP     NOT NULL,
  detected_date       TIMESTAMP     NOT NULL,
  report_date         DATE          NOT NULL,
  reported_by         VARCHAR(100)  NOT NULL,
  department          VARCHAR(100)  NOT NULL,

  -- ─── ส่วนที่ 2: ประเภทภัยคุกคาม (ref → master, ไม่มี FK constraint) ──
  threat_type_id      SMALLINT      NOT NULL,
  attack_vector_id    SMALLINT      NOT NULL,
  affected_system_id  INTEGER       NOT NULL,
  affected_assets     TEXT,
  description         TEXT          NOT NULL,

  -- ─── ส่วนที่ 3: ผลกระทบ ─────────────────────────────────────────
  severity            VARCHAR(10)   NOT NULL,
  impact              TEXT,
  affected_users      INTEGER       NOT NULL DEFAULT 0,
  data_breached       CHAR(1)       NOT NULL DEFAULT 'N',
  continuity_impact   CHAR(1)       NOT NULL DEFAULT 'N',

  -- ─── ส่วนที่ 4: Root Cause ──────────────────────────────────────
  root_cause          TEXT,

  -- ─── ส่วนที่ 5: มาตรการ ─────────────────────────────────────────
  immediate_actions   TEXT,
  long_term_measures  TEXT,

  -- ─── ส่วนที่ 6: การแก้ไข ────────────────────────────────────────
  resolution          TEXT,
  resolved_date       DATE,
  resolved_by         VARCHAR(100),
  status              VARCHAR(15)   NOT NULL DEFAULT 'open',

  -- ─── การรายงาน สกมช / SLA ────────────────────────────────────────
  ncsa_reported       CHAR(1)       NOT NULL DEFAULT 'N',
  ncsa_report_date    DATE,
  is_sla_related      CHAR(1)       NOT NULL DEFAULT 'N',

  -- ─── METADATA ────────────────────────────────────────────────────
  is_active           CHAR(1)       NOT NULL DEFAULT 'Y',
  created_by          VARCHAR(100),
  created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by          VARCHAR(100),
  updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- ─── CONSTRAINTS ─────────────────────────────────────────────────
  PRIMARY KEY (id),
  CONSTRAINT uq_incident_no            UNIQUE (incident_no),
  CONSTRAINT chk_ir_severity           CHECK (severity IN ('critical','high','medium','low')),
  CONSTRAINT chk_ir_status             CHECK (status IN ('open','in_progress','resolved','closed')),
  CONSTRAINT chk_ir_data_breached      CHECK (data_breached IN ('Y','N')),
  CONSTRAINT chk_ir_continuity_impact  CHECK (continuity_impact IN ('Y','N')),
  CONSTRAINT chk_ir_ncsa_reported      CHECK (ncsa_reported IN ('Y','N')),
  CONSTRAINT chk_ir_is_sla_related     CHECK (is_sla_related IN ('Y','N')),
  CONSTRAINT chk_ir_is_active          CHECK (is_active IN ('Y','N')),
  CONSTRAINT chk_ir_resolved_date      CHECK (resolved_date IS NULL OR resolved_date >= incident_date::date)

);

COMMENT ON TABLE  core_kon.it_incident_report                   IS 'Fact บันทึกอุบัติการณ์ความมั่นคงปลอดภัยไซเบอร์ตามมาตรฐาน สกมช';
COMMENT ON COLUMN core_kon.it_incident_report.id                IS 'รหัสอุบัติการณ์ (PK)';
COMMENT ON COLUMN core_kon.it_incident_report.incident_no       IS 'หมายเลขอุบัติการณ์ สร้างอัตโนมัติ เช่น INC-2026-001';
COMMENT ON COLUMN core_kon.it_incident_report.incident_date     IS 'วันเวลาที่เกิดเหตุการณ์ (TIMESTAMP — บันทึกทั้งวันและเวลา)';
COMMENT ON COLUMN core_kon.it_incident_report.detected_date     IS 'วันเวลาที่ตรวจพบเหตุการณ์ (TIMESTAMP — ต้องไม่หลัง report_date)';
COMMENT ON COLUMN core_kon.it_incident_report.report_date       IS 'วันที่รายงาน (บันทึกในระบบ)';
COMMENT ON COLUMN core_kon.it_incident_report.reported_by       IS 'ชื่อผู้รายงาน';
COMMENT ON COLUMN core_kon.it_incident_report.department        IS 'หน่วยงาน/แผนกที่พบเหตุการณ์';
COMMENT ON COLUMN core_kon.it_incident_report.threat_type_id    IS 'ref → it_threat_type.id — ประเภทภัยคุกคาม';
COMMENT ON COLUMN core_kon.it_incident_report.attack_vector_id  IS 'ref → it_attack_vector.id — ช่องทาง/เวกเตอร์การโจมตี';
COMMENT ON COLUMN core_kon.it_incident_report.affected_system_id IS 'ref → it_affected_system.id — ระบบหลักที่ได้รับผลกระทบ';
COMMENT ON COLUMN core_kon.it_incident_report.affected_assets   IS 'ทรัพย์สินที่ได้รับผลกระทบ (ชื่อเครื่อง, IP, บัญชีผู้ใช้)';
COMMENT ON COLUMN core_kon.it_incident_report.description       IS 'รายละเอียดเหตุการณ์ที่เกิดขึ้น';
COMMENT ON COLUMN core_kon.it_incident_report.severity          IS 'ระดับความรุนแรง: critical=วิกฤต, high=สูง, medium=กลาง, low=ต่ำ';
COMMENT ON COLUMN core_kon.it_incident_report.impact            IS 'คำอธิบายผลกระทบต่อการให้บริการ';
COMMENT ON COLUMN core_kon.it_incident_report.affected_users    IS 'จำนวนผู้ใช้งานที่ได้รับผลกระทบ (คน)';
COMMENT ON COLUMN core_kon.it_incident_report.data_breached     IS 'Y=มีการรั่วไหลของข้อมูล, N=ไม่มี';
COMMENT ON COLUMN core_kon.it_incident_report.continuity_impact IS 'Y=กระทบ Service Continuity, N=ไม่กระทบ';
COMMENT ON COLUMN core_kon.it_incident_report.root_cause        IS 'สาเหตุที่แท้จริง (Root Cause Analysis)';
COMMENT ON COLUMN core_kon.it_incident_report.immediate_actions IS 'มาตรการแก้ไขเฉพาะหน้า (Immediate Response)';
COMMENT ON COLUMN core_kon.it_incident_report.long_term_measures IS 'มาตรการป้องกันระยะยาว (Long-term Countermeasures)';
COMMENT ON COLUMN core_kon.it_incident_report.resolution        IS 'สรุปวิธีการแก้ไขและผลลัพธ์';
COMMENT ON COLUMN core_kon.it_incident_report.resolved_date     IS 'วันที่แก้ไขแล้วเสร็จ (NULL=ยังไม่แล้วเสร็จ)';
COMMENT ON COLUMN core_kon.it_incident_report.resolved_by       IS 'ชื่อผู้ดำเนินการแก้ไข';
COMMENT ON COLUMN core_kon.it_incident_report.status            IS 'สถานะ: open, in_progress, resolved, closed';
COMMENT ON COLUMN core_kon.it_incident_report.ncsa_reported     IS 'Y=รายงาน สกมช แล้ว, N=ยังไม่ได้รายงาน';
COMMENT ON COLUMN core_kon.it_incident_report.ncsa_report_date  IS 'วันที่รายงาน สกมช';
COMMENT ON COLUMN core_kon.it_incident_report.is_sla_related    IS 'Y=ส่งผลต่อ SLA, N=ไม่กระทบ';
COMMENT ON COLUMN core_kon.it_incident_report.is_active         IS 'Soft Delete: Y=ใช้งาน, N=ลบแล้ว';
COMMENT ON COLUMN core_kon.it_incident_report.created_by        IS 'ผู้บันทึกข้อมูล (user login)';
COMMENT ON COLUMN core_kon.it_incident_report.created_at        IS 'วันเวลาที่บันทึกครั้งแรก';
COMMENT ON COLUMN core_kon.it_incident_report.updated_by        IS 'ผู้แก้ไขข้อมูลล่าสุด (user login)';
COMMENT ON COLUMN core_kon.it_incident_report.updated_at        IS 'วันเวลาที่แก้ไขล่าสุด (auto-update via trigger)';

-- Trigger: auto-update updated_at
CREATE TRIGGER trg_ir_updated_at
  BEFORE UPDATE ON core_kon.it_incident_report
  FOR EACH ROW EXECUTE FUNCTION core_kon.fn_set_updated_at();

-- ─── INDEXES ────────────────────────────────────────────────────
CREATE INDEX idx_ir_incident_date      ON core_kon.it_incident_report (incident_date);
CREATE INDEX idx_ir_report_date        ON core_kon.it_incident_report (report_date);
CREATE INDEX idx_ir_status             ON core_kon.it_incident_report (status);
CREATE INDEX idx_ir_severity           ON core_kon.it_incident_report (severity);
CREATE INDEX idx_ir_threat_type_id     ON core_kon.it_incident_report (threat_type_id);
CREATE INDEX idx_ir_attack_vector_id   ON core_kon.it_incident_report (attack_vector_id);
CREATE INDEX idx_ir_affected_system_id ON core_kon.it_incident_report (affected_system_id);
CREATE INDEX idx_ir_ncsa_reported      ON core_kon.it_incident_report (ncsa_reported);
CREATE INDEX idx_ir_is_active          ON core_kon.it_incident_report (is_active);
