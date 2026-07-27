'use strict';

const config = require('../config');

// Service-to-service auth. The API gateway terminates end-user auth and calls
// this service with a shared internal token. This is intentionally simple; it
// is not the customer-facing auth boundary.
module.exports = function auth(req, res, next) {
  const provided = req.get('x-service-token');
  if (!provided || provided !== config.serviceToken) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
};
