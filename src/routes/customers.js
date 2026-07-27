'use strict';

const express = require('express');
const router = express.Router();
const customerService = require('../services/customerService');
const documentService = require('../services/documentService');

// GET /customers/:ref  — look up a customer by external reference
router.get('/:ref', (req, res, next) => {
  try {
    const customer = customerService.getByRef(req.params.ref);
    if (!customer) return res.status(404).json({ error: 'customer_not_found' });
    res.json(customer);
  } catch (err) {
    next(err);
  }
});

// GET /customers/:ref/documents  — list a customer's documents
router.get('/:ref/documents', (req, res, next) => {
  try {
    const customer = customerService.getByRef(req.params.ref);
    if (!customer) return res.status(404).json({ error: 'customer_not_found' });
    const docs = customerService.listDocuments(customer.id);
    res.json({ customer: customer.external_ref, documents: docs });
  } catch (err) {
    next(err);
  }
});

// POST /customers/:ref/documents  — upload a document for a customer
router.post('/:ref/documents', documentService.upload, (req, res, next) => {
  try {
    const customer = customerService.getByRef(req.params.ref);
    if (!customer) return res.status(404).json({ error: 'customer_not_found' });
    
    const { docType, file } = req.body;
    const doc = documentService.createDocument(customer.id, docType, file, req.context.operator);
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
