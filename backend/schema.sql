-- Database Initialization Script

-- Enum Types
CREATE TYPE user_role AS ENUM ('admin', 'gm_supply', 'manager', 'storekeeper', 'requester');
CREATE TYPE request_status AS ENUM ('pending_manager', 'pending_gm', 'pending_storekeeper', 'fulfilled', 'rejected');
CREATE TYPE return_status AS ENUM ('pending_manager', 'pending_gm', 'pending_storekeeper', 'fulfilled', 'rejected');
CREATE TYPE transaction_type AS ENUM ('in', 'out', 'return', 'damage');
CREATE TYPE voucher_type AS ENUM ('issue', 'return', 'damage');

-- Settings/Configuration Table
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(50) PRIMARY KEY,
  value VARCHAR(255) NOT NULL
);

-- Departments Table
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  identity_number VARCHAR(50),
  role user_role DEFAULT 'requester',
  department_id INT REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Items Table
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity INT NOT NULL DEFAULT 0,
  min_limit INT NOT NULL DEFAULT 0, -- Set to 10% of initial via application logic
  unit VARCHAR(50) DEFAULT 'حبة',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Requests Table
CREATE TABLE IF NOT EXISTS requests (
  id SERIAL PRIMARY KEY,
  requester_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status request_status DEFAULT 'pending_manager',
  manager_id INT REFERENCES users(id) ON DELETE SET NULL, -- Who approved as manager
  gm_id INT REFERENCES users(id) ON DELETE SET NULL, -- Who approved as GM
  storekeeper_id INT REFERENCES users(id) ON DELETE SET NULL, -- Who fulfilled
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Request Items Table (Many-to-Many between Requests and Items)
CREATE TABLE IF NOT EXISTS request_items (
  id SERIAL PRIMARY KEY,
  request_id INT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  requested_qty INT NOT NULL,
  approved_qty INT, -- Populated if manager/gm adjusts the quantity
  is_returned BOOLEAN DEFAULT FALSE,
  is_damaged BOOLEAN DEFAULT FALSE,
  return_qty INT DEFAULT 0,
  damage_qty INT DEFAULT 0,
  damage_reason TEXT
);

-- Transactions Log Table (Audit Trail)
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  type transaction_type NOT NULL,
  item_id INT NOT NULL REFERENCES items(id),
  qty INT NOT NULL,
  user_id INT NOT NULL REFERENCES users(id), -- Usually the storekeeper
  reference_id INT, -- Can link to requests or vouchers
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vouchers Table
CREATE TABLE IF NOT EXISTS vouchers (
  id SERIAL PRIMARY KEY,
  request_id INT NOT NULL REFERENCES requests(id),
  type voucher_type NOT NULL,
  generated_pdf_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Returns Table
CREATE TABLE IF NOT EXISTS returns (
  id SERIAL PRIMARY KEY,
  requester_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status return_status DEFAULT 'pending_manager',
  manager_id INT REFERENCES users(id) ON DELETE SET NULL,
  gm_id INT REFERENCES users(id) ON DELETE SET NULL,
  storekeeper_id INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Return Items Table
CREATE TABLE IF NOT EXISTS return_items (
  id SERIAL PRIMARY KEY,
  return_id INT NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  return_type VARCHAR(20) NOT NULL, -- 'return' or 'damage'
  requested_qty INT NOT NULL,
  approved_qty INT, -- Populated if storekeeper adjusts it
  requester_reason TEXT,
  storekeeper_notes TEXT
);

-- Initial Data (Optional for Admin)
-- INSERT INTO users (name, email, password_hash, role) VALUES ('System Admin', 'admin@sys.com', '...', 'admin');
