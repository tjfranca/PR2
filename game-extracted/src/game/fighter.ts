/* Lutador (jogador ou inimigo): estado, física, animações e ataques. */
import { GROUND_TOP, MORPH_ARM_UP, SCALE, ZPX } from "./consts";
import type { AnimSet, CharKey, EnemyKind, Frame, WeaponFx } from "./sprites";

/* ---------------- fighter ---------------- */

type State =
  | "idle"
  | "walk"
  | "jump"
  | "attack"
  | "special"
  | "hurt"
  | "fall"
  | "down"
  | "getup"
  | "dead"
  | "victory"
  | "morph";

interface Anim {
  frames: Frame[];
  fps: number;
  loop: boolean;
}

export interface AttackSpec {
  anim: Anim;
  hitFrame: number;
  dmg: number;
  range: number;
  knockdown: boolean;
  aoe?: boolean;
  lungeSpeed?: number;
  weaponFx?: WeaponFx;
}

export class Fighter {
  x = 0;
  z = 0.5;
  h = 0;
  vy = 0;
  vx = 0;
  mvx = 0; // movement velocity (momentum on ooze)
  mvz = 0;
  facing = 1;
  state: State = "idle";
  t = 0;
  hp: number;
  maxHp: number;
  anims: AnimSet;
  sheet: string;
  speed: number;
  isPlayer: boolean;
  kind: EnemyKind | "player" = "player";
  attack: AttackSpec | null = null;
  didHit = false;
  downT = 0;
  invuln = 0;
  flicker = 0;
  hitFlash = 0;
  dead = false;
  attackCd = 0;
  removeT = -1;
  blockT = 0;
  blockDir = 1;
  onOoze = false;
  // por jogador: identidade e progressão
  charKey: CharKey | null = null;
  pIdx = 0;
  morphed = false;
  morphMeter = 0;
  specialCd = 0;
  comboStep = 0;
  comboTimer = 0;
  // chefe final
  isBoss = false;
  drawScale = SCALE;
  slamPending = false;

  constructor(
    sheet: string,
    anims: AnimSet,
    hp: number,
    speed: number,
    isPlayer: boolean,
    extra?: Partial<Fighter>,
  ) {
    this.sheet = sheet;
    this.anims = anims;
    this.hp = hp;
    this.maxHp = hp;
    this.speed = speed;
    this.isPlayer = isPlayer;
    if (extra) Object.assign(this, extra);
  }

  setState(s: State) {
    if (this.state === s) return;
    this.state = s;
    this.t = 0;
    this.didHit = false;
  }

  knocked(): boolean {
    return ["hurt", "fall", "down", "getup", "dead"].includes(this.state);
  }

  currentAnim(): Anim {
    const a = this.anims;
    switch (this.state) {
      case "walk":
        return { frames: a.walk, fps: 7, loop: true };
      case "jump":
        return { frames: this.vy < 0 ? a.jumpUp : a.jumpDown, fps: 5, loop: true };
      case "attack":
      case "special":
        return this.attack ? this.attack.anim : { frames: a.idle, fps: 5, loop: true };
      case "hurt":
        return { frames: a.hurt, fps: 6, loop: false };
      case "fall":
        return { frames: a.fall, fps: 6, loop: false };
      case "down":
      case "dead":
        return { frames: a.down, fps: 3, loop: false };
      case "getup":
        return { frames: [...a.fall].reverse(), fps: 9, loop: false };
      case "victory":
        return { frames: a.victory, fps: 3, loop: true };
      case "morph":
        // 2 civilian frames: morpher at the chest → arm to the sky (switch at MORPH_ARM_UP)
        return { frames: a.morph, fps: 1 / MORPH_ARM_UP, loop: false };
      default:
        return { frames: a.idle, fps: 4, loop: true };
    }
  }

  frameIndex(): number {
    const an = this.currentAnim();
    const i = Math.floor(this.t * an.fps);
    return an.loop ? i % an.frames.length : Math.min(i, an.frames.length - 1);
  }

  animDone(): boolean {
    const an = this.currentAnim();
    return !an.loop && this.t * an.fps >= an.frames.length;
  }

  feetY(): number {
    return GROUND_TOP + this.z * ZPX;
  }
}

