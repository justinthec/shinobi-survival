import {
    Game,
    NetplayPlayer,
    DefaultInput,
    Vec2,
} from "netplayjs";
import { initSprites, SPRITES } from "./sprites";
import { getSkill } from "./skills";

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
    FloatingText
} from "./types";

export class ShinobiSurvivalGame extends Game {
    // The netplayjs runner ticks the simulation 4 times per frame, so we adjust the timestep accordingly.
    static timestep = 1000 / 60 / 4;
    static canvasSize = { width: 640, height: 360 };
    static numPlayers = 2; // Default, can be overridden by wrapper
    static localPlayerId: number | null = null;

    // Game State
    players: Record<number, PlayerState> = {};
    enemies: EnemyState[] = [];
    projectiles: ProjectileState[] = [];
    xpOrbs: XpOrbState[] = [];
    particles: ParticleState[] = [];
    hazards: HazardZoneState[] = [];
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
                dashTime: 0,
                dashVec: new Vec2(0, 0),
                dashHitList: [],
                charState: null,
                invincible: false,
                rooted: false
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
                for (const e of this.enemies) {
                    if (!p.dashHitList.includes(e.id)) {
                        const dist = Math.sqrt((p.pos.x - e.pos.x) ** 2 + (p.pos.y - e.pos.y) ** 2);
                        if (dist < 100) { // Increased radius
                            p.dashHitList.push(e.id);
                            p.dashHitList.push(e.id);
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
                        for (const e of this.enemies) {
                            const dist = Math.sqrt((p.pos.x - e.pos.x) ** 2 + (p.pos.y - e.pos.y) ** 2);
                            if (dist < 150) {
                                this.damageEnemy(e, 50 * p.stats.damageMult, p);
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
                    p.pos.x += (dx / len) * moveSpeed * dt;
                    p.pos.y += (dy / len) * moveSpeed * dt;

                    if (dx !== 0) p.direction = Math.sign(dx);
                }
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
            const skill1Logic = getSkill(p.character || '', 'skill1');
            const ultLogic = getSkill(p.character || '', 'ult');

            // Update Skills
            if (skill1Logic) skill1Logic.update(p.skills.skill1, p, this, dt);
            if (ultLogic) ultLogic.update(p.skills.ult, p, this, dt);

            // Input Handling
            // Skill 1 (E)
            if (input.keysHeld['e']) {
                if (skill1Logic) skill1Logic.onHold(p.skills.skill1, p, this, dt);
                // For press detection, we might need a better way if we want single frame press
                // But keysPressed is available
            }

            if (input.keysPressed['e']) {
                if (skill1Logic) skill1Logic.onPress(p.skills.skill1, p, this);
            }

            // Detect release (if needed, simplified)
            // Ideally we track previous key state, but for now we can check if not held
            // Actually, we need to know if it WAS held. 
            // For Naruto's charge, we rely on `skillCharging` state or similar.
            // Let's rely on the logic class to handle state transitions if possible, 
            // but we need to signal release.
            // A simple way: if we were charging and now key is not held.
            if (!input.keysHeld['e'] && p.skills.skill1.isCharging) {
                if (skill1Logic) skill1Logic.onRelease(p.skills.skill1, p, this);
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
            for (const e of this.enemies) {
                const d = Math.sqrt((h.pos.x - e.pos.x) ** 2 + (h.pos.y - e.pos.y) ** 2);
                if (d < h.radius) {
                    if (h.type === 'quicksand') {
                        e.speedMult *= 0.5; // 50% slow
                    }
                    const dmg = h.damage * dt;
                    e.hp -= dmg;
                    if (Math.random() < 0.1) this.spawnFloatingText(e.pos, Math.ceil(h.damage).toString(), 'white');
                }
            }
        }

        // Enemy Spawning
        this.spawnTimer += dt;

        // Wave Logic
        let spawnRate = 1.0;
        let waveMultiplier = 1;

        if (this.gameTime < 60) {
            spawnRate = 1.0; // Slow start
            waveMultiplier = 1;
        } else if (this.gameTime < 120) {
            spawnRate = 0.8; // Medium
            waveMultiplier = 2;
        } else {
            spawnRate = 0.4; // Fast
            waveMultiplier = 3;
        }

        if (this.spawnTimer > spawnRate) {
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
                // Apply Push
                e.pos.x += (Math.cos(angle) * speed + e.push.x) * dt;
                e.pos.y += (Math.sin(angle) * speed + e.push.y) * dt;

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
                        this.spawnFloatingText(e.pos, bleedDmg.toString(), "red");
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
            if (proj.type === 'rotating_slash') {
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

                    // Arc: -35 to +35 degrees relative to aimAngle?
                    // Or start from one side and swing to other.
                    // Let's swing from -35 to +35.
                    const swingRange = 70 * (Math.PI / 180);
                    const startAngle = -swingRange / 2;
                    const currentSwing = startAngle + (swingRange * progress);

                    // Attach to owner aim
                    // We need to lock the aimAngle at start of swing? 
                    // Or follow player aim? User said "attached to his body".
                    // Usually this means it follows the player's facing.
                    // Let's follow current aimAngle.
                    proj.angle = owner.aimAngle + currentSwing;

                    const radius = 30; // Closer to body (was 40)
                    proj.pos.x = owner.pos.x + Math.cos(proj.angle) * radius;
                    proj.pos.y = owner.pos.y + Math.sin(proj.angle) * radius;
                }
            } else {
                proj.pos.x += proj.vel.x * dt;
                proj.pos.y += proj.vel.y * dt;
            }

            // Collision with Enemies
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const e = this.enemies[j];
                if (proj.hitList.includes(e.id)) continue;

                let hit = false;
                if (proj.type === 'rotating_slash') {
                    // Sector Collision
                    const owner = this.players[proj.ownerId];
                    if (owner) {
                        const distToOwner = Math.sqrt((e.pos.x - owner.pos.x) ** 2 + (e.pos.y - owner.pos.y) ** 2);
                        if (distToOwner < 80) { // Sword Range
                            // Check angle
                            const angleToEnemy = Math.atan2(e.pos.y - owner.pos.y, e.pos.x - owner.pos.x);
                            // Normalize angle diff
                            let angleDiff = angleToEnemy - proj.angle;
                            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                            if (Math.abs(angleDiff) < 0.8) { // ~45 degrees tolerance (total 90? or match visual 70)
                                hit = true;
                            }
                        }
                    }
                } else {
                    const dist = Math.sqrt((proj.pos.x - e.pos.x) ** 2 + (proj.pos.y - e.pos.y) ** 2);
                    if (dist < 30) hit = true;
                }

                if (hit) {
                    const owner = this.players[proj.ownerId];
                    if (owner) {
                        this.damageEnemy(e, proj.dmg, owner);
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
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.life -= dt;
            ft.pos.y -= 20 * dt; // Float up
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    damagePlayer(p: PlayerState, amount: number) {
        if (p.invincible || p.dead) return;

        // Sharingan Dodge
        if (p.character === 'sasuke' && p.charState && 'sharinganCooldown' in p.charState) {
            if (p.charState.sharinganCooldown <= 0) {
                if (this.random() < 0.15) {
                    // Dodge!
                    p.charState.sharinganCooldown = 5.0; // Set cooldown
                    this.spawnFloatingText(p.pos, "Dodge!", "cyan");

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
                this.spawnFloatingText(sourcePlayer.pos, "SMASH!", "pink");
            }
        }

        e.hp -= finalDamage;

        // Visuals
        const color = isCrit ? 'yellow' : 'white';
        const text = Math.ceil(finalDamage).toString() + (isCrit ? "!" : "");
        this.spawnFloatingText(e.pos, text, color);

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

            // Level 3: Shadow Clone Barrage (Triples projectiles)
            if (p.weaponLevel >= 3 && !p.isEvolved) {
                // Clone 1
                const c1Pos = new Vec2(p.pos.x + Math.cos(angle + Math.PI / 2) * 30, p.pos.y + Math.sin(angle + Math.PI / 2) * 30);
                this.spawnProjectile(p.id, c1Pos, angle, pSpeed, pDmg, projType, p.stats.knockback + 2, pPierce);
                // Clone 2
                const c2Pos = new Vec2(p.pos.x + Math.cos(angle - Math.PI / 2) * 30, p.pos.y + Math.sin(angle - Math.PI / 2) * 30);
                this.spawnProjectile(p.id, c2Pos, angle, pSpeed, pDmg, projType, p.stats.knockback + 2, pPierce);
            }
        } else if (p.character === 'sasuke') {
            // Level 3: Chidori Blade (Increased range/speed)
            const isChidori = p.weaponLevel >= 3;

            if (isChidori) {
                const slashSpeed = 180;
                this.spawnProjectile(p.id, p.pos, angle, slashSpeed, dmg * 2, 'sword_slash', 10, 99);

                // Lightning / Chidori
                const lightningDmg = dmg * 1.5;
                const lightningPierce = p.isEvolved ? 999 : 3;
                const lightningType = p.isEvolved ? 'chidori_spear' : 'lightning';

                this.spawnProjectile(p.id, p.pos, angle, 720, lightningDmg, lightningType, 4 + p.stats.knockback, lightningPierce);
            } else {
                // Level 1: Rotating Slash
                // Spawn with short life for swing
                this.spawnProjectile(p.id, p.pos, angle, 0, dmg, 'rotating_slash', 5 + p.stats.knockback, 99);
                // We need to set life to 0.3 manually? spawnProjectile sets it to 2.0 default.
                // We can find the projectile we just spawned.
                const proj = this.projectiles[this.projectiles.length - 1];
                if (proj) proj.life = 0.3;
            }
        } else if (p.character === 'gaara') {
            // Level 3: Sand Tsunami (Wave)
            if (p.weaponLevel >= 3) {
                // Spawn 3 sand projectiles in a cone
                this.spawnProjectile(p.id, p.pos, angle, 210, dmg * 1.8, 'sand', 10 + p.stats.knockback, 999);
                this.spawnProjectile(p.id, p.pos, angle + 0.3, 210, dmg * 1.8, 'sand', 10 + p.stats.knockback, 999);
                this.spawnProjectile(p.id, p.pos, angle - 0.3, 210, dmg * 1.8, 'sand', 10 + p.stats.knockback, 999);
            } else {
                this.spawnProjectile(p.id, p.pos, angle, 210, dmg * 1.8, 'sand', 5 + p.stats.knockback, 999);
            }
        } else if (p.character === 'sakura') {
            // Level 3: Chakra Punch (Area Impact)
            // We use a short range projectile that hits multiple times or has large area
            const punchRange = p.weaponLevel >= 3 ? 1.5 : 1.0;
            const punchDmg = p.weaponLevel >= 3 ? dmg * 3 : dmg * 2;
            const punchSize = p.weaponLevel >= 3 ? 40 : 20;

            // We spawn a "rock_wave" or "punch" projectile
            this.spawnProjectile(p.id, p.pos, angle, 300, punchDmg, 'rock_wave', 20 + p.stats.knockback, 999);
            // Note: rock_wave logic in update might need to handle size/range if we want it to be distinct.
            // For now, just using damage/knockback scaling.
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

    // useSkill removed, logic moved to SkillLogic classes

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

        const side = this.random() < 0.5 ? -1 : 1;
        const MAP_WIDTH = 1400;
        const pIds = Object.keys(this.players);
        if (pIds.length === 0) return;
        const p = this.players[parseInt(pIds[Math.floor(this.random() * pIds.length)])];

        const startX = side === -1 ? -MAP_WIDTH / 2 - 50 : MAP_WIDTH / 2 + 50;
        const startY = p.pos.y + (this.random() - 0.5) * 800;

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
            speedMult: 1.0
        });
    }

    spawnFloatingText(pos: Vec2, text: string, color: string) {
        this.floatingTexts.push({
            id: this.nextEntityId++,
            pos: new Vec2(pos.x, pos.y - 20),
            vel: new Vec2(0, -20),
            text: text,
            color: color,
            life: 1.0,
            maxLife: 1.0,
            size: 20
        });
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

            // Draw tiled grass floor
            if (SPRITES.grass && SPRITES.grass instanceof HTMLImageElement && SPRITES.grass.complete) {
                const tileSize = 64; // Adjust based on your grass.png dimensions
                const grassStartX = Math.floor((cx - 200) / tileSize) * tileSize;
                const grassStartY = Math.floor((cy - 200) / tileSize) * tileSize;
                const grassEndX = cx + canvas.width + 200;
                const grassEndY = cy + canvas.height + 200;

                for (let y = grassStartY; y < grassEndY; y += tileSize) {
                    for (let x = grassStartX; x < grassEndX; x += tileSize) {
                        ctx.drawImage(SPRITES.grass, x, y, tileSize, tileSize);
                    }
                }
            }

            // Draw forest borders
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
                        if (SPRITES.tree) ctx.drawImage(SPRITES.tree, x - 60, y); // Shift left by half width to align trunk
                    }
                }
            }

            // Draw Hazards
            for (const h of this.hazards) {
                ctx.globalAlpha = 0.4;
                if (h.type === 'acid') ctx.fillStyle = '#2ecc71';
                else ctx.fillStyle = 'black'; // Amaterasu is black fire

                ctx.beginPath(); ctx.arc(h.pos.x, h.pos.y, h.radius, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1.0;
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
                const hpPct = Math.min(Math.max(e.hp / e.maxHp, 0), 1);
                ctx.fillStyle = 'red'; ctx.fillRect(e.pos.x - 15, e.pos.y - 40, 30, 4);
                ctx.fillStyle = '#0f0'; ctx.fillRect(e.pos.x - 15, e.pos.y - 40, 30 * hpPct, 4);
            }

            // Draw Players
            for (let id in this.players) {
                const p = this.players[id];
                if (p.dead) continue;

                const spriteKey = p.character || 'naruto';
                const sprite = SPRITES[spriteKey];

                // Ultimate Visuals (Delegated)
                const ultLogic = getSkill(p.character || '', 'ult');
                if (ultLogic) ultLogic.draw(ctx, p.skills.ult, p, this);

                ctx.save(); // Start player rendering group

                ctx.translate(p.pos.x, p.pos.y);
                ctx.scale(p.direction, 1); // Flip based on direction
                if (sprite) {
                    ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
                } else {
                    ctx.fillStyle = 'orange'; ctx.fillRect(-10, -10, 20, 20);
                }

                ctx.restore(); // End Player Sprite Transform (Scale/Flip)

                // Rasengan Charging Visuals (Delegated)
                const skill1Logic = getSkill(p.character || '', 'skill1');
                if (skill1Logic) skill1Logic.draw(ctx, p.skills.skill1, p, this);

                // Rasengan Dash Visuals
                if (p.character === 'naruto' && p.dashTime > 0) {
                    const size = 2.5;
                    ctx.save();
                    ctx.translate(p.pos.x, p.pos.y);
                    const angle = Math.atan2(p.dashVec.y, p.dashVec.x);
                    ctx.rotate(angle);
                    if (SPRITES.rasengan) ctx.drawImage(SPRITES.rasengan, 0, -50, 100, 100);
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

            // Draw Particles (Craters)
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
                }
            }

            // Draw Projectiles
            for (const proj of this.projectiles) {
                const sprite = SPRITES[proj.type];
                ctx.save();
                ctx.translate(proj.pos.x, proj.pos.y);
                ctx.rotate(proj.angle);

                if (proj.type === 'rotating_slash') {
                    // Draw slash arc
                    ctx.fillStyle = 'rgba(200, 200, 255, 0.5)';
                    ctx.beginPath();
                    ctx.arc(0, 0, 80, -Math.PI / 4, Math.PI / 4); // Arc shape
                    ctx.lineTo(0, 0);
                    ctx.fill();
                } else if (sprite) {
                    ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
                } else if (proj.type === 'fireball') {
                    // Fallback Fireball Draw
                    ctx.fillStyle = 'orange';
                    ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = 'red';
                    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
                } else {
                    ctx.fillStyle = 'yellow'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
                }
                ctx.restore();
            }

            // Draw Floating Texts
            for (const ft of this.floatingTexts) {
                ctx.save();
                ctx.fillStyle = ft.color;
                ctx.font = `bold ${ft.size}px Arial`;
                ctx.textAlign = 'center';
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 2;
                ctx.fillText(ft.text, ft.pos.x, ft.pos.y);
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

                    this.drawCharacterHUD(ctx, localPlayer);
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
}
