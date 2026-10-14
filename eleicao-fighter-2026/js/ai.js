// IA simples por distância/estado, com 3 níveis de dificuldade.

const PROFILES = {
  facil: { reaction: 0.45, aggression: 0.35, specialChance: 0.15, blockChance: 0.25, superChance: 0.3 },
  normal: { reaction: 0.28, aggression: 0.55, specialChance: 0.3, blockChance: 0.4, superChance: 0.55 },
  dificil: { reaction: 0.14, aggression: 0.78, specialChance: 0.45, blockChance: 0.6, superChance: 0.85 }
};

export function createAIController(difficulty = 'normal') {
  const profile = PROFILES[difficulty] || PROFILES.normal;
  let timer = 0;
  let decision = { left: false, right: false, up: false, down: false, punch: false, kick: false, special1: false, special2: false, super: false };

  return function aiStep(dt, self, opp) {
    timer -= dt;
    const dist = Math.abs(self.x - opp.x);
    const canAct = self.canAct;

    if (timer <= 0) {
      timer = profile.reaction * (0.6 + Math.random() * 0.8);
      decision = { left: false, right: false, up: false, down: false, punch: false, kick: false, special1: false, special2: false, super: false };

      if (!canAct) return decision;

      // chance de bloquear quando perto e o oponente está atacando
      if (dist < 42 && opp.isAttacking && Math.random() < profile.blockChance) {
        decision[self.x < opp.x ? 'left' : 'right'] = true;
        return decision;
      }

      if (self.meter >= 100 && Math.random() < profile.superChance && dist < 70) {
        decision.super = true;
        return decision;
      }

      if (dist > 90) {
        // aproxima, às vezes pula, às vezes especial à distância
        if (Math.random() < profile.specialChance && self.cooldowns.special1 <= 0) {
          decision.special1 = true;
        } else if (Math.random() < 0.12) {
          decision.up = true;
        } else {
          decision[self.x < opp.x ? 'right' : 'left'] = true;
        }
      } else if (dist > 36) {
        if (Math.random() < profile.aggression) {
          decision[self.x < opp.x ? 'right' : 'left'] = true;
        } else if (Math.random() < profile.specialChance && self.cooldowns.special2 <= 0) {
          decision.special2 = true;
        } else {
          decision[self.x < opp.x ? 'left' : 'right'] = true;
        }
      } else {
        const r = Math.random();
        if (r < profile.aggression * 0.5) decision.punch = true;
        else if (r < profile.aggression * 0.8) decision.kick = true;
        else if (r < profile.aggression * 0.95 && self.cooldowns.special2 <= 0) decision.special2 = true;
        else decision[self.x < opp.x ? 'left' : 'right'] = true;
      }
    }
    return decision;
  };
}
