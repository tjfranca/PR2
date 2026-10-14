// Teste de fumaça do modo 2 jogadores + bloqueio + super (sem navegador real).

function makeCtxProxy() {
  return new Proxy({}, {
    get(target, prop) { return prop in target ? target[prop] : (() => undefined); },
    set(target, prop, value) { target[prop] = value; return true; }
  });
}
function makeAudioNodeProxy() {
  return new Proxy({}, {
    get(target, prop) {
      if (['connect', 'start', 'stop', 'setValueAtTime', 'exponentialRampToValueAtTime'].includes(prop)) return () => undefined;
      if (prop === 'frequency' || prop === 'gain') return makeAudioNodeProxy();
      return () => makeAudioNodeProxy();
    },
    set() { return true; }
  });
}
global.window = {
  addEventListener: () => {}, removeEventListener: () => {},
  devicePixelRatio: 1, innerWidth: 1280, innerHeight: 720,
  AudioContext: function () {
    return {
      currentTime: 0, state: 'running', resume: () => {}, destination: {},
      createGain: () => makeAudioNodeProxy(), createOscillator: () => makeAudioNodeProxy(),
      createBufferSource: () => makeAudioNodeProxy(),
      createBuffer: () => ({ getChannelData: () => new Float32Array(1024) }),
      createBiquadFilter: () => makeAudioNodeProxy()
    };
  }
};
global.document = { fonts: { load: async () => {} }, createElement: () => ({ getContext: () => makeCtxProxy(), style: {} }) };
global.Image = class {
  constructor() { this.width = 100; this.height = 100; this.complete = true; }
  set src(v) { this._src = v; if (this.onload) setTimeout(this.onload, 0); }
  get src() { return this._src; }
};
global.performance = global.performance || { now: () => Date.now() };

const { App } = await import('../js/app.js');
const { Input, KEYMAP } = await import('../js/input.js');

const app = new App({ width: 0, height: 0, style: {}, getContext: () => makeCtxProxy() });
await new Promise((r) => setTimeout(r, 30));

app.handleKey('Enter'); // title -> mode
app.menu.index = 1; app.handleKey('Enter'); // 2 jogadores -> select
if (app.scene !== 'select') throw new Error('esperava select, veio ' + app.scene);

app.handleKey(KEYMAP.p1.punch);
app.handleKey(KEYMAP.p2.punch);
await new Promise((r) => setTimeout(r, 400));
if (app.scene !== 'stageselect') throw new Error('esperava stageselect, veio ' + app.scene);
console.log('P1:', app.setup.p1Id, 'P2:', app.setup.p2Id);

app.handleKey('Enter'); // confirma cenário
app.handleKey('Enter'); // inicia luta
if (app.scene !== 'fight') throw new Error('esperava fight');

// Simula P1 segurando "longe" do P2 (bloqueio) e P2 atacando sem parar.
const m = app.match;
let blockedAtLeastOnce = false;
let initialP1HP = m.p1.health;
for (let i = 0; i < 60 * 8; i++) {
  // P1 sempre tenta recuar/bloquear
  Input.down.clear();
  Input.down.add(m.p1.x < m.p2.x ? KEYMAP.p1.left : KEYMAP.p1.right);
  // P2 é controlado manualmente: anda até ficar perto e ataca
  const dist = Math.abs(m.p2.x - m.p1.x);
  if (dist > 34) {
    Input.down.add(m.p2.x < m.p1.x ? KEYMAP.p2.right : KEYMAP.p2.left);
  } else {
    Input.pressedThisFrame.add(KEYMAP.p2.kick);
  }
  app.update(1 / 60);
  app.render();
  if (m.p1.action === 'block') blockedAtLeastOnce = true;
  Input.endFrame();
}
console.log('P1 bloqueou alguma vez?', blockedAtLeastOnce, 'HP inicial:', initialP1HP, 'HP final:', m.p1.health.toFixed(1));
if (!blockedAtLeastOnce) throw new Error('P1 nunca entrou em estado de bloqueio');
if (m.p1.health >= initialP1HP) throw new Error('P1 deveria ter tomado ao menos dano de bloqueio (chip damage)');
if (m.p1.health < 60) throw new Error('bloqueio não reduziu dano o suficiente (esperado dano baixo de chip)');

// Testa o super: enche o medidor manualmente e aciona (tenta por várias
// janelas de frame até o P2 estar livre para agir, como num jogo real).
m.p2.meter = 100;
m.p1.x = m.p2.x - 20;
const hpBefore = m.p1.health;
let superTriggered = false;
Input.down.clear();
for (let i = 0; i < 120 && !superTriggered; i++) {
  Input.pressedThisFrame.add(KEYMAP.p2.super);
  app.update(1 / 60);
  app.render();
  if (m.p2.action === 'super') superTriggered = true;
  Input.endFrame();
}
for (let i = 0; i < 60; i++) { app.update(1 / 60); app.render(); Input.endFrame(); }
console.log('Super disparou?', superTriggered, 'Medidor P2 final:', m.p2.meter, 'HP P1 antes/depois:', hpBefore.toFixed(1), m.p1.health.toFixed(1));
if (!superTriggered) throw new Error('o super nunca chegou a ser executado');
if (m.p2.meter !== 0) throw new Error('o medidor do super deveria zerar após o uso');
if (m.p1.health >= hpBefore) throw new Error('o super deveria causar dano ao P1');

console.log('\nOK: modo 2 jogadores, bloqueio e super funcionando sem exceções.');
process.exit(0);
