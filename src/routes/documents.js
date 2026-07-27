'use strict';

const express = require('express');
const router = express.Router();
const documentService = require('../services/documentService');

// GET /documents/search?q=...&type=...  — ops console search box
router.get('/search', (req, res, next) => {
  try {
    const results = documentService.search({
      q: req.query.q || '',
      type: req.query.type,
    });
    res.json({ count: results.length, results });
  } catch (err) {
    next(err);
  }
});

// GET /documents/:id  — document metadata
router.get('/:id', (req, res, next) => {
  try {
    const doc = documentService.getById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'document_not_found' });
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

// GET /documents/:id/download  — stream the stored file
router.get('/:id/download', (req, res, next) => {
  try {
    const doc = documentService.getById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'document_not_found' });
    const absPath = documentService.resolveStoragePath(doc.storage_path);
    res.download(absPath, doc.filename);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
