import { CharacterDefinition } from "../../core/interfaces";
import { PlayerState } from "../../types";
import { CharacterRendererHelper } from "../../core/CharacterRendererHelper";
import { getPlayerColor } from "../../core/utils";

export class RockLeeCharacter implements CharacterDefinition {
    name = "Rock Lee";

    render(ctx: CanvasRenderingContext2D, state: PlayerState, time: number, isLocal: boolean, isOffCooldown: boolean) {
        let actionState: string | undefined = undefined;

        // Visual Aura for Speed Buff (E Phase 1)
        if (state.skillStates['e']?.active) {
            ctx.save();
            ctx.translate(state.pos.x, state.pos.y);
            const scale = 1 + Math.sin(time * 0.2) * 0.1;
            ctx.scale(scale, scale);
            ctx.fillStyle = 'rgba(0, 255, 0, 0.3)'; // Green Chakra
            ctx.beginPath();
            ctx.arc(0, 0, 35, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Check if casting / stunned (often implies mid-animation)
        if (state.casting > 0) {
            // Heuristic:
            // If cooldown E is HIGH (just cast) and casting > 0 -> Lotus Kick (Upwards)
            if (state.cooldowns.e > 850) {
                actionState = 'kick_up';
            }
            // If cooldown Q is HIGH -> Leaf Hurricane Dive
            else if (state.cooldowns.q > 400) { // Cooldown is 480
                 // Standard Side Kick for Dash
                 actionState = 'kick';

                 // Q Glow / Trail
                 ctx.save();
                 ctx.translate(state.pos.x, state.pos.y);
                 ctx.rotate(state.angle);
                 ctx.fillStyle = 'rgba(0, 255, 0, 0.6)';
                 ctx.shadowBlur = 10;
                 ctx.shadowColor = '#00ff00';
                 // Draw a streak behind
                 ctx.beginPath();
                 ctx.moveTo(-10, -10);
                 ctx.lineTo(-40, 0);
                 ctx.lineTo(-10, 10);
                 ctx.fill();
                 ctx.restore();
            }
        }

        CharacterRendererHelper.drawNinjaBody(
            ctx,
            state.pos.x,
            state.pos.y,
            state.angle,
            'rocklee',
            state.hp,
            state.maxHp,
            state.name,
            time,
            false,
            1, null, actionState, getPlayerColor(state.id)
        );
    }
}
