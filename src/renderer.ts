import { ShinobiClashGame } from "./multiplayer-game";
import { PlayerState, ProjectileState, PLAYER_RADIUS } from "./types";
import { initSprites, SPRITES } from "./sprites";
import { SkillRegistry } from "./skills/SkillRegistry";

export class Renderer {
    ctx: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
    bgPattern: CanvasPattern | null = null;

    static debugMode = false;
    static listenerAttached = false;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        initSprites();

        if (typeof window !== 'undefined' && !Renderer.listenerAttached) {
            window.addEventListener('keydown', (e) => {
                if (e.key === '`') {
                    Renderer.debugMode = !Renderer.debugMode;
                }
            });
            Renderer.listenerAttached = true;
        }
    }

    draw(game: ShinobiClashGame, focusPlayer: PlayerState) {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Background Logic
        if (!this.bgPattern && SPRITES.tile_grass) {
            this.bgPattern = ctx.createPattern(SPRITES.tile_grass, 'repeat');
        }

        // Camera Transform Logic
        const camX = focusPlayer.pos.x - width / 2;
        const camY = focusPlayer.pos.y - height / 2;

        ctx.save();
        ctx.resetTransform();

        ctx.fillStyle = '#1a202c'; // Void color
        ctx.fillRect(0, 0, width, height);

        if (this.bgPattern) {
            ctx.translate(-camX, -camY);
            ctx.fillStyle = this.bgPattern;
            ctx.fillRect(0, 0, 1600, 1600);
        } else {
             ctx.translate(-camX, -camY);
             ctx.fillStyle = '#2d5a27';
             ctx.fillRect(0, 0, 1600, 1600);
        }
        ctx.restore();

        // Main Drawing Layer
        ctx.save();
        ctx.translate(-camX, -camY);

        // Map Border
        ctx.strokeStyle = '#e53e3e';
        ctx.lineWidth = 10;
        ctx.strokeRect(0, 0, 1600, 1600);

        // Particles
        game.particles.forEach(p => {
             ctx.save();
             ctx.translate(p.pos.x, p.pos.y);
             ctx.globalAlpha = p.life / p.maxLife;

             if (p.type === 'slash') {
                 // Draw Slash Arc (Lightning Style)
                 if (p.rotation !== undefined) {
                     ctx.rotate(p.rotation);
                 }

                 // 1. Gradient Arc Background
                 const grad = ctx.createRadialGradient(0, 0, p.size * 0.2, 0, 0, p.size);
                 grad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
                 grad.addColorStop(0.5, 'rgba(138, 43, 226, 0.4)'); // Purple/Blue
                 grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

                 ctx.fillStyle = grad;
                 ctx.beginPath();
                 ctx.moveTo(0, 0);
                 ctx.arc(0, 0, p.size, -Math.PI / 3, Math.PI / 3);
                 ctx.lineTo(0, 0);
                 ctx.fill();

                 // 2. Jagged Lightning Lines
                 ctx.strokeStyle = 'white';
                 ctx.lineWidth = 3;
                 ctx.beginPath();
                 ctx.moveTo(0, 0);

                 // Seed random based on particle ID/Life to flicker but be deterministic-ish for a frame
                 // NetplayJS particles usually update logic but drawing can use random for visual noise if it doesn't affect state.
                 // We'll draw 3 jagged bolts
                 for (let bolt = 0; bolt < 3; bolt++) {
                     let angle = -Math.PI / 3 + (Math.PI * 2 / 3) * (bolt + 0.5) / 3;
                     let dist = 0;
                     ctx.moveTo(0, 0);
                     let cx = 0, cy = 0;
                     while (dist < p.size) {
                         dist += 15 + Math.random() * 20;
                         angle += (Math.random() - 0.5) * 1;
                         cx += Math.cos(angle) * 20;
                         cy += Math.sin(angle) * 20;
                         ctx.lineTo(cx, cy);
                     }
                 }
                 ctx.stroke();

             } else {
                 ctx.fillStyle = p.color;
                 ctx.beginPath();
                 ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                 ctx.fill();
             }
             ctx.restore();
        });

        // Projectiles
        game.projectiles.forEach(p => this.drawProjectile(p, game.gameTime));

        // Players(z-index sort by Y)
        const sortedPlayers = Object.values(game.players).sort((a, b) => a.pos.y - b.pos.y);
        sortedPlayers.forEach(p => this.drawPlayer(p, game.gameTime));

        // Floating Text
        game.floatingTexts.forEach(t => {
            ctx.fillStyle = t.color;
            ctx.font = "bold 24px Arial";
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3;
            ctx.strokeText(t.val, t.pos.x, t.pos.y);
            ctx.fillText(t.val, t.pos.x, t.pos.y);
        });

        // Debug Hitboxes
        if (Renderer.debugMode) {
            this.drawHitboxes(game);
        }

        ctx.restore();

        // HUD (UI Layer)
        this.drawHUD(game, focusPlayer);
    }

    drawHitboxes(game: ShinobiClashGame) {
        const ctx = this.ctx;
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';

        // Players
        for (let id in game.players) {
            const p = game.players[id];
            if (p.dead) continue;
            ctx.beginPath();
            ctx.arc(p.pos.x, p.pos.y, PLAYER_RADIUS, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Projectiles
        for (const proj of game.projectiles) {
            ctx.beginPath();
            if (proj.type === 'lightning_slash') {
                // Draw Sector
                ctx.moveTo(proj.pos.x, proj.pos.y);
                ctx.arc(proj.pos.x, proj.pos.y, proj.radius, proj.angle - Math.PI / 3, proj.angle + Math.PI / 3);
                ctx.lineTo(proj.pos.x, proj.pos.y);
            } else {
                ctx.arc(proj.pos.x, proj.pos.y, proj.radius, 0, Math.PI * 2);
            }
            ctx.stroke();
        }
    }

    // Helper for safe roundRect
    drawRoundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, w, h, r);
        } else {
            ctx.rect(x, y, w, h);
        }
    }

    drawGrid(camX: number, camY: number, width: number, height: number) {
        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 2;
        const grid = 100;

        const startX = Math.floor(camX / grid) * grid;
        const startY = Math.floor(camY / grid) * grid;

        for (let x = startX; x < camX + width; x += grid) {
            ctx.beginPath(); ctx.moveTo(x, camY); ctx.lineTo(x, camY + height); ctx.stroke();
        }
        for (let y = startY; y < camY + height; y += grid) {
            ctx.beginPath(); ctx.moveTo(camX, y); ctx.lineTo(camX + width, y); ctx.stroke();
        }
    }

    drawPlayer(p: PlayerState, time: number) {
        if (p.dead) return;

        // Draw Charging Indicator for Sasuke's Teleport
        // Only if local player is holding it (or spectator logic matches? User said "Only the local player that is holding the E button down")
        // And cooldown is 0.
        const isLocal = ShinobiClashGame.localPlayerId === p.id;
        const isOffCooldown = p.cooldowns.e <= 0;

        if (isLocal && isOffCooldown && p.character === 'sasuke' && p.skillStates && p.skillStates['e'] && p.skillStates['e'].charging && p.skillStates['e'].target) {
            const target = p.skillStates['e'].target;
            this.drawNinjaBody(target.x, target.y, p.angle, 'sasuke', 0, 0, "", time, false, 0.5, '#8A2BE2');
        }

        this.drawNinjaBody(p.pos.x, p.pos.y, p.angle, p.character || 'naruto', p.hp, p.maxHp, p.name, time, false);
    }

    drawNinjaBody(x: number, y: number, angle: number, type: string, hp: number, maxHp: number, name: string, time: number, isClone: boolean, opacity: number = 1, colorOverride: string | null = null) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1.25, 1.25);
        ctx.rotate(angle);

        if (opacity < 1) ctx.globalAlpha = opacity;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(-2, 2, 16, 16, 0, 0, Math.PI * 2); ctx.fill();

        // Visual Colors
        const isNaruto = type === 'naruto';
        const c = isNaruto ? {
            skin: '#ffcba4', hair: '#ffdd00', main: '#ff6600', sub: '#1a1a1a', acc: '#0055aa'
        } : {
            skin: '#ffe0bd', hair: '#111122', main: '#9ca3af', sub: '#4b5563', acc: '#8b5cf6'
        };

        // Override if needed (e.g. purple ghost)
        if (colorOverride) {
            // Simplified tinted version
            c.skin = colorOverride;
            c.hair = colorOverride;
            c.main = colorOverride;
            c.sub = colorOverride;
            c.acc = colorOverride;
        }

        if (isClone) ctx.globalAlpha = 0.8 * opacity;
        else if (opacity < 1) ctx.globalAlpha = opacity;

        // Body
        ctx.fillStyle = c.main;
        ctx.beginPath(); ctx.ellipse(-5, 0, 16, 12, 0, 0, Math.PI * 2); ctx.fill();

        // Head
        ctx.fillStyle = c.skin;
        ctx.beginPath(); ctx.arc(2, 0, 11, 0, Math.PI * 2); ctx.fill();

        // Hair
        ctx.fillStyle = c.hair;
        ctx.beginPath();
        if (isNaruto) {
            for (let i = 0; i < 14; i++) {
                const a = (i / 14) * Math.PI * 2;
                const len = 14;
                const cx = 2 + Math.cos(a) * len;
                const cy = Math.sin(a) * len;
                if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
            }
        } else {
            ctx.moveTo(-5, 0); ctx.lineTo(-18, -10); ctx.lineTo(-12, 0); ctx.lineTo(-18, 10);
        }
        ctx.fill();

        // Arms
        ctx.fillStyle = c.main;
        this.drawRoundedRectPath(ctx, 0, -16, 12, 6, 3); ctx.fill();
        this.drawRoundedRectPath(ctx, 0, 10, 12, 6, 3); ctx.fill();

        ctx.restore();

        // Health Bar
        if (maxHp > 0) {
             ctx.save();
             ctx.translate(x, y - 50);
             ctx.fillStyle = 'rgba(0,0,0,0.8)';
             this.drawRoundedRectPath(ctx, -20, 0, 40, 6, 3); ctx.fill();
             const pct = Math.max(0, hp / maxHp);
             ctx.fillStyle = pct > 0.5 ? '#48bb78' : '#f56565';
             this.drawRoundedRectPath(ctx, -18, 1, 36 * pct, 4, 2); ctx.fill();

             if (!isClone) {
                 ctx.fillStyle = 'white';
                 ctx.font = '10px Arial';
                 ctx.textAlign = 'center';
                 ctx.fillText(name, 0, -5);
             }
             ctx.restore();
        }
    }

    drawProjectile(p: ProjectileState, time: number) {
        const ctx = this.ctx;

        if (p.type === 'clone_strike') {
            // Draw as a Ninja
            this.drawNinjaBody(p.pos.x, p.pos.y, p.angle, 'naruto', p.hp || 0, p.maxHp || 1, "Clone", time, true);
            return;
        }

        ctx.save();
        ctx.translate(p.pos.x, p.pos.y);

        if (p.type === 'fireball') {
            ctx.fillStyle = '#ed8936';
            ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.fill();
        } else if (p.type === 'rasenshuriken') {
            ctx.rotate(p.rotation || 0);
            ctx.fillStyle = '#4fd1c5';
            ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
            // Blades
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            for (let i = 0; i < 4; i++) {
                ctx.rotate(Math.PI / 2);
                ctx.beginPath(); ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(20, -10, 40, 0);
                ctx.quadraticCurveTo(20, 10, 0, 0);
                ctx.fill();
            }
        } else if (p.type === 'amaterasu_buildup') {
            ctx.strokeStyle = 'black';
            ctx.setLineDash([5, 5]);
            ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.stroke();
        } else if (p.type === 'amaterasu_burn') {
            ctx.fillStyle = 'black';
            ctx.shadowColor = 'purple'; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        } else if (p.type === 'lightning_slash') {
            // Visuals handled by Particle 'slash'
        }

        ctx.restore();
    }

    drawHUD(game: ShinobiClashGame, p: PlayerState) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Cooldowns
        const drawCD = (key: string, x: number, cd: number, max: number) => {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(x, h - 80, 60, 60);
            ctx.strokeStyle = 'white';
            ctx.strokeRect(x, h - 80, 60, 60);

            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(key, x + 30, h - 45);

            // Overlay
            if (cd > 0) {
                const safeCD = Math.min(cd, max);
                const pct = safeCD / max;
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(x, h - 80 + (60 * (1 - pct)), 60, 60 * pct);
            }
        };

        const getMaxCD = (key: string) => {
            const skill = SkillRegistry.getSkill(p.character, key);
            return skill ? skill.cooldown : 100;
        };

        drawCD('Q', w / 2 - 100, p.cooldowns.q, getMaxCD('q'));
        drawCD('E', w / 2, p.cooldowns.e, getMaxCD('e'));
        drawCD('SPC', w / 2 + 100, p.cooldowns.sp, getMaxCD(' '));

        // Spectator UI
        const localId = ShinobiClashGame.localPlayerId;
        const localPlayer = localId !== null ? game.players[localId] : null;

        if (localPlayer && localPlayer.dead) {
             ctx.fillStyle = 'white';
             ctx.strokeStyle = 'black';
             ctx.lineWidth = 4;

             ctx.font = 'bold 30px Arial';
             ctx.textAlign = 'center';
             const text1 = `SPECTATING: ${p.name}`;
             ctx.strokeText(text1, w / 2, 100);
             ctx.fillText(text1, w / 2, 100);

             ctx.font = '20px Arial';
             const text2 = "Press Left/Right to Switch";
             ctx.strokeText(text2, w / 2, 130);
             ctx.fillText(text2, w / 2, 130);
        }
    }

    drawCharSelect(game: ShinobiClashGame) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.fillStyle = '#1a202c';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("SHINOBI CLASH", w / 2, 100);

        ctx.font = '20px Arial';
        ctx.fillStyle = '#cbd5e0';
        ctx.fillText("Press 1 for NARUTO | Press 2 for SASUKE", w / 2, 160);
        ctx.fillText("Press SPACE to READY", w / 2, 190);

        // List players
        let y = 300;
        for (let id in game.players) {
            const p = game.players[id];
            const charName = p.character ? p.character.toUpperCase() : "SELECTING...";
            const status = p.ready ? "READY" : "WAITING";

            ctx.fillStyle = p.ready ? '#48bb78' : '#cbd5e0';
            ctx.font = '24px Arial';
            ctx.fillText(`${p.name}: ${charName}`, w / 2, y);

            ctx.font = '18px Arial';
            ctx.fillText(status, w / 2, y + 25);

            y += 80;
        }
    }

    drawGameOver(game: ShinobiClashGame) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("GAME OVER", w / 2, h / 2 - 50);

        // Find winner
        let winner = "No One";
        const alive = Object.values(game.players).filter(p => !p.dead);
        if (alive.length > 0) winner = alive[0].name + " Wins!";
        else winner = "Draw!";

        ctx.font = '40px Arial';
        ctx.fillStyle = '#f1c40f';
        ctx.fillText(winner, w / 2, h / 2 + 20);

        // New Game Button
        const btnX = w / 2 - 100;
        const btnY = h / 2 + 50;
        const btnW = 200;
        const btnH = 60;

        ctx.fillStyle = '#2ecc71';
        this.drawRoundedRectPath(ctx, btnX, btnY, btnW, btnH, 10);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 30px Arial';
        ctx.fillText("PRESS SPACE", w / 2, btnY + 40);
    }
}
