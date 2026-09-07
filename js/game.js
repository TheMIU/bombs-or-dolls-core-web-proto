/**
 * js/game.js - Main Game Controller, Real-time Tick Loop, and UI Binding
 */

window.GameSystem = {
  lastTimestamp: 0,
  loopHandle: null,

  /**
   * Initialize game engine and UI listeners
   */
  init() {
    window.ArenaRenderer.init();
    this.bindUI();
    this.renderCardsUI();
    this.updateStatus("Ready! Both players deploy at the bottom and climb to the Peak at the top.");
    
    // Start real-time loop
    this.lastTimestamp = performance.now();
    this.loopHandle = requestAnimationFrame(ts => this.loop(ts));
  },

  /**
   * Bind buttons and controls
   */
  bindUI() {
    // Reset button
    document.getElementById("btn-reset")?.addEventListener("click", () => {
      this.resetGame();
    });

    // Pause button
    const pauseBtn = document.getElementById("btn-pause");
    pauseBtn?.addEventListener("click", () => {
      window.GameState.isPaused = !window.GameState.isPaused;
      pauseBtn.textContent = window.GameState.isPaused ? "▶ Resume" : "⏸ Pause";
      this.updateStatus(window.GameState.isPaused ? "Game Paused." : "Game Resumed.");
    });

    // Optional AI Bot toggle (initially OFF for 2 human players on one screen)
    const aiBtn = document.getElementById("btn-ai");
    aiBtn?.addEventListener("click", () => {
      window.GameState.aiEnabled = !window.GameState.aiEnabled;
      aiBtn.classList.toggle("active", window.GameState.aiEnabled);
      aiBtn.textContent = window.GameState.aiEnabled ? "🤖 Bot: ON" : "👥 2-Player Local";
      this.updateStatus(window.GameState.aiEnabled ? "Bot enabled for Player 2." : "2-Player Local mode (Both humans).");
    });

    // Modal play again button
    document.getElementById("btn-play-again")?.addEventListener("click", () => {
      document.getElementById("victory-modal")?.classList.remove("open");
      this.resetGame();
    });
  },

  /**
   * Build the 8 cards for Player 1 and Player 2
   */
  renderCardsUI() {
    [1, 2].forEach(p => {
      const box = document.getElementById(`cards-p${p}`);
      if (!box) return;
      box.innerHTML = "";

      window.GameConfig.CARDS.forEach(card => {
        const cardEl = document.createElement("div");
        cardEl.className = "card";
        cardEl.dataset.cardId = card.id;
        cardEl.dataset.player = p;

        cardEl.innerHTML = `
          <div class="card-icon">${card.icon}</div>
          <div class="card-name">${card.name}</div>
          <div class="card-footer">
            <span class="card-cost">${card.cost}⚡</span>
            <span class="card-role">${card.role}</span>
          </div>
        `;

        cardEl.addEventListener("click", () => {
          this.selectCard(p, card);
        });

        box.appendChild(cardEl);
      });
    });
  },

  /**
   * Player selects a card to place
   */
  selectCard(player, card) {
    if (window.GameState.isGameOver || window.GameState.isPaused) return;

    // Check mana
    const currentMana = window.GameState.mana[player - 1];
    if (currentMana < card.cost) {
      this.updateStatus(`Player ${player}: Not enough mana for ${card.name} (${card.cost}⚡ needed).`);
      return;
    }

    // Toggle off if clicking the already selected card
    const active = window.GameState.selectedCard;
    if (active && active.player === player && active.card.id === card.id) {
      window.GameState.selectedCard = null;
      this.updateStatus("Card deselected.");
    } else {
      window.GameState.selectedCard = { player, card };
      this.updateStatus(`Player ${player}: ${card.name} selected. Click on the mountain.`);
    }

    this.updateCardStyles();
    window.ArenaRenderer.updateHighlights();
  },

  /**
   * Validate placement of a card at (x, y)
   */
  isValidPlacement(player, card, x, y) {
    const { COLS, ROWS } = window.GameConfig.GRID;
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;

    const arena = window.GameConfig.ARENA;

    // Cannot place directly on the peak (Row 0)
    if (y === arena.peakRow) return false;

    // 1. Hikers can only be placed in player's base camp at the bottom (Rows 12-14)
    if (card.kind === "hiker") {
      const deployRows = player === 1 ? arena.p1DeployRows : arena.p2DeployRows;
      const deployCols = player === 1 ? arena.p1DeployCols : arena.p2DeployCols;

      if (!deployRows.includes(y)) return false;
      if (deployCols && !deployCols.includes(x)) return false;

      // Cell cannot already have a friendly unit
      const existing = window.GameState.getUnitAt(x, y);
      if (existing && existing.player === player) return false;

      return true;
    }

    // 2. Bombs: Can be placed anywhere on the mountain (tactical reach advantage)
    if (card.kind === "bomb") {
      // Cannot stack multiple bombs on same cell
      const existingBomb = window.GameState.getBombAt(x, y);
      if (existingBomb) return false;

      return true;
    }

    return false;
  },

  /**
   * Handle user clicking a grid cell
   */
  handleCellClick(x, y) {
    if (window.GameState.isGameOver || window.GameState.isPaused) return;

    const selection = window.GameState.selectedCard;
    if (!selection) {
      const unit = window.GameState.getUnitAt(x, y);
      if (unit) {
        this.updateStatus(`P${unit.player} ${unit.card.name} (HP: ${unit.hp}/${unit.maxHp})`);
      } else {
        this.updateStatus("Select a card from Player 1 (Left) or Player 2 (Right) first.");
      }
      return;
    }

    const { player, card } = selection;

    if (!this.isValidPlacement(player, card, x, y)) {
      this.updateStatus(`Invalid cell for Player ${player}'s ${card.name}.`);
      window.ArenaRenderer.shakeCell(x, y);
      return;
    }

    this.executePlacement(player, card, x, y);
  },

  /**
   * Execute deduction of mana and unit/bomb spawn
   */
  executePlacement(player, card, x, y) {
    // Deduct mana
    window.GameState.mana[player - 1] -= card.cost;

    if (card.kind === "hiker") {
      const hiker = window.UnitSystem.spawnHiker(player, card, x, y);
      window.GameState.units.push(hiker);
      window.ArenaRenderer.spawnCombatText(x, y, "DEPLOY!", player === 1 ? "floating-stun" : "floating-dmg");
    } else if (card.kind === "bomb") {
      const bomb = window.BombSystem.spawnBomb(player, card, x, y);
      window.GameState.bombs.push(bomb);
      window.ArenaRenderer.spawnCombatText(x, y, "ARMED!", "floating-dmg");
    }

    // Clear selection if player has insufficient mana for another deployment
    if (window.GameState.selectedCard?.player === player) {
      if (window.GameState.mana[player - 1] < card.cost) {
        window.GameState.selectedCard = null;
      }
    }

    this.updateCardStyles();
    window.ArenaRenderer.updateHighlights();
    window.ArenaRenderer.renderEntities();
  },

  /**
   * Main real-time game loop
   */
  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
    this.lastTimestamp = timestamp;

    if (!window.GameState.isGameOver && !window.GameState.isPaused) {
      // 1. Regenerate mana for both players simultaneously
      const regen = window.GameConfig.MANA.REGEN_PER_SECOND * dt;
      const maxMana = window.GameConfig.MANA.MAX;
      window.GameState.mana[0] = Math.min(maxMana, window.GameState.mana[0] + regen);
      window.GameState.mana[1] = Math.min(maxMana, window.GameState.mana[1] + regen);

      // 2. Update entities (climbing bottom to top, combat, abilities)
      window.UnitSystem.update(dt);
      window.BombSystem.update(dt);

      // 3. Update AI opponent (if enabled)
      if (window.GameState.aiEnabled) {
        window.AISystem.update(dt);
      }

      // 4. Update match timer
      window.GameState.matchTimeSec += dt;

      // 5. Render
      this.updateManaUI();
      this.updateTimerUI();
      window.ArenaRenderer.renderEntities();
    }

    this.loopHandle = requestAnimationFrame(ts => this.loop(ts));
  },

  /**
   * Trigger victory when a hiker steps on row 0
   */
  triggerVictory(winningPlayer, hiker) {
    window.GameState.isGameOver = true;
    window.GameState.winner = winningPlayer;

    const modal = document.getElementById("victory-modal");
    const trophy = document.getElementById("victory-trophy");
    const title = document.getElementById("victory-title");
    const desc = document.getElementById("victory-desc");

    trophy.textContent = winningPlayer === 1 ? "🏆" : "👑";
    title.textContent = `PLAYER ${winningPlayer} REACHED THE PEAK!`;
    title.className = `victory-title ${winningPlayer === 1 ? "p1-color" : "p2-color"}`;
    desc.textContent = `Player ${winningPlayer}'s ${hiker.card.name} conquered the Mountain Summit in ${Math.floor(window.GameState.matchTimeSec)} seconds!`;

    modal?.classList.add("open");
    this.updateStatus(`🏆 PLAYER ${winningPlayer} WINS THE RACE TO THE PEAK!`);
  },

  /**
   * Update mana text & animated progress bar
   */
  updateManaUI() {
    [1, 2].forEach(p => {
      const manaVal = window.GameState.mana[p - 1];
      const maxMana = window.GameConfig.MANA.MAX;
      const textEl = document.getElementById(`m${p}t`);
      const fillEl = document.getElementById(`m${p}`);

      if (textEl) textEl.textContent = manaVal.toFixed(1);
      if (fillEl) fillEl.style.width = `${(manaVal / maxMana) * 100}%`;
    });

    this.updateCardStyles();
  },

  /**
   * Update cards enabled/disabled appearance based on available mana
   */
  updateCardStyles() {
    [1, 2].forEach(p => {
      const mana = window.GameState.mana[p - 1];
      const box = document.getElementById(`cards-p${p}`);
      if (!box) return;

      box.querySelectorAll(".card").forEach(cardEl => {
        const cardId = cardEl.dataset.cardId;
        const cardDef = window.GameConfig.CARDS.find(c => c.id === cardId);
        if (!cardDef) return;

        // Disabled if insufficient mana
        cardEl.classList.toggle("disabled", mana < cardDef.cost);

        // Highlight selected
        const isSelected = window.GameState.selectedCard &&
                           window.GameState.selectedCard.player === p &&
                           window.GameState.selectedCard.card.id === cardId;
        cardEl.classList.toggle("selected", !!isSelected);
      });
    });
  },

  /**
   * Update match elapsed timer
   */
  updateTimerUI() {
    const timerEl = document.getElementById("game-timer");
    if (!timerEl) return;
    const s = Math.floor(window.GameState.matchTimeSec);
    const mins = String(Math.floor(s / 60)).padStart(2, "0");
    const secs = String(s % 60).padStart(2, "0");
    timerEl.textContent = `⏱️ ${mins}:${secs}`;
  },

  /**
   * Update bottom status message
   */
  updateStatus(msg) {
    const statusEl = document.getElementById("status");
    if (statusEl) statusEl.textContent = msg;
  },

  /**
   * Reset game to starting state
   */
  resetGame() {
    window.GameState.reset();
    document.getElementById("victory-modal")?.classList.remove("open");
    window.ArenaRenderer.rebuildGrid();
    window.ArenaRenderer.renderEntities();
    window.ArenaRenderer.updateHighlights();
    this.updateManaUI();
    this.updateTimerUI();
    this.updateStatus("Battle reset. Choose a card and place it at your base to climb.");
  }
};

// Auto-start on load
window.addEventListener("DOMContentLoaded", () => {
  window.GameSystem.init();
});
