-- =============================================================
-- Designique by Mandy – database schema
-- PostgreSQL 12+
-- Safe to re-run (all objects use IF NOT EXISTS / OR REPLACE).
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. SETTINGS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
    id      INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- singleton row
    unit    TEXT    NOT NULL DEFAULT 'in' CHECK (unit IN ('cm', 'in'))
);

-- Seed the singleton row if absent
INSERT INTO settings (id, unit)
VALUES (1, 'in')
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 2. MEASUREMENT TYPES
--    27 points in the order the tailor uses on his paper sheet.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS measurement_types (
    id          SERIAL  PRIMARY KEY,
    name        TEXT    NOT NULL UNIQUE,
    sort_order  INTEGER NOT NULL UNIQUE
);

INSERT INTO measurement_types (name, sort_order) VALUES
    ('Shoulder',                1),
    ('Bust / Chest',            2),
    ('Under bust',              3),
    ('Waist',                   4),
    ('Hip',                     5),
    ('Thigh',                   6),
    ('Arm',                     7),
    ('Sleeve',                  8),
    ('Wrist',                   9),
    ('Neck',                   10),
    ('Shoulder to bust',       11),
    ('Shoulder to under bust', 12),
    ('Shoulder to waist',      13),
    ('Nipple to nipple',       14),
    ('Waist to hip',           15),
    ('Waist to knee',          16),
    ('Crotch',                 17),
    ('Trouser full length',    18),
    ('Shirt length',           19),
    ('Dress length',           20),
    ('Skirt length',           21),
    ('Back length',            22),
    ('Knee',                   23),
    ('Ankle',                  24),
    ('Calf',                   25),
    ('Stomach',                26),
    ('Round foot for pants',   27)
ON CONFLICT (name) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 3. CLIENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
    id           SERIAL      PRIMARY KEY,
    name         TEXT        NOT NULL,
    phone        TEXT        NOT NULL,
    address      TEXT,
    email        TEXT,
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────
-- 4. MEASUREMENT SETS
--    A client may have many sets; re-measuring appends a new one.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS measurement_sets (
    id            SERIAL      PRIMARY KEY,
    client_id     INTEGER     NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
    date_taken    DATE        NOT NULL DEFAULT CURRENT_DATE,
    fitting_notes TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────
-- 5. MEASUREMENTS (values for one set)
--    value_cm is always in centimetres; NULL = not recorded.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS measurements (
    id                   SERIAL          PRIMARY KEY,
    set_id               INTEGER         NOT NULL REFERENCES measurement_sets (id) ON DELETE CASCADE,
    measurement_type_id  INTEGER         NOT NULL REFERENCES measurement_types (id),
    value_cm             NUMERIC(8, 2)   NOT NULL,
    UNIQUE (set_id, measurement_type_id)
);


-- ─────────────────────────────────────────────────────────────
-- 6. ORDERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    id              SERIAL          PRIMARY KEY,
    client_id       INTEGER         NOT NULL REFERENCES clients (id) ON DELETE RESTRICT,
    -- The measurement set that was current when the order was created.
    -- NULL if the client had no measurements at order time.
    source_set_id   INTEGER         REFERENCES measurement_sets (id) ON DELETE SET NULL,
    outfit_type     TEXT            NOT NULL,
    status          TEXT            NOT NULL DEFAULT 'Ordered'
                        CHECK (status IN ('Ordered', 'In progress', 'Fitting', 'Ready', 'Collected')),
    ordering_date   DATE            NOT NULL DEFAULT CURRENT_DATE,
    fitting_date    DATE,
    collection_date DATE,
    notes           TEXT,
    -- Payment (all amounts in the app's display currency; two decimals)
    total_price     NUMERIC(12, 2)  NOT NULL DEFAULT 0,
    deposit         NUMERIC(12, 2)  NOT NULL DEFAULT 0,
    total_paid      NUMERIC(12, 2)  NOT NULL DEFAULT 0,
    -- balance_due is derived; never write it directly
    collected_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- balance_due as a generated column (PostgreSQL 12+)
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS balance_due NUMERIC(12, 2)
        GENERATED ALWAYS AS (total_price - total_paid) STORED;


-- ─────────────────────────────────────────────────────────────
-- 7. ORDER MEASUREMENTS
--    Each order keeps its own independent copy of measurements.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_measurements (
    id                   SERIAL          PRIMARY KEY,
    order_id             INTEGER         NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    measurement_type_id  INTEGER         NOT NULL REFERENCES measurement_types (id),
    value_cm             NUMERIC(8, 2)   NOT NULL,
    UNIQUE (order_id, measurement_type_id)
);


-- ─────────────────────────────────────────────────────────────
-- 8. ORDER MATERIALS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_materials (
    id          SERIAL  PRIMARY KEY,
    order_id    INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    material    TEXT    NOT NULL,
    quantity    TEXT    NOT NULL
);


-- ─────────────────────────────────────────────────────────────
-- 9. TRIGGERS
-- ─────────────────────────────────────────────────────────────

-- 9a. Stamp collected_at when status changes to 'Collected'
CREATE OR REPLACE FUNCTION trg_stamp_collected()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'Collected' AND (OLD.status IS DISTINCT FROM 'Collected') THEN
        NEW.collected_at = now();
    END IF;
    -- Clear the timestamp if status is moved back from Collected
    IF NEW.status <> 'Collected' AND OLD.status = 'Collected' THEN
        NEW.collected_at = NULL;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stamp_collected ON orders;
CREATE TRIGGER stamp_collected
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION trg_stamp_collected();

-- 9b. Keep updated_at current on clients
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_updated_at ON clients;
CREATE TRIGGER clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 10. VIEWS
-- ─────────────────────────────────────────────────────────────

-- 10a. Latest measurement set per client
CREATE OR REPLACE VIEW v_client_latest_set AS
SELECT DISTINCT ON (ms.client_id)
    ms.client_id,
    ms.id               AS set_id,
    ms.date_taken,
    ms.fitting_notes,
    ms.created_at,
    COUNT(m.id) OVER (PARTITION BY ms.id) AS measurement_count
FROM measurement_sets ms
LEFT JOIN measurements m ON m.set_id = ms.id
ORDER BY ms.client_id, ms.created_at DESC;

-- 10b. Orders overview (joins client name and counts)
CREATE OR REPLACE VIEW v_orders_overview AS
SELECT
    o.id,
    o.client_id,
    c.name              AS client_name,
    c.phone             AS client_phone,
    o.outfit_type,
    o.status,
    o.ordering_date,
    o.fitting_date,
    o.collection_date,
    o.total_price,
    o.deposit,
    o.total_paid,
    o.balance_due,
    o.collected_at,
    o.created_at,
    o.updated_at
FROM orders o
JOIN clients c ON c.id = o.client_id;


-- ─────────────────────────────────────────────────────────────
-- 11. DASHBOARD QUERIES
--     These are reference queries used by GET /dashboard.
--     They are written here for documentation; the API executes
--     equivalent SQL, potentially with bound parameters.
-- ─────────────────────────────────────────────────────────────

-- Stage counts
-- SELECT status, COUNT(*) AS cnt
-- FROM orders
-- GROUP BY status;

-- Upcoming fittings and collections (next 10 days)
-- SELECT o.id, c.name AS client_name, o.outfit_type,
--        o.fitting_date, o.collection_date, o.status
-- FROM orders o
-- JOIN clients c ON c.id = o.client_id
-- WHERE o.status NOT IN ('Collected')
--   AND (
--         o.fitting_date    BETWEEN CURRENT_DATE AND CURRENT_DATE + 10
--      OR o.collection_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 10
--   )
-- ORDER BY LEAST(
--     COALESCE(o.fitting_date, 'infinity'::date),
--     COALESCE(o.collection_date, 'infinity'::date)
-- );

-- Balances owing (unpaid orders, excluding collected)
-- SELECT o.id, c.name AS client_name, o.outfit_type,
--        o.balance_due, o.status
-- FROM orders o
-- JOIN clients c ON c.id = o.client_id
-- WHERE o.balance_due > 0
--   AND o.status <> 'Collected'
-- ORDER BY o.balance_due DESC;

-- Recent orders (last 10)
-- SELECT o.id, c.name AS client_name, o.outfit_type,
--        o.status, o.ordering_date, o.balance_due
-- FROM orders o
-- JOIN clients c ON c.id = o.client_id
-- ORDER BY o.created_at DESC
-- LIMIT 10;

-- Recently added clients (last 10)
-- SELECT id, name, phone, created_at
-- FROM clients
-- ORDER BY created_at DESC
-- LIMIT 10;

-- Collected orders this month (for the "Collected this month" tile)
-- SELECT COUNT(*) AS cnt
-- FROM orders
-- WHERE status = 'Collected'
--   AND collected_at >= date_trunc('month', now());

