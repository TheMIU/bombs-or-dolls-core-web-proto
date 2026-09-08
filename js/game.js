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
    this.updateManaUI();
    this.updateTimerUI();

    document.getElementById("btn-start")?.classList.remove("hidden");
    document.getElementById("btn-stop")?.classList.add("hidden");
    document.getElementById("btn-settings")?.classList.remove("hidden");
    document.getElementById("btn-pause")?.classList.add("hidden");

    this.updateStatus("Ready! Adjust ⚙️ Settings or click ▶ Start Match to begin.");
    
    // Start real-time loop
    this.lastTimestamp = performance.now();
    this.loopHandle = requestAnimationFrame(ts => this.loop(ts));
  },

  /**
   * Bind buttons and controls
   */
  bindUI() {
    // Start match button
    document.getElementById("btn-start")?.addEventListener("click", () => {
      this.startMatch();
    });

    // Stop match button
    document.getElementById("btn-stop")?.addEventListener("click", () => {
      this.stopMatch();
    });

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

    // Online lobby modal button
    document.getElementById("btn-online")?.addEventListener("click", () => {
      window.Network.openLobbyModal();
    });

    // Close online modal
    document.querySelectorAll(".btn-close-online")?.forEach(btn => {
      btn.addEventListener("click", () => {
        window.Network.closeLobbyModal();
      });
    });

    // Lobby tabs
    document.getElementById("tab-host")?.addEventListener("click", () => {
      window.Network.switchLobbyTab("host");
    });
    document.getElementById("tab-join")?.addEventListener("click", () => {
      window.Network.switchLobbyTab("join");
    });

    // Create / Host room
    document.getElementById("btn-create-room")?.addEventListener("click", () => {
      window.Network.hostRoom();
    });

    // Join room
    document.getElementById("btn-join-room")?.addEventListener("click", () => {
      const code = document.getElementById("input-join-code")?.value;
      if (code) window.Network.joinRoom(code);
    });

    // Copy room link
    document.getElementById("btn-copy-link")?.addEventListener("click", () => {
      const linkInput = document.getElementById("host-room-link");
      if (linkInput && linkInput.value) {
        navigator.clipboard.writeText(linkInput.value).then(() => {
          const btn = document.getElementById("btn-copy-link");
          if (btn) {
            const orig = btn.textContent;
            btn.textContent = "✅ Copied!";
            setTimeout(() => { btn.textContent = orig; }, 1800);
          }
        });
      }
    });

    // Disconnect online session
    document.getElementById("btn-disconnect-net")?.addEventListener("click", () => {
      window.Network.disconnect();
      this.updateStatus("Disconnected. Returned to Local 2-Player mode.");
    });

    // Settings modal button
    document.getElementById("btn-settings")?.addEventListener("click", () => {
      this.openSettingsModal();
    });

    // Close settings modal
    document.querySelectorAll(".btn-close-settings")?.forEach(btn => {
      btn.addEventListener("click", () => {
        document.getElementById("settings-modal")?.classList.remove("open");
      });
    });

    // Save settings
    document.getElementById("btn-save-settings")?.addEventListener("click", () => {
      this.saveSettingsFromModal();
    });

    // Reset settings to defaults
    document.getElementById("btn-reset-defaults")?.addEventListener("click", () => {
      this.resetSettingsDefaults();
    });

    // Modal play again button
    document.getElementById("btn-play-again")?.addEventListener("click", () => {
      document.getElementById("victory-modal")?.classList.remove("open");
      this.resetGame();
    });
  },

  /**
   * Open settings modal and populate with current values
   */
  openSettingsModal() {
    const modal = document.getElementById("settings-modal");
    if (!modal) return;

    const speedSelect = document.getElementById("cfg-speed");
    if (speedSelect) speedSelect.value = window.GameConfig.speedMultiplier.toString();

    const startManaInput = document.getElementById("cfg-start-mana");
    if (startManaInput) startManaInput.value = window.GameConfig.MANA.START;

    const regenSelect = document.getElementById("cfg-regen-rate");
    if (regenSelect) regenSelect.value = window.GameConfig.MANA.REGEN_PER_SECOND.toString();

    // Populate card cost inputs
    window.GameConfig.CARDS.forEach(card => {
      const input = document.getElementById(`cfg-cost-${card.id}`);
      if (input) input.value = card.cost;
    });

    modal.classList.add("open");
  },

  /**
   * Save settings from modal form and apply
   */
  saveSettingsFromModal() {
    const speedMultiplier = parseFloat(document.getElementById("cfg-speed")?.value || 1.0);
    const startMana = parseInt(document.getElementById("cfg-start-mana")?.value || 10, 10);
    const regenRate = parseFloat(document.getElementById("cfg-regen-rate")?.value || 0.35);

    const cardCosts = {};
    window.GameConfig.CARDS.forEach(card => {
      const input = document.getElementById(`cfg-cost-${card.id}`);
      if (input) cardCosts[card.id] = parseInt(input.value, 10);
    });

    const settingsObj = { speedMultiplier, startMana, regenRate, cardCosts };
    window.GameConfig.applySettings(settingsObj, true);

    // If match hasn't started, update starting mana
    if (window.GameState.matchTimeSec === 0 && window.GameState.units.length === 0) {
      window.GameState.mana = [startMana, startMana];
    }

    this.renderCardsUI();
    this.updateManaUI();
    this.updateCardStyles();

    // If online Host, broadcast config to Guest
    if (window.Network && window.Network.isOnline && window.Network.isHost) {
      window.Network.send({
        type: "CONFIG",
        config: settingsObj
      });
    }

    document.getElementById("settings-modal")?.classList.remove("open");
    this.updateStatus("⚙️ Settings saved and applied!");
  },

  /**
   * Reset settings to baseline defaults
   */
  resetSettingsDefaults() {
    const defs = window.GameConfig.getDefaultSettings();
    window.GameConfig.applySettings(defs, true);
    this.openSettingsModal(); // Refresh form fields
    this.renderCardsUI();
    this.updateManaUI();
    this.updateCardStyles();
    this.updateStatus("⚙️ Settings restored to defaults.");
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

        const spriteSvg = card.kind === "hiker"
          ? window.Sprites.getHiker(card.id, p)
          : window.Sprites.getBomb(card.id, p);

        cardEl.innerHTML = `
          <div class="card-icon">${spriteSvg}</div>
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

    // In online mode, you can only select your own cards
    if (window.Network && window.Network.isOnline && player !== window.Network.myPlayer) {
      this.updateStatus(`You are Player ${window.Network.myPlayer} (${window.Network.myPlayer === 1 ? "Blue" : "Red"}). That's your opponent's hand!`);
      return;
    }

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

    // 1. Hikers can be placed anywhere in the single unified bottom base camp (Rows 12-14)
    if (card.kind === "hiker") {
      if (!arena.deployRows.includes(y)) return false;

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
   * Start or resume the battle match
   */
  startMatch(isRemote = false) {
    if (window.GameState.isGameOver) return;
    window.GameState.isStarted = true;
    window.GameState.isPaused = false;

    // Broadcast to peer if online
    if (!isRemote && window.Network && window.Network.isOnline) {
      window.Network.send({ type: "START_MATCH" });
    }

    const startBtn = document.getElementById("btn-start");
    const stopBtn = document.getElementById("btn-stop");
    const settingsBtn = document.getElementById("btn-settings");
    const pauseBtn = document.getElementById("btn-pause");

    if (startBtn) startBtn.classList.add("hidden");
    if (stopBtn) stopBtn.classList.remove("hidden");
    if (settingsBtn) settingsBtn.classList.add("hidden");

    if (pauseBtn) {
      if (window.Network && window.Network.isOnline) {
        pauseBtn.classList.add("hidden");
      } else {
        pauseBtn.classList.remove("hidden");
        pauseBtn.textContent = "⏸ Pause";
      }
    }

    this.updateStatus("Match started! Climbers race to the summit at Row 0!");
  },

  /**
   * Stop the battle match
   */
  stopMatch(isRemote = false) {
    window.GameState.isStarted = false;

    // Broadcast to peer if online
    if (!isRemote && window.Network && window.Network.isOnline) {
      window.Network.send({ type: "STOP_MATCH" });
    }

    const startBtn = document.getElementById("btn-start");
    const stopBtn = document.getElementById("btn-stop");
    const settingsBtn = document.getElementById("btn-settings");
    const pauseBtn = document.getElementById("btn-pause");

    if (startBtn) {
      startBtn.classList.remove("hidden");
      startBtn.textContent = window.GameState.matchTimeSec > 0 ? "▶ Resume Match" : "▶ Start Match";
    }
    if (stopBtn) stopBtn.classList.add("hidden");
    if (settingsBtn) settingsBtn.classList.remove("hidden");
    if (pauseBtn) pauseBtn.classList.add("hidden");

    this.updateStatus("Match stopped. Adjust settings or click ▶ Resume Match to continue.");
  },

  /**
   * Handle user clicking a grid cell
   */
  handleCellClick(x, y) {
    if (window.GameState.isGameOver || window.GameState.isPaused) return;

    if (!window.GameState.isStarted) {
      this.updateStatus("Click '▶ Start Match' to begin the battle before deploying cards!");
      return;
    }

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
  executePlacement(player, card, x, y, isRemote = false) {
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

    // Broadcast placement to remote player if this was our local action
    if (!isRemote && window.Network && window.Network.isOnline) {
      window.Network.broadcastPlacement(player, card, x, y);
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

    if (!window.GameState.isGameOver && !window.GameState.isPaused && window.GameState.isStarted) {
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
    }

    // 5. Render always
    this.updateManaUI();
    this.updateTimerUI();
    window.ArenaRenderer.renderEntities();

    this.loopHandle = requestAnimationFrame(ts => this.loop(ts));
  },

  /**
   * Trigger victory when a hiker steps on row 0
   */
  triggerVictory(winningPlayer, hiker, isRemote = false) {
    window.GameState.isGameOver = true;
    window.GameState.isStarted = false;
    window.GameState.winner = winningPlayer;

    // Broadcast victory to peer if this was determined locally
    if (!isRemote && window.Network && window.Network.isOnline) {
      window.Network.send({
        type: "VICTORY",
        winner: winningPlayer,
        hikerId: hiker?.id
      });
    }

    document.getElementById("btn-start")?.classList.add("hidden");
    document.getElementById("btn-stop")?.classList.add("hidden");
    document.getElementById("btn-pause")?.classList.add("hidden");

    const modal = document.getElementById("victory-modal");
    const trophy = document.getElementById("victory-trophy");
    const title = document.getElementById("victory-title");
    const desc = document.getElementById("victory-desc");

    trophy.textContent = winningPlayer === 1 ? "🏆" : "👑";
    title.textContent = `PLAYER ${winningPlayer} REACHED THE PEAK!`;
    title.className = `victory-title ${winningPlayer === 1 ? "p1-color" : "p2-color"}`;
    desc.textContent = `Player ${winningPlayer}'s ${hiker?.card?.name || "Hiker"} conquered the Mountain Summit in ${Math.floor(window.GameState.matchTimeSec)} seconds!`;

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
   * Update cards enabled/disabled appearance based on available mana and online role
   */
  updateCardStyles() {
    const isOnline = window.Network && window.Network.isOnline;
    const myPlayer = isOnline ? window.Network.myPlayer : null;

    [1, 2].forEach(p => {
      const mana = window.GameState.mana[p - 1];
      const box = document.getElementById(`cards-p${p}`);
      if (!box) return;

      const isOpponentHand = isOnline && myPlayer && p !== myPlayer;

      box.querySelectorAll(".card").forEach(cardEl => {
        const cardId = cardEl.dataset.cardId;
        const cardDef = window.GameConfig.CARDS.find(c => c.id === cardId);
        if (!cardDef) return;

        // In online mode, opponent hand is visually dimmed & locked
        cardEl.classList.toggle("opponent-card", isOpponentHand);

        // Disabled if insufficient mana (or opponent hand)
        cardEl.classList.toggle("disabled", mana < cardDef.cost || isOpponentHand);

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
  resetGame(isRemote = false) {
    window.GameState.reset();

    // Broadcast reset to peer if local
    if (!isRemote && window.Network && window.Network.isOnline) {
      window.Network.send({ type: "RESET" });
    }

    const startBtn = document.getElementById("btn-start");
    const stopBtn = document.getElementById("btn-stop");
    const settingsBtn = document.getElementById("btn-settings");
    const pauseBtn = document.getElementById("btn-pause");

    if (startBtn) {
      startBtn.classList.remove("hidden");
      startBtn.textContent = "▶ Start Match";
    }
    if (stopBtn) stopBtn.classList.add("hidden");
    if (settingsBtn) settingsBtn.classList.remove("hidden");
    if (pauseBtn) pauseBtn.classList.add("hidden");

    document.getElementById("victory-modal")?.classList.remove("open");
    window.ArenaRenderer.rebuildGrid();
    window.ArenaRenderer.renderEntities();
    window.ArenaRenderer.updateHighlights();
    this.updateManaUI();
    this.updateTimerUI();
    this.updateStatus("Battle reset. Adjust ⚙️ Settings or click ▶ Start Match to begin.");
  }
};

// Auto-start on load
window.addEventListener("DOMContentLoaded", () => {
  window.GameSystem.init();
});
