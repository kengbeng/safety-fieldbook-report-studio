## 1.4.0 - 13 Nov 2026

- Release optional user-key AI assistance for photo-supported finding wording and text-only executive summaries.
- Add shared AI Settings, session-only key retention, cancellation and grouped finding Undo/Redo.
- Draft concise management summaries with word counts and an advisory above 150 words, without truncation or automatic retries.
- Preserve production saved reports, database schema, preferences, installed-app identity and offline update behaviour.
- Remove beta labels and refresh What’s new and AI help. Beta reports can be transferred explicitly using project backups.

## 1.4.0-beta.14 - 13 Nov 2026

- Target 60–100 words for executive summaries, allowing up to 150 where needed.
- Replace word-limit rejection with a word count and an advisory above 150 words; retain the complete draft for editing without truncation or automatic retries.

## 1.4.0-beta.13 - 13 Nov 2026

- Refine executive summaries to distinguish recorded conditions from potential harm and limit conclusions to included findings.
- Use specific corrective priorities, a 90-word ceiling without a minimum, and no unsupported management recommendations or severity rankings.

## 1.4.0-beta.12 - 13 Nov 2026

- Refine finding AI to state the condition and supported safety lapse or potential harm directly, preserving essential physical context.
- Move uncertain explanations into verification actions and retain existing finding text when factual detail is insufficient.
- Keep executive-summary instructions unchanged.

## 1.4.0-beta.11 - 13 Nov 2026

- Show the selected model in a compact AI button with a connection dot; expose full status in its tooltip and accessible label.
- Update the button when connecting, disconnecting or changing models.

## 1.4.0-beta.10 - 13 Nov 2026

- State AI observations and supported safety lapses directly, omit location identifiers and avoid source-attribution phrases.
- Place the Undo icon left of AI; show Redo after Undo and protect later manual edits.

## 1.4.0-beta.9 - 13 Nov 2026

- Keep GPT-5 mini as the default and replace GPT-5 and GPT-4.1 mini in AI Settings with GPT-6.1 Terra, GPT-6.1 Sol and GPT-6 Luna.
- Use the selected model for both photo-supported findings and text-only executive summaries.

## 1.4.0-beta.8 - 13 Nov 2026

- Draft executive summaries directly into the Edit report details summary field, without a review/apply popup.
- Preserve cancellation, draft-change protection and the final Save changes action.
- Replace the single-line saved-summary control with a textarea so paragraph breaks survive saving, reopening and reload.

## 1.4.0-beta.7 - 13 Nov 2026

- Keep Undo AI beside the sparkle icon in each finding editor and remove the report-wide AI undo bar.
- Move Draft executive summary into Edit report details beside the summary field.
- Apply AI summaries to the report-details draft; Save changes commits them and Cancel discards them.
- Reject stale summary results after draft edits or changes to the report-details session.

## 1.4.0-beta.6 - 13 Nov 2026

- Align the API key input and Connect button using one grid row with matching control heights.
- Place the field label above the row and remove inherited input margins.
- Stack connection controls on narrow screens and tidy model, photo-toggle and help-text spacing.

## 1.4.0-beta.5 - 13 Nov 2026

- Reframe executive summaries as 60–90 word management briefings rather than findings and action lists.
- Cover the overall position, key concerns and supported implications, then management attention needed.
- Exclude individual observations, equipment details and detailed corrective steps.
- Preserve executive-summary paragraphs in both preview layouts, Word and PDF.
- Guard against invented decisions, resource needs, owners, deadlines and unsupported overall conclusions.

## 1.4.0-beta.4 - 13 Nov 2026

- Target 80–120 words in two short executive-summary paragraphs: main findings and corrective priorities.
- Group related issues, use direct language and omit administrative detail and repetitive finding lists.
- Submit only finding titles, observations and actions for summary generation.
- Use structured summary output and reject drafts above 120 words without truncating or changing the report.

## 1.4.0-beta.3 - 13 Nov 2026

- Update all three finding fields directly from one sparkle-icon click, with a single grouped Undo.
- Keep Save changes as the final finding-save action; cancel pending AI when the editor closes.
- Consolidate API key, model dropdown and photo option in one compact AI Settings popup.
- Add concise output limits and direct factual wording, moving verification needs into corrective actions.
- Preserve atomic updates and protect manual edits, photo context and editor-session changes.

## 1.4.0-beta.2 - 13 Nov 2026

- Replace the two field AI buttons with one sparkle icon in the finding editor header.
- Review the whole finding or improve its title, observation and corrective action together.
- Show separate editable suggestions with individual Apply controls and sequential Undo.
- Automatically include up to 6 report-selected photos, with a visible context count, thumbnails and off switch.
- Prepare reduced JPEG copies using current edits and rotation, without altering original images.
- Validate structured responses and prevent stale suggestions after text, photograph or project changes.

## 1.4.0-beta.1 - 13 Nov 2026

- Add user-key AI assistance for observations, proposed corrective actions and executive summaries.
- Add masked key entry, connection testing, session-only memory retention and Disconnect.
- Submit selected text directly to OpenAI, with review, Apply, cancellation and Undo safeguards.
- Publish at a separate beta Pages path with separate saved reports, install identity and cache.
- Add synthetic tests for request contents, key lifecycle, cancellation and safe error handling.

# Version 1.3.4 — 11 Nov 2026

- Added ascending and descending room sorting for all active findings by Building, Floor and Room.
- Uses stable natural number ordering, keeps incomplete locations last and leaves deleted findings in place.
- Added Undo sort; wording, photographs and original records are preserved.

# Version 1.3.3 — 11 Nov 2026

- Added Delete permanently and Empty recently deleted with irreversible-action confirmation.
- Removes deleted reports and embedded photographs while retaining active reports.
- Rejects stale or restored records atomically before permanent removal.

# Version 1.3.2 — 11 Nov 2026

- Aligned the combined update control with Safety Fieldbook: save, apply, automatic reload and success confirmation.
- Retained update intent after delayed activation and added activated-worker reload detection with duplicate reload protection.
- Scoped open-window checks to Report Studio and protected resumed edits before delayed reloads.

# Version 1.3.1 — 11 Nov 2026

- Centred tutorial pop-up with minimise and return controls.
- Explicit navigation, in-dialog editing/export tips, resume and start-again options, and completion screen.
- Added two fictional sample illustrations. Export, backup and installation are optional.

# Version 1.3.0 — 11 Nov 2026

- Added a first-use walkthrough with saved progress, skip and Help restart.
- Added a separate fictional sample report for trying the walkthrough without a ZIP.
- Included optional app installation and offline/backup guidance.
- Added What’s new to the Installed app information dialog.

# Version 1.2.6 — 10 Nov 2026

- Replaced the home storage panel with a compact storage information dialog and footer offline status.
- Added dismiss controls to operation messages.
- Guarded app updates against missing service workers during offline setup.

# Changelog

## 1.2.5 - 10 Nov 2026

- Matched saved-report options icons to the compact findings controls.
- Removed underlines from the report options trigger and Delete report command.
- Retained Edit report as the labelled primary action.

## 1.2.4 - 10 Nov 2026

- Sized the table Actions column to its compact controls, aligned them right and returned spare width to report text.
- Retained the accessible Actions header while hiding its visual label; touch controls retain sufficient space.

## 1.2.3 - 10 Nov 2026

- Matched edit and options controls to the compact view selector, with consistent table action grouping.
- Moved card delete/restore commands into the options overlay.
- Aligned selection checkboxes inline with row numbering and grips in List and Table views, preserving accessible labels.

## 1.2.2 - 10 Nov 2026

- Restored numbered drag grips in the comparison table, with row drop indicators and keyboard reorder alternatives.
- Reordered the view selector to Cards, List, Table, reduced its visual size and aligned it right.

## 1.2.1 - 10 Nov 2026

- Table compares full observations and actions with compact numbering and edit/options at the right.
- List focuses on quick navigation: grip, number, thumbnail, title/location, photo count and one options menu.
- Delete/restore and reorder choices use top-layer overlays without expanding rows or clipping inside the table.

## 1.2.0 - 10 Nov 2026

- Added Cards, Table and compact List views for findings, with a remembered browser preference.
- All views share search, filters, editing, deletion/restoration, selection and report order.
- Table view includes observations, locations, photo counts and recommended actions; narrow screens can scroll horizontally.

## Test maintenance  -  10 Nov 2026

- Split routine (84) and parked AI (10) checks; keep a combined 94-check command.
- Consolidated repeated corrective-action scenarios without dropping blank or populated cases.
- Shared report fixture setup and documented test ownership and visual review boundaries.
- Pages CI selects AI tests for relevant changes or runs all checks when history is unavailable.
- Application version remains 1.1.3; no runtime behaviour changed.

## 1.1.3 · 10 Nov 2026

- Refined finding cards with compact headers, aligned two-line titles and paired photo previews.
- Moved photo counts to the footer and show recommendation status only when added.

## 1.1.2 · 6 Nov 2026

- Keep Imported inspections collapsed whenever a saved report or project backup is opened. New import issues can still expand the panel for review.

## 1.1.1 · 6 Nov 2026

- Fixed consolidated Word exports using portrait dimensions despite the landscape setting.
- Added generated DOCX page-size regression checks for both report layouts.

## 1.1.0 · 6 Nov 2026

- Fixed duplicate PDF finding headings at appendix page breaks and centred photo captions.
- Simplified recipient-facing photo labels while retaining original provenance in backups and optional source information.
- Added compact individual Word/PDF layouts and a compact consolidated photo appendix for all export formats.
- Improved PowerPoint summary pagination, adaptive portrait-photo pairs and department response space.
- Kept long content and photo captions on continuation pages or slides without silent truncation.

## 1.0 · 6 Nov 2026

- Initial reporting release with multi-ZIP import, finding and photo editing, Word/PDF/PowerPoint exports, local project backups, offline support and storage protection.
