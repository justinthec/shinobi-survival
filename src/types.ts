import { Vec2 } from "netplayjs";

export type GamePhase = 'charSelect' | 'playing' | 'gameOver';

export type CharacterType = 'naruto' | 'sasuke';

export interface PlayerState {
    id: number;
    name: string;
    character: CharacterType | null;
    pos: Vec2;
    angle: number; // Rotation angle (radians)
    hp: number;
    maxHp: number;
    dead: boolean;
    ready: boolean;

    // Combat Stats
    stats: {
        speed: number;
        damageMult: number;
        cooldownMult: number;
    };

    // Cooldowns (ms or frames)
    cooldowns: {
        q: number;
        e: number;
        sp: number; // Dash/Space
    };

    // Action States
    casting: number; // Frames remaining for cast lock
    dash: {
        active: boolean;
        vx: number;
        vy: number;
        life: number;
    };
}

export type ProjectileType = 'rasenshuriken' | 'fireball' | 'clone_strike' | 'amaterasu_buildup' | 'amaterasu_burn';

export interface ProjectileState {
    id: number;
    type: ProjectileType;
    pos: Vec2;
    vel: Vec2; // vx, vy
    ownerId: number;
    angle: number;
    rotation?: number;
    life: number;
    maxLife: number;
    radius: number;
    state: 'flying' | 'exploding';
    isAoe?: boolean;
    // Clone Stats
    hp?: number;
    maxHp?: number;
    actionState?: 'run' | 'punch';
}

export interface ParticleState {
    id: number;
    type: string; // 'smoke', 'fire', 'spark', etc.
    pos: Vec2;
    vel: Vec2;
    life: number;
    maxLife: number;
    color: string;
    size: number;
}

export interface FloatingText {
    id: number;
    pos: Vec2;
    val: string;
    color: string;
    life: number;
    maxLife: number;
    vy: number;
}

// Minimal Map State (since we use a simple arena box mostly, but keeping for compatibility if needed)
export interface MapState {
    width: number;
    height: number;
    tileSize: number;
}
