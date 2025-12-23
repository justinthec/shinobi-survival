import { CharacterDefinition } from "../../core/interfaces";
import { PlayerState } from "../../types";
import { CharacterRendererHelper } from "../../core/CharacterRendererHelper";

export class GaaraCharacter implements CharacterDefinition {
    name = "Gaara";

    render(ctx: CanvasRenderingContext2D, state: PlayerState, time: number, isLocal: boolean, isOffCooldown: boolean): void {
        CharacterRendererHelper.drawNinjaBody(
            ctx,
            state.pos.x,
            state.pos.y,
            state.angle,
            'gaara',
            state.hp,
            state.maxHp,
            state.name,
            time,
            false,
            1, // Opacity
            null // Color override
        );
    }
}
