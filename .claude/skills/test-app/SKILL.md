---
name: test-app
description: Run the site locally and check the app layout with Playwright (phone, Arabic, tablet), with screenshots. Use before shipping any visible change.
---

# Test the app in a browser

1. **Serve the repo root** (in the background; it stops after its time
   limit, so restart it when needed):
   ```
   python3 -m http.server 8765
   ```
2. **Open the app layout** at `http://localhost:8765/?app=1`. In
   Playwright:
   - Viewport 390×844 for a phone, 900×844 for a tablet.
   - Block outside services so tests don't depend on them:
     `gstatic|workers.dev|vercel|firestore|identitytoolkit|securetoken|open-meteo|openfreemap`.
   - Skip the intro with an init script:
     `sessionStorage.setItem('tabineko-splash','1'); localStorage.setItem('tabineko-onboarded','1')`.
     Add `localStorage.setItem('tabineko-lang','ar')` for Arabic.
3. **Drive it** with the page's own globals: `goTab('trip')`,
   `openPlace(id)`, `tnOpenRest()`, `tnOpenCityPicker()`, `history.back()`.
   Fill a trip by setting `trip` and calling `saveTrip()`.
4. **Check:**
   - No `pageerror` events.
   - No horizontal page scroll.
   - The back button closes what you opened.
   - English, Arabic (mirrored) and tablet.
5. **Look at the screenshots yourself** before you report. Put them in the
   scratchpad, never in the repo.

Photos load from tabi-neko.vercel.app in the app; to test them offline,
abort `vercel.app/assets/` and expect the category drawings.
