const fs=require('fs');const path=require('path');const {PNG}=require('pngjs');
const S=require('/tmp/tsout/game/sprites.js');
const DIR=path.join(process.cwd(),'src/assets/sprites');
const sheets={};
function sheet(k){ if(!sheets[k]) sheets[k]=PNG.sync.read(fs.readFileSync(path.join(DIR,k+'.png'))); return sheets[k]; }
function montage(rows, out){ // rows: [{sheet, label, frames}]
  const SC=2,PAD=8,LBL=14; let W=0,H=0;
  for(const r of rows){const w=r.frames.reduce((a,f)=>a+f.w*SC+PAD,PAD); W=Math.max(W,w); H+=Math.max(...r.frames.map(f=>f.h))*SC+PAD+LBL;}
  const png=new PNG({width:W,height:H});
  for(let i=0;i<png.data.length;i+=4){const x=(i/4)%W,y=((i/4)/W)|0;const c=((x>>3)+(y>>3))%2?185:150;png.data[i]=c;png.data[i+1]=c;png.data[i+2]=c;png.data[i+3]=255;}
  let cy=0;
  for(const r of rows){const sh=sheet(r.sheet);const rh=Math.max(...r.frames.map(f=>f.h))*SC; let cx=PAD;
    // label bar: red ticks count = index
    for(const f of r.frames){
      for(let y=0;y<f.h*SC;y++)for(let x=0;x<f.w*SC;x++){const sxp=f.x+(x>>1),syp=f.y+(y>>1);if(sxp>=sh.width||syp>=sh.height)continue;const si=(syp*sh.width+sxp)*4;if(sh.data[si+3]<10)continue;const di=((cy+LBL+rh-f.h*SC+y)*W+cx+x)*4;png.data[di]=sh.data[si];png.data[di+1]=sh.data[si+1];png.data[di+2]=sh.data[si+2];}
      // frame outline
      for(let x=0;x<f.w*SC;x++){for(const yy of [cy+LBL+rh-f.h*SC, cy+LBL+rh-1]){const di=(yy*W+cx+x)*4;png.data[di]=255;png.data[di+1]=0;png.data[di+2]=255;}}
      cx+=f.w*SC+PAD;}
    cy+=rh+PAD+LBL;}
  fs.writeFileSync(out,PNG.sync.write(png));
}
const rows=[];
for(const k of ['red','blue','black','pink','yellow','white']){
  const a=S.buildAnims(k);
  rows.push({sheet:S.RANGER_SHEET[k],frames:[...a.idle.slice(0,1),...a.punch,...a.punch3,...a.kick,...a.hurt,...a.fall,...S.getWeaponFrames(k),...a.victory]});
}
montage(rows,'tools/verify_rangers.png');
const rows2=[];
for(const k of ['red','blue','black','pink','yellow','white']){
  const a=S.buildCivAnims(k);
  rows2.push({sheet:S.CIV_SHEET[k],frames:[...a.idle.slice(0,1),...a.walk.slice(0,3),...a.punch,...a.kick,...a.hurt,...a.fall,...a.morph]});
}
montage(rows2,'tools/verify_civs.png');
const e1=S.buildEnemyAnims('putty'),e2=S.buildEnemyAnims('skelerena'),e3=S.buildEnemyAnims('oozeman');
montage([{sheet:'putty',frames:[...e1.idle,...e1.walk.slice(0,3),...e1.punch,...e1.hurt,...e1.fall]},{sheet:'skelerena',frames:[...e2.idle,...e2.punch,...e2.fall]},{sheet:'oozeman',frames:[...e3.idle,...e3.walk,...e3.punch,...e3.hurt,...e3.fall]}],'tools/verify_enemies.png');
console.log('ok; skelerena fallback =',S.skelerenaIsFallback());
for(const k of ['red','blue','black','pink','yellow','white']){const w=S.getWeaponFrames(k);console.log(k,'weapon',w.map(f=>f.w+'x'+f.h).join(' '),'| kick',S.buildAnims(k).kick.map(f=>f.w+'x'+f.h).join(' '),'| fall',S.buildAnims(k).fall.map(f=>f.w+'x'+f.h).join(' '));}
