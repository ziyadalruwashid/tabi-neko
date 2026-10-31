// Ready plans for My trip: the classic first trip, already sorted into days.
// Sights only; the trip page suggests a halal lunch near each day by itself.
// Places are named exactly as in data/places.js, within the stay's city.
// Arabic sits in _ar, read by D() like the rest of the site.
const PLANS=[
{"id":"classic10","n":"Classic Japan · 10 days","_ar":{"n":"10 أيام كلاسيكية","blurb":"أول مرة في اليابان؟ هذي أشهر الأماكن في طوكيو وكيوتو ونارا وأوساكا، مرتبة يوم بيوم."},
 "blurb":"First time in Japan? The most famous sights of Tokyo, Kyoto, Nara and Osaka, sorted day by day.",
 "stays":[
  {"city":"tokyo","days":[
   {"t":"Asakusa & Ueno","_ar":{"t":"أساكوسا وأوينو"},"p":["Kaminarimon","Nakamise-dori","Senso-ji","Ueno Park","Ameyoko","Tokyo Skytree"]},
   {"t":"Harajuku & Shibuya","_ar":{"t":"هاراجوكو وشيبويا"},"p":["Tokyo Camii","Meiji Jingu","Takeshita-dori","Shibuya Station & Hachiko","Shibuya Sky"]},
   {"t":"Tokyo Station & Akihabara","_ar":{"t":"محطة طوكيو وأكيهابارا"},"p":["Imperial Palace East Gardens","Tokyo Station Marunouchi Building","Pokemon Center Tokyo DX","Akihabara Electric Town","Tokyo Tower"]},
   {"t":"Toyosu & Odaiba","_ar":{"t":"تويوسو وأودايبا"},"p":["Toyosu Market","teamLab Planets","Life-Sized Unicorn Gundam","Odaiba Seaside Park"]}]},
  {"city":"kyoto","days":[
   {"t":"Fushimi Inari & Gion","_ar":{"t":"فوشيمي إناري وغيون"},"p":["Fushimi Inari Taisha","Yasaka Shrine","Gion","Gion Shirakawa"]},
   {"t":"Higashiyama","_ar":{"t":"هيغاشياما"},"p":["Kiyomizu-dera","Sannenzaka & Ninenzaka","Hokan-ji Temple (Yasaka Pagoda)","Philosopher's Path","Ginkaku-ji"]},
   {"t":"Arashiyama & Kinkaku-ji","_ar":{"t":"أراشياما وكينكاكوجي"},"p":["Arashiyama","Kinkaku-ji","Ryoan-ji","Nijo Castle"]}]},
  {"city":"nara","days":[
   {"t":"Deer & the Great Buddha","_ar":{"t":"الغزلان والبوذا الكبير"},"p":["Nara Park","Todai-ji","Kasuga Taisha","Kofuku-ji","Naramachi"]}]},
  {"city":"osaka","days":[
   {"t":"Osaka Castle & Shinsekai","_ar":{"t":"قلعة أوساكا وشينسيكاي"},"p":["Osaka Castle","Shinsekai","Tsutenkaku","Harukas 300"]},
   {"t":"Aquarium & Dotonbori (or Universal Studios)","_ar":{"t":"الأكواريوم ودوتونبوري (أو يونيفرسال)"},"p":["Osaka Aquarium Kaiyukan","Tempozan Ferris Wheel","Shinsaibashi-Suji Shopping Street","Hozenji Yokocho","Dotonbori"]}]}]},
{"id":"classic7","n":"Classic Japan · 7 days","_ar":{"n":"7 أيام كلاسيكية","blurb":"أسبوع واحد؟ أهم شي في طوكيو وكيوتو وأوساكا، بدون ركض."},
 "blurb":"One week? The essentials of Tokyo, Kyoto and Osaka, without rushing.",
 "stays":[
  {"city":"tokyo","days":[
   {"t":"Asakusa & Ueno","_ar":{"t":"أساكوسا وأوينو"},"p":["Kaminarimon","Nakamise-dori","Senso-ji","Ueno Park","Ameyoko","Tokyo Skytree"]},
   {"t":"Harajuku & Shibuya","_ar":{"t":"هاراجوكو وشيبويا"},"p":["Tokyo Camii","Meiji Jingu","Takeshita-dori","Shibuya Station & Hachiko","Shibuya Sky"]},
   {"t":"Akihabara & Tokyo Tower","_ar":{"t":"أكيهابارا وبرج طوكيو"},"p":["Imperial Palace East Gardens","Pokemon Center Tokyo DX","Akihabara Electric Town","teamLab Borderless","Tokyo Tower"]}]},
  {"city":"kyoto","days":[
   {"t":"Fushimi Inari & Higashiyama","_ar":{"t":"فوشيمي إناري وهيغاشياما"},"p":["Fushimi Inari Taisha","Kiyomizu-dera","Sannenzaka & Ninenzaka","Hokan-ji Temple (Yasaka Pagoda)","Yasaka Shrine","Gion"]},
   {"t":"Arashiyama & Kinkaku-ji","_ar":{"t":"أراشياما وكينكاكوجي"},"p":["Arashiyama","Kinkaku-ji","Ryoan-ji","Nijo Castle"]}]},
  {"city":"osaka","days":[
   {"t":"Osaka Castle & Shinsekai","_ar":{"t":"قلعة أوساكا وشينسيكاي"},"p":["Osaka Castle","Shinsekai","Tsutenkaku","Harukas 300"]},
   {"t":"Shinsaibashi & Dotonbori (or Universal Studios)","_ar":{"t":"شينسايباشي ودوتونبوري (أو يونيفرسال)"},"p":["Namba Yasaka Shrine","Den Den Town","Shinsaibashi-Suji Shopping Street","Hozenji Yokocho","Dotonbori"]}]}]}
];
