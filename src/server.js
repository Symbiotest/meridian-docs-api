'use strict';

const app = require('./app');
const config = require('./config');

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[meridian-docs-api] listening on http://localhost:${config.port} (env=${config.env})`
  );
});

process.on('SIGINT', () => {
  console.log('\n[meridian-docs-api] shutting down');
  server.close(() => process.exit(0));
});

module.exports = server;
