// Travel buddies: the characters people pick as their picture in the app
// (the welcome screen after sign-up, and their profile). Add one with a
// line here; img is a PNG with a transparent background, roughly square.
// The pick is saved to the account as the picture's web address.
// The buddy you pick also becomes the app's guide in place of Apollo:
//   ar       the name in Arabic
//   hello    what they say instead of Apollo's "Meow!" (helloAr in Arabic)
//   kind     instead of "travel cat" (kindAr in Arabic)
const BUDDIES=[
  {k:"apollo",n:"Apollo",img:"assets/cat.png"},
  {k:"kenbo",n:"Kenbo",ar:"كينبو",img:"assets/crew/kenbo.png",hello:"Kraa!",helloAr:"كراا!",kind:"travel eagle",kindAr:"نسرك المسافر"},
  {k:"fa",n:"Fa",ar:"فا",img:"assets/crew/fa.png",hello:"Quack!",helloAr:"كواك!",kind:"travel duck",kindAr:"بطتك المسافرة"},
  {k:"lily",n:"Lily",ar:"ليلي",img:"assets/crew/lily.png",hello:"Yip!",helloAr:"ييب!",kind:"travel fennec",kindAr:"ثعلبتك المسافرة"}
];
