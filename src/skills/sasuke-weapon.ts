import { PlayerState } from "../types";
import { ShinobiSurvivalGame } from "../multiplayer-game";
import { WeaponLogic } from "./weapon-logic";

export class SasukeWeapon implements WeaponLogic {
    fire(player: PlayerState, game: ShinobiSurvivalGame): void {
        const weaponLevel = player.weaponLevel;
        let damage = 10 * player.stats.damageMult;
        if (game.random() < player.stats.critChance) {
            damage *= 2;
        }

        // Find closest enemy to aim at
        let closestEnemy = null;
        let minDistance = Infinity;
        for (const enemy of game.enemies) {
            const distance = Math.sqrt(
                (player.pos.x - enemy.pos.x) ** 2 +
                (player.pos.y - enemy.pos.y) ** 2
            );
            if (distance < minDistance) {
                minDistance = distance;
                closestEnemy = enemy;
            }
        }

        const angle = closestEnemy
            ? Math.atan2(closestEnemy.pos.y - player.pos.y, closestEnemy.pos.x - player.pos.x)
            : player.direction === 1 ? 0 : Math.PI;

        if (weaponLevel >= 5) {
            // Evolved: Chidori Spear
            const spearDamage = damage * 4;
            const speed = 800;
            game.spawnProjectile(player.id, player.pos, angle, speed, spearDamage, 'chidori_spear', 4 + player.stats.knockback, 999, 30);
        } else {
            const slashDamage = weaponLevel >= 4 ? damage * 2.5 : (weaponLevel >= 2 ? damage * 1.5 : damage);
            const projectileType = weaponLevel >= 2 ? 'rotating_slash_lightning' : 'rotating_slash';

            game.spawnProjectile(player.id, player.pos, angle, 0, slashDamage, projectileType, 5 + player.stats.knockback, 99, 30);
            const projectile = game.projectiles[game.projectiles.length - 1];
            if (projectile) {
                projectile.life = 0.3; // Swing time
            }

            if (weaponLevel >= 3) {
                // Chain lightning
                for (const enemy of game.enemies) {
                    const distance = Math.sqrt(
                        (player.pos.x - enemy.pos.x) ** 2 +
                        (player.pos.y - enemy.pos.y) ** 2
                    );
                    if (distance < 150) {
                        const lightningAngle = Math.atan2(enemy.pos.y - player.pos.y, enemy.pos.x - player.pos.x);
                        const lightningDamage = damage * 0.5;
                        game.spawnProjectile(player.id, player.pos, lightningAngle, 1200, lightningDamage, 'lightning_chain', 2, 1, 15);
                        break;
                    }
                }
            }
        }
    }
}
