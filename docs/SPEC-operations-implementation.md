# Operations and backup implementation

Implements B3 in `SPEC-framework-hardening.md`. The user authorized continuing after
publication while they perform the physical iPhone/iPad pass.

## Design and compatibility

- Keep every existing key name. Existing unprefixed values permanently belong to
  **Default operation**; new operations use `op:<id>:<original-key>`. No legacy data is
  copied or removed during migration, including large background images.
- Store `{v: 1, activeId, items}` in the new `operations` index. That is both the migration
  marker and the atomic selection record. Blackout and navigation preferences stay global.
- Pin the current operation for the lifetime of a page. Selecting another operation writes
  the next selection and reloads. Other tabs keep their current operation; a deleted
  operation rejects further writes rather than recreating data under another plan.
  Serialize metadata changes using an origin-wide Web Lock. Each operation has a generation;
  resets change it. New namespaces include the generation, and writes check it both before
  and after persistence to close cross-tab reset races. Default is resettable but permanent.
- Central accessors scope all notes, checklists, rubric, task builder, order metadata,
  CASEVAC plan and images. CASEVAC continues to use only `casevac/host.ts` for app access.
- Imports validate the entire file before writing and add copies with fresh IDs. Stage
  data before committing the index; quota failures roll back staged keys and preferences.
  Existing operations are never replaced by an import. A small staging journal recovers
  abandoned payloads/preferences on startup and recognizes a committed import after a crash.
  Strict CASEVAC validation rejects repairs rather than silently changing backups. Export
  uses the same validator before offering a file. Text is retained exactly on load; geometry
  and list safety bounds remain enforced for outside data.
- JSON contains current/all operations and global preferences. CASEVAC values pass through
  their existing normalizers. Other structured values receive explicit shape validation.
- The manager provides create, rename, switch, delete, reset, backup and restore, with
  explicit confirmations for destructive actions and the existing theme tokens.

## Tasks and verification

1. **OperationStore and accessors.** Add `lib/operationStore.ts` and tests; route storage
   access and background removal through the selected operation. Test legacy keys unchanged,
   idempotent initialization, namespace isolation, global preferences, pinned tabs, deleted
   plans, invalid metadata, and quota failure. Run the new tests RED then GREEN.
2. **Backup validation and transactions.** Add `lib/operationBackup.ts` and tests. Test an
   exact semantic round trip of all data categories, valid old checklist data, malformed
   records, unknown keys, wrong versions, failed imports leaving existing data unchanged,
   and independent IDs when importing the same backup twice.
3. **Manager UI.** Add `components/OperationManager.tsx`, a shared dialog, a header entry,
   and theme-aware styles. Exercise create/rename/switch/reset/delete and backup/restore
   at phone and desktop widths, in light and blackout modes, including keyboard focus.
4. **Review and release.** Run typecheck, lint, the full suite, and build; independent
   review; small PR into main with green CI. Publish the verified static build to the
   existing Site. Update the AGENTS handoff with completed and pending work.
5. **OPSEC and further tests.** In a separate PR add a guarded wipe of app-owned storage,
   including operation copies and legacy keys, while preserving unrelated origin data.
   State that local data and JSON backups are unencrypted. Add geometry/9-line tests;
   physical-device-specific behavior remains the user's pending check.

## Review focus

- A tab must never write its old component state into a plan selected in another tab.
- A failed migration or import must preserve existing notes and images.
- Reset/delete must affect exactly the selected operation; wipe must include legacy data.
- Restore must not accept JSON values that crash any view or exporter.
- Preferences and outside app storage must not be captured as operational content.
