import {
    Game,
    NetplayPlayer,
    DefaultInput,
    Vec2,
} from "netplayjs";
import { initSprites, SPRITES } from "./sprites";

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

export class ShinobiSurvivalGame extends Game {
    static timestep = 1000 / 60;
    static canvasSize = { width: 640, height: 360 };
    static numPlayers = 4; // Default, can be overridden by wrapper
    static localPlayerId: number | null = null;

    // Game State
    players: Record<number, PlayerState> = {};
    enemies: EnemyState[] = [];
    projectiles: ProjectileState[] = [];
    xpOrbs: XpOrbState[] = [];
    particles: ParticleState[] = [];
    hazards: HazardZoneState[] = [];

    gamePhase: GamePhase = 'charSelect';
    teamXP: number = 0;
    teamLevel: number = 1;
    xpToNextLevel: number = 50;
    gameTime: number = 0;
    spawnTimer: number = 0;

    nextEntityId: number = 0;
    rngSeed: number = 12345; // Initial seed

    // Simple LCG RNG
    random(): number {
        this.rngSeed = (this.rngSeed * 1664525 + 1013904223) % 4294967296;
        return this.rngSeed / 4294967296;
    }

    // For rendering
    netplayPlayers: Array<NetplayPlayer>;

    constructor(canvas: HTMLCanvasElement, players: Array<NetplayPlayer>) {
        super();
        this.netplayPlayers = players;
        initSprites();

        // Capture local player ID from the initial players list
        // This list is correct at startup (P0 local on Host, P1 local on Client)
        // We use a static variable because this.netplayPlayers gets overwritten by state sync
        for (const p of players) {
            if (p.isLocal) {
                ShinobiSurvivalGame.localPlayerId = p.id;
                break;
            }
        }

        // Initialize players
        for (let p of players) {
            this.players[p.id] = {
                id: p.id,
                name: `Player ${p.id + 1}`,
                pos: new Vec2(0, 0),
                hp: 100,
                maxHp: 100,
                character: null,
                skills: {
                    skill1: { cooldown: 0, chargeTime: 0, isCharging: false, activeTime: 0 },
                    ult: { cooldown: 0, chargeTime: 0, isCharging: false, activeTime: 0 }
                },
                weaponLevel: 1,
                isEvolved: false,
                stats: { damageMult: 1, areaMult: 1, cooldownMult: 1, critChance: 0.05, knockback: 1, piercing: 0 },
                elements: { Fire: false, Water: false, Earth: false, Wind: false, Lightning: false },
                ready: false,
                offeredUpgrades: [],
                selectedUpgrade: null,
                dead: false,
                direction: 1,
                aimAngle: 0,
                flash: 0,
                fireTimer: 0,
                burstTimer: 0,
                burstCount: 0,
                shield: 0,
                maxShield: 50,
                healCharge: 0,
                skillChargeTime: 0,
                skillCharging: false,
                ultActiveTime: 0
            };
        }
    }

    tick(playerInputs: Map<NetplayPlayer, DefaultInput>): void {
        // Main game loop
        if (this.gamePhase === 'charSelect') {
            this.tickCharSelect(playerInputs);
        } else if (this.gamePhase === 'playing') {
            this.tickPlaying(playerInputs);
        } else if (this.gamePhase === 'levelUp') {
            this.tickLevelUp(playerInputs);
        } else if (this.gamePhase === 'gameOver') {
            // Game over logic
        }
    }

    tickCharSelect(playerInputs: Map<NetplayPlayer, DefaultInput>) {
        let allReady = true;
        for (const [player, input] of playerInputs.entries()) {
            const id = player.id;
            const pState = this.players[id];

            if (input.keysPressed['1']) pState.character = 'naruto';
            if (input.keysPressed['2']) pState.character = 'sasuke';
            if (input.keysPressed['3']) pState.character = 'gaara';
            if (input.keysPressed['4']) pState.character = 'sakura';

            if (input.keysPressed[' ']) {
                if (pState.character) pState.ready = true;
            }

            if (!pState.ready) allReady = false;
        }

        if (allReady && Object.keys(this.players).length > 0) {
            this.gamePhase = 'playing';
            this.initializeGame();
        }
    }

    initializeGame() {
        // Reset positions and stats based on character
        const startX = -200;
        const spacing = 100;
        let i = 0;
        for (let id in this.players) {
            const p = this.players[id];
            p.pos = new Vec2(startX + i * spacing, 0);

            // Apply character base stats
            if (p.character === 'naruto') { p.maxHp = 150; p.hp = 150; }
            else if (p.character === 'sasuke') { p.maxHp = 80; p.hp = 80; }
            else if (p.character === 'gaara') { p.maxHp = 150; p.hp = 150; }
            else if (p.character === 'sakura') { p.maxHp = 100; p.hp = 100; }

            i++;
        }
    }

    tickPlaying(playerInputs: Map<NetplayPlayer, DefaultInput>) {
        const dt = ShinobiSurvivalGame.timestep / 1000;
        this.gameTime += dt;

        // Player Updates
        for (const [player, input] of playerInputs.entries()) {
            const id = player.id;
            const p = this.players[id];
            if (p.dead) continue;

            // Movement
            let dx = 0; let dy = 0;
            if (input.keysHeld['a']) dx -= 1;
            if (input.keysHeld['d']) dx += 1;
            if (input.keysHeld['w']) dy -= 1;
            if (input.keysHeld['s']) dy += 1;

            if (dx !== 0 || dy !== 0) {
                const len = Math.sqrt(dx * dx + dy * dy);
                const speed = 240; // Base speed
                p.pos.x += (dx / len) * speed * dt;
                p.pos.y += (dy / len) * speed * dt;

                if (dx !== 0) p.direction = Math.sign(dx);
            }

            // Map Boundaries
            const MAP_WIDTH = 1400;
            const LANE_WIDTH = MAP_WIDTH / 2;
            if (p.pos.x < -LANE_WIDTH + 20) p.pos.x = -LANE_WIDTH + 20;
            if (p.pos.x > LANE_WIDTH - 20) p.pos.x = LANE_WIDTH - 20;
            // Y is infinite? Original code didn't clamp Y, but let's check index.html.
            // index.html only clamps X: if (this.x < -LANE_WIDTH + 20) ...
            // So we only clamp X.

            // Mouse Aiming
            if (input.mousePosition) {
                // Assuming camera is centered on player, mouse pos relative to center is aim direction
                const mx = input.mousePosition.x - ShinobiSurvivalGame.canvasSize.width / 2;
                const my = input.mousePosition.y - ShinobiSurvivalGame.canvasSize.height / 2;
                p.aimAngle = Math.atan2(my, mx);
            }

            // Cooldowns
            for (let key in p.skills) {
                const skill = p.skills[key];
                if (skill.cooldown > 0) skill.cooldown -= dt;
            }

            // Skills
            // Skill 1 (E)
            // Skill 1 (E)
            if (p.character === 'naruto') {
                if (input.keysHeld['e'] && p.skills.skill1.cooldown <= 0) {
                    p.skillCharging = true; // We need to add this to PlayerState if missing, or use chargeTime > 0
                    p.skillChargeTime = Math.min(p.skillChargeTime + dt, 1.5);
                } else {
                    if (p.skillChargeTime > 0) {
                        // Released
                        this.useSkill(p, 'skill1');
                        p.skillChargeTime = 0;
                        p.skillCharging = false;
                        p.skills.skill1.cooldown = 5.0 * p.stats.cooldownMult;
                    }
                }
            } else {
                if (input.keysPressed['e']) {
                    const skill = p.skills.skill1;
                    if (skill.cooldown <= 0) {
                        this.useSkill(p, 'skill1');
                        skill.cooldown = 5.0 * p.stats.cooldownMult;
                    }
                }
            }
            // Ult (R)
            if (input.keysPressed['r']) {
                const skill = p.skills.ult;
                if (skill.cooldown <= 0) {
                    this.useSkill(p, 'ult');
                    skill.cooldown = 10.0 * p.stats.cooldownMult;
                }
            }

            // Basic Attack (Auto-fire)
            p.fireTimer += dt;
            const fireRate = (p.character === 'sasuke' ? 0.4 : 0.8) * p.stats.cooldownMult; // Base rates from index.html

            if (p.fireTimer >= fireRate) {
                this.fireWeapon(p);
                p.fireTimer = 0;
                if (p.character === 'naruto' && p.weaponLevel >= 2 && !p.isEvolved) {
                    p.burstTimer = 0.1;
                    p.burstCount = 1;
                }
            }

            if (p.burstCount > 0) {
                p.burstTimer -= dt;
                if (p.burstTimer <= 0) {
                    this.fireWeapon(p);
                    p.burstCount--;
                    if (p.burstCount > 0) p.burstTimer = 0.1;
                }
            }

            // --- ABILITIES ---
            // Naruto Charge Logic
            if (p.character === 'naruto') {
                if (input.keysHeld['e']) {
                    p.skillChargeTime = Math.min(p.skillChargeTime + dt, 1.5);
                } else if (p.skillChargeTime > 0) {
                    // Release Charge -> Dash
                    const chargeRatio = p.skillChargeTime / 1.5;
                    const speed = 600;
                    const baseDist = 75;
                    const maxDist = 375;
                    const distance = baseDist + (chargeRatio * (maxDist - baseDist));

                    // Dash towards mouse
                    const angle = p.aimAngle;
                    const dx = Math.cos(angle) * distance;
                    const dy = Math.sin(angle) * distance;

                    // Move player (with collision check ideally, but simple for now)
                    p.pos.x += dx;
                    p.pos.y += dy;

                    // Damage enemies in path (simplified as circle at end or line)
                    // Let's do a simple area check at destination
                    for (const e of this.enemies) {
                        const d = Math.sqrt((p.pos.x - e.pos.x) ** 2 + (p.pos.y - e.pos.y) ** 2);
                        if (d < 100) {
                            e.hp -= 50 * p.stats.damageMult * (1 + chargeRatio);
                        }
                    }
                    p.skillChargeTime = 0;
                }
            }

            // Ultimate Active Logic
            if (p.ultActiveTime > 0) {
                p.ultActiveTime -= dt;
                if (p.character === 'naruto') {
                    // Continuous Beam Damage
                    // Line from player to mouse (aimAngle)
                    // We need to check enemies near this line
                    const range = 2000;
                    const p1 = p.pos;
                    const p2 = { x: p.pos.x + Math.cos(p.aimAngle) * range, y: p.pos.y + Math.sin(p.aimAngle) * range };

                    for (const e of this.enemies) {
                        // Distance from point to line segment
                        const l2 = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
                        if (l2 == 0) continue;
                        let t = ((e.pos.x - p1.x) * (p2.x - p1.x) + (e.pos.y - p1.y) * (p2.y - p1.y)) / l2;
                        t = Math.max(0, Math.min(1, t));
                        const proj = { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
                        const dist = Math.sqrt((e.pos.x - proj.x) ** 2 + (e.pos.y - proj.y) ** 2);

                        if (dist < 30) { // Beam width
                            e.hp -= 5 * p.stats.damageMult; // Per tick damage
                        }
                    }
                } else if (p.character === 'sasuke') {
                    // Susanoo Area Damage
                    for (const e of this.enemies) {
                        const d = Math.sqrt((p.pos.x - e.pos.x) ** 2 + (p.pos.y - e.pos.y) ** 2);
                        if (d < 150) {
                            e.hp -= 2 * p.stats.damageMult;
                        }
                    }
                }
            }

        }

        // Hazards Update
        for (let i = this.hazards.length - 1; i >= 0; i--) {
            const h = this.hazards[i];
            h.duration -= dt;
            if (h.duration <= 0) {
                this.hazards.splice(i, 1);
                continue;
            }
            // Damage enemies
            for (const e of this.enemies) {
                const d = Math.sqrt((h.pos.x - e.pos.x) ** 2 + (h.pos.y - e.pos.y) ** 2);
                if (d < h.radius) {
                    e.hp -= h.damage * dt; // Per second approx if damage is high, or just small per tick
                }
            }
        }

        // Enemy Spawning
        this.spawnTimer += dt;
        if (this.spawnTimer > 1.0) {
            this.spawnEnemy();
            this.spawnTimer = 0;
        }

        // Enemy Updates
        for (const e of this.enemies) {
            // Find closest player
            let closestP: PlayerState | null = null;
            let minDist = Infinity;
            for (let id in this.players) {
                const p = this.players[id];
                if (p.dead) continue;
                const d = Math.sqrt((p.pos.x - e.pos.x) ** 2 + (p.pos.y - e.pos.y) ** 2);
                if (d < minDist) { minDist = d; closestP = p; }
            }

            if (closestP) {
                const angle = Math.atan2(closestP.pos.y - e.pos.y, closestP.pos.x - e.pos.x);
                const speed = 100;
                e.pos.x += Math.cos(angle) * speed * dt;
                e.pos.y += Math.sin(angle) * speed * dt;
            }
        }

        // Projectile Updates
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.life -= dt;
            if (proj.life <= 0) {
                this.projectiles.splice(i, 1);
                continue;
            }

            proj.pos.x += proj.vel.x * dt;
            proj.pos.y += proj.vel.y * dt;

            // Collision with Enemies
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const e = this.enemies[j];
                if (proj.hitList.includes(e.id)) continue;

                const dist = Math.sqrt((proj.pos.x - e.pos.x) ** 2 + (proj.pos.y - e.pos.y) ** 2);
                if (dist < 30) { // Hit radius
                    e.hp -= proj.dmg;
                    proj.hitList.push(e.id);
                    if (proj.pierce > 0) {
                        proj.pierce--;
                    } else {
                        this.projectiles.splice(i, 1);
                        break; // Projectile destroyed
                    }

                    if (e.hp <= 0) {
                        this.enemies.splice(j, 1);
                        // Drop XP
                        this.xpOrbs.push({
                            id: this.nextEntityId++,
                            pos: new Vec2(e.pos.x, e.pos.y),
                            val: 10,
                            dead: false
                        });
                    }
                }
            }
        }

        // XP Collection
        for (let id in this.players) {
            const p = this.players[id];
            if (p.dead) continue;

            for (let i = this.xpOrbs.length - 1; i >= 0; i--) {
                const orb = this.xpOrbs[i];
                const dist = Math.sqrt((p.pos.x - orb.pos.x) ** 2 + (p.pos.y - orb.pos.y) ** 2);
                if (dist < 50) { // Magnet range
                    // Move orb towards player
                    const angle = Math.atan2(p.pos.y - orb.pos.y, p.pos.x - orb.pos.x);
                    orb.pos.x += Math.cos(angle) * 300 * dt;
                    orb.pos.y += Math.sin(angle) * 300 * dt;

                    if (dist < 20) { // Collect
                        this.teamXP += orb.val;
                        this.xpOrbs.splice(i, 1);
                        if (this.teamXP >= this.xpToNextLevel) {
                            this.teamXP = 0; // Reset XP for next level
                            this.teamLevel++;
                            this.xpToNextLevel *= 1.2;
                            this.gamePhase = 'levelUp';
                            // Generate upgrades (mock)
                            for (let pid in this.players) {
                                this.players[pid].selectedUpgrade = null;
                            }
                        }
                    }
                }
            }
        }
    }



    fireWeapon(p: PlayerState) {
        // Find nearest enemy
        let closestE: EnemyState | null = null;
        let minDist = Infinity;
        for (const e of this.enemies) {
            const d = Math.sqrt((p.pos.x - e.pos.x) ** 2 + (p.pos.y - e.pos.y) ** 2);
            if (d < minDist) { minDist = d; closestE = e; }
        }

        const angle = closestE ? Math.atan2(closestE.pos.y - p.pos.y, closestE.pos.x - p.pos.x) : (p.direction === 1 ? 0 : Math.PI);
        let dmg = 10 * p.stats.damageMult;
        if (this.random() < p.stats.critChance) dmg *= 2;

        if (p.character === 'naruto') {
            if (p.ultActiveTime > 0) { return; } // Ult handles its own damage
            const projType = p.isEvolved ? 'rasenshuriken' : 'shuriken';
            const pDmg = p.isEvolved ? dmg * 3 : dmg;
            const pPierce = p.isEvolved ? 5 : (1 + p.stats.piercing);
            const pSpeed = p.isEvolved ? 480 : 600;

            this.spawnProjectile(p.id, p.pos, angle, pSpeed, pDmg, projType, p.stats.knockback + 2, pPierce);
        } else if (p.character === 'sasuke') {
            this.spawnProjectile(p.id, p.pos, angle, 120, dmg * 2, 'sword_slash', 10, 99);
            this.spawnProjectile(p.id, p.pos, angle, 720, dmg, 'lightning', 4 + p.stats.knockback, 1 + p.stats.piercing);
        } else if (p.character === 'gaara') {
            this.spawnProjectile(p.id, p.pos, angle, 210, dmg * 1.8, 'sand', 5 + p.stats.knockback, 999);
        } else if (p.character === 'sakura') {
            // Sakura punch (short range area)
            // For simplicity, spawn a short lived projectile or just damage area
            this.spawnProjectile(p.id, p.pos, angle, 300, dmg * 2, 'rock_wave', 20, 999); // Using rock_wave as punch visual/hitbox
        }
    }

    spawnProjectile(ownerId: number, pos: Vec2, angle: number, speed: number, dmg: number, type: string, knock: number, pierce: number) {
        this.projectiles.push({
            id: this.nextEntityId++,
            type: type,
            pos: new Vec2(pos.x, pos.y),
            vel: new Vec2(Math.cos(angle) * speed, Math.sin(angle) * speed),
            dmg: dmg,
            knock: knock,
            pierce: pierce,
            life: 2.0,
            angle: angle,
            ownerId: ownerId,
            hitList: []
        });
    }

    useSkill(p: PlayerState, slot: string) {
        if (slot === 'skill1') { // E Skill
            if (p.character === 'naruto') {
                // Naruto E: Charged Rasengan (Handled in tickPlaying for charge logic, this triggers start)
                // Actually, for charge, we need to detect hold.
                // Let's change this: useSkill is called when key is PRESSED.
                // For Naruto E, we start charging.
                p.skillChargeTime = 0;
                // We need a flag to know we are charging? 
                // We can use p.skillChargeTime > 0 or a separate flag.
                // Let's assume we handle charge in tickPlaying and this just initializes if needed.
                // But wait, tickPlaying calls useSkill when key is pressed.
                // We should move Naruto E logic to tickPlaying entirely or use a state.
            } else if (p.character === 'sasuke') {
                // Amaterasu
                this.hazards.push({
                    id: this.nextEntityId++,
                    pos: new Vec2(p.pos.x, p.pos.y),
                    radius: 100,
                    duration: 5.0,
                    damage: 5,
                    type: 'fire',
                    ownerId: p.id
                });
            } else if (p.character === 'gaara') {
                // Sand Coffin
                // Damage enemies around player
                for (const e of this.enemies) {
                    const d = Math.sqrt((p.pos.x - e.pos.x) ** 2 + (p.pos.y - e.pos.y) ** 2);
                    if (d < 200) {
                        e.hp -= 50 * p.stats.damageMult;
                        // Visuals would be nice (particle)
                    }
                }
            } else if (p.character === 'sakura') {
                // Heal
                p.hp = Math.min(p.hp + 50, p.maxHp);
            }
        } else if (slot === 'ult') { // R Ult
            if (p.character === 'naruto') {
                p.ultActiveTime = 6.0;
            } else if (p.character === 'sasuke') {
                p.ultActiveTime = 6.0; // Susanoo
            } else if (p.character === 'gaara') {
                // Pyramid Seal
                // Big damage area
                for (const e of this.enemies) {
                    const d = Math.sqrt((p.pos.x - e.pos.x) ** 2 + (p.pos.y - e.pos.y) ** 2);
                    if (d < 300) {
                        e.hp -= 100 * p.stats.damageMult;
                        e.stunTimer = 3.0;
                    }
                }
            } else if (p.character === 'sakura') {
                p.ultActiveTime = 6.0; // Katsuyu
            }
        }
    }

    tickLevelUp(playerInputs: Map<NetplayPlayer, DefaultInput>) {
        // Wait for all players to select upgrades
        let allSelected = true;
        for (const [player, input] of playerInputs.entries()) {
            const id = player.id;
            const p = this.players[id];
            if (p.selectedUpgrade === null) {
                if (input.keysPressed['1']) p.selectedUpgrade = 0;
                if (input.keysPressed['2']) p.selectedUpgrade = 1;
                if (input.keysPressed['3']) p.selectedUpgrade = 2;
            }
            if (p.selectedUpgrade === null) allSelected = false;
        }

        if (allSelected) {
            // Apply upgrades
            for (let id in this.players) {
                const p = this.players[id];
                // Apply logic based on p.offeredUpgrades[p.selectedUpgrade]
                p.selectedUpgrade = null;
                p.offeredUpgrades = [];
            }
            this.gamePhase = 'playing';
        }
    }

    spawnEnemy() {
        const type = this.random() < 0.8 ? 'zetsu' : (this.random() < 0.5 ? 'sound' : 'snake');
        const side = this.random() < 0.5 ? -1 : 1;
        const MAP_WIDTH = 1400;
        const pIds = Object.keys(this.players);
        if (pIds.length === 0) return;
        const p = this.players[parseInt(pIds[Math.floor(this.random() * pIds.length)])];

        const startX = side === -1 ? -MAP_WIDTH / 2 - 50 : MAP_WIDTH / 2 + 50;
        const startY = p.pos.y + (this.random() - 0.5) * 800;

        let hp = 20;
        let speed = 100;
        if (type === 'sound') { hp = 15; speed = 210; }
        if (type === 'snake') { hp = 200; speed = 90; }

        this.enemies.push({
            id: this.nextEntityId++,
            type: type,
            pos: new Vec2(startX, startY),
            hp: hp,
            maxHp: hp,
            dead: false,
            burnStacks: 0,
            bleedStacks: 0,
            slowTimer: 0,
            stunTimer: 0,
            dotTimer: 0,
            push: new Vec2(0, 0)
        });
    }

    draw(canvas: HTMLCanvasElement) {
        const ctx = canvas.getContext("2d")!;

        // Background
        ctx.fillStyle = "#1b2e1b";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Tiled Background (Simple Grid)

        ctx.save();
        // Camera setup
        let localPlayerId = ShinobiSurvivalGame.localPlayerId;
        if (localPlayerId === null) localPlayerId = 0; // Fallback

        if (Math.random() < 0.01) console.log("Drawing with localPlayerId:", localPlayerId);

        const localPlayer = this.players[localPlayerId];

        let cx = 0, cy = 0;
        if (localPlayer) {
            cx = localPlayer.pos.x - canvas.width / 2;
            cy = localPlayer.pos.y - canvas.height / 2;
        }

        ctx.translate(-cx, -cy);

        // Draw Grid/Trees
        const gridY = 100;
        const startY = Math.floor((cy - 200) / gridY) * gridY;
        const endY = cy + canvas.height + 200;
        const forestLeft = -700;
        const forestRight = 700;

        for (let y = startY; y < endY; y += gridY) {
            if (cx < forestLeft + 200) {
                for (let x = forestLeft - 300; x < forestLeft; x += 80) {
                    const offX = ((Math.abs(y * x)) % 20);
                    // Draw tree sprite (placeholder rect if sprite not ready, but we have SPRITES.tree)
                    if (SPRITES.tree) ctx.drawImage(SPRITES.tree, x, y);
                }
            }
            if (cx + canvas.width > forestRight - 200) {
                for (let x = forestRight; x < forestRight + 300; x += 80) {
                    const offX = ((Math.abs(y * x)) % 15);
                    if (SPRITES.tree) ctx.drawImage(SPRITES.tree, x, y);
                }
            }
        }

        // Draw XP Orbs
        for (const orb of this.xpOrbs) {
            ctx.fillStyle = '#00d2ff';
            ctx.beginPath(); ctx.arc(orb.pos.x, orb.pos.y, 4, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 5; ctx.shadowColor = '#00d2ff'; ctx.fill(); ctx.shadowBlur = 0;
        }

        // Draw Enemies
        for (const e of this.enemies) {
            const sprite = SPRITES[e.type] || SPRITES.zetsu;
            ctx.drawImage(sprite, e.pos.x - sprite.width / 2, e.pos.y - sprite.height / 2);

            // Enemy HP Bar
            const hpPct = e.hp / e.maxHp;
            ctx.fillStyle = 'red'; ctx.fillRect(e.pos.x - 15, e.pos.y - 40, 30, 4);
            ctx.fillStyle = '#0f0'; ctx.fillRect(e.pos.x - 15, e.pos.y - 40, 30 * hpPct, 4);
        }

        // Draw Players
        for (let id in this.players) {
            const p = this.players[id];
            if (p.dead) continue;

            const spriteKey = p.character || 'naruto';
            const sprite = SPRITES[spriteKey];

            ctx.save();
            ctx.translate(p.pos.x, p.pos.y);
            ctx.scale(p.direction, 1); // Flip based on direction
            if (sprite) {
                ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
            } else {
                ctx.fillStyle = 'orange'; ctx.fillRect(-10, -10, 20, 20);
            }
            ctx.restore();

            // Player Name & HP (Above Head)
            if (parseInt(id) !== localPlayerId) {
                ctx.fillStyle = 'white'; ctx.font = '12px Arial'; ctx.textAlign = 'center';
                ctx.fillText(p.name, p.pos.x, p.pos.y - 45);

                const hpPct = p.hp / p.maxHp;
                ctx.fillStyle = 'red'; ctx.fillRect(p.pos.x - 20, p.pos.y - 40, 40, 5);
                ctx.fillStyle = '#0f0'; ctx.fillRect(p.pos.x - 20, p.pos.y - 40, 40 * hpPct, 5);
            }
        }

        // Draw Projectiles
        for (const proj of this.projectiles) {
            const sprite = SPRITES[proj.type];
            ctx.save();
            ctx.translate(proj.pos.x, proj.pos.y);
            ctx.rotate(proj.angle);
            if (sprite) {
                ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
            } else {
                ctx.fillStyle = 'yellow'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        ctx.restore(); // End Camera Transform

        // HUD (Screen Space)
        if (this.gamePhase === 'playing' || this.gamePhase === 'levelUp') {
            // Team XP Bar (Top Center)
            const xpPct = Math.min(this.teamXP / this.xpToNextLevel, 1);
            const barW = 600; const barH = 20;
            const barX = (canvas.width - barW) / 2;

            ctx.fillStyle = '#333'; ctx.fillRect(barX, 10, barW, barH);
            ctx.fillStyle = '#00d2ff'; ctx.fillRect(barX, 10, barW * xpPct, barH);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(barX, 10, barW, barH);

            ctx.fillStyle = 'white'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center';
            ctx.fillText(`Team Level ${this.teamLevel}`, canvas.width / 2, 26);

            // Local Player HUD (Bottom Left)
            if (localPlayer) {
                // HP Bar
                const hpPct = localPlayer.hp / localPlayer.maxHp;
                ctx.fillStyle = '#333'; ctx.fillRect(20, canvas.height - 40, 200, 20);
                ctx.fillStyle = '#2ecc71'; ctx.fillRect(20, canvas.height - 40, 200 * hpPct, 20);
                ctx.strokeStyle = '#fff'; ctx.strokeRect(20, canvas.height - 40, 200, 20);
                ctx.fillStyle = 'white'; ctx.font = '14px Arial'; ctx.textAlign = 'left';
                ctx.fillText(`${Math.ceil(localPlayer.hp)} / ${localPlayer.maxHp}`, 25, canvas.height - 25);

                // Skills
                const drawSkill = (x: number, key: string, label: string) => {
                    const skill = localPlayer.skills[key];
                    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x, canvas.height - 90, 50, 50);
                    ctx.strokeStyle = 'white'; ctx.strokeRect(x, canvas.height - 90, 50, 50);

                    ctx.fillStyle = 'white'; ctx.font = '12px Arial'; ctx.textAlign = 'center';
                    ctx.fillText(label, x + 25, canvas.height - 95);

                    if (skill.cooldown > 0) {
                        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x, canvas.height - 90, 50, 50);
                        ctx.fillStyle = 'white'; ctx.font = 'bold 16px Arial';
                        ctx.fillText(Math.ceil(skill.cooldown).toString(), x + 25, canvas.height - 60);
                    }
                };

                drawSkill(240, 'skill1', 'E');
                drawSkill(300, 'ult', 'R');
            }
        }

        // Character Select / Level Up Overlays
        if (this.gamePhase === 'charSelect') {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.fillText("Select Character: 1-Naruto, 2-Sasuke, 3-Gaara, 4-Sakura", canvas.width / 2, 100);
            ctx.fillText("Press SPACE to Ready", canvas.width / 2, 150);

            let y = 200;
            for (let id in this.players) {
                const p = this.players[id];
                const status = p.ready ? "READY" : (p.character ? p.character.toUpperCase() : "Selecting...");
                ctx.fillText(`${p.name}: ${status}`, canvas.width / 2, y);
                y += 40;
            }
        } else if (this.gamePhase === 'levelUp') {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white'; ctx.font = '40px Arial'; ctx.textAlign = 'center';
            ctx.fillText("LEVEL UP!", canvas.width / 2, 100);
            ctx.font = '20px Arial';
            ctx.fillText("Select an upgrade (1, 2, or 3)", canvas.width / 2, 140);

            // Show waiting status
            let y = 200;
            for (let id in this.players) {
                const p = this.players[id];
                const status = p.selectedUpgrade !== null ? "SELECTED" : "CHOOSING...";
                ctx.fillText(`${p.name}: ${status}`, canvas.width / 2, y);
                y += 30;
            }
        }
    }
}


