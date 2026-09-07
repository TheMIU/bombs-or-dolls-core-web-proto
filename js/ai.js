/**
 * js/ai.js - Optional AI Opponent Logic for Solo Testing
 * 
 * If enabled via the Bot toggle:
 * - Deploys P2 hikers in the right-side base camp (rows 12-14, cols 4-8) climbing UP
 * - Drops tactical bombs to counter P1 hikers getting close to Row 0 Peak
 */

window.AISystem = {
  actionCooldown: 0,

  update(dt) {
    if (!window.GameState.aiEnabled || window.GameState.isGameOver || window.GameState.isPaused) {
      return;
    }

    this.actionCooldown -= dt;
    if (this.actionCooldown > 0) return;

    const p2Mana = window.GameState.mana[1];
    if (p2Mana < 2) return;

    const arena = window.GameConfig.ARENA;
    const p1Units = window.GameState.units.filter(u => u.player === 1);
    const p2Units = window.GameState.units.filter(u => u.player === 2);

    // 1. TACTICAL DEFENSE: Is any P1 hiker dangerously close to row 0 peak?
    const dangerousEnemy = p1Units.find(u => u.y <= 4); // Near the summit!

    if (dangerousEnemy && p2Mana >= 3) {
      const bombCard = window.GameConfig.CARDS.find(c => c.id === (p2Mana >= 3 ? "instant" : "shock"));
      if (bombCard && window.GameSystem.isValidPlacement(2, bombCard, dangerousEnemy.x, dangerousEnemy.y)) {
        window.GameSystem.executePlacement(2, bombCard, dangerousEnemy.x, dangerousEnemy.y);
        this.actionCooldown = 1.8;
        return;
      }
    }

    // 2. OFFENSIVE BOMBS: Check for clumped enemy hikers
    if (p2Mana >= 3 && p1Units.length >= 2) {
      for (let enemy of p1Units) {
        const cluster = window.GameState.getUnitsInRadius(enemy.x, enemy.y, 1).filter(u => u.player === 1);
        if (cluster.length >= 2) {
          const areaBomb = window.GameConfig.CARDS.find(c => c.id === "area" || c.id === "shock");
          if (areaBomb && window.GameSystem.isValidPlacement(2, areaBomb, enemy.x, enemy.y)) {
            window.GameSystem.executePlacement(2, areaBomb, enemy.x, enemy.y);
            this.actionCooldown = 2.0;
            return;
          }
        }
      }
    }

    // 3. DEPLOY HIKERS AT BASE CAMP (Rows 12-14, Cols 4-8)
    if (p2Mana >= 2) {
      let chosenCardId = "small";
      if (p2Units.length === 0 && p2Mana >= 3) {
        chosenCardId = "attack";
      } else if (p2Units.some(u => u.hp < u.maxHp * 0.7) && p2Mana >= 3) {
        chosenCardId = "doctor";
      } else if (p1Units.length > p2Units.length && p2Mana >= 3) {
        chosenCardId = "sumo";
      }

      const card = window.GameConfig.CARDS.find(c => c.id === chosenCardId && c.cost <= p2Mana);
      if (card) {
        const validCells = [];
        for (let y of arena.p2DeployRows) {
          for (let x of arena.p2DeployCols) {
            if (window.GameSystem.isValidPlacement(2, card, x, y)) {
              validCells.push({ x, y });
            }
          }
        }

        if (validCells.length > 0) {
          const target = validCells[Math.floor(Math.random() * validCells.length)];
          window.GameSystem.executePlacement(2, card, target.x, target.y);
          this.actionCooldown = 1.6 + Math.random() * 1.0;
        }
      }
    }
  }
};
