'use strict';

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'meridian-docs-api', time: new Date().toISOString() });
});

module.exports = router;
