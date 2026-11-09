# Tabi Neko

A Japan travel notebook guided by Apollo the cat: a website on Vercel
(tabi-neko.vercel.app) and the same site wrapped as an Android and iOS app
with Capacitor. The owner is Ziyad. Design rules are in `DESIGN.md`;
repeatable jobs are in `.claude/skills/`.

## How it's built

- Plain HTML, CSS and JavaScript. No framework, no bundler, no build step for
  the site. Scripts are classic `<script>` tags in `index.html`, in order,
  sharing globals.
- `index.html`: the one page. `css/tabi.css`: all styles.
- `data/`: the content as JS arrays, one entry per line.
  - `places.js` (`P`): every place. Fields: `city`, `n`, `jp`, `cat`, `tier`,
    `area`, `lat`, `lng`, `t`, `cost`, `dur`, `cap`, `tip`, optional `photo`,
    `halal` + `hl` (`certified` / `friendly`), `gem`, `book`, `added`
    (`YYYY-MM-DD`, for the "new places" banner).
  - `hoods.js` (`HOODS`, the areas), `trips.js` (day trips), `map.js`
    (`CITIES`, `CATS`), `album.js`, `crew.js`, `apps.js`, `stamps.js`,
    `buddies.js`, `halal.js`.
  - `ar/ui.js`: Arabic for the interface, keyed by the English string.
    `ar/content.js`: Arabic for places (`"city|Name"`), trips, apps and the
    album.
  - `scout.json`: the Apollo Scout's suggestions (see `SCOUT.md`).
- `js/`: the website's scripts (`app.js`, `trip.js`, `apollo.js`,
  `landing.js`…) and the app's (`app*.js`, `live.js`). App-only code checks
  `IS_APP` or `html.tn-app`.
- `worker/ask-apollo.js`: the Cloudflare Worker behind Ask Apollo (Claude,
  10 questions a day per account, counted in Firestore). The owner deploys it
  by hand.
- `firebase/firestore.rules`: published by the owner in the Firebase
  console.
- `app/`: the Capacitor project. `npm run web` copies the site into
  `app/www` (`app/scripts/copy-web.mjs`). `app/www` and the native
  `public/` folders are build output; never edit them.
- `store/google-play/`: the store listing, forms and signing notes.

### Key helpers

- `T("English", {n})`: text in the current language. Every new string
  needs its Arabic in `data/ar/ui.js`.
- `D(obj, "field")`: a data field in the current language.
- `isAR()`, `esc()`, `PKEY(p)` (`city|name`), `inTrip(k)`, `trip`,
  `saveTrip()`, `openPlace(id)`, `toast()`.
- App pages are fixed overlays that push `history.state` with a `tn…` key
  (`{tnRest:1}`), so the phone's back button closes them.

### Photos in the app

The APK carries no place, area or album photos (it would weigh ~60 MB
more). `js/live.js` loads each from the website when it shows, falls back
to the category drawing offline, and saves My trip's photos on the phone.
Only the 7 first-run photos listed in `app/scripts/copy-web.mjs` are packed.
New photos reach the app as soon as the site deploys.

### Data without a new app

`js/live.js` downloads `places.js`, `hoods.js`, `trips.js` and the Arabic
content from the website each time the app opens. Changing only those
files doesn't need a new APK, and `.github/workflows/android.yml` skips the
build for them.

## Rules

- **Never put keys, tokens or passwords in code, commits, GitHub or chat.**
  The Android upload key and its password live only in the GitHub secrets
  `ANDROID_KEYSTORE_BASE64` and `ANDROID_KEYSTORE_PASSWORD`. Never ask the
  owner to paste them.
- The repo is public. Photos must be the owner's own; blur strangers'
  faces; no Google Maps photos and nothing with a watermark, © or logo
  unless its owner gave it with the mark.
- No model names or IDs in commits, PRs or code.
- Mockups first for anything visible, then build what the owner picked.
- English and Arabic together, always. Arabic in the white dialect; in
  content, temple = تمبل and shrine = ضريح.
- Keep halal low-key on the landing page, and no Great Buddha there.
- Check new screens on a 390 px phone, in Arabic, and at 900 px (tablet).
- Delete what you replace: old code, styles and Arabic strings go in the
  same change.

## Workflow

1. Work on the branch you're given, starting from the latest `main`.
2. Test in a browser (see the `test-app` skill), then commit with a clear
   message that says what changed and why.
3. Open a PR, squash-merge it, and bring the branch back to `main`. The
   `ship` skill has the exact steps.
4. A merge to `main` deploys the site (Vercel) and builds the Android APK
   (GitHub Actions). The newest APK is always at
   https://github.com/ziyadalruwashid/tabi-neko/releases/download/android-latest/tabi-neko.apk
   and installs over the current app.
5. Tell the owner when the APK is ready, or fix the build if it failed.

## Talking to the owner

Short, friendly and plain. Say what changed in the app, not in the code.
Give the APK link when there is one. Ask before anything big or hard to
undo.
