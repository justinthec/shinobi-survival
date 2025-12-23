import { ShinobiClashGame } from "../multiplayer-game";
import { PlayerState, ProjectileState } from "../types";

export interface CharacterDefinition {
    name: string;
    render(ctx: CanvasRenderingContext2D, state: PlayerState, time: number, isLocal: boolean, isOffCooldown: boolean): void;
}

export interface ProjectileDefinition {
    update(game: ShinobiClashGame, proj: ProjectileState): void;
    render(ctx: CanvasRenderingContext2D, proj: ProjectileState, time: number): void;
    calculateDamage?(game: ShinobiClashGame, proj: ProjectileState): number;
    onHit?(game: ShinobiClashGame, target: PlayerState, proj: ProjectileState): void;
}
