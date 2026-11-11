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
