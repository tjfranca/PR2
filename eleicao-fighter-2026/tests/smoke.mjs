// Teste de fumaça (não faz parte do jogo): simula DOM/Canvas/Audio mínimos
// e roda a lógica do jogo por vários frames para pegar erros de runtime.

function makeCtxProxy() {
  return new Proxy({}, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return (...args) => undefined;
    },
    set(target, prop, value) { target[prop] = value; return true; }
  });
}

function makeAudioNodeProxy() {
  return new Proxy({}, {
    get(target, prop) {
      if (prop === 'connect' || prop === 'start' || prop === 'stop' || prop === 'setValueAtTime' || prop === 'exponentialRampToValueAtTime') {
        return (...args) => undefined;
      }
      if (prop === 'frequency' || prop === 'gain') return makeAudioNodeProxy();
      return (...args) => makeAudioNodeProxy();
    },
    set() { return true; }
  });
}

global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  devicePixelRatio: 1,
  innerWidth: 1280,
  innerHeight: 720,
  AudioContext: function AudioContext() {
    return {
      currentTime: 0,
      state: 'running',
      resume: () => {},
      destination: {},
      createGain: () => makeAudioNodeProxy(),
      createOscillator: () => makeAudioNodeProxy(),
      createBufferSource: () => makeAudioNodeProxy(),
      createBuffer: () => ({ getChannelData: () => new Float32Array(1024) }),
      createBiquadFilter: () => makeAudioNodeProxy()
    };
  }
};
global.document = {
  fonts: { load: async () => {} },
  createElement: () => ({ getContext: () => makeCtxProxy(), style: {} })
};
global.Image = class {
  constructor() { this.width = 100; this.height = 100; this.naturalWidth = 100; this.naturalHeight = 150; this.complete = true; }
  set src(v) { this._src = v; if (this.onload) setTimeout(this.onload, 0); }
  get src() { return this._src; }
};
global.performance = global.performance || { now: () => Date.now() };
global.requestAnimationFrame = (fn) => setTimeout(fn, 16);

const { App } = await import('../js/app.js');
const { Input, KEYMAP } = await import('../js/input.js');
const { Audio2026: Audio2026Ref } = await import('../js/audio.js');

const fakeCanvas = {
  width: 0, height: 0, style: {},
  getContext: () => makeCtxProxy()
};

const app = new App(fakeCanvas);
await new Promise((r) => setTimeout(r, 50));
console.log('cena após boot:', app.scene);
if (app.scene !== 'title') throw new Error('Esperava cena "title" após boot');

app.handleKey('Enter'); // title -> mode
console.log('cena:', app.scene, 'index', app.menu.index);
if (app.scene !== 'mode') throw new Error('Esperava cena "mode"');

app.handleKey('Enter'); // escolhe "1 JOGADOR" -> difficulty
console.log('cena:', app.scene);
if (app.scene !== 'difficulty') throw new Error('Esperava "difficulty"');

app.menu.index = 1; // normal
app.handleKey('Enter'); // -> select
console.log('cena:', app.scene);
if (app.scene !== 'select') throw new Error('Esperava "select"');

app.handleKey(KEYMAP.p1.punch); // confirma P1
await new Promise((r) => setTimeout(r, 400));
console.log('cena:', app.scene, 'p1:', app.setup.p1Id, 'p2:', app.setup.p2Id);
if (app.scene !== 'stageselect') throw new Error('Esperava "stageselect"');

app.handleKey('Enter'); // confirma cenário
console.log('cena:', app.scene, 'stage:', app.setup.stage);
if (app.scene !== 'vs') throw new Error('Esperava "vs"');

app.handleKey('Enter'); // inicia a luta
console.log('cena:', app.scene);
if (app.scene !== 'fight') throw new Error('Esperava "fight"');

// roda muitos frames simulando o loop principal, sem travar em exceções
let frames = 0;
const maxFrames = 60 * 400; // bastante tempo de jogo simulado
let matchEnded = false;
const origEnd = app.match.onMatchEnd;
app.match.onMatchEnd = (winner) => { matchEnded = true; origEnd(winner); };

while (frames < maxFrames && app.scene === 'fight') {
  app.update(1 / 60);
  app.render();
  Input.endFrame();
  frames++;
  if (frames % 600 === 0) {
    const m = app.match;
    console.log(`t=${frames / 60}s round=${m.round} state=${m.state} p1hp=${m.p1.health} p2hp=${m.p2.health} p1x=${m.p1.x.toFixed(0)} p2x=${m.p2.x.toFixed(0)} p1act=${m.p1.action} p2act=${m.p2.action}`);
  }
}

console.log('frames simulados:', frames, 'match terminou?', matchEnded, 'cena final:', app.scene);

// deixa correr mais um pouco para a tela de resultados aparecer
for (let i = 0; i < 300 && app.scene !== 'results'; i++) {
  app.update(1 / 60);
  app.render();
  Input.endFrame();
}
console.log('cena pós-match:', app.scene);
if (app.scene !== 'results') throw new Error('Esperava chegar em "results"');

// testa revanche a partir da tela de resultados
app.handleKey('Enter');
console.log('cena após revanche:', app.scene);
if (app.scene !== 'fight') throw new Error('Esperava "fight" após revanche');
app.handleKey('Escape'); // volta ao menu principal a partir da luta em pausa? -> abre pausa
console.log('cena (deve abrir pausa):', app.scene, 'pausado?', app.paused);
if (!app.paused) throw new Error('Esperava jogo pausado após ESC durante a luta');
app.menu.index = 2; // MENU PRINCIPAL
app.handleKey('KeyJ');
console.log('cena após sair pelo menu de pausa:', app.scene);
if (app.scene !== 'mode') throw new Error('Esperava voltar para "mode"');

// telas estáticas (howto / créditos / opções)
app.menu.index = 2; app.handleKey('Enter'); // COMO JOGAR
console.log('cena howto:', app.scene);
if (app.scene !== 'howto') throw new Error('Esperava "howto"');
app.render();
app.handleKey('Escape');
if (app.scene !== 'mode') throw new Error('Esperava voltar para "mode" do howto');

app.menu.index = 3; app.handleKey('Enter'); // CRÉDITOS
console.log('cena créditos:', app.scene);
if (app.scene !== 'credits') throw new Error('Esperava "credits"');
app.render();
app.handleKey('Escape');

app.menu.index = 4; app.handleKey('Enter'); // OPÇÕES
console.log('cena opções:', app.scene);
if (app.scene !== 'options') throw new Error('Esperava "options"');
const volBefore = Audio2026Ref.volume;
app.handleKey('ArrowRight');
app.render();
console.log('volume antes/depois:', volBefore, Audio2026Ref.volume);
app.handleKey('Escape');
if (app.scene !== 'mode') throw new Error('Esperava voltar para "mode" das opções');

console.log('\nOK: todas as telas e transições funcionaram sem exceções.');
if (app.match) app.match.destroy();
process.exit(0);
