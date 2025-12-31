import { CharacterDefinition, AbilityDefinition } from "../../core/interfaces";
import { PlayerState } from "../../types";
import { CharacterRendererHelper } from "../../core/CharacterRendererHelper";
import { getPlayerColor } from "../../core/utils";

export class SasukeCharacter implements CharacterDefinition {
    name = "Sasuke";
    description = "A skilled ninja specializing in lightning speed and precision.";
    abilities: AbilityDefinition[] = [
        { key: "Q", name: "Fireball Jutsu", description: "Breather fire in a cone.", type: "active" },
        { key: "E", name: "Chidori / Teleport", description: "Teleport to target location. If enemy hit, damage them.", type: "active" },
        { key: "SPC", name: "Dash", description: "Quickly dash in movement direction.", type: "active" }
    ];

    render(ctx: CanvasRenderingContext2D, state: PlayerState, time: number, isLocal: boolean, isOffCooldown: boolean) {
        const { pos, angle, hp, maxHp, name } = state;

        // Draw Charging Indicator for Sasuke's Teleport
        if (isLocal && isOffCooldown && state.skillStates && state.skillStates['e'] && state.skillStates['e'].charging && state.skillStates['e'].target) {
            const target = state.skillStates['e'].target;
            // Draw a ghost at target
            ctx.save();
            ctx.translate(target.x, target.y);
            ctx.scale(1.25, 1.25);
            ctx.rotate(angle);
            ctx.globalAlpha = 0.5;

            // Re-implement simplified sasuke draw for ghost
            const c = { skin: '#ffe0bd', hair: '#111122', main: '#8A2BE2', sub: '#4b5563', acc: '#8b5cf6' }; // Purple tint

             // Body
            ctx.fillStyle = c.main;
            ctx.beginPath(); ctx.ellipse(-5, 0, 16, 12, 0, 0, Math.PI * 2); ctx.fill();
            // Head
            ctx.fillStyle = c.skin;
            ctx.beginPath(); ctx.arc(2, 0, 11, 0, Math.PI * 2); ctx.fill();
            // Hair
            ctx.fillStyle = c.hair;
            ctx.beginPath();
            ctx.moveTo(-5, 0); ctx.lineTo(-18, -10); ctx.lineTo(-12, 0); ctx.lineTo(-18, 10);
            ctx.fill();

            ctx.restore();
        }

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.scale(1.25, 1.25);
        ctx.rotate(angle);

        const c = { skin: '#ffe0bd', hair: '#111122', main: '#9ca3af', sub: '#4b5563', acc: '#8b5cf6' };

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(-2, 2, 16, 16, 0, 0, Math.PI * 2); ctx.fill();

        // Body
        ctx.fillStyle = c.main;
        ctx.beginPath(); ctx.ellipse(-5, 0, 16, 12, 0, 0, Math.PI * 2); ctx.fill();

        // Head
        ctx.fillStyle = c.skin;
        ctx.beginPath(); ctx.arc(2, 0, 11, 0, Math.PI * 2); ctx.fill();

        // Hair (Sasuke Style)
        ctx.fillStyle = c.hair;
        ctx.beginPath();
        ctx.moveTo(-5, 0); ctx.lineTo(-18, -10); ctx.lineTo(-12, 0); ctx.lineTo(-18, 10);
        ctx.fill();

        // Arms
        ctx.fillStyle = c.main;
        CharacterRendererHelper.drawRoundedRectPath(ctx, 0, -16, 12, 6, 3); ctx.fill();
        CharacterRendererHelper.drawRoundedRectPath(ctx, 0, 10, 12, 6, 3); ctx.fill();

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
