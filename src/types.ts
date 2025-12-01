import { Vec2 } from "netplayjs";

export type GamePhase = 'lobby' | 'charSelect' | 'playing' | 'levelUp' | 'gameOver';

export interface SkillState {
    cooldown: number;
    chargeTime: number;
    isCharging: boolean;
    activeTime: number;
}

export interface PlayerStats {
    damageMult: number;
    areaMult: number;
    cooldownMult: number;
    critChance: number;
    knockback: number;
    piercing: number;
}

export interface ElementFlags {
    Fire: boolean;
    Water: boolean;
    Earth: boolean;
    Wind: boolean;
    Lightning: boolean;
}

export interface UpgradeOption {
    id: string;
    name: string;
    description: string;
    type: 'stat' | 'element' | 'weapon';
}

export interface PlayerState {
    id: number;
    name: string;
    pos: Vec2;
    hp: number;
    maxHp: number;
    character: string | null; // 'naruto', 'sasuke', 'gaara', 'sakura'

    // Generalized Ability State
    skills: Record<string, SkillState>;

    // Stats & Upgrades
    weaponLevel: number;
    isEvolved: boolean;
    stats: PlayerStats;
    elements: ElementFlags;

    // Meta
    ready: boolean;
    offeredUpgrades: UpgradeOption[];
    selectedUpgrade: number | null; // 0, 1, 2
    dead: boolean;

    // Visuals
    direction: number; // 1 or -1
    aimAngle: number;
    flash: number; // Damage flash timer

    // Combat State
    fireTimer: number;
    burstTimer: number;
    burstCount: number;
    shield: number;
    maxShield: number;
    healCharge: number;
    skillChargeTime: number;
    skillCharging: boolean;
    ultActiveTime: number;

    // Dash / Movement Skill State
    dashTime: number;
    dashVec: Vec2;
    dashHitList: number[]; // List of enemy IDs hit during this dash
}

export interface EnemyState {
    id: number;
    type: string;
    pos: Vec2;
    hp: number;
    maxHp: number;
    dead: boolean;
    // Status effects
    burnStacks: number;
    bleedStacks: number;
    slowTimer: number;
    stunTimer: number;
    dotTimer: number;
    push: Vec2;
}

export interface ProjectileState {
    id: number;
    type: string;
    pos: Vec2;
    vel: Vec2;
    dmg: number;
    knock: number;
    pierce: number;
    life: number;
    angle: number;
    ownerId: number;
    hitList: number[]; // Enemy IDs hit
}

export interface XpOrbState {
    id: number;
    pos: Vec2;
    val: number;
    dead: boolean;
}

export interface ParticleState {
    id: number;
    type: string;
    pos: Vec2;
    vel: Vec2;
    life: number;
    maxLife: number;
    color: string;
    size: number;
}

export interface HazardZoneState {
    id: number;
    pos: Vec2;
    radius: number;
    duration: number;
    damage: number;
    type: string; // 'fire', 'acid'
    ownerId: number;
}

export interface FloatingText {
    id: number;
    pos: Vec2;
    vel: Vec2;
    text: string;
    color: string;
    life: number;
    maxLife: number;
    size: number;
}
