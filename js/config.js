/**
 * js/config.js - Game Configuration & Balance Parameters
 * 
 * Rules:
 * - Real-time 2-player game on a single screen.
 * - Peak is at the top (row 0).
 * - Bottom area is ONE SHARED deployment zone for all characters (rows 12-14, all columns).
 * - Start with 10 mana (full pool).
 * - Mana refill speed is slower (0.35/sec = ~2.8s per mana point).
 * - Higher mana costs for strategic, high-stakes decisions.
 * - Supports live customization via Settings popup and localStorage.
 */

window.GameConfig = {
  // Grid configuration
  GRID: {
    COLS: 9,
    ROWS: 15,
  },

  // Mountain & Path Configuration
  ARENA: {
    peakRow: 0,                   // Peak is at the top
    climbDirection: -1,           // Both players climb upwards (y decreases toward 0)
    deployRows: [12, 13, 14],     // One unified deployment area at the bottom for all characters
    p1DeployRows: [12, 13, 14],
    p2DeployRows: [12, 13, 14],
    p1DeployCols: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    p2DeployCols: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  },

  // Mana parameters
  MANA: {
    MAX: 10,
    START: 10,              // Start with full 10 mana
    REGEN_PER_SECOND: 0.35  // Slower refill: ~2.8s per 1 mana point
  },

  // Game loop tick rate in milliseconds
  TICK_INTERVAL_MS: 100,

  // Speed multiplier (1.0 = standard, 1.5 = faster, 0.7 = slower)
  speedMultiplier: 1.0,

  // Baseline climb speeds (in seconds per step) before speedMultiplier
  BASE_SPEEDS: {
    small: 2.2,
    sumo: 5.0,
    attack: 3.2,
    doctor: 3.8
  },

  // Default baseline settings
  getDefaultSettings() {
    return {
      startMana: 10,
      regenRate: 0.35,
      speedMultiplier: 1.0,
      cardCosts: {
        small: 3,
        sumo: 6,
        attack: 5,
        doctor: 5,
        instant: 6,
        timer: 4,
        area: 5,
        shock: 4
      }
    };
  },

  // All Cards (Hikers + Bombs)
  CARDS: [
    // Hikers (Deploy at bottom, climb up to peak)
    {
      id: "small",
      kind: "hiker",
      name: "Small Hiker",
      role: "Fast Climber",
      cost: 3,
      hp: 40,
      maxHp: 40,
      stepIntervalSec: 2.2,
      description: "Low health, fastest climber for pushing toward the peak."
    },
    {
      id: "sumo",
      kind: "hiker",
      name: "Sumo Hiker",
      role: "Tank / Blocker",
      cost: 6,
      hp: 110,
      maxHp: 110,
      stepIntervalSec: 5.0,
      isBlocker: true,
      description: "Huge 110 HP pool with Heavy Armor. Cannot be eliminated by a single bomb shot."
    },
    {
      id: "attack",
      kind: "hiker",
      name: "Attack Hiker",
      role: "Combat Striker",
      cost: 5,
      hp: 65,
      maxHp: 65,
      stepIntervalSec: 3.2,
      attackDamage: 18,
      attackCooldownSec: 1.8,
      attackRange: 1,
      description: "Attacks nearby enemy hikers with melee slashes."
    },
    {
      id: "doctor",
      kind: "hiker",
      name: "Doctor Hiker",
      role: "Support Healer",
      cost: 5,
      hp: 45,
      maxHp: 45,
      stepIntervalSec: 3.8,
      healAmount: 14,
      healCooldownSec: 2.0,
      healRange: 1,
      description: "Passively heals damaged friendly hikers nearby."
    },

    // Bombs (Strategic artillery - can reach anywhere on the mountain)
    {
      id: "instant",
      kind: "bomb",
      name: "Instant Kill",
      role: "Target Slayer",
      cost: 6,
      damage: 80,
      description: "Direct targeted strike dealing 80 damage. Instantly destroys normal hikers (Sumo survives with tank armor)."
    },
    {
      id: "timer",
      kind: "bomb",
      name: "Timer Bomb",
      role: "Area Denial",
      cost: 4,
      fuseSec: 3.5,
      blastRadius: 1,
      damage: 85,
      description: "Detonates after 3.5 seconds, dealing heavy 85 damage in 3x3."
    },
    {
      id: "area",
      kind: "bomb",
      name: "Area Bomb",
      role: "Crowd Control",
      cost: 5,
      blastRadius: 1,
      damage: 48,
      fuseSec: 0.4,
      description: "Quick explosive wave dealing 48 damage to all enemy units in 3x3."
    },
    {
      id: "shock",
      kind: "bomb",
      name: "Shock Bomb",
      role: "Disabler",
      cost: 4,
      blastRadius: 1,
      stunDurationSec: 4.0,
      fuseSec: 0.3,
      description: "Zaps enemy units, freezing and disabling them for 4.0 seconds."
    }
  ],

  /**
   * Apply a custom settings object to runtime configuration
   */
  applySettings(s, persist = true) {
    if (!s) return;

    if (typeof s.startMana === "number") {
      this.MANA.START = Math.max(1, Math.min(10, s.startMana));
    }

    if (typeof s.regenRate === "number") {
      this.MANA.REGEN_PER_SECOND = Math.max(0.1, Math.min(2.0, s.regenRate));
    }

    if (typeof s.speedMultiplier === "number") {
      this.speedMultiplier = Math.max(0.4, Math.min(3.0, s.speedMultiplier));
      // Recompute step intervals
      this.CARDS.forEach(card => {
        if (card.kind === "hiker" && this.BASE_SPEEDS[card.id]) {
          card.stepIntervalSec = parseFloat((this.BASE_SPEEDS[card.id] / this.speedMultiplier).toFixed(2));
        }
      });
    }

    if (s.cardCosts && typeof s.cardCosts === "object") {
      this.CARDS.forEach(card => {
        if (typeof s.cardCosts[card.id] === "number") {
          card.cost = Math.max(1, Math.min(10, s.cardCosts[card.id]));
        }
      });
    }

    if (persist) {
      try {
        localStorage.setItem("bod_custom_settings", JSON.stringify({
          startMana: this.MANA.START,
          regenRate: this.MANA.REGEN_PER_SECOND,
          speedMultiplier: this.speedMultiplier,
          cardCosts: this.getCurrentCosts()
        }));
      } catch (e) {}
    }
  },

  getCurrentCosts() {
    const costs = {};
    this.CARDS.forEach(c => { costs[c.id] = c.cost; });
    return costs;
  },

  loadSavedSettings() {
    try {
      const saved = localStorage.getItem("bod_custom_settings");
      if (saved) {
        this.applySettings(JSON.parse(saved), false);
      }
    } catch (e) {}
  }
};

// Auto-load saved customizations on start
window.GameConfig.loadSavedSettings();
