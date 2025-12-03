import { PlayerState, ProjectileState } from "../types";
import { ShinobiSurvivalGame } from "../multiplayer-game";
import { WeaponLogic } from "./weapon-logic";
import { Vec2 } from "netplayjs";

export class NarutoWeapon implements WeaponLogic {
    fire(player: PlayerState, game: ShinobiSurvivalGame): void {
        const weaponLevel = player.weaponLevel;
        let damage = 10 * player.stats.damageMult;
        if (game.random() < player.stats.critChance) {
            damage *= 2;
        }

        if (player.ultActiveTime > 0) {
            // Tailed Beast Bomb during ult
            return;
        }

        const evolucion = weaponLevel >= 5;
        const projectileType = evolucion ? 'rasenshuriken' : 'shuriken';
        const projectileDamage = evolucion ? damage * 3 : damage;
        const piercing = evolucion ? 5 : player.stats.piercing;
        const speed = evolucion ? 100 : 200;
        const size = evolucion ? 60 : 20;

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

        game.spawnProjectile(player.id, player.pos, angle, speed, projectileDamage, projectileType, player.stats.knockback + 2, piercing, size);

        if (!evolucion) {
            if (weaponLevel >= 3) {
                const clonePos1 = new Vec2(player.pos.x + 30 * Math.cos(angle + Math.PI / 2), player.pos.y + 30 * Math.sin(angle + Math.PI / 2));
                game.spawnProjectile(player.id, clonePos1, angle, 50, 0, 'shadow_clone', 0, 99, 30);
                game.spawnProjectile(player.id, clonePos1, angle, speed, projectileDamage, projectileType, player.stats.knockback + 2, piercing, size);
            }
            if (weaponLevel >= 4) {
                const clonePos2 = new Vec2(player.pos.x + 30 * Math.cos(angle - Math.PI / 2), player.pos.y + 30 * Math.sin(angle - Math.PI / 2));
                game.spawnProjectile(player.id, clonePos2, angle, 50, 0, 'shadow_clone', 0, 99, 30);
                game.spawnProjectile(player.id, clonePos2, angle, speed, projectileDamage, projectileType, player.stats.knockback + 2, piercing, size);
            }
        }
    }
}
