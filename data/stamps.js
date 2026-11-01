// Apollo's stamp book: the famous places that have a stamp, like the stamps
// at Japan's stations and temples. You get one only when your phone says
// you're there (js/stamps.js).
//   c, n: the place in data/places.js (its city and name)
//   t:    a shorter name for the stamp's rim, when the place's name is long
//   j:    a shorter Japanese name, when the place's is long
//   ic:   the drawing in the middle of the stamp
//   r:    how close you need to be, in metres: bigger for parks and districts
const STAMPS=[
  {c:"tokyo",n:"Senso-ji",ic:"lantern",r:200},
  {c:"tokyo",n:"Meiji Jingu",ic:"torii",r:300},
  {c:"tokyo",n:"Tokyo Tower",ic:"tower",r:200},
  {c:"tokyo",n:"Tokyo Skytree",t:"Skytree",j:"スカイツリー",ic:"skytree",r:200},
  {c:"tokyo",n:"Shibuya Station & Hachiko",t:"Shibuya",j:"渋谷",ic:"cross",r:250},
  {c:"tokyo",n:"Shibuya Sky",j:"渋谷スカイ",ic:"skyscraper",r:200},
  {c:"tokyo",n:"Shinjuku Gyoen",ic:"trees",r:600},
  {c:"tokyo",n:"Imperial Palace East Gardens",t:"Imperial Palace",j:"皇居東御苑",ic:"yagura",r:600},
  {c:"tokyo",n:"Ueno Park",j:"上野公園",ic:"sakura",r:600},
  {c:"tokyo",n:"Akihabara Electric Town",t:"Akihabara",j:"秋葉原",ic:"electric",r:500},
  {c:"tokyo",n:"Tsukiji Outer Market",t:"Tsukiji",j:"築地",ic:"market",r:400},
  {c:"tokyo",n:"teamLab Borderless",t:"teamLab",j:"チームラボ",ic:"sparkle",r:200},
  {c:"kyoto",n:"Fushimi Inari Taisha",t:"Fushimi Inari",j:"伏見稲荷",ic:"inari",r:400},
  {c:"kyoto",n:"Kiyomizu-dera",ic:"stage",r:300},
  {c:"kyoto",n:"Kinkaku-ji",ic:"kinkaku",r:300},
  {c:"kyoto",n:"Ginkaku-ji",ic:"ginkaku",r:300},
  {c:"kyoto",n:"Arashiyama",ic:"bamboo",r:800},
  {c:"kyoto",n:"Gion",ic:"lanterns",r:500},
  {c:"kyoto",n:"Nishiki Market",t:"Nishiki",j:"錦市場",ic:"market",r:400},
  {c:"kyoto",n:"Nijo Castle",ic:"yagura",r:400},
  {c:"kyoto",n:"Philosopher's Path",t:"Philosopher's Path",ic:"path",r:600},
  {c:"kyoto",n:"Kyoto Imperial Palace",t:"Imperial Palace",j:"京都御所",ic:"gate",r:600},
  {c:"osaka",n:"Osaka Castle",ic:"castle",r:500},
  {c:"osaka",n:"Dotonbori",ic:"canal",r:500},
  {c:"osaka",n:"Universal Studios Japan",t:"Universal Studios",j:"ユニバーサル",ic:"globe",r:800},
  {c:"osaka",n:"Kuromon Market",t:"Kuromon",j:"黒門市場",ic:"market",r:400},
  {c:"osaka",n:"Shinsekai",ic:"fugu",r:500},
  {c:"osaka",n:"Tsutenkaku",ic:"tsutenkaku",r:200},
  {c:"osaka",n:"Osaka Aquarium Kaiyukan",t:"Kaiyukan",j:"海遊館",ic:"fish",r:300},
  {c:"nara",n:"Nara Park",ic:"deer",r:800},
  {c:"nara",n:"Todai-ji",ic:"hall",r:300},
  {c:"nara",n:"Kasuga Taisha",ic:"toro",r:300},
  {c:"nara",n:"Kofuku-ji",ic:"pagoda",r:300},
  {c:"nara",n:"Todaiji Nigatsudo",t:"Nigatsudo",j:"二月堂",ic:"stage",r:200},
  {c:"kamakura",n:"Kamakura Great Buddha (Kotoku-in)",t:"Great Buddha",j:"鎌倉大仏",ic:"buddha",r:250},
  {c:"kamakura",n:"Tsurugaoka Hachimangu",t:"Tsurugaoka",j:"鶴岡八幡宮",ic:"torii",r:300},
  {c:"kamakura",n:"Hase-dera",ic:"hall",r:250},
  {c:"kamakura",n:"Enoshima",ic:"island",r:800},
  {c:"kobe",n:"Kobe Port Tower",t:"Port Tower",j:"ポートタワー",ic:"porttower",r:250},
  {c:"kobe",n:"Kitano Ijinkan-gai",t:"Kitano",j:"北野異人館",ic:"house",r:500},
  {c:"kobe",n:"Meriken Park & BE KOBE",t:"Meriken Park",j:"メリケンパーク",ic:"anchor",r:500},
  {c:"kobe",n:"Nunobiki Herb Gardens & Ropeway",t:"Nunobiki",j:"布引",ic:"ropeway",r:600}
];
