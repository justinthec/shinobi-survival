import { CharacterDefinition } from "../../core/interfaces";
import { PlayerState } from "../../types";
import { CharacterRendererHelper } from "../../core/CharacterRendererHelper";
import { ROCK_LEE_CONSTANTS } from "./constants";

export class RockLeeCharacter implements CharacterDefinition {
    name = "Rock Lee";

    render(ctx: CanvasRenderingContext2D, state: PlayerState, time: number, isLocal: boolean, isOffCooldown: boolean) {
        const { pos, angle, hp, maxHp, name } = state;

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.scale(1.25, 1.25); // Match scale of other chars
        ctx.rotate(angle);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(-2, 2, 16, 16, 0, 0, Math.PI * 2); ctx.fill();

        // Colors
        const c = {
            skin: '#ffe0bd',
            hair: 'black',
            suit: '#008000', // Green
            vest: '#006400', // Darker Green
            warmers: 'orange'
        };

        // Body (Jumpsuit)
        ctx.fillStyle = c.suit;
        ctx.beginPath(); ctx.ellipse(-5, 0, 16, 12, 0, 0, Math.PI * 2); ctx.fill();

        // Vest/Detail
        ctx.fillStyle = c.vest;
        ctx.beginPath(); ctx.arc(-5, 0, 8, 0, Math.PI * 2); ctx.fill();

        // Head
        ctx.fillStyle = c.skin;
        ctx.beginPath(); ctx.arc(2, 0, 11, 0, Math.PI * 2); ctx.fill();

        // Hair (Bowl Cut)
        ctx.fillStyle = c.hair;
        ctx.beginPath();
        ctx.arc(2, 0, 12, Math.PI, Math.PI * 2); // Top half
        ctx.lineTo(14, 0);
        ctx.lineTo(14, 5); // Sideburns
        ctx.lineTo(-10, 5);
        ctx.lineTo(-10, 0);
        ctx.fill();

        // Shiny sheen on hair
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.ellipse(2, -6, 6, 2, 0, 0, Math.PI * 2);
        ctx.fill();


        // Arms
        ctx.fillStyle = c.suit;
        CharacterRendererHelper.drawRoundedRectPath(ctx, 0, -16, 12, 6, 3); ctx.fill();
        CharacterRendererHelper.drawRoundedRectPath(ctx, 0, 10, 12, 6, 3); ctx.fill();

        // Leg Warmers (Visual flair on sides)
        ctx.fillStyle = c.warmers;
        ctx.fillRect(5, 5, 8, 8);
        ctx.fillRect(5, -13, 8, 8);

        // 4. Animations based on State
        // Check for Dynamic Entry (E) - high velocity dash
        if (state.dash.active && Math.abs(state.dash.vx) > 10) {
            // Flying Kick Pose Overrides
            // Draw a big leg extending forward
            ctx.strokeStyle = c.warmers;
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(35, 0); // Extended leg
            ctx.stroke();

            // Speed lines
             ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
             ctx.lineWidth = 2;
             ctx.beginPath();
             ctx.moveTo(-20, -10);
             ctx.lineTo(-40, -10);
             ctx.moveTo(-20, 10);
             ctx.lineTo(-40, 10);
             ctx.stroke();

        } else if (state.cooldowns.q > (ROCK_LEE_CONSTANTS.LEAF_HURRICANE.COOLDOWN - ROCK_LEE_CONSTANTS.LEAF_HURRICANE.DURATION)) {
             // Q active (Leaf Hurricane)
             // Draw spinning legs
             const spin = (time * 0.8) % (Math.PI * 2);
             ctx.save();
             ctx.rotate(spin);

             ctx.strokeStyle = c.warmers;
             ctx.lineWidth = 6;
             // Leg 1
             ctx.beginPath();
             ctx.moveTo(0,0);
             ctx.lineTo(25, 10);
             ctx.stroke();
             // Leg 2
             ctx.beginPath();
             ctx.moveTo(0,0);
             ctx.lineTo(-25, -10);
             ctx.stroke();

             ctx.restore();
        }

        ctx.restore();

        // Health Bar (Standardized)
        if (maxHp > 0) {
             ctx.save();
             ctx.translate(pos.x, pos.y - 50);
             ctx.fillStyle = 'rgba(0,0,0,0.8)';
             CharacterRendererHelper.drawRoundedRectPath(ctx, -20, 0, 40, 6, 3); ctx.fill();
             const pct = Math.max(0, hp / maxHp);
             ctx.fillStyle = pct > 0.5 ? '#48bb78' : '#f56565';
             CharacterRendererHelper.drawRoundedRectPath(ctx, -18, 1, 36 * pct, 4, 2); ctx.fill();

             ctx.fillStyle = 'white';
             ctx.font = '10px Arial';
             ctx.textAlign = 'center';
             ctx.fillText(name, 0, -5);

             // Dash Charges Indicator (Under HP bar)
             if (state.skillStates['rocklee_dash']) {
                 const charges = state.skillStates['rocklee_dash'].charges;
                 ctx.fillStyle = 'cyan';
                 for(let i=0; i<charges; i++) {
                     ctx.beginPath();
                     ctx.arc(-10 + (i*20), 10, 3, 0, Math.PI*2);
                     ctx.fill();
                 }
             }

             ctx.restore();
        }
    }
}
