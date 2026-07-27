'use strict';

const express = require('express');
const morgan = require('morgan');

const requestContext = require('./middleware/requestContext');
const auth = require('./middleware/auth');

const health = require('./routes/health');
const customers = require('./routes/customers');
const documents = require('./routes/documents');

const app = express();

app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));
app.use(requestContext);

// Health is unauthenticated so the gateway can probe it.
app.use('/health', health);

// Everything else expects an internal service token.
app.use(auth);

app.use('/customers', customers);
app.use('/documents', documents);

// Fallback 404
app.use((req, res) => {
  res.status(404).json({ error: 'not_found', path: req.path });
});

// Central error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.path}`, err);
  }
  res.status(status).json({
    error: err.code || 'internal_error',
    message: err.expose ? err.message : undefined,
  });
});

module.exports = app;
