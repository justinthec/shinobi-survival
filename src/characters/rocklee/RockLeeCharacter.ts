import { CharacterDefinition } from "../../core/interfaces";
import { PlayerState } from "../../types";
import { CharacterRendererHelper } from "../../core/CharacterRendererHelper";
import { getPlayerColor } from "../../core/utils";

export class RockLeeCharacter implements CharacterDefinition {
    name = "Rock Lee";

    render(ctx: CanvasRenderingContext2D, state: PlayerState, time: number, isLocal: boolean, isOffCooldown: boolean) {
        let actionState: string | undefined = undefined;

        // Check if casting / stunned (often implies mid-animation)
        if (state.casting > 0) {
            // How to distinguish Kick vs Dive vs Stunned?
            // We can check cooldowns or infer from context?
            // Better: Check if there is an active projectile owned by this player that implies an action.
            // But we don't have access to 'game' here, only 'state'.
            // Wait, we assume 'state' is self-contained. It doesn't contain the projectiles list.
            // However, PlayerState usually doesn't know about projectiles.

            // Heuristic:
            // If cooldown E is HIGH (just cast) and casting > 0 -> Kick
            // Lotus Kick Cooldown is 900.
            if (state.cooldowns.e > 850) {
                actionState = 'kick';
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
