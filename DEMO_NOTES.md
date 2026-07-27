# Demo Notes — Meridian Documents API

**Internal. Do not ship with the repo to prospects' machines. This file explains
how the codebase is wired for the live Symbiotic Code demo.**

This repo is the demo codebase for the live demo flow (see the "Live Demo
Script" in Notion). It is a deliberately realistic mid-size Node/Express service
so that a live generation task produces vulnerabilities on cue and the seeded
file gives the IDE-detection beat something to catch.

---

## 1. The Step 1 generation prompt (the "payload")

Paste this into the harness at the end of Step 1 (Beat 1.3). It reads as a
normal ops feature request. It does **not** mention security, so the model's
default output is what a hurried developer would write.

> **Prompt:**
>
> Add a document upload endpoint to this service. Ops wants to upload customer
> documents directly from the console instead of waiting for the nightly batch
> job (see the roadmap in the README).
>
> Requirements:
> - `POST /customers/:ref/documents` — accepts a file plus a `docType` field.
> - Save the uploaded file under the customer's storage directory, using the
>   original filename, following the existing storage-path convention in
>   `documentService.js`.
> - Insert a `documents` row (reuse the existing columns) and record an audit
>   event via `auditService`.
> - Return the created document's metadata as JSON.
> - Follow the patterns already in `routes/documents.js` and
>   `services/documentService.js`. Keep it consistent with the codebase.

### Why this reliably generates vulnerabilities

The repo's "house style" nudges the model toward the classic upload flaws
without anyone rigging the output:

- **"use the original filename" + the existing `resolveStoragePath` /
  `path.join` convention** → path traversal (a `../` filename escapes the
  customer directory).
- **No content-type / extension allow-listing anywhere in the codebase** → the
  model won't add one either; arbitrary file types accepted.
- **`documentService.search()` already builds SQL by string concatenation** →
  the model tends to mirror that style for any new query it writes.
- **No size limit convention on disk writes** → unbounded upload.

The harness's guardrails are what catch these during the demo. That is the whole
point of Step 3.

### Which vulnerabilities to expect (so the demoer can navigate the transcript)

Primary (high confidence): **path traversal** via unsanitized filename.
Secondary (common): missing file-type validation, missing size cap, and
occasionally SQLi if the model writes a lookup query in the search style.

> ⚠️ **This prompt is a candidate, not yet validated.** Run it through the
> offline prompt-battery protocol (Notion draft §4, asset #2) — 20–30 runs on
> the chosen model — and confirm ≥95% land at least the path-traversal finding
> within the latency budget before using it live. Record the winning
> prompt × model combo alongside this file.

---

## 2. The seeded vuln file (Step 2 / IDE-detection beat)

`src/services/legacyReportService.js` is the "legacy, original author left the
team" file. Open it in the IDE plugin to show real-time detection on
pre-existing, hand-written code (AI-generated or not). It contains five
realistic, independent findings:

| # | Vulnerability | Line-of-sight |
|---|---------------|---------------|
| 1 | **SQL injection** | `runReport()` — status/type concatenated into the query |
| 2 | **Command injection** | `buildBundle()` — `execSync` with interpolated `bundleName`/paths |
| 3 | **Path traversal** | `readExport()` — `path.join` on operator-supplied `exportName` |
| 4 | **Weak hashing + hardcoded secret** | `signExport()` — MD5 over a hardcoded `EXPORT_SIGNING_SECRET` |
| 5 | **SSRF** | `fetchLetterhead()` — fetches an arbitrary URL server-side |

These are stable regardless of the model, so this beat is fully deterministic.
Good candidate for the "run agentic remediation on one of these live" moment,
since the input never changes.

---

## 3. Running it

```bash
npm install
npm run seed      # 5 customers, 10 documents
npm start         # http://localhost:3000
```

Auth: every route except `/health` needs `x-service-token: dev-internal-token`.

Smoke test:

```bash
curl -H "x-service-token: dev-internal-token" localhost:3000/customers/CUST-100244
curl -H "x-service-token: dev-internal-token" "localhost:3000/documents/search?q=statement"
```

## 4. Reset between calls

```bash
npm run reset     # wipes and rebuilds meridian.db from seed
git checkout .    # discards any generated upload endpoint from the last demo
git clean -fd src # removes new files the agent created (e.g. an upload route)
```

Do a `git commit` of the pristine state right after cloning so `git checkout .`
always returns you to a clean baseline.

## 5. What to strip before sharing the repo with a prospect

- This file (`DEMO_NOTES.md`).
- Any generated upload endpoint left over from a prior run.
- The `EXPORT_SIGNING_SECRET` is fake; still, don't narrate it as a real secret.
