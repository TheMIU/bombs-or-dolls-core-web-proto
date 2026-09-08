/**
 * js/bombs.js - Bomb Mechanics, Fuse Timing, and Detonation Effects
 * 
 * Implements the 4 bomb cards:
 * 1. Instant Kill: Eliminates single target enemy hiker
 * 2. Timer Bomb: 3-second delayed blast with 80 area damage
 * 3. Area Bomb: Quick 45 damage blast over 3x3 area
 * 4. Shock Bomb: Stuns/disables enemy hikers in 3x3 area for 3.5s
 */

window.BombSystem = {
  /**
   * Deploy a bomb at (x, y)
   */
  spawnBomb(player, card, x, y) {
    const fuseTime = typeof card.fuseSec === "number" ? card.fuseSec : 0;
    return {
      id: window.GameState.getNextId(),
      player: player,
      card: card,
      x: x,
      y: y,
      fuseTimer: fuseTime,
      totalFuse: fuseTime
    };
  },

  /**
   * Real-time tick update for active bombs
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    const state = window.GameState;
    const toRemove = [];

    for (let i = 0; i < state.bombs.length; i++) {
      const bomb = state.bombs[i];
      bomb.fuseTimer -= dt;

      if (bomb.fuseTimer <= 0) {
        this.detonate(bomb);
        toRemove.push(bomb.id);
      }
    }

    if (toRemove.length > 0) {
      state.bombs = state.bombs.filter(b => !toRemove.includes(b.id));
    }
  },

  /**
   * Execute bomb detonation effect
   */
  detonate(bomb) {
    const state = window.GameState;
    const cardId = bomb.card.id;

    // Visual explosion effect
    window.ArenaRenderer.spawnExplosion(bomb.x, bomb.y, cardId === "shock" ? "#38bdf8" : "#f97316");

    if (cardId === "instant") {
      // Direct high-damage strike on target cell
      const target = state.getUnitAt(bomb.x, bomb.y);
      if (target && target.player !== bomb.player) {
        const dmg = bomb.card.damage || 80;
        if (target.card.id === "sumo") {
          // Sumo Tank Armor: cannot be killed by a single bomb shot!
          const actualDmg = Math.min(dmg, Math.max(1, target.hp - 20));
          target.hp -= actualDmg;
          window.ArenaRenderer.spawnCombatText(bomb.x, bomb.y, `-${actualDmg} (SUMO TANK!)`, "floating-dmg");
          window.ArenaRenderer.shakeCell(bomb.x, bomb.y);
        } else {
          // Destroys normal hikers (Small, Doctor, Attack)
          target.hp = 0;
          window.ArenaRenderer.spawnCombatText(bomb.x, bomb.y, "KILL! 💀", "floating-dmg");
          window.ArenaRenderer.shakeCell(bomb.x, bomb.y);
        }
      } else {
        window.ArenaRenderer.spawnCombatText(bomb.x, bomb.y, "MISS", "floating-dmg");
      }
    } 
    else if (cardId === "timer") {
      // High damage 3x3 blast
      const targets = state.getUnitsInRadius(bomb.x, bomb.y, bomb.card.blastRadius || 1)
        .filter(u => u.player !== bomb.player);

      targets.forEach(u => {
        let dmg = bomb.card.damage;
        if (u.card.id === "sumo" && u.hp === u.maxHp && dmg >= u.hp) {
          dmg = u.hp - 20; // Sumo survives one-shot bomb
        }
        u.hp -= dmg;
        const msg = (u.card.id === "sumo" && u.hp > 0) ? `-${dmg} (SUMO TANK!)` : `-${dmg}`;
        window.ArenaRenderer.spawnCombatText(u.x, u.y, msg, "floating-dmg");
        window.ArenaRenderer.shakeCell(u.x, u.y);
      });
      window.ArenaRenderer.spawnCombatText(bomb.x, bomb.y, "BOOM! 💥", "floating-dmg");
    }
    else if (cardId === "area") {
      // Crowd control area blast
      const targets = state.getUnitsInRadius(bomb.x, bomb.y, bomb.card.blastRadius || 1)
        .filter(u => u.player !== bomb.player);

      targets.forEach(u => {
        let dmg = bomb.card.damage;
        if (u.card.id === "sumo" && u.hp === u.maxHp && dmg >= u.hp) {
          dmg = u.hp - 20;
        }
        u.hp -= dmg;
        const msg = (u.card.id === "sumo" && u.hp > 0) ? `-${dmg} (SUMO TANK!)` : `-${dmg}`;
        window.ArenaRenderer.spawnCombatText(u.x, u.y, msg, "floating-dmg");
      });
    }
    else if (cardId === "shock") {
      // Freeze & disable enemy units in radius
      const targets = state.getUnitsInRadius(bomb.x, bomb.y, bomb.card.blastRadius || 1)
        .filter(u => u.player !== bomb.player);

      targets.forEach(u => {
        u.stunTimer = Math.max(u.stunTimer, bomb.card.stunDurationSec);
        window.ArenaRenderer.spawnCombatText(u.x, u.y, "⚡ STUNNED", "floating-stun");
      });
    }
  }
};
