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

  // All Cards (Hikers + Bombs)
  // Higher costs & slower climb speeds for deep tactical management
  CARDS: [
    // Hikers (Deploy at bottom, climb up to peak)
    {
      id: "small",
      kind: "hiker",
      name: "Small Hiker",
      role: "Fast Climber",
      cost: 3,              // Cost: 3
      hp: 40,
      maxHp: 40,
      stepIntervalSec: 2.2, // Slower climb: 1 step every 2.2s
      description: "Low health, fastest climber for pushing toward the peak."
    },
    {
      id: "sumo",
      kind: "hiker",
      name: "Sumo Hiker",
      role: "Tank / Blocker",
      cost: 6,              // Heavy investment: 6
      hp: 110,
      maxHp: 110,
      stepIntervalSec: 5.0, // Heavy slow mover: 1 step every 5.0s
      isBlocker: true,      // Blocks enemy climbers from overtaking or passing through
      description: "Huge health pool. Blocks enemy hikers from passing."
    },
    {
      id: "attack",
      kind: "hiker",
      name: "Attack Hiker",
      role: "Combat Striker",
      cost: 5,              // Cost: 5
      hp: 65,
      maxHp: 65,
      stepIntervalSec: 3.2, // Steady combat climber: 1 step every 3.2s
      attackDamage: 18,
      attackCooldownSec: 1.8,
      attackRange: 1, // Adjacent cells (3x3 area)
      description: "Attacks nearby enemy hikers with melee slashes."
    },
    {
      id: "doctor",
      kind: "hiker",
      name: "Doctor Hiker",
      role: "Support Healer",
      cost: 5,              // Cost: 5
      hp: 45,
      maxHp: 45,
      stepIntervalSec: 3.8, // Support speed: 1 step every 3.8s
      healAmount: 14,
      healCooldownSec: 2.0,
      healRange: 1, // Adjacent friendly units
      description: "Passively heals damaged friendly hikers nearby."
    },

    // Bombs (Strategic artillery - can reach anywhere on the mountain)
    {
      id: "instant",
      kind: "bomb",
      name: "Instant Kill",
      role: "Target Slayer",
      cost: 6,              // Devastating single kill: 6
      description: "Instantly destroys an enemy hiker at the targeted cell."
    },
    {
      id: "timer",
      kind: "bomb",
      name: "Timer Bomb",
      role: "Area Denial",
      cost: 4,              // Cost: 4
      fuseSec: 3.5,         // 3.5 seconds before detonation
      blastRadius: 1,       // 3x3 cells
      damage: 85,
      description: "Detonates after 3.5 seconds, dealing heavy 85 damage in 3x3."
    },
    {
      id: "area",
      kind: "bomb",
      name: "Area Bomb",
      role: "Crowd Control",
      cost: 5,              // Cost: 5
      blastRadius: 1,       // 3x3 cells
      damage: 48,
      fuseSec: 0.4,         // Quick blast
      description: "Quick explosive wave dealing 48 damage to all enemy units in 3x3."
    },
    {
      id: "shock",
      kind: "bomb",
      name: "Shock Bomb",
      role: "Disabler",
      cost: 4,              // Cost: 4
      blastRadius: 1,       // 3x3 cells
      stunDurationSec: 4.0,
      fuseSec: 0.3,
      description: "Zaps enemy units, freezing and disabling them for 4.0 seconds."
    }
  ]
};
