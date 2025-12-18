# AGENTS.md - Guidance for Coding Agents

This document provides guidance for AI coding agents working on the **Shinobi Survival** multiplayer game codebase.

## Project Overview

**Shinobi Survival** is a multiplayer roguelike survival game built with:
- **TypeScript** - Main language
- **NetplayJS** - Rollback netcode library for multiplayer synchronization
- **Webpack** - Build tool
- **Canvas 2D** - Rendering

The game features multiple playable characters (Naruto, Sasuke, Sakura, Gaara), each with unique abilities, fighting against waves of enemies.

## Directory Structure

```
src/
├── multiplayer-game.ts   # Main game class (ShinobiSurvivalGame)
├── types.ts              # All TypeScript interfaces and types
├── sprites.ts            # Sprite loading and management
├── client.ts             # NetplayJS client entry point
├── local-testing.ts      # Local 2-player testing entry point
├── spatial-hash.ts       # Spatial partitioning for collision detection
├── skills/               # Character-specific skill implementations
│   ├── types.ts          # SkillLogic, SkillState, WeaponLogic interfaces
│   ├── index.ts          # Skill factory (getSkillLogic, getWeaponLogic)
│   ├── naruto.ts         # Naruto's abilities
│   ├── sasuke.ts         # Sasuke's abilities
│   ├── sakura.ts         # Sakura's abilities
│   └── gaara.ts          # Gaara's abilities
└── managers/             # Stateless helper classes
    └── floating-text-manager.ts
```

## Critical: NetplayJS Constraints

> [!CAUTION]
> **NetplayJS serializes all game state**. This has major implications.

### What Gets Serialized
All properties on `ShinobiSurvivalGame` are serialized and synchronized between clients:
- `players`, `enemies`, `projectiles`, `hazards`, `particles`, `floatingTexts`
- `gamePhase`, `teamXP`, `teamLevel`, `gameTime`
- Any arrays or objects on the game class

### What CANNOT Be Serialized
- **Class instances with methods** - After deserialization, objects lose their prototype chain
- **Functions** - Cannot serialize closures or methods
- **Maps/Sets with complex keys** - Use plain objects or arrays

### Pattern: Stateless Helper Classes

❌ **DO NOT DO THIS:**
```typescript
class ShinobiSurvivalGame {
    floatingTextManager: FloatingTextManager = new FloatingTextManager();
    
    tick() {
        // ERROR: After NetplayJS sync, floatingTextManager.update is undefined
        this.floatingTextManager.update(dt);
    }

    draw() {
        // ERROR: After NetplayJS sync, floatingTextManager.draw is undefined
        this.floatingTextManager.draw(this.ctx);
    }
}
```

✅ **DO THIS INSTEAD:**
```typescript
class ShinobiSurvivalGame {
    floatingTexts: FloatingText[] = []; // Plain array (serializable)
    
    tick() {
        FloatingTextHelper.update(this.floatingTexts, dt); // Static method
    }

    draw() {
        FloatingTextHelper.draw(this.ctx, this.floatingTexts); // Static method
    }
}

// Stateless helper with static methods
class FloatingTextHelper {
    static update(texts: FloatingText[], dt: number): void { ... }
    static draw(ctx: CanvasRenderingContext2D, texts: FloatingText[]): void { ... }
}
```

### Pattern: Re-initialize Non-Serializable Helpers

For helpers like `SpatialHash` that maintain internal state (buckets), re-initialize every frame:

```typescript
tickPlaying() {
    // Re-create every frame to avoid serialization issues
    this.spatialHash = new SpatialHash(200);
    for (const e of this.enemies) {
        this.spatialHash.add(e);
    }
}
```

## Game Architecture

### Game Phases
The game has distinct phases managed by `gamePhase`:
- `'lobby'` - Initial state
- `'charSelect'` - Character selection screen
- `'playing'` - Main gameplay
- `'levelUp'` - Paused for level-up selection
- `'gameOver'` - Game ended

### Main Loop Structure (in `tick()`)
1. Process inputs from all players
2. Phase-specific logic (`tickCharSelect`, `tickPlaying`, `tickLevelUp`)
3. Collision detection (using `SpatialHash`)
4. Damage application
5. Entity cleanup (remove dead enemies, expired projectiles)

### Skill System
Skills are implemented using a **Strategy Pattern**:

```typescript
// In skills/types.ts
interface SkillLogic {
    update(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void;
    onPress(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void;
    onHold(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void;
    onRelease(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void;
    draw(ctx: CanvasRenderingContext2D, state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void;
}
```

Skills are retrieved via factory functions in `skills/index.ts`:
```typescript
const skillLogic = getSkillLogic(player.character, 'skillQ');
skillLogic.update(player.skills.skillQ, player, this, dt);
```

## Collision System

### Spatial Hashing
Used for efficient broad-phase collision detection:
- Cell size: 200px
- Entities are added to buckets based on their bounding box
- Query returns only entities in nearby cells

### Shape Types
Defined in `types.ts`:
- `Circle` - Most entities (players, enemies, basic projectiles)
- `Capsule` - Elongated hitboxes (beams, fire trails)
- `AABB` - Axis-aligned boxes (rarely used)

### Collision Checks
```typescript
// Broad phase
const candidates = this.spatialHash.query(projectile);

// Narrow phase
for (const enemy of candidates) {
    if (this.spatialHash.checkCollision(projectile, enemy)) {
        // Handle collision
    }
}
```

## Damage System

### DoT (Damage over Time)
- Uses `DOT_TICK_RATE` constant (10 frames) for tick-based damage
- Hazards have `tickTimer` that accumulates
- Apply damage only when timer exceeds threshold

### Floating Text
- Damage numbers accumulate if targeting same entity
- `FLOATING_TEXT_MAX_DISTANCE` controls when to spawn new vs accumulate
- Uses static `FloatingTextHelper` methods

## Performance Considerations

### Common Bottlenecks
1. **O(N*M) collision checks** - Always use `SpatialHash`
2. **Per-frame damage calculations** - Use tick-based DoT
3. **Spawning many entities** - Consider growing/reusing entities (e.g., fire trail uses 1 capsule instead of many circles)
4. **Floating text spam** - Accumulate and cull distant text

### Memory Management
- Use object pools where possible
- Clean up dead entities in the main loop
- Limit arrays (e.g., `MAX_ENEMIES = 50`)

## Common Patterns

### Spawning Entities
```typescript
const id = this.nextEntityId++;
this.projectiles.push({
    id,
    pos: new Vec2(x, y),
    // ... other properties
    shape: { type: 'circle', radius: 20 }
});
```

### Finding Entities
```typescript
// By ID
const enemy = this.enemies.find(e => e.id === targetId);

// Nearest (using SpatialHash for efficiency)
const searchRadius = 200;
const queryCollider = {
    pos: player.pos,
    shape: { type: 'circle', radius: searchRadius }
};
const candidates = this.spatialHash.query(queryCollider);
let closest = null;
let minDist = Infinity;
for (const e of candidates) {
    const d = distance(player.pos, e.pos);
    if (d < minDist) { minDist = d; closest = e; }
}
```

### Applying Damage
```typescript
// Use the damageEnemy method for consistent behavior
this.damageEnemy(enemy, damage, sourcePlayer);
// This handles: crit, bleed, floating text, kill tracking
```

## Testing

### Local Testing
```bash
npm run dev
# Open http://localhost:9000/local-testing.html for 2-player local test
```

### Build
```bash
npm run build
# Creates production bundles in dist/
```

> [!IMPORTANT]
> Always run `npm run build` before submitting changes to ensure `dist/` is up to date.

## Common Pitfalls

1. **Forgetting `shape` property** - All entities need a `shape` for collision detection
2. **Using `this.random()` for visuals** - Use `Math.random()` for client-only visuals, `this.random()` only for gameplay-affecting randomness (keeps sync)
3. **Modifying arrays while iterating** - Use reverse loop or collect indices first
4. **Forgetting `targetId` in `spawnFloatingText`** - Breaks accumulation logic
5. **Adding class instances to game state** - Will break after NetplayJS sync

## Debugging Tips

1. **Check console for NetplayJS desync errors**
2. **Use debug mode (`` ` `` key) to render collision shapes** - Shows exact hitboxes for all entities
3. **Collision issues** - Check if entity has valid `shape` property
4. **Skills not working** - Check if skill is registered in `skills/index.ts`
5. **Floating text not showing** - Check `FLOATING_TEXT_MAX_DISTANCE` and accumulation logic

## File Modification Checklist

When modifying entity types:
- [ ] Update interface in `types.ts`
- [ ] Update initialization in `multiplayer-game.ts`
- [ ] Update any factory functions
- [ ] Ensure `shape` property is set

When adding new skills:
- [ ] Create skill class in appropriate file under `skills/`
- [ ] Implement `SkillLogic` interface
- [ ] Register in `skills/index.ts` factory
- [ ] Add to character's skill slots in player initialization
