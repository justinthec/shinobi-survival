/**
 * UpgradeManager - Stateless helper class for upgrade system.
 * 
 * Handles upgrade generation, selection, and application.
 */

import { Vec2 } from 'netplayjs';
import { PlayerState, UpgradeOption } from '../types';

/**
 * All available upgrades in the game
 */
const ALL_UPGRADES: UpgradeOption[] = [
    {
        id: 'damage',
        name: 'Increase Damage (+20%)',
        description: 'Increase all damage dealt',
        type: 'stat'
    },
    {
        id: 'cooldown',
        name: 'Reduce Cooldown (-15%)',
        description: 'Reduce all skill cooldowns',
        type: 'stat'
    },
    {
        id: 'crit',
        name: 'Critical Strike (+5%)',
        description: 'Increase critical hit chance',
        type: 'stat'
    },
    {
        id: 'area',
        name: 'Area of Effect (+15%)',
        description: 'Increase area of all abilities',
        type: 'stat'
    },
    {
        id: 'knockback',
        name: 'Knockback (+20%)',
        description: 'Push enemies back further',
        type: 'stat'
    }
];

export class UpgradeManager {
    /**
     * Generate upgrade options for a player
     */
    static generate(player: PlayerState, random: () => number): UpgradeOption[] {
        const upgrades: UpgradeOption[] = [];

        // Always offer weapon level up if not maxed
        if (player.weaponLevel < 5) {
            const levelText = player.weaponLevel === 4 ? 'Evolution' : `Level ${player.weaponLevel + 1}`;
            upgrades.push({
                id: 'weapon_level',
                name: `Weapon Upgrade (${levelText})`,
                description: 'Upgrade your main weapon to the next level',
                type: 'weapon'
            });
        }

        // Add stat upgrades
        for (const upgrade of ALL_UPGRADES) {
            upgrades.push({ ...upgrade });
        }

        // Shuffle using Fisher-Yates
        for (let i = upgrades.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [upgrades[i], upgrades[j]] = [upgrades[j], upgrades[i]];
        }

        return upgrades.slice(0, 3);
    }

    /**
     * Apply an upgrade to a player
     */
    static apply(player: PlayerState, upgrade: UpgradeOption): void {
        switch (upgrade.id) {
            case 'weapon_level':
                player.weaponLevel = Math.min(player.weaponLevel + 1, 5);
                if (player.weaponLevel >= 5) {
                    player.isEvolved = true;
                }
                break;
            case 'damage':
                player.stats.damageMult *= 1.2;
                break;
            case 'cooldown':
                player.stats.cooldownMult *= 0.85;
                break;
            case 'crit':
                player.stats.critChance += 0.05;
                break;
            case 'area':
                player.stats.areaMult *= 1.15;
                break;
            case 'knockback':
                player.stats.knockback *= 1.2;
                break;
        }
    }

    /**
     * Get all available upgrades (for testing/UI)
     */
    static getAllUpgrades(): UpgradeOption[] {
        return [...ALL_UPGRADES];
    }
}
