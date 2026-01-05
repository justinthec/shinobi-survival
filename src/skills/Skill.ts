import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../multiplayer-game";
import { PlayerState } from "../types";

export interface Skill {
    readonly name: string;
    readonly description: string;
    readonly cooldown: number; // in frames
    cast(game: ShinobiClashGame, player: PlayerState, input: DefaultInput, targetPos: Vec2): void;
    handleInput?(game: ShinobiClashGame, player: PlayerState, input: DefaultInput, targetPos: Vec2): void;
    update?(game: ShinobiClashGame, player: PlayerState, input: DefaultInput): void;
}
