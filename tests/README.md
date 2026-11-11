# Test suites

Use Node.js 24 or later. These automated checks exercise data handling and generated document structure; they do not replace visual review of screens and exports.

- `node tests/run.mjs` — routine application checks (89 tests).
- `node tests/run.mjs ai` — the parked AI integration (10 tests, simulated responses; no live AI calls or credentials needed).
- `node tests/run.mjs all` — all 99 tests, including before AI reactivation.
- `node tests/run.mjs ci` — routine checks plus AI when worker, migration, AI feature/client or shared report inputs, AI tests, test runner, package or workflow files change. Manual runs, missing history, and an enabled AI feature use all checks.

GitHub package scripts expose these as `npm test`, `npm run test:ai`, `npm run test:all` and `npm run test:ci`. Pages CI uses the last command and full Git history so it can inspect the complete pushed range.

## Ownership and deliberate overlap

- `core` owns archive/schema validation; `pwa` owns import size boundaries and offline/install/update behaviour.
- `report-model` owns numbering, captions, dates, source traceability and the legacy recommended-action toggle. Populated and blank wording share one scenario matrix.
- `report-fields` owns current field presets, explicit selections and migration. Its fixture construction is shared with report-model, while scenario values remain explicit.
- `ppt-plan` owns layout/continuation and verifies report rules reach slides. `ppt-export` checks the real editable OOXML writer. These are separate failure boundaries, so both remain.
- `word-export` checks actual generated page dimensions, including the previous landscape regression.
- `projects`, `photos`, `findings-ops` and `project-deletion` protect backups, originals, merging, restoration and stale-save handling. Their distinct data-preservation cases remain.
- `workflow`, `report-library`, `photo-editor` and `storage-protection` own their respective user operations.

## Visual checks

For relevant UI/export changes, separately inspect representative desktop/mobile cards and Word/PDF/PowerPoint exports: individual and consolidated layouts, single/two/many photos, portrait/landscape photos, long observations/captions, optional response cells, and compact layouts. Do not report the automated test count as visual coverage.
