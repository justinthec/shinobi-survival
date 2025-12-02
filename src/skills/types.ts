import { PlayerState, SkillState } from "../types";
import type { ShinobiSurvivalGame } from "../multiplayer-game";

export { SkillState };

export interface SkillLogic {
    update(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void;
    onPress(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void;
    onHold(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void;
    onRelease(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void;
    draw(ctx: CanvasRenderingContext2D, state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void;
    onDashEnd?(player: PlayerState, game: ShinobiSurvivalGame): void;
}

export interface CharacterLogic {
    updatePassives(player: PlayerState, game: ShinobiSurvivalGame, dt: number): void;
}
