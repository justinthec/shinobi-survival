import { CharacterDefinition } from "../../core/interfaces";
import { PlayerState } from "../../types";
import { CharacterRendererHelper } from "../../core/CharacterRendererHelper";
import { getPlayerColor } from "../../core/utils";
import { ShinobiClashGame } from "../../multiplayer-game";

export class SasukeCharacter implements CharacterDefinition {
    name = "Sasuke";

    render(ctx: CanvasRenderingContext2D, state: PlayerState, time: number, isLocal: boolean, isOffCooldown: boolean) {

        // Draw Charging Indicator for Sasuke's Teleport
        if (isLocal && isOffCooldown && state.skillStates && state.skillStates['e'] && state.skillStates['e'].charging && state.skillStates['e'].target) {
            const target = state.skillStates['e'].target;
            const swapTargetId = state.skillStates['e'].swapTargetId;

            let ghostColor = '#8A2BE2'; // Default purple

            if (swapTargetId !== undefined) {
                ghostColor = '#FF4500'; // Orange/Red for swap
            }

            CharacterRendererHelper.drawNinjaBody(ctx, target.x, target.y, state.angle, 'sasuke', 0, 0, "", time, false, 0.5, ghostColor);

            if (swapTargetId !== undefined) {
                 ctx.save();
                 ctx.translate(target.x, target.y);
                 ctx.font = 'bold 16px Arial';
                 ctx.textAlign = 'center';
                 ctx.fillStyle = '#FF4500';
                 ctx.strokeStyle = 'white';
                 ctx.lineWidth = 3;
                 ctx.strokeText("SWAP!", 0, -30);
                 ctx.fillText("SWAP!", 0, -30);
                 ctx.restore();
            }
        }

        CharacterRendererHelper.drawNinjaBody(
            ctx,
            state.pos.x,
            state.pos.y,
            state.angle,
            'sasuke',
            state.hp,
            state.maxHp,
            state.name,
            time,
            false,
            1, null, undefined, getPlayerColor(state.id)
        );
    }
}
