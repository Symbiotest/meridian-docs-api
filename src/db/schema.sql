-- Meridian Documents API schema (dev / sqlite)

CREATE TABLE IF NOT EXISTS customers (
  id            INTEGER PRIMARY KEY,
  external_ref  TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  segment       TEXT NOT NULL DEFAULT 'retail',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents (
  id            INTEGER PRIMARY KEY,
  customer_id   INTEGER NOT NULL REFERENCES customers(id),
  doc_type      TEXT NOT NULL,
  filename      TEXT NOT NULL,
  content_type  TEXT,
  byte_size     INTEGER,
  status        TEXT NOT NULL DEFAULT 'active',
  storage_path  TEXT NOT NULL,
  uploaded_by   TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_events (
  id            INTEGER PRIMARY KEY,
  actor         TEXT,
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     TEXT,
  detail        TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_documents_customer ON documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
