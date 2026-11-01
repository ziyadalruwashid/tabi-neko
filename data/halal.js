// Halal Lens: the Japanese words the lens looks for on a label or a menu
// (js/applens.js). One entry per line:
//   w    the spellings to look for (kanji, kana, katakana); the longest match wins,
//        so 洋酒 is found as "liquor" and not as 酒 inside it
//   lvl  "no"  = not halal (red)
//        "skip"= harmless words that would otherwise match a shorter one
//                (酵母エキス, yeast extract, isn't the "extract" to ask about)
//        "ask" = could be, ask first (yellow)
//        "ok"  = a good sign (green): a halal mark, or "from soy"
//   en / ar  what it is, in a few words
//   why / whyAr  one short line on why it matters
// Keep it honest: this only finds words that are printed. It is never a
// halal certificate, and the app says so on every result.
const HALAL=[
// ---- pork ----
{w:["豚肉","豚","ぶた","ブタ"],lvl:"no",en:"Pork",ar:"لحم خنزير",why:"Pork.",whyAr:"خنزير."},
{w:["ポーク"],lvl:"no",en:"Pork",ar:"لحم خنزير",why:"Pork, written in katakana.",whyAr:"خنزير مكتوب بالكاتاكانا."},
{w:["ラード","豚脂"],lvl:"no",en:"Lard",ar:"شحم خنزير",why:"Pork fat, always from pork.",whyAr:"دهن خنزير، دايم من الخنزير."},
{w:["ベーコン"],lvl:"no",en:"Bacon",ar:"بيكون",why:"Almost always pork.",whyAr:"غالباً خنزير."},
{w:["生ハム","ハム"],lvl:"no",en:"Ham",ar:"لحم خنزير مقدد (هام)",why:"Pork.",whyAr:"خنزير."},
{w:["サラミ","パンチェッタ","プロシュート"],lvl:"no",en:"Cured pork",ar:"لحم خنزير مقدد",why:"Cured pork.",whyAr:"خنزير مقدد."},
{w:["チャーシュー","叉焼","焼豚"],lvl:"no",en:"Chashu (pork slices)",ar:"تشاشو (شرائح خنزير)",why:"The pork slices on ramen.",whyAr:"شرائح الخنزير اللي فوق الرامن."},
{w:["豚骨","とんこつ","トンコツ"],lvl:"no",en:"Tonkotsu (pork-bone broth)",ar:"تونكوتسو (مرق عظم خنزير)",why:"Ramen broth boiled from pork bones.",whyAr:"مرق رامن مطبوخ من عظام الخنزير."},
{w:["とんかつ","トンカツ","豚カツ"],lvl:"no",en:"Tonkatsu (pork cutlet)",ar:"تونكاتسو (خنزير مقلي)",why:"Breaded fried pork.",whyAr:"خنزير مقلي بالبقسماط."},
{w:["角煮"],lvl:"no",en:"Kakuni (braised pork belly)",ar:"كاكوني (بطن خنزير مطبوخ)",why:"Braised pork belly.",whyAr:"بطن خنزير مطبوخ."},
{w:["豚エキス","ポークエキス","豚由来"],lvl:"no",en:"Pork extract",ar:"مستخلص خنزير",why:"Made from pork.",whyAr:"مصنوع من الخنزير."},
{w:["ソーセージ","ウインナー","ウィンナー"],lvl:"no",en:"Sausage",ar:"نقانق",why:"In Japan these are almost always pork.",whyAr:"في اليابان غالباً من الخنزير."},
{w:["ゼラチン"],lvl:"ask",en:"Gelatin",ar:"جيلاتين",why:"Often made from pork. Ask, or skip it.",whyAr:"غالباً من الخنزير. اسأل أو تجنبه."},
{w:["コラーゲン"],lvl:"ask",en:"Collagen",ar:"كولاجين",why:"Often from pork skin.",whyAr:"غالباً من جلد الخنزير."},
{w:["餃子","ギョーザ","ぎょうざ"],lvl:"ask",en:"Gyoza (dumplings)",ar:"غيوزا (فطائر)",why:"Usually filled with pork.",whyAr:"غالباً حشوتها خنزير."},
{w:["肉まん","豚まん"],lvl:"ask",en:"Steamed meat bun",ar:"خبز محشي لحم",why:"Usually pork inside.",whyAr:"غالباً فيه خنزير."},
{w:["生姜焼","しょうが焼"],lvl:"ask",en:"Ginger-fried meat",ar:"لحم بالزنجبيل",why:"Usually pork.",whyAr:"غالباً خنزير."},
{w:["カツ丼","かつ丼","カツカレー"],lvl:"ask",en:"Katsu (fried cutlet)",ar:"كاتسو (مقلي)",why:"Often pork unless it says chicken (チキン).",whyAr:"غالباً خنزير إلا إذا مكتوب دجاج (チキン)."},
// ---- alcohol ----
{w:["料理酒"],lvl:"no",en:"Cooking sake",ar:"ساكي للطبخ",why:"Rice wine used in cooking.",whyAr:"خمر رز للطبخ."},
{w:["本みりん","みりん","味醂","ミリン"],lvl:"no",en:"Mirin",ar:"ميرين",why:"Sweet rice wine, about 14% alcohol.",whyAr:"خمر رز حلو، فيه كحول حوالي ١٤٪."},
{w:["みりん風調味料"],lvl:"ask",en:"Mirin-style seasoning",ar:"تتبيلة شبه الميرين",why:"Made to taste like mirin, usually under 1% alcohol.",whyAr:"تشبه الميرين، غالباً فيها كحول أقل من ١٪."},
{w:["日本酒","清酒","酒"],lvl:"no",en:"Sake / alcohol",ar:"ساكي / كحول",why:"Alcohol.",whyAr:"كحول."},
{w:["洋酒","ラム酒","ブランデー","リキュール","ウイスキー","ワイン","ビール","焼酎","紹興酒"],lvl:"no",en:"Liquor, wine or beer",ar:"خمر أو نبيذ أو بيرة",why:"Alcohol.",whyAr:"كحول."},
{w:["酒精","アルコール","エタノール"],lvl:"no",en:"Alcohol",ar:"كحول",why:"Alcohol added to the food.",whyAr:"كحول مضاف للأكل."},
{w:["酒粕"],lvl:"no",en:"Sake lees",ar:"بقايا الساكي",why:"Left over from making sake, still has alcohol.",whyAr:"بقايا صنع الساكي، فيها كحول."},
{w:["発酵調味料"],lvl:"ask",en:"Fermented seasoning",ar:"تتبيلة مخمرة",why:"Can contain a little alcohol.",whyAr:"ممكن فيها شوية كحول."},
// ---- other meat ----
{w:["牛肉","ビーフ","牛脂","ヘット"],lvl:"ask",en:"Beef or beef fat",ar:"لحم بقر أو شحمه",why:"Fine only if it's halal-slaughtered. Ask.",whyAr:"حلال بس إذا مذبوح حلال. اسأل."},
{w:["鶏肉","チキン","とり肉"],lvl:"ask",en:"Chicken",ar:"دجاج",why:"Fine only if it's halal-slaughtered. Ask.",whyAr:"حلال بس إذا مذبوح حلال. اسأل."},
{w:["動物性油脂","動物油脂"],lvl:"ask",en:"Animal fat",ar:"دهون حيوانية",why:"Could be pork or beef fat.",whyAr:"ممكن دهن خنزير أو بقر."},
{w:["肉エキス","ビーフエキス","チキンエキス","畜肉エキス"],lvl:"ask",en:"Meat extract",ar:"مستخلص لحم",why:"Ask which meat it's from.",whyAr:"اسأل من أي لحم."},
{w:["ブイヨン","コンソメ"],lvl:"ask",en:"Stock / consommé",ar:"مرق",why:"Often made with meat, sometimes pork.",whyAr:"غالباً من اللحم، أحياناً خنزير."},
// ---- additives ----
{w:["乳化剤"],lvl:"ask",en:"Emulsifier",ar:"مستحلب",why:"Can come from pork fat. 大豆由来 means it's from soy.",whyAr:"ممكن يكون من دهن الخنزير. إذا مكتوب 大豆由来 يعني من الصويا."},
{w:["ショートニング"],lvl:"ask",en:"Shortening",ar:"سمن صناعي",why:"Usually vegetable, sometimes animal fat.",whyAr:"غالباً نباتي، وأحياناً دهن حيواني."},
{w:["グリセリン"],lvl:"ask",en:"Glycerin",ar:"جليسرين",why:"Can be from animal fat.",whyAr:"ممكن من دهن حيواني."},
{w:["レンネット"],lvl:"ask",en:"Rennet",ar:"منفحة",why:"Used for cheese, can be from animals.",whyAr:"تستخدم للجبن، ممكن تكون حيوانية."},
{w:["エキス"],lvl:"ask",en:"Extract",ar:"مستخلص",why:"An extract of something. Check what comes before it.",whyAr:"مستخلص من شي. شوف وش مكتوب قبله."},
{w:["酵母エキス","野菜エキス","昆布エキス","かつおエキス","魚介エキス","しいたけエキス","カツオ","かつお","鰹"],lvl:"skip"},
// ---- good signs ----
{w:["ハラール","ハラル","HALAL","Halal","halal"],lvl:"ok",en:"Halal",ar:"حلال",why:"Says halal. Look for the certifier's logo too.",whyAr:"مكتوب حلال. دوّر شعار جهة الاعتماد بعد."},
{w:["大豆由来","植物性","植物油脂"],lvl:"ok",en:"From soy / vegetable",ar:"من الصويا / نباتي",why:"Plant-based, a good sign for emulsifiers and fats.",whyAr:"نباتي، علامة زينة للمستحلبات والدهون."},
{w:["ノンアルコール","アルコールフリー","アルコール0"],lvl:"ok",en:"Alcohol-free",ar:"بدون كحول",why:"Says no alcohol. Some \"non-alcohol\" drinks still have a trace.",whyAr:"مكتوب بدون كحول. بعض المشروبات فيها أثر بسيط."}
];
// Questions to show the staff, Japanese first.
const HALAL_ASK=[
{jp:"これに豚肉やアルコールは入っていますか？",en:"Does this have pork or alcohol in it?",ar:"هل فيه لحم خنزير أو كحول؟"},
{jp:"みりんやお酒は使っていますか？",en:"Is it made with mirin or sake?",ar:"هل فيه ميرين أو ساكي؟"},
{jp:"スープは豚骨ですか？",en:"Is the broth made from pork?",ar:"هل المرق من عظم الخنزير؟"},
{jp:"私はムスリムなので、豚肉とお酒が食べられません。",en:"I'm Muslim, so I can't eat pork or alcohol.",ar:"أنا مسلم، ما آكل خنزير ولا كحول."},
{jp:"ハラールのメニューはありますか？",en:"Do you have a halal menu?",ar:"عندكم قائمة حلال؟"}
];
