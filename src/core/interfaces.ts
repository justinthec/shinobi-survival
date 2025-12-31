import { ShinobiClashGame } from "../multiplayer-game";
import { PlayerState, ProjectileState } from "../types";

export interface AbilityDefinition {
    key: string;
    name: string;
    description: string;
    type: 'active' | 'passive';
}

export interface CharacterDefinition {
    name: string;
    description: string;
    abilities: AbilityDefinition[];
    render(ctx: CanvasRenderingContext2D, state: PlayerState, time: number, isLocal: boolean, isOffCooldown: boolean): void;
}

export interface ProjectileDefinition {
    update(game: ShinobiClashGame, proj: ProjectileState): void;
    render(ctx: CanvasRenderingContext2D, proj: ProjectileState, time: number): void;
    calculateDamage?(game: ShinobiClashGame, proj: ProjectileState): number;
}
