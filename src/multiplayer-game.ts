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
                dash: { active: false, vx: 0, vy: 0, life: 0 }
            };
        }
    }

    tick(playerInputs: Map<NetplayPlayer, DefaultInput>): void {
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
        // Reset positions
        const pIds = Object.keys(this.players);
        // Player 1 left, Player 2 right
        if (this.players[0]) this.players[0].pos = new Vec2(200, MAP_SIZE / 2);
        if (this.players[1]) this.players[1].pos = new Vec2(MAP_SIZE - 200, MAP_SIZE / 2);

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
            if (p.dead) continue;

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
