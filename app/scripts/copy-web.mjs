// Copies the website into app/www, the folder Capacitor packs into the
// iPhone and Android apps. The site itself stays at the repo root and is
// never edited here: change the site, then run `npm run sync`.
import {cpSync,rmSync,mkdirSync,existsSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..","..");
const out=join(root,"app","www");
// What the page needs. Not the Worker, the Firestore rules or the notes.
const KEEP=["index.html","favicon.ico","manifest.webmanifest","css","js","data","assets"];

rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});
// The place, area and album photos stay on the website: the app loads
// each one from there when it shows (js/live.js), which keeps the APK
// ~60 MB lighter. Only the few the first-run screens show are packed, so
// they're there before any download.
const WEB_ONLY=["assets/photos","assets/hoods","assets/album"];
const PACKED=new Set(["assets/hoods/tokyo-tower.jpg","assets/hoods/shibuya.jpg","assets/hoods/tokyo-station.jpg",
  "assets/hoods/asakusa.jpg","assets/photos/senso-ji.jpg","assets/photos/shibuya-sky.jpg","assets/photos/halal-wagyu-yakiniku-panga.jpg"]);
const rel=p=>p.slice(root.length+1).split("\\").join("/");
const keep=src=>{const r=rel(src);const d=WEB_ONLY.find(w=>r===w||r.startsWith(w+"/"));return !d||r===d||PACKED.has(r)};
for(const f of KEEP){
  const from=join(root,f);
  if(!existsSync(from)){console.warn("missing:",f);continue}
  cpSync(from,join(out,f),{recursive:true,filter:keep});
}
for(const p of PACKED)if(!existsSync(join(out,p)))throw new Error("missing first-run photo: "+p);
console.log("Copied the site into app/www");
