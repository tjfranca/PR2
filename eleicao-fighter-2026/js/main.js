import { App } from './app.js';
import { Input } from './input.js';
import { Audio2026 } from './audio.js';

const canvas = document.getElementById('game');
const app = new App(canvas);

Input.onMenuKey((code) => app.handleKey(code));

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  app.update(dt);
  app.render();
  Input.endFrame();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

window.addEventListener('pointerdown', () => Audio2026.resume());
window.addEventListener('keydown', () => Audio2026.resume(), { once: true });

