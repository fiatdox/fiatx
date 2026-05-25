-- =============================================================================
-- IT Risk Management — PostgreSQL Schema
-- หน้า: /information-technology/hait/risk-management
-- มาตรฐาน: TMI Risk Analysis Worksheet (ISO/IEC 27001:2013)
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
DROP TABLE IF EXISTS core_kon.it_risk_assessment_details CASCADE;
DROP TABLE IF EXISTS core_kon.it_risk_assessments       CASCADE;
DROP TABLE IF EXISTS core_kon.it_risk_items             CASCADE;
DROP TABLE IF EXISTS core_kon.it_risk_categories        CASCADE;
DROP TABLE IF EXISTS core_kon.it_risk_scale_levels      CASCADE;
DROP VIEW  IF EXISTS core_kon.it_risk_assessment_summary CASCADE;

-- -----------------------------------------------------------------------------
-- 1) it_risk_categories — หมวดความเสี่ยงหลัก (12 หมวด)
-- -----------------------------------------------------------------------------
CREATE TABLE core_kon.it_risk_categories (
    category_id      SERIAL PRIMARY KEY,
    category_no      SMALLINT     NOT NULL UNIQUE,
    category_name_th VARCHAR(255) NOT NULL,
    category_name_en VARCHAR(255),
    sort_order       SMALLINT     NOT NULL DEFAULT 0,
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  core_kon.it_risk_categories IS 'หมวดความเสี่ยง IT (12 หมวด)';
COMMENT ON COLUMN core_kon.it_risk_categories.category_no IS 'ลำดับหมวด 1-12';

-- -----------------------------------------------------------------------------
-- 2) it_risk_items — รายการความเสี่ยง (38 รายการ ทั้ง parent และ sub-item)
-- -----------------------------------------------------------------------------
CREATE TABLE core_kon.it_risk_items (
    item_id       SERIAL PRIMARY KEY,
    category_id   INTEGER      NOT NULL REFERENCES core_kon.it_risk_categories(category_id) ON DELETE CASCADE,
    item_code     VARCHAR(10)  NOT NULL UNIQUE,
    item_name_th  VARCHAR(500) NOT NULL,
    item_name_en  VARCHAR(500),
    is_summary    BOOLEAN      NOT NULL DEFAULT FALSE,
    sort_order    SMALLINT     NOT NULL DEFAULT 0,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risk_items_category ON core_kon.it_risk_items(category_id);

COMMENT ON COLUMN core_kon.it_risk_items.item_code  IS 'รหัสรายการ เช่น 1, 1.1, 10.8';
COMMENT ON COLUMN core_kon.it_risk_items.is_summary IS 'TRUE = แถวสรุปภาพรวมของหมวด (parent row)';

-- -----------------------------------------------------------------------------
-- 3) it_risk_scale_levels — เกณฑ์โอกาสเกิด/ผลกระทบ (1-5)
-- -----------------------------------------------------------------------------
CREATE TABLE core_kon.it_risk_scale_levels (
    level             SMALLINT PRIMARY KEY CHECK (level BETWEEN 1 AND 5),
    label_th          VARCHAR(50)  NOT NULL,
    probability_desc  VARCHAR(255) NOT NULL,
    impact_desc       VARCHAR(255) NOT NULL
);

COMMENT ON TABLE core_kon.it_risk_scale_levels IS 'เกณฑ์มาตราวัด 1-5 สำหรับ Probability และ Impact';

-- -----------------------------------------------------------------------------
-- 4) it_risk_assessments — รอบการประเมิน (header)
-- -----------------------------------------------------------------------------
CREATE TABLE core_kon.it_risk_assessments (
    assessment_id    SERIAL PRIMARY KEY,
    assessment_code  VARCHAR(50)  NOT NULL UNIQUE,
    assessment_year  SMALLINT     NOT NULL,
    assessment_round SMALLINT     NOT NULL DEFAULT 1,
    department       VARCHAR(255),
    assessed_by      VARCHAR(255),
    assessed_date    DATE,
    approved_by      VARCHAR(255),
    approved_date    DATE,
    status           VARCHAR(20)  NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'submitted', 'approved', 'cancelled')),
    notes            TEXT,
    created_by       VARCHAR(100),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risk_assessments_year   ON core_kon.it_risk_assessments(assessment_year);
CREATE INDEX idx_risk_assessments_status ON core_kon.it_risk_assessments(status);

-- -----------------------------------------------------------------------------
-- 5) it_risk_assessment_details — ผลการประเมินรายข้อ
-- -----------------------------------------------------------------------------
CREATE TABLE core_kon.it_risk_assessment_details (
    detail_id           SERIAL PRIMARY KEY,
    assessment_id       INTEGER  NOT NULL REFERENCES core_kon.it_risk_assessments(assessment_id) ON DELETE CASCADE,
    item_id             INTEGER  NOT NULL REFERENCES core_kon.it_risk_items(item_id),
    probability         SMALLINT CHECK (probability BETWEEN 1 AND 5),
    impact              SMALLINT CHECK (impact      BETWEEN 1 AND 5),
    risk_score          SMALLINT GENERATED ALWAYS AS (probability * impact) STORED,
    risk_level          VARCHAR(20) GENERATED ALWAYS AS (
        CASE
            WHEN probability IS NULL OR impact IS NULL THEN NULL
            WHEN probability * impact >= 17 THEN 'critical'
            WHEN probability * impact >= 9  THEN 'high'
            WHEN probability * impact >= 4  THEN 'medium'
            ELSE 'low'
        END
    ) STORED,
    existing_control    TEXT,
    additional_control  TEXT,
    responsible_person  VARCHAR(255),
    target_date         DATE,
    notes               TEXT,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (assessment_id, item_id)
);

CREATE INDEX idx_assessment_details_assessment ON core_kon.it_risk_assessment_details(assessment_id);
CREATE INDEX idx_assessment_details_level      ON core_kon.it_risk_assessment_details(risk_level);

COMMENT ON COLUMN core_kon.it_risk_assessment_details.risk_score IS 'P × I — คำนวณอัตโนมัติ';
COMMENT ON COLUMN core_kon.it_risk_assessment_details.risk_level IS 'low / medium / high / critical (auto)';

-- -----------------------------------------------------------------------------
-- Trigger: auto-update updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core_kon.it_risk_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_risk_assessments_updated         ON core_kon.it_risk_assessments;
DROP TRIGGER IF EXISTS trg_risk_assessment_details_updated  ON core_kon.it_risk_assessment_details;

CREATE TRIGGER trg_risk_assessments_updated
    BEFORE UPDATE ON core_kon.it_risk_assessments
    FOR EACH ROW EXECUTE FUNCTION core_kon.it_risk_set_updated_at();

CREATE TRIGGER trg_risk_assessment_details_updated
    BEFORE UPDATE ON core_kon.it_risk_assessment_details
    FOR EACH ROW EXECUTE FUNCTION core_kon.it_risk_set_updated_at();

-- -----------------------------------------------------------------------------
-- View: it_risk_assessment_summary — รวมข้อมูลพร้อมแสดงผล
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW core_kon.it_risk_assessment_summary AS
SELECT
    d.detail_id,
    a.assessment_id,
    a.assessment_code,
    a.assessment_year,
    a.assessment_round,
    a.department,
    a.status                AS assessment_status,
    c.category_no,
    c.category_name_th,
    i.item_code,
    i.item_name_th,
    i.is_summary,
    d.probability,
    d.impact,
    d.risk_score,
    d.risk_level,
    d.existing_control,
    d.additional_control,
    d.responsible_person,
    d.target_date,
    d.updated_at
FROM core_kon.it_risk_assessment_details d
JOIN core_kon.it_risk_assessments       a ON a.assessment_id = d.assessment_id
JOIN core_kon.it_risk_items             i ON i.item_id       = d.item_id
JOIN core_kon.it_risk_categories        c ON c.category_id   = i.category_id
ORDER BY a.assessment_id, i.sort_order;

-- =============================================================================
-- SEED DATA — Master Data Import
-- =============================================================================

-- (1) Risk Categories ----------------------------------------------------------
INSERT INTO core_kon.it_risk_categories (category_no, category_name_th, category_name_en, sort_order) VALUES
    ( 1, 'IT – Hardware',                          'IT – Hardware',                            1),
    ( 2, 'IT – System Software',                   'IT – System Software',                     2),
    ( 3, 'IT – Applications',                      'IT – Applications',                        3),
    ( 4, 'IT – Communications, Connectivity',      'IT – Communications, Connectivity',        4),
    ( 5, 'IT – Operational (Human) Error',         'IT – Operational (Human) Error',           5),
    ( 6, 'Data Loss and Privacy Breach',           'Data Loss and Privacy Breach',             6),
    ( 7, 'IT – Future Development',                'IT – Future Development',                  7),
    ( 8, 'IT – Vendor and Outsource Failure',      'IT – Vendor and Outsource Failure',        8),
    ( 9, 'IT – Hacking, Unauthorized Intrusions',  'IT – Hacking, Unauthorized Intrusions',    9),
    (10, 'Environment Factors',                    'Environment Factors',                     10),
    (11, 'Patient Risks due to IT Errors/Misuse',  'Patient Risks due to IT Errors/Misuse',   11),
    (12, 'Other',                                  'Other',                                   12);

-- (2) Scale Levels -------------------------------------------------------------
INSERT INTO core_kon.it_risk_scale_levels (level, label_th, probability_desc, impact_desc) VALUES
    (1, 'ต่ำมาก',  'แทบไม่น่าจะเกิดขึ้น หรือ < 1 ครั้ง/ปี',         'ไม่มีผลกระทบต่อการให้บริการ หรือน้อยมาก'),
    (2, 'ต่ำ',     'อาจเกิดขึ้นได้บ้าง อย่างน้อยเดือนละ 1 ครั้ง',     'มีผลกระทบต่อการให้บริการในบางจุด'),
    (3, 'ปานกลาง', 'มีจุดอ่อนพอควร เดือนละหลายครั้ง',              'มีผลกระทบต่อการให้บริการ 1-2 แผนก'),
    (4, 'สูง',     'มีจุดอ่อนมาก เกิดบ่อย เดือนละหลายครั้ง',           'มีผลกระทบต่อการให้บริการ 3-4 แผนก'),
    (5, 'สูงมาก',  'มีจุดอ่อนรอบด้าน พบทุกสัปดาห์',                'กระทบวงกว้าง อาจเกิดอันตรายต่อผู้ป่วย');

-- (3) Risk Items (38 รายการ) --------------------------------------------------
INSERT INTO core_kon.it_risk_items (category_id, item_code, item_name_th, is_summary, sort_order) VALUES
    -- 1. IT – Hardware
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 1), '1',    '1. IT – Hardware (ภาพรวม)',                                 TRUE,   100),
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 1), '1.1',  '1.1 Servers Crash or Failure',                              FALSE,  101),
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 1), '1.2',  '1.2 Network Switches Crash or Failure',                     FALSE,  102),
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 1), '1.3',  '1.3 Workstations Failure',                                  FALSE,  103),

    -- 2. IT – System Software
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 2), '2',    '2. IT – System Software (ภาพรวม)',                          TRUE,   200),
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 2), '2.1',  '2.1 Operating System Failure',                              FALSE,  201),

    -- 3. IT – Applications
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 3), '3',    '3. IT – Applications (ภาพรวม)',                             TRUE,   300),
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 3), '3.1',  '3.1 Front Offices',                                         FALSE,  301),
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 3), '3.2',  '3.2 Back Offices',                                          FALSE,  302),

    -- 4. IT – Communications, Connectivity
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 4), '4',    '4. IT – Communications, Connectivity (ภาพรวม)',             TRUE,   400),
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 4), '4.1',  '4.1 Intranet',                                              FALSE,  401),
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 4), '4.2',  '4.2 Internet',                                              FALSE,  402),

    -- 5. IT – Operational (Human) Error
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 5), '5',    '5. IT – Operational (Human) Error (ภาพรวม)',                TRUE,   500),
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 5), '5.1',  '5.1 Backup Error',                                          FALSE,  501),
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 5), '5.2',  '5.2 Data Loss Error',                                       FALSE,  502),

    -- 6. Data Loss and Privacy Breach
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 6), '6',    '6. Data Loss and Privacy Breach (ภาพรวม)',                  TRUE,   600),
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 6), '6.1',  '6.1 Data Backup',                                           FALSE,  601),
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 6), '6.2',  '6.2 Data Protection Policy and Regulations',                FALSE,  602),
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 6), '6.3',  '6.3 PDPA Implementation',                                   FALSE,  603),

    -- 7. IT – Future Development
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 7), '7',    '7. IT – Future Development (ภาพรวม)',                       TRUE,   700),
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 7), '7.1',  '7.1 No Data Dictionary',                                    FALSE,  701),
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 7), '7.2',  '7.2 No System Blueprint',                                   FALSE,  702),
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 7), '7.3',  '7.3 No Program Document or Comments',                       FALSE,  703),

    -- 8. IT – Vendor and Outsource Failure
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 8), '8',    '8. IT – Vendor and Outsource Failure (ภาพรวม)',             TRUE,   800),
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 8), '8.1',  '8.1 Vendor Stop Support',                                   FALSE,  801),
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 8), '8.2',  '8.2 IT – Hacking, Unauthorized Intrusions (under Vendor)',  FALSE,  802),

    -- 9. IT – Hacking
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 9), '9',    '9. IT – Hacking, Unauthorized Intrusions',                  TRUE,   900),

    -- 10. Environment Factors
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 10), '10',   '10. Environment Factors (ภาพรวม)',                         TRUE,  1000),
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 10), '10.1', '10.1 Flooding – Internal',                                 FALSE, 1001),
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 10), '10.2', '10.2 Flooding – External',                                 FALSE, 1002),
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 10), '10.3', '10.3 Fire – Internal',                                     FALSE, 1003),
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 10), '10.4', '10.4 Fire – External',                                     FALSE, 1004),
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 10), '10.5', '10.5 Utilities – Electricity',                             FALSE, 1005),
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 10), '10.6', '10.6 Criminal – Theft',                                    FALSE, 1006),
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 10), '10.7', '10.7 Criminal – Break-ins',                                FALSE, 1007),
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 10), '10.8', '10.8 Civil Unrest – Protest, Mob',                         FALSE, 1008),

    -- 11. Patient Risks
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 11), '11',   '11. Patient Risks due to IT Errors/Misuse',                TRUE,  1100),

    -- 12. Other
    ((SELECT category_id FROM core_kon.it_risk_categories WHERE category_no = 12), '12',   '12. Other',                                                TRUE,  1200);

COMMIT;

-- =============================================================================
-- ตัวอย่าง: สร้างรอบประเมินใหม่ + บันทึกผลรายข้อ
-- =============================================================================
/*
SET search_path TO core_kon, public;

-- 1) สร้าง assessment header
INSERT INTO core_kon.it_risk_assessments
    (assessment_code, assessment_year, assessment_round, department, assessed_by, assessed_date, status)
VALUES
    ('RISK-2569-01', 2569, 1, 'งานเทคโนโลยีสารสนเทศ', 'นายไอที ใจดี', CURRENT_DATE, 'draft');

-- 2) บันทึกผลทุกข้อ (initial blank) — ลูปจาก master items
INSERT INTO core_kon.it_risk_assessment_details (assessment_id, item_id, probability, impact)
SELECT
    (SELECT assessment_id FROM core_kon.it_risk_assessments WHERE assessment_code = 'RISK-2569-01'),
    item_id, NULL, NULL
FROM core_kon.it_risk_items
WHERE is_active = TRUE;

-- 3) อัปเดตคะแนนเฉพาะข้อ
UPDATE core_kon.it_risk_assessment_details d
SET probability = 3, impact = 4
FROM core_kon.it_risk_items i, core_kon.it_risk_assessments a
WHERE d.item_id = i.item_id
  AND d.assessment_id = a.assessment_id
  AND a.assessment_code = 'RISK-2569-01'
  AND i.item_code = '1.1';

-- 4) ดูสรุป
SELECT * FROM core_kon.it_risk_assessment_summary
WHERE assessment_code = 'RISK-2569-01'
ORDER BY category_no, item_code;
*/
