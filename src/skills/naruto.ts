import { CharacterLogic } from "./types";
import { PlayerState } from "../types";
import { ShinobiSurvivalGame } from "../multiplayer-game";

export class NarutoLogic implements CharacterLogic {
    update(player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        if (player.dead) return;

        if (player.charState && 'regenTimer' in player.charState) {
            player.charState.regenTimer += dt;
            if (player.charState.regenTimer >= 1.0) {
                player.charState.regenTimer = 0;
                let regen = player.maxHp * 0.01;
                if (player.hp < player.maxHp * 0.3) regen *= 2;
                player.hp = Math.min(player.hp + regen, player.maxHp);
            }
        }
    }

    onDamage(player: PlayerState, game: ShinobiSurvivalGame, amount: number): number {
        return amount;
    }

    onDealDamage(player: PlayerState, game: ShinobiSurvivalGame, damage: number): number {
        return damage;
    }

    onDodge(player: PlayerState, game: ShinobiSurvivalGame): void {}
}
