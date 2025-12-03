import { PlayerState } from "../types";
import { ShinobiSurvivalGame } from "../multiplayer-game";

export interface WeaponLogic {
    fire(player: PlayerState, game: ShinobiSurvivalGame): void;
}
