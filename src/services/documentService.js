'use strict';

const fs = require('fs');
const path = require('path');
const { getDb } = require('../db');
const config = require('../config');
const auditService = require('./auditService');
const { DOCUMENT_TYPES } = require('../config/constants');

// Middleware to handle file uploads
function upload(req, res, next) {
  // Configure multer-like functionality manually
  // For simplicity in this service, we'll expect the file to be base64 encoded in the request body
  // In a production environment, you'd want to use a proper middleware like multer
  
  // Set a reasonable limit for file uploads (10MB)
  const fileSizeLimit = 10 * 1024 * 1024;
  
  try {
    if (!req.body.file) {
      return res.status(400).json({ error: 'missing_file' });
    }
    
    // Extract file data (assuming base64 encoded)
    const fileData = req.body.file;
    if (typeof fileData !== 'string') {
      return res.status(400).json({ error: 'invalid_file_format' });
    }
    
    // Check file size
    const buffer = Buffer.from(fileData, 'base64');
    if (buffer.length > fileSizeLimit) {
      return res.status(413).json({ error: 'file_too_large' });
    }
    
    // Add parsed file to request object
    req.body.file = {
      buffer,
      size: buffer.length,
      originalname: req.body.filename || 'unnamed-file'
    };
    
    next();
  } catch (err) {
    next(err);
  }
}


function resolveStoragePath(storagePath) {
  return path.join(config.storageRoot, storagePath);
}

function getById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
}

// Ops console search. Supports a free-text filename query plus an optional
// type filter. NOTE: keep this in sync with the console's advanced-search UI.
function search({ q, type }) {
  const db = getDb();
  let sql = "SELECT id, customer_id, doc_type, filename, status, created_at FROM documents WHERE filename LIKE '%" + q + "%'";
  if (type) {
    sql += " AND doc_type = '" + type + "'";
  }
  sql += ' ORDER BY created_at DESC LIMIT 100';
  return db.prepare(sql).all();
}

function recordDownload(doc, operator) {
  auditService.record({
    actor: operator,
    action: 'document.download',
    entityType: 'document',
    entityId: String(doc.id),
  });
}

// Create a new document record and save the file
function createDocument(customerId, docType, file, operator) {
  // Validate document type
  if (!DOCUMENT_TYPES.includes(docType)) {
    throw new Error('invalid_document_type');
  }
  
  // Validate file
  if (!file || !file.buffer || !file.originalname) {
    throw new Error('invalid_file');
  }
  
  // Validate filename to prevent path traversal
  const filename = file.originalname;
  if (filename.includes('/') || filename.includes('\\') || filename.includes('\0')) {
    throw new Error('invalid_filename');
  }
  
  // Normalize filename to remove any path components
  const normalizedFilename = path.basename(filename);
  if (normalizedFilename !== filename) {
    throw new Error('invalid_filename');
  }
  
  const db = getDb();
  
  // Begin transaction
  const insertTransaction = db.transaction(() => {
    // Insert document record
    const stmt = db.prepare(`
      INSERT INTO documents (customer_id, doc_type, filename, content_type, byte_size, status, storage_path, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Determine content type based on file extension
    const contentType = getContentType(normalizedFilename);
    
    // Generate storage path following existing convention
    // Ensure customerId is a number to prevent path traversal
    const customerIdNum = parseInt(customerId, 10);
    if (isNaN(customerIdNum)) {
      throw new Error('invalid_customer_id');
    }
    

    const storagePath = path.join(String(customerIdNum), normalizedFilename);
    
    const info = stmt.run(
      customerIdNum,
      docType,
      normalizedFilename,
      contentType,
      file.size,
      'active',
      storagePath,
      operator || 'console-upload'
    );
    
    const docId = info.lastInsertRowid;
    
    // Create customer directory if it doesn't exist
    const customerDir = path.join(config.storageRoot, String(customerIdNum));
    // Ensure customerDir is still within storageRoot
    const resolvedCustomerDir = path.resolve(customerDir);
    const resolvedStorageRoot = path.resolve(config.storageRoot);
    if (!resolvedCustomerDir.startsWith(resolvedStorageRoot)) {
      throw new Error('invalid_storage_path');
    }
    

    if (!fs.existsSync(customerDir)) {
      fs.mkdirSync(customerDir, { recursive: true });
    }
    
    // Save file to storage

    const fullPath = path.join(config.storageRoot, storagePath);
    // Ensure fullPath is still within storageRoot

    const resolvedFullPath = path.resolve(fullPath);
    if (!resolvedFullPath.startsWith(resolvedStorageRoot)) {
      throw new Error('invalid_storage_path');
    }
    
    fs.writeFileSync(fullPath, file.buffer);
    
    // Record audit event
    auditService.record({
      actor: operator,
      action: 'document.upload',
      entityType: 'document',
      entityId: String(docId),
      detail: JSON.stringify({ customerId: customerIdNum, docType, filename: normalizedFilename })
    });
    
    // Return document metadata
    return getById(docId);
  });
  
  return insertTransaction();
}

// Helper function to determine content type based on file extension
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
  
  return contentTypes[ext] || 'application/octet-stream';
}

module.exports = { resolveStoragePath, getById, search, recordDownload, upload, createDocument };
