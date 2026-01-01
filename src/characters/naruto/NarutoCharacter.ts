import { CharacterDefinition, AbilityDefinition } from "../../core/interfaces";
import { PlayerState } from "../../types";
import { CharacterRendererHelper } from "../../core/CharacterRendererHelper";
import { getPlayerColor } from "../../core/utils";

export class NarutoCharacter implements CharacterDefinition {
    name = "Naruto";
    description = "A well-rounded ninja with balanced offense and mobility.";
    abilities: AbilityDefinition[] = [
        { key: "Q", name: "Rasenshuriken", description: "Throw a wind-enhanced shuriken that expands on impact.", type: "active" },
        { key: "E", name: "Clone Strike", description: "Dash forward. If you hit an enemy, spawn clones to strike them.", type: "active" },
        { key: "SPC", name: "Dash", description: "Quickly dash in movement direction.", type: "active" }
    ];

    static drawModel(ctx: CanvasRenderingContext2D, opacity: number = 1, actionState?: string) {
        // Colors
        const c = {
            skin: '#ffcba4',
            hair: '#ffdd00',
            main: '#ff6600', // Orange Jumpsuit
            sub: '#111111',  // Black/Dark Grey undershirt
            acc: '#0055aa',  // Blue Headband/Acc
            metal: '#dcdcdc',
            spiral: '#ff0000'
        };

        if (opacity < 1) ctx.globalAlpha = opacity;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(-2, 2, 16, 16, 0, 0, Math.PI * 2); ctx.fill();

        // --- Body ---
        ctx.fillStyle = c.main; // Orange
        ctx.beginPath(); ctx.ellipse(-5, 0, 15, 12, 0, 0, Math.PI * 2); ctx.fill();

        // Collar / Undershirt
        ctx.fillStyle = c.sub; // Black
        ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();

        // Uzumaki Spiral on back (Red) - Visible from top down? Maybe simplified.
        ctx.fillStyle = c.spiral;
        ctx.beginPath(); ctx.arc(-8, 0, 3, 0, Math.PI * 2); ctx.fill();

        // Punch Arm Action
        if (actionState === 'punch') {
            ctx.fillStyle = c.main;
            CharacterRendererHelper.drawRoundedRectPath(ctx, 10, -3, 15, 6, 3);
            ctx.fill();
        }

        // --- Head ---
        ctx.fillStyle = c.skin;
        ctx.beginPath(); ctx.arc(2, 0, 11, 0, Math.PI * 2); ctx.fill();

        // Whiskers (3 lines each side)
        ctx.strokeStyle = '#b08060';
        ctx.lineWidth = 1;
        // Left
        ctx.beginPath(); ctx.moveTo(6, -6); ctx.lineTo(10, -5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(6, -4); ctx.lineTo(10, -3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(6, -2); ctx.lineTo(10, -1); ctx.stroke();
        // Right
        ctx.beginPath(); ctx.moveTo(6, 6); ctx.lineTo(10, 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(6, 4); ctx.lineTo(10, 3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(6, 2); ctx.lineTo(10, 1); ctx.stroke();


        // Headband (Blue cloth, Metal plate)
        ctx.fillStyle = c.acc; // Blue
        // Cloth band
        ctx.beginPath();
        ctx.arc(2, 0, 11.5, -Math.PI/2, Math.PI/2, true); // Front half of head roughly
        ctx.fill();
        // Metal Plate
        ctx.fillStyle = c.metal;
        ctx.save();
        ctx.rotate(Math.PI / 2); // Rotate to draw rect easily on forehead
        // Forehead position relative to rotated context
        CharacterRendererHelper.drawRoundedRectPath(ctx, -5, 6, 10, 4, 1);
        ctx.fill();
        // Leaf Symbol (Simple scribble)
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-2, 8); ctx.quadraticCurveTo(0, 6, 2, 8); ctx.stroke();
        ctx.restore();


        // --- Hair (Spiky) ---
        ctx.fillStyle = c.hair;
        ctx.beginPath();
        for (let i = 0; i < 16; i++) {
            // Spikes all around but biased towards back/sides
            const a = (i / 16) * Math.PI * 2;
            const len = 13 + (Math.random() * 2);
            const cx = 1 + Math.cos(a) * len;
            const cy = Math.sin(a) * len;
            if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
        }
        ctx.fill();

        // --- Arms ---
        ctx.fillStyle = c.main; // Orange sleeves
        CharacterRendererHelper.drawRoundedRectPath(ctx, 0, -16, 12, 6, 3); ctx.fill();
        CharacterRendererHelper.drawRoundedRectPath(ctx, 0, 10, 12, 6, 3); ctx.fill();
        // Hands
        ctx.fillStyle = c.skin;
        ctx.beginPath(); ctx.arc(12, -13, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(12, 13, 3, 0, Math.PI*2); ctx.fill();

        if (opacity < 1) ctx.globalAlpha = 1; // Reset
    }

    render(ctx: CanvasRenderingContext2D, state: PlayerState, time: number, isLocal: boolean, isOffCooldown: boolean) {
        const { pos, angle, hp, maxHp, name } = state;

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.scale(1.25, 1.25);
        ctx.rotate(angle);

        // Draw the static model
        NarutoCharacter.drawModel(ctx, 1);

        ctx.restore();

        // Health Bar
        if (maxHp > 0) {
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
