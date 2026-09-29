# TNi PM Academy maintenance

## Fixed deployment destination

The owner requires all updates to retain this original public URL:
**https://stumpwizard.github.io/tni-pm-academy/**

- Update the existing `Stumpwizard/tni-pm-academy` repository.
- Publish GitHub Pages from `main`, folder `/docs`.
- Do not rename the repository, change the Pages address, add a different domain, or move to another host unless the owner explicitly requests a URL change.
- Verify the deployment at the original URL after publishing changes.

## Existing learner records

Keep browser-local learner records compatible when making wording or styling edits. A wording-only correction must preserve question IDs, option indices, the course version, and the storage key. Coordinate module cache revisions in `docs/index.html`, `docs/app.mjs`, and `docs/core.mjs` when changing curriculum content so the browser loads a consistent release.
