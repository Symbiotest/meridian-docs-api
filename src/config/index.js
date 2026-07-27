'use strict';

const path = require('path');

const env = process.env.NODE_ENV || 'development';

module.exports = {
  env,
  port: Number(process.env.PORT) || 3000,

  // Root directory under which customer document files are stored on disk.
  // In staging/prod this is an S3 prefix instead; see docs.
  storageRoot:
    process.env.STORAGE_ROOT || path.join(__dirname, '..', '..', 'storage'),

  // SQLite file for local/dev.
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', '..', 'meridian.db'),

  // Internal service-to-service token. The gateway injects a real one; this
  // default only exists so local dev works without extra setup.
  serviceToken: process.env.SERVICE_TOKEN || 'dev-internal-token',
};
