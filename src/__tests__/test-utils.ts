/**
 * Test utilities and factory functions for creating test fixtures.
 */

import { Vec2 } from 'netplayjs';
import {
    PlayerState,
    EnemyState,
    ProjectileState,
    XpOrbState,
    ParticleState,
    HazardZoneState,
    FloatingText,
    SkillState,
    PlayerStats,
    ElementFlags,
    Shape
} from '../types';

/**
 * Create a default SkillState for testing
 */
export function createSkillState(overrides?: Partial<SkillState>): SkillState {
    return {
        cooldown: 0,
        chargeTime: 0,
        isCharging: false,
        activeTime: 0,
        ...overrides
    };
}

/**
 * Create default PlayerStats for testing
 */
export function createPlayerStats(overrides?: Partial<PlayerStats>): PlayerStats {
    return {
        damageMult: 1,
        areaMult: 1,
        cooldownMult: 1,
        critChance: 0.05,
        knockback: 1,
        piercing: 0,
        ...overrides
    };
}

/**
 * Create default ElementFlags for testing
 */
export function createElementFlags(overrides?: Partial<ElementFlags>): ElementFlags {
    return {
        Fire: false,
        Water: false,
        Earth: false,
        Wind: false,
        Lightning: false,
        ...overrides
    };
}

/**
 * Create a PlayerState for testing
 */
export function createPlayer(id: number = 0, overrides?: Partial<PlayerState>): PlayerState {
    return {
        id,
        name: `Player ${id + 1}`,
        pos: new Vec2(0, 0),
        hp: 100,
        maxHp: 100,
        character: 'naruto',
        charState: { regenTimer: 0 },
        shape: { type: 'circle', radius: 20 },
        skills: {
            skillQ: createSkillState(),
            skillE: createSkillState(),
            ult: createSkillState()
        },
        weaponLevel: 1,
        isEvolved: false,
        stats: createPlayerStats(),
        elements: createElementFlags(),
        ready: true,
        offeredUpgrades: [],
        selectedUpgrade: null,
        dead: false,
        direction: 1,
        aimAngle: 0,
        targetPos: new Vec2(0, 0),
        flash: 0,
        fireTimer: 0,
        burstTimer: 0,
        burstCount: 0,
        shield: 0,
        maxShield: 50,
        healCharge: 0,
        skillChargeTime: 0,
        skillCharging: false,
        ultActiveTime: 0,
        invincible: false,
        rooted: false,
        dashTime: 0,
        dashVec: new Vec2(0, 0),
        dashHitList: [],
        ...overrides
    };
}

/**
 * Create an EnemyState for testing
 */
export function createEnemy(id: number = 0, overrides?: Partial<EnemyState>): EnemyState {
    return {
        id,
        type: 'zetsu',
        pos: new Vec2(100, 100),
        hp: 50,
        maxHp: 50,
        dead: false,
        shape: { type: 'circle', radius: 20 },
        burnStacks: 0,
        bleedStacks: 0,
        slowTimer: 0,
        stunTimer: 0,
        dotTimer: 0,
        push: new Vec2(0, 0),
        rooted: false,
        damageDebuff: 1.0,
        speedMult: 1.0,
        ...overrides
    };
}

/**
 * Create a ProjectileState for testing
 */
export function createProjectile(id: number = 0, overrides?: Partial<ProjectileState>): ProjectileState {
    return {
        id,
        type: 'kunai',
        pos: new Vec2(0, 0),
        vel: new Vec2(100, 0),
        dmg: 10,
        knock: 1,
        pierce: 0,
        life: 2.0,
        angle: 0,
        ownerId: 0,
        hitList: [],
        size: 10,
        shape: { type: 'circle', radius: 10 },
        ...overrides
    };
}

/**
 * Create an XpOrbState for testing
 */
export function createXpOrb(id: number = 0, overrides?: Partial<XpOrbState>): XpOrbState {
    return {
        id,
        pos: new Vec2(50, 50),
        val: 10,
        dead: false,
        ...overrides
    };
}

/**
 * Create a FloatingText for testing
 */
export function createFloatingText(id: number = 0, overrides?: Partial<FloatingText>): FloatingText {
    return {
        id,
        pos: new Vec2(0, 0),
        vel: new Vec2(0, -20),
        text: '10',
        color: 'white',
        life: 1.0,
        maxLife: 1.0,
        size: 20,
        ...overrides
    };
}

/**
 * Create a HazardZoneState for testing
 */
export function createHazard(id: number = 0, overrides?: Partial<HazardZoneState>): HazardZoneState {
    return {
        id,
        pos: new Vec2(0, 0),
        radius: 50,
        duration: 5.0,
        damage: 10,
        type: 'fire',
        ownerId: 0,
        shape: { type: 'circle', radius: 50 },
        tickTimer: 0,
        ...overrides
    };
}

/**
 * Create a simple RNG function for deterministic tests
 */
export function createDeterministicRng(seed: number = 12345): () => number {
    let currentSeed = seed;
    return () => {
        currentSeed = (currentSeed * 1664525 + 1013904223) % 4294967296;
        return currentSeed / 4294967296;
    };
}

/**
 * Create a mock that always returns a specific value
 */
export function createFixedRng(value: number): () => number {
    return () => value;
}
