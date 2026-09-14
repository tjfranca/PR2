/* Build a minimal frames.json with 1-frame animations for placeholder mode.
   Each ranger has 16 frames (idle/walk/jump/punch/punch2/punch3/kick/kick2/hurt/fall/down/special/victory/morph)
   plus 1 special frame, all at offset (0,0) with size 64x128 (rangers), 44x96 (civs), etc. */
const fs = require('fs');
const path = require('path');

const data = {};
const rng = (k, w, h) => {
  data[k] = { w, h, rows: [Array.from({length: 16}, () => ({ x: 0, y: 0, w, h }))] };
};
const civ = (k, w, h) => {
  data[k] = { w, h, rows: [Array.from({length: 16}, () => ({ x: 0, y: 0, w, h }))] };
};
rng('gred', 56, 110); rng('gblue', 56, 110); rng('gblack', 56, 110);
rng('gpink', 56, 110); rng('gyellow', 56, 110); rng('gwhite', 56, 110);
civ('civ_rocky', 44, 96); civ('civ_adam', 44, 96); civ('civ_billy', 44, 96);
civ('civ_aisha', 44, 96); civ('civ_kim', 44, 96); civ('civ_tommy', 44, 96);
data.putty = { w: 48, h: 90, rows: [Array.from({length: 14}, () => ({ x: 0, y: 0, w: 48, h: 90 }))] };
data.skelerena = { w: 80, h: 90, rows: [Array.from({length: 14}, () => ({ x: 0, y: 0, w: 80, h: 90 }))] };
data.oozeman = { w: 100, h: 90, rows: [Array.from({length: 14}, () => ({ x: 0, y: 0, w: 100, h: 90 }))] };
fs.mkdirSync(path.join(__dirname, '..', 'src', 'game'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '..', 'src', 'game', 'frames.json'), JSON.stringify(data));
console.log('frames.json (placeholder) written');
