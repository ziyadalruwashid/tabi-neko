// Memories album. Shown at #memories, rendered by renderAlbum() in js/app.js.
// Each entry is one page of the album; swipe or use the arrows to turn them.
//
// HEADS UP: this repo is public, so every photo in here ships to the open
// internet. Think twice before adding faces or anything personal.
//
// Fields:
//   t       title of the page
//   jp      optional second line under the title (kana, or a nickname)
//   date    optional: when it happened, written however reads nicely ("12 Oct 2026")
//   where   optional place name printed beside the date
//   city    optional key from CITIES; adds a "see it on the map" button
//   photos  1 to 4 images, in the order things happened: [[src, caption], ...]
//           drop the files in assets/album/ and keep them under ~400KB each
//   note    a few lines in Apollo's voice about the day
const ALBUM=[
{"t":"Our first craft cola","jp":"伊良コーラ","where":"Iyoshi Cola, Tokyo","city":"tokyo","photos":[["assets/album/iyoshi-cola-sign.jpg","follow the kingfisher"],["assets/album/iyoshi-cola-brewing.jpg","cola lab, 1,409 rpm"],["assets/album/iyoshi-cola-first-sip.jpg","first sip ✨"]],"note":"we spotted a big red sign with a kingfisher on it and our paws just walked in. inside it's a tiny cola laboratory: old jars of spices on every shelf and the cola spinning away in a huge glass jar like a science experiment. it came in a little pouch with a slice of lemon and a red straw. first sip: spicy, citrusy, a bit of vanilla, and nothing like any cola we'd ever had. we were hooked. we're still talking about it."},
{"t":"The wrong door was the right one","jp":"パイナップルゲームズ","where":"Pineapple Games, Asakusa","city":"tokyo","photos":[["assets/album/pineapple-games-inside.jpg","oops, wrong door!"],["assets/album/pineapple-games-copy-cat-meow.jpg","a game called… MEOW?!"],["assets/album/pineapple-games-haul.jpg","coming home with us"]],"note":"we were looking for somewhere else and walked through the wrong door. wow. a whole room of board games: shelves up to the ceiling, little tables everywhere, people deep in their games. we were not leaving. then we saw a best-seller sign for a game called copy cat meow, and come on: a cat game, for a cat? obviously. we walked out with copy cat meow and ito for game nights back home. best mistake of the whole trip."},
{"t":"The mystery café","jp":"ナンナナップアンドコーヒー","where":"Nanna Nap & Coffee, Komagome","city":"tokyo","photos":[["assets/album/mystery-cafe-outside.jpg","it just says… COFFEE"],["assets/album/mystery-cafe-roaster.jpg","the roaster + its bear guard"],["assets/album/mystery-cafe-mugs.jpg","two mugs, one cold day"]],"note":"just around the corner from our airbnb was a tiny café with one word on the wall: COFFEE. no name on the outside, no menu, just a big glass window. (we found out later it's called nanna nap & coffee.) inside, a real coffee roaster sat by the window, all dials, gauges and wheels, with a little teddy bear hanging off the side keeping watch. it was cold and grey out, so we sat down and wrapped our paws around two steaming mugs. a café that tells you \"coffee\" and keeps the rest a secret. that's exactly why we loved it."}
];
