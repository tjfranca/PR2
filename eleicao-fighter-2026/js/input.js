// Gerenciador de teclado para 2 jogadores + navegação em menus.

export const KEYMAP = {
  p1: {
    left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS',
    punch: 'KeyF', kick: 'KeyG', special1: 'KeyR', special2: 'KeyT', super: 'KeyY'
  },
  p2: {
    left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown',
    punch: 'KeyK', kick: 'KeyL', special1: 'KeyO', special2: 'KeyP', super: 'Semicolon'
  }
};

class InputManager {
  constructor() {
    this.down = new Set();
    this.pressedThisFrame = new Set();
    this.releasedThisFrame = new Set();
    this.menuListeners = [];
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.repeat) return;
      this.pressedThisFrame.add(e.code);
      this.down.add(e.code);
      this.menuListeners.forEach((fn) => fn(e.code));
    });
    window.addEventListener('keyup', (e) => {
      this.down.delete(e.code);
      this.releasedThisFrame.add(e.code);
    });
  }

  onMenuKey(fn) {
    this.menuListeners.push(fn);
    return () => {
      this.menuListeners = this.menuListeners.filter((f) => f !== fn);
    };
  }

  isDown(code) { return this.down.has(code); }
  wasPressed(code) { return this.pressedThisFrame.has(code); }
  wasReleased(code) { return this.releasedThisFrame.has(code); }

  endFrame() {
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
  }

  playerState(player) {
    const map = KEYMAP[player];
    return {
      left: this.isDown(map.left),
      right: this.isDown(map.right),
      up: this.isDown(map.up),
      down: this.isDown(map.down),
      punch: this.wasPressed(map.punch),
      kick: this.wasPressed(map.kick),
      special1: this.wasPressed(map.special1),
      special2: this.wasPressed(map.special2),
      super: this.wasPressed(map.super)
    };
  }
}

export const Input = new InputManager();
