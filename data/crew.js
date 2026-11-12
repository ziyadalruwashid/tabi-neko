// Contributors page. Shown at #crew, rendered by renderCrew() in js/app.js.
//
// HEADS UP: this repo is public, so everything in this file ships to the open
// internet — names, photos, handles and all. Only put in what each person is
// happy to have indexed by Google. Nicknames are fine; `n` is never matched
// against anything, it is only printed.
//
// Fields:
//   n      name as it should appear
//   jp     optional second line under the name (a nickname, or kana)
//   role   the small uppercase pill beside the name
//   what   one or two sentences: what they actually did
//   tip    a handwritten line, in their own voice
//   cap    the caption under the polaroid, lowercase, short
//   c      brand colour var for the tape and the no-photo fallback
//   links  optional [[label, url]] — github, instagram, a portfolio
//   e      the app's character select: an emoji for the third stat tile
//   stats  the app's character select: two live numbers, from places,
//          cities, trips, stamps or halal
//
// Pick ONE of these for the polaroid, or neither:
//   photo  a real photograph, cropped to fill the square. Square crops only.
//   art    a cutout sticker on a transparent background, sat on a card tinted
//          with `c`. Same treatment a place with no photo gets from its
//          category sticker, so the mascots match the rest of the site.
// With neither, the card falls back to the person's initials.
const CREW=[
{"n":"Apollo","jp":"アポロ","role":"guide","what":"The cat whose notebook this is. He walked every street on the map, ate his way through three cities and decided which places were worth a page. Every tip on this site is in his voice.","tip":"i only recommend places i'd go back to. there are no filler pages in here.","cap":"camera in paw","art":"assets/cat.png","c":"--lantern","e":"📷","stats":["places","cities"],"links":[]},
{"n":"Kenbo","jp":"ケンボー","role":"scout","what":"An eagle who joined for the long days out. He takes the trails and the trains the cat won't: the day trips, the hikes and anything that needs an early start and a good pair of boots.","tip":"if it's more than an hour out of the city, it's my page. pack water.","cap":"on the trail","art":"assets/crew/kenbo.png","c":"--wasabi","e":"🥾","stats":["trips","stamps"],"links":[]},
{"n":"Fa","jp":"ファ","role":"support","what":"A duck who joined to look after everyone. When the day gets long, the trains get busy or the jet lag hits, Fa turns up with a warm tea, a blanket and a reminder that you've got this.","tip":"slow down. drink something warm. you've got this.","cap":"ready to help","art":"assets/crew/fa.png","c":"--mochi","e":"🍵","stats":["halal","cities"],"links":[]},
{"n":"Lily","jp":"リリー","role":"problem solver","what":"A sharp-eyed fennec who joined to sort out the tricky bits. A lost ticket, an app that won't work, a plan that falls apart at noon: Lily reads the small print, finds the fix and gets the day back on track.","tip":"there's always a way. let me check the map.","cap":"compass in paw","art":"assets/crew/lily.png","c":"--shinkansen","e":"🧭","stats":["places","stamps"],"links":[]}
];
