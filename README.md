# DueNow 2.1.2

Offline homework manager with an editorial dark interface, original class colors, and accessible navigation.

- Application and user guide: `duenow-app-en/`
- Original source reference: `original-v1.3.5/`
- Review notes: `REVIEW.md`
- Checks: `node --test tools/verify.cjs`
- Local preview: `node tools/serve.cjs`, then open `http://127.0.0.1:4173/`
- Isolated sample demo: `http://127.0.0.1:4173/?demo=1`

No dependencies or build step are required. Open `duenow-app-en/index.html` directly for offline use.

## Release archive

The local Git tag `v2.1.2` identifies the release source. The ZIP contains only the application and its documentation, without Git metadata, test fixtures, screenshots, or the old source copy. Generated archives and screenshots are excluded from Git.

Rebuild the ZIP from the repository root:

```powershell
New-Item -ItemType Directory -Force releases
git archive --format=zip --prefix=DueNow-v2.1.2/ --output=releases/DueNow-v2.1.2.zip v2.1.2:duenow-app-en
```

This personalized release includes the ten assignments supplied in the October 3 screenshot. They are appended once on first opening; existing records are retained and matching assignments are skipped. Subsequent edits and completion status are saved in the browser. Follow the application README when moving to a different browser or location.
