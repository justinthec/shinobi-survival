import { ShinobiClashGame } from "./multiplayer-game";
import { PlayerState, ProjectileState, PLAYER_RADIUS, KOTH_SETTINGS, MAP_SIZE } from "./types";
import { initSprites, SPRITES } from "./sprites";
import { SkillRegistry } from "./skills/SkillRegistry";
import { CharacterRegistry, ProjectileRegistry } from "./core/registries";
import { CharacterRendererHelper } from "./core/CharacterRendererHelper";
import { getPlayerColor } from "./core/utils";

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

        // --- DRAW KOTH CIRCLE ---
        this.drawKothCircle(game, ctx);

        // Particles
        game.particles.forEach(p => {
             ctx.save();
             ctx.translate(p.pos.x, p.pos.y);
             ctx.scale(1.25, 1.25); // Apply consistent scale
             ctx.globalAlpha = p.life / p.maxLife;

             if (p.type === 'slash') {
                 // Draw Slash Arc (Solid Crescent Swipe)
                 if (p.rotation !== undefined) {
                     ctx.rotate(p.rotation);
                 }

                 // Solid Crescent
                 ctx.fillStyle = '#E6E6FA'; // Lavender/White
                 ctx.shadowBlur = 15;
                 ctx.shadowColor = '#8A2BE2'; // Purple Glow

                 ctx.beginPath();
                 // Outer Arc
                 ctx.arc(0, 0, p.size, -Math.PI / 3, Math.PI / 3);
                 // Inner Curve (to make it crescent)
                 ctx.quadraticCurveTo(0, 0, p.size * Math.cos(-Math.PI/3), p.size * Math.sin(-Math.PI/3));
                 ctx.fill();

                 ctx.shadowBlur = 0; // Reset

                 // 2. Jagged Lightning Lines (Reduced intensity)
                 ctx.strokeStyle = 'white';
                 ctx.lineWidth = 2;
                 ctx.beginPath();
                 ctx.moveTo(0, 0);

                 // Seed random based on particle ID/Life to flicker but be deterministic-ish for a frame
                 // Single jagged bolt for less clutter
                 let angle = -Math.PI / 6 + (Math.random() * Math.PI / 3);
                 let dist = 0;
                 let cx = 0, cy = 0;
                 while (dist < p.size) {
                     dist += 20 + Math.random() * 30;
                     angle += (Math.random() - 0.5) * 0.8;
                     cx += Math.cos(angle) * 25;
                     cy += Math.sin(angle) * 25;
                     ctx.lineTo(cx, cy);
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

    drawKothCircle(game: ShinobiClashGame, ctx: CanvasRenderingContext2D) {
        const center = { x: MAP_SIZE / 2, y: MAP_SIZE / 2 };

        ctx.save();
        ctx.translate(center.x, center.y);

        let fillColor = 'rgba(255, 255, 255, 0.3)'; // Neutral White
        let strokeColor = 'white';

        if (game.kothState.contested) {
            // Flash Grey/Purple if contested
            const flash = Math.floor(game.gameTime / 10) % 2 === 0;
            fillColor = flash ? 'rgba(100, 100, 100, 0.5)' : 'rgba(150, 0, 150, 0.5)';
            strokeColor = '#a0aec0';
        } else if (game.kothState.occupantId !== null) {
            const color = getPlayerColor(game.kothState.occupantId);
            // Check if captured (timer > delay) or just entered
            const delayFrames = KOTH_SETTINGS.CAPTURE_DELAY_SECONDS * 60;
            const isCapturing = game.kothState.occupantTimer > delayFrames;

            if (isCapturing) {
                // Pulse effect: Pulse intensity (alpha) instead of size
                const pulseAlpha = 0.4 + 0.2 * Math.sin(game.gameTime * 0.1);
                ctx.globalAlpha = Math.max(0.2, Math.min(0.8, pulseAlpha));
                fillColor = color;
            } else {
                 // Charging up
                 ctx.globalAlpha = 0.2;
                 fillColor = color;
            }
        }

        ctx.beginPath();
        ctx.arc(0, 0, KOTH_SETTINGS.CIRCLE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();

        ctx.lineWidth = 5;
        ctx.strokeStyle = strokeColor;
        ctx.stroke();

        ctx.restore();
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
        CharacterRendererHelper.drawRoundedRectPath(ctx, x, y, w, h, r);
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

        const charType = p.character || 'naruto';
        const def = CharacterRegistry.get(charType);

        if (def) {
            const isLocal = ShinobiClashGame.localPlayerId === p.id;
            const isOffCooldown = p.cooldowns.e <= 0;
            def.render(this.ctx, p, time, isLocal, isOffCooldown);
        } else {
             // Fallback
             CharacterRendererHelper.drawNinjaBody(this.ctx, p.pos.x, p.pos.y, p.angle, charType, p.hp, p.maxHp, p.name, time, false, 1, null, undefined, getPlayerColor(p.id));
        }
    }

    drawProjectile(p: ProjectileState, time: number) {
        const def = ProjectileRegistry.get(p.type);
        if (def) {
            def.render(this.ctx, p, time);
        }
    }

    drawHUD(game: ShinobiClashGame, p: PlayerState) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // --- VICTORY BARS (Top) ---
        const barWidth = 300;
        const barHeight = 20;
        const startX = (w - barWidth * 2 - 20) / 2; // Center based on 2 players roughly, but handle dynamic
        const topY = 20;

        const playerIds = Object.keys(game.players).map(Number).sort((a,b) => a - b);
        const totalW = playerIds.length * (barWidth / 2 + 10); // Condensed bars

        let cx = w / 2 - (playerIds.length * 160) / 2;

        playerIds.forEach((id) => {
            const pl = game.players[id];
            const color = getPlayerColor(id);

            // Draw Name
            ctx.fillStyle = color;
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(pl.name, cx, topY);

            // Draw Bar BG
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(cx, topY + 5, 150, 15);

            // Draw Progress
            ctx.fillStyle = color;
            const progW = (pl.victoryProgress / 100) * 150;
            ctx.fillRect(cx, topY + 5, progW, 15);

            // Border
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1;
            ctx.strokeRect(cx, topY + 5, 150, 15);

            cx += 160;
        });


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

        // Spectator / Respawn UI
        const localId = ShinobiClashGame.localPlayerId;
        const localPlayer = localId !== null ? game.players[localId] : null;

        if (localPlayer && localPlayer.dead) {
             ctx.save();
             ctx.fillStyle = 'white';
             ctx.strokeStyle = 'black';
             ctx.lineWidth = 4;
             ctx.textAlign = 'center';

             // RESPAWN TIMER
             const timeLeft = Math.ceil(localPlayer.respawnTimer / 60);
             ctx.font = 'bold 40px Arial';
             const respawnText = `RESPAWNING IN ${timeLeft}...`;
             ctx.strokeText(respawnText, w / 2, h / 2 - 50);
             ctx.fillText(respawnText, w / 2, h / 2 - 50);

             // Always show instructions if dead
             const text2 = "Cycle: Left/Right Arrows";
             ctx.font = '20px Arial';
             ctx.strokeText(text2, w / 2, 130);
             ctx.fillText(text2, w / 2, 130);

             if (localPlayer.spectatorTargetId !== undefined) {
                 const spec = game.players[localPlayer.spectatorTargetId];
                 const text1 = `SPECTATING: ${spec ? spec.name : 'Unknown'}`;
                 ctx.strokeText(text1, w / 2, 100);
                 ctx.fillText(text1, w / 2, 100);
             }
             ctx.restore();
        }
    }

    drawCharSelect(game: ShinobiClashGame) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.fillStyle = '#1a202c';
        ctx.fillRect(0, 0, w, h);

        // Title
        ctx.fillStyle = 'white';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("SHINOBI CLASH", w / 2, 60);

        // --- Left Side: Character List ---
        const charListX = 150;
        let charListY = 150;
        const keys = CharacterRegistry.getKeys();

        ctx.textAlign = 'left';
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText("SELECT CHARACTER:", 50, 110);

        keys.forEach((key, index) => {
            const numKey = index + 1;
            const charName = key.toUpperCase();

            // Background box for item
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            this.drawRoundedRectPath(ctx, 50, charListY - 40, 300, 80, 10);
            ctx.fill();

            // Key Hint
            ctx.fillStyle = '#f6e05e';
            ctx.font = 'bold 30px Arial';
            ctx.fillText(`${numKey}`, 70, charListY + 10);

            // Character Name
            ctx.fillStyle = 'white';
            ctx.font = 'bold 20px Arial';
            ctx.fillText(charName, 120, charListY + 5);

            // Character Preview (Miniature)
            // Draw relative to a preview box on the right of the text
            const previewX = 280;
            const previewY = charListY;

            // Draw Character Head/Body
            // We use the helper directly
            CharacterRendererHelper.drawNinjaBody(
                ctx,
                previewX,
                previewY + 10, // Shift down slightly
                Math.PI / 2, // Face right
                key,
                100, 100, // Full HP
                "", // No name tag
                game.gameTime,
                false,
                1, // Opacity
                null,
                undefined,
                undefined
            );

            charListY += 100;
        });


        // --- Right Side: Player Status ---
        const statusX = w - 400;
        let statusY = 150;

        ctx.textAlign = 'left';
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText("LOBBY STATUS:", statusX, 110);

        for (let id in game.players) {
            const p = game.players[id];
            const charName = p.character ? p.character.toUpperCase() : "SELECTING...";
            const isReady = p.ready;

            // Box
            ctx.fillStyle = isReady ? 'rgba(72, 187, 120, 0.2)' : 'rgba(255, 255, 255, 0.05)';
            ctx.strokeStyle = isReady ? '#48bb78' : 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 2;

            this.drawRoundedRectPath(ctx, statusX, statusY, 350, 80, 10);
            ctx.fill();
            ctx.stroke();

            // Player Name & Color
            ctx.fillStyle = getPlayerColor(p.id);
            ctx.beginPath();
            ctx.arc(statusX + 30, statusY + 40, 10, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'white';
            ctx.font = 'bold 20px Arial';
            ctx.fillText(p.name, statusX + 50, statusY + 30);

            // Selection Status
            ctx.fillStyle = '#cbd5e0';
            ctx.font = '16px Arial';
            ctx.fillText(charName, statusX + 50, statusY + 55);

            // Ready Badge
            if (isReady) {
                ctx.fillStyle = '#48bb78';
                ctx.font = 'bold 16px Arial';
                ctx.fillText("READY", statusX + 280, statusY + 45);
            } else {
                ctx.fillStyle = '#e53e3e'; // Red-ish
                ctx.font = 'bold 16px Arial';
                ctx.fillText("WAITING", statusX + 270, statusY + 45);
            }

            statusY += 100;
        }

        // Instructions Footer
        ctx.textAlign = 'center';
        ctx.fillStyle = '#cbd5e0';
        ctx.font = '20px Arial';
        ctx.fillText("Press NUMBER keys to Select Character | Press SPACE to Toggle Ready", w / 2, h - 50);
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

        // Find winner based on victory progress
        let winner = "No One";
        const players = Object.values(game.players);
        // Sort by progress desc
        players.sort((a,b) => b.victoryProgress - a.victoryProgress);

        if (players.length > 0 && players[0].victoryProgress >= 100) {
            winner = players[0].name + " Wins!";
        } else {
            // Fallback
            winner = "Draw!";
        }

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
        ctx.fillText("PRESS ENTER", w / 2, btnY + 40);
    }
}
