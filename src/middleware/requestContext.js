'use strict';

// Attaches a lightweight per-request context: a request id and the acting
// operator (as forwarded by the gateway in the `x-operator` header).
let counter = 0;

module.exports = function requestContext(req, res, next) {
  counter += 1;
  req.context = {
    requestId: `req-${Date.now()}-${counter}`,
    operator: req.get('x-operator') || 'unknown-operator',
  };
  res.set('x-request-id', req.context.requestId);
  next();
};
