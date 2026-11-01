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
for(const f of KEEP){
  const from=join(root,f);
  if(!existsSync(from)){console.warn("missing:",f);continue}
  cpSync(from,join(out,f),{recursive:true});
}
console.log("Copied the site into app/www");
