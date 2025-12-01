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
    floatingTexts: FloatingText[] = [];

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
                ultActiveTime: 0,
                dashTime: 0,
                dashVec: new Vec2(0, 0),
                dashHitList: []
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
            // Movement
            if (p.dashTime > 0) {
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
                            const dmg = 50 * p.stats.damageMult;
                            e.hp -= dmg;
                            this.spawnFloatingText(e.pos, Math.ceil(dmg).toString(), 'white');
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
                                e.hp -= dmg;
                                this.spawnFloatingText(e.pos, Math.ceil(dmg).toString(), 'white');

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
                                e.hp -= 50 * p.stats.damageMult;
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

            // Old hardcoded skill logic removed

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
            spawnRate = 1.5; // Slow start
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
                const speed = 100;
                // Apply Push
                e.pos.x += (Math.cos(angle) * speed + e.push.x) * dt;
                e.pos.y += (Math.sin(angle) * speed + e.push.y) * dt;

                // Decay Push
                e.push.x *= 0.95;
                e.push.y *= 0.95;

                // Collision with Player (Damage)
                if (closestP) {
                    // Invincibility check for Naruto during Rasengan
                    if (closestP.character === 'naruto' && (closestP.skillCharging || closestP.dashTime > 0)) {
                        // Invincible
                    } else {
                        const d = Math.sqrt((closestP.pos.x - e.pos.x) ** 2 + (closestP.pos.y - e.pos.y) ** 2);
                        if (d < 30) { // Touch radius
                            const dmg = 10 * dt; // DPS
                            closestP.hp -= dmg;
                            if (Math.random() < 0.1) this.spawnFloatingText(closestP.pos, Math.ceil(10).toString(), 'red');
                        }
                    }
                }
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

            proj.pos.x += proj.vel.x * dt;
            proj.pos.y += proj.vel.y * dt;

            // Collision with Enemies
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const e = this.enemies[j];
                if (proj.hitList.includes(e.id)) continue;

                const dist = Math.sqrt((proj.pos.x - e.pos.x) ** 2 + (proj.pos.y - e.pos.y) ** 2);
                if (dist < 30) { // Hit radius
                    e.hp -= proj.dmg;
                    this.spawnFloatingText(e.pos, Math.ceil(proj.dmg).toString(), 'white');
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
            push: new Vec2(0, 0)
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

            for (let y = startY; y < endY; y += gridY) {
                // Grass Texture (More detailed noise)
                for (let x = forestLeft - 200; x < forestRight + 200; x += 20) {
                    // Use a deterministic pseudo-random noise based on position
                    const noise = Math.sin(x * 0.12 + y * 0.15) * Math.cos(x * 0.08 + y * 0.02) * Math.sin((x + y) * 0.05);

                    if (noise > 0.2) {
                        const gx = x + (noise * 10);
                        const gy = y + (noise * 10);

                        // Vary color slightly
                        const colorVar = Math.floor(noise * 40);
                        // Brighter Green: Base #3cb043 (60, 176, 67)
                        // High Contrast: #2ecc71 (46, 204, 113)
                        // Let's go with a vibrant anime grass look
                        // Base: 46, 200, 80. Var: +/- 20
                        const r = 46 + colorVar;
                        const g = 180 + colorVar;
                        const b = 60 + colorVar;

                        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                        ctx.fillRect(gx, gy, 6, 6);
                    }
                }

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
                if (sprite) {
                    ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
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
}
