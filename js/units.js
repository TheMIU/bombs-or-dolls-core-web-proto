/**
 * js/units.js - Hiker Unit Creation, Movement, Combat, and Healing Logic
 * 
 * Rules:
 * - Peak is at the top (Row 0).
 * - Both Player 1 and Player 2 hikers climb in the SAME direction: BOTTOM TO TOP (y decreases).
 * - Attack Hikers attack adjacent enemies.
 * - Doctor Hikers heal wounded allies.
 * - Sumo Hikers block enemy climbers from passing through or overtaking.
 */

window.UnitSystem = {
  /**
   * Spawn a new hiker unit instance
   */
  spawnHiker(player, card, x, y) {
    return {
      id: window.GameState.getNextId(),
      player: player,
      card: card,
      x: x,
      y: y,
      hp: card.hp,
      maxHp: card.maxHp,
      stepTimer: 0,
      stunTimer: 0,
      actionCooldown: 0,
      justMoved: false
    };
  },

  /**
   * Main real-time update for all active hikers
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    const state = window.GameState;
    const peakRow = window.GameConfig.ARENA.peakRow;

    for (let i = 0; i < state.units.length; i++) {
      const u = state.units[i];
      if (u.hp <= 0) continue;

      // 1. Handle Stun / Electric Shock
      if (u.stunTimer > 0) {
        u.stunTimer -= dt;
        continue; // Stunned units cannot act or move
      }

      // 2. Unit Role Actions (Attack / Heal)
      this.handleRoleAbilities(u, dt);

      // 3. Movement / Climbing Step (Bottom to Top)
      this.handleMovement(u, dt);

      // 4. Check Summit Flag Capture (Reached Row 0)
      if (u.y <= peakRow) {
        window.GameSystem.claimSummitFlag(u.player, u);
        u.hp = 0; // Climber successfully reaches top and finishes
        window.ArenaRenderer.spawnCombatText(u.x, peakRow, "SUMMIT! 🚩", u.player === 1 ? "floating-stun" : "floating-dmg");
        window.ArenaRenderer.spawnExplosion(u.x, peakRow, u.player === 1 ? "#38bdf8" : "#f43f5e");
      }
    }

    // Clean up defeated units
    state.units = state.units.filter(u => u.hp > 0);
  },

  /**
   * Execute combat and support abilities
   */
  handleRoleAbilities(unit, dt) {
    if (unit.actionCooldown > 0) {
      unit.actionCooldown -= dt;
    }

    // Combat: Attack Hiker
    if (unit.card.attackDamage && unit.actionCooldown <= 0) {
      const enemies = window.GameState.getUnitsInRadius(unit.x, unit.y, unit.card.attackRange)
        .filter(target => target.player !== unit.player);

      if (enemies.length > 0) {
        // Attack the lowest HP target
        enemies.sort((a, b) => a.hp - b.hp);
        const target = enemies[0];
        
        target.hp -= unit.card.attackDamage;
        unit.actionCooldown = unit.card.attackCooldownSec;

        // Visual feedback
        window.ArenaRenderer.spawnCombatText(target.x, target.y, `-${unit.card.attackDamage}`, "floating-dmg");
        window.ArenaRenderer.shakeCell(target.x, target.y);
      }
    }

    // Support: Doctor Hiker
    if (unit.card.healAmount && unit.actionCooldown <= 0) {
      const woundedAllies = window.GameState.getUnitsInRadius(unit.x, unit.y, unit.card.healRange)
        .filter(ally => ally.player === unit.player && ally.hp < ally.maxHp);

      if (woundedAllies.length > 0) {
        // Heal the lowest HP ally
        woundedAllies.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
        const target = woundedAllies[0];

        const prevHp = target.hp;
        target.hp = Math.min(target.maxHp, target.hp + unit.card.healAmount);
        const healed = target.hp - prevHp;
        unit.actionCooldown = unit.card.healCooldownSec;

        if (healed > 0) {
          window.ArenaRenderer.spawnCombatText(target.x, target.y, `+${healed}`, "floating-heal");
        }
      }
    }
  },

  /**
   * Handle vertical climbing progression towards the peak at the top (Row 0)
   */
  handleMovement(unit, dt) {
    unit.stepTimer += dt;
    if (unit.stepTimer < unit.card.stepIntervalSec) {
      return;
    }

    // Both players climb upwards (y decreases toward 0)
    const climbDir = window.GameConfig.ARENA.climbDirection;
    const targetY = unit.y + climbDir;

    // Check boundary
    if (targetY < 0) {
      return;
    }

    // Check if cell directly ahead is occupied
    const targetOccupant = window.GameState.getUnitAt(unit.x, targetY);

    if (targetOccupant) {
      // Friendly unit ahead -> try to steer to an adjacent lane or wait
      if (targetOccupant.player === unit.player) {
        const sideDodge = this.trySideDodge(unit, targetY);
        if (sideDodge) {
          unit.x = sideDodge.x;
          unit.y = sideDodge.y;
          unit.stepTimer = 0;
        }
        return;
      }

      // Enemy Sumo Hiker ahead -> completely blocked from advancing!
      if (targetOccupant.card.isBlocker) {
        window.ArenaRenderer.spawnCombatText(unit.x, unit.y, "BLOCKED!", "floating-dmg");
        unit.stepTimer = unit.card.stepIntervalSec * 0.5; // Stalled
        return;
      }

      // Enemy non-sumo unit ahead -> contest lane with bump clash
      targetOccupant.hp -= 10;
      unit.hp -= 10;
      window.ArenaRenderer.spawnCombatText(targetOccupant.x, targetOccupant.y, "-10", "floating-dmg");
      window.ArenaRenderer.spawnCombatText(unit.x, unit.y, "-10", "floating-dmg");
      window.ArenaRenderer.shakeCell(targetOccupant.x, targetOccupant.y);
      unit.stepTimer = 0;
      return;
    }

    // Path ahead is clear: step upwards!
    unit.y = targetY;
    unit.stepTimer = 0;
  },

  /**
   * Helper to dodge around a friendly unit or obstacle into an adjacent column
   */
  trySideDodge(unit, targetY) {
    const lanes = [unit.x - 1, unit.x + 1].filter(x => x >= 0 && x < window.GameConfig.GRID.COLS);
    if (Math.random() > 0.5) lanes.reverse();

    for (let nx of lanes) {
      if (!window.GameState.getUnitAt(nx, targetY) && !window.GameState.getUnitAt(nx, unit.y)) {
        return { x: nx, y: targetY };
      }
    }
    return null;
  }
};
