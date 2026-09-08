/**
 * js/network.js - Online Peer-to-Peer Multiplayer using PeerJS (WebRTC)
 * 
 * Enables zero-backend, browser-to-browser real-time matches:
 * - Host creates a room code (e.g. BOD-7K92) and gets a shareable link
 * - Guest clicks link or enters code to connect directly via WebRTC DataChannel
 * - Real-time actions (cards, placements, victory) are synced instantly with zero latency
 */

window.Network = {
  // Network state
  isOnline: false,
  isHost: false,
  myPlayer: null, // 1 (Blue) or 2 (Red), or null for local 2-player
  roomId: null,
  peer: null,
  conn: null,
  status: "offline", // "offline" | "hosting" | "connecting" | "connected"
  syncTimer: null,

  // Prefix to prevent collisions on public PeerJS cloud
  ROOM_PREFIX: "bod2026-",

  /**
   * Check URL params on load for auto-join link: ?room=XYZ
   */
  init() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get("room");
    if (roomParam) {
      // Auto open join modal with pre-filled code
      setTimeout(() => {
        this.openLobbyModal(roomParam.trim().toUpperCase());
      }, 300);
    }
  },

  /**
   * Host a new online match (Player 1 - Blue)
   */
  hostRoom() {
    this.disconnect();
    
    // Generate 4-character random code
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "BOD-";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    this.roomId = code;
    this.status = "hosting";
    this.updateStatusUI("Connecting to signaling service...", "waiting");

    const fullPeerId = this.ROOM_PREFIX + code.toLowerCase();

    try {
      this.peer = new Peer(fullPeerId, {
        debug: 1
      });

      this.peer.on("open", (id) => {
        this.isHost = true;
        this.myPlayer = 1;
        this.updateStatusUI(`Waiting for Player 2... Room: ${this.roomId}`, "waiting");
        this.updateLobbyUIHost(this.roomId);
      });

      this.peer.on("connection", (connection) => {
        this.conn = connection;
        this.setupConnectionHandlers();
        
        // When connection is ready, send welcome handshake
        this.conn.on("open", () => {
          this.isOnline = true;
          this.status = "connected";
          this.updateStatusUI(`🟢 Connected to Player 2! (You: Blue Team)`, "connected");
          this.closeLobbyModal();
          
          // Hide pause button in online mode
          document.getElementById("btn-pause")?.classList.add("hidden");

          window.GameSystem.resetGame(true); // Local reset only - DO NOT broadcast
          window.GameSystem.updateCardStyles();
          window.GameSystem.updateStatus("Player 2 joined! You are Player 1 (Blue). Place cards to battle!");

          // Send welcome packet assigning Player 2 and sending custom config
          this.send({
            type: "WELCOME",
            assignedPlayer: 2,
            mana: window.GameState.mana,
            config: {
              startMana: window.GameConfig.MANA.START,
              regenRate: window.GameConfig.MANA.REGEN_PER_SECOND,
              speedMultiplier: window.GameConfig.speedMultiplier,
              cardCosts: window.GameConfig.getCurrentCosts()
            }
          });

          // Start host sync heartbeat
          this.startHostSync();
        });
      });

      this.peer.on("error", (err) => {
        console.error("PeerJS Host Error:", err);
        if (err.type === "unavailable-id") {
          // Retry with new code if collision
          this.hostRoom();
        } else {
          this.updateStatusUI("Connection error: " + err.type, "error");
        }
      });
    } catch (e) {
      console.error("PeerJS Initialization failed:", e);
      this.updateStatusUI("WebRTC not supported or failed to load.", "error");
    }
  },

  /**
   * Join an existing match (Player 2 - Red)
   */
  joinRoom(code) {
    if (!code) return;
    this.disconnect();

    const cleanCode = code.trim().toUpperCase();
    this.roomId = cleanCode;
    this.status = "connecting";
    this.updateStatusUI(`Connecting to room ${cleanCode}...`, "waiting");

    const targetPeerId = this.ROOM_PREFIX + cleanCode.toLowerCase();

    try {
      // Guest creates random peer
      this.peer = new Peer({ debug: 1 });

      this.peer.on("open", () => {
        // Connect to host
        this.conn = this.peer.connect(targetPeerId, {
          reliable: true
        });

        this.setupConnectionHandlers();

        this.conn.on("open", () => {
          this.isOnline = true;
          this.isHost = false;
          this.myPlayer = 2; // Guest is always Player 2
          this.status = "connected";
          this.updateStatusUI(`🟢 Connected to Player 1! (You: Red Team)`, "connected");
          this.closeLobbyModal();

          // Hide pause button in online mode
          document.getElementById("btn-pause")?.classList.add("hidden");

          window.GameSystem.resetGame(true); // Local reset only - DO NOT broadcast
          window.GameSystem.updateCardStyles();
          window.GameSystem.updateStatus("Connected to Host! You are Player 2 (Red Team). Place cards to battle!");
        });
      });

      this.peer.on("error", (err) => {
        console.error("PeerJS Join Error:", err);
        this.updateStatusUI("Could not connect to room: " + cleanCode, "error");
      });
    } catch (e) {
      console.error("PeerJS Join failed:", e);
      this.updateStatusUI("WebRTC error.", "error");
    }
  },

  /**
   * Setup event listeners on active DataConnection
   */
  setupConnectionHandlers() {
    if (!this.conn) return;

    this.conn.on("data", (data) => {
      this.handleIncomingData(data);
    });

    this.conn.on("close", () => {
      this.isOnline = false;
      this.status = "offline";
      this.updateStatusUI("⚠️ Opponent disconnected. Reverted to Local Mode.", "error");
      window.GameSystem.updateStatus("Opponent left the match. Game paused.");
      if (window.GameState.isStarted) {
        document.getElementById("btn-pause")?.classList.remove("hidden");
      }
      this.stopHostSync();
    });

    this.conn.on("error", (err) => {
      console.error("DataConnection error:", err);
      this.updateStatusUI("Network error.", "error");
    });
  },

  /**
   * Handle incoming packets from peer
   */
  handleIncomingData(msg) {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case "WELCOME":
        this.isOnline = true;
        this.myPlayer = msg.assignedPlayer || 2;
        this.updateStatusUI(`🟢 Connected to Host! (You: Red Team)`, "connected");
        if (msg.config) {
          window.GameConfig.applySettings(msg.config, false);
          window.GameSystem.renderCardsUI();
          window.GameSystem.updateManaUI();
        }
        window.GameSystem.updateCardStyles();
        window.GameSystem.updateStatus("Connected! You are Player 2 (Red Team). Place cards to battle!");
        break;

      case "CONFIG":
        if (msg.config) {
          window.GameConfig.applySettings(msg.config, false);
          window.GameSystem.renderCardsUI();
          window.GameSystem.updateManaUI();
          window.GameSystem.updateCardStyles();
          window.GameSystem.updateStatus("Host updated game settings.");
        }
        break;

      case "PLACE":
        // Opponent placed a card
        const card = window.GameConfig.CARDS.find(c => c.id === msg.cardId);
        if (card) {
          window.GameSystem.executePlacement(msg.player, card, msg.x, msg.y, true);
        }
        break;

      case "START_MATCH":
        window.GameSystem.startMatch(true);
        break;

      case "STOP_MATCH":
        window.GameSystem.stopMatch(true);
        break;

      case "RESET":
        window.GameSystem.resetGame(true); // Local reset only - DO NOT re-broadcast!
        window.GameSystem.updateStatus("Opponent restarted the match.");
        break;

      case "SYNC":
        // Sync match time & mana periodically from host
        if (!this.isHost && msg.mana) {
          window.GameState.mana = msg.mana;
          window.GameState.matchTimeSec = msg.matchTimeSec;
          if (msg.isStarted !== undefined && msg.isStarted !== window.GameState.isStarted) {
            if (msg.isStarted) {
              window.GameSystem.startMatch(true);
            } else {
              window.GameSystem.stopMatch(true);
            }
          }
        }
        break;

      case "VICTORY":
        if (!window.GameState.isGameOver) {
          const hiker = window.GameState.units.find(u => u.id === msg.hikerId) || { card: { name: "Hiker" } };
          window.GameSystem.triggerVictory(msg.winner, hiker, true);
        }
        break;
    }
  },

  /**
   * Send action packet to peer
   */
  send(data) {
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(data);
      } catch (e) {
        console.error("Failed to send packet:", e);
      }
    }
  },

  /**
   * Broadcast card placement to opponent
   */
  broadcastPlacement(player, card, x, y) {
    if (!this.isOnline) return;
    this.send({
      type: "PLACE",
      player: player,
      cardId: card.id,
      x: x,
      y: y
    });
  },

  /**
   * Periodic host synchronization
   */
  startHostSync() {
    this.stopHostSync();
    if (!this.isHost) return;

    this.syncTimer = setInterval(() => {
      if (this.isOnline && this.conn && this.conn.open) {
        this.send({
          type: "SYNC",
          mana: [
            parseFloat(window.GameState.mana[0].toFixed(2)),
            parseFloat(window.GameState.mana[1].toFixed(2))
          ],
          matchTimeSec: window.GameState.matchTimeSec,
          isStarted: window.GameState.isStarted
        });
      }
    }, 2000);
  },

  stopHostSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  },

  /**
   * Disconnect and return to local mode
   */
  disconnect() {
    this.stopHostSync();
    if (this.conn) {
      try { this.conn.close(); } catch(e) {}
      this.conn = null;
    }
    if (this.peer) {
      try { this.peer.destroy(); } catch(e) {}
      this.peer = null;
    }
    this.isOnline = false;
    this.isHost = false;
    this.myPlayer = null;
    this.roomId = null;
    this.status = "offline";
    this.updateStatusUI("👥 2-Player Local", "offline");
    if (window.GameState.isStarted) {
      document.getElementById("btn-pause")?.classList.remove("hidden");
    } else {
      document.getElementById("btn-pause")?.classList.add("hidden");
    }
    window.GameSystem.updateCardStyles();
  },

  /**
   * UI Helpers
   */
  updateStatusUI(text, stateClass) {
    const pill = document.getElementById("net-status-pill");
    if (!pill) return;
    pill.textContent = text;
    pill.className = `net-status-pill ${stateClass || ""}`;
  },

  openLobbyModal(prefillCode = "") {
    const modal = document.getElementById("online-modal");
    if (modal) {
      modal.classList.add("open");
      if (prefillCode) {
        const input = document.getElementById("input-join-code");
        if (input) input.value = prefillCode;
        this.switchLobbyTab("join");
      }
    }
  },

  closeLobbyModal() {
    document.getElementById("online-modal")?.classList.remove("open");
  },

  switchLobbyTab(tab) {
    document.getElementById("tab-host")?.classList.toggle("active", tab === "host");
    document.getElementById("tab-join")?.classList.toggle("active", tab === "join");
    document.getElementById("panel-host")?.classList.toggle("hidden", tab !== "host");
    document.getElementById("panel-join")?.classList.toggle("hidden", tab !== "join");
  },

  updateLobbyUIHost(code) {
    const codeEl = document.getElementById("host-room-code");
    if (codeEl) codeEl.textContent = code;

    const linkInput = document.getElementById("host-room-link");
    if (linkInput) {
      const shareUrl = window.location.origin + window.location.pathname + "?room=" + code;
      linkInput.value = shareUrl;
    }
  }
};

// Initialize URL listeners on load
window.addEventListener("DOMContentLoaded", () => {
  window.Network.init();
});
