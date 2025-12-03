import { PlayerState } from "../types";
import { ShinobiSurvivalGame } from "../multiplayer-game";
import { WeaponLogic } from "./weapon-logic";
import { Vec2 } from "netplayjs";

export class SakuraWeapon implements WeaponLogic {
    fire(player: PlayerState, game: ShinobiSurvivalGame): void {
        const weaponLevel = player.weaponLevel;
        const damage = 25 * player.stats.damageMult;
        const speed = 400;
        const pierce = 3 + player.stats.piercing;
        const knockback = 5 + player.stats.knockback;
        const size = 30;

        const angle = player.aimAngle;

        if (weaponLevel >= 1) {
            game.spawnProjectile(player.id, player.pos, angle, speed, damage, 'chakra_punch', knockback, pierce, size);
        }
        if (weaponLevel >= 2) {
            // Increased area
            game.spawnProjectile(player.id, player.pos, angle, speed, damage, 'chakra_punch', knockback, pierce, size * 1.5);
        }
        if (weaponLevel >= 3) {
            // Second punch
            const perpendicularAngle = angle + Math.PI / 2;
            const spawnPos = new Vec2(
                player.pos.x + Math.cos(perpendicularAngle) * 30,
                player.pos.y + Math.sin(perpendicularAngle) * 30,
            );
            game.spawnProjectile(player.id, spawnPos, angle, speed, damage, 'chakra_punch', knockback, pierce, size);
        }
        if (weaponLevel >= 4) {
             // Third punch
             const perpendicularAngle = angle - Math.PI / 2;
             const spawnPos = new Vec2(
                 player.pos.x + Math.cos(perpendicularAngle) * 30,
                 player.pos.y + Math.sin(perpendicularAngle) * 30,
             );
             game.spawnProjectile(player.id, spawnPos, angle, speed, damage, 'chakra_punch', knockback, pierce, size);
        }
        if (weaponLevel >= 5) {
            // Evolved: 100 Healings Jutsu
            player.hp = Math.min(player.hp + 50, player.maxHp);
            game.spawnFloatingText(player.pos, "+50 HP", "green");
        }
    }
}
