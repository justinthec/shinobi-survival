import {
    Game,
    NetplayPlayer,
    DefaultInput,
    Vec2,
} from "netplayjs";
import { initSprites, SPRITES } from "./sprites";
import { getSkill, getWeapon } from "./skills";

import {
    GamePhase,
    SkillState,
    PlayerStats,
    ElementFlags,
    UpgradeOption,
    PlayerState,
    EnemyState,
    ProjectileState,
    XpOrbState,
    ParticleState,
    HazardZoneState,
    FloatingText,
    Shape,
    Collider,
    DOT_TICK_RATE,
    MapState,
    ItemState,
    SpawnerState
} from "./types";
import { loadTestMap, blocksPlayerMovement, blocksEnemyMovement, blocksPlayerProjectile, blocksEnemyProjectile } from "./map-loader";
import { SpatialHash } from "./spatial-hash";
import { FloatingTextHelper } from "./managers/floating-text-manager";
import { CombatManager } from "./managers/combat-manager";
import { XpManager } from "./managers/xp-manager";
import { UpgradeManager } from "./managers/upgrade-manager";
import { EnemyManager } from "./managers/enemy-manager";
import { ParticleManager } from "./managers/particle-manager";
import { HazardManager } from "./managers/hazard-manager";

const MAX_ENEMIES = 50;
// Module-level cache for minimap to avoid serialization issues
let minimapCache: HTMLCanvasElement | null = null;

export class ShinobiSurvivalGame extends Game {
    static timestep = 1000 / 60;
    static canvasSize = { width: 1470, height: 900 };
    static numPlayers = 2; // Default, can be overridden by wrapper
    static localPlayerId: number | null = null;
    static debugMode: boolean = false; // Toggle with backtick key
    static map: MapState = loadTestMap(); // Static map - not serialized by NetplayJS

    // Game State
    players: Record<number, PlayerState> = {};
    enemies: EnemyState[] = [];
    projectiles: ProjectileState[] = [];
    xpOrbs: XpOrbState[] = [];
    particles: ParticleState[] = [];
    hazards: HazardZoneState[] = [];
    items: ItemState[] = [];
    spawners: SpawnerState[] = [];

    spatialHash: SpatialHash = new SpatialHash(200);
    floatingTexts: FloatingText[] = [];

    gamePhase: GamePhase = 'charSelect';
    teamXP: number = 0;
    teamLevel: number = 1;
    xpToNextLevel: number = 300;
    gameTime: number = 0;
    spawnTimer: number = 0;

    nextEntityId: number = 0;
    rngSeed: number = 12345; // Initial seed

    // Simple LCG RNG
    random(): number {
        this.rngSeed = (this.rngSeed * 1664525 + 1013904223) % 4294967296;
        return this.rngSeed / 4294967296;
    }

    // Get unique color for each player
    getPlayerColor(playerId: number): string {
        const colors = ['#00d2ff', '#ff4444', '#ffd700', '#00ff88']; // Blue, Red, Yellow, Green
        return colors[playerId % colors.length];
    }

    // For rendering
    netplayPlayers: Array<NetplayPlayer>;

    constructor(canvas: HTMLCanvasElement, players: Array<NetplayPlayer>) {
        super();
        this.netplayPlayers = players;
        initSprites();

        // Debug mode toggle (backtick key)
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Backquote') {
                ShinobiSurvivalGame.debugMode = !ShinobiSurvivalGame.debugMode;
                console.log('Debug mode:', ShinobiSurvivalGame.debugMode ? 'ON' : 'OFF');
            }
        });

        // Capture local player ID from the initial players list
        // This list is correct at startup (P0 local on Host, P1 local on Client)
        // We use a static variable because this.netplayPlayers gets overwritten by state sync
        for (const p of players) {
            if (p.isLocal) {
                ShinobiSurvivalGame.localPlayerId = p.id;
                break;
            }
        }

        // Calculate map center for initial spawning
        let startX = 0;
        let startY = 0;
        if (ShinobiSurvivalGame.map) {
            startX = (ShinobiSurvivalGame.map.width * ShinobiSurvivalGame.map.tileSize) / 2;
            startY = (ShinobiSurvivalGame.map.height * ShinobiSurvivalGame.map.tileSize) / 2;
        }

        // Initialize players
        for (let p of players) {
            this.players[p.id] = {
                id: p.id,
                name: `Player ${p.id + 1}`,
                pos: new Vec2(startX, startY),
                hp: 100,
                maxHp: 100,
                character: null,
                charState: null,
                shape: { type: 'circle', radius: 20 },
                skills: {
                    skillQ: { cooldown: 0, chargeTime: 0, isCharging: false, activeTime: 0 },
                    skillE: { cooldown: 0, chargeTime: 0, isCharging: false, activeTime: 0 },
                    ult: { cooldown: 0, chargeTime: 0, isCharging: false, activeTime: 0 }
                },
                weaponLevel: 1,
                isEvolved: false,
                stats: {
                    damageMult: 1.0,
                    cooldownMult: 1.0,
                    areaMult: 1.0,
                    critChance: 0.05,
                    critDamage: 1.5,
                    healthRegen: 0,
                    armor: 0,
                    knockback: 0,
                    piercing: 0
                },
                elements: { Fire: false, Water: false, Earth: false, Wind: false, Lightning: false },
                ready: false,
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
                maxShield: 0,
                healCharge: 0,
                skillChargeTime: 0,
                skillCharging: false,
                ultActiveTime: 0,
                invincible: false,
                rooted: false,
                dashTime: 0,
                dashVec: new Vec2(0, 0),
                dashHitList: [],
                reviveTimer: 0,
                spectatingTargetId: null,
                deathCount: 0,
                autoRespawnTimer: 0,
                invincibleTimer: 0
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
        // Calculate map center for spawning
        let spawnX = 0;
        let spawnY = 0;
        if (ShinobiSurvivalGame.map) {
            spawnX = (ShinobiSurvivalGame.map.width * ShinobiSurvivalGame.map.tileSize) / 2;
            spawnY = (ShinobiSurvivalGame.map.height * ShinobiSurvivalGame.map.tileSize) / 2;
        }

        // Reset positions and stats based on character
        const spacing = 40;
        const playerCount = Object.keys(this.players).length;
        const startOffset = -((playerCount - 1) * spacing) / 2;

        let i = 0;
        for (let id in this.players) {
            const p = this.players[id];
            p.pos = new Vec2(spawnX + startOffset + i * spacing, spawnY);

            // Apply character base stats
            if (p.character === 'naruto') {
                p.maxHp = 150; p.hp = 150;
                p.charState = { regenTimer: 0 };
            }
            else if (p.character === 'sasuke') {
                p.maxHp = 80; p.hp = 80;
                p.charState = { dodgeBuffTimer: 0, sharinganCooldown: 0 };
            }
            else if (p.character === 'gaara') {
                p.maxHp = 150; p.hp = 150;
                p.charState = { shieldHp: 50, shieldRegenTimer: 0 };
            }
            else if (p.character === 'sakura') {
                p.maxHp = 100; p.hp = 100;
                p.charState = { meter: 0 };
            }

            i++;
        }

        // Initialize Spawners
        this.spawners = [];
        this.items = [];
        if (ShinobiSurvivalGame.map) {
            for (let y = 0; y < ShinobiSurvivalGame.map.height; y++) {
                for (let x = 0; x < ShinobiSurvivalGame.map.width; x++) {
                    const tile = ShinobiSurvivalGame.map.tiles[y][x];
                    if (tile.spawnerType) {
                        this.spawners.push({
                            pos: new Vec2((x + 0.5) * ShinobiSurvivalGame.map.tileSize, (y + 0.5) * ShinobiSurvivalGame.map.tileSize),
                            type: tile.spawnerType,
                            cooldown: 0,
                            maxCooldown: 30
                        });
                    }
                }
            }
        }
    }

    cycleSpectatorTarget(p: PlayerState, direction: number) {
        const playerIds = Object.keys(this.players).map(Number).sort((a, b) => a - b);
        // Default to self if null
        let currentId = p.spectatingTargetId !== null ? p.spectatingTargetId : p.id;
        let currentIndex = playerIds.indexOf(currentId);

        if (currentIndex === -1) currentIndex = 0;

        // Try to find an alive player to spectate
        for (let i = 0; i < playerIds.length; i++) {
            currentIndex = (currentIndex + direction + playerIds.length) % playerIds.length;
            const nextId = playerIds[currentIndex];
            // Allow spectating if alive OR if it's me (even if dead, I can watch my own corpse/respawn timer)
            if (!this.players[nextId].dead || nextId === p.id) {
                p.spectatingTargetId = nextId;
                return;
            }
        }

        // If all dead, just stay on self or cycle anyway
        p.spectatingTargetId = playerIds[(currentIndex + direction + playerIds.length) % playerIds.length];
    }

    tickPlaying(playerInputs: Map<NetplayPlayer, DefaultInput>) {
        const dt = ShinobiSurvivalGame.timestep / 1000;
        this.gameTime += dt;

        // Re-initialize Spatial Hash to prevent serialization issues
        this.spatialHash = new SpatialHash(200);
        for (const e of this.enemies) {
            this.spatialHash.add(e);
        }

        // Player Updates
        for (const [player, input] of playerInputs.entries()) {
            const id = player.id;
            const p = this.players[id];

            if (p.dead) {
                // Auto-Respawn Logic
                if (p.autoRespawnTimer > 0) {
                    p.autoRespawnTimer -= dt;
                    if (p.autoRespawnTimer <= 0) {
                        // Auto-Revive
                        p.dead = false;
                        p.hp = p.maxHp * 0.5;
                        p.reviveTimer = 0;
                        p.invincibleTimer = 4.0;
                        p.invincible = true;
                        this.spawnFloatingText(p.pos, "RESPAWNED!", "gold", p.id);
                    }
                }

                // Spectating Controls
                if (input.keysPressed['ArrowLeft']) {
                    this.cycleSpectatorTarget(p, -1);
                }
                if (input.keysPressed['ArrowRight']) {
                    this.cycleSpectatorTarget(p, 1);
                }

                // Revive Logic (Teammate)
                let beingRevived = false;
                for (let otherId in this.players) {
                    const other = this.players[otherId];
                    if (!other.dead) {
                        const dist = Math.sqrt((p.pos.x - other.pos.x) ** 2 + (p.pos.y - other.pos.y) ** 2);
                        if (dist < 50) { // Revive range
                            beingRevived = true;
                            break;
                        }
                    }
                }

                if (beingRevived) {
                    p.reviveTimer += dt;
                    if (p.reviveTimer >= 5.0) {
                        p.dead = false;
                        p.hp = p.maxHp * 0.5;
                        p.reviveTimer = 0;
                        p.invincibleTimer = 4.0;
                        p.invincible = true;
                        this.spawnFloatingText(p.pos, "REVIVED!", "gold", p.id);
                    }
                } else {
                    p.reviveTimer = Math.max(0, p.reviveTimer - dt);
                }

                continue; // Skip normal player updates if dead
            } else {
                p.reviveTimer = 0;

                // Invincibility Timer
                if (p.invincibleTimer > 0) {
                    p.invincibleTimer -= dt;
                    if (p.invincibleTimer <= 0) {
                        p.invincible = false;
                    }
                }
            }

            // Movement
            this.updateCharacterPassives(p, dt);

            // Root Check
            if (p.rooted) {
                // Cannot move
            } else if (p.dashTime > 0) {
                // Dash Logic
                p.pos.x += p.dashVec.x * dt;
                p.pos.y += p.dashVec.y * dt;
                p.dashTime -= dt;

                // Dash Collision
                const potentialCollisions = this.spatialHash.query(p);
                for (const item of potentialCollisions) {
                    const e = item as EnemyState;
                    if (!p.dashHitList.includes(e.id)) {
                        if (this.spatialHash.checkCollision(p, e)) {
                            p.dashHitList.push(e.id);
                            // Double push removed, was bug
                            const dmg = 50 * p.stats.damageMult;
                            this.damageEnemy(e, dmg, p);
                        }
                    }
                }

                // End of dash safety burst
                if (p.dashTime <= 0) {
                    p.dashTime = 0;

                    // Rasengan Blast Effect
                    if (p.character === 'naruto') {
                        // Crater Visual
                        this.particles.push({
                            id: this.nextEntityId++,
                            type: 'crater',
                            pos: new Vec2(p.pos.x, p.pos.y),
                            vel: new Vec2(0, 0),
                            life: 2.0, // Shorter life
                            maxLife: 2.0,
                            color: '',
                            size: 1
                        });

                        // Blast Damage & Knockback
                        for (const e of this.enemies) {
                            const dist = Math.sqrt((p.pos.x - e.pos.x) ** 2 + (p.pos.y - e.pos.y) ** 2);
                            if (dist < 150) {
                                const dmg = 50 * p.stats.damageMult;
                                this.damageEnemy(e, dmg, p);

                                // Knockback
                                const angle = Math.atan2(e.pos.y - p.pos.y, e.pos.x - p.pos.x);
                                e.push.x += Math.cos(angle) * 650; // Much stronger knockback
                                e.push.y += Math.sin(angle) * 650;
                            }
                        }
                    } else {
                        // Generic Dash End (if any other char dashes)
                        const potentialCollisions = this.spatialHash.query(p);
                        for (const item of potentialCollisions) {
                            const e = item as EnemyState;
                            if (this.spatialHash.checkCollision(p, e)) { // Check collision again for blast radius? Or use larger radius?
                                // Original code used 150 radius. Player radius is 20.
                                // Let's assume blast is larger.
                                const dist = Math.sqrt((p.pos.x - e.pos.x) ** 2 + (p.pos.y - e.pos.y) ** 2);
                                if (dist < 150) {
                                    this.damageEnemy(e, 50 * p.stats.damageMult, p);
                                }
                            }
                        }
                    }
                }
            } else {
                // Normal Movement
                let moveSpeed = 120; // Base speed
                if (p.skillCharging) moveSpeed = 0; // Immobile while charging
                if (p.character === 'naruto' && p.ultActiveTime > 0) moveSpeed = 0; // Immobile during Ult

                let dx = 0; let dy = 0;
                if (input.keysHeld['a']) dx -= 1;
                if (input.keysHeld['d']) dx += 1;
                if (input.keysHeld['w']) dy -= 1;
                if (input.keysHeld['s']) dy += 1;

                if (dx !== 0 || dy !== 0) {
                    const len = Math.sqrt(dx * dx + dy * dy);
                    const vx = (dx / len) * moveSpeed;
                    const vy = (dy / len) * moveSpeed;

                    const radius = 20; // Player radius

                    // Try moving X
                    const nextX = p.pos.x + vx * dt;
                    let collisionX = false;
                    // Check 4 corners of AABB at nextX
                    if (blocksPlayerMovement(ShinobiSurvivalGame.map, nextX - radius, p.pos.y - radius) ||
                        blocksPlayerMovement(ShinobiSurvivalGame.map, nextX + radius, p.pos.y - radius) ||
                        blocksPlayerMovement(ShinobiSurvivalGame.map, nextX - radius, p.pos.y + radius) ||
                        blocksPlayerMovement(ShinobiSurvivalGame.map, nextX + radius, p.pos.y + radius)) {
                        collisionX = true;
                    }

                    if (!collisionX) {
                        p.pos.x = nextX;
                    }

                    // Try moving Y
                    const nextY = p.pos.y + vy * dt;
                    let collisionY = false;
                    // Check 4 corners of AABB at nextY
                    if (blocksPlayerMovement(ShinobiSurvivalGame.map, p.pos.x - radius, nextY - radius) ||
                        blocksPlayerMovement(ShinobiSurvivalGame.map, p.pos.x + radius, nextY - radius) ||
                        blocksPlayerMovement(ShinobiSurvivalGame.map, p.pos.x - radius, nextY + radius) ||
                        blocksPlayerMovement(ShinobiSurvivalGame.map, p.pos.x + radius, nextY + radius)) {
                        collisionY = true;
                    }

                    if (!collisionY) {
                        p.pos.y = nextY;
                    }

                    if (dx !== 0) p.direction = Math.sign(dx);
                }
            }

            // Map Boundaries - constrain player to map
            if (ShinobiSurvivalGame.map) {
                const mapWidth = ShinobiSurvivalGame.map.width * ShinobiSurvivalGame.map.tileSize;
                const mapHeight = ShinobiSurvivalGame.map.height * ShinobiSurvivalGame.map.tileSize;
                const playerRadius = 20;

                if (p.pos.x < playerRadius) p.pos.x = playerRadius;
                if (p.pos.x > mapWidth - playerRadius) p.pos.x = mapWidth - playerRadius;
                if (p.pos.y < playerRadius) p.pos.y = playerRadius;
                if (p.pos.y > mapHeight - playerRadius) p.pos.y = mapHeight - playerRadius;
            }

            // Mouse Aiming
            if (input.mousePosition) {
                // Assuming camera is centered on player, mouse pos relative to center is aim direction
                const mx = input.mousePosition.x - ShinobiSurvivalGame.canvasSize.width / 2;
                const my = input.mousePosition.y - ShinobiSurvivalGame.canvasSize.height / 2;
                p.aimAngle = Math.atan2(my, mx);

                // Calculate World Target Position
                // Camera is at p.pos (roughly, actually it's interpolated but for logic p.pos is fine)
                // Wait, camera logic in draw() translates by -player.pos + center.
                // So screen center IS player position.
                // So input.mousePosition relative to center IS relative to player.
                // So world target = player.pos + (mousePos - center)
                p.targetPos.x = p.pos.x + mx;
                p.targetPos.y = p.pos.y + my;
            }

            // Cooldowns
            for (let key in p.skills) {
                const skill = p.skills[key];
                if (skill.cooldown > 0) skill.cooldown -= dt;
            }

            // Skills
            const skillQLogic = getSkill(p.character || '', 'skillQ');
            const skillELogic = getSkill(p.character || '', 'skillE');
            const ultLogic = getSkill(p.character || '', 'ult');

            // Update Skills
            if (skillQLogic) skillQLogic.update(p.skills.skillQ, p, this, dt);
            if (skillELogic) skillELogic.update(p.skills.skillE, p, this, dt);
            if (ultLogic) ultLogic.update(p.skills.ult, p, this, dt);

            // Input Handling
            // Skill Q
            if (input.keysHeld['q']) {
                if (skillQLogic) skillQLogic.onHold(p.skills.skillQ, p, this, dt);
            }
            if (input.keysPressed['q']) {
                if (skillQLogic) skillQLogic.onPress(p.skills.skillQ, p, this);
            }
            if (!input.keysHeld['q'] && p.skills.skillQ.isCharging) {
                if (skillQLogic) skillQLogic.onRelease(p.skills.skillQ, p, this);
            }

            // Skill E
            if (input.keysHeld['e']) {
                if (skillELogic) skillELogic.onHold(p.skills.skillE, p, this, dt);
            }

            if (input.keysPressed['e']) {
                if (skillELogic) skillELogic.onPress(p.skills.skillE, p, this);
            }

            if (!input.keysHeld['e'] && p.skills.skillE.isCharging) {
                if (skillELogic) skillELogic.onRelease(p.skills.skillE, p, this);
            }

            // Ult (R)
            if (input.keysPressed['r']) {
                if (ultLogic) ultLogic.onPress(p.skills.ult, p, this);
            }

            // Detect Ult Release
            if (!input.keysHeld['r'] && p.skills.ult.isCharging) {
                if (ultLogic) ultLogic.onRelease(p.skills.ult, p, this);
            }

            // Ultimate Active Logic (Moved to later block to avoid duplication)
            // Lines 408-437 removed to prevent double counting time and damage


            // Basic Attack (Auto-fire)
            p.fireTimer += dt;
            const fireRate = (p.character === 'sasuke' ? 1.0 : 1.5) * p.stats.cooldownMult; // Base rates from index.html

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
        }

        // Bleed Logic (Enemy Update Loop handles movement, let's add DoT there or here)
        // Let's add it to the Enemy Update Loop (line 418+) or a separate loop?
        // We can add it to the existing enemy loop to save iterations.

        // Hazards Update
        for (let i = this.hazards.length - 1; i >= 0; i--) {
            const h = this.hazards[i];
            h.duration -= dt;
            if (h.duration <= 0) {
                this.hazards.splice(i, 1);
                continue;
            }
            // Damage enemies
            // Throttling logic
            h.tickTimer += dt;
            const TICK_INTERVAL = DOT_TICK_RATE * (1 / 60); // Convert frames to seconds
            if (h.tickTimer >= TICK_INTERVAL) {
                h.tickTimer = 0;
                const potentialCollisions = this.spatialHash.query(h);
                for (const item of potentialCollisions) {
                    const e = item as EnemyState;
                    if (this.spatialHash.checkCollision(h, e)) {
                        if (h.type === 'quicksand') {
                            e.speedMult *= 0.5; // 50% slow
                        }
                        // Damage is per tick now? Or per second?
                        // Design said "DamagePerTick".
                        // Existing hazards have "damage" property which was per second or per frame?
                        // In gaara.ts: damage: 20 * mult (DPS)
                        // In original code: e.hp -= h.damage * dt;
                        // So h.damage was DPS.
                        // Now we apply it every TICK_INTERVAL.
                        // So damage per tick = h.damage * TICK_INTERVAL.
                        const dmg = h.damage * TICK_INTERVAL;
                        e.hp -= dmg;
                        if (this.random() < 0.1) this.spawnFloatingText(e.pos, Math.ceil(dmg).toString(), 'white', e.id);
                    }
                }
            }
        }

        // Enemy Spawning
        this.spawnTimer += dt;

        // Wave Logic
        let spawnRate = 0.5;
        let waveMultiplier = 1;

        if (this.gameTime < 60) {
            spawnRate = 0.5; // Slow start
            waveMultiplier = 1;
        } else if (this.gameTime < 120) {
            spawnRate = 0.4; // Medium
            waveMultiplier = 2;
        } else {
            spawnRate = 0.2; // Fast
            waveMultiplier = 3;
        }

        if (this.spawnTimer > spawnRate && this.enemies.length < MAX_ENEMIES) {
            this.spawnEnemy();
            // Chance for extra spawns based on wave
            if (waveMultiplier >= 2 && this.random() < 0.4) this.spawnEnemy();
            if (waveMultiplier >= 3 && this.random() < 0.6) this.spawnEnemy();

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
                // We need to apply hazards BEFORE movement to affect speedMult?
                // Currently hazards update is BEFORE enemy update?
                // No, hazards update is at line 371. Enemy update is at 418.
                // So hazards run first.
                // So Hazards set speedMult.
                // Then Enemy Update uses it.
                // But we need to reset it somewhere.
                // If we reset it inside Enemy Update (line 418), we overwrite Hazard effects!
                // So we must reset it BEFORE Hazards Update.
                // Where is Hazards Update? Line 371.
                // So we need to iterate enemies and reset speedMult BEFORE 371.
                // Or just reset it at the end of Enemy Update?
                // If we reset at end, then next frame Hazards run and modify it.
                // Yes.

                if (e.rooted) e.speedMult = 0;

                const speed = 50 * e.speedMult;
                const vx = Math.cos(angle) * speed + e.push.x;
                const vy = Math.sin(angle) * speed + e.push.y;

                const radius = 20;

                // Move X
                const nextX = e.pos.x + vx * dt;
                let collisionX = false;
                if (blocksEnemyMovement(ShinobiSurvivalGame.map, nextX - radius, e.pos.y - radius) ||
                    blocksEnemyMovement(ShinobiSurvivalGame.map, nextX + radius, e.pos.y - radius) ||
                    blocksEnemyMovement(ShinobiSurvivalGame.map, nextX - radius, e.pos.y + radius) ||
                    blocksEnemyMovement(ShinobiSurvivalGame.map, nextX + radius, e.pos.y + radius)) {
                    collisionX = true;
                }
                if (!collisionX) e.pos.x = nextX;

                // Move Y
                const nextY = e.pos.y + vy * dt;
                let collisionY = false;
                if (blocksEnemyMovement(ShinobiSurvivalGame.map, e.pos.x - radius, nextY - radius) ||
                    blocksEnemyMovement(ShinobiSurvivalGame.map, e.pos.x + radius, nextY - radius) ||
                    blocksEnemyMovement(ShinobiSurvivalGame.map, e.pos.x - radius, nextY + radius) ||
                    blocksEnemyMovement(ShinobiSurvivalGame.map, e.pos.x + radius, nextY + radius)) {
                    collisionY = true;
                }
                if (!collisionY) e.pos.y = nextY;

                // Decay Push
                e.push.x *= 0.95;
                e.push.y *= 0.95;

                // Bleed Damage
                if (e.bleedStacks > 0) {
                    e.dotTimer -= dt;
                    if (e.dotTimer <= 0) {
                        e.dotTimer = 1.0; // Tick every second
                        const bleedDmg = e.bleedStacks * 5; // 5 damage per stack
                        e.hp -= bleedDmg;
                        this.spawnFloatingText(e.pos, bleedDmg.toString(), "red", e.id);
                        // Bleed stacks decay? Or permanent until death?
                        // Usually stacks decay or have duration.
                        // Let's say they decay by 1 every tick? Or separate duration?
                        // For simplicity, permanent for now, or decay 1 stack per tick.
                        // Let's decay 1 stack per tick to prevent infinite scaling.
                        // e.bleedStacks = Math.max(0, e.bleedStacks - 1);
                        // Actually, let's keep them permanent for "Chakra Scalpel" feel, or maybe duration based.
                        // Design doc says "Apply Bleed".
                        // Let's keep it simple: Permanent until death.
                    }
                }

                // Collision with Player (Damage)
                if (closestP) {
                    const d = Math.sqrt((closestP.pos.x - e.pos.x) ** 2 + (closestP.pos.y - e.pos.y) ** 2);
                    if (d < 30) { // Touch radius
                        const dmg = 10 * dt * e.damageDebuff; // DPS * Debuff
                        this.damagePlayer(closestP, dmg);
                    }
                }
            }

            // Reset speedMult for next frame (so hazards can re-apply it)
            e.speedMult = 1.0;

            // Constrain enemy to map bounds
            if (ShinobiSurvivalGame.map) {
                const mapWidth = ShinobiSurvivalGame.map.width * ShinobiSurvivalGame.map.tileSize;
                const mapHeight = ShinobiSurvivalGame.map.height * ShinobiSurvivalGame.map.tileSize;
                const enemyRadius = 20;

                if (e.pos.x < enemyRadius) e.pos.x = enemyRadius;
                if (e.pos.x > mapWidth - enemyRadius) e.pos.x = mapWidth - enemyRadius;
                if (e.pos.y < enemyRadius) e.pos.y = enemyRadius;
                if (e.pos.y > mapHeight - enemyRadius) e.pos.y = mapHeight - enemyRadius;
            }
        }

        // Remove dead enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            if (this.enemies[i].dead) {
                this.enemies.splice(i, 1);
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

            // Rotating Slash Logic
            if (proj.type === 'rotating_slash' || proj.type === 'rotating_slash_lightning' || proj.type === 'sword_slash_chidori') {
                const owner = this.players[proj.ownerId];
                if (owner) {
                    // Swing Arc Logic
                    // We want a 70 degree arc swing.
                    // Let's map life to angle.
                    // Life starts at 0.5 (we need to set this in spawnProjectile or assume)
                    // Let's assume maxLife is 0.3 for a quick swipe.
                    const maxLife = 0.3;
                    // If life > maxLife, we clamp or just use ratio.
                    // Actually, we can use a custom property or just calculate based on life.
                    // Let's assume we spawn it with life = 0.3.
                    const progress = 1 - (proj.life / 0.3); // 0 to 1

                    const swingRange = 1.6; // 1.6 rad ~= 90 degrees
                    const startAngle = -swingRange / 2; // windup
                    const currentSwing = startAngle + (swingRange * progress);

                    // Attach to owner aim
                    // Use targetAngle if available (fixed direction), else follow player aim
                    const baseAngle = proj.targetAngle !== undefined ? proj.targetAngle : owner.aimAngle;
                    // proj.angle is the center of the arc
                    proj.angle = baseAngle + currentSwing; // currentSwing includes the windup startAngle

                    proj.pos.x = owner.pos.x + Math.cos(proj.angle);
                    proj.pos.y = owner.pos.y + Math.sin(proj.angle);
                }
            } else if (proj.type === 'fireball') {
                // Grow over time
                proj.size += 20 * dt;

                // Manage Trail
                if (proj.trailId === undefined) {
                    const trail: HazardZoneState = {
                        id: this.nextEntityId++,
                        pos: new Vec2(proj.pos.x, proj.pos.y),
                        radius: proj.size * 0.8,
                        duration: 2.0,
                        damage: 5,
                        type: 'fire',
                        ownerId: proj.ownerId,
                        shape: { type: 'capsule', radius: proj.size * 0.8, startOffset: new Vec2(0, 0), endOffset: new Vec2(0, 0) },
                        tickTimer: 0
                    };
                    this.hazards.push(trail);
                    proj.trailId = trail.id;
                } else {
                    const trail = this.hazards.find(h => h.id === proj.trailId);
                    if (trail && trail.shape.type === 'capsule') {
                        trail.shape.endOffset.x = proj.pos.x - trail.pos.x;
                        trail.shape.endOffset.y = proj.pos.y - trail.pos.y;
                        trail.shape.radius = proj.size * 0.8;
                        trail.duration = 2.0; // Keep refreshing duration while fireball is alive
                    }
                }
            }

            // Move Projectiles
            if (proj.vel.x !== 0 || proj.vel.y !== 0) {
                const nextX = proj.pos.x + proj.vel.x * dt;
                const nextY = proj.pos.y + proj.vel.y * dt;

                let hitWall = false;
                const isPlayerProj = !!this.players[proj.ownerId];

                if (isPlayerProj) {
                    if (blocksPlayerProjectile(ShinobiSurvivalGame.map, nextX, nextY)) hitWall = true;
                } else {
                    if (blocksEnemyProjectile(ShinobiSurvivalGame.map, nextX, nextY)) hitWall = true;
                }

                if (hitWall) {
                    this.projectiles.splice(i, 1);
                    continue;
                }

                proj.pos.x = nextX;
                proj.pos.y = nextY;
            }

            // Collision with Enemies
            const potentialCollisions = this.spatialHash.query(proj);
            for (const item of potentialCollisions) {
                const e = item as EnemyState;
                if (proj.hitList.includes(e.id)) continue;

                let hit = false;
                if (proj.type === 'rotating_slash' || proj.type === 'rotating_slash_lightning' || proj.type === 'sword_slash_chidori') {
                    // Sector Collision (Special case, not fully handled by SpatialHash yet)
                    // But we can use SpatialHash broadphase to get candidates.
                    const owner = this.players[proj.ownerId];
                    if (owner) {
                        const distToOwner = Math.sqrt((e.pos.x - owner.pos.x) ** 2 + (e.pos.y - owner.pos.y) ** 2);
                        if (distToOwner < proj.size) { // Sword Range
                            // Check angle
                            const angleToEnemy = Math.atan2(e.pos.y - owner.pos.y, e.pos.x - owner.pos.x);
                            // Normalize angle diff
                            let angleDiff = angleToEnemy - proj.angle;
                            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                            if (Math.abs(angleDiff) < 0.8) { // ~45 degrees tolerance (total 90)
                                hit = true;
                            }
                        }
                    }
                } else {
                    // Standard Collision
                    hit = this.spatialHash.checkCollision(proj, e);
                }

                if (hit) {
                    const owner = this.players[proj.ownerId];
                    if (owner) {
                        this.damageEnemy(e, proj.dmg, owner);

                        // Chain Lightning Trigger (Level 3+ Sasuke)
                        if (proj.type === 'sword_slash_chidori') {
                            // Bounce to 3 targets, 300 range, half damage
                            this.chainLightning(owner, e.pos, proj.dmg * 0.5, 3, 300, [e.id]);
                        }
                    } else {
                        // Fallback if owner disconnected
                        e.hp -= proj.dmg;
                    }

                    proj.hitList.push(e.id);
                    if (proj.pierce > 0) {
                        proj.pierce--;
                    } else {
                        this.projectiles.splice(i, 1);
                        break; // Projectile destroyed
                    }

                    if (e.hp <= 0) {
                        e.dead = true;
                        // this.enemies.splice(j, 1); // Handled by cleanup loop
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

        // Update Spawners
        for (const spawner of this.spawners) {
            if (spawner.cooldown > 0) {
                spawner.cooldown -= dt;
            } else {
                let blocked = false;
                for (const item of this.items) {
                    const d = Math.sqrt((item.pos.x - spawner.pos.x) ** 2 + (item.pos.y - spawner.pos.y) ** 2);
                    if (d < 10) { blocked = true; break; }
                }

                if (!blocked) {
                    this.items.push({
                        id: this.nextEntityId++,
                        type: spawner.type,
                        pos: new Vec2(spawner.pos.x, spawner.pos.y),
                        value: spawner.type === 'health' ? 50 : (spawner.type === 'magnet' ? 1 : 100),
                        life: 60
                    });
                    spawner.cooldown = spawner.maxCooldown;
                }
            }
        }

        // Update Items
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.life -= dt;
            if (item.life <= 0) {
                this.items.splice(i, 1);
                continue;
            }

            for (let id in this.players) {
                const p = this.players[id];
                if (p.dead) continue;
                const d = Math.sqrt((p.pos.x - item.pos.x) ** 2 + (p.pos.y - item.pos.y) ** 2);
                if (d < 30) {
                    if (item.type === 'health') {
                        p.hp = Math.min(p.maxHp, p.hp + item.value);
                        this.spawnFloatingText(p.pos, `+${item.value} HP`, 'green', p.id);
                    } else if (item.type === 'magnet') {
                        for (const orb of this.xpOrbs) {
                            this.teamXP += orb.val;
                        }
                        this.xpOrbs = [];
                        this.spawnFloatingText(p.pos, "MAGNET!", 'cyan', p.id);
                    } else if (item.type === 'chest') {
                        this.teamXP += item.value;
                        this.spawnFloatingText(p.pos, `+${item.value} XP`, 'gold', p.id);
                    }

                    this.items.splice(i, 1);
                    break;
                }
            }
        }

        // XP Collection & Management
        // 1. Cap XP Orbs to 500
        const MAX_XP_ORBS = 500;
        if (this.xpOrbs.length > MAX_XP_ORBS) {
            // Sort by age (ID) to find oldest? Or just assume index 0 is oldest (since we push).
            // Yes, we push to end, so index 0 is oldest.
            const oldestOrb = this.xpOrbs[0];

            // Find nearest orb to merge into
            let nearestOrb: XpOrbState | null = null;
            let minDist = Infinity;

            // Search a subset to avoid O(N^2) if we did this for many orbs, 
            // but here we only do it for one orb per frame (or a few if we are way over limit).
            // Let's just search all other orbs.
            for (let i = 1; i < this.xpOrbs.length; i++) {
                const other = this.xpOrbs[i];
                const d = Math.sqrt((oldestOrb.pos.x - other.pos.x) ** 2 + (oldestOrb.pos.y - other.pos.y) ** 2);
                if (d < minDist) {
                    minDist = d;
                    nearestOrb = other;
                }
            }

            if (nearestOrb) {
                nearestOrb.val += oldestOrb.val;
                // Remove oldest
                this.xpOrbs.shift();
            } else {
                // No other orbs? Should not happen if length > 500.
                // Just remove it if we can't merge.
                this.xpOrbs.shift();
            }
        }

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
                            // Generate upgrades for each player
                            for (let pid in this.players) {
                                this.players[pid].selectedUpgrade = null;
                                this.players[pid].offeredUpgrades = this.generateUpgrades(this.players[pid]);
                            }
                        }
                    }
                }
            }
        }

        // Particle Update
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const part = this.particles[i];
            part.life -= dt;
            if (part.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            part.pos.x += part.vel.x * dt;
            part.pos.y += part.vel.y * dt;
        }

        // Floating Text Update
        FloatingTextHelper.update(this.floatingTexts, dt);
    }

    damagePlayer(p: PlayerState, amount: number) {
        if (p.invincible || p.dead) return;

        // Sharingan Dodge
        if (p.character === 'sasuke' && p.charState && 'sharinganCooldown' in p.charState) {
            if (p.charState.sharinganCooldown <= 0) {
                if (this.random() < 0.15) {
                    // Dodge!
                    p.charState.sharinganCooldown = 5.0; // Set cooldown
                    this.spawnFloatingText(p.pos, "Dodge!", "cyan", p.id);

                    // Grant Crit Buff
                    if ('dodgeBuffTimer' in p.charState) {
                        p.charState.dodgeBuffTimer = 2.0;
                    }
                    return; // No damage taken
                }
            }
        }

        // Gaara Passive: Shield
        if (p.character === 'gaara' && p.charState && 'shieldHp' in p.charState) {
            const shield = p.charState.shieldHp;
            if (shield > 0) {
                const absorb = Math.min(shield, amount);
                p.charState.shieldHp -= absorb;
                amount -= absorb;
                p.charState.shieldRegenTimer = 0; // Reset regen timer
                if (amount <= 0) return; // Fully absorbed
            } else {
                p.charState.shieldRegenTimer = 0;
            }
        }

        // Sakura Passive: Charge Meter
        if (p.character === 'sakura' && p.charState && 'meter' in p.charState) {
            p.charState.meter = Math.min(p.charState.meter + 10, 100);
        }

        // Apply Damage
        p.hp -= amount;
        p.flash = 0.1;

        // Kill player
        if (p.hp <= 0) {
            p.hp = 0;
            p.dead = true;
            p.reviveTimer = 0;
            p.spectatingTargetId = null; // Will default to self or cycle

            p.deathCount++;
            const respawnTime = Math.min(60, 15 + (p.deathCount * 9));
            p.autoRespawnTimer = respawnTime;

            this.spawnFloatingText(p.pos, "DEAD", "gray", p.id);
        }
    }

    damageEnemy(e: EnemyState, amount: number, sourcePlayer: PlayerState) {
        if (e.dead) return;

        // Apply Debuffs from Enemy
        // (None currently reduce incoming damage, but if we had armor, here)

        // Apply Player Stats
        let finalDamage = amount;

        // Crit
        let isCrit = false;
        let critChance = sourcePlayer.stats.critChance;

        // Sasuke Dodge Buff
        if (sourcePlayer.character === 'sasuke' && sourcePlayer.charState && 'dodgeBuffTimer' in sourcePlayer.charState) {
            if (sourcePlayer.charState.dodgeBuffTimer > 0) critChance += 0.5; // Massive crit boost after dodge
        }

        if (this.random() < critChance) {
            finalDamage *= 2;
            isCrit = true;
        }

        // Sakura Passive: 5x Damage if meter full
        if (sourcePlayer.character === 'sakura' && sourcePlayer.charState && 'meter' in sourcePlayer.charState) {
            if (sourcePlayer.charState.meter >= 100) {
                finalDamage *= 5;
                sourcePlayer.charState.meter = 0; // Consume
                this.spawnFloatingText(sourcePlayer.pos, "SMASH!", "pink", sourcePlayer.id);
            }
        }

        e.hp -= finalDamage;

        // Visuals
        const color = isCrit ? 'yellow' : 'white';
        const text = Math.ceil(finalDamage).toString() + (isCrit ? "!" : "");
        this.spawnFloatingText(e.pos, text, color, e.id);

        if (e.hp <= 0) {
            e.dead = true;
            this.xpOrbs.push({
                id: this.nextEntityId++,
                pos: new Vec2(e.pos.x, e.pos.y),
                val: 10,
                dead: false
            });
        }

    }



    updateCharacterPassives(p: PlayerState, dt: number) {
        if (p.dead) return;

        // Naruto: Regen
        if (p.character === 'naruto' && p.charState && 'regenTimer' in p.charState) {
            p.charState.regenTimer += dt;
            if (p.charState.regenTimer >= 1.0) {
                p.charState.regenTimer = 0;
                let regen = p.maxHp * 0.01;
                if (p.hp < p.maxHp * 0.3) regen *= 2;
                p.hp = Math.min(p.hp + regen, p.maxHp);
            }
        }

        // Gaara: Shield Regen
        if (p.character === 'gaara' && p.charState && 'shieldHp' in p.charState) {
            p.charState.shieldRegenTimer += dt;
            if (p.charState.shieldRegenTimer >= 8.0) {
                // Regenerate shield
                if (p.charState.shieldHp < 50) { // Max shield 50? Or based on HP?
                    p.charState.shieldHp += 10 * dt; // Slowly regen
                    if (p.charState.shieldHp > 50) p.charState.shieldHp = 50;
                }
            }
        }

        // Sasuke: Dodge Buff Timer
        if (p.character === 'sasuke' && p.charState && 'dodgeBuffTimer' in p.charState) {
            if (p.charState.dodgeBuffTimer > 0) {
                p.charState.dodgeBuffTimer -= dt;
                p.stats.critChance = 0.5; // 50% crit chance
            } else {
                p.stats.critChance = 0.05; // Reset
            }

            if (p.charState.sharinganCooldown > 0) {
                p.charState.sharinganCooldown -= dt;
            }
        }
    }



    fireWeapon(p: PlayerState) {
        const weapon = getWeapon(p.character || '');
        if (weapon) {
            weapon.fire(p, this);
        }
    }

    spawnProjectile(ownerId: number, pos: Vec2, angle: number, speed: number, dmg: number, type: string, knock: number, pierce: number, size: number) {
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
            targetAngle: angle, // Store initial angle
            ownerId: ownerId,
            hitList: [],
            size: size,
            shape: { type: 'circle', radius: size }
        });
    }

    // useSkill removed, logic moved to SkillLogic classes

    chainLightning(sourcePlayer: PlayerState, startPos: Vec2, damage: number, bounces: number, range: number, excludeIds: number[]) {
        if (bounces <= 0) return;

        // Find nearest enemy excluding excludeIds
        let closestE = null;
        let minDist = range;

        for (const e of this.enemies) {
            if (e.dead || excludeIds.includes(e.id)) continue;
            const d = Math.sqrt((startPos.x - e.pos.x) ** 2 + (startPos.y - e.pos.y) ** 2);
            if (d < minDist) {
                minDist = d;
                closestE = e;
            }
        }

        if (closestE) {
            // Apply Damage
            this.damageEnemy(closestE, damage, sourcePlayer);

            // Visual Beam (Particle)
            const angle = Math.atan2(closestE.pos.y - startPos.y, closestE.pos.x - startPos.x);

            // Spawn visual particle
            this.particles.push({
                id: this.nextEntityId++,
                type: 'lightning_bolt',
                pos: new Vec2(startPos.x, startPos.y),
                vel: new Vec2(0, 0), // Stationary
                life: 0.2, // Short flash
                maxLife: 0.2,
                color: 'cyan',
                size: minDist,
                angle: angle
            });

            // Recurse
            excludeIds.push(closestE.id);
            // Delay next bounce slightly? Or instant?
            // Instant is easier.
            this.chainLightning(sourcePlayer, closestE.pos, damage * 0.8, bounces - 1, range, excludeIds);
        }
    }

    generateUpgrades(player: PlayerState): UpgradeOption[] {
        // Delegate to UpgradeManager
        return UpgradeManager.generate(player, this.random.bind(this));
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
                const upgrade = p.offeredUpgrades[p.selectedUpgrade!];

                if (upgrade) {
                    this.applyUpgrade(p, upgrade);
                }

                p.selectedUpgrade = null;
                p.offeredUpgrades = [];
            }
            this.gamePhase = 'playing';
        }
    }

    applyUpgrade(player: PlayerState, upgrade: UpgradeOption) {
        // Delegate to UpgradeManager for stat changes
        UpgradeManager.apply(player, upgrade);

        // Provide visual feedback
        switch (upgrade.id) {
            case 'weapon_level':
                this.spawnFloatingText(player.pos, `Weapon Level ${player.weaponLevel}!`, 'gold');
                break;
            case 'damage':
                this.spawnFloatingText(player.pos, '+20% Damage!', 'red');
                break;
            case 'cooldown':
                this.spawnFloatingText(player.pos, '-15% Cooldown!', 'cyan');
                break;
            case 'crit':
                this.spawnFloatingText(player.pos, '+5% Crit!', 'yellow');
                break;
            case 'area':
                this.spawnFloatingText(player.pos, '+15% Area!', 'purple');
                break;
            case 'knockback':
                this.spawnFloatingText(player.pos, '+20% Knockback!', 'orange');
                break;
        }
    }

    spawnEnemy() {
        if (!ShinobiSurvivalGame.map) return; // Need map to spawn enemies

        // Determine enemy type based on time
        let type = 'zetsu';
        const rand = this.random();

        if (this.gameTime < 60) {
            // Mostly Zetsu
            type = rand < 0.9 ? 'zetsu' : 'sound';
        } else if (this.gameTime < 120) {
            // Mix
            type = rand < 0.6 ? 'zetsu' : (rand < 0.9 ? 'sound' : 'snake');
        } else {
            // Harder mix
            type = rand < 0.4 ? 'zetsu' : (rand < 0.7 ? 'sound' : 'snake');
        }

        const mapWidth = ShinobiSurvivalGame.map.width * ShinobiSurvivalGame.map.tileSize;
        const mapHeight = ShinobiSurvivalGame.map.height * ShinobiSurvivalGame.map.tileSize;

        // Spawn from edges of the map
        let startX: number;
        let startY: number;
        const edge = Math.floor(this.random() * 4); // 0=top, 1=right, 2=bottom, 3=left

        switch (edge) {
            case 0: // Top edge
                startX = this.random() * mapWidth;
                startY = -20;
                break;
            case 1: // Right edge
                startX = mapWidth + 20;
                startY = this.random() * mapHeight;
                break;
            case 2: // Bottom edge
                startX = this.random() * mapWidth;
                startY = mapHeight + 20;
                break;
            case 3: // Left edge
            default:
                startX = -20;
                startY = this.random() * mapHeight;
                break;
        }

        // HP Scaling
        const timeScale = 1 + (this.gameTime / 60); // +100% HP every minute

        let hp = 20 * timeScale;
        let speed = 100;

        if (type === 'sound') { hp = 15 * timeScale; speed = 210; }
        if (type === 'snake') { hp = 200 * timeScale; speed = 90; }

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
            push: new Vec2(0, 0),
            rooted: false,
            damageDebuff: 1.0,
            speedMult: 1.0,
            shape: { type: 'circle', radius: 20 }
        });
    }

    spawnFloatingText(pos: Vec2, text: string, color: string, targetId?: number) {
        // Find target position if possible
        let targetPos: Vec2 | undefined;
        if (targetId !== undefined) {
            const enemy = this.enemies.find(e => e.id === targetId);
            if (enemy) targetPos = enemy.pos;
            const player = this.players[targetId];
            if (player) targetPos = player.pos;
        }

        this.nextEntityId = FloatingTextHelper.spawn(this.floatingTexts, this.nextEntityId, pos, text, color, targetId, targetPos);
    }

    draw(canvas: HTMLCanvasElement) {
        try {
            const ctx = canvas.getContext("2d")!;

            // Background
            ctx.fillStyle = "#1b2e1b";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Tiled Background (Simple Grid)

            ctx.save();
            // Camera setup
            let localPlayerId = ShinobiSurvivalGame.localPlayerId;
            if (localPlayerId === null) localPlayerId = 0; // Fallback

            const localPlayer = this.players[localPlayerId];
            let targetPlayer = localPlayer;

            if (localPlayer && localPlayer.dead && localPlayer.spectatingTargetId !== null) {
                const spectateTarget = this.players[localPlayer.spectatingTargetId];
                if (spectateTarget) {
                    targetPlayer = spectateTarget;
                }
            }

            let cx = 0, cy = 0;
            if (targetPlayer) {
                cx = targetPlayer.pos.x - canvas.width / 2;
                cy = targetPlayer.pos.y - canvas.height / 2;
            }

            ctx.translate(-cx, -cy);

            // Draw Map Tiles
            if (ShinobiSurvivalGame.map) {
                const tileSize = ShinobiSurvivalGame.map.tileSize;
                // Calculate visible tile range
                const startTileX = Math.max(0, Math.floor(cx / tileSize));
                const startTileY = Math.max(0, Math.floor(cy / tileSize));
                const endTileX = Math.min(ShinobiSurvivalGame.map.width, Math.ceil((cx + canvas.width) / tileSize) + 1);
                const endTileY = Math.min(ShinobiSurvivalGame.map.height, Math.ceil((cy + canvas.height) / tileSize) + 1);

                for (let ty = startTileY; ty < endTileY; ty++) {
                    for (let tx = startTileX; tx < endTileX; tx++) {
                        const tile = ShinobiSurvivalGame.map.tiles[ty][tx];
                        const worldX = tx * tileSize;
                        const worldY = ty * tileSize;

                        // Get the sprite for this tile type
                        const spriteKey = `tile_${tile.textureType}`;
                        const sprite = SPRITES[spriteKey];

                        if (sprite) {
                            ctx.drawImage(sprite, worldX, worldY, tileSize, tileSize);
                        } else {
                            // Fallback colors if sprite not available
                            switch (tile.textureType) {
                                case 'grass': ctx.fillStyle = '#2d5a27'; break;
                                case 'tree': ctx.fillStyle = '#1b5e20'; break;
                                case 'rock': ctx.fillStyle = '#6b6b6b'; break;
                                case 'water': ctx.fillStyle = '#1a5276'; break;
                                default: ctx.fillStyle = '#2d5a27';
                            }
                            ctx.fillRect(worldX, worldY, tileSize, tileSize);
                        }
                    }
                }
            }

            // Draw Hazards
            for (const h of this.hazards) {
                ctx.globalAlpha = 0.6;
                if (h.type === 'acid') {
                    ctx.fillStyle = '#2ecc71';
                    ctx.beginPath(); ctx.arc(h.pos.x, h.pos.y, h.radius, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.stroke();
                } else if (h.type === 'fire') {
                    // Flame effect
                    const flicker = 1 + Math.sin(this.gameTime * 20 + h.id) * 0.1;
                    const r = h.radius * flicker;

                    // Outer glow
                    const grd = ctx.createRadialGradient(h.pos.x, h.pos.y, r * 0.2, h.pos.x, h.pos.y, r);
                    grd.addColorStop(0, "rgba(255, 255, 0, 0.8)"); // Yellow core
                    grd.addColorStop(0.6, "rgba(255, 69, 0, 0.6)"); // OrangeRed
                    grd.addColorStop(1, "rgba(255, 0, 0, 0)"); // Fade out

                    ctx.fillStyle = grd;
                    ctx.beginPath(); ctx.arc(h.pos.x, h.pos.y, r, 0, Math.PI * 2); ctx.fill();
                } else {
                    ctx.fillStyle = 'black'; // Amaterasu is black fire
                    ctx.beginPath(); ctx.arc(h.pos.x, h.pos.y, h.radius, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.stroke();
                }
                ctx.globalAlpha = 1.0;
            }

            // Draw XP Orbs
            for (const orb of this.xpOrbs) {
                // Color based on value
                let color = '#00d2ff'; // Default Blue (< 50)
                if (orb.val >= 500) color = '#ff00ff'; // Purple
                else if (orb.val >= 100) color = '#ffd700'; // Gold
                else if (orb.val >= 50) color = '#00ff00'; // Green

                ctx.fillStyle = color;
                ctx.beginPath(); ctx.arc(orb.pos.x, orb.pos.y, 4, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 5; ctx.shadowColor = color; ctx.fill(); ctx.shadowBlur = 0;
            }

            // Draw Enemies
            for (const e of this.enemies) {
                const sprite = SPRITES[e.type] || SPRITES.zetsu;
                ctx.drawImage(sprite, e.pos.x - sprite.width / 2, e.pos.y - sprite.height / 2);

                // Enemy HP Bar
                const hpPct = Math.min(Math.max(e.hp / e.maxHp, 0), 1);
                ctx.fillStyle = 'red'; ctx.fillRect(e.pos.x - 15, e.pos.y - 40, 30, 4);
                ctx.fillStyle = '#0f0'; ctx.fillRect(e.pos.x - 15, e.pos.y - 40, 30 * hpPct, 4);
            }

            // Draw Players
            for (let id in this.players) {
                const p = this.players[id];

                const spriteKey = p.character || 'naruto';
                const sprite = SPRITES[spriteKey];

                // Ultimate Visuals (Delegated)
                const ultLogic = getSkill(p.character || '', 'ult');
                if (!p.dead && ultLogic) ultLogic.draw(ctx, p.skills.ult, p, this);

                // Draw Shadow Clones (Visual Only)
                if (p.character === 'naruto' && p.weaponLevel >= 3 && !p.dead) {
                    const cloneSprite = SPRITES.naruto;
                    if (cloneSprite) {
                        ctx.save();
                        ctx.globalAlpha = 0.6;

                        // Clone 1: Fixed offset (Left side)
                        // "Staying by my side" -> Fixed relative to player position, not aim.
                        // Let's place them at x - 40 and x + 40 relative to player.
                        const x1 = p.pos.x - 40;
                        const y1 = p.pos.y;
                        ctx.drawImage(cloneSprite, x1 - cloneSprite.width / 2, y1 - cloneSprite.height / 2);

                        // Clone 2 (Level 4+): Fixed offset (Right side)
                        if (p.weaponLevel >= 4) {
                            const x2 = p.pos.x + 40;
                            const y2 = p.pos.y;
                            ctx.drawImage(cloneSprite, x2 - cloneSprite.width / 2, y2 - cloneSprite.height / 2);
                        }

                        ctx.restore();
                    }
                }

                // Draw colored circle under player's feet
                const playerColor = this.getPlayerColor(parseInt(id));
                ctx.fillStyle = playerColor;
                ctx.globalAlpha = 0.6; // Subtle transparency
                ctx.beginPath();
                ctx.ellipse(p.pos.x, p.pos.y + 15, 20, 8, 0, 0, Math.PI * 2); // Oval shadow shape
                ctx.fill();
                ctx.globalAlpha = 1.0; // Reset alpha

                ctx.save(); // Start player rendering group

                if (p.dead) {
                    ctx.filter = 'grayscale(100%) opacity(50%)';
                }

                ctx.translate(p.pos.x, p.pos.y);
                ctx.scale(p.direction, 1); // Flip based on direction
                if (sprite) {
                    ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
                } else {
                    ctx.fillStyle = 'orange'; ctx.fillRect(-10, -10, 20, 20);
                }

                ctx.restore(); // End Player Sprite Transform (Scale/Flip)

                if (p.dead) {
                    // Draw Revive Indicator
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 14px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText("NEEDS REVIVE", p.pos.x, p.pos.y - 60);

                    // Draw Auto-Respawn Timer
                    if (p.autoRespawnTimer > 0) {
                        ctx.fillStyle = 'yellow';
                        ctx.font = 'bold 24px Arial';
                        ctx.fillText(Math.ceil(p.autoRespawnTimer).toString(), p.pos.x, p.pos.y);
                    }

                    if (p.reviveTimer > 0) {
                        // Draw Progress Bar
                        const progress = Math.min(p.reviveTimer / 5.0, 1.0);
                        const barWidth = 40;
                        const barHeight = 6;
                        ctx.fillStyle = '#444';
                        ctx.fillRect(p.pos.x - barWidth / 2, p.pos.y - 80, barWidth, barHeight);
                        ctx.fillStyle = '#00ff00';
                        ctx.fillRect(p.pos.x - barWidth / 2, p.pos.y - 80, barWidth * progress, barHeight);
                    }
                }

                // Rasengan Charging Visuals (Delegated)
                const skillQLogic = getSkill(p.character || '', 'skillQ');
                if (skillQLogic) skillQLogic.draw(ctx, p.skills.skillQ, p, this);

                const skillELogic = getSkill(p.character || '', 'skillE');
                if (skillELogic) skillELogic.draw(ctx, p.skills.skillE, p, this);

                // Rasengan Dash Visuals
                if (p.character === 'naruto' && p.dashTime > 0) {
                    let size = 2.5;
                    if (p.charState && 'rasenganSize' in p.charState && p.charState.rasenganSize) {
                        size = p.charState.rasenganSize;
                    }
                    ctx.save();
                    ctx.translate(p.pos.x, p.pos.y);
                    const angle = Math.atan2(p.dashVec.y, p.dashVec.x);
                    ctx.rotate(angle);
                    // Scale based on size (default 2.5 was hardcoded, now dynamic)
                    // Base size 1.0 -> 40px? 2.5 -> 100px.
                    // So scale = size * 40.
                    const drawSize = size * 40;
                    if (SPRITES.rasengan) ctx.drawImage(SPRITES.rasengan, 0, -drawSize / 2, drawSize, drawSize);
                    ctx.restore();
                }

                // Player Name & HP (Above Head)
                if (parseInt(id) !== localPlayerId) {
                    ctx.fillStyle = 'white'; ctx.font = '12px Arial'; ctx.textAlign = 'center';
                    ctx.fillText(p.name, p.pos.x, p.pos.y - 45);

                    const hpPct = Math.min(Math.max(p.hp / p.maxHp, 0), 1);
                    ctx.fillStyle = 'red'; ctx.fillRect(p.pos.x - 20, p.pos.y - 40, 40, 5);
                    ctx.fillStyle = '#0f0'; ctx.fillRect(p.pos.x - 20, p.pos.y - 40, 40 * hpPct, 5);
                }
            }

            // Teammate Direction Indicators (Off-screen)
            for (let id in this.players) {
                if (parseInt(id) === targetPlayer.id) continue; // Skip self/target
                const p = this.players[id];

                // Check if off-screen
                // Viewport is [cx, cy] to [cx + width, cy + height]
                const margin = 50; // Padding from edge
                const onScreen = p.pos.x >= cx && p.pos.x <= cx + canvas.width &&
                    p.pos.y >= cy && p.pos.y <= cy + canvas.height;

                if (!onScreen) {
                    // Calculate angle from center of screen
                    const screenCenterX = cx + canvas.width / 2;
                    const screenCenterY = cy + canvas.height / 2;
                    const angle = Math.atan2(p.pos.y - screenCenterY, p.pos.x - screenCenterX);

                    // Calculate position on screen edge
                    // We want to intersect the ray from center with the screen bounds (minus margin)
                    // Screen bounds relative to center:
                    const halfW = canvas.width / 2 - margin;
                    const halfH = canvas.height / 2 - margin;

                    // Ray: x = t * cos(angle), y = t * sin(angle)
                    // We want to find t such that x = +/- halfW or y = +/- halfH
                    // tX = halfW / |cos(angle)|
                    // tY = halfH / |sin(angle)|
                    // t = min(tX, tY)

                    const tx = halfW / Math.abs(Math.cos(angle));
                    const ty = halfH / Math.abs(Math.sin(angle));
                    const t = Math.min(tx, ty);

                    const indicatorX = screenCenterX + t * Math.cos(angle);
                    const indicatorY = screenCenterY + t * Math.sin(angle);

                    // Draw Indicator
                    ctx.save();
                    ctx.translate(indicatorX, indicatorY);
                    ctx.rotate(angle);

                    const color = this.getPlayerColor(parseInt(id));
                    ctx.fillStyle = color;

                    // Arrow shape
                    ctx.beginPath();
                    ctx.moveTo(10, 0);
                    ctx.lineTo(-10, 10);
                    ctx.lineTo(-10, -10);
                    ctx.closePath();
                    ctx.fill();

                    // Text
                    ctx.rotate(-angle); // Reset rotation for text
                    ctx.fillStyle = color;
                    ctx.font = 'bold 16px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    // Offset text slightly towards center or away?
                    // Let's put it "under" or "next to" the arrow.
                    // Actually, just putting it near the arrow is fine.
                    // Let's offset it towards the center of the screen so it doesn't get clipped?
                    // Or just draw it at the indicator pos.
                    // Let's draw it slightly inward.
                    const textDist = 25;
                    const textX = -Math.cos(angle) * textDist;
                    const textY = -Math.sin(angle) * textDist;

                    ctx.fillText(`P${parseInt(id) + 1}`, textX, textY);

                    ctx.restore();
                }
            }

            // Draw Particles (Craters & Lightning)
            for (const part of this.particles) {
                if (part.type === 'crater') {
                    ctx.save();
                    ctx.translate(part.pos.x, part.pos.y);
                    ctx.globalAlpha = part.life / part.maxLife;
                    if (SPRITES.cracks) ctx.drawImage(SPRITES.cracks, -50, -50);
                    else {
                        ctx.fillStyle = 'rgba(0,0,0,0.5)';
                        ctx.beginPath(); ctx.ellipse(0, 0, 40, 20, 0, 0, Math.PI * 2); ctx.fill();
                    }
                    ctx.restore();
                } else if (part.type === 'lightning_bolt') {
                    ctx.save();
                    ctx.translate(part.pos.x, part.pos.y);
                    if (part.angle !== undefined) {
                        ctx.rotate(part.angle);
                    }

                    // Draw lightning bolt from (0,0) to (size, 0)
                    ctx.strokeStyle = 'cyan';
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = 'cyan';
                    ctx.lineWidth = 3;
                    ctx.globalAlpha = 0.8;

                    // Draw jagged lightning line
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    const segments = 8;
                    const dist = part.size;
                    for (let i = 1; i <= segments; i++) {
                        const x = (i / segments) * dist;
                        const y = (Math.random() - 0.5) * 20; // Random jitter
                        ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                    ctx.restore();
                }
            }

            // Draw Projectiles
            for (const proj of this.projectiles) {
                const sprite = SPRITES[proj.type];
                ctx.save();
                ctx.translate(proj.pos.x, proj.pos.y);
                ctx.rotate(proj.angle);

                if (proj.type === 'rotating_slash' || proj.type === 'rotating_slash_lightning' || proj.type === 'sword_slash_chidori') {
                    // Draw slash arc
                    const isLightning = proj.type === 'rotating_slash_lightning' || proj.type === 'sword_slash_chidori';
                    ctx.fillStyle = isLightning ? 'rgba(100, 200, 255, 0.6)' : 'rgba(200, 200, 255, 0.5)';
                    ctx.strokeStyle = isLightning ? 'cyan' : 'white';
                    ctx.lineWidth = isLightning ? 3 : 2;

                    ctx.beginPath();
                    ctx.arc(0, 0, proj.size, -0.8, 0.8); // Arc shape matches hitbox (0.8 rad)
                    ctx.lineTo(0, 0);
                    ctx.fill();
                    ctx.stroke();
                } else if (proj.type === 'shadow_clone') {
                    // Draw shadow clone as semi-transparent Naruto sprite
                    const cloneSprite = SPRITES.naruto;
                    if (cloneSprite) {
                        ctx.globalAlpha = 0.6;
                        ctx.drawImage(cloneSprite, -cloneSprite.width / 2, -cloneSprite.height / 2);
                        ctx.globalAlpha = 1.0;
                    }
                } else if (proj.type === 'clone_punch') {
                    // Draw Clone (Naruto Sprite)
                    const cloneSprite = SPRITES.naruto;
                    if (cloneSprite) {
                        ctx.globalAlpha = 0.7; // Slightly transparent
                        ctx.drawImage(cloneSprite, -cloneSprite.width / 2, -cloneSprite.height / 2);
                        ctx.globalAlpha = 1.0;
                    }
                } else if (sprite) {
                    if (proj.type === 'shuriken' || proj.type === 'rasenshuriken') {
                        ctx.rotate(this.gameTime * 20); // Spin
                    }
                    ctx.drawImage(sprite, -proj.size, -proj.size, proj.size * 2, proj.size * 2);
                } else if (proj.type === 'fireball') {
                    // Fallback Fireball Draw
                    ctx.fillStyle = 'orange'; ctx.beginPath(); ctx.arc(0, 0, proj.size, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = 'yellow'; ctx.beginPath(); ctx.arc(0, 0, proj.size * 0.75, 0, Math.PI * 2); ctx.fill();
                } else if (proj.type === 'rinnegan_effect') {
                    // Draw Rinnegan Effect (if sprite missing)
                    ctx.strokeStyle = '#8A2BE2'; ctx.lineWidth = 3;
                    ctx.beginPath(); ctx.arc(0, 0, proj.size, 0, Math.PI * 2); ctx.stroke();
                } else if (proj.type === 'fire_trail') {
                    // Draw Fire Trail (if sprite missing)
                    ctx.fillStyle = 'rgba(255, 69, 0, 0.6)';
                    ctx.beginPath(); ctx.arc(0, 0, proj.size, 0, Math.PI * 2); ctx.fill();
                } else {
                    ctx.fillStyle = 'yellow'; ctx.fillRect(-proj.size, -proj.size, proj.size * 2, proj.size * 2);
                }
                ctx.restore();
            }

            // Draw Floating Texts
            FloatingTextHelper.draw(ctx, this.floatingTexts);

            // Debug: Draw collision shapes
            if (ShinobiSurvivalGame.debugMode) {
                this.drawDebugShapes(ctx);
            }

            ctx.restore(); // End Camera Transform

            // Draw HUD
            ctx.restore(); // Restore camera transform to draw UI in screen space

            // Top Center Timer
            const timerW = 100;
            const timerH = 40;
            const timerX = (canvas.width - timerW) / 2;
            const timerY = 10;

            ctx.fillStyle = 'rgba(20, 20, 30, 0.9)';
            ctx.fillRect(timerX, timerY, timerW, timerH);
            ctx.strokeStyle = '#444'; ctx.lineWidth = 2; ctx.strokeRect(timerX, timerY, timerW, timerH);

            const minutes = Math.floor(this.gameTime / 60);
            const seconds = Math.floor(this.gameTime % 60);
            const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            ctx.fillStyle = 'white';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(timeStr, canvas.width / 2, timerY + timerH / 2);

            // Bottom Center Cockpit
            if (localPlayer && (this.gamePhase === 'playing' || this.gamePhase === 'levelUp')) {
                const cockpitW = 500;
                const cockpitH = 120;
                const cockpitX = (canvas.width - cockpitW) / 2;
                const cockpitY = canvas.height - cockpitH - 10; // 10px padding from bottom

                // Background
                ctx.fillStyle = 'rgba(20, 20, 30, 0.8)';
                ctx.fillRect(cockpitX, cockpitY, cockpitW, cockpitH);
                ctx.strokeStyle = '#444'; ctx.lineWidth = 2; ctx.strokeRect(cockpitX, cockpitY, cockpitW, cockpitH);

                // Portrait (Left)
                const portraitX = cockpitX + 60;
                const portraitY = cockpitY + 60;
                const portraitR = 40;

                ctx.save();
                ctx.beginPath();
                ctx.arc(portraitX, portraitY, portraitR, 0, Math.PI * 2);
                ctx.clip();

                // Draw Character Sprite
                const spriteKey = localPlayer.character || 'naruto';
                const sprite = SPRITES[spriteKey];
                if (sprite) {
                    // Draw larger version of sprite
                    ctx.drawImage(sprite, portraitX - 32, portraitY - 32, 64, 64);
                } else {
                    ctx.fillStyle = 'gray'; ctx.fillRect(portraitX - 32, portraitY - 32, 64, 64);
                }
                ctx.restore();

                // Portrait Border
                const playerColor = this.getPlayerColor(localPlayerId);
                ctx.strokeStyle = playerColor;
                ctx.lineWidth = 4;
                ctx.beginPath(); ctx.arc(portraitX, portraitY, portraitR, 0, Math.PI * 2); ctx.stroke();

                // Level Indicator
                const levelX = portraitX + 30;
                const levelY = portraitY + 30;
                ctx.fillStyle = '#222';
                ctx.beginPath(); ctx.arc(levelX, levelY, 12, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 2; ctx.stroke();

                ctx.fillStyle = 'white';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(this.teamLevel.toString(), levelX, levelY);

                // Main Content Area (Right of Portrait)
                const contentX = cockpitX + 120;
                const contentW = cockpitW - 130;

                // 1. Passives Row (Top)
                const passiveY = cockpitY + 20;
                const passiveSize = 20;
                const passiveGap = 5;

                // Draw simple icons for stats
                // Draw simple icons for stats
                const stats = [
                    { label: 'DMG', val: localPlayer.stats.damageMult, icon: 'sword' },
                    { label: 'CDR', val: localPlayer.stats.cooldownMult, icon: 'clock' },
                    { label: 'AREA', val: localPlayer.stats.areaMult, icon: 'area' },
                ];

                ctx.font = '10px Arial';
                stats.forEach((stat, i) => {
                    const px = contentX + i * (passiveSize + passiveGap + 30);

                    // Draw Icon
                    ctx.save();
                    ctx.translate(px + passiveSize / 2, passiveY + passiveSize / 2);
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 2;
                    ctx.beginPath();

                    if (stat.icon === 'sword') {
                        // Sword
                        ctx.moveTo(-4, 4); ctx.lineTo(4, -4); // Blade
                        ctx.moveTo(-2, 2); ctx.lineTo(2, 6); // Hilt Cross
                        ctx.moveTo(-5, 5); ctx.lineTo(-7, 7); // Handle
                    } else if (stat.icon === 'clock') {
                        // Clock
                        ctx.arc(0, 0, 7, 0, Math.PI * 2);
                        ctx.moveTo(0, 0); ctx.lineTo(0, -4); // Hour
                        ctx.moveTo(0, 0); ctx.lineTo(3, 0); // Minute
                    } else if (stat.icon === 'area') {
                        // Area (Expanding arrows)
                        ctx.moveTo(-2, -2); ctx.lineTo(-6, -6);
                        ctx.moveTo(-6, -6); ctx.lineTo(-3, -6);
                        ctx.moveTo(-6, -6); ctx.lineTo(-6, -3);

                        ctx.moveTo(2, 2); ctx.lineTo(6, 6);
                        ctx.moveTo(6, 6); ctx.lineTo(3, 6);
                        ctx.moveTo(6, 6); ctx.lineTo(6, 3);

                        ctx.moveTo(2, -2); ctx.lineTo(6, -6);
                        ctx.moveTo(-2, 2); ctx.lineTo(-6, 6);
                    }

                    ctx.stroke();
                    ctx.restore();

                    ctx.fillStyle = 'white';
                    ctx.textAlign = 'left';
                    ctx.fillText(stat.val.toFixed(1), px + passiveSize + 2, passiveY + 14);
                });

                // 2. Skills & Weapons Row (Middle)
                const skillY = cockpitY + 50;
                const skillSize = 40;
                const skillGap = 10;

                // Skill Q, E, R
                const drawSkillIcon = (x: number, key: string, label: string) => {
                    const skill = localPlayer.skills[key];
                    ctx.fillStyle = '#333'; ctx.fillRect(x, skillY, skillSize, skillSize);
                    ctx.strokeStyle = '#666'; ctx.lineWidth = 1; ctx.strokeRect(x, skillY, skillSize, skillSize);

                    ctx.fillStyle = 'white'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'right';
                    ctx.fillText(label, x + skillSize - 2, skillY + 12);

                    if (skill.cooldown > 0) {
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                        const h = (skill.cooldown / 10) * skillSize; // Assume max cd 10 for visual? Or just full
                        ctx.fillRect(x, skillY, skillSize, skillSize);

                        ctx.fillStyle = 'white'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
                        ctx.fillText(Math.ceil(skill.cooldown).toString(), x + skillSize / 2, skillY + skillSize / 2 + 5);
                    }
                };

                drawSkillIcon(contentX, 'skillQ', 'Q');
                drawSkillIcon(contentX + skillSize + skillGap, 'skillE', 'E');
                drawSkillIcon(contentX + (skillSize + skillGap) * 2, 'ult', 'R');

                // Weapons (Right of skills)
                const weaponX = contentX + (skillSize + skillGap) * 3 + 20;
                const weaponSize = 30;

                // Draw Main Weapon Icon (Placeholder)
                ctx.fillStyle = '#444'; ctx.fillRect(weaponX, skillY + 5, weaponSize, weaponSize);
                ctx.strokeStyle = '#888'; ctx.strokeRect(weaponX, skillY + 5, weaponSize, weaponSize);
                ctx.fillStyle = 'white'; ctx.font = '10px Arial'; ctx.textAlign = 'center';
                ctx.fillText(`Lv${localPlayer.weaponLevel}`, weaponX + weaponSize / 2, skillY + weaponSize / 2 + 5);

                // 3. HP Bar (Bottom)
                const hpY = cockpitY + 95;
                const hpH = 15;
                const hpW = contentW;

                const hpPct = localPlayer.hp / localPlayer.maxHp;
                ctx.fillStyle = '#222'; ctx.fillRect(contentX, hpY, hpW, hpH);
                ctx.fillStyle = '#2ecc71'; ctx.fillRect(contentX, hpY, hpW * hpPct, hpH);

                // HP Text
                ctx.fillStyle = 'white'; ctx.font = '10px Arial'; ctx.textAlign = 'center';
                ctx.fillText(`${Math.ceil(localPlayer.hp)} / ${localPlayer.maxHp}`, contentX + hpW / 2, hpY + 11);

                // 4. XP Bar (Absolute Bottom of Cockpit)
                const xpY = cockpitY + cockpitH - 4;
                const xpPct = Math.min(this.teamXP / this.xpToNextLevel, 1);
                ctx.fillStyle = '#00d2ff';
                ctx.fillRect(cockpitX, xpY, cockpitW * xpPct, 4);

                // Minimap (Bottom Right)
                if (ShinobiSurvivalGame.map) {
                    const mapW = ShinobiSurvivalGame.map.width * ShinobiSurvivalGame.map.tileSize;
                    const mapH = ShinobiSurvivalGame.map.height * ShinobiSurvivalGame.map.tileSize;

                    const minimapSize = 200;
                    const scale = minimapSize / Math.max(mapW, mapH);
                    const mmW = mapW * scale;
                    const mmH = mapH * scale;

                    const mmX = canvas.width - mmW - 20;
                    const mmY = canvas.height - mmH - 20;

                    // Background (Cached)
                    if (!minimapCache) {
                        minimapCache = document.createElement('canvas');
                        minimapCache.width = mmW;
                        minimapCache.height = mmH;
                        const mCtx = minimapCache.getContext('2d')!;

                        // Draw Map Tiles
                        const tileSize = ShinobiSurvivalGame.map.tileSize * scale;
                        for (let y = 0; y < ShinobiSurvivalGame.map.height; y++) {
                            for (let x = 0; x < ShinobiSurvivalGame.map.width; x++) {
                                const tile = ShinobiSurvivalGame.map.tiles[y][x];
                                let color = '#000';
                                switch (tile.textureType) {
                                    case 'grass': color = '#2d5a27'; break;
                                    case 'tree': color = '#1b5e20'; break;
                                    case 'rock': color = '#6b6b6b'; break;
                                    case 'water': color = '#1a5276'; break;
                                    default: color = '#2d5a27';
                                }
                                mCtx.fillStyle = color;
                                mCtx.fillRect(x * tileSize, y * tileSize, tileSize + 1, tileSize + 1); // +1 to fix gaps
                            }
                        }
                    }

                    // Draw Cached Map
                    ctx.drawImage(minimapCache, mmX, mmY);
                    ctx.strokeStyle = '#444'; ctx.lineWidth = 2; ctx.strokeRect(mmX, mmY, mmW, mmH);

                    // Players (Colored Dots)
                    for (let id in this.players) {
                        const p = this.players[id];
                        // Show all players, alive or dead

                        const px = mmX + p.pos.x * scale;
                        const py = mmY + p.pos.y * scale;

                        ctx.fillStyle = this.getPlayerColor(parseInt(id));

                        if (p.dead) {
                            // Dead Indicator: Hollow Circle with X
                            ctx.strokeStyle = this.getPlayerColor(parseInt(id));
                            ctx.lineWidth = 2;
                            ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.stroke();

                            // Draw X
                            ctx.beginPath();
                            ctx.moveTo(px - 3, py - 3); ctx.lineTo(px + 3, py + 3);
                            ctx.moveTo(px + 3, py - 3); ctx.lineTo(px - 3, py + 3);
                            ctx.stroke();
                        } else {
                            // Alive: Filled Dot
                            ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
                        }
                    }

                    // Camera Viewport (White Outline)
                    // Viewport in world space is [cx, cy] to [cx + canvas.width, cy + canvas.height]
                    // But we need to recalculate cx, cy since we are in screen space now and lost the local vars.
                    // Re-calculate camera pos based on targetPlayer
                    let targetPlayer = localPlayer;
                    if (localPlayer.dead && localPlayer.spectatingTargetId !== null) {
                        const spectateTarget = this.players[localPlayer.spectatingTargetId];
                        if (spectateTarget) targetPlayer = spectateTarget;
                    }

                    const camX = targetPlayer.pos.x - canvas.width / 2;
                    const camY = targetPlayer.pos.y - canvas.height / 2;

                    const vx = mmX + camX * scale;
                    const vy = mmY + camY * scale;
                    const vw = canvas.width * scale;
                    const vh = canvas.height * scale;

                    ctx.strokeStyle = 'white'; ctx.lineWidth = 1;
                    ctx.strokeRect(vx, vy, vw, vh);
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

                // Show local player's upgrades
                if (localPlayer && localPlayer.offeredUpgrades.length > 0) {
                    ctx.font = '24px Arial';
                    let upgradeY = 200;
                    for (let i = 0; i < localPlayer.offeredUpgrades.length; i++) {
                        const upgrade = localPlayer.offeredUpgrades[i];
                        const selected = localPlayer.selectedUpgrade === i;

                        ctx.fillStyle = selected ? 'gold' : 'white';
                        ctx.fillText(`${i + 1}. ${upgrade.name}`, canvas.width / 2, upgradeY);
                        ctx.font = '16px Arial';
                        ctx.fillStyle = selected ? 'yellow' : '#ccc';
                        ctx.fillText(upgrade.description, canvas.width / 2, upgradeY + 25);
                        ctx.font = '24px Arial';
                        upgradeY += 80;
                    }
                }

                // Show waiting status for other players
                ctx.font = '18px Arial';
                let y = 500;
                for (let id in this.players) {
                    const p = this.players[id];
                    if (parseInt(id) === localPlayerId) continue;
                    const status = p.selectedUpgrade !== null ? "SELECTED" : "CHOOSING...";
                    ctx.fillStyle = 'white';
                    ctx.fillText(`${p.name}: ${status}`, canvas.width / 2, y);
                    y += 30;
                }
            }
        } catch (err) {
            console.error("DRAW ERROR:", err);
        }
    }

    drawCharacterHUD(ctx: CanvasRenderingContext2D, p: PlayerState) {
        const canvas = ctx.canvas;
        if (p.character === 'gaara' && p.charState && 'shieldHp' in p.charState) {
            // Draw Shield Bar above HP bar
            const shieldPct = p.charState.shieldHp / 50; // Max shield 50
            ctx.fillStyle = '#555'; ctx.fillRect(20, canvas.height - 65, 150, 10);
            ctx.fillStyle = '#c2b280'; ctx.fillRect(20, canvas.height - 65, 150 * shieldPct, 10);
            ctx.strokeStyle = '#fff'; ctx.strokeRect(20, canvas.height - 65, 150, 10);
            ctx.fillStyle = 'white'; ctx.font = '10px Arial'; ctx.textAlign = 'left';
            ctx.fillText(`Shield: ${Math.ceil(p.charState.shieldHp)}`, 25, canvas.height - 56);
        } else if (p.character === 'sakura' && p.charState && 'meter' in p.charState) {
            // Draw Strength Meter
            const meterPct = p.charState.meter / 100;
            ctx.fillStyle = '#555'; ctx.fillRect(20, canvas.height - 65, 150, 10);
            ctx.fillStyle = '#ff69b4'; ctx.fillRect(20, canvas.height - 65, 150 * meterPct, 10);
            ctx.strokeStyle = '#fff'; ctx.strokeRect(20, canvas.height - 65, 150, 10);
            ctx.fillStyle = 'white'; ctx.font = '10px Arial'; ctx.textAlign = 'left';
            ctx.fillText(`Strength: ${Math.ceil(p.charState.meter)}%`, 25, canvas.height - 56);
        } else if (p.character === 'sasuke' && p.charState && 'sharinganCooldown' in p.charState) {
            // Draw Sharingan Icon/Cooldown
            const cd = p.charState.sharinganCooldown;
            const x = 20; const y = canvas.height - 80;

            ctx.fillStyle = cd > 0 ? 'rgba(100,0,0,0.5)' : 'rgba(255,0,0,0.8)';
            ctx.beginPath(); ctx.arc(x + 15, y + 15, 15, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();

            // Eye details (simple)
            ctx.fillStyle = 'black'; ctx.beginPath(); ctx.arc(x + 15, y + 15, 5, 0, Math.PI * 2); ctx.fill();

            if (cd > 0) {
                ctx.fillStyle = 'white'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
                ctx.fillText(Math.ceil(cd).toString(), x + 15, y + 20);
            } else {
                ctx.fillStyle = 'white'; ctx.font = '10px Arial'; ctx.textAlign = 'center';
                ctx.fillText("READY", x + 15, y + 40);
            }
        }
    }

    drawDebugShapes(ctx: CanvasRenderingContext2D) {
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 2;

        // Players (green)
        ctx.strokeStyle = 'lime';
        for (const id in this.players) {
            const p = this.players[id];
            if (p.dead || !p.shape) continue;
            this.drawShape(ctx, p.pos, p.shape);
        }

        // Enemies (red)
        ctx.strokeStyle = 'red';
        for (const e of this.enemies) {
            if (e.dead || !e.shape) continue;
            this.drawShape(ctx, e.pos, e.shape);
        }

        // Projectiles (yellow)
        ctx.strokeStyle = 'yellow';
        for (const proj of this.projectiles) {
            if (!proj.shape) continue;
            this.drawShape(ctx, proj.pos, proj.shape);
        }

        // Hazards (orange)
        ctx.strokeStyle = 'orange';
        for (const h of this.hazards) {
            if (!h.shape) continue;
            this.drawShape(ctx, h.pos, h.shape);
        }

        ctx.globalAlpha = 1.0;

        // Draw Entity Counters
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to screen space
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(10, 100, 200, 120);
        ctx.fillStyle = 'white';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        let y = 120;
        ctx.fillText(`Enemies: ${this.enemies.length}`, 20, y); y += 15;
        ctx.fillText(`Projectiles: ${this.projectiles.length}`, 20, y); y += 15;
        ctx.fillText(`XP Orbs: ${this.xpOrbs.length}`, 20, y); y += 15;
        ctx.fillText(`Particles: ${this.particles.length}`, 20, y); y += 15;
        ctx.fillText(`Floating Texts: ${this.floatingTexts.length}`, 20, y); y += 15;
        ctx.fillText(`Hazards: ${this.hazards.length}`, 20, y); y += 15;
        ctx.restore();
    }

    drawShape(ctx: CanvasRenderingContext2D, pos: Vec2, shape: Shape) {
        if (shape.type === 'circle') {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, shape.radius, 0, Math.PI * 2);
            ctx.stroke();
        } else if (shape.type === 'capsule') {
            // Draw capsule as two circles connected by tangent lines
            const start = new Vec2(pos.x + shape.startOffset.x, pos.y + shape.startOffset.y);
            const end = new Vec2(pos.x + shape.endOffset.x, pos.y + shape.endOffset.y);
            const r = shape.radius;

            // Calculate perpendicular direction
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
                const nx = -dy / len * r;
                const ny = dx / len * r;

                // Draw tangent lines
                ctx.beginPath();
                ctx.moveTo(start.x + nx, start.y + ny);
                ctx.lineTo(end.x + nx, end.y + ny);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(start.x - nx, start.y - ny);
                ctx.lineTo(end.x - nx, end.y - ny);
                ctx.stroke();
            }

            // Draw end caps
            ctx.beginPath();
            ctx.arc(start.x, start.y, r, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(end.x, end.y, r, 0, Math.PI * 2);
            ctx.stroke();
        } else if (shape.type === 'aabb') {
            ctx.strokeRect(
                pos.x - shape.width / 2,
                pos.y - shape.height / 2,
                shape.width,
                shape.height
            );
        }
    }
}
