import { CharacterDefinition } from "../../core/interfaces";
import { PlayerState } from "../../types";
import { CharacterRendererHelper } from "../../core/CharacterRendererHelper";
import { ROCK_LEE_CONSTANTS } from "./constants";

export class RockLeeCharacter implements CharacterDefinition {
    name = "Rock Lee";

    render(ctx: CanvasRenderingContext2D, state: PlayerState, time: number, isLocal: boolean, isOffCooldown: boolean) {
        const { pos, angle, hp, maxHp, name } = state;

        // Colors
        const c = {
            skin: '#ffe0bd',
            hair: 'black',
            suit: '#008000', // Green
            vest: '#006400', // Darker Green
            warmers: 'orange'
        };

        const activeSkill = state.skillStates['active_dash_skill'];
        const isDynamicEntry = state.dash.active && activeSkill && activeSkill.type === 'dynamic_entry';

        // Dynamic Entry Target Indicator
        if (isDynamicEntry && state.skillStates['dynamic_entry'] && state.skillStates['dynamic_entry'].target) {
            const target = state.skillStates['dynamic_entry'].target;
            const dx = target.x - pos.x;
            const dy = target.y - pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 600;
            const opacity = Math.max(0.2, 0.8 * (1 - Math.min(dist, maxDist) / maxDist));

            ctx.save();
            ctx.translate(target.x, target.y);
            ctx.scale(1, 0.5);
            ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.scale(1.25, 1.25);

        // Q Animation: Spin Logic (Matches Projectile)
        // Check if Q is active
        // Cooldown starts at DURATION + COOLDOWN? Or just COOLDOWN?
        // Usually, cooldown is set to COOLDOWN. Active while cooldown > (COOLDOWN - DURATION).
        // Let's assume standard behavior.
        const duration = ROCK_LEE_CONSTANTS.LEAF_HURRICANE.DURATION;
        const totalCooldown = ROCK_LEE_CONSTANTS.LEAF_HURRICANE.COOLDOWN;
        const timeRemaining = state.cooldowns.q - (totalCooldown - duration);
        const isQActive = timeRemaining > 0;

        let effectiveAngle = angle;

        if (isQActive) {
            // Calculate progress (0 to 1)
            // timeRemaining goes from duration down to 0.
            const progress = 1 - (timeRemaining / duration);

            // Quadratic Rotation
            const totalSpins = 5;
            const rotation = (totalSpins * Math.PI * 2) * (progress * progress);
            effectiveAngle = rotation;
        }

        ctx.rotate(effectiveAngle);

        // Dynamic Entry Aura
        if (isDynamicEntry) {
             ctx.save();
             ctx.shadowColor = "#00ff00";
             ctx.shadowBlur = 20;
             ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
             ctx.beginPath();
             ctx.ellipse(0, 0, 20, 15, 0, 0, Math.PI * 2);
             ctx.fill();
             ctx.restore();
        }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(-2, 2, 16, 16, 0, 0, Math.PI * 2); ctx.fill();

        // Body
        ctx.fillStyle = c.suit;
        ctx.beginPath(); ctx.ellipse(-5, 0, 16, 12, 0, 0, Math.PI * 2); ctx.fill();

        // Vest
        ctx.fillStyle = c.vest;
        ctx.beginPath(); ctx.arc(-5, 0, 8, 0, Math.PI * 2); ctx.fill();

        // Head
        ctx.fillStyle = c.skin;
        ctx.beginPath(); ctx.arc(2, 0, 11, 0, Math.PI * 2); ctx.fill();

        // Hair
        ctx.fillStyle = c.hair;
        ctx.beginPath();
        ctx.arc(2, 0, 12, Math.PI, Math.PI * 2);
        ctx.lineTo(14, 0);
        ctx.lineTo(14, 5);
        ctx.lineTo(-10, 5);
        ctx.lineTo(-10, 0);
        ctx.fill();

        // Sheen
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.ellipse(2, -6, 6, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Arms
        ctx.fillStyle = c.suit;
        CharacterRendererHelper.drawRoundedRectPath(ctx, 0, -16, 12, 6, 3); ctx.fill();
        CharacterRendererHelper.drawRoundedRectPath(ctx, 0, 10, 12, 6, 3); ctx.fill();

        // Leg Warmers
        ctx.fillStyle = c.warmers;
        ctx.fillRect(5, 5, 8, 8);
        ctx.fillRect(5, -13, 8, 8);

        // Animations
        if (isDynamicEntry) {
            // Flying Kick
            ctx.strokeStyle = c.warmers;
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(35, 0);
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

        } else if (isQActive) {
             // Q Spin Kick
             ctx.strokeStyle = c.warmers;
             ctx.lineWidth = 8;
             // Extended leg - Match radius 80
             ctx.beginPath();
             ctx.moveTo(0,0);
             ctx.lineTo(60, 0);
             ctx.stroke();

             // Foot
             ctx.fillStyle = c.warmers;
             ctx.beginPath();
             ctx.arc(60, 0, 5, 0, Math.PI*2);
             ctx.fill();

             // Other leg tucked
             ctx.strokeStyle = c.warmers;
             ctx.lineWidth = 6;
             ctx.beginPath();
             ctx.moveTo(0,0);
             ctx.lineTo(-10, 10);
             ctx.stroke();
        }

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

             ctx.fillStyle = 'white';
             ctx.font = '10px Arial';
             ctx.textAlign = 'center';
             ctx.fillText(name, 0, -5);

             // Dash Charges
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
