-- =============================================================================
-- IT Activity Logs — PostgreSQL Schema
-- หน้า: /information-technology/hait/activity
-- มาตรฐาน: HAIT ข้อ 4.5 — บันทึกกิจกรรมและการทำงานของเจ้าหน้าที่ฝ่าย IT
-- Schema: core_kon
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Schema
-- -----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS core_kon;
SET search_path TO core_kon, public;

-- -----------------------------------------------------------------------------
-- Drop ตารางเดิม (ตามลำดับ FK)
-- -----------------------------------------------------------------------------
DROP VIEW  IF EXISTS core_kon.it_activity_log_summary    CASCADE;
DROP TABLE IF EXISTS core_kon.it_activity_logs           CASCADE;
DROP TABLE IF EXISTS core_kon.it_activity_priorities     CASCADE;
DROP TABLE IF EXISTS core_kon.it_activity_request_sources CASCADE;
DROP TABLE IF EXISTS core_kon.it_activity_statuses       CASCADE;
DROP TABLE IF EXISTS core_kon.it_activity_systems        CASCADE;
DROP TABLE IF EXISTS core_kon.it_activity_types          CASCADE;
DROP TABLE IF EXISTS core_kon.it_activity_staff          CASCADE;

-- -----------------------------------------------------------------------------
-- 1) it_activity_staff — เจ้าหน้าที่ฝ่าย IT
--    (สามารถเปลี่ยนเป็น FK ไปยังตาราง user/employee หลักได้ในภายหลัง)
-- -----------------------------------------------------------------------------
CREATE TABLE core_kon.it_activity_staff (
    staff_id     SERIAL PRIMARY KEY,
    staff_code   VARCHAR(30)  UNIQUE,
    full_name_th VARCHAR(150) NOT NULL,
    role_th      VARCHAR(100),
    email        VARCHAR(150),
    phone        VARCHAR(30),
    sort_order   SMALLINT     NOT NULL DEFAULT 0,
    is_active    CHAR(1)      NOT NULL DEFAULT 'Y' CHECK (is_active IN ('Y','N')),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  core_kon.it_activity_staff   IS 'เจ้าหน้าที่ฝ่าย IT ที่บันทึกกิจกรรม';
COMMENT ON COLUMN core_kon.it_activity_staff.staff_code IS 'รหัสพนักงาน (อ้างอิงระบบ HR ถ้ามี)';

-- -----------------------------------------------------------------------------
-- 2) it_activity_types — ประเภทกิจกรรม (ซ่อมบำรุง / ดูแลระบบ / ฝึกอบรม ...)
--    nature ใช้แยกงานเชิงรับ (reactive) / เชิงรุก (proactive) / กลาง (neutral)
-- -----------------------------------------------------------------------------
CREATE TABLE core_kon.it_activity_types (
    type_code    VARCHAR(30)  PRIMARY KEY,
    type_name_th VARCHAR(100) NOT NULL,
    nature       VARCHAR(20)  NOT NULL DEFAULT 'neutral'
                 CHECK (nature IN ('reactive', 'proactive', 'neutral')),
    color_hint   VARCHAR(20),
    sort_order   SMALLINT     NOT NULL DEFAULT 0,
    is_active    CHAR(1)      NOT NULL DEFAULT 'Y' CHECK (is_active IN ('Y','N')),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN core_kon.it_activity_types.nature
    IS 'reactive = ตามแก้ปัญหา, proactive = วางแผนเชิงป้องกัน, neutral = ปกติ';

-- -----------------------------------------------------------------------------
-- 3) it_activity_systems — ระบบที่เกี่ยวข้องกับกิจกรรม
-- -----------------------------------------------------------------------------
CREATE TABLE core_kon.it_activity_systems (
    system_code    VARCHAR(30)  PRIMARY KEY,
    system_name_th VARCHAR(100) NOT NULL,
    sort_order     SMALLINT     NOT NULL DEFAULT 0,
    is_active      CHAR(1)      NOT NULL DEFAULT 'Y' CHECK (is_active IN ('Y','N')),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4) it_activity_statuses — สถานะของงาน
-- -----------------------------------------------------------------------------
CREATE TABLE core_kon.it_activity_statuses (
    status_code    VARCHAR(20)  PRIMARY KEY,
    status_name_th VARCHAR(50)  NOT NULL,
    color_hex      VARCHAR(7),
    is_closed      BOOLEAN      NOT NULL DEFAULT FALSE,
    sort_order     SMALLINT     NOT NULL DEFAULT 0
);

COMMENT ON COLUMN core_kon.it_activity_statuses.is_closed
    IS 'TRUE = สถานะที่ถือว่างานสิ้นสุด เช่น done';

-- -----------------------------------------------------------------------------
-- 4.1) it_activity_priorities — ระดับความเร่งด่วน
-- -----------------------------------------------------------------------------
CREATE TABLE core_kon.it_activity_priorities (
    priority_code    VARCHAR(20)  PRIMARY KEY,
    priority_name_th VARCHAR(50)  NOT NULL,
    color_hex        VARCHAR(7),
    sort_order       SMALLINT     NOT NULL DEFAULT 0
);

-- -----------------------------------------------------------------------------
-- 4.2) it_activity_request_sources — ที่มาของงาน (วิเคราะห์งานวางแผน vs ขัดจังหวะ)
-- -----------------------------------------------------------------------------
CREATE TABLE core_kon.it_activity_request_sources (
    source_code    VARCHAR(20)  PRIMARY KEY,
    source_name_th VARCHAR(80)  NOT NULL,
    is_planned     BOOLEAN      NOT NULL DEFAULT FALSE,
    sort_order     SMALLINT     NOT NULL DEFAULT 0
);

COMMENT ON COLUMN core_kon.it_activity_request_sources.is_planned
    IS 'TRUE = ที่มาแบบวางแผนล่วงหน้า (scheduled, inspection); FALSE = ขัดจังหวะ (call, walk_in, alert)';

-- -----------------------------------------------------------------------------
-- 5) it_activity_logs — ตารางหลักบันทึกกิจกรรม
--    - 1 row = 1 งานใน 1 slot (เจ้าหน้าที่ 1 คนมีหลายงานในวันเดียวกันได้)
--    - start_time / end_time เก็บเป็น TIME (slot 1 ชม. แต่ขยายข้ามได้)
--    - minutes_used คือเวลาที่ใช้จริง (อาจน้อยกว่า slot)
-- -----------------------------------------------------------------------------
CREATE TABLE core_kon.it_activity_logs (
    log_id          SERIAL PRIMARY KEY,
    log_date        DATE         NOT NULL,
    staff_id        INTEGER      NOT NULL
                    REFERENCES core_kon.it_activity_staff(staff_id)         ON UPDATE CASCADE,
    type_code       VARCHAR(30)  NOT NULL
                    REFERENCES core_kon.it_activity_types(type_code)        ON UPDATE CASCADE,
    system_code     VARCHAR(30)  NOT NULL
                    REFERENCES core_kon.it_activity_systems(system_code)    ON UPDATE CASCADE,
    status_code     VARCHAR(20)  NOT NULL
                    REFERENCES core_kon.it_activity_statuses(status_code)   ON UPDATE CASCADE,

    start_time      TIME         NOT NULL,   -- ต้นชั่วโมง เช่น '08:00'
    end_time        TIME         NOT NULL,   -- ปลายชั่วโมง เช่น '09:00'
    minutes_used    SMALLINT     NOT NULL CHECK (minutes_used > 0 AND minutes_used <= 600),
    duration_hours  NUMERIC(4,2) GENERATED ALWAYS AS
                    (EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0) STORED,
    hours_used      NUMERIC(5,2) GENERATED ALWAYS AS (minutes_used / 60.0) STORED,

    detail          TEXT         NOT NULL,
    outcome         TEXT,

    -- มิติวิเคราะห์เพิ่มเติม
    priority_code   VARCHAR(20)  NOT NULL DEFAULT 'normal'
                    REFERENCES core_kon.it_activity_priorities(priority_code)      ON UPDATE CASCADE,
    source_code     VARCHAR(20)  NOT NULL DEFAULT 'other'
                    REFERENCES core_kon.it_activity_request_sources(source_code)   ON UPDATE CASCADE,
    location        VARCHAR(200),                                   -- อาคาร/ชั้น/ห้อง
    asset_code      VARCHAR(60),                                    -- รหัสครุภัณฑ์/เครื่องที่ทำงาน
    affected_users  SMALLINT     NOT NULL DEFAULT 1
                    CHECK (affected_users >= 0 AND affected_users <= 10000),
    is_overtime     BOOLEAN      NOT NULL DEFAULT FALSE,
    ticket_id       VARCHAR(50),                                    -- เลข ticket helpdesk ภายนอก

    created_by      INTEGER,                 -- staff_id ของผู้บันทึก (option)
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_activity_time_range CHECK (end_time > start_time)
);

CREATE INDEX idx_activity_logs_date       ON core_kon.it_activity_logs(log_date);
CREATE INDEX idx_activity_logs_staff_date ON core_kon.it_activity_logs(staff_id, log_date);
CREATE INDEX idx_activity_logs_type       ON core_kon.it_activity_logs(type_code);
CREATE INDEX idx_activity_logs_system     ON core_kon.it_activity_logs(system_code);
CREATE INDEX idx_activity_logs_status     ON core_kon.it_activity_logs(status_code);
CREATE INDEX idx_activity_logs_priority   ON core_kon.it_activity_logs(priority_code);
CREATE INDEX idx_activity_logs_source     ON core_kon.it_activity_logs(source_code);
CREATE INDEX idx_activity_logs_asset      ON core_kon.it_activity_logs(asset_code) WHERE asset_code IS NOT NULL;
CREATE INDEX idx_activity_logs_overtime   ON core_kon.it_activity_logs(is_overtime) WHERE is_overtime = TRUE;

COMMENT ON TABLE  core_kon.it_activity_logs IS 'บันทึกกิจกรรมการทำงานของเจ้าหน้าที่ IT (1 slot = 1 row)';
COMMENT ON COLUMN core_kon.it_activity_logs.minutes_used IS 'เวลาที่ใช้จริงในงานนี้ (นาที) อาจน้อยกว่า slot เวลา';
COMMENT ON COLUMN core_kon.it_activity_logs.duration_hours IS 'ความยาว slot (ชม.) คำนวณอัตโนมัติจาก end_time-start_time';
COMMENT ON COLUMN core_kon.it_activity_logs.hours_used IS 'minutes_used/60 คำนวณอัตโนมัติ';

-- -----------------------------------------------------------------------------
-- Trigger: ปรับปรุง updated_at อัตโนมัติ
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core_kon.it_activity_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_it_activity_logs_updated_at
    BEFORE UPDATE ON core_kon.it_activity_logs
    FOR EACH ROW
    EXECUTE FUNCTION core_kon.it_activity_set_updated_at();

-- -----------------------------------------------------------------------------
-- View: it_activity_log_summary — สำหรับ list/วิเคราะห์ (JOIN ทุก lookup)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW core_kon.it_activity_log_summary AS
SELECT
    l.log_id,
    l.log_date,
    TO_CHAR(l.log_date, 'DD/MM/YYYY')        AS log_date_th,
    s.staff_id,
    s.full_name_th                            AS staff_name,
    s.role_th                                 AS staff_role,
    t.type_code,
    t.type_name_th,
    t.nature                                  AS activity_nature,
    sys.system_code,
    sys.system_name_th                        AS system_name,
    st.status_code,
    st.status_name_th                         AS status_name,
    st.color_hex                              AS status_color,
    st.is_closed,
    l.start_time,
    l.end_time,
    TO_CHAR(l.start_time, 'HH24:MI') || ' – ' || TO_CHAR(l.end_time, 'HH24:MI') AS time_slot,
    l.duration_hours,
    l.minutes_used,
    l.hours_used,
    l.detail,
    l.outcome,
    -- มิติวิเคราะห์เพิ่มเติม
    l.priority_code,
    p.priority_name_th                         AS priority_name,
    p.color_hex                                AS priority_color,
    l.source_code,
    rs.source_name_th                          AS source_name,
    rs.is_planned                              AS source_is_planned,
    l.location,
    l.asset_code,
    l.affected_users,
    l.is_overtime,
    l.ticket_id,
    l.created_at,
    l.updated_at
FROM core_kon.it_activity_logs              l
JOIN core_kon.it_activity_staff             s   ON s.staff_id      = l.staff_id
JOIN core_kon.it_activity_types             t   ON t.type_code     = l.type_code
JOIN core_kon.it_activity_systems           sys ON sys.system_code = l.system_code
JOIN core_kon.it_activity_statuses          st  ON st.status_code  = l.status_code
JOIN core_kon.it_activity_priorities        p   ON p.priority_code = l.priority_code
JOIN core_kon.it_activity_request_sources   rs  ON rs.source_code  = l.source_code;

COMMENT ON VIEW core_kon.it_activity_log_summary IS 'View สำหรับแสดงรายการกิจกรรม + ตารางงานรายวัน + วิเคราะห์ Pain Points';

-- =============================================================================
-- Seed data
-- =============================================================================

-- เจ้าหน้าที่
INSERT INTO core_kon.it_activity_staff (staff_code, full_name_th, role_th, sort_order) VALUES
    ('IT001', 'นายสมชาย ใจดี',      'IT Support / Hardware',  1),
    ('IT002', 'นางสาวสุดา รักงาน',  'System Admin',           2),
    ('IT003', 'นายวีระ มุ่งมั่น',    'System Developer',       3);

-- ประเภทกิจกรรม (8 ประเภท + แยก nature)
INSERT INTO core_kon.it_activity_types (type_code, type_name_th, nature, color_hint, sort_order) VALUES
    ('maintenance',   'ซ่อมบำรุง',     'reactive',  'orange',   1),
    ('admin',         'ดูแลระบบ',      'proactive', 'blue',     2),
    ('install',       'ติดตั้งระบบ',   'proactive', 'green',    3),
    ('training',      'ฝึกอบรม',      'neutral',   'purple',   4),
    ('development',   'พัฒนาระบบ',     'proactive', 'cyan',     5),
    ('coordination',  'ประสานงาน',     'neutral',   'gold',     6),
    ('meeting',       'ประชุม',        'neutral',   'geekblue', 7),
    ('other',         'อื่นๆ',         'neutral',   'default',  8);

-- ระบบที่เกี่ยวข้อง
INSERT INTO core_kon.it_activity_systems (system_code, system_name_th, sort_order) VALUES
    ('his',       'ระบบ HIS',          1),
    ('network',   'เครือข่าย',         2),
    ('server',    'เซิร์ฟเวอร์',       3),
    ('pc',        'คอมพิวเตอร์',       4),
    ('printer',   'เครื่องพิมพ์',      5),
    ('backup',    'ระบบสำรองข้อมูล',   6),
    ('other',     'อื่นๆ',             7);

-- สถานะของงาน
INSERT INTO core_kon.it_activity_statuses (status_code, status_name_th, color_hex, is_closed, sort_order) VALUES
    ('done',        'เสร็จสิ้น',         '#22c55e', TRUE,  1),
    ('in_progress', 'กำลังดำเนินการ',    '#3b82f6', FALSE, 2),
    ('waiting',     'รอดำเนินการ',       '#f59e0b', FALSE, 3),
    ('pending',     'งานค้าง',           '#ef4444', FALSE, 4);

-- ระดับความเร่งด่วน
INSERT INTO core_kon.it_activity_priorities (priority_code, priority_name_th, color_hex, sort_order) VALUES
    ('urgent', 'เร่งด่วน', '#ef4444', 1),
    ('normal', 'ปกติ',     '#3b82f6', 2),
    ('low',    'ต่ำ',       '#94a3b8', 3);

-- ที่มาของงาน
INSERT INTO core_kon.it_activity_request_sources (source_code, source_name_th, is_planned, sort_order) VALUES
    ('call',       'โทรศัพท์แจ้ง',        FALSE, 1),
    ('walk_in',    'เดินมาแจ้งด้วยตนเอง',  FALSE, 2),
    ('email',      'อีเมล',               FALSE, 3),
    ('alert',      'ระบบ Monitoring แจ้งเตือน', FALSE, 4),
    ('scheduled',  'งานวางแผนล่วงหน้า',   TRUE,  5),
    ('inspection', 'ตรวจรอบ/PM',          TRUE,  6),
    ('other',      'อื่นๆ',               FALSE, 9);

-- ตัวอย่างบันทึกกิจกรรม (07/04/2026) — รวมกรณี 1 คน 2 งาน ใน slot เดียวกัน
-- รวมตัวอย่างฟิลด์ใหม่: priority, source, location, asset, affected_users, is_overtime, ticket
INSERT INTO core_kon.it_activity_logs
    (log_date, staff_id, type_code, system_code, status_code, start_time, end_time, minutes_used,
     detail, outcome,
     priority_code, source_code, location, asset_code, affected_users, is_overtime, ticket_id)
VALUES
    ('2026-04-07',
        (SELECT staff_id FROM core_kon.it_activity_staff WHERE staff_code = 'IT001'),
        'maintenance', 'pc',
        'waiting', '10:00', '12:00', 100,
        'คอมพิวเตอร์ห้องตรวจ 5 เปิดไม่ติด ตรวจสอบพบ power supply เสีย',
        'สั่งอะไหล่ รอเปลี่ยน',
        'urgent', 'call', 'อาคาร OPD ชั้น 2 ห้องตรวจ 5', 'PC-OPD-205', 3, FALSE, 'HD-2026-0412'),
    ('2026-04-07',
        (SELECT staff_id FROM core_kon.it_activity_staff WHERE staff_code = 'IT001'),
        'admin', 'server',
        'done', '13:00', '15:00', 100,
        'ตรวจสอบ log ความปลอดภัยและ failed login attempts รายสัปดาห์',
        'พบ 3 IP น่าสงสัย block แล้ว',
        'normal', 'inspection', 'ห้อง Server ชั้น 4', 'SRV-MAIN-01', 0, FALSE, NULL),
    ('2026-04-07',
        (SELECT staff_id FROM core_kon.it_activity_staff WHERE staff_code = 'IT001'),
        'admin', 'network',
        'done', '13:00', '14:00', 35,
        'ตรวจ network switch อาคารผู้ป่วยใน',
        'ตรวจครบ ทำงานปกติ',
        'low', 'inspection', 'อาคาร IPD', 'SW-IPD-3F', 0, FALSE, NULL),
    ('2026-04-07',
        (SELECT staff_id FROM core_kon.it_activity_staff WHERE staff_code = 'IT002'),
        'admin', 'server',
        'done', '09:00', '10:00', 55,
        'ตรวจสอบและจัดการ disk space บน server หลัก',
        'เคลียร์ log เก่า ได้พื้นที่คืน 120 GB',
        'normal', 'alert', 'ห้อง Server ชั้น 4', 'SRV-MAIN-01', 0, FALSE, NULL),
    ('2026-04-07',
        (SELECT staff_id FROM core_kon.it_activity_staff WHERE staff_code = 'IT002'),
        'coordination', 'other',
        'in_progress', '09:00', '10:00', 40,
        'ตอบคำถาม helpdesk ทางโทรศัพท์',
        'ตอบ 5 เคส รอเคสค้าง 2 รายการ',
        'normal', 'call', NULL, NULL, 5, FALSE, NULL),
    ('2026-04-07',
        (SELECT staff_id FROM core_kon.it_activity_staff WHERE staff_code = 'IT002'),
        'coordination', 'his',
        'waiting', '14:00', '16:00', 75,
        'ประสานงานกับบริษัท HIS เรื่องการ upgrade version',
        'นัดประชุม 20/04/2026 — รอเอกสารตอบกลับ',
        'normal', 'email', NULL, NULL, 0, FALSE, NULL),
    ('2026-04-07',
        (SELECT staff_id FROM core_kon.it_activity_staff WHERE staff_code = 'IT003'),
        'meeting', 'other',
        'done', '09:00', '12:00', 180,
        'ประชุมคณะกรรมการ IT เรื่องแผนงาน IT ปี 2570',
        'ได้แผนงานเบื้องต้น',
        'normal', 'scheduled', 'ห้องประชุม 1', NULL, 0, FALSE, NULL),
    ('2026-04-07',
        (SELECT staff_id FROM core_kon.it_activity_staff WHERE staff_code = 'IT003'),
        'development', 'his',
        'pending', '13:00', '15:00', 95,
        'แก้ไข bug หน้าจองห้องที่รายงานจากผู้ใช้',
        'ติดปัญหากับ library เก่า รอตัดสินใจ',
        'urgent', 'walk_in', NULL, NULL, 12, TRUE, 'HD-2026-0418');

COMMIT;

-- =============================================================================
-- ตัวอย่าง Query
-- =============================================================================

-- 1) รายการกิจกรรมล่าสุด (สำหรับ tab "รายการกิจกรรม")
-- SELECT * FROM core_kon.it_activity_log_summary
-- ORDER BY log_date DESC, start_time ASC;

-- 2) ตารางงานรายวัน (สำหรับ tab "ตารางงานรายวัน")
-- SELECT * FROM core_kon.it_activity_log_summary
-- WHERE log_date = '2026-04-07'
-- ORDER BY staff_name, start_time;

-- 3) สรุปชั่วโมงตามประเภทกิจกรรม
-- SELECT type_name_th, activity_nature,
--        COUNT(*) AS task_count,
--        SUM(minutes_used) AS total_minutes,
--        ROUND(SUM(minutes_used)/60.0, 1) AS total_hours
-- FROM core_kon.it_activity_log_summary
-- WHERE log_date BETWEEN '2026-04-01' AND '2026-04-30'
-- GROUP BY type_name_th, activity_nature
-- ORDER BY total_minutes DESC;

-- 4) สรุปชั่วโมงตามระบบ (Pain Point)
-- SELECT system_name,
--        COUNT(*) AS task_count,
--        SUM(minutes_used) AS total_minutes,
--        ROUND(SUM(minutes_used)/60.0, 1) AS total_hours
-- FROM core_kon.it_activity_log_summary
-- WHERE log_date BETWEEN '2026-04-01' AND '2026-04-30'
-- GROUP BY system_name
-- ORDER BY total_minutes DESC;

-- 5) สัดส่วน Reactive vs Proactive
-- SELECT activity_nature,
--        SUM(minutes_used) AS total_minutes,
--        ROUND(100.0 * SUM(minutes_used) / SUM(SUM(minutes_used)) OVER (), 1) AS percent
-- FROM core_kon.it_activity_log_summary
-- WHERE log_date BETWEEN '2026-04-01' AND '2026-04-30'
-- GROUP BY activity_nature;

-- 6) ระบบที่ต้องซ่อมบ่อย (Pain Point — งานเชิงรับเท่านั้น)
-- SELECT system_name,
--        COUNT(*) AS repair_count,
--        SUM(minutes_used) AS minutes,
--        ROUND(SUM(minutes_used)/60.0, 1) AS hours
-- FROM core_kon.it_activity_log_summary
-- WHERE activity_nature = 'reactive'
--   AND log_date BETWEEN '2026-04-01' AND '2026-04-30'
-- GROUP BY system_name
-- ORDER BY repair_count DESC;

-- 7) ภาระงานรายบุคคล
-- SELECT staff_name,
--        COUNT(*) AS task_count,
--        SUM(minutes_used) AS minutes,
--        ROUND(SUM(minutes_used)/60.0, 1) AS hours
-- FROM core_kon.it_activity_log_summary
-- WHERE log_date BETWEEN '2026-04-01' AND '2026-04-30'
-- GROUP BY staff_name
-- ORDER BY minutes DESC;

-- 8) งานที่ยังไม่ปิด (status_code != 'done')
-- SELECT staff_name, log_date_th, time_slot, type_name_th, status_name, detail, outcome
-- FROM core_kon.it_activity_log_summary
-- WHERE is_closed = FALSE
-- ORDER BY log_date DESC;

-- 9) สัดส่วนระดับความเร่งด่วน (Priority Donut)
-- SELECT priority_name, COUNT(*) AS task_count, SUM(minutes_used) AS minutes
-- FROM core_kon.it_activity_log_summary
-- WHERE log_date BETWEEN '2025-10-01' AND '2026-09-30'
-- GROUP BY priority_name, priority_code
-- ORDER BY MIN(priority_code);

-- 10) สัดส่วนที่มาของงาน (Source Donut) — งานวางแผน vs ขัดจังหวะ
-- SELECT source_name, source_is_planned,
--        COUNT(*) AS task_count,
--        SUM(minutes_used) AS minutes
-- FROM core_kon.it_activity_log_summary
-- WHERE log_date BETWEEN '2025-10-01' AND '2026-09-30'
-- GROUP BY source_name, source_is_planned
-- ORDER BY task_count DESC;

-- 11) Top 10 ครุภัณฑ์/เครื่องที่ซ่อมบ่อย
-- SELECT asset_code, COUNT(*) AS repair_count, SUM(minutes_used) AS minutes
-- FROM core_kon.it_activity_log_summary
-- WHERE asset_code IS NOT NULL
--   AND type_code = 'maintenance'
-- GROUP BY asset_code
-- ORDER BY repair_count DESC
-- LIMIT 10;

-- 12) งานนอกเวลา (Overtime)
-- SELECT log_date_th, staff_name, time_slot, hours_used, detail
-- FROM core_kon.it_activity_log_summary
-- WHERE is_overtime = TRUE
-- ORDER BY log_date DESC;

-- 13) สรุป Impact — ผู้ใช้รวมที่ได้รับผลกระทบรายเดือน
-- SELECT TO_CHAR(log_date, 'YYYY-MM') AS month,
--        SUM(affected_users) AS total_affected,
--        COUNT(*) AS task_count
-- FROM core_kon.it_activity_log_summary
-- WHERE affected_users > 0
-- GROUP BY TO_CHAR(log_date, 'YYYY-MM')
-- ORDER BY month;
