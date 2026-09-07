/**
 * js/config.js - Game Configuration & Balance Parameters
 * 
 * Rules:
 * - Real-time 2-player game on a single screen.
 * - Peak is at the top (row 0).
 * - Both players deploy at the bottom (rows 12-14) and climb UP (bottom to top).
 * - Player 1 deploys on the left base camp (cols 0-4).
 * - Player 2 deploys on the right base camp (cols 4-8).
 */

window.GameConfig = {
  // Grid configuration
  GRID: {
    COLS: 9,
    ROWS: 15,
  },

  // Mountain & Path Configuration
  ARENA: {
    peakRow: 0,                   // Peak is always at the top
    climbDirection: -1,           // Both players climb upwards (y decreases toward 0)
    p1DeployRows: [12, 13, 14],   // Bottom 3 rows
    p2DeployRows: [12, 13, 14],   // Bottom 3 rows
    p1DeployCols: [0, 1, 2, 3, 4], // Left base camp (P1)
    p2DeployCols: [4, 5, 6, 7, 8], // Right base camp (P2)
  },

  // Mana parameters
  MANA: {
    MAX: 10,
    START: 4,
    REGEN_PER_SECOND: 0.8 // ~1 mana every 1.25 seconds
  },

  // Game loop tick rate in milliseconds
  TICK_INTERVAL_MS: 100,

  // All Cards (Hikers + Bombs)
  // To add a new card, simply add an entry here and define its behavior in units.js or bombs.js
  CARDS: [
    // Hikers (Deploy at bottom, climb up to peak)
    {
      id: "small",
      kind: "hiker",
      name: "Small Hiker",
      role: "Fast Climber",
      icon: "🏃",
      cost: 2,
      hp: 40,
      maxHp: 40,
      stepIntervalSec: 1.1, // Moves 1 step every 1.1s
      description: "Low health, very fast climber for rushing the peak."
    },
    {
      id: "sumo",
      kind: "hiker",
      name: "Sumo Hiker",
      role: "Tank / Blocker",
      icon: "🗿",
      cost: 3,
      hp: 110,
      maxHp: 110,
      stepIntervalSec: 2.8, // Moves slowly
      isBlocker: true,      // Blocks enemy climbers from overtaking or passing through
      description: "Huge health pool. Blocks enemy hikers from passing."
    },
    {
      id: "attack",
      kind: "hiker",
      name: "Attack Hiker",
      role: "Combat Striker",
      icon: "⚔️",
      cost: 3,
      hp: 65,
      maxHp: 65,
      stepIntervalSec: 1.8,
      attackDamage: 16,
      attackCooldownSec: 1.2,
      attackRange: 1, // Adjacent cells (3x3 area)
      description: "Attacks nearby enemy hikers with melee slashes."
    },
    {
      id: "doctor",
      kind: "hiker",
      name: "Doctor Hiker",
      role: "Support Healer",
      icon: "❤️",
      cost: 3,
      hp: 45,
      maxHp: 45,
      stepIntervalSec: 2.3,
      healAmount: 12,
      healCooldownSec: 1.5,
      healRange: 1, // Adjacent friendly units
      description: "Passively heals damaged friendly hikers nearby."
    },

    // Bombs (Strategic artillery - can reach anywhere on the mountain)
    {
      id: "instant",
      kind: "bomb",
      name: "Instant Kill",
      role: "Target Slayer",
      icon: "💣",
      cost: 3,
      description: "Instantly destroys an enemy hiker at the targeted cell."
    },
    {
      id: "timer",
      kind: "bomb",
      name: "Timer Bomb",
      role: "Area Denial",
      icon: "⏱️",
      cost: 2,
      fuseSec: 3.0,     // 3 seconds before detonation
      blastRadius: 1,   // 3x3 cells
      damage: 80,
      description: "Detonates after 3 seconds, dealing heavy 80 damage in a 3x3 area."
    },
    {
      id: "area",
      kind: "bomb",
      name: "Area Bomb",
      role: "Crowd Control",
      icon: "💥",
      cost: 3,
      blastRadius: 1,   // 3x3 cells
      damage: 45,
      fuseSec: 0.4,     // Quick blast
      description: "Quick explosive wave dealing 45 damage to all enemy units in 3x3."
    },
    {
      id: "shock",
      kind: "bomb",
      name: "Shock Bomb",
      role: "Disabler",
      icon: "⚡",
      cost: 2,
      blastRadius: 1,   // 3x3 cells
      stunDurationSec: 3.5,
      fuseSec: 0.3,
      description: "Zaps enemy units, freezing and disabling them for 3.5 seconds."
    }
  ]
};
