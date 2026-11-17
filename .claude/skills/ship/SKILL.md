---
name: ship
description: Commit, open a PR, squash-merge it into main, resync the working branch and follow the Android APK build until it's ready for the owner. Use after a change is tested and ready to go out.
---

# Ship a change

1. **Start from the latest main** (before making the change):
   ```
   git fetch origin main && git checkout -B <branch> origin/main
   ```
2. **Commit.** The subject says what changed, in plain words
   ("Explore: Restaurants is the first mood"). The body says why, and
   what the owner asked for. No model names, no keys.
3. **Push** with `git push -f -u origin <branch>`.
4. **Open a PR** into `main` with the GitHub tools. The body is short:
   what changed, and how it was checked.
5. **Squash-merge** it, passing `expectedHeadSha` = `git rev-parse HEAD`.
6. **Resync** the branch so the next change starts clean:
   ```
   git fetch origin main && git checkout -B <branch> origin/main && git push -f origin <branch>
   ```
7. **Follow the build.** The merge starts `.github/workflows/android.yml`
   (about 3 minutes), unless only `data/places.js`, `hoods.js`, `trips.js`,
   `ar/content.js` or `scout.json` changed; those reach the app from the
   website by themselves. Schedule a check about 5 minutes later.
   - Passed: tell the owner the APK is ready at
     https://github.com/ziyadalruwashid/tabi-neko/releases/download/android-latest/tabi-neko.apk
     and that it installs over the current app.
   - Failed: read the job log, fix it, ship again.

Workflows can't be re-run or dispatched from here (403). To retry a build,
push a real fix.
