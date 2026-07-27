# Meridian Documents API

Internal document service for Meridian back-office operations. Handles customer
document intake, metadata, storage, and retrieval for the operations and
compliance teams.

This service sits behind the internal API gateway and is not exposed to the
public internet. It is consumed by the Ops Console and the Compliance Review
tooling.

## Stack

- Node.js + Express
- SQLite (via `better-sqlite3`) for local/dev; RDS Postgres in staging/prod
- File storage on the local filesystem in dev; S3 in staging/prod

## Running locally

```bash
npm install
npm run seed        # creates meridian.db and loads sample customers + documents
npm start           # boots on http://localhost:3000
```

Health check:

```bash
curl http://localhost:3000/health
```

## Project layout

```
src/
  server.js            # boot + listen
  app.js               # express app, middleware wiring, route mounting
  config/              # env + constants
  db/                  # sqlite connection, schema, seed
  middleware/          # auth (stub), request context
  routes/              # http layer
  services/            # business logic
  utils/               # helpers
```

## Domain

- **Customers** — the account holders whose documents we manage.
- **Documents** — files (statements, KYC docs, signed forms) attached to a
  customer, with metadata (type, status, uploader, timestamps).
- **Audit** — every document action is meant to be recorded (see
  `services/auditService.js`).

## Conventions

- Routes stay thin; business logic lives in `services/`.
- All customer-facing document types are enumerated in
  `config/constants.js` (`DOCUMENT_TYPES`).
- Storage paths are built from the customer id and the document id under
  `STORAGE_ROOT` (see `config/index.js`).
- New endpoints should follow the existing pattern in
  `routes/documents.js` and `services/documentService.js`.

## Status / roadmap

- [x] Customer lookup
- [x] Document metadata CRUD
- [x] Document download
- [ ] **Document upload endpoint** (customers currently onboarded via batch job;
      ops wants a direct upload path from the console)
- [ ] Virus scanning hook on intake
- [ ] Move dev storage to S3 parity via minio

## Owners

Platform Team. Slack: `#meridian-platform`.
