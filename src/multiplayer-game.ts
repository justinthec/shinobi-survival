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
    CharacterType
} from "./types";
import { Renderer } from "./renderer";
import { CombatManager } from "./managers/combat-manager";
import { registerNaruto } from "./characters/naruto";
import { registerSasuke } from "./characters/sasuke";
import { SeededRNG } from "./core/utils";

// Register Characters
registerNaruto();
registerSasuke();

const MAP_SIZE = 1600;

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

    nextEntityId: number = 0;
    gameTime: number = 0;
    gameSpeed: number = 1.0;

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
                skillStates: {}
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

            // Restart on Space or Touch
            if (input.keysPressed[' '] || (input.touches && input.touches.length > 0)) {
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
                }
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
        this.gameSpeed = 1.0 / pIds.length;
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
            if (p.character === 'naruto') {
                p.maxHp = 150; p.hp = 150;
                p.stats.speed = 3;
            } else if (p.character === 'sasuke') {
                p.maxHp = 130; p.hp = 130;
                p.stats.speed = 3.25;
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
            p.life -= this.gameSpeed;
            p.pos.x += p.vel.x * this.gameSpeed;
            p.pos.y += p.vel.y * this.gameSpeed;
            return p.life > 0;
        });

        this.floatingTexts = this.floatingTexts.filter(t => {
            t.life -= this.gameSpeed;
            t.pos.y -= t.vy * this.gameSpeed; // Float up
            return t.life > 0;
        });

        // Check Game Over
        let aliveCount = 0;
        for (let id in this.players) {
            if (!this.players[id].dead) aliveCount++;
        }
        if (aliveCount <= 1) {
            this.gamePhase = 'gameOver';
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
