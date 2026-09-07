/**
 * js/state.js - Game State Container & Data Accessors
 */

window.GameState = {
  // Game running flags
  isPaused: false,
  isGameOver: false,
  winner: null,
  matchTimeSec: 0,
  
  // Players mana: [P1, P2]
  mana: [
    window.GameConfig.MANA.START,
    window.GameConfig.MANA.START
  ],

  // Selected card for placement: { player: 1|2, card: CardObject }
  selectedCard: null,

  // Active units on the mountain: Array of Unit
  units: [],

  // Active bombs ticking or detonating: Array of Bomb
  bombs: [],

  // AI Opponent disabled by default (game is tested with 2 human players on one screen)
  aiEnabled: false,

  // Unique ID generator for entities
  _nextEntityId: 1,
  getNextId() {
    return this._nextEntityId++;
  },

  /**
   * Reset game to fresh initial state
   */
  reset() {
    this.isPaused = false;
    this.isGameOver = false;
    this.winner = null;
    this.matchTimeSec = 0;
    this.mana = [
      window.GameConfig.MANA.START,
      window.GameConfig.MANA.START
    ];
    this.selectedCard = null;
    this.units = [];
    this.bombs = [];
  },

  /**
   * Find unit occupying cell (x, y)
   */
  getUnitAt(x, y) {
    return this.units.find(u => u.x === x && u.y === y && u.hp > 0);
  },

  /**
   * Find all units in a given radius around (x, y)
   */
  getUnitsInRadius(x, y, radius) {
    return this.units.filter(u => {
      if (u.hp <= 0) return false;
      const dx = Math.abs(u.x - x);
      const dy = Math.abs(u.y - y);
      return dx <= radius && dy <= radius;
    });
  },

  /**
   * Find bomb on cell (x, y)
   */
  getBombAt(x, y) {
    return this.bombs.find(b => b.x === x && b.y === y);
  },

  /**
   * Check if a cell is blocked for hiker movement
   */
  isCellBlocked(x, y, hikerPlayer) {
    const occupant = this.getUnitAt(x, y);
    if (!occupant) return false;

    // Friendly units cannot walk onto friendly units (stacking prevention)
    if (occupant.player === hikerPlayer) return true;

    // Sumo Hikers block enemy movement completely
    if (occupant.card.isBlocker) return true;

    return false;
  }
};
