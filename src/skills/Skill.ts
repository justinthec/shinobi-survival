import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../multiplayer-game";
import { PlayerState } from "../types";

export interface Skill {
    readonly cooldown: number; // in frames
    cast(game: ShinobiClashGame, player: PlayerState, input: DefaultInput, targetPos: Vec2): void;
    handleInput?(game: ShinobiClashGame, player: PlayerState, input: DefaultInput, targetPos: Vec2): void;
}
