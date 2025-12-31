import { CharacterDefinition } from "../../core/interfaces";
import { PlayerState } from "../../types";
import { CharacterRendererHelper } from "../../core/CharacterRendererHelper";
import { ShinobiClashGame } from "../../multiplayer-game";

export class SasukeCharacter implements CharacterDefinition {
    name = "Sasuke";

    render(ctx: CanvasRenderingContext2D, state: PlayerState, time: number, isLocal: boolean, isOffCooldown: boolean) {

        // Draw Charging Indicator for Sasuke's Teleport
        if (isLocal && isOffCooldown && state.skillStates && state.skillStates['e'] && state.skillStates['e'].charging && state.skillStates['e'].target) {
            const target = state.skillStates['e'].target;
            CharacterRendererHelper.drawNinjaBody(ctx, target.x, target.y, state.angle, 'sasuke', 0, 0, "", time, false, 0.5, '#8A2BE2');
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
            false
        );
    }
}
