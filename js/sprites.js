/**
 * js/sprites.js - High-Quality Cartoon Stickfigure & Bomb Vector Sprites
 * 
 * Provides responsive, scalable SVG illustrations for:
 * - Hikers (Small, Sumo, Attack, Doctor) styled as charismatic cartoon stickfigures
 *   with distinct silhouettes, accessories, and player team colors (P1 Blue / P2 Red)
 * - Bombs (Instant Kill, Timer Bomb, Area Bomb, Shock Bomb) with animated/styled fuses
 */

window.Sprites = {
  /**
   * Get SVG sprite for a Hiker unit
   * @param {string} type 'small' | 'sumo' | 'attack' | 'doctor'
   * @param {number} player 1 (Blue) | 2 (Red)
   * @param {object} opts optional state like stunned
   */
  getHiker(type, player = 1, opts = {}) {
    const teamColor = player === 1 ? "#0284c7" : "#e11d48";
    const teamLight = player === 1 ? "#38bdf8" : "#fb7185";
    const teamBg = player === 1 ? "#e0f2fe" : "#ffe4e6";
    const headColor = "#1e293b";

    if (type === "small") {
      // Small Hiker: Fast running stickfigure with headband & backpack
      return `
      <svg viewBox="0 0 64 64" class="sprite-svg hiker-small" xmlns="http://www.w3.org/2000/svg">
        <!-- Team Glow Base -->
        <ellipse cx="32" cy="59" rx="16" ry="4" fill="${teamColor}" opacity="0.25"/>
        
        <!-- Backpack -->
        <rect x="18" y="24" width="10" height="15" rx="3" fill="${teamLight}" stroke="#1e293b" stroke-width="2"/>
        <line x1="20" y1="28" x2="26" y2="28" stroke="#1e293b" stroke-width="1.5"/>

        <!-- Running Legs -->
        <path d="M30 40 L22 56 M34 40 L44 54" stroke="${headColor}" stroke-width="3.5" stroke-linecap="round"/>
        <!-- Sneakers -->
        <ellipse cx="20" cy="57" rx="4" ry="2.5" fill="${teamColor}"/>
        <ellipse cx="45" cy="55" rx="4" ry="2.5" fill="${teamColor}"/>

        <!-- Stick Torso -->
        <line x1="32" y1="22" x2="32" y2="41" stroke="${headColor}" stroke-width="4" stroke-linecap="round"/>

        <!-- Running Arms -->
        <path d="M32 26 L44 22 L48 30 M32 26 L22 32 L16 26" stroke="${headColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>

        <!-- Cartoon Head -->
        <circle cx="34" cy="15" r="9" fill="#fef08a" stroke="${headColor}" stroke-width="2.5"/>
        
        <!-- Big Cartoon Eyes -->
        <ellipse cx="32" cy="14" rx="2" ry="2.8" fill="#1e293b"/>
        <ellipse cx="37" cy="14" rx="2" ry="2.8" fill="#1e293b"/>
        <circle cx="33" cy="13" r="0.8" fill="#fff"/>
        <circle cx="38" cy="13" r="0.8" fill="#fff"/>
        <!-- Smile -->
        <path d="M33 19 Q35 22 38 19" stroke="#1e293b" stroke-width="1.5" fill="none" stroke-linecap="round"/>

        <!-- Team Headband with Fluttering Tails -->
        <path d="M25 12 Q34 10 43 12" stroke="${teamColor}" stroke-width="3.5" fill="none"/>
        <path d="M25 12 L17 9 M25 13 L16 15" stroke="${teamColor}" stroke-width="2.5" stroke-linecap="round"/>
      </svg>`;
    }

    if (type === "sumo") {
      // Sumo Hiker: Huge round bulky stickfigure, topknot, mawashi belt
      return `
      <svg viewBox="0 0 64 64" class="sprite-svg hiker-sumo" xmlns="http://www.w3.org/2000/svg">
        <!-- Team Glow Base -->
        <ellipse cx="32" cy="60" rx="22" ry="4" fill="${teamColor}" opacity="0.3"/>

        <!-- Sturdy Thick Legs -->
        <path d="M23 44 L16 57 M41 44 L48 57" stroke="${headColor}" stroke-width="6" stroke-linecap="round"/>
        <rect x="11" y="55" width="10" height="4" rx="2" fill="${headColor}"/>
        <rect x="43" y="55" width="10" height="4" rx="2" fill="${headColor}"/>

        <!-- Big Round Sumo Belly/Body -->
        <circle cx="32" cy="34" r="16" fill="#fef08a" stroke="${headColor}" stroke-width="3"/>
        
        <!-- Sumo Mawashi Belt -->
        <rect x="18" y="36" width="28" height="8" rx="2" fill="${teamColor}" stroke="${headColor}" stroke-width="2"/>
        <rect x="28" y="44" width="8" height="6" fill="${teamLight}" stroke="${headColor}" stroke-width="1.5"/>

        <!-- Heavy Muscle Arms (Akira pose) -->
        <path d="M19 28 L8 34 L12 44" stroke="${headColor}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M45 28 L56 34 L52 44" stroke="${headColor}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>

        <!-- Sumo Head -->
        <circle cx="32" cy="14" r="9" fill="#fef08a" stroke="${headColor}" stroke-width="2.5"/>
        <!-- Topknot (Chonmage) -->
        <ellipse cx="32" cy="5" rx="4" ry="2.5" fill="${headColor}"/>
        <line x1="32" y1="5" x2="32" y2="8" stroke="${teamColor}" stroke-width="3"/>

        <!-- Fierce Sumo Eyes -->
        <path d="M27 12 L31 14 M37 14 L33 12" stroke="${headColor}" stroke-width="2" stroke-linecap="round"/>
        <circle cx="29" cy="14.5" r="1.5" fill="#1e293b"/>
        <circle cx="35" cy="14.5" r="1.5" fill="#1e293b"/>
        <!-- Grunt Mouth -->
        <path d="M29 18 Q32 17 35 18" stroke="#1e293b" stroke-width="2" fill="none"/>
      </svg>`;
    }

    if (type === "attack") {
      // Attack Hiker: Agile warrior stickfigure with dual swords & battle mask
      return `
      <svg viewBox="0 0 64 64" class="sprite-svg hiker-attack" xmlns="http://www.w3.org/2000/svg">
        <!-- Team Glow Base -->
        <ellipse cx="32" cy="59" rx="16" ry="4" fill="${teamColor}" opacity="0.25"/>

        <!-- Left Sword (drawn back) -->
        <line x1="6" y1="12" x2="22" y2="28" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>
        <line x1="17" y1="23" x2="23" y2="29" stroke="#cbd5e1" stroke-width="1.5"/>
        <line x1="20" y1="26" x2="23" y2="23" stroke="${teamColor}" stroke-width="4"/>

        <!-- Right Sword (slashing up) -->
        <line x1="58" y1="10" x2="42" y2="26" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>
        <line x1="53" y1="15" x2="47" y2="21" stroke="#cbd5e1" stroke-width="1.5"/>
        <line x1="44" y1="24" x2="41" y2="27" stroke="${teamColor}" stroke-width="4"/>

        <!-- Athletic Legs -->
        <path d="M29 39 L20 54 M35 39 L42 54" stroke="${headColor}" stroke-width="3.5" stroke-linecap="round"/>
        <ellipse cx="18" cy="55" rx="3.5" ry="2" fill="${headColor}"/>
        <ellipse cx="44" cy="55" rx="3.5" ry="2" fill="${headColor}"/>

        <!-- Torso with Battle Scarf -->
        <line x1="32" y1="22" x2="32" y2="40" stroke="${headColor}" stroke-width="4" stroke-linecap="round"/>
        <path d="M26 23 Q32 28 38 23" stroke="${teamColor}" stroke-width="5" fill="none" stroke-linecap="round"/>

        <!-- Attack Arms holding swords -->
        <path d="M32 25 L20 27 M32 25 L44 25" stroke="${headColor}" stroke-width="3.5" stroke-linecap="round"/>

        <!-- Warrior Head -->
        <circle cx="32" cy="14" r="8.5" fill="#fef08a" stroke="${headColor}" stroke-width="2.5"/>
        
        <!-- Team Bandana Mask -->
        <rect x="24" y="14" width="16" height="7" rx="3" fill="${teamColor}" stroke="${headColor}" stroke-width="1.5"/>
        <!-- Fierce Eyes above mask -->
        <line x1="27" y1="12" x2="30" y2="13" stroke="${headColor}" stroke-width="2" stroke-linecap="round"/>
        <line x1="37" y1="12" x2="34" y2="13" stroke="${headColor}" stroke-width="2" stroke-linecap="round"/>
        <circle cx="29" cy="13.5" r="1.2" fill="#1e293b"/>
        <circle cx="35" cy="13.5" r="1.2" fill="#1e293b"/>
      </svg>`;
    }

    if (type === "doctor") {
      // Doctor Hiker: Medic stickfigure with red-cross cap, stethoscope, med bag
      return `
      <svg viewBox="0 0 64 64" class="sprite-svg hiker-doctor" xmlns="http://www.w3.org/2000/svg">
        <!-- Team Glow Base -->
        <ellipse cx="32" cy="59" rx="16" ry="4" fill="${teamColor}" opacity="0.25"/>

        <!-- Medicine First Aid Bag -->
        <rect x="41" y="32" width="15" height="12" rx="3" fill="#ffffff" stroke="${headColor}" stroke-width="2"/>
        <line x1="48.5" y1="35" x2="48.5" y2="41" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="45.5" y1="38" x2="51.5" y2="38" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>

        <!-- Walking Legs -->
        <path d="M30 40 L25 56 M34 40 L38 56" stroke="${headColor}" stroke-width="3.5" stroke-linecap="round"/>
        <ellipse cx="24" cy="57" rx="3.5" ry="2" fill="${headColor}"/>
        <ellipse cx="39" cy="57" rx="3.5" ry="2" fill="${headColor}"/>

        <!-- Torso in Lab Coat -->
        <rect x="26" y="24" width="12" height="17" rx="2" fill="#ffffff" stroke="${headColor}" stroke-width="2.5"/>
        <line x1="32" y1="24" x2="32" y2="41" stroke="${teamColor}" stroke-width="2"/>

        <!-- Arms holding bag -->
        <path d="M26 27 L18 36 M38 27 L43 34" stroke="${headColor}" stroke-width="3" stroke-linecap="round"/>

        <!-- Doctor Head -->
        <circle cx="32" cy="14" r="8.5" fill="#fef08a" stroke="${headColor}" stroke-width="2.5"/>
        
        <!-- Doctor Mirror / Nurse Hat with Cross -->
        <path d="M24 10 Q32 6 40 10 L40 6 Q32 2 24 6 Z" fill="#ffffff" stroke="${headColor}" stroke-width="1.5"/>
        <line x1="32" y1="4" x2="32" y2="8" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>
        <line x1="30" y1="6" x2="34" y2="6" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>

        <!-- Friendly Doctor Glasses -->
        <circle cx="28.5" cy="14.5" r="3" fill="none" stroke="${headColor}" stroke-width="1.5"/>
        <circle cx="35.5" cy="14.5" r="3" fill="none" stroke="${headColor}" stroke-width="1.5"/>
        <line x1="31.5" y1="14.5" x2="32.5" y2="14.5" stroke="${headColor}" stroke-width="1.5"/>
        <circle cx="28.5" cy="14.5" r="1" fill="#1e293b"/>
        <circle cx="35.5" cy="14.5" r="1" fill="#1e293b"/>

        <!-- Gentle Smile -->
        <path d="M30 19 Q32 21 34 19" stroke="#1e293b" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      </svg>`;
    }

    return "";
  },

  /**
   * Get SVG sprite for a Bomb weapon
   * @param {string} type 'instant' | 'timer' | 'area' | 'shock'
   * @param {number} player 1 | 2
   */
  getBomb(type, player = 1) {
    const teamColor = player === 1 ? "#0284c7" : "#e11d48";

    if (type === "instant") {
      // Classic cartoon skull bomb with sparking wick
      return `
      <svg viewBox="0 0 64 64" class="sprite-svg bomb-instant" xmlns="http://www.w3.org/2000/svg">
        <!-- Sparking wick -->
        <path d="M36 14 Q44 6 48 10" stroke="#f59e0b" stroke-width="3" fill="none" stroke-linecap="round"/>
        <!-- Star spark -->
        <polygon points="48,5 50,9 54,9 51,12 52,16 48,13 44,16 45,12 42,9 46,9" fill="#ef4444"/>
        <circle cx="48" cy="10" r="2.5" fill="#fef08a"/>

        <!-- Bomb collar -->
        <rect x="28" y="13" width="8" height="5" rx="1.5" fill="#475569" stroke="#0f172a" stroke-width="1.5"/>

        <!-- Bomb Body -->
        <circle cx="32" cy="37" r="21" fill="#1e293b" stroke="#0f172a" stroke-width="3"/>
        <!-- Gloss highlight -->
        <ellipse cx="23" cy="28" rx="5" ry="3" fill="#ffffff" opacity="0.35" transform="rotate(-35 23 28)"/>

        <!-- Cartoon Skull Emblem -->
        <circle cx="32" cy="36" r="8" fill="#ffffff"/>
        <rect x="29" y="41" width="6" height="4" rx="1" fill="#ffffff"/>
        <!-- Skull Eyes & Nose -->
        <ellipse cx="29.5" cy="35" rx="2" ry="2.5" fill="#0f172a"/>
        <ellipse cx="34.5" cy="35" rx="2" ry="2.5" fill="#0f172a"/>
        <polygon points="32,39 31,41 33,41" fill="#0f172a"/>
        <!-- Teeth -->
        <line x1="30" y1="44" x2="30" y2="45" stroke="#0f172a" stroke-width="1"/>
        <line x1="32" y1="44" x2="32" y2="45" stroke="#0f172a" stroke-width="1"/>
        <line x1="34" y1="44" x2="34" y2="45" stroke="#0f172a" stroke-width="1"/>
      </svg>`;
    }

    if (type === "timer") {
      // Dynamite bundle with digital countdown clock display
      return `
      <svg viewBox="0 0 64 64" class="sprite-svg bomb-timer" xmlns="http://www.w3.org/2000/svg">
        <!-- 3 Dynamite Sticks -->
        <rect x="14" y="20" width="10" height="34" rx="3" fill="#dc2626" stroke="#991b1b" stroke-width="2"/>
        <rect x="26" y="16" width="12" height="38" rx="3" fill="#ef4444" stroke="#991b1b" stroke-width="2"/>
        <rect x="40" y="20" width="10" height="34" rx="3" fill="#dc2626" stroke="#991b1b" stroke-width="2"/>

        <!-- Wires on top -->
        <path d="M19 20 Q24 10 32 16" stroke="#1e293b" stroke-width="2" fill="none"/>
        <path d="M45 20 Q40 10 32 16" stroke="#1e293b" stroke-width="2" fill="none"/>
        <circle cx="32" cy="14" r="3" fill="#fbbf24" stroke="#b45309" stroke-width="1.5"/>

        <!-- Black Strapping Tape -->
        <rect x="12" y="25" width="40" height="5" fill="#1e293b"/>
        <rect x="12" y="44" width="40" height="5" fill="#1e293b"/>

        <!-- Digital Timer Display Box -->
        <rect x="16" y="31" width="32" height="15" rx="3" fill="#0f172a" stroke="#475569" stroke-width="2"/>
        <!-- LED Clock Icon / Digits -->
        <text x="32" y="42" font-family="'Courier New', monospace" font-size="11" font-weight="900" fill="#ef4444" text-anchor="middle" letter-spacing="1">⏱03</text>
      </svg>`;
    }

    if (type === "area") {
      // Spiky Cartoon Naval Mine / Hazard Bomb
      return `
      <svg viewBox="0 0 64 64" class="sprite-svg bomb-area" xmlns="http://www.w3.org/2000/svg">
        <!-- Blast Wave Ring -->
        <circle cx="32" cy="32" r="28" fill="none" stroke="#f97316" stroke-width="2" stroke-dasharray="4,4" opacity="0.6"/>

        <!-- Mine Spikes -->
        <line x1="32" y1="4" x2="32" y2="60" stroke="#334155" stroke-width="5" stroke-linecap="round"/>
        <line x1="4" y1="32" x2="60" y2="32" stroke="#334155" stroke-width="5" stroke-linecap="round"/>
        <line x1="12" y1="12" x2="52" y2="52" stroke="#334155" stroke-width="5" stroke-linecap="round"/>
        <line x1="12" y1="52" x2="52" y2="12" stroke="#334155" stroke-width="5" stroke-linecap="round"/>

        <!-- Yellow Hazard Spike Tips -->
        <circle cx="32" cy="5" r="3" fill="#f59e0b"/>
        <circle cx="32" cy="59" r="3" fill="#f59e0b"/>
        <circle cx="5" cy="32" r="3" fill="#f59e0b"/>
        <circle cx="59" cy="32" r="3" fill="#f59e0b"/>

        <!-- Main Bomb Sphere -->
        <circle cx="32" cy="32" r="18" fill="#1e293b" stroke="#0f172a" stroke-width="2.5"/>
        
        <!-- Hazard Warning Stripes Center -->
        <circle cx="32" cy="32" r="11" fill="#f59e0b"/>
        <!-- Radiation/Blast Triangles -->
        <polygon points="32,24 29,30 35,30" fill="#0f172a"/>
        <polygon points="25,36 30,32 27,38" fill="#0f172a"/>
        <polygon points="39,36 34,32 37,38" fill="#0f172a"/>
        <circle cx="32" cy="32" r="3" fill="#f59e0b"/>
        <circle cx="32" cy="32" r="1.5" fill="#0f172a"/>
      </svg>`;
    }

    if (type === "shock") {
      // Electric EMP Shock Sphere with Lightning Arcs
      return `
      <svg viewBox="0 0 64 64" class="sprite-svg bomb-shock" xmlns="http://www.w3.org/2000/svg">
        <!-- Electric Aura -->
        <circle cx="32" cy="32" r="26" fill="#38bdf8" opacity="0.2"/>
        <circle cx="32" cy="32" r="22" fill="#0284c7" opacity="0.25"/>

        <!-- Crackling Lightning Bolts around sphere -->
        <path d="M12 24 L22 28 L18 36 L26 38" stroke="#38bdf8" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M52 24 L42 28 L46 36 L38 38" stroke="#38bdf8" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M26 12 L30 20 L24 22 L32 28" stroke="#38bdf8" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>

        <!-- High-tech Battery / Energy Sphere -->
        <circle cx="32" cy="32" r="16" fill="#0369a1" stroke="#0c4a6e" stroke-width="2.5"/>
        <circle cx="32" cy="32" r="10" fill="#e0f2fe"/>

        <!-- Center Golden Lightning Bolt -->
        <polygon points="33,23 27,33 32,33 30,41 38,30 33,30" fill="#fbbf24" stroke="#d97706" stroke-width="1.5"/>
      </svg>`;
    }

    return "";
  }
};
