import { ShinobiClashGame } from "./multiplayer-game";
import { PlayerState, ProjectileState } from "./types";

export class Renderer {
    ctx: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
    }

    draw(game: ShinobiClashGame, focusPlayer: PlayerState) {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear
        ctx.fillStyle = '#1a202c';
        ctx.fillRect(0, 0, width, height);

        // Camera Transform
        ctx.save();
        // Translate so focusPlayer is in center
        const camX = focusPlayer.pos.x - width / 2;
        const camY = focusPlayer.pos.y - height / 2;
        ctx.translate(-camX, -camY);

        // Grid
        this.drawGrid(camX, camY, width, height);

        // Map Border
        ctx.strokeStyle = '#e53e3e';
        ctx.lineWidth = 10;
        ctx.strokeRect(0, 0, 1600, 1600);

        // Projectiles
        game.projectiles.forEach(p => this.drawProjectile(p));

        // Players(z-index sort by Y)
        const sortedPlayers = Object.values(game.players).sort((a, b) => a.pos.y - b.pos.y);
        sortedPlayers.forEach(p => this.drawPlayer(p));

        // Particles
        // TODO: Port particle drawing

        // Floating Text
        game.floatingTexts.forEach(t => {
            ctx.fillStyle = t.color;
            ctx.font = "bold 24px Arial";
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3;
            ctx.strokeText(t.val, t.pos.x, t.pos.y);
            ctx.fillText(t.val, t.pos.x, t.pos.y);
        });

        ctx.restore();

        // HUD (UI Layer)
        this.drawHUD(focusPlayer);

        if (focusPlayer.debugMode) {
            this.drawDebug(game, focusPlayer);
        }
    }

    drawDebug(game: ShinobiClashGame, focusPlayer: PlayerState) {
        const ctx = this.ctx;
        ctx.save();

        // Re-apply camera transform
        const width = this.canvas.width;
        const height = this.canvas.height;
        const camX = focusPlayer.pos.x - width / 2;
        const camY = focusPlayer.pos.y - height / 2;

        ctx.translate(-camX, -camY);

        ctx.lineWidth = 1;

        // Draw Player Hitboxes
        for (const id in game.players) {
            const p = game.players[id];
            if (p.dead) continue;

            ctx.strokeStyle = '#00FF00'; // Green
            ctx.beginPath();
            ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Draw center point
            ctx.fillStyle = '#00FF00';
            ctx.fillRect(p.pos.x - 2, p.pos.y - 2, 4, 4);
        }

        // Draw Projectile Hitboxes
        for (const proj of game.projectiles) {
            ctx.strokeStyle = '#FF0000'; // Red
            ctx.beginPath();
            ctx.arc(proj.pos.x, proj.pos.y, proj.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Draw velocity vector
            ctx.beginPath();
            ctx.moveTo(proj.pos.x, proj.pos.y);
            ctx.lineTo(proj.pos.x + proj.vel.x * 5, proj.pos.y + proj.vel.y * 5);
            ctx.stroke();
        }

        ctx.restore();

        // Screen space debug info
        ctx.fillStyle = 'white';
        ctx.font = '12px monospace';
        ctx.fillText(`Debug Mode On`, 10, 20);
        ctx.fillText(`Projectiles: ${game.projectiles.length}`, 10, 35);
        ctx.fillText(`Particles: ${game.particles.length}`, 10, 50);
    }

    drawGrid(camX: number, camY: number, width: number, height: number) {
        const ctx = this.ctx;
        ctx.strokeStyle = '#2d3748';
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

    drawPlayer(p: PlayerState) {
        if (p.dead) {
            // Draw Grave?
            return;
        }

        const ctx = this.ctx;
        ctx.save();
        ctx.translate(p.pos.x, p.pos.y);
        ctx.rotate(p.angle);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(-2, 2, 16, 16, 0, 0, Math.PI * 2); ctx.fill();

        // Colors
        const isNaruto = p.character === 'naruto';

        const c = isNaruto ? {
            skin: '#ffcba4', hair: '#ffdd00', main: '#ff6600', sub: '#1a1a1a', acc: '#0055aa'
        } : {
            skin: '#ffe0bd', hair: '#111122', main: '#9ca3af', sub: '#4b5563', acc: '#8b5cf6'
        };

        // Simplified Body Draw (Porting the logic from index.html is good, but let's simplify for brevity if needed)
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
            // Spikes
            for (let i = 0; i < 14; i++) {
                const angle = (i / 14) * Math.PI * 2;
                const len = 14;
                const cx = 2 + Math.cos(angle) * len;
                const cy = Math.sin(angle) * len;
                if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
            }
        } else {
            // Duck butt
            ctx.moveTo(-5, 0); ctx.lineTo(-18, -10); ctx.lineTo(-12, 0); ctx.lineTo(-18, 10);
        }
        ctx.fill();

        // Arms (if not dead)
        ctx.fillStyle = c.main;
        ctx.beginPath(); ctx.roundRect(0, -16, 12, 6, 3); ctx.fill();
        ctx.beginPath(); ctx.roundRect(0, 10, 12, 6, 3); ctx.fill();

        ctx.restore();

        // Health bar
        this.drawHealthBar(p);
    }

    drawHealthBar(p: PlayerState) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(p.pos.x, p.pos.y - 50);
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.beginPath(); ctx.roundRect(-30, 0, 60, 8, 4); ctx.fill();
        const pct = Math.max(0, p.hp / p.maxHp);
        ctx.fillStyle = pct > 0.5 ? '#48bb78' : '#f56565';
        ctx.beginPath(); ctx.roundRect(-28, 2, 56 * pct, 4, 2); ctx.fill();

        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(p.name, 0, -5);
        ctx.restore();
    }

    drawProjectile(p: ProjectileState) {
        const ctx = this.ctx;
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
        }

        ctx.restore();
    }

    drawHUD(p: PlayerState) {
        // We can draw simple HUD here or rely on DOM elements + updates.
        // The index.html used DOM elements for HUD (Cooldowns).
        // Since we are Netplay, we might want to sync the DOM HUD.
        // Or just draw it on canvas.
        // Let's draw on canvas for simplicity in this port first.

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
                const pct = cd / max;
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(x, h - 80 + (60 * (1 - pct)), 60, 60 * pct);
            }
        };

        drawCD('Q', w / 2 - 100, p.cooldowns.q, 120);
        drawCD('E', w / 2, p.cooldowns.e, 360);
        drawCD('SPC', w / 2 + 100, p.cooldowns.sp, 180);
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
}
