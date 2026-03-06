-- Remove existing triggers if they exist
DROP TRIGGER IF EXISTS trg_request_items_updated ON request_items;
-- Drop functions if they exist
DROP FUNCTION IF EXISTS calculate_return_totals();

-- Update request functionality
ALTER TABLE request_items ADD COLUMN IF NOT EXISTS reason TEXT;

-- We can run an initial admin creation script here for testing
INSERT INTO departments (id, name) VALUES (1, 'الإدارة العامة لتقنية المعلومات') ON CONFLICT DO NOTHING;
INSERT INTO users (name, email, password_hash, role, department_id) VALUES ('مدير الإدارة', 'manager@sys.com', '$2a$10$uoo9LmRqznQzNAdnXvsUV.L85E7kLOhJ1oOk2gJGATEYDyM98tPc6', 'manager', 1) ON CONFLICT DO NOTHING;
INSERT INTO users (name, email, password_hash, role, department_id) VALUES ('مدير النظام', 'admin@sys.com', '$2a$10$uoo9LmRqznQzNAdnXvsUV.L85E7kLOhJ1oOk2gJGATEYDyM98tPc6', 'admin', 1) ON CONFLICT DO NOTHING;
INSERT INTO users (name, email, password_hash, role, department_id) VALUES ('أمين المستودع', 'storekeeper@sys.com', '$2a$10$uoo9LmRqznQzNAdnXvsUV.L85E7kLOhJ1oOk2gJGATEYDyM98tPc6', 'storekeeper', 1) ON CONFLICT DO NOTHING;
INSERT INTO users (name, email, password_hash, role, department_id) VALUES ('مدير التموين', 'gm@sys.com', '$2a$10$uoo9LmRqznQzNAdnXvsUV.L85E7kLOhJ1oOk2gJGATEYDyM98tPc6', 'gm_supply', 1) ON CONFLICT DO NOTHING;
INSERT INTO users (name, email, password_hash, role, department_id) VALUES ('طالب المادة', 'user@sys.com', '$2a$10$uoo9LmRqznQzNAdnXvsUV.L85E7kLOhJ1oOk2gJGATEYDyM98tPc6', 'requester', 1) ON CONFLICT DO NOTHING;

-- Some initial dummy Inventory items for testing
INSERT INTO items (name, description, quantity, min_limit, unit_price) VALUES ('ورق A4 طابعة', 'كرتون ورق 5 رياض', 1000, 100, 15.00) ON CONFLICT DO NOTHING;
INSERT INTO items (name, description, quantity, min_limit, unit_price) VALUES ('أقلام حبر زرقاء', 'باكت 10 أقلام بيك', 500, 50, 5.00) ON CONFLICT DO NOTHING;
INSERT INTO items (name, description, quantity, min_limit, unit_price) VALUES ('مكائن طباعة HP', 'ليزر جت برو', 20, 2, 500.00) ON CONFLICT DO NOTHING;
