import { PlayerState } from "../types";

export class CharacterRendererHelper {

    static drawRoundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, w, h, r);
        } else {
            ctx.rect(x, y, w, h);
        }
    }

    static drawNinjaBody(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        angle: number,
        type: string,
        hp: number,
        maxHp: number,
        name: string,
        time: number,
        isClone: boolean,
        opacity: number = 1,
        colorOverride: string | null = null,
        actionState?: string,
        nameColor: string = 'white'
    ) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1.25, 1.25);
        ctx.rotate(angle);

        if (opacity < 1) ctx.globalAlpha = opacity;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(-2, 2, 16, 16, 0, 0, Math.PI * 2); ctx.fill();

        // Visual Colors
        let c = {
            skin: '#ffe0bd', hair: '#111122', main: '#9ca3af', sub: '#4b5563', acc: '#8b5cf6'
        };

        if (type === 'naruto') {
            c = { skin: '#ffcba4', hair: '#ffdd00', main: '#ff6600', sub: '#1a1a1a', acc: '#0055aa' };
        } else if (type === 'rocklee') {
            c = { skin: '#ffe0bd', hair: '#000000', main: '#00aa00', sub: '#ff6600', acc: '#eeeeee' }; // Green suit, orange leg warmers
        }

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

        // Punch Arm
        if (actionState === 'punch') {
            ctx.fillStyle = c.main;
            this.drawRoundedRectPath(ctx, 10, -3, 15, 6, 3);
            ctx.fill();
        }

        // Kick Leg (Right)
        if (actionState === 'kick') {
            ctx.save();
            ctx.fillStyle = c.main;
            ctx.translate(5, 5);
            ctx.rotate(-Math.PI / 4);
            this.drawRoundedRectPath(ctx, 0, 0, 20, 6, 3);
            ctx.fill();
            // Leg warmer / foot
            ctx.fillStyle = c.sub; // Orange
            this.drawRoundedRectPath(ctx, 14, -1, 8, 8, 2);
            ctx.fill();
            ctx.restore();
        }

        // Head
        ctx.fillStyle = c.skin;
        ctx.beginPath(); ctx.arc(2, 0, 11, 0, Math.PI * 2); ctx.fill();

        // Hair
        ctx.fillStyle = c.hair;
        ctx.beginPath();
        if (type === 'naruto') {
            for (let i = 0; i < 14; i++) {
                const a = (i / 14) * Math.PI * 2;
                const len = 14;
                const cx = 2 + Math.cos(a) * len;
                const cy = Math.sin(a) * len;
                if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
            }
        } else if (type === 'rocklee') {
            // Bowl Cut (Shiny)
            ctx.arc(2, 0, 12, 0, Math.PI * 2);
            // Highlight
        } else {
            ctx.moveTo(-5, 0); ctx.lineTo(-18, -10); ctx.lineTo(-12, 0); ctx.lineTo(-18, 10);
        }
        ctx.fill();

        if (type === 'rocklee') {
            // Shine on bowl cut
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.ellipse(0, -5, 6, 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }

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
                 ctx.font = 'bold 12px Arial';
                 ctx.textAlign = 'center';

                 ctx.strokeStyle = 'black';
                 ctx.lineWidth = 3;
                 ctx.strokeText(name, 0, -5);

                 ctx.fillStyle = nameColor;
                 ctx.fillText(name, 0, -5);
             }
             ctx.restore();
        }
    }
}
