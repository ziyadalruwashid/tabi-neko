---
name: add-places
description: Add new places to data/places.js with their Arabic in data/ar/content.js. Use when the owner names places to add or approves Apollo Scout suggestions (the full scout run is in SCOUT.md).
---

# Add places

1. **Check each place** on the web: it's open, plus its address, rough
   coordinates, hours, price and whether it's halal (certified, halal or
   Muslim-friendly). Don't add a place you can't confirm.
2. **Add one line** to `data/places.js`, in the same format as its
   neighbours:
   - `city`, `n`, `jp`
   - `cat`: food, coffee, shrine, views, nature, streets, shop or
     experience
   - `tier`: must, worth or time
   - `area`: an existing area name for that city
   - `lat`, `lng`, `t`, `cost`, `dur`
   - `cap`: a short lowercase caption, Apollo's voice
   - `tip`: 1–2 plain sentences
   - `halal` / `hl` when true, `book` for a booking link
   - `added`: today's date, for the "Apollo found new places" banner
3. **Add the Arabic** to `data/ar/content.js` → `AR.places`, keyed
   `"city|Name"`, with `t`, `cost`, `dur`, `cap` and `tip` in the white
   dialect. In content, temple = تمبل and shrine = ضريح.
4. **Check** both files still load with `node`, and that the place opens in
   the app (the `test-app` skill).
5. **Ship** (the `ship` skill). Only data files changed, so there's no new
   APK: the app picks the places up from the website the next time it
   opens. Tell the owner that.
