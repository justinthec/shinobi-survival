import { CharacterDefinition } from "../../core/interfaces";
import { PlayerState } from "../../types";
import { CharacterRendererHelper } from "../../core/CharacterRendererHelper";
import { getPlayerColor } from "../../core/utils";

export class NarutoCharacter implements CharacterDefinition {
    name = "Naruto";
    description = "A well-rounded ninja with balanced offense and mobility.";

    static drawModel(ctx: CanvasRenderingContext2D, opacity: number = 1, actionState?: string, overrideColor?: string) {
        // Colors
        const c = {
            skin: '#ffcba4',
            hair: '#ffdd00',
            main: overrideColor || '#ff6600', // Orange Jumpsuit or Override
            sub: '#111111',  // Black/Dark Grey undershirt
            acc: '#0055aa',  // Blue Headband/Acc
            metal: '#dcdcdc',
            spiral: '#ff0000'
        };

        if (opacity < 1) ctx.globalAlpha = opacity;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(-2, 2, 16, 16, 0, 0, Math.PI * 2); ctx.fill();

        // --- Body (Shoulders - Top Down) ---
        ctx.fillStyle = c.main; // Orange
        // Oval shoulders
        ctx.beginPath(); ctx.ellipse(-4, 0, 16, 12, 0, 0, Math.PI * 2); ctx.fill();

        // Collar / Undershirt visible around neck
        ctx.fillStyle = c.sub; // Black
        ctx.beginPath(); ctx.arc(2, 0, 6, 0, Math.PI * 2); ctx.fill();

        // Uzumaki Spiral on back (Red)
        ctx.fillStyle = c.spiral;
        ctx.beginPath(); ctx.arc(-10, 0, 3.5, 0, Math.PI * 2); ctx.fill();

        // Punch Arm Action
        if (actionState === 'punch') {
            ctx.fillStyle = c.main;
            CharacterRendererHelper.drawRoundedRectPath(ctx, 10, -3, 15, 6, 3);
            ctx.fill();
        }

        // --- Head (Top Down) ---
        // Skin mostly covered by hair from top down
        ctx.fillStyle = c.skin;
        ctx.beginPath(); ctx.arc(4, 0, 9, 0, Math.PI * 2); ctx.fill();

        // Headband Knot (Back of head)
        ctx.fillStyle = c.acc; // Blue
        // Knot center
        ctx.beginPath(); ctx.arc(-8, 0, 3, 0, Math.PI * 2); ctx.fill();
        // Tails
        ctx.lineWidth = 3;
        ctx.strokeStyle = c.acc;
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.quadraticCurveTo(-12, -4, -14, -6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.quadraticCurveTo(-12, 4, -14, 6); ctx.stroke();


        // --- Hair (Spiky - Top Down) ---
        // Yellow sunburst
        ctx.fillStyle = c.hair;
        ctx.beginPath();
        const spikes = 16;
        for (let i = 0; i < spikes; i++) {
            const a = (i / spikes) * Math.PI * 2;
            const rBase = 6;
            const rTip = 14 + (i % 2 === 0 ? 2 : -1); // Varied length
            const cx = 2; // Offset for head center
            const cy = 0;

            // Draw spike
            const xTip = cx + Math.cos(a) * rTip;
            const yTip = cy + Math.sin(a) * rTip;
            const xBase1 = cx + Math.cos(a - 0.2) * rBase;
            const yBase1 = cy + Math.sin(a - 0.2) * rBase;

            if (i === 0) ctx.moveTo(xBase1, yBase1);
            ctx.lineTo(xTip, yTip);
        }
        ctx.fill();

        // --- Arms (Visible from sides) ---
        ctx.fillStyle = c.main; // Orange sleeves
        CharacterRendererHelper.drawRoundedRectPath(ctx, 0, -17, 12, 6, 3); ctx.fill();
        CharacterRendererHelper.drawRoundedRectPath(ctx, 0, 11, 12, 6, 3); ctx.fill();
        // Hands
        ctx.fillStyle = c.skin;
        ctx.beginPath(); ctx.arc(12, -14, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(12, 14, 3, 0, Math.PI*2); ctx.fill();

        if (opacity < 1) ctx.globalAlpha = 1; // Reset
    }

    render(ctx: CanvasRenderingContext2D, state: PlayerState, time: number, isLocal: boolean, isOffCooldown: boolean, showHealthBar: boolean = true) {
        const { pos, angle, hp, maxHp, name } = state;

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.scale(1.25, 1.25);
        ctx.rotate(angle);

        // Draw the static model
        NarutoCharacter.drawModel(ctx, 1);

        ctx.restore();

        // Health Bar
        if (maxHp > 0 && showHealthBar) {
             ctx.save();
             ctx.translate(pos.x, pos.y - 50);
             ctx.fillStyle = 'rgba(0,0,0,0.8)';
             CharacterRendererHelper.drawRoundedRectPath(ctx, -20, 0, 40, 6, 3); ctx.fill();
             const pct = Math.max(0, hp / maxHp);
             ctx.fillStyle = pct > 0.5 ? '#48bb78' : '#f56565';
             CharacterRendererHelper.drawRoundedRectPath(ctx, -18, 1, 36 * pct, 4, 2); ctx.fill();

             ctx.font = 'bold 12px Arial';
             ctx.textAlign = 'center';

             ctx.strokeStyle = 'black';
             ctx.lineWidth = 3;
             ctx.strokeText(name, 0, -5);

             ctx.fillStyle = getPlayerColor(state.id);
             ctx.fillText(name, 0, -5);

             ctx.restore();
        }
    }
}
