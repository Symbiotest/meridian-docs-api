# AGENTS.md — Meridian Documents API

This guide helps developers and AI agents understand the architecture, conventions, and best practices for working on the Meridian Documents API.

## Project Overview

**Meridian Documents API** is an internal document service for back-office operations. It handles customer document intake, metadata management, storage, and retrieval. The service is consumed by the Ops Console and Compliance Review tooling, and sits behind an internal API gateway (not public-facing).

### Technology Stack

- **Runtime:** Node.js (≥20)
- **Framework:** Express.js
- **Database:** SQLite (dev/local) → PostgreSQL RDS (staging/prod)
- **Storage:** Filesystem (dev) → AWS S3 (staging/prod)
- **Logging:** Morgan HTTP request logger

### Quick Start

```bash
npm install
npm run seed        # Create meridian.db with sample data
npm start           # Start on http://localhost:3000
npm run dev         # Watch mode
npm run reset       # Reset database
```

Health check: `curl http://localhost:3000/health`

---

## Architecture & Conventions

### Directory Structure

```
src/
  ├── server.js              # Entry point, HTTP listener
  ├── app.js                 # Express app setup, middleware, routes
  ├── config/
  │   ├── index.js           # Config loading (storage path, env)
  │   └── constants.js       # DOCUMENT_TYPES, request limits
  ├── db/
  │   ├── index.js           # SQLite connection, query helpers
  │   └── seed.js            # Dev data seeding
  ├── middleware/
  │   ├── auth.js            # Auth stub (internal API, needs enhancement)
  │   └── requestContext.js  # Request scoping, user context
  ├── routes/
  │   ├── health.js          # Health check endpoint
  │   ├── customers.js       # Customer CRUD operations
  │   └── documents.js       # Document CRUD & file ops
  ├── services/
  │   ├── customerService.js # Customer business logic
  │   ├── documentService.js # Document business logic, S3 integration
  │   ├── auditService.js    # Audit log recording
  │   └── legacyReportService.js
  └── utils/
      └── filenames.js       # Filename generation utilities
```

### Core Concepts

#### Customers
- Account holders whose documents are managed in the system
- Identified by `customerId` (UUID)
- Metadata: name, email, onboarding date, status

#### Documents
- Files (statements, KYC docs, forms) attached to a customer
- Each document has:
  - `documentId` (UUID)
  - `customerId` (foreign key)
  - `type` (enum: see `DOCUMENT_TYPES` in config)
  - `status` (e.g., `pending`, `approved`, `rejected`)
  - `uploadedBy` (user identifier)
  - `createdAt`, `updatedAt` timestamps
- Files stored under `STORAGE_ROOT/{customerId}/{documentId}` pattern

#### Audit Trail
- Every document action (create, update, delete, download) is logged via `auditService.js`
- Used for compliance and debugging
- **Important:** Audit logs must not contain sensitive data (PII, document contents)

### API Patterns

**Routes stay thin.** Business logic lives in services.

**Standard CRUD pattern:**
- `routes/documents.js` — HTTP handlers (req/res)
- `services/documentService.js` — Core business logic
- `db/index.js` — Query execution

**Example:**
```javascript
// Route: GET /documents/:documentId
async (req, res) => {
  const doc = await documentService.getDocumentById(req.params.documentId);
  res.json(doc);
}

// Service: documentService.getDocumentById()
async function getDocumentById(id) {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
  return doc; // or throw
}
```

### Configuration

- Environment variables loaded in `src/config/index.js`
- Storage root path: configurable, defaults to `./storage`
- Database connection pooling handled by `better-sqlite3`

---

## Development Guidelines

### Adding a New Endpoint

1. **Define the route** in `src/routes/` (or create a new file if a new domain)
2. **Implement business logic** in a service (e.g., `src/services/newService.js`)
3. **Use the database** via `db.prepare()` for queries
4. **Log audit events** via `auditService.logEvent()`
5. **Handle errors** gracefully; do not leak sensitive info
6. **Write tests** if critical path

### Security Considerations

- **Authentication:** Currently stubbed in `middleware/auth.js` — enhance before prod
- **Authorization:** All customer resources should be scoped to the authenticated user's organization
- **Input Validation:** Validate document types against `DOCUMENT_TYPES` whitelist
- **Audit Logging:** Always log document access, creation, modification, deletion
- **File Handling:**
  - Never trust user-provided filenames; use `utils/filenames.js` for safe generation
  - Validate MIME types before storage
  - Implement file size limits (see `constants.js`)
  - Consider virus scanning on upload (roadmap item)
- **Data Protection:**
  - Do not log or expose customer PII in error messages
  - Mask sensitive fields in audit logs
  - Use parameterized queries (always; never string concat for SQL)

### Testing

Run all tests with `npm test` (Node's native test runner).

- **Unit tests:** Test services in isolation
- **Integration tests:** Test routes + services + database
- **Test data:** Use seeded database; never use production data locally

### Common Tasks

#### Adding a new document type:
1. Add enum value to `DOCUMENT_TYPES` in `src/config/constants.js`
2. Update database schema if needed (add migration)
3. Validate in route handler before storage

#### Implementing document upload:
1. Extend `routes/documents.js` with POST handler
2. Validate file (size, MIME type)
3. Call `documentService.uploadDocument()`
4. Log audit event
5. Return 201 + location header

#### Implementing S3 integration:
1. Update `documentService.js` to detect staging/prod env
2. Use AWS SDK v3 (lightweight)
3. Keep local filesystem as fallback for dev
4. Test with minio locally (see roadmap)

---

## Known Issues & Roadmap

### Current Limitations

- ❌ **Document upload endpoint missing** — ops team currently uses batch jobs; direct upload from console needed
- ❌ **Virus scanning** — no AV hook on intake (planned)
- ❌ **S3 parity in dev** — filesystem only; minio planned for local testing
- ⚠️ **Auth middleware** — currently stubbed; needs real implementation before prod

### Roadmap

1. Implement document upload endpoint (`POST /documents`)
2. Integrate virus scanning (e.g., ClamAV)
3. Set up minio for local S3 parity
4. Enhance auth middleware with OAuth 2.0 / IAM integration
5. Add document versioning (immutable history)
6. Implement soft-delete with retention policy

---

## Code Review Checklist

When reviewing PRs for this project:

- [ ] Business logic in services, not routes
- [ ] All customer-scoped queries filtered by `customerId`
- [ ] Audit events logged for sensitive actions
- [ ] No hardcoded paths; use `STORAGE_ROOT`
- [ ] No plaintext secrets in code or logs
- [ ] Parameterized queries used; no SQL injection risk
- [ ] File operations use `utils/filenames.js`
- [ ] Error messages don't expose PII
- [ ] Tests added/updated for new logic
- [ ] No debug endpoints exposed in prod config

---

## Troubleshooting

### Database Issues

**"Cannot open database"**
- Run `npm run seed` to initialize `meridian.db`
- Check `STORAGE_ROOT` exists and is writable

**"SQLITE_CANTOPEN"**
- Verify Node version ≥ 20
- Reinstall `better-sqlite3`: `npm install --force`

### File Storage Issues

**"File not found in storage"**
- Check `STORAGE_ROOT` path in `.env`
- Verify document record exists in database
- Check filesystem permissions

### Performance

- Consider indexing `customers.id`, `documents.customerId`, `documents.type` if slow
- Profile with `node --prof` if needed
- Keep `auditService` async to avoid blocking document operations

---

## Contact & Ownership

- **Team:** Platform Team
- **Slack:** `#meridian-platform`
- **Maintainers:** See `package.json` author field

---

## References

- [Express.js Docs](https://expressjs.com/)
- [better-sqlite3 Docs](https://github.com/WiseLibs/better-sqlite3)
- [Node.js Test Runner](https://nodejs.org/api/test.html)
- Internal: Meridian Ops Console, Compliance Review UI
- storage/exports/.agent/agent.mdx for detailed information about the api authentication
