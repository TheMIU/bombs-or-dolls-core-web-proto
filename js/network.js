/**
 * js/network.js - Online Peer-to-Peer Multiplayer using PeerJS (WebRTC)
 * 
 * Enables zero-backend, browser-to-browser real-time matches:
 * - Host creates a room code (e.g. BOD-7K92) and gets a shareable link
 * - Guest clicks link or enters code to connect directly via WebRTC DataChannel
 * - Real-time actions (cards, placements, victory) are synced instantly with zero latency
 * - Multi-STUN ICE configuration for cross-network mobile & NAT traversal
 * - Rich console logging & in-modal status feedback for foolproof connectivity
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
  joinTimeoutTimer: null,

  // Prefix to prevent collisions on public PeerJS cloud
  ROOM_PREFIX: "bod2026-",

  /**
   * Return multi-STUN configuration to maximize NAT traversal success across
   * different mobile carriers, Wi-Fi routers, and regions.
   */
  getPeerConfig() {
    return {
      debug: 1,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
          { urls: "stun:stun3.l.google.com:19302" },
          { urls: "stun:stun4.l.google.com:19302" },
          { urls: "stun:stun.cloudflare.com:3478" },
          { urls: "stun:stun.services.mozilla.com" },
          { urls: "stun:global.stun.twilio.com:3478" }
        ],
        iceCandidatePoolSize: 10
      }
    };
  },

  /**
   * Normalizes whatever the user entered or pasted.
   * Handles:
   * - "7K92" -> "BOD-7K92"
   * - "bod-7k92" -> "BOD-7K92"
   * - "https://site.com/?room=BOD-7K92" -> "BOD-7K92"
   * - "?room=7K92" -> "BOD-7K92"
   */
  cleanRoomCode(raw) {
    if (!raw) return null;
    let str = String(raw).trim();
    if (!str) return null;

    // Check if it's a full URL or query string
    if (str.includes("?")) {
      try {
        const queryPart = str.split("?")[1];
        const params = new URLSearchParams(queryPart);
        if (params.has("room")) {
          str = params.get("room").trim();
        }
      } catch (e) {
        console.warn("[Net] Failed to parse URL parameters:", e);
      }
    }

    // Strip out any trailing or leading punctuation/slashes
    str = str.replace(/^[/#?]+/, "").trim().toUpperCase();

    // Already properly formatted (e.g. BOD-XXXX)
    if (str.startsWith("BOD-")) {
      return str;
    }

    // User only typed 4-character code like "7K92" or "W9XY"
    const match = str.match(/[A-Z0-9]{4}/);
    if (match) {
      return "BOD-" + match[0];
    }

    return str;
  },

  /**
   * Check URL params on load for auto-join link: ?room=XYZ
   */
  init() {
    console.log("[Net] 🌐 Initializing Network subsystem...");
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get("room");
    if (roomParam) {
      const code = this.cleanRoomCode(roomParam);
      console.log(`[Net] 🔗 Auto-join URL detected room param: ${roomParam} -> normalized: ${code}`);
      setTimeout(() => {
        this.openLobbyModal(code);
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
    const fullPeerId = this.ROOM_PREFIX + code.toLowerCase();

    console.log(`[Net] 🏠 Hosting match. Generated Room: ${code}, Peer ID: ${fullPeerId}`);
    this.updateStatusUI("Connecting to signaling service...", "waiting");
    this.updateHostStatus("Contacting signaling server to register your room...", "waiting");

    try {
      this.peer = new Peer(fullPeerId, this.getPeerConfig());

      this.peer.on("open", (id) => {
        this.isHost = true;
        this.myPlayer = 1;
        console.log(`[Net] ✅ Host registered on signaling server with ID: ${id}`);
        this.updateStatusUI(`Waiting for Player 2... Room: ${this.roomId}`, "waiting");
        this.updateHostStatus(`Ready! Share the code or link with your friend.`, "waiting");
        this.updateLobbyUIHost(this.roomId);
      });

      this.peer.on("connection", (connection) => {
        console.log(`[Net] 📥 Incoming peer connection from Guest ID: ${connection.peer}`);
        this.conn = connection;
        this.setupConnectionHandlers();
        this.monitorPeerConnection(this.conn);
        this.updateHostStatus("Guest is handshaking... Establishing WebRTC link...", "waiting");
        
        // When connection is ready, send welcome handshake
        this.conn.on("open", () => {
          this.isOnline = true;
          this.status = "connected";
          console.log(`[Net] 🚀 WebRTC DataChannel OPEN! Connected with Guest (${connection.peer}).`);
          this.updateStatusUI(`🟢 Connected to Player 2! (You: Blue Team)`, "connected");
          this.updateHostStatus("Connected! Launching match...", "success");
          
          setTimeout(() => {
            this.closeLobbyModal();
          }, 600);
          
          // Hide pause button in online mode
          document.getElementById("btn-pause")?.classList.add("hidden");

          window.GameSystem.resetGame(true); // Local reset only - DO NOT broadcast
          window.GameSystem.updateCardStyles();
          window.GameSystem.updateStatus("Player 2 joined! You are Player 1 (Blue). Place cards to battle!");

          // Send welcome packet assigning Player 2 and sending custom config & flags
          console.log("[Net] 📤 Sending WELCOME payload to Guest...");
          this.send({
            type: "WELCOME",
            assignedPlayer: 2,
            mana: window.GameState.mana,
            flags: window.GameState.flags,
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
        console.error("[Net] ❌ PeerJS Host Error:", err.type, err);
        if (err.type === "unavailable-id") {
          console.warn("[Net] ⚠️ Peer ID collision, retrying with fresh code...");
          this.hostRoom();
        } else if (err.type === "network" || err.type === "server-error" || err.type === "socket-error") {
          this.updateStatusUI("Signaling server offline. Try again.", "error");
          this.updateHostStatus("Signaling network error. Check internet connection.", "error");
        } else {
          this.updateStatusUI("Host error: " + err.type, "error");
          this.updateHostStatus(`Error: ${err.type || "unknown"}. Try creating room again.`, "error");
        }
      });

      this.peer.on("disconnected", () => {
        console.warn("[Net] ⚠️ Host disconnected from signaling server. Reconnecting...");
        this.peer.reconnect();
      });

      this.peer.on("close", () => {
        console.log("[Net] 🔒 Host peer closed.");
      });
    } catch (e) {
      console.error("[Net] ❌ Host initialization crashed:", e);
      this.updateStatusUI("WebRTC error.", "error");
      this.updateHostStatus("Failed to initialize WebRTC on this browser.", "error");
    }
  },

  /**
   * Join an existing match (Player 2 - Red)
   */
  joinRoom(rawCode) {
    const cleanCode = this.cleanRoomCode(rawCode);
    console.log(`[Net] 🔍 Join requested. Raw input: "${rawCode}", Normalized: "${cleanCode}"`);

    if (!cleanCode || cleanCode.length < 4) {
      this.updateJoinStatus("Please enter a valid 4-character room code or full invite link.", "error");
      return;
    }

    this.disconnect();
    this.setJoinButtonLoading(true);

    this.roomId = cleanCode;
    this.status = "connecting";
    this.updateStatusUI(`Connecting to room ${cleanCode}...`, "waiting");
    this.updateJoinStatus(`Connecting to Host (${cleanCode})... Please wait.`, "waiting");

    const targetPeerId = this.ROOM_PREFIX + cleanCode.toLowerCase();
    console.log(`[Net] 🎯 Target Host Peer ID: ${targetPeerId}`);

    // Set 14-second watchdog timer in case host is offline or ICE hangs
    this.startJoinTimeout(cleanCode);

    try {
      this.peer = new Peer(this.getPeerConfig());

      this.peer.on("open", (myGuestId) => {
        console.log(`[Net] ✅ Guest peer created on signaling cloud (Guest ID: ${myGuestId}). Connecting to host ${targetPeerId}...`);
        
        // Connect to host
        this.conn = this.peer.connect(targetPeerId, {
          reliable: true
        });

        this.setupConnectionHandlers();
        this.monitorPeerConnection(this.conn);

        this.conn.on("open", () => {
          this.clearJoinTimeout();
          this.setJoinButtonLoading(false);
          this.isOnline = true;
          this.isHost = false;
          this.myPlayer = 2; // Guest is always Player 2
          this.status = "connected";

          console.log(`[Net] 🚀 WebRTC DataChannel OPEN! Connected to Host (${targetPeerId}).`);
          this.updateStatusUI(`🟢 Connected to Player 1! (You: Red Team)`, "connected");
          this.updateJoinStatus("Connected! Joining match...", "success");

          setTimeout(() => {
            this.closeLobbyModal();
          }, 600);

          // Hide pause button in online mode
          document.getElementById("btn-pause")?.classList.add("hidden");

          window.GameSystem.resetGame(true); // Local reset only - DO NOT broadcast
          window.GameSystem.updateCardStyles();
          window.GameSystem.updateStatus("Connected to Host! You are Player 2 (Red Team). Waiting for match setup...");
        });
      });

      this.peer.on("error", (err) => {
        console.error("[Net] ❌ PeerJS Guest Error:", err.type, err);
        this.clearJoinTimeout();
        this.resetJoinButton();

        if (err.type === "peer-unavailable") {
          this.updateStatusUI(`Room ${cleanCode} not found`, "error");
          this.updateJoinStatus(`Room "${cleanCode}" was not found. Make sure Host has created the room first and is still waiting!`, "error");
        } else if (err.type === "network" || err.type === "server-error" || err.type === "socket-error") {
          this.updateStatusUI("Signaling network error", "error");
          this.updateJoinStatus("Cannot reach PeerJS signaling server. Check your internet connection.", "error");
        } else {
          this.updateStatusUI("Connection error: " + err.type, "error");
          this.updateJoinStatus(`Connection failed: ${err.type || "unknown error"}.`, "error");
        }
      });

      this.peer.on("disconnected", () => {
        console.warn("[Net] ⚠️ Guest disconnected from signaling server.");
      });
    } catch (e) {
      console.error("[Net] ❌ Guest join crashed:", e);
      this.clearJoinTimeout();
      this.resetJoinButton();
      this.updateStatusUI("WebRTC error.", "error");
      this.updateJoinStatus("Failed to initialize WebRTC connection.", "error");
    }
  },

  /**
   * Monitor underlying RTCPeerConnection ICE states
   */
  monitorPeerConnection(conn) {
    if (!conn) return;

    const attach = () => {
      const pc = conn.peerConnection;
      if (pc && !conn._monitored) {
        conn._monitored = true;
        console.log(`[Net] 🛰️ Underlying RTCPeerConnection active. ICE state: ${pc.iceConnectionState}`);
        
        pc.addEventListener("iceconnectionstatechange", () => {
          console.log(`[Net] 🛰️ ICE Connection State -> ${pc.iceConnectionState}`);
          if (pc.iceConnectionState === "failed") {
            console.error("[Net] ❌ ICE Direct P2P connection failed. NAT traversal was blocked.");
            this.clearJoinTimeout();
            this.resetJoinButton();
            this.updateStatusUI("P2P NAT traversal failed", "error");
            this.updateJoinStatus("Direct peer connection failed due to firewall/NAT restrictions on your mobile/Wi-Fi network.", "error");
          } else if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
            console.log("[Net] ✨ WebRTC direct P2P link established successfully!");
          }
        });
      }
    };

    attach();
    setTimeout(attach, 400);
    setTimeout(attach, 1200);
  },

  /**
   * Watchdog timer to prevent indefinite hanging when connecting to non-existent or blocked host
   */
  startJoinTimeout(cleanCode) {
    this.clearJoinTimeout();
    this.joinTimeoutTimer = setTimeout(() => {
      if (this.status === "connecting" && !this.isOnline) {
        console.warn(`[Net] ⏱️ Join watchdog timeout (14s) reached for room: ${cleanCode}`);
        this.resetJoinButton();
        this.updateJoinStatus(`⚠️ Connection timed out! Check that Host is currently online with room "${cleanCode}" and try again.`, "error");
        this.updateStatusUI(`Connection timed out (${cleanCode})`, "error");
        if (this.conn) {
          try { this.conn.close(); } catch(e) {}
        }
      }
    }, 14000);
  },

  clearJoinTimeout() {
    if (this.joinTimeoutTimer) {
      clearTimeout(this.joinTimeoutTimer);
      this.joinTimeoutTimer = null;
    }
  },

  setJoinButtonLoading(loading) {
    const btn = document.getElementById("btn-join-room");
    if (!btn) return;
    if (loading) {
      btn.disabled = true;
      btn.dataset.origText = btn.textContent;
      btn.textContent = "Connecting... ⏳";
    } else {
      btn.disabled = false;
      if (btn.dataset.origText) {
        btn.textContent = btn.dataset.origText;
      }
    }
  },

  resetJoinButton() {
    this.setJoinButtonLoading(false);
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
      console.warn("[Net] 🔌 DataConnection closed.");
      this.isOnline = false;
      this.status = "offline";
      this.clearJoinTimeout();
      this.resetJoinButton();
      this.updateStatusUI("⚠️ Opponent disconnected. Reverted to Local Mode.", "error");
      window.GameSystem.updateStatus("Opponent left the match. Game paused.");
      if (window.GameState.isStarted) {
        document.getElementById("btn-pause")?.classList.remove("hidden");
      }
      this.stopHostSync();
    });

    this.conn.on("error", (err) => {
      console.error("[Net] ❌ DataConnection error:", err);
      this.clearJoinTimeout();
      this.resetJoinButton();
      this.updateStatusUI("Network error: " + (err.type || "channel"), "error");
      this.updateJoinStatus("Network error occurred during transmission.", "error");
    });
  },

  /**
   * Handle incoming packets from peer
   */
  handleIncomingData(msg) {
    if (!msg || !msg.type) return;
    console.log(`[Net] 📩 Received packet [${msg.type}]:`, msg);

    switch (msg.type) {
      case "WELCOME":
        this.isOnline = true;
        this.myPlayer = msg.assignedPlayer || 2;
        this.updateStatusUI(`🟢 Connected to Host! (You: Red Team)`, "connected");
        if (msg.flags) {
          window.GameState.flags = msg.flags;
          window.ArenaRenderer.updateSummitFlagsUI();
        }
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

      case "FLAG_CLAIM":
        window.GameSystem.claimSummitFlag(msg.player, null, true, msg.flagIdx);
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
        // Sync match time, mana & flags periodically from host
        if (!this.isHost && msg.mana) {
          window.GameState.mana = msg.mana;
          window.GameState.matchTimeSec = msg.matchTimeSec;
          if (msg.flags) {
            window.GameState.flags = msg.flags;
            window.ArenaRenderer.updateSummitFlagsUI();
          }
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
          window.GameSystem.triggerSummitCompletion(msg.winner, msg.p1Count || 0, msg.p2Count || 0, true);
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
        console.log(`[Net] 📤 Sending packet [${data.type}]:`, data);
        this.conn.send(data);
      } catch (e) {
        console.error("[Net] ❌ Network send failed:", e);
      }
    } else {
      console.warn("[Net] ⚠️ Attempted to send packet while DataConnection is not open:", data);
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
          isStarted: window.GameState.isStarted,
          flags: window.GameState.flags
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
    this.clearJoinTimeout();
    this.resetJoinButton();

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
    this.updateHostStatus("");
    this.updateJoinStatus("");

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

  updateHostStatus(text, type = "info") {
    const el = document.getElementById("host-status-msg");
    if (!el) return;
    if (!text) {
      el.className = "lobby-status-msg";
      el.textContent = "";
      return;
    }
    el.className = `lobby-status-msg active ${type}`;
    el.textContent = text;
  },

  updateJoinStatus(text, type = "info") {
    const el = document.getElementById("join-status-msg");
    if (!el) return;
    if (!text) {
      el.className = "lobby-status-msg";
      el.textContent = "";
      return;
    }
    el.className = `lobby-status-msg active ${type}`;
    el.textContent = text;
  },

  openLobbyModal(prefillCode = "") {
    const modal = document.getElementById("online-modal");
    if (modal) {
      modal.classList.add("open");
      this.updateHostStatus("");
      this.updateJoinStatus("");
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
