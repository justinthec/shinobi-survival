import { CharacterLogic } from "./types";
import { PlayerState, SkillState } from "../types";
import { ShinobiSurvivalGame } from "../multiplayer-game";
import { SkillLogic } from "./skill-logic";
import { Vec2 } from "netplayjs";

export class SakuraLogic implements CharacterLogic {
    update(player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        // Sakura currently has no passive update logic,
        // but the onDamage and onDealDamage hooks handle her meter.
    }

    onDamage(player: PlayerState, game: ShinobiSurvivalGame, amount: number): number {
        if (player.charState && 'meter' in player.charState) {
            player.charState.meter = Math.min(player.charState.meter + 10, 100);
        }
        return amount;
    }

    onDealDamage(player: PlayerState, game: ShinobiSurvivalGame, damage: number): number {
        if (player.charState && 'meter' in player.charState) {
            if (player.charState.meter >= 100) {
                damage *= 5;
                player.charState.meter = 0; // Consume
                game.spawnFloatingText(player.pos, "SMASH!", "pink");
            }
        }
        return damage;
    }

    onDodge(player: PlayerState, game: ShinobiSurvivalGame): void {}
}
