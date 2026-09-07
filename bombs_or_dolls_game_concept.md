# Bombs or Dolls

## Game Concept

**Bombs or Dolls** is a real-time 2D PvP mountain-climbing battle game.

Two players compete on opposite sides of a vertical mountain. Each player controls a team of different hikers and bombs. The objective is to get your characters to the peak while stopping the opponent from doing the same.

The game is **real-time**, not turn-based. Both players can act at the same time.

---

## Core Gameplay

Each player has a collection of character and bomb cards.

Players:

1. Choose a character or bomb.
2. Spend the required mana.
3. Place it on a valid location on the mountain.
4. The character begins climbing immediately.
5. Characters interact with enemy characters as they climb.
6. Bombs can damage, disable, or control enemy characters.
7. Mana slowly regenerates over time.
8. Players continuously decide how to spend their limited mana.

The main strategic decision is:

> **Do I spend my mana now, or save it for a stronger action later?**

---

## Arena

The battlefield is a vertical mountain represented by a grid.

### Layout

- Player 1 starts at the bottom.
- Player 2 starts at the bottom too.
- The peak is at the far end of the mountain.
- Both players climb toward the same peak.
- The mountain is divided into grid cells.
- Characters occupy cells while climbing.
- Characters can block or interact with other characters.

The arena is designed for a simple 2D side/front view and should remain easy to understand on a mobile screen.

in the real game, there will be a slingshot shooter for those bombes and characte rplacement. we use this to validate game core loop working. and check if it s fun. 

---

## Real-Time System

There are **no turns**.

Both players are active simultaneously.

A player can:

- Select a card at any time.
- Place a character when they have enough mana.
- Place bombs strategically.
- React to enemy movement.
- Save mana for an important moment.

Characters continue moving after they are deployed.

This creates constant pressure because players must decide when to spend mana rather than waiting for a turn.

---

## Mana

Mana is the main limited resource.

Each player has their own mana pool.

### Mana rules

- Every character and bomb has a mana cost.
- Mana regenerates automatically over time.
- Mana cannot exceed the maximum mana capacity.
- Stronger units and bombs cost more mana.
- Players must choose between using mana immediately or saving it.

Example:

| Action | Mana Cost |
|---|---:|
| Small Hiker | 2 |
| Sumo Hiker | 3 |
| Attack Hiker | 3 |
| Doctor Hiker | 3 |
| Instant Killer | 3 |
| Timer Bomb | 2 |
| Area Bomb | 3 |
| Electric Shock | 2 |

These values are starting values and should be balanced through testing.

---

# Characters

## 1. Small Hiker

**Role:** Fast climber

- Low health
- Fast movement
- Good for quickly pushing toward the peak
- Easy to kill

The Small Hiker is useful when a player wants to create immediate climbing pressure.

---

## 2. Sumo Hiker

**Role:** Tank / blocker

- Very high health
- Slow movement
- Occupies significant space
- Difficult to remove
- Can block enemy movement

The Sumo Hiker is mainly used to control important areas of the mountain and prevent the opponent from advancing easily.

---

## 3. Attack Hiker

**Role:** Combat unit

- Medium health
- Medium movement speed
- Can damage nearby enemy hikers
- Useful for clearing a path

The Attack Hiker is the main offensive character.

---

## 4. Doctor Hiker

**Role:** Support

- Low health
- Slow movement
- Heals nearby friendly hikers
- Vulnerable when left alone

The Doctor encourages players to keep groups of hikers together.

---

# Bombs

## 1. Instant Killer

**Role:** Direct elimination

An instant bomb kills an enemy character at its target location.

Useful for removing an important enemy unit before it reaches the peak.

---

## 2. Timer Bomb

**Role:** Delayed threat

The bomb activates after a short delay.

The opponent can see the threat and may have time to move away.

This creates area denial and timing decisions.

---

## 3. Area Bomb

**Role:** Crowd control / damage

The Area Bomb affects multiple nearby cells.

It is especially effective against groups of enemy hikers.

---

## 4. Electric Shock

**Role:** Disable

The Electric Shock temporarily freezes or slows enemy hikers in its area.

It does not necessarily kill them, but creates an opportunity to advance.

---

# Card System

Each player has 8 available cards:

### Bombs

1. Instant Killer
2. Timer Bomb
3. Area Bomb
4. Electric Shock

### Hikers

1. Small Hiker
2. Sumo Hiker
3. Attack Hiker
4. Doctor Hiker

Cards are always visible around the player's side of the battlefield.

The player selects a card and then chooses where to deploy it.

---

# Placement

There is no slingshot in the current version.

Players directly select a card and click/tap a valid mountain cell.

### Hikers

Hikers can only be deployed within the player's normal deployment area. 

### Bombs

Bombs have greater placement range and can reach the far area of the mountain.

This gives bombs an important tactical advantage over hikers.

---

# Climbing

Once a hiker is deployed, it begins climbing automatically.

Each hiker has its own movement characteristics.

Example:

- Small Hiker → fast
- Sumo Hiker → slow
- Attack Hiker → medium
- Doctor Hiker → slow

Movement should be predictable enough for players to understand, while interactions with enemy units create tactical situations.

---

# Combat

Hikers can interact with enemy hikers while climbing.

Possible interactions include:

- Blocking
- Attacking
- Healing
- Removing enemy units
- Creating paths for friendly units

Combat should remain readable and simple.

The focus is on **positioning and timing**, rather than complicated controls.

---

# Victory

The primary objective is to reach the mountain peak.

A player wins by successfully getting a hiker to the peak before the opponent.

A possible alternative scoring system can be tested later:

- Number of hikers reaching the peak
- Number of surviving hikers
- Position of hikers when the match ends

For the first prototype, **first player to reach the peak wins** is recommended.

---

# Core Strategy

The game should create a constant decision between:

### Attack

Spend mana on bombs and attack hikers to stop the opponent.

### Defend

Use Sumo and Doctor hikers to protect your climbing group.

### Rush

Save enough mana to deploy fast hikers and push quickly toward the peak.

### Control

Use bombs and blockers to control important mountain cells.

### Save Mana

Do nothing temporarily and allow mana to regenerate so a stronger combination can be deployed.

---

# Example Situation

Player 1 has a Small Hiker close to the peak.

Player 2 has enough mana for an Instant Killer.

Player 2 must decide whether to:

- Kill the Small Hiker immediately.
- Save mana for an Attack Hiker.
- Deploy a Sumo Hiker to block the route.
- Wait for more mana and use a combination of units.

At the same time, Player 1 can react by deploying another hiker or changing their strategy.

This creates the game's main tension:

> **Every second matters, but every mana point matters too.**

---

# Match Flow

```text
Match starts
     ↓
Both players receive starting mana
     ↓
Players choose cards
     ↓
Players deploy characters / bombs
     ↓
Hikers automatically climb
     ↓
Players react to enemy actions
     ↓
Mana continuously regenerates
     ↓
More units and bombs are deployed
     ↓
Combat and positioning change the mountain
     ↓
One player reaches the peak
     ↓
Winner
```

---

# Design Goals

The game should feel:

- Fast
- Simple to understand
- Strategic
- Easy to control on mobile
- Easy to read visually
- Competitive
- Fun even with a small number of units

The controls should be extremely simple:

**Choose → Place → React.**

The depth should come from **mana management, timing, positioning, unit combinations, and predicting the opponent's actions**.

---

# Current Prototype Direction

The current prototype should focus on:

- 2D gameplay
- Real-time two-player gameplay
- Local/shared-screen testing
- No networking required yet
- No AI required yet
- Direct click/tap placement
- Grid-based mountain
- 8 cards per player
- Mana regeneration
- Automatic hiker movement
- Bomb interactions
- Peak-based victory condition

The visual style can remain very simple during gameplay prototyping. Gameplay balance and interaction quality should be solved before investing heavily in final art.
