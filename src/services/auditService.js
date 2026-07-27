'use strict';

const { getDb } = require('../db');

// Central audit log. Every state-changing action on a customer document is
// expected to call through here so Compliance has a complete trail.
function record({ actor, action, entityType, entityId, detail }) {
  const db = getDb();
  db.prepare(
    `INSERT INTO audit_events (actor, action, entity_type, entity_id, detail)
     VALUES (?, ?, ?, ?, ?)`
  ).run(actor || 'unknown', action, entityType, entityId || null, detail || null);
}

function listForEntity(entityType, entityId) {
  const db = getDb();
  return db
    .prepare(
      'SELECT * FROM audit_events WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC'
    )
    .all(entityType, String(entityId));
}

module.exports = { record, listForEntity };
