# Safety Fieldbook Report Studio

A browser application for turning Safety Fieldbook schema 3 ZIP exports into inspection reports. Reports, photographs and edits are stored in IndexedDB in the current browser. Inspection data is not included in this repository.

## Features

- Import multiple inspection ZIPs, detect duplicate records and review conflicting versions.

- Edit findings in cards, reorder findings, merge findings from the same inspection and restore deleted findings.

- Add photographs, edit captions, crop and rotate report copies, and annotate with arrows, boxes, drawing and text while preserving imported images.

- Export Word, PDF and PowerPoint using individual finding tables or a consolidated findings table.

- Choose report fields and presets, recommended actions and blank department response spaces.

- Autosave projects locally and download editable project backups containing original records, images and report edits.

- Installable PWA with cached offline use, installation status where detectable and an update indicator. Initial setup, sign-in where applicable, and updates need an internet connection.

## Run locally

Use Node.js 24 or newer to build and run the tests. Runtime libraries are vendored; no npm installation is required.

```sh

npm test

npm run build

python -m http.server 8788 --bind 127.0.0.1 --directory dist

```

Open http://localhost:8788. JavaScript modules and service workers require HTTP localhost or HTTPS; opening the HTML file directly is unsupported. Wait for **Ready for offline use** before disconnecting.

## File limits

- 200 MiB per inspection ZIP.

- 500 MiB total imported ZIPs per report.

- 1 GiB expanded data per report.

- 5,000 archive entries.

- JPEG and PNG additions: 20 MiB and 80 megapixels per photograph.

- Photo editor working copies: at most 2,400 pixels on the longest edge.

These are application safeguards, not a guarantee of performance at the maximum sizes on every device. Browser memory and storage capacity affect large reports. Keep project backups; local data does not sync between browsers or devices and can be removed by browser/device cleanup.

## Deployment and updates

Serve `dist/` over HTTPS using a static web host. Run `npm run build` after changes so `dist/sw.js` contains the current application cache version. The build also generates an optional Worker entrypoint at `dist/server/index.js`.

Install and update controls appear at the top right of the home screen. In the app information dialog, Check for updates changes to Update now when a version is ready; select it to save and apply the update directly. Installed status depends on browser support. Updates save committed work first and ask users to finish open edits and close other app windows before applying an update. Offline files are cached separately from the report database.

The original private Sites deployment identifiers are intentionally omitted from this GitHub snapshot. Configure a separate hosting binding if deploying through Sites. Publishing this repository does not change the existing hosted app or its access settings.

## Optional AI assistance: bring your own OpenAI key

App URL: https://kengbeng.github.io/safety-fieldbook-report-studio/

Version 1.4.0 retains the existing production database, saved reports, preferences and installed-app identity. Reports created in the separate AI beta remain there. Download a project backup in the beta and open it in this app to transfer a report; no automatic migration is performed.

Open **AI Settings > Connect OpenAI**, enter your key, and select **Test & connect**. The key must allow reading models and creating Responses. It stays only in the tab's JavaScript memory; the input is cleared on submission. Refresh, page exit or **Disconnect & clear key** removes it. Keys are not saved in browser storage, reports, backups, exports or source control.

The app calls `https://api.openai.com/v1` directly. It does not use a backend or the parked ChatGPT-plan integration in `worker/ai.mjs`. Page scripts and privileged extensions can access an entered key. Projects under `kengbeng.github.io` share an origin; separate database/cache names do not create a security boundary. Use a dedicated limited-permission key and monitor usage. Each user's API account supplies billing/credits and model access.

Configure the API key, model dropdown and photo option together in **AI Settings** on the homepage. The compact popup has one collapsed Usage & privacy section. Settings apply throughout the current tab; the key is never persisted.

Open a finding and click the single sparkle icon. One click generates and fills its short title, observation and corrective action together. There is no finding review panel or separate Apply buttons. **Undo AI**, beside the sparkle icon in the individual finding editor, restores all three fields as a single change. **Save changes** remains the final step for saving the finding; Cancel discards the draft. The icon shows progress and a Cancel AI control while the request runs.

Concise wording targets are 8 words/80 characters for titles, 60 words/600 characters for observations and 40 words/400 characters for corrective actions. Complete wording above these targets remains editable with a length advisory. Technical limits remain 120 characters for titles and 12,000 characters for each observation or action. Prompts ask for direct, non-speculative observations containing only reported or visible facts. Observations state the condition and its reasonably supported safety lapse or potential harm directly. Uncertain explanations are omitted; verification becomes a concrete corrective action. Administrative location identifiers are omitted while essential physical context is retained. If no concrete condition is established, AI displays a request for factual detail without changing the finding. Missing fields and output beyond the technical limits are rejected without changing the finding. Wording is never silently truncated. Original inspection records remain unchanged.

Finding actions use up to the first 6 report-selected photographs when **Include finding photos** is on. Removed, unchecked and unavailable images are excluded. Smaller JPEG copies use current edits and rotation, at most 1,280 pixels on the longest edge and 1 MiB each. Canvas encoding omits original EXIF metadata; originals remain unchanged. The inline progress message shows how many photos are being used. ZIP files and other reports are not sent. Draft executive summaries from **Edit report details**, next to the summary field. Summaries remain text-only and fill the details draft directly in one click, without a review/apply popup; **Save changes** commits it and **Cancel** discards it. They target 60–100 words in two paragraphs, allowing up to 150 when needed to preserve material concerns: recorded concern themes and their supported safety significance, followed by the specific corrective priority. Summaries name concrete concerns in the first paragraph and brief recorded next steps in the second. They favour familiar words, one point per sentence and usually 12–20 words per sentence, with readability taking priority over reaching the target length. Conclusions are limited to the supplied included findings, without claiming a whole-site assessment or inspection completeness. Potential harm must not become an actual incident or established impact. Decisions, resources, coordination, owners and deadlines are included only when explicitly recorded; generic oversight or training recommendations are avoided unless supported. Administrative details are omitted, while a specific detail may be retained when essential to the management priority. Related issues are grouped; finding references, routine dates and room details are omitted from the summary input. The saved summary uses a multiline control so paragraph breaks survive saving, reopening and reload. Paragraphs are retained after drafting the summary and shown separately in preview, Word and PDF. Structured output creates the two paragraphs. The completed draft shows its word count; drafts above 150 words are retained with a notice to edit or regenerate. Text is never automatically truncated, and regeneration requires another click. Sparse evidence can produce a shorter summary to avoid filler.

The dropdown offers `gpt-6-luna` (default), `gpt-5-mini`, `gpt-6.1-terra` and `gpt-6.1-sol`. Access depends on the user's key. Requests use `store: false`, which does not guarantee zero provider retention. Testing a connection reads model access without inference. Generating text or using images incurs API usage; cancellation may not stop work or charges already incurred.

All three finding fields update atomically only if the source, photos, project and open editor session still match. Closing or saving the editor cancels an active request. Undo refuses to overwrite later manual edits to any of the three fields. Manual reporting remains available offline. Requests are bounded to 100 findings, 80 KB of text and 4,096 output tokens, with timeouts and no automatic paid retries.

`npm run test:all` includes synthetic AI checks without a real key. Actual account/model access and paid live inference must be verified by a tester using their own key.

For deployment, enable **Settings > Pages > Source: GitHub Actions**. The workflow checks and builds `pages-site/` at the production path, retaining the production PWA identity and cache namespace. No deployment API key is needed.

## Tests and dependencies

`npm test` runs the automated suites, including ZIP validation, project backup recovery, reporting, PowerPoint, photo editing and PWA lifecycle checks. Offline reopening, editing, autosave and exports were also tested in ChatGPT’s browser using a stopped local server. Native installation and full-size operation on every device remain unverified.

Vendored browser libraries are in `dist/vendor/`; their existing notices and license files are retained. No license is assigned to the application source by this publication.


Finding AI states the observed condition and supported safety lapse directly, without repeating location identifiers or source-attribution phrases. Undo and Redo icons beside AI restore the three wording fields together while protecting later manual edits.

The compact AI button shows the selected model with a green connection dot when connected or grey when disconnected. Its tooltip and accessible label give the full connection status. Connected means a key has been validated for this tab; model access still depends on the key.

## Guided walkthrough and Help

The walkthrough follows create/open, import, optional AI-key setup, finding review, report details and optional summary, export, backup and optional installation. AI can be skipped, and the fictional sample bypasses ZIP import. Earlier tutorial progress maps to the corresponding revised step; completed tutorials stay completed. Restart from Help to see the new AI steps. Help includes API-key setup, session-only retention, billing/model permissions, photo sharing, Undo/Redo, summaries, cancellation and troubleshooting.

## Bulk AI findings

AI all findings processes included, unmerged findings regardless of search or view filters. Confirmation shows count, model and photo sharing. Each successful three-field update is saved directly. While processing, a progress bar shows processed findings and percentage, counting successes, failures and skips. Settings and detailed recovery options stay out of the processing view. Stop cancels remaining work; failed, blank or changed findings remain unchanged. API rejection or saving failure stops processing; there are no automatic paid retries. Batch results lists skipped/failed findings and offers explicit Retry failed / unfinished.

The original wording and applied results are stored together with the report, with a checkpoint before any paid request. Undo batch survives refresh and project-backup transfer and refuses to replace later manual wording. Keep changes and clear Undo explicitly releases the previous recovery before a new batch. Originals and photos remain unchanged. Review the updated findings before export.

Selection mode shows one compact strip with a count, Select all shown, Clear and an Actions menu. Actions include AI selected findings (included only), Merge (same inspection), Delete (with confirmation) and Restore. Hidden selections are counted. The persistent batch banner is removed; AI all findings reopens existing batch results, retries and Undo, including after refresh.

Help includes a search field that filters and expands matching sections. Clear returns to the previous section layout; Escape in the search field clears the query before closing the dialog.

Successful individual and batch AI updates also correct exact redundant room prefixes locally: Building E8, Level 05 and Room E8-05-007 (or 05-007) becomes Room 007. Levels must match exactly; no numeric padding or location inference is attempted. Leading zeros and suffixes are preserved. Original source records stay unchanged, and room corrections are included in Undo/Redo or batch recovery, with protection for later location edits.
