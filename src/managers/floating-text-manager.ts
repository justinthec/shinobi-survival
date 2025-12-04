import { Vec2 } from "netplayjs";
import { FloatingText } from "../types";

export const FLOATING_TEXT_MAX_DISTANCE = 100; // Max distance from target to accumulate

/**
 * Stateless helper class for floating text operations.
 * All methods are static and operate on an array passed in.
 */
export class FloatingTextHelper {
    static spawn(
        texts: FloatingText[],
        nextId: number,
        pos: Vec2,
        text: string,
        color: string,
        targetId?: number,
        targetPos?: Vec2
    ): number {
        // Check for accumulation
        if (targetId !== undefined && targetPos) {
            const existing = texts.find(ft => ft.targetId === targetId);
            if (existing) {
                // Check distance to target
                const dist = Math.sqrt((existing.pos.x - targetPos.x) ** 2 + (existing.pos.y - targetPos.y) ** 2);

                if (dist <= FLOATING_TEXT_MAX_DISTANCE) {
                    // Accumulate
                    const val = parseInt(text);
                    if (!isNaN(val)) {
                        existing.accumulatedValue = (existing.accumulatedValue || parseInt(existing.text)) + val;
                        existing.text = existing.accumulatedValue.toString() + (text.includes("!") ? "!" : "");
                        existing.life = 1.0; // Reset life
                        existing.color = color; // Update color (e.g., for crit)
                        existing.pos.x = targetPos.x;
                        existing.pos.y = targetPos.y - 20; // Reset pos to target
                        existing.vel.y = -20;
                        return nextId; // No new ID used
                    }
                }
            }
        }

        texts.push({
            id: nextId,
            pos: new Vec2(pos.x, pos.y - 20),
            vel: new Vec2(0, -20),
            text: text,
            color: color,
            life: 1.0,
            maxLife: 1.0,
            size: 20,
            targetId: targetId,
            accumulatedValue: parseInt(text) || undefined
        });

        return nextId + 1;
    }

    static update(texts: FloatingText[], dt: number): void {
        for (let i = texts.length - 1; i >= 0; i--) {
            const ft = texts[i];
            ft.life -= dt;
            ft.pos.x += ft.vel.x * dt;
            ft.pos.y += ft.vel.y * dt;

            if (ft.life <= 0) {
                texts.splice(i, 1);
            }
        }
    }

    static draw(ctx: CanvasRenderingContext2D, texts: FloatingText[]): void {
        for (const ft of texts) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, ft.life / 0.5); // Fade out last 0.5s
            ctx.fillStyle = ft.color;
            ctx.font = `bold ${ft.size}px 'Bangers', sans-serif`;
            ctx.textAlign = 'center';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 2;
            ctx.fillText(ft.text, ft.pos.x, ft.pos.y);
            ctx.restore();
        }
    }
}
