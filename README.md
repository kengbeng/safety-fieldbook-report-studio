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

Install and update controls appear at the top right of the home screen. Installed status depends on browser support. Updates save committed work first and ask users to finish open edits and close other app windows before applying an update. Offline files are cached separately from the report database.

The original private Sites deployment identifiers are intentionally omitted from this GitHub snapshot. Configure a separate hosting binding if deploying through Sites. Publishing this repository does not change the existing hosted app or its access settings.

## AI status

AI assistance is disabled in `dist/features.mjs`. Experimental server-side integration code and synthetic tests are retained for future work; no API keys or tokens are included. The reporting workflow does not require AI or an API key. Do not enable the experimental integration without the necessary registration and configuration.

## Tests and dependencies

`npm test` runs the automated suites, including ZIP validation, project backup recovery, reporting, PowerPoint, photo editing and PWA lifecycle checks. Offline reopening, editing, autosave and exports were also tested in ChatGPT’s browser using a stopped local server. Native installation and full-size operation on every device remain unverified.

Vendored browser libraries are in `dist/vendor/`; their existing notices and license files are retained. No license is assigned to the application source by this publication.
