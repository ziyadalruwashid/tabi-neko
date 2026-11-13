# Tabi Neko design

Tabi Neko is a travel notebook for Japan, guided by Apollo the cat. Every
screen should feel like a page from a warm, hand-kept notebook: cream paper,
taped-in photos, stickers and handwriting. It should never look like a
generic travel app or a search engine. Read this before you add or change a
screen.

## Voice

- Apollo talks: short, friendly, first person ("I've tried every place here
  myself"). No marketing words, no exclamation spam.
- Plain words. Say what a thing is ("Restaurants", "Day trips"), not what it
  does for you ("Discover amazing food").
- English and Arabic always ship together. The Arabic is in the white
  (Gulf) dialect and reads like a friend, not a translation. In content, a
  temple is تمبل and a shrine is ضريح.
- Halal is a fact on a place, not a slogan. Show it clearly where it helps
  (badges, the Halal only switch) and keep it low-key on the landing page.
  The landing page doesn't show the Great Buddha.

## Colour

All colours are CSS variables on `:root` in `css/tabi.css`. Use them;
don't hard-code new hex values unless a new token is really needed.

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#FAF4E8` | page background (with a faint paper grain) |
| `--sheet` | `#FFFDF7` | cards, sheets, list rows |
| `--ink` | `#3F2116` | text, dark buttons |
| `--muted` | `#8C6F60` | secondary text |
| `--rule` | `#E7D9C6` | dashed dividers, borders |
| `--lantern` | `#F14E24` | the brand orange: main buttons, active tab, links, arrows |
| `--shinkansen` | `#1D52A0` | blue accents |
| `--mochi` | `#FF8FA3` | pink accents |
| `--wasabi` | `#88B44A` | green accents |
| `--yuzu` | `#FFD13B` | yellow accents, tape |
| `--tape`, `--tape2` | yellow / pink, see-through | washi tape on photos |

Each place category has its own colour, used for its sticker, chips and the
tint behind its drawing:

| Category | Token | Hex |
|---|---|---|
| food | `--food` | `#E8A800` |
| coffee | `--coffee` | `#9A6233` |
| shrine | `--shrine` | = `--lantern` |
| views | `--views` | = `--shinkansen` |
| nature | `--nature` | `#5E9A3E` |
| streets | `--streets` | `#2E8C88` |
| shop | `--shop` | `#E8607A` |
| experience | `--experience` | `#7B5EA7` |
| hidden gem | `--gem` | `#6E9A33` |

Halal badges (Restaurants):

| Badge | Background | Text |
|---|---|---|
| ✅ Halal certified | `#DFF1DC` | `#1F7A2F` |
| 🟢 Halal | `#E9F5E1` | `#3E7D2A` |
| 🟡 Muslim-friendly | `#FFF1CC` | `#9A6A00` |
| Not halal | `#EFE5D6` | `#8C6F60` |

Moods on Explore each have a soft background and a strong colour (`--bg`
and `--c` on the tile), for example Restaurants `#FFE9D6` / `#D9531E` and
Views `#E3EEF8` / `#1D52A0`.

## Type

| Token | Font | Use |
|---|---|---|
| `--display` | Bagel Fat One | big titles ("What's your mood?", page and card titles) |
| `--body` | Inter | everything else |
| `--hand` | Tabi Note (handwriting) | notes, captions, stickers |
| `--jp` | Hiragino Maru Gothic / Noto Sans JP | Japanese names |

In Arabic (`[dir=rtl]`) the same tokens fall back to Noto Arabic Display and
Noto Sans Arabic, and letter-spacing is always 0. The fonts are in
`assets/fonts/`. Don't load fonts from Google; the app must work offline.

Sizes in the app: display titles 21 to 28 px, body 14 to 16 px, small text
12 to 13 px, weights 700 to 900 for labels.

## Shapes and depth

- Rounded everywhere: cards 18 to 22 px, list rows 16 px, chips and pills
  999 px.
- Shadows are soft and warm: `0 2px 10px rgba(63,33,22,.05)` to
  `0 4px 14px rgba(241,78,36,.08)`. No hard or grey shadows.
- Dividers are dashed (`1.5px dashed var(--rule)`).
- Photos can carry a strip of washi tape (`.tape`) and a slight tilt for the
  notebook feel. Keep it to one or two per screen.

## Illustration

- Each category has a sticker drawing (`assets/c-*.png`), and moods have
  their own (`fuji.png`, `coffee.png`, `torii.png`, `ramen.png`…). A place
  without a photo shows its category drawing, never an empty box.
- Apollo (the cat) and the buddies Kenbo, Fa, Lily and Sloom appear as small stickers,
  not as big hero art on every screen.
- Emoji are fine as small icons in labels (🍜 🕌 📍), never as decoration in
  titles.

## Photos

- Only the owner's own photos. Never Google Maps photos or someone else's,
  and nothing with a watermark, © notice or logo unless its owner gave it
  with the mark.
- Blur the faces of strangers.
- At most 1600 px on the long side, JPEG quality ~82.
- In the app, place, area and album photos load from the website (see
  `CLAUDE.md`), so a photo can be missing offline: always give a fallback.

## Layout

### Phone (the app)

- `html.tn-app`: a bottom tab bar (Explore, Map, Apollo in the middle as a
  round button, My trip, More).
- Pages open over the tab bar as full-screen overlays with a `‹` back button
  at the top left (top right in Arabic). The phone's back button closes
  them.
- Sheets slide up from the bottom with a grab handle and close when you tap
  outside.
- Side gutter 16 px. Nothing scrolls sideways except chip rows and photo
  rows, which show part of the next item so the swipe is obvious.

### Tablet (768 px and up)

`html.tn-wide`: the tabs become a sidebar (Android navigation rail), places
open as a pane beside the list, and sheets float in the middle. Check every
new screen at 900 px as well as 390 px.

### Arabic

Everything mirrors (`dir=rtl`): arrows flip (→ becomes ←), sidebars swap
sides. Japanese stays left to right inside Arabic. Wrap names in `<bdi>`.

## Components to reuse

| Need | Use |
|---|---|
| A full page | `.py-top` (back button + title) and `.py-scroll` |
| A bottom sheet | `.tpick` overlay with a sheet inside |
| A list of places | `.hx-mr` rows: photo, name, area, ＋ add to trip |
| A row of choices | `.rs-chips` / chip buttons with `.on` |
| An on/off setting | `.rs-sw` switch with `role="switch"` |
| A card on Explore | `.nw-card`, `.ar-big` and the other home cards |
| Halal level | `.rs-bd` with `c`, `h`, `f` or `n` |

## Before you build

The owner likes to see a design before it's built. For any visible change,
make two or three mockups first (best on top of the real app, see the
`mockups` skill), let the owner pick, then build exactly what was picked.
