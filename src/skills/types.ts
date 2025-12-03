import { PlayerState, SkillState } from "../types";
import type { ShinobiSurvivalGame } from "../multiplayer-game";

export { SkillState };

export interface SkillLogic {
    // Called every tick
    update(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void;

    // Called when the key is pressed (once)
    onPress(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void;

    // Called when the key is held down
    onHold(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void;

    // Called when the key is released
    onRelease(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void;

    // Called during rendering
    draw(ctx: CanvasRenderingContext2D, state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void;
}

export interface WeaponLogic {
    fire(player: PlayerState, game: ShinobiSurvivalGame): void;
}
