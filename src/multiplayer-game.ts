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
                flash: 0
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
            if (input.keysPressed['e']) {
                const skill = p.skills.skill1;
                if (skill.cooldown <= 0) {
                    this.useSkill(p, 'skill1');
                    skill.cooldown = 2.0 * p.stats.cooldownMult; // Example cooldown
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

            // Basic Attack (Auto-fire closest enemy? Or click?)
            // For now, let's say left click or auto. Let's do auto-fire for simplicity like Vampire Survivors
            // Or maybe click to shoot shuriken
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

    useSkill(p: PlayerState, slot: string) {
        // Simple projectile spawn for now
        const speed = 600;
        this.projectiles.push({
            id: this.nextEntityId++,
            type: slot === 'skill1' ? 'shuriken' : 'rasengan',
            pos: new Vec2(p.pos.x, p.pos.y),
            vel: new Vec2(Math.cos(p.aimAngle) * speed, Math.sin(p.aimAngle) * speed),
            dmg: 20 * p.stats.damageMult,
            knock: 10,
            pierce: 1,
            life: 2.0,
            angle: p.aimAngle,
            ownerId: p.id,
            hitList: []
        });
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
        const id = this.nextEntityId++;
        const angle = this.random() * Math.PI * 2;
        const dist = 600; // Spawn outside screen
        // Find a reference point (e.g. first player)
        const p = Object.values(this.players)[0];
        const center = p ? p.pos : new Vec2(0, 0);

        const pos = new Vec2(center.x + Math.cos(angle) * dist, center.y + Math.sin(angle) * dist);

        this.enemies.push({
            id: id,
            type: this.random() > 0.8 ? 'sound_ninja' : 'zetsu',
            pos: pos,
            hp: 30,
            maxHp: 30,
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
        // ... (Simplified for now, just the base color)

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

