# Apollo Scout: the weekly run

The weekly scheduled task follows this file. It does two things, in this order:
add the places the owner approved last week, then look for new ones.

The owner (Ziyad) approves or skips suggestions in the site's admin
dashboard (`#admin`, "Apollo Scout"). Suggestions live in `data/scout.json`.
His choices live in Firestore, document `scout/picks`, as two lists of ids:
`add` and `skip`.

## 1. Read the picks

```
curl -s "https://firestore.googleapis.com/v1/projects/tabi-neko-52eae/databases/(default)/documents/scout/picks"
```

It's public to read, so no sign-in is needed. `fields.add.arrayValue.values[].stringValue`
are the ids to add; `fields.skip...` are the ids to drop. A missing document
means nothing was picked yet.

## 2. Add the approved places

For each id in `add` that is still in `scout.json` → `pending`:

1. **Check it again**: still open, address, rough coordinates, hours, price,
   halal status. Use two or more sources. If it closed or can't be confirmed,
   don't add it; mention it in the PR instead.
2. **Make sure it isn't already in `data/places.js`** (search the name).
3. **Append one line to `data/places.js`** at the end of the array, in the same
   shape as the others:
   `city, n, jp, cat, tier, area, lat, lng, t, cost, dur, cap, tip`, plus:
   - `"src":""` on every scout place (marks it as from the general list).
   - `"gem":true` when `kind` is `weird` (hidden gem badge).
   - `"halal":true` + `"hl":"halal"` / `"certified"` / `"friendly"` only when
     sources say so. Gonpachi-style "only one course is halal" is `friendly`.
   - Never `"tier":"must"`; that's for the owner's own places. Use `worth` or `time`.
   - `cat` is one of: food, coffee, shrine, views, nature, streets, shop, experience.
   - `area` must be an area already used in that city when one fits.
     Far-out places get `"nomap":true`.
   - No photo. Never copy photos from articles or social media.
4. **Write the Arabic** in `data/ar/content.js`, in `AR.places`, keyed
   `"city|English name"` with `t, cost, dur, cap, tip`. A new area name also
   needs a line in `AR.areas` in `data/ar/ui.js`.
5. **English voice**: Apollo, first person allowed, short and practical. First
   sentence says why go. Mention pork, alcohol, queues and booking plainly.
   Prices start with `~` when they move.
6. **Arabic voice** (the owner's own style):
   - White Saudi dialect, like a friend advising a friend: روح، جرّب، احجز،
     لا تفوّتها، يستاهل، الحين، عشان، شوي، مرة، بعد، جنب، قدام.
   - One or two dialect words per sentence; the rest simple Arabic. Never formal:
     no يُعدّ، يُنصح، تجدر الإشارة، passive voice.
   - Temple = تمبل (تمبلات), shrine = شراين (شراينات).
   - Place, app and brand names stay in Latin letters. English digits always.
   - Same facts as the English: don't add or drop any.

Then remove the added ids, and every `skip` id, from `pending`, and append them
all to `done`.

## 3. Scout for new places

Search the web (newest first) across Tokyo, Kyoto, Osaka, Nara, Kobe and
Kamakura for:

- **Weird & hidden** (the owner's favourite): one-of-a-kind shops, brand stores
  that exist nowhere else (like the Pringles store), odd museums, places even
  locals don't know. Atlas Obscura, Tokyo Cheapo, Tokyo Weekender, Japanese
  珍スポット articles.
- **New openings** this month: Tokyo Weekender "What's new", Time Out, MATCHA,
  Osaka/Kyoto openings sites.
- **Trending** cafés and food that went viral (blogs and news that report on
  TikTok/Instagram trends).
- **New halal restaurants**: Halal Navi, Halal Gourmet Japan, Halal Media.

Skip: anything already in `data/places.js`, any id in `done`, places built
around alcohol, pop-ups that end within a month, and anything with only one
unconfirmed source.

Add 5 to 12 of the best to `pending`, each as:

```json
{"id":"short-unique-slug","city":"tokyo","n":"Name","area":"Existing area","cat":"shop",
 "kind":"weird|new|trendy|halal","why":"One or two plain sentences: why it's special.",
 "halal":"One short line.","sources":["https://..."]}
```

Set `"run"` to today's date (YYYY-MM-DD). Keep `scout.json` valid JSON.

## 4. Ship it

1. Check every changed file still parses:
   `node -e "global.AR={};require('vm').runInThisContext(require('fs').readFileSync('data/places.js','utf8'))"`
   (and the same for `data/ar/content.js` and `data/ar/ui.js`), plus
   `python3 -c "import json;json.load(open('data/scout.json'))"`.
2. Commit on a new branch, open a pull request titled
   `Apollo Scout YYYY-MM-DD: N added, M new suggestions`, and merge it into
   `main`. The body lists what was added, what was dropped and why, and the
   new suggestions.
3. Don't change anything else in the site.
