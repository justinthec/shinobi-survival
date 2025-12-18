# AGENTS.md - Guidance for Coding Agents

This document provides guidance for AI coding agents working on the **Shinobi Clash** multiplayer game codebase.

## Project Overview

**Shinobi Clash** is a PvP arena fighter (currently 1v1, with plans for 2v2/FFA) built with:
- **TypeScript** - Main language
- **NetplayJS** - Rollback netcode library for multiplayer synchronization
- **Webpack** - Build tool
- **Canvas 2D** - Rendering

The game features playable characters (Naruto, Sasuke) battling in a fixed arena.

## Directory Structure

```
src/
├── multiplayer-game.ts   # Main game class (ShinobiClashGame)
├── types.ts              # All TypeScript interfaces and types
├── client.ts             # NetplayJS client entry point
├── renderer.ts           # Rendering logic (Canvas)
└── managers/             # Game Logic Managers
    └── combat-manager.ts # Static helper for combat logic (input, skills, collision)
```

## Critical: NetplayJS Constraints

> [!CAUTION]
> **NetplayJS serializes all game state**. This has major implications.

### What Gets Serialized
All properties on `ShinobiClashGame` are serialized and synchronized between clients:
- `players`, `projectiles`, `particles`, `floatingTexts`
- `gamePhase`, `gameTime`
- Any arrays or objects on the game class

### What CANNOT Be Serialized
- **Class instances with methods** - After deserialization, objects lose their prototype chain
- **Functions** - Cannot serialize closures or methods
- **Maps/Sets with complex keys** - Use plain objects or arrays

### Pattern: Stateless Helper Classes

Use static methods in manager classes to manipulate the game state.

✅ **DO THIS:**
```typescript
class ShinobiClashGame {
    players: Record<number, PlayerState> = {};
    
    tick(input: Map<NetplayPlayer, DefaultInput>) {
        // Pass game instance or specific state parts to static helpers
        CombatManager.processInput(this, player, input);
    }
}

// Stateless helper with static methods
class CombatManager {
    static processInput(game: ShinobiClashGame, player: PlayerState, input: DefaultInput) { ... }
}
```

## Game Architecture

### Game Phases
Managed by `gamePhase` in `ShinobiClashGame`:
- `'charSelect'` - Character selection screen (Input 1/2, Space to confirm)
- `'playing'` - Main PvP combat
- `'gameOver'` - Match end

### Main Loop Structure (in `tick()`)
1. **Character Selection**: Managed in `tickCharSelect`
2. **Playing**: Managed in `tickPlaying`
   - Process Inputs (Movement, Skills) via `CombatManager`
   - Update Projectiles via `CombatManager`
   - Update Particles/Text

### Combat System
Implemented in `src/managers/combat-manager.ts`:
- **Inputs**: Handled per player (WASD, Mouse Aim, Keys Q/E/Space).
- **Skills**: Static methods (e.g., `tryCastQ`) handle cooldown checks and spawning projectiles.
- **Collisions**: Simple distance checks (O(N*M)) in `checkCollision` methods. Note: Since entity count is low (1v1 + few projectiles), simple loops are sufficient.

### Rendering
Implemented in `src/renderer.ts`:
- Pure rendering logic based on game state.
- **Do NOT** modify game state inside `draw()`.
- **Debug Drawing**: No built-in debug mode currently active.

## Common Pitfalls

1.  **Adding class instances to game state** - Will break after NetplayJS sync. Use Plain Old Data (POD) interfaces (see `types.ts`).
2.  **Using `this.random()` for visuals** - Use `Math.random()` for client-only visuals (particles), `this.random()` (deterministic) for gameplay affecting logic (damage, crits).
3.  **Modifying state in Renderer** - Renderer runs independently of the simulation tick and can roll back/forward.
4.  **Manual Event Listeners** - Do not add global event listeners (e.g. `window.addEventListener`) for input. Input handling must go through the NetplayJS `tick` loop via `DefaultInput` to ensure determinism and proper rollback support.

## File Modification Checklist

When modifying entity types:
- [ ] Update interface in `types.ts`
- [ ] Update initialization in `multiplayer-game.ts` or `CombatManager`
- [ ] Update rendering in `renderer.ts`

When adding new skills:
- [ ] Update cooldown/state in `PlayerState` interface (`types.ts`)
- [ ] Implement logic in `CombatManager`
- [ ] Update controls in `README.md`
