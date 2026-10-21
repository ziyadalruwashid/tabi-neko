// Memories album. Shown at #album, rendered by renderAlbum() in js/app.js.
// Each entry is one page of the album; swipe or use the arrows to turn them.
//
// HEADS UP: this repo is public, so every photo in here ships to the open
// internet. Think twice before adding faces or anything personal.
//
// Fields:
//   t       title of the page
//   jp      optional second line under the title (kana, or a nickname)
//   date    when it happened, written however reads nicely ("12 Oct 2026")
//   where   optional place name printed beside the date
//   city    optional key from CITIES; adds a "see it on the map" button
//   photos  1 to 4 images, newest first: [[src, caption], ...]
//           drop the files in assets/album/ and keep them under ~400KB each
//   note    a few lines in Apollo's voice about the day
//
// The three pages below are SAMPLES built from place photos already on the
// site, there so the layout can be seen. Swap them out for real memories.
const ALBUM=[
{"t":"First night in Shibuya","jp":"渋谷","date":"sample page","where":"Shibuya","city":"tokyo","photos":[["assets/photos/shibuya-sky.jpg","up on the roof"],["assets/photos/shibuya-yokocho.jpg","dinner, finally"]],"note":"we dropped the bags and went straight out. the crossing is louder than you think, and the view from the top is worth every yen."},
{"t":"Ten thousand gates","jp":"伏見稲荷","date":"sample page","where":"Fushimi Inari","city":"kyoto","photos":[["assets/photos/fushimi-inari-taisha.jpg","up, up, up"],["assets/photos/kinkaku-ji.jpg","gold!!"],["assets/photos/senso-ji.jpg","one more shrine"]],"note":"started at seven before the crowds. my paws hurt by the top but the quiet up there was something else."},
{"t":"Deer with no manners","jp":"奈良公園","date":"sample page","where":"Nara Park","city":"nara","photos":[["assets/photos/nara-park.jpg","they bow, then they bite"]],"note":"bought one pack of crackers and was immediately surrounded. hold them up high and keep walking."}
];
