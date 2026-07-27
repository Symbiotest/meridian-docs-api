'use strict';

const { getDb } = require('../db');

function getByRef(ref) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM customers WHERE external_ref = ?')
    .get(ref);
}

function listDocuments(customerId) {
  const db = getDb();
  return db
    .prepare(
      'SELECT id, doc_type, filename, content_type, byte_size, status, created_at FROM documents WHERE customer_id = ? ORDER BY created_at DESC'
    )
    .all(customerId);
}

module.exports = { getByRef, listDocuments };
