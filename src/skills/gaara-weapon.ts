import { PlayerState } from "../types";
import { ShinobiSurvivalGame } from "../multiplayer-game";
import { WeaponLogic } from "./weapon-logic";

export class GaaraWeapon implements WeaponLogic {
    fire(player: PlayerState, game: ShinobiSurvivalGame): void {
        const weaponLevel = player.weaponLevel;
        const damage = 15 * player.stats.damageMult;
        const speed = 250;
        const pierce = 1 + player.stats.piercing;
        const knockback = 2 + player.stats.knockback;
        const size = 25;

        // Find closest enemy
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

        if (weaponLevel >= 1) {
            game.spawnProjectile(player.id, player.pos, angle, speed, damage, 'sand_shuriken', knockback, pierce, size);
        }
        if (weaponLevel >= 2) {
            game.spawnProjectile(player.id, player.pos, angle + 0.2, speed, damage, 'sand_shuriken', knockback, pierce, size);
            game.spawnProjectile(player.id, player.pos, angle - 0.2, speed, damage, 'sand_shuriken', knockback, pierce, size);
        }
        if (weaponLevel >= 3) {
            game.spawnProjectile(player.id, player.pos, angle + 0.4, speed, damage * 0.8, 'sand_shuriken', knockback, pierce, size * 0.8);
            game.spawnProjectile(player.id, player.pos, angle - 0.4, speed, damage * 0.8, 'sand_shuriken', knockback, pierce, size * 0.8);
        }
        if (weaponLevel >= 4) {
            const sandWaveAngle = player.direction === 1 ? 0 : Math.PI;
            game.spawnProjectile(player.id, player.pos, sandWaveAngle, 100, damage * 1.5, 'sand_wave', knockback * 2, 999, 60);
        }
        if (weaponLevel >= 5) {
            // Evolved: Giant Sand Burial
            for(let i = 0; i < 6; i++) {
                const randomAngle = Math.random() * Math.PI * 2;
                const spawnPos = {
                    x: player.pos.x + Math.cos(randomAngle) * 200,
                    y: player.pos.y + Math.sin(randomAngle) * 200,
                };
                game.spawnProjectile(player.id, spawnPos, 0, 0, damage * 5, 'giant_sand_burial', 0, 999, 100);
            }
        }
    }
}
