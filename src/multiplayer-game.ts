import {
    Game,
    NetplayPlayer,
    DefaultInput,
    Vec2,
} from "netplayjs";
import {
    GamePhase,
    PlayerState,
    ProjectileState,
    ParticleState,
    FloatingText,
    CharacterType,
    KOTH_SETTINGS,
    PLAYER_RADIUS,
    MAP_SIZE
} from "./types";
import { Renderer } from "./renderer";
import { CombatManager } from "./managers/combat-manager";
import { CharacterRegistry } from "./core/registries";
import { registerNaruto } from "./characters/naruto";
import { registerSasuke } from "./characters/sasuke";
import { registerRockLee } from "./characters/rocklee";
import { SeededRNG } from "./core/utils";

// Register Characters
registerNaruto();
registerSasuke();
registerRockLee();

export class ShinobiClashGame extends Game {
    static timestep = 1000 / 60;
    static canvasSize = {
        width: 1280,
        height: 720
    };
    static numPlayers = 2;

    // Game State
    gamePhase: GamePhase = 'charSelect';
    players: Record<number, PlayerState> = {};
    projectiles: ProjectileState[] = [];
    particles: ParticleState[] = [];
    floatingTexts: FloatingText[] = [];

    // KOTH State
    kothState = {
        occupantId: null as number | null,
        occupantTimer: 0,
        contested: false
    };

    nextEntityId: number = 0;
    gameTime: number = 0;

    // Renderer (Client-side only)
    renderer?: Renderer;

    constructor(canvas: HTMLCanvasElement, players: Array<NetplayPlayer>) {
        super();

        // Initialize renderer as non-enumerable to prevent serialization
        Object.defineProperty(this, 'renderer', {
            value: new Renderer(canvas),
            enumerable: false,
            writable: true,
            configurable: true
        });

        // Initialize Players
        for (let p of players) {
            if (p.isLocalPlayer()) {
                ShinobiClashGame.localPlayerId = p.id;
            }

            this.players[p.id] = {
                id: p.id,
                name: `Player ${p.id + 1}`,
                character: null,
                pos: new Vec2(200, MAP_SIZE / 2),
                angle: 0,
                hp: 100,
                maxHp: 100,
                dead: false,
                ready: false,
                stats: { speed: 3, damageMult: 1, cooldownMult: 1 },
                cooldowns: { q: 0, e: 0, sp: 0 },
                casting: 0,
                dash: { active: false, vx: 0, vy: 0, life: 0 },
                skillStates: {},
                victoryProgress: 0,
                respawnTimer: 0,
                spawnCornerIndex: -1
            };
        }
    }

    tick(playerInputs: Map<NetplayPlayer, DefaultInput>): void {
        this.gameTime++; // Increment game time

        if (this.gamePhase === 'charSelect') {
            this.tickCharSelect(playerInputs);
        } else if (this.gamePhase === 'playing') {
            this.tickPlaying(playerInputs);
        } else if (this.gamePhase === 'gameOver') {
            this.tickGameOver(playerInputs);
        }
    }

    tickGameOver(playerInputs: Map<NetplayPlayer, DefaultInput>) {
        for (const [player, input] of playerInputs.entries()) {
            const p = this.players[player.id];

            // Spectator Controls
            if (p) {
                if (input.keysPressed['ArrowLeft']) CombatManager.cycleSpectator(this, p, -1);
                if (input.keysPressed['ArrowRight']) CombatManager.cycleSpectator(this, p, 1);
            }

            // Restart on Enter
            if (input.keysPressed['Enter']) {
                this.gamePhase = 'charSelect';
                for (let id in this.players) {
                    const p = this.players[id];
                    p.ready = false;
                    p.character = null;
                    p.dead = false;
                    p.hp = 100; // Reset temp
                    p.spectatorTargetId = undefined;
                        p.cooldowns = { q: 0, e: 0, sp: 0 };
                        p.casting = 0;
                        p.dash = { active: false, vx: 0, vy: 0, life: 0 };
                        p.skillStates = {};
                        p.victoryProgress = 0;
                        p.respawnTimer = 0;
                        p.spawnCornerIndex = -1;
                }
                this.kothState = { occupantId: null, occupantTimer: 0, contested: false };
                this.projectiles = [];
                this.particles = [];
                this.floatingTexts = [];
                return;
            }
        }
    }

    tickCharSelect(playerInputs: Map<NetplayPlayer, DefaultInput>) {
        let allReady = true;
        let playerCount = 0;
        const availableChars = CharacterRegistry.getKeys();

        for (const [player, input] of playerInputs.entries()) {
            playerCount++;
            const p = this.players[player.id];

            // Should not happen if sync works, but safety check
            if (!p) continue;

            // Character Selection Inputs
            if (input.keysPressed['1']) p.character = 'naruto';
            if (input.keysPressed['2']) p.character = 'sasuke';

            // Confirm
            if (input.keysPressed[' ']) {
                if (p.character) p.ready = true;
            }

            if (!p.ready) allReady = false;
        }

        if (allReady && playerCount > 0) {
            this.gamePhase = 'playing';
            this.initializeMatch();
        }
    }

    initializeMatch() {
        // Use deterministic RNG for spawn positions
        const rng = new SeededRNG(this.gameTime);
        const pIds = Object.keys(this.players);
        const shuffledIds = rng.shuffle(pIds);

        const center = new Vec2(MAP_SIZE / 2, MAP_SIZE / 2);
        const radius = 600;
        const count = shuffledIds.length;

        shuffledIds.forEach((idStr, index) => {
            const id = parseInt(idStr);
            const p = this.players[id];
            if (!p) return;

            const angle = (2 * Math.PI * index) / count;
            p.pos = new Vec2(
                center.x + radius * Math.cos(angle),
                center.y + radius * Math.sin(angle)
            );

            // Face center
            p.angle = Math.atan2(center.y - p.pos.y, center.x - p.pos.x);
        });

        // Init stats based on character
        for (let id in this.players) {
            const p = this.players[id];
            p.victoryProgress = 0;
            p.respawnTimer = 0;
            p.spawnCornerIndex = -1;

            if (p.character === 'naruto') {
                p.maxHp = 150; p.hp = 150;
                p.stats.speed = 3;
            } else if (p.character === 'sasuke') {
                p.maxHp = 130; p.hp = 130;
                p.stats.speed = 3.25;
            } else if (p.character === 'rocklee') {
                p.maxHp = 160; p.hp = 160;
                p.stats.speed = 3.5; // Faster base speed
            }
        }
    }

    tickPlaying(playerInputs: Map<NetplayPlayer, DefaultInput>) {
        // 1. Process Inputs (Movement & Skills)
        for (const [player, input] of playerInputs.entries()) {
            const p = this.players[player.id];
            CombatManager.processInput(this, p, input);
        }

        // 2. Update Projectiles
        CombatManager.updateProjectiles(this);

        // 3. Update Particles & Text
        this.particles = this.particles.filter(p => {
            p.life--;
            p.pos.x += p.vel.x;
            p.pos.y += p.vel.y;
            return p.life > 0;
        });

        this.floatingTexts = this.floatingTexts.filter(t => {
            t.life--;
            t.pos.y -= t.vy; // Float up
            return t.life > 0;
        });

        // 4. KOTH Logic
        this.tickKothLogic();

        // 5. Respawn Logic
        this.tickRespawnLogic();

        // 6. Check Win Condition
        for (const id in this.players) {
            if (this.players[id].victoryProgress >= 100) {
                this.gamePhase = 'gameOver';
                break;
            }
        }
    }

    tickKothLogic() {
        const center = new Vec2(MAP_SIZE / 2, MAP_SIZE / 2);
        const playersInCircle: number[] = [];

        for (const id in this.players) {
            const p = this.players[id];
            if (!p.dead) {
                const dist = Math.sqrt(Math.pow(p.pos.x - center.x, 2) + Math.pow(p.pos.y - center.y, 2));
                if (dist <= KOTH_SETTINGS.CIRCLE_RADIUS) {
                    playersInCircle.push(p.id);
                }
            }
        }

        // Handle Circle State
        if (playersInCircle.length === 0) {
            this.kothState.contested = false;
            this.kothState.occupantId = null;
            this.kothState.occupantTimer = 0;
        } else if (playersInCircle.length > 1) {
            this.kothState.contested = true;
            // No progress when contested.
            // Explicitly clear occupant so that when one leaves, the remaining player
            // is treated as a new occupant and must wait the delay.
            this.kothState.occupantId = null;
            this.kothState.occupantTimer = 0;
        } else {
            // Exactly one player
            const occupantId = playersInCircle[0];
            this.kothState.contested = false;

            if (this.kothState.occupantId === occupantId) {
                this.kothState.occupantTimer++;
                const delayFrames = KOTH_SETTINGS.CAPTURE_DELAY_SECONDS * 60;
                if (this.kothState.occupantTimer > delayFrames) {
                    // Progress
                    const p = this.players[occupantId];
                    const progressPerFrame = 100 / (KOTH_SETTINGS.WIN_TIME_SECONDS * 60);
                    p.victoryProgress = Math.min(100, p.victoryProgress + progressPerFrame);
                }
            } else {
                // New occupant
                this.kothState.occupantId = occupantId;
                this.kothState.occupantTimer = 0;
            }
        }
    }

    tickRespawnLogic() {
        const corners = [
            new Vec2(100, 100),
            new Vec2(MAP_SIZE - 100, 100),
            new Vec2(100, MAP_SIZE - 100),
            new Vec2(MAP_SIZE - 100, MAP_SIZE - 100)
        ];

        for (const id in this.players) {
            const p = this.players[id];
            if (p.dead && p.respawnTimer > 0) {
                p.respawnTimer--;
                if (p.respawnTimer <= 0) {
                    // Respawn!
                    p.dead = false;
                    p.hp = p.maxHp;
                    // Reset cooldowns
                    p.cooldowns = { q: 0, e: 0, sp: 0 };
                    p.casting = 0;
                    p.dash = { active: false, vx: 0, vy: 0, life: 0 };
                    p.skillStates = {};
                    p.spectatorTargetId = undefined;

                    if (p.spawnCornerIndex >= 0 && p.spawnCornerIndex < corners.length) {
                        p.pos = new Vec2(corners[p.spawnCornerIndex].x, corners[p.spawnCornerIndex].y);
                    } else {
                         // Fallback just in case
                         p.pos = new Vec2(200, 200);
                    }
                    p.spawnCornerIndex = -1; // Free up the corner (logic handled in death, but good to reset)
                }
            }
        }
    }

    draw(canvas: HTMLCanvasElement) {
        // Lazy-init renderer if lost during serialization
        if (!this.renderer) {
            Object.defineProperty(this, 'renderer', {
                value: new Renderer(canvas),
                enumerable: false,
                writable: true,
                configurable: true
            });
        }

        // Draw based on phase
        if (this.gamePhase === 'charSelect') {
            this.renderer!.drawCharSelect(this);
            return;
        }

        // Playing Phase
        let targetId = ShinobiClashGame.localPlayerId ?? 0;
        let target = this.players[targetId] || Object.values(this.players)[0];

        // Spectator Logic
        if (target && target.dead && target.spectatorTargetId !== undefined) {
            const spec = this.players[target.spectatorTargetId];
            if (spec) target = spec;
        }

        if (target) {
            this.renderer!.draw(this, target);
        }

        if (this.gamePhase === 'gameOver') {
            this.renderer!.drawGameOver(this);
        }
    }

    static localPlayerId: number | null = null;
}
