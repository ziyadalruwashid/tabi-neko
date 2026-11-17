# App Store screenshots and artwork

Everything to upload in App Store Connect: **your app → Distribution → the
version → App Previews and Screenshots**. English is the default language;
add Arabic under **App Information → Localizable Information → Arabic** and
upload the `ar` set there.

All files are PNG, RGB with no transparency, at the exact sizes below. Upload
each folder's files in order (`01` … `05`). The first three show in search
results, so they carry the main features.

## Screenshots

| Folder | Size (px) | App Store Connect slot |
|---|---|---|
| `screenshots/<lang>/iphone-6.9` | 1290 × 2796 | iPhone 6.9″ |
| `screenshots/<lang>/iphone-6.5` | 1242 × 2688 | iPhone 6.5″ |
| `screenshots/<lang>/ipad-13` | 2064 × 2752 | iPad 13″ |
| `screenshots/<lang>/iphone-duo-folded` | 1398 × 2034 | iPhone Duo, folded screen |
| `screenshots/<lang>/iphone-duo-unfolded` | 2007 × 2853 | iPhone Duo, unfolded screen |

`<lang>` is `en` or `ar`. Upload only the Duo set App Store Connect asks for.

The five screenshots, in order:

| # | English | Arabic |
|---|---|---|
| 1 | Japan, picked by a cat · *500+ places across 7 cities* | اليابان باختيار قط · *أكثر من 500 مكان في 7 مدن* |
| 2 | Plan your trip · *day by day, with times and walks* | رتّب رحلتك · *يوم بيوم، بالأوقات والمشي* |
| 3 | Ask Apollo anything · *and save his plan as a day* | اسأل أبولو · *واحفظ خطته كيوم في رحلتك* |
| 4 | Halal Lens reads labels · *pork and alcohol flagged, on your phone* | عدسة الحلال · *تقرأ الملصق عنك* |
| 5 | Collect stamps · *at Japan's famous places* | اجمع الأختام · *في كل اليابان* |

Every phone and tablet screen is the real app (`?app=1`), rendered at the
device's size with made-up data: the account "Sara" (سارة), the trip
"Autumn in Tokyo" (خريف طوكيو), a scripted Apollo answer about places in
the notebook, and a made-up snack label read by Halal Lens itself. No real
names, emails, invite codes or QR codes are shown.

## Header and search-results artwork

| File | Size (px) |
|---|---|
| `artwork/header-en.png`, `artwork/header-ar.png` | 5244 × 2950 |
| `artwork/search-results-en.png`, `artwork/search-results-ar.png` | 3840 × 2560 |

Check these sizes in App Store Connect before uploading; Apple has changed
them before. In the header, the headline and Apollo sit inside the part an
iPhone always shows (x 1400–3800, y 850–1800); the background runs to the
edges. No logos, URLs or prices, as Apple asks.

## When the app changes

The designs live on the Design canvas "Tabi Neko App Store Screenshots"
(claude.ai). Retake the screens whose UI changed and export again at the
sizes above.
