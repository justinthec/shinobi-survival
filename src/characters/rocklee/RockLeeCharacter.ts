import { CharacterDefinition } from "../../core/interfaces";
import { PlayerState, ProjectileState } from "../../types";
import { CharacterRendererHelper } from "../../core/CharacterRendererHelper";
import { ROCK_LEE_CONSTANTS } from "./constants";
import { getPlayerColor } from "../../core/utils";
import { ShinobiClashGame } from "../../multiplayer-game";

export class RockLeeCharacter implements CharacterDefinition {
    name = "Rock Lee";
    description = "A taijutsu specialist who relies on speed and physical attacks.";

    onHit(game: ShinobiClashGame, player: PlayerState, source: ProjectileState | number) {
        // Cancel Dynamic Entry if active (Windup or Dashing)
        const dynState = player.skillStates['dynamic_entry'];
        if (dynState) { // If state exists at all
             delete player.skillStates['dynamic_entry'];
             // Ensure player isn't stuck casting
             if (player.casting > 0) {
                 player.casting = 0;
             }
        }
    }

    render(ctx: CanvasRenderingContext2D, state: PlayerState, time: number, isLocal: boolean, isOffCooldown: boolean, showHealthBar: boolean = true) {
        const { pos, angle, hp, maxHp, name } = state;

        // Colors
        const c = {
            skin: '#ffe0bd',
            hair: '#111111', // Dark shiny black
            suit: '#32CD32', // Brighter green for anime look
            vest: '#006400', // Dark Green
            belt: '#d3d3d3',
            sash: '#FF0000',
            warmers: '#FF8C00', // Orange leg warmers
            bandages: '#eeeeee'
        };

        // Dynamic Entry Logic Check
        // Now managed by projectile setting skillStates['dynamic_entry'].active = true
        const dynState = state.skillStates['dynamic_entry'];
        const isDynamicEntry = dynState && dynState.active;

        const qState = state.skillStates['leaf_hurricane'];
        const isQActive = qState && qState.active;

        // Dynamic Entry Target Indicator
        if (isLocal && dynState && dynState.target && !isDynamicEntry) { // Show indicator during Windup (not dash)
            // Or maybe always? User didn't specify, but windup is when you want to know where you are going.
            // Let's use the stored target.
            const target = dynState.target;
            // Wait, target is a direction vector (cos, sin) in the new update, OR coordinate?
            // In DynamicEntrySkill.ts: target: new Vec2(Math.cos(angle), Math.sin(angle))
            // So it's a direction. We can't draw the "destination" circle exactly unless we calculate it.
            // But we know speed * duration.

            const speed = ROCK_LEE_CONSTANTS.DYNAMIC_ENTRY.SPEED;
            const duration = ROCK_LEE_CONSTANTS.DYNAMIC_ENTRY.DURATION;
            const dist = speed * duration;

            const destX = pos.x + target.x * dist;
            const destY = pos.y + target.y * dist;

            ctx.save();
            ctx.translate(destX, destY);
            ctx.scale(1, 0.5);
            ctx.fillStyle = `rgba(0, 255, 0, 0.5)`; // Green Target
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Draw line to target
            ctx.save();
            ctx.strokeStyle = `rgba(0, 255, 0, 0.3)`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(destX, destY);
            ctx.stroke();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.scale(1.25, 1.25);

        // Rotation Logic
        let effectiveAngle = angle;
        if (isQActive) {
            const elapsed = time - (qState.startTime || time);
            const duration = ROCK_LEE_CONSTANTS.LEAF_HURRICANE.DURATION;
            const progress = Math.min(1, Math.max(0, elapsed / duration));
            const totalSpins = 5;
            // "progress^2 + 1.5": Interpret as p^2 + 1.5p to ensure start at 0 and fast initial velocity.
            const curve = Math.pow(progress, 2) + 1.5 * progress;
            effectiveAngle = (totalSpins * Math.PI * 2) * curve;
        }
        ctx.rotate(effectiveAngle);

        // Dynamic Entry Aura (Green Energy)
        if (isDynamicEntry || (dynState && dynState.timer)) { // Active or Windup
             ctx.save();
             ctx.shadowColor = "#00ff00";
             ctx.shadowBlur = 20;
             ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
             ctx.beginPath();
             ctx.ellipse(0, 0, 22, 18, 0, 0, Math.PI * 2);
             ctx.fill();
             ctx.restore();
        }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(-2, 2, 16, 16, 0, 0, Math.PI * 2); ctx.fill();

        // --- Body (Top Down: Shoulders) ---
        ctx.fillStyle = c.suit;
        // Shoulders Oval
        ctx.beginPath();
        ctx.ellipse(-4, 0, 16, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Red Sash (Visible on waist/back)
        ctx.fillStyle = c.sash;
        ctx.fillRect(-10, -5, 4, 10);

        // --- Head (Top Down) ---
        // Hair covers almost everything from top down

        // Skin visible on sides of head or back neck? Minimal.
        ctx.fillStyle = c.skin;
        ctx.beginPath(); ctx.arc(2, 0, 11, 0, Math.PI * 2); ctx.fill();

        // --- Hair (Bowl Cut - Top Down) ---
        ctx.fillStyle = c.hair;
        ctx.beginPath();
        // Perfectly round bowl shape
        ctx.arc(2, 0, 12, 0, Math.PI * 2);
        ctx.fill();

        // Shiny ring on hair (Signature Lee)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(2, 0, 8, 0, Math.PI * 2);
        ctx.stroke();

        // NO FACE FEATURES (Top Down)

        // --- Arms (Bandaged, visible from sides) ---
        ctx.fillStyle = c.bandages;
        CharacterRendererHelper.drawRoundedRectPath(ctx, 0, -17, 12, 5, 2); ctx.fill();
        CharacterRendererHelper.drawRoundedRectPath(ctx, 0, 12, 12, 5, 2); ctx.fill();


        // --- Animations ---
        if (isDynamicEntry) {
            // Extended Leg for Kick
            ctx.save();
            // Draw leg extending out forward (right side in model space), but offset to the side (Right Leg)
            const legOffsetY = 5; // Right side

            // Green Leg
            ctx.fillStyle = c.suit;
            CharacterRendererHelper.drawRoundedRectPath(ctx, 8, legOffsetY - 4, 20, 8, 3);
            ctx.fill();

            // Orange Warmer
            ctx.fillStyle = c.warmers;
            CharacterRendererHelper.drawRoundedRectPath(ctx, 25, legOffsetY - 4, 8, 8, 2);
            ctx.fill();

            // Shoe/Foot
            ctx.fillStyle = '#1a202c'; // Dark Blue/Black Shoe
            CharacterRendererHelper.drawRoundedRectPath(ctx, 33, legOffsetY - 3, 6, 6, 2);
            ctx.fill();

            ctx.restore();

            // Speed lines
             ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
             ctx.lineWidth = 2;
             ctx.beginPath();
             ctx.moveTo(-10, -15); ctx.lineTo(-40, -15);
             ctx.moveTo(-10, 15); ctx.lineTo(-40, 15);
             ctx.stroke();

        } else if (isQActive) {
             // Q Spin Kick Visual

             // Extended Leg whirling around (Right Leg offset)
             ctx.save();
             const legOffsetY = 5;

             // Green Leg
             ctx.fillStyle = c.suit;
             CharacterRendererHelper.drawRoundedRectPath(ctx, 10, legOffsetY - 4, 18, 8, 3);
             ctx.fill();

             // Orange Warmer
             ctx.fillStyle = c.warmers;
             CharacterRendererHelper.drawRoundedRectPath(ctx, 28, legOffsetY - 4, 8, 8, 2);
             ctx.fill();

             // Shoe
             ctx.fillStyle = '#1a202c';
             CharacterRendererHelper.drawRoundedRectPath(ctx, 36, legOffsetY - 3, 5, 6, 2);
             ctx.fill();

             ctx.restore();

             ctx.strokeStyle = 'rgba(200, 255, 200, 0.5)'; // Wind swipe
             ctx.lineWidth = 4;
             ctx.beginPath();
             ctx.arc(0, 0, 35, 0, Math.PI*2);
             ctx.stroke();
        }

        ctx.restore();

        // Health Bar & Info
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

             // Dash Charges
             if (state.skillStates['rocklee_dash']) {
                 const charges = state.skillStates['rocklee_dash'].charges;
                 ctx.fillStyle = '#00ff00'; // Green LED style
                 for(let i=0; i<charges; i++) {
                     ctx.beginPath();
                     ctx.arc(-10 + (i*20), 10, 3, 0, Math.PI*2);
                     ctx.fill();
                     ctx.strokeStyle = 'white';
                     ctx.lineWidth = 1;
                     ctx.stroke();
                 }
             }
             ctx.restore();
        }
    }
}
