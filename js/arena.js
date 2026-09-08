/**
 * js/arena.js - Arena Grid Generation, Visual Rendering, and FX Layers
 * 
 * Layout:
 * - Row 0: The Mountain Peak (Summit)
 * - Rows 1-11: Mountain slopes (neutral climbing path)
 * - Rows 12-14: Single unified Base Camp deployment area for all characters
 */

window.ArenaRenderer = {
  gridEl: null,
  fxLayerEl: null,

  init() {
    this.gridEl = document.getElementById("grid");
    this.fxLayerEl = document.getElementById("fx-layer");
    this.rebuildGrid();
  },

  /**
   * Build the 9x15 grid cells with unified bottom deployment area
   */
  rebuildGrid() {
    if (!this.gridEl) return;
    this.gridEl.innerHTML = "";

    const { COLS, ROWS } = window.GameConfig.GRID;
    const arena = window.GameConfig.ARENA;

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.x = x;
        cell.dataset.y = y;

        const cellIdx = y * COLS + x;
        cell.dataset.idx = cellIdx;
        cell.title = `Cell ${cellIdx} (x:${x}, y:${y})`;

        const numEl = document.createElement("span");
        numEl.className = "cell-num";
        numEl.textContent = cellIdx;
        cell.appendChild(numEl);

        // Peak row (Top: Row 0)
        if (y === arena.peakRow) {
          cell.classList.add("peak");
          if (x === 4) {
            cell.classList.add("peak-summit");
            const trophyEl = document.createElement("span");
            trophyEl.className = "cell-flag summit-trophy";
            trophyEl.textContent = "🏆";
            cell.appendChild(trophyEl);
          } else {
            const flagCols = [0, 1, 2, 3, 5, 6, 7, 8];
            const slotIdx = flagCols.indexOf(x);
            cell.dataset.flagSlot = slotIdx;
            const flagEl = document.createElement("span");
            flagEl.className = "cell-flag neutral-flag";
            flagEl.textContent = "🏳️";
            cell.appendChild(flagEl);
          }
        } 
        // Bottom Base Camp - Single unified area for all characters (Rows 12-14)
        else if (arena.deployRows.includes(y)) {
          cell.classList.add("deployarea");
        } 
        // Mountain climbing slopes (Rows 1-11)
        else {
          cell.classList.add("neutral");
        }

        // Cell click placement event
        cell.addEventListener("click", () => {
          window.GameSystem.handleCellClick(x, y);
        });

        this.gridEl.appendChild(cell);
      }
    }

    this.updateSummitFlagsUI();
  },

  /**
   * Update the 8 summit flags on row 0 and the top HUD progress track
   */
  updateSummitFlagsUI() {
    const flags = window.GameState.flags || [0, 0, 0, 0, 0, 0, 0, 0];
    const flagCols = [0, 1, 2, 3, 5, 6, 7, 8];

    // 1. Update row 0 cells on the arena grid
    if (this.gridEl) {
      flagCols.forEach((colX, slotIdx) => {
        const cell = this.gridEl.querySelector(`.cell[data-x="${colX}"][data-y="0"]`);
        if (!cell) return;

        const flagVal = flags[slotIdx]; // 0 = neutral, 1 = Blue (P1), 2 = Red (P2)
        cell.classList.remove("flag-neutral", "flag-p1", "flag-p2");

        const flagEl = cell.querySelector(".cell-flag");
        if (flagVal === 1) {
          cell.classList.add("flag-p1");
          if (flagEl) {
            flagEl.textContent = "🚩";
            flagEl.className = "cell-flag blue-flag";
          }
        } else if (flagVal === 2) {
          cell.classList.add("flag-p2");
          if (flagEl) {
            flagEl.textContent = "🚩";
            flagEl.className = "cell-flag red-flag";
          }
        } else {
          cell.classList.add("flag-neutral");
          if (flagEl) {
            flagEl.textContent = "🏳️";
            flagEl.className = "cell-flag neutral-flag";
          }
        }
      });
    }

    // 2. Update HUD progress track above arena
    const trackEl = document.getElementById("flags-track");
    if (trackEl) {
      trackEl.innerHTML = "";
      flags.forEach((f, idx) => {
        const item = document.createElement("span");
        item.className = "track-flag " + (f === 1 ? "flag-blue" : f === 2 ? "flag-red" : "flag-neutral");
        item.textContent = f === 0 ? "🏳️" : "🚩";
        item.title = `Flag ${idx + 1}: ` + (f === 1 ? "Blue Team (P1)" : f === 2 ? "Red Team (P2)" : "Neutral");
        trackEl.appendChild(item);
      });
    }

    // 3. Update team flag counters
    const p1Count = flags.filter(f => f === 1).length;
    const p2Count = flags.filter(f => f === 2).length;

    const p1El = document.getElementById("p1-flags-count");
    const p2El = document.getElementById("p2-flags-count");
    if (p1El) p1El.textContent = p1Count;
    if (p2El) p2El.textContent = p2Count;
  },

  /**
   * Highlight valid deployment targets based on selected card
   */
  updateHighlights() {
    const selected = window.GameState.selectedCard;
    const cells = this.gridEl.querySelectorAll(".cell");

    cells.forEach(cell => {
      cell.classList.remove("hl-valid", "hl-invalid");
      if (!selected) return;

      const x = parseInt(cell.dataset.x, 10);
      const y = parseInt(cell.dataset.y, 10);

      const isValid = window.GameSystem.isValidPlacement(selected.player, selected.card, x, y);
      if (isValid) {
        cell.classList.add("hl-valid");
      }
    });
  },

  /**
   * Full DOM render of all entities using custom cartoon stickfigure & bomb vector sprites
   */
  renderEntities() {
    // Clear old unit/bomb DOM elements
    this.gridEl.querySelectorAll(".unit-node, .bomb-node").forEach(el => el.remove());

    const { COLS } = window.GameConfig.GRID;
    const getCellEl = (x, y) => this.gridEl.children[y * COLS + x];

    // 1. Render Units with Cartoon Stickfigure Vector Sprites
    window.GameState.units.forEach(unit => {
      const cellEl = getCellEl(unit.x, unit.y);
      if (!cellEl) return;

      const node = document.createElement("div");
      node.className = `unit-node ${unit.player === 1 ? "p1-unit" : "p2-unit"}`;
      if (unit.stunTimer > 0) node.classList.add("stunned");

      // Stickfigure SVG Sprite
      const spriteContainer = document.createElement("div");
      spriteContainer.className = "unit-sprite-box";
      spriteContainer.innerHTML = window.Sprites.getHiker(unit.card.id, unit.player, { stunned: unit.stunTimer > 0 });
      node.appendChild(spriteContainer);

      // Health bar
      const hpBar = document.createElement("div");
      hpBar.className = "unit-hp-bar";
      const hpFill = document.createElement("div");
      hpFill.className = "unit-hp-fill";

      const pct = Math.max(0, Math.min(100, (unit.hp / unit.maxHp) * 100));
      hpFill.style.width = `${pct}%`;
      if (pct <= 30) hpFill.classList.add("low");
      else if (pct <= 60) hpFill.classList.add("mid");

      hpBar.appendChild(hpFill);
      node.appendChild(hpBar);

      cellEl.appendChild(node);
    });

    // 2. Render Bombs with Cartoon Weapon Sprites
    window.GameState.bombs.forEach(bomb => {
      const cellEl = getCellEl(bomb.x, bomb.y);
      if (!cellEl) return;

      const node = document.createElement("div");
      node.className = "bomb-node";

      const spriteContainer = document.createElement("div");
      spriteContainer.className = "bomb-sprite-box";
      spriteContainer.innerHTML = window.Sprites.getBomb(bomb.card.id, bomb.player);
      node.appendChild(spriteContainer);

      // Fuse countdown badge for timer bomb
      if (bomb.card.id === "timer" && bomb.fuseTimer > 0) {
        const badge = document.createElement("div");
        badge.className = "bomb-fuse-text";
        badge.textContent = Math.ceil(bomb.fuseTimer) + "s";
        node.appendChild(badge);
      }

      cellEl.appendChild(node);
    });
  },

  /**
   * Spawn floating combat text (Damage, Heal, Stun)
   */
  spawnCombatText(x, y, text, cssClass) {
    if (!this.gridEl || !this.fxLayerEl) return;
    const { COLS, ROWS } = window.GameConfig.GRID;
    const rect = this.gridEl.getBoundingClientRect();
    const cellW = rect.width / COLS;
    const cellH = rect.height / ROWS;

    const el = document.createElement("div");
    el.className = `floating-text ${cssClass}`;
    el.textContent = text;
    el.style.left = `${(x + 0.5) * cellW}px`;
    el.style.top = `${(y + 0.3) * cellH}px`;

    this.fxLayerEl.appendChild(el);
    setTimeout(() => el.remove(), 950);
  },

  /**
   * Spawn explosion circle animation
   */
  spawnExplosion(x, y, color = "#f97316") {
    if (!this.gridEl || !this.fxLayerEl) return;
    const { COLS, ROWS } = window.GameConfig.GRID;
    const rect = this.gridEl.getBoundingClientRect();
    const cellW = rect.width / COLS;
    const cellH = rect.height / ROWS;

    const el = document.createElement("div");
    el.className = "explosion-circle";
    el.style.background = color;
    el.style.left = `${(x + 0.5) * cellW}px`;
    el.style.top = `${(y + 0.5) * cellH}px`;

    this.fxLayerEl.appendChild(el);
    setTimeout(() => el.remove(), 550);
  },

  /**
   * Visual cell shake on impact
   */
  shakeCell(x, y) {
    const { COLS } = window.GameConfig.GRID;
    const cellEl = this.gridEl?.children[y * COLS + x];
    if (!cellEl) return;
    cellEl.style.transform = "scale(0.88)";
    setTimeout(() => {
      cellEl.style.transform = "";
    }, 140);
  }
};
