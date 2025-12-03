import { PlayerState, SkillState } from "../types";
import { ShinobiSurvivalGame } from "../multiplayer-game";
import { CharacterLogic } from "./types";
import { SkillLogic } from "./skill-logic";

export class SasukeLogic implements CharacterLogic {
    update(player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        if (player.dead) return;

        if (player.charState && 'dodgeBuffTimer' in player.charState) {
            if (player.charState.dodgeBuffTimer > 0) {
                player.charState.dodgeBuffTimer -= dt;
                player.stats.critChance = 0.5; // 50% crit chance
            } else {
                player.stats.critChance = 0.05; // Reset
            }

            if (player.charState.sharinganCooldown > 0) {
                player.charState.sharinganCooldown -= dt;
            }
        }
    }

    onDamage(player: PlayerState, game: ShinobiSurvivalGame, amount: number): number {
        if (player.charState && 'sharinganCooldown' in player.charState) {
            if (player.charState.sharinganCooldown <= 0) {
                if (game.random() < 0.15) {
                    this.onDodge(player, game);
                    return 0; // No damage taken
                }
            }
        }
        return amount;
    }

    onDodge(player: PlayerState, game: ShinobiSurvivalGame): void {
        if (player.charState && 'sharinganCooldown' in player.charState) {
            player.charState.sharinganCooldown = 5.0; // Set cooldown
            game.spawnFloatingText(player.pos, "Dodge!", "cyan");

            if ('dodgeBuffTimer' in player.charState) {
                player.charState.dodgeBuffTimer = 2.0;
            }
        }
    }

    onDealDamage(player: PlayerState, game: ShinobiSurvivalGame, damage: number): number {
        return damage;
    }
}
