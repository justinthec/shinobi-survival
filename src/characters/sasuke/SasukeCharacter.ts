import { CharacterDefinition, AbilityDefinition } from "../../core/interfaces";
import { PlayerState } from "../../types";
import { CharacterRendererHelper } from "../../core/CharacterRendererHelper";
import { getPlayerColor } from "../../core/utils";
import { ShinobiClashGame } from "../../multiplayer-game";

export class SasukeCharacter implements CharacterDefinition {
    name = "Sasuke";
    description = "A skilled ninja specializing in lightning speed and precision.";
    abilities: AbilityDefinition[] = [
        { key: "Q", name: "Fireball Jutsu", description: "Breather fire in a cone.", type: "active" },
        { key: "E", name: "Chidori / Teleport", description: "Teleport to target location. If enemy hit, damage them.", type: "active" },
        { key: "SPC", name: "Dash", description: "Quickly dash in movement direction.", type: "active" }
    ];

    static drawModel(ctx: CanvasRenderingContext2D, opacity: number = 1, isGhost: boolean = false) {
        // Colors
        const c = {
            skin: '#ffe0bd',
            hair: '#111122', // Dark Blue/Black
            main: '#a0aec0', // Grey Shirt
            rope: '#805ad5', // Purple Rope
            skirt: '#2c5282', // Dark Blue Cloth
            pants: '#1a202c', // Black Pants
            collar: '#e2e8f0', // High Light Grey Collar
            armguards: '#1a202c' // Black Armguards
        };

        if (isGhost) {
            // Purple tint for teleport ghost
             ctx.globalAlpha = 0.5 * opacity;
             c.main = '#8A2BE2';
             c.hair = '#4B0082';
             c.skin = '#D8BFD8';
             c.collar = '#E6E6FA';
             c.rope = '#9370DB';
             c.skirt = '#483D8B';
        } else if (opacity < 1) {
             ctx.globalAlpha = opacity;
        }

        // Shadow
        if (!isGhost) {
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath(); ctx.ellipse(-2, 2, 16, 16, 0, 0, Math.PI * 2); ctx.fill();
        }

        // --- Body Layers (Top Down) ---

        // 1. Skirt/Cloth (Base layer)
        ctx.fillStyle = c.skirt;
        ctx.beginPath();
        ctx.ellipse(-5, 0, 17, 13, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Shirt (Grey)
        ctx.fillStyle = c.main;
        ctx.beginPath();
        ctx.ellipse(-5, 0, 15, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3. Rope Belt (Purple, thick twisted look)
        ctx.strokeStyle = c.rope;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        // Draw a curve wrapping around the back/waist area visible from top
        ctx.beginPath();
        ctx.arc(-5, 0, 16, Math.PI * 0.2, Math.PI * 1.8, true); // Wrap around
        ctx.stroke();

        // Knot/Bow on back? Or front? Usually rope is huge and tied.
        // Let's add a visible knot blob
        ctx.fillStyle = c.rope;
        ctx.beginPath(); ctx.arc(-14, 0, 5, 0, Math.PI * 2); ctx.fill(); // Big knot on back

        // 4. High Collar (Distinctive Sasuke Trait - Back of head)
        ctx.fillStyle = c.collar;
        ctx.beginPath();
        // Behind head - arc
        ctx.arc(-2, 0, 15, -Math.PI/1.3, Math.PI/1.3, true);
        ctx.fill();
        // Inner collar dark part
        ctx.strokeStyle = '#cbd5e0';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 5. Head (Top Down)
        ctx.fillStyle = c.skin;
        ctx.beginPath(); ctx.arc(2, 0, 10, 0, Math.PI * 2); ctx.fill();

        // 6. Hair (Spiky Black - Top Down)
        // Spiky back, covering most of top
        ctx.fillStyle = c.hair;
        ctx.beginPath();
        // Main mass
        ctx.arc(2, 0, 11, 0, Math.PI*2);

        // Spiky tail at back (Duckbutt style)
        ctx.moveTo(-7, -6);
        ctx.lineTo(-18, -8);
        ctx.lineTo(-12, 0);
        ctx.lineTo(-18, 8);
        ctx.lineTo(-7, 6);
        ctx.fill();

        // Bangs (Side spikes)
        ctx.beginPath();
        ctx.moveTo(8, -8); ctx.lineTo(14, -6); ctx.lineTo(10, -3); // Right bang
        ctx.moveTo(8, 8); ctx.lineTo(14, 6); ctx.lineTo(10, 3);   // Left bang
        ctx.fill();

        // NO FACIAL FEATURES

        // 7. Arms (Visible from sides)
        ctx.fillStyle = c.skin;
        // Arm Warmers/Guards (Black)
        ctx.fillStyle = c.armguards;
        CharacterRendererHelper.drawRoundedRectPath(ctx, 0, -17, 12, 5, 2); ctx.fill();
        CharacterRendererHelper.drawRoundedRectPath(ctx, 0, 12, 12, 5, 2); ctx.fill();

        ctx.fillStyle = c.main; // Grey Shirt Sleeve
        CharacterRendererHelper.drawRoundedRectPath(ctx, -2, -14, 8, 6, 2); ctx.fill();
        CharacterRendererHelper.drawRoundedRectPath(ctx, -2, 8, 8, 6, 2); ctx.fill();

        // 8. Sword (Kusanagi) - Straight Sheath on back/hip
        if (!isGhost) {
            ctx.save();
            ctx.translate(-5, 12); // Hip position
            ctx.rotate(-0.2); // Angle

            // Sheath (Black/Dark)
            ctx.fillStyle = '#1a202c';
            ctx.fillRect(-10, -2, 24, 4);

            // Hilt (Black/White detail)
            ctx.fillStyle = '#cbd5e0';
            ctx.fillRect(14, -2, 2, 4); // Guard
            ctx.fillStyle = '#1a202c';
            ctx.fillRect(16, -2, 6, 4); // Handle

            ctx.restore();
        }

        if (isGhost) ctx.globalAlpha = 1;
    }

    render(ctx: CanvasRenderingContext2D, state: PlayerState, time: number, isLocal: boolean, isOffCooldown: boolean, showHealthBar: boolean = true) {
        const { pos, angle, hp, maxHp, name } = state;

        // Draw Charging Indicator for Sasuke's Teleport
        if (isLocal && isOffCooldown && state.skillStates && state.skillStates['e'] && state.skillStates['e'].charging && state.skillStates['e'].target) {
            const target = state.skillStates['e'].target;
            ctx.save();
            ctx.translate(target.x, target.y);
            ctx.scale(1.25, 1.25);
            ctx.rotate(angle);

            SasukeCharacter.drawModel(ctx, 1, true);

            ctx.restore();
        }

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.scale(1.25, 1.25);
        ctx.rotate(angle);

        SasukeCharacter.drawModel(ctx, 1, false);

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
