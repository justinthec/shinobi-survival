import {
    Game,
    NetplayPlayer,
    DefaultInput,
    Vec2,
} from "netplayjs";
import { initSprites, SPRITES } from "./sprites";
import { getSkill, getWeapon, getCharacterLogic } from "./skills";
import {
    updatePlayers,
    updateEnemies,
    updateProjectiles,
    updateHazards,
    updateXpOrbs,
    updateParticles,
    updateFloatingTexts,
    spawnEnemies
} from "./game-loop";

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

const MAX_ENEMIES = 50;
export class ShinobiSurvivalGame extends Game {
    static timestep = 1000 / 60;
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
                    skillQ: { cooldown: 0, chargeTime: 0, isCharging: false, activeTime: 0 },
                    skillE: { cooldown: 0, chargeTime: 0, isCharging: false, activeTime: 0 },
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

        updatePlayers(this, dt, playerInputs);
        updateHazards(this, dt);
        spawnEnemies(this, dt);
        updateEnemies(this, dt);
        updateProjectiles(this, dt);
        updateXpOrbs(this, dt);
        updateParticles(this, dt);
        updateFloatingTexts(this, dt);
    }

    damagePlayer(p: PlayerState, amount: number) {
        if (p.invincible || p.dead) return;

        const characterLogic = getCharacterLogic(p.character || '');
        if (characterLogic) {
            amount = characterLogic.onDamage(p, this, amount);
        }

        if (amount <= 0) return;

        p.hp -= amount;
        p.flash = 0.1;
    }

    damageEnemy(e: EnemyState, amount: number, sourcePlayer: PlayerState) {
        if (e.dead) return;

        let finalDamage = amount;

        // Crit
        let isCrit = false;
        let critChance = sourcePlayer.stats.critChance;
        if (sourcePlayer.character === 'sasuke' && sourcePlayer.charState && 'dodgeBuffTimer' in sourcePlayer.charState) {
            if (sourcePlayer.charState.dodgeBuffTimer > 0) critChance += 0.5;
        }
        if (this.random() < critChance) {
            finalDamage *= 2;
            isCrit = true;
        }

        // Character-specific damage modifications
        const characterLogic = getCharacterLogic(sourcePlayer.character || '');
        if (characterLogic) {
            finalDamage = characterLogic.onDealDamage(sourcePlayer, this, finalDamage);
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
            size: size
        });
    }

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
        const upgrades: UpgradeOption[] = [];

        // Always offer weapon level up if not maxed
        if (player.weaponLevel < 5) {
            const levelText = player.weaponLevel === 4 ? "Evolution" : `Level ${player.weaponLevel + 1}`;
            upgrades.push({
                id: 'weapon_level',
                name: `Increase Weapon Level (${levelText})`,
                description: `Upgrade your main weapon to the next level`,
                type: 'weapon'
            });
        }

        // Add placeholder stat upgrades
        upgrades.push({
            id: 'damage',
            name: 'Increase Damage (+20%)',
            description: 'Increase all damage dealt',
            type: 'stat'
        });

        upgrades.push({
            id: 'cooldown',
            name: 'Reduce Cooldown (-15%)',
            description: 'Reduce all skill cooldowns',
            type: 'stat'
        });

        // Return 3 random upgrades (shuffle and take 3)
        for (let i = upgrades.length - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            [upgrades[i], upgrades[j]] = [upgrades[j], upgrades[i]];
        }

        return upgrades.slice(0, 3);
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
        switch (upgrade.id) {
            case 'weapon_level':
                player.weaponLevel = Math.min(player.weaponLevel + 1, 5);
                if (player.weaponLevel >= 5) player.isEvolved = true;
                this.spawnFloatingText(player.pos, `Weapon Level ${player.weaponLevel}!`, 'gold');
                break;
            case 'damage':
                player.stats.damageMult *= 1.2;
                this.spawnFloatingText(player.pos, '+20% Damage!', 'red');
                break;
            case 'cooldown':
                player.stats.cooldownMult *= 0.85;
                this.spawnFloatingText(player.pos, '-15% Cooldown!', 'cyan');
                break;
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

                ctx.translate(p.pos.x, p.pos.y);
                ctx.scale(p.direction, 1); // Flip based on direction
                if (sprite) {
                    ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
                } else {
                    ctx.fillStyle = 'orange'; ctx.fillRect(-10, -10, 20, 20);
                }

                ctx.restore(); // End Player Sprite Transform (Scale/Flip)

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

                    drawSkill(180, 'skillQ', 'Q');
                    drawSkill(240, 'skillE', 'E');
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
}
