import { PlayerState, SkillState } from "../types";
import { ShinobiSurvivalGame } from "../multiplayer-game";

export interface CharacterLogic {
    update(player: PlayerState, game: ShinobiSurvivalGame, dt: number): void;
    onDamage(player: PlayerState, game: ShinobiSurvivalGame, amount: number): number;
    onDealDamage(player: PlayerState, game: ShinobiSurvivalGame, damage: number): number;
    onDodge(player: PlayerState, game: ShinobiSurvivalGame): void;
}

export interface WeaponLogic {
    fire(player: PlayerState, game: ShinobiSurvivalGame): void;
}

export interface SkillLogic {
    update(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void;
    onPress(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void;
    onHold(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void;
    onRelease(skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void;
    draw(ctx: CanvasRenderingContext2D, skill: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void;
}

export interface WeaponLogic {
    fire(player: PlayerState, game: ShinobiSurvivalGame): void;
}
