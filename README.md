# TNi Project Management Academy

Self-paced HTML training for new PMs and experienced PMs learning TNi's process. The course follows the process confirmed by Chris Taylor in September 2026, from PO acknowledgement to warranty support.

## Fixed public URL

**https://stumpwizard.github.io/tni-pm-academy/** is the permanent course URL, locked by the owner on September 29, 2026. Publish all future updates to this existing repository (`Stumpwizard/tni-pm-academy`), branch `main`, Pages folder `/docs`. Do not rename the repository, change the Pages address, or substitute another hosting destination unless the owner explicitly requests a URL change.

## Open / publish

The complete static website is in `docs/`. No build step, external fonts, analytics, backend, or runtime package installation is required for the deployed site.

For GitHub Pages, open this repository's **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, select **main** and **/docs**, then save. Publishing only `docs/` keeps development tools and tests outside the website.

The public course repository is `Stumpwizard/tni-pm-academy`. Its GitHub Pages address is `https://stumpwizard.github.io/tni-pm-academy/` after successful deployment. The owner explicitly authorized public web access and device-only metrics on September 29, 2026. The existing private `PM-Checklist` repository and its documents remain unchanged. No learner records, source quote workbooks or customer action lists are included in the public course site.

To preview locally with Node 20 or later:

```sh
npm start
```

Open `http://localhost:4173`. Serve the files over HTTP(S); ES modules do not reliably run by opening `index.html` directly as a local file.

## Included

- 12 complete lessons with objectives, PM foundations, TNi procedures, practical scenarios and model responses.
- Ten questions per module (120 total), plus a 20-question final assessment.
- 100% passing score: 10/10 for module checks, 20/20 for the final.
- Untimed assessments and unlimited retakes. All submitted attempts remain in history. Each assessment's first attempt is excluded from its retake count.
- Lessons must be marked reviewed before their checks; all 12 modules must be reviewed/passed to unlock the final. A later lower score does not erase an earlier pass.
- Question and option ordering shuffled for each new attempt. Unfinished answers persist on the same browser.
- Learner profiles by PM name, module completion, per-attempt scores and answers, contact hours, and retake counts.
- Summary CSV, attempt-level CSV, JSON backup/restore and printable training records.
- Mobile layouts, keyboard controls, visible focus, labeled inputs, reduced-motion support and print styling.

## Device-only record storage

Records are saved in browser localStorage under `tni-pm-academy-v1`. They are **not uploaded to GitHub or any external service**. The owner chose to skip SharePoint integration and keep metrics on the device used to access the course. No employee records are committed to the repository.

Full names are self-entered profile labels, not authentication. This is an informal training client, not a tamper-proof examination system: client-side questions, answers, time and results can be inspected or modified. There is no central management dashboard or automatic device synchronization. Learners can export their results and backup files when they want to share or transfer their records.

Each browser/device holds its own records. Learners should download a JSON backup before clearing browser data or changing devices. Import validates the course version, answers, computed grades, attempt sequence and time fields. Restoring an existing learner ID replaces that learner's local record after confirmation; it does not merge concurrent work from multiple devices. Separate people with the same name can be differentiated by including a middle initial or another agreed identifier in the profile name.

CSV export prefixes formula-like values to reduce spreadsheet formula injection. No personal data is placed in URLs. There is no hardcoded access token, client secret, unauthenticated remote collector or external tracking service.

## Contact hours

Time counts only while a lesson or active assessment is open, the tab is visible, the window has focus, tracking is not manually paused and there was learner interaction within the last 120 seconds. Pointer, keyboard, scroll and touch activity refresh that window. Profile/restore dialogs pause tracking. Overview, reference, results and reporting screens do not accrue time. Assessment time includes retries and unfinished attempts.

The foreground study interval after the last interaction is counted up to the two-minute inactivity threshold. This is a browser-based estimate, not proof of attention or externally accredited credit. Long suspended timer gaps are capped at five seconds to avoid attributing device sleep to study. A local per-learner tab lease prevents two tabs on the same browser from accruing concurrent time. Browser restrictions can prevent persistence; the application displays a warning and lets the learner download a backup.

Totals preserve seconds internally and round only for display. Contact hours in CSV have four decimal places. A retake is counted when it is submitted, not merely started. Submission timestamps are ISO UTC in exports and localized in the interface.

## Course maintenance

- `docs/course.mjs`: lesson text, questions, explanations and glossary.
- `docs/core.mjs`: grading, record validation, contact-time rules and exports.
- `docs/app.mjs`: interface, persistence, navigation and downloads.
- `docs/styles.css`: responsive and print presentation.
- `docs/index.html`: application shell.

The equipment-specific technical testing checklist is explicitly a future process improvement, not an existing tool supplied by this course. Internal test/readiness responsibilities, OCR accounting, approval markups, customer PDF reports, daily onsite update emails to the TNi team, invoice roles, shipment milestones and job-specific warranty treatment follow the confirmed TNi process. During the customer-site equipment build, the PM develops the daily report throughout the day as updates occur, describing events and completion status, and sends it to the TNi team at the end of the day. Scenario figures are fictional. Source cost workbooks and customer action lists have not been included in the public site.

Course version `1.1.0` expands every module from five to ten questions (120 module questions plus the unchanged 20-question final). All assessments require 100%. Existing question IDs and answer indices stay unchanged, the storage key stays `tni-pm-academy-v1`, and assessment policy version remains 2.

Migration plan: accept both `1.0.0` and `1.1.0` profiles and attempts. Validate old module attempts against their original five questions, preserving their scores, answers, dates, attempt numbers and historical course version. Only current ten-question module attempts count toward module completion; the unchanged final can retain a previous 20/20 pass once current module prerequisites are met. Old module attempts are labeled as earlier assessments in results, history and CSV exports. Best current scores exclude those old module attempts.

Saved drafts gain a course version and the five added questions, preserving existing answers, shuffled option order, start time and accrued study time. Existing final drafts remain saved and are gated by the current module prerequisites. Profile course versions advance only after the complete input record validates. Lesson reviews and all contact time remain intact. Old records from the original 80% policy first validate under that rule, then their result flags are recalculated at 100%. Each attempt retains its original `passMark` so earlier finals remain valid historical records. New final submissions require all twelve current module checks at 100%. The storage merge also validates/migrates other learner profiles before saving.

When materially changing the curriculum or grading, define a record migration/versioning plan before changing `COURSE_VERSION`. Existing records should not silently count against different questions.

## Verification

```sh
npm test
```

Core tests cover complete curriculum counts, the 100% boundary, final grading, retained retries, duplicate submission prevention, completion prerequisites, invalid backup rejection, active/idle timing and CSV formula handling. Browser-flow checks are in `tests/browser.mjs` and require Playwright plus Chromium in the test environment. Test fixtures are not learner records and are not placed in `docs/`.

