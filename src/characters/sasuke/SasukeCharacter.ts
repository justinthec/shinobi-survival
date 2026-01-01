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
            main: '#334466', // Dark Blue Shirt
            collar: '#eeeeee', // High White Collar
            shorts: '#f0f0f0', // White Shorts
            acc: '#8b5cf6', // Rope/Purple
            crest: '#bb3333' // Red/White fan
        };

        if (isGhost) {
            // Purple tint for teleport ghost
             ctx.globalAlpha = 0.5 * opacity;
             c.main = '#8A2BE2';
             c.hair = '#4B0082';
             c.skin = '#D8BFD8';
             c.collar = '#E6E6FA';
        } else if (opacity < 1) {
             ctx.globalAlpha = opacity;
        }

        // Shadow
        if (!isGhost) {
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath(); ctx.ellipse(-2, 2, 16, 16, 0, 0, Math.PI * 2); ctx.fill();
        }

        // --- Body (Shoulders Top Down) ---
        // Shirt
        ctx.fillStyle = c.main;
        ctx.beginPath(); ctx.ellipse(-5, 0, 16, 12, 0, 0, Math.PI * 2); ctx.fill();

        // High Collar (Distinctive Sasuke Trait - Back of head)
        ctx.fillStyle = c.collar;
        ctx.beginPath();
        // Behind head - arc
        ctx.arc(-2, 0, 14, -Math.PI/1.5, Math.PI/1.5, true);
        ctx.fill();

        // Uchiha Crest (Back of shirt - Top Down view means behind head)
        if (!isGhost) {
            ctx.fillStyle = '#cc0000'; // Red
            ctx.beginPath(); ctx.arc(-11, 0, 3, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = 'white'; // White top/bottom split simplified
            ctx.beginPath(); ctx.arc(-11, -1, 3, 0, Math.PI, true); ctx.fill();
        }

        // --- Head (Top Down) ---
        ctx.fillStyle = c.skin;
        ctx.beginPath(); ctx.arc(2, 0, 11, 0, Math.PI * 2); ctx.fill();

        // --- Hair (Duckbutt style - Top Down) ---
        // Spiky back, covering most of top
        ctx.fillStyle = c.hair;
        ctx.beginPath();
        // Main mass
        ctx.arc(2, 0, 12, 0, Math.PI*2);

        // Spiky tail at back
        ctx.moveTo(-8, -6);
        ctx.lineTo(-18, -4);
        ctx.lineTo(-12, 0);
        ctx.lineTo(-18, 4);
        ctx.lineTo(-8, 6);
        ctx.fill();

        // NO FACIAL FEATURES

        // --- Arms (Visible from sides) ---
        ctx.fillStyle = c.skin;
        // Arm Warmers/Guards (White/Bandages)
        ctx.fillStyle = '#eeeeee';
        CharacterRendererHelper.drawRoundedRectPath(ctx, 0, -17, 12, 5, 2); ctx.fill();
        CharacterRendererHelper.drawRoundedRectPath(ctx, 0, 12, 12, 5, 2); ctx.fill();

        ctx.fillStyle = c.main; // Shoulder/Sleeve
        CharacterRendererHelper.drawRoundedRectPath(ctx, -2, -14, 8, 6, 2); ctx.fill();
        CharacterRendererHelper.drawRoundedRectPath(ctx, -2, 8, 8, 6, 2); ctx.fill();


        if (isGhost) ctx.globalAlpha = 1;
    }

    render(ctx: CanvasRenderingContext2D, state: PlayerState, time: number, isLocal: boolean, isOffCooldown: boolean) {
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
