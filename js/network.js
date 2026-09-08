/**
 * js/network.js - Online Multiplayer powered by Firebase Realtime Database
 * 
 * Replaces WebRTC (PeerJS) with Google Firebase Realtime Database for:
 * - 100% reliable cross-network play across mobile 4G/5G, Wi-Fi, and firewalls
 * - Instant WebSocket event replication (~30-70ms latency)
 * - Zero NAT traversal or Symmetric CGNAT connection timeouts
 * - Automatic disconnect detection via Firebase onDisconnect()
 * - Preserves existing BOD-XXXX room codes, shareable invite links, and battle flow
 */

window.Network = {
  // Network state
  isOnline: false,
  isHost: false,
  myPlayer: null, // 1 (Blue) or 2 (Red), or null for local 2-player
  roomId: null,
  status: "offline", // "offline" | "hosting" | "connecting" | "connected"
  
  // Firebase references & listeners
  db: null,
  roomRef: null,
  actionsRef: null,
  syncRef: null,
  syncTimer: null,
  matchStartTime: 0,
  activeListeners: [],

  // Firebase project configuration
  firebaseConfig: {
    apiKey: "AIzaSyDXi7b1AQrh-8JJ56YFc8Cb17ANjsPnSlI",
    authDomain: "bombs-or-dolls.firebaseapp.com",
    databaseURL: "https://bombs-or-dolls-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "bombs-or-dolls",
    storageBucket: "bombs-or-dolls.firebasestorage.app",
    messagingSenderId: "152507461295",
    appId: "1:152507461295:web:1f353e210066f4751d6e5a"
  },

  /**
   * Initialize Firebase SDK and check for auto-join URL parameters
   */
  init() {
    console.log("[Firebase Net] 🔥 Initializing Firebase Realtime Database multiplayer...");

    try {
      if (typeof firebase !== "undefined") {
        if (!firebase.apps.length) {
          firebase.initializeApp(this.firebaseConfig);
        }
        this.db = firebase.database();
        console.log("[Firebase Net] ✅ Firebase Realtime Database connected:", this.firebaseConfig.databaseURL);
      } else {
        console.error("[Firebase Net] ❌ Firebase SDK not found in global scope.");
      }
    } catch (e) {
      console.error("[Firebase Net] ❌ Firebase initialization error:", e);
    }

    // Auto-join from URL parameter ?room=XYZ
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get("room");
    if (roomParam) {
      const code = this.cleanRoomCode(roomParam);
      console.log(`[Firebase Net] 🔗 Auto-join URL detected room: ${roomParam} -> ${code}`);
      setTimeout(() => {
        this.openLobbyModal(code);
      }, 300);
    }
  },

  /**
   * Normalizes whatever the user entered or pasted (raw code, full URL, etc.)
   */
  cleanRoomCode(raw) {
    if (!raw) return null;
    let str = String(raw).trim();
    if (!str) return null;

    if (str.includes("?")) {
      try {
        const queryPart = str.split("?")[1];
        const params = new URLSearchParams(queryPart);
        if (params.has("room")) {
          str = params.get("room").trim();
        }
      } catch (e) {
        console.warn("[Firebase Net] Failed to parse URL parameters:", e);
      }
    }

    str = str.replace(/^[/#?]+/, "").trim().toUpperCase();

    if (str.startsWith("BOD-")) {
      return str;
    }

    const match = str.match(/[A-Z0-9]{4}/);
    if (match) {
      return "BOD-" + match[0];
    }

    return str;
  },

  /**
   * Host a new online match (Player 1 - Blue)
   */
  hostRoom() {
    this.disconnect();

    if (!this.db) {
      this.updateHostStatus("Firebase database not initialized.", "error");
      return;
    }

    // Generate 4-character random room code
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "BOD-";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    this.roomId = code;
    this.status = "hosting";
    this.isHost = true;
    this.myPlayer = 1;

    console.log(`[Firebase Net] 🏠 Creating room in Firebase: /rooms/${code}`);
    this.updateStatusUI("Creating Firebase room...", "waiting");
    this.updateHostStatus("Registering room in Google Firebase Cloud...", "waiting");

    this.roomRef = this.db.ref("rooms/" + code);
    this.actionsRef = this.roomRef.child("actions");
    this.syncRef = this.roomRef.child("sync");

    const initialRoomData = {
      code: code,
      status: "waiting",
      hostOnline: true,
      guestOnline: false,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      config: {
        startMana: window.GameConfig.MANA.START,
        regenRate: window.GameConfig.MANA.REGEN_PER_SECOND,
        speedMultiplier: window.GameConfig.speedMultiplier,
        cardCosts: window.GameConfig.getCurrentCosts()
      },
      flags: window.GameState.flags || [0, 0, 0, 0, 0, 0, 0, 0]
    };

    this.roomRef.set(initialRoomData)
      .then(() => {
        console.log(`[Firebase Net] ✅ Room /rooms/${code} created successfully.`);
        this.updateStatusUI(`Waiting for Player 2... Room: ${this.roomId}`, "waiting");
        this.updateHostStatus(`Ready! Share the code or link with your friend.`, "waiting");
        this.updateLobbyUIHost(this.roomId);

        // Configure auto-cleanup if host disconnects
        this.roomRef.child("hostOnline").onDisconnect().set(false);
        this.roomRef.child("status").onDisconnect().set("closed");

        // Listen for Guest joining
        const guestOnlineRef = this.roomRef.child("guestOnline");
        const onGuestChange = guestOnlineRef.on("value", (snap) => {
          const isGuestJoined = snap.val();
          if (isGuestJoined && !this.isOnline) {
            console.log(`[Firebase Net] 👥 Player 2 has joined room ${code}!`);
            this.handleGuestConnected();
          } else if (isGuestJoined === false && this.isOnline) {
            console.warn(`[Firebase Net] ⚠️ Player 2 disconnected.`);
            this.updateStatusUI("⚠️ Player 2 left the match.", "error");
            window.GameSystem.updateStatus("Player 2 disconnected. Game paused.");
          }
        });
        this.activeListeners.push({ ref: guestOnlineRef, event: "value", callback: onGuestChange });

        // Listen for actions sent by Guest
        this.matchStartTime = Date.now();
        const onActionAdded = this.actionsRef.on("child_added", (snap) => {
          const action = snap.val();
          if (!action) return;
          // Only process actions dispatched by the opponent (Player 2)
          if (action.player === 2) {
            console.log(`[Firebase Net] 📩 Received action from Player 2 [${action.type}]:`, action);
            this.handleIncomingData(action);
          }
        });
        this.activeListeners.push({ ref: this.actionsRef, event: "child_added", callback: onActionAdded });
      })
      .catch((err) => {
        console.error("[Firebase Net] ❌ Failed to create room in Firebase:", err);
        this.updateStatusUI("Firebase error.", "error");
        this.updateHostStatus("Failed to create room. Check Firebase database rules.", "error");
      });
  },

  /**
   * Called when Guest joins the host's room
   */
  handleGuestConnected() {
    this.isOnline = true;
    this.status = "connected";
    this.updateStatusUI(`🟢 Connected to Player 2! (You: Blue Team)`, "connected");
    this.updateHostStatus("Connected to Player 2! Launching match...", "success");

    setTimeout(() => {
      this.closeLobbyModal();
    }, 600);

    // Hide pause button in online mode
    document.getElementById("btn-pause")?.classList.add("hidden");

    window.GameSystem.resetGame(true); // Local reset only - DO NOT broadcast
    window.GameSystem.updateCardStyles();
    window.GameSystem.updateStatus("Player 2 joined! You are Player 1 (Blue). Place cards to battle!");

    // Send welcome packet with current game configs and flags
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

    // Start host sync heartbeat to keep match time and mana in sync
    this.startHostSync();
  },

  /**
   * Join an existing match (Player 2 - Red)
   */
  joinRoom(rawCode) {
    const cleanCode = this.cleanRoomCode(rawCode);
    console.log(`[Firebase Net] 🔍 Join requested. Input: "${rawCode}" -> "${cleanCode}"`);

    if (!cleanCode || cleanCode.length < 4) {
      this.updateJoinStatus("Please enter a valid 4-character room code or full invite link.", "error");
      return;
    }

    if (!this.db) {
      this.updateJoinStatus("Firebase database not initialized.", "error");
      return;
    }

    this.disconnect();
    this.setJoinButtonLoading(true);

    this.roomId = cleanCode;
    this.status = "connecting";
    this.updateStatusUI(`Connecting to room ${cleanCode}...`, "waiting");
    this.updateJoinStatus(`Connecting to room ${cleanCode} in Firebase...`, "waiting");

    const targetRoomRef = this.db.ref("rooms/" + cleanCode);

    // Check if room exists in Firebase
    targetRoomRef.once("value")
      .then((snap) => {
        if (!snap.exists()) {
          console.warn(`[Firebase Net] ⚠️ Room /rooms/${cleanCode} does not exist in Firebase.`);
          this.resetJoinButton();
          this.updateStatusUI(`Room ${cleanCode} not found`, "error");
          this.updateJoinStatus(
            `⚠️ <strong>Room "${cleanCode}" was not found.</strong><br>` +
            `<div style="margin-top:6px; font-size:12px; line-height:1.4; text-align:left; opacity:0.95;">` +
            `• Ensure Host has clicked <strong>Host Match</strong> first.<br>` +
            `• Check that the room code is typed correctly.` +
            `</div>`,
            "error"
          );
          return;
        }

        const roomData = snap.val();

        if (roomData.guestOnline === true) {
          console.warn(`[Firebase Net] ⚠️ Room ${cleanCode} is already full.`);
          this.resetJoinButton();
          this.updateStatusUI("Room already full", "error");
          this.updateJoinStatus("This room already has 2 players connected!", "error");
          return;
        }

        console.log(`[Firebase Net] ✅ Room ${cleanCode} found! Registering as Player 2...`);
        this.roomRef = targetRoomRef;
        this.actionsRef = this.roomRef.child("actions");
        this.syncRef = this.roomRef.child("sync");

        this.isHost = false;
        this.isOnline = true;
        this.myPlayer = 2; // Guest is always Player 2
        this.status = "connected";

        // Mark guest as online in Firebase
        this.roomRef.child("guestOnline").set(true);
        this.roomRef.child("guestOnline").onDisconnect().set(false);
        this.roomRef.child("status").set("playing");

        // Apply host's custom configs and flags if present
        if (roomData.flags) {
          window.GameState.flags = roomData.flags;
          window.ArenaRenderer.updateSummitFlagsUI();
        }
        if (roomData.config) {
          window.GameConfig.applySettings(roomData.config, false);
          window.GameSystem.renderCardsUI();
          window.GameSystem.updateManaUI();
        }

        this.resetJoinButton();
        this.updateStatusUI(`🟢 Connected to Player 1! (You: Red Team)`, "connected");
        this.updateJoinStatus("Connected! Joining match...", "success");

        setTimeout(() => {
          this.closeLobbyModal();
        }, 600);

        // Hide pause button in online mode
        document.getElementById("btn-pause")?.classList.add("hidden");

        window.GameSystem.resetGame(true); // Local reset only - DO NOT broadcast
        window.GameSystem.updateCardStyles();
        window.GameSystem.updateStatus("Connected to Host! You are Player 2 (Red Team). Place cards to battle!");

        // Listen for Host actions
        this.matchStartTime = Date.now();
        const onActionAdded = this.actionsRef.on("child_added", (actionSnap) => {
          const action = actionSnap.val();
          if (!action) return;
          // Only process actions dispatched by the Host (Player 1)
          if (action.player === 1) {
            console.log(`[Firebase Net] 📩 Received action from Player 1 [${action.type}]:`, action);
            this.handleIncomingData(action);
          }
        });
        this.activeListeners.push({ ref: this.actionsRef, event: "child_added", callback: onActionAdded });

        // Listen for Host periodic sync heartbeat
        const onSyncUpdate = this.syncRef.on("value", (syncSnap) => {
          const syncData = syncSnap.val();
          if (syncData) {
            this.handleIncomingData({
              type: "SYNC",
              ...syncData
            });
          }
        });
        this.activeListeners.push({ ref: this.syncRef, event: "value", callback: onSyncUpdate });

        // Listen if Host leaves
        const hostOnlineRef = this.roomRef.child("hostOnline");
        const onHostChange = hostOnlineRef.on("value", (hostSnap) => {
          const isHostOnline = hostSnap.val();
          if (isHostOnline === false && this.isOnline) {
            console.warn("[Firebase Net] ⚠️ Host disconnected.");
            this.updateStatusUI("⚠️ Host left the match.", "error");
            window.GameSystem.updateStatus("Host left the match. Game paused.");
          }
        });
        this.activeListeners.push({ ref: hostOnlineRef, event: "value", callback: onHostChange });
      })
      .catch((err) => {
        console.error("[Firebase Net] ❌ Join error:", err);
        this.resetJoinButton();
        this.updateStatusUI("Connection error.", "error");
        this.updateJoinStatus("Failed to connect to Firebase. Check internet connection.", "error");
      });
  },

  /**
   * Push an action packet to the room's /actions path in Firebase
   */
  send(data) {
    if (!this.actionsRef || !this.isOnline) {
      console.warn("[Firebase Net] ⚠️ Cannot send packet while offline or not connected:", data);
      return;
    }

    try {
      const packet = {
        ...data,
        player: data.player !== undefined ? data.player : this.myPlayer,
        timestamp: firebase.database.ServerValue.TIMESTAMP
      };
      console.log(`[Firebase Net] 📤 Broadcasting packet [${packet.type}]:`, packet);
      this.actionsRef.push(packet);
    } catch (e) {
      console.error("[Firebase Net] ❌ Failed to push packet to Firebase:", e);
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
      if (this.isOnline && this.syncRef) {
        try {
          this.syncRef.set({
            mana: [
              parseFloat(window.GameState.mana[0].toFixed(2)),
              parseFloat(window.GameState.mana[1].toFixed(2))
            ],
            matchTimeSec: window.GameState.matchTimeSec,
            isStarted: window.GameState.isStarted,
            flags: window.GameState.flags,
            timestamp: Date.now()
          });
        } catch (e) {
          console.warn("[Firebase Net] Sync heartbeat error:", e);
        }
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
   * Handle incoming packets from peer
   */
  handleIncomingData(msg) {
    if (!msg || !msg.type) return;

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
   * Disconnect and return to local mode
   */
  disconnect() {
    this.stopHostSync();

    // Detach active Firebase listeners
    if (this.activeListeners && this.activeListeners.length > 0) {
      this.activeListeners.forEach(({ ref, event, callback }) => {
        try {
          ref.off(event, callback);
        } catch (e) {}
      });
      this.activeListeners = [];
    }

    // Clean up room state in Firebase
    if (this.roomRef) {
      try {
        if (this.isHost) {
          this.roomRef.child("hostOnline").set(false);
          this.roomRef.child("status").set("closed");
        } else {
          this.roomRef.child("guestOnline").set(false);
        }
      } catch (e) {}
      this.roomRef = null;
    }

    this.actionsRef = null;
    this.syncRef = null;
    this.isOnline = false;
    this.isHost = false;
    this.myPlayer = null;
    this.roomId = null;
    this.status = "offline";
    this.resetJoinButton();

    this.updateStatusUI("👥 2-Player Local", "offline");
    this.updateHostStatus("");
    this.updateJoinStatus("");

    if (window.GameState?.isStarted) {
      document.getElementById("btn-pause")?.classList.remove("hidden");
    } else {
      document.getElementById("btn-pause")?.classList.add("hidden");
    }
    window.GameSystem?.updateCardStyles();
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
      el.innerHTML = "";
      return;
    }
    el.className = `lobby-status-msg active ${type}`;
    el.innerHTML = text;
  },

  updateJoinStatus(text, type = "info") {
    const el = document.getElementById("join-status-msg");
    if (!el) return;
    if (!text) {
      el.className = "lobby-status-msg";
      el.innerHTML = "";
      return;
    }
    el.className = `lobby-status-msg active ${type}`;
    el.innerHTML = text;
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

// Initialize Firebase subsystem on load
window.addEventListener("DOMContentLoaded", () => {
  window.Network.init();
});
