'use strict';

const fs = require('fs');
const path = require('path');
const { getDb } = require('./index');
const config = require('../config');

const reset = process.argv.includes('--reset');

function run() {
  if (reset && fs.existsSync(config.dbPath)) {
    fs.rmSync(config.dbPath);
    for (const ext of ['-wal', '-shm']) {
      const p = config.dbPath + ext;
      if (fs.existsSync(p)) fs.rmSync(p);
    }
  }

  const db = getDb();
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);

  const count = db.prepare('SELECT COUNT(*) AS n FROM customers').get().n;
  if (count > 0 && !reset) {
    console.log('[seed] data already present; use `npm run reset` to rebuild');
    return;
  }

  const customers = [
    ['CUST-100244', 'Alice Nakamura', 'alice.nakamura@example.com', 'private'],
    ['CUST-100612', 'Marcus Bell', 'marcus.bell@example.com', 'retail'],
    ['CUST-101877', 'Priya Anand', 'priya.anand@example.com', 'business'],
    ['CUST-102431', 'Tomas Vidal', 'tomas.vidal@example.com', 'retail'],
    ['CUST-103998', 'Grace Okafor', 'grace.okafor@example.com', 'private'],
  ];

  const insertCustomer = db.prepare(
    'INSERT INTO customers (external_ref, full_name, email, segment) VALUES (?, ?, ?, ?)'
  );
  const insertDoc = db.prepare(
    `INSERT INTO documents (customer_id, doc_type, filename, content_type, byte_size, status, storage_path, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const seedAll = db.transaction(() => {
    customers.forEach((c, i) => {
      const info = insertCustomer.run(...c);
      const cid = info.lastInsertRowid;
      const sample = [
        ['account_statement', `statement-2026-0${(i % 6) + 1}.pdf`, 'application/pdf', 84213, 'active'],
        ['kyc_identity', 'passport-scan.pdf', 'application/pdf', 220145, 'active'],
      ];
      for (const [type, fn, ct, size, status] of sample) {
        insertDoc.run(
          cid,
          type,
          fn,
          ct,
          size,
          status,
          path.join(String(cid), `${type}-${fn}`),
          'batch-onboarding'
        );
      }
    });
  });

  seedAll();
  const docs = db.prepare('SELECT COUNT(*) AS n FROM documents').get().n;
  console.log(
    `[seed] loaded ${customers.length} customers and ${docs} documents into ${config.dbPath}`
  );
}

run();
