import { CharacterLogic } from "./types";
import { PlayerState } from "../types";
import { ShinobiSurvivalGame } from "../multiplayer-game";

export class GaaraLogic implements CharacterLogic {
    update(player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        if (player.dead) return;

        if (player.charState && 'shieldHp' in player.charState) {
            player.charState.shieldRegenTimer += dt;
            if (player.charState.shieldRegenTimer >= 8.0) {
                if (player.charState.shieldHp < 50) {
                    player.charState.shieldHp += 10 * dt;
                    if (player.charState.shieldHp > 50) {
                        player.charState.shieldHp = 50;
                    }
                }
            }
        }
    }

    onDamage(player: PlayerState, game: ShinobiSurvivalGame, amount: number): number {
        if (player.charState && 'shieldHp' in player.charState) {
            const shield = player.charState.shieldHp;
            if (shield > 0) {
                const absorb = Math.min(shield, amount);
                player.charState.shieldHp -= absorb;
                amount -= absorb;
                player.charState.shieldRegenTimer = 0; // Reset regen timer
            } else {
                player.charState.shieldRegenTimer = 0;
            }
        }
        return amount;
    }

    onDealDamage(player: PlayerState, game: ShinobiSurvivalGame, damage: number): number {
        return damage;
    }

    onDodge(player: PlayerState, game: ShinobiSurvivalGame): void {}
}
