/**
 * Unit tests for UpgradeManager
 */

import { UpgradeManager } from '../../managers/upgrade-manager';
import { createPlayer, createDeterministicRng, createFixedRng } from '../test-utils';

describe('UpgradeManager', () => {
    describe('generate', () => {
        it('should return exactly 3 upgrades', () => {
            const player = createPlayer(0);
            const rng = createDeterministicRng();

            const upgrades = UpgradeManager.generate(player, rng);

            expect(upgrades).toHaveLength(3);
        });

        it('should sometimes include weapon upgrade when not maxed', () => {
            const player = createPlayer(0, { weaponLevel: 1 });

            // Run multiple times to verify weapon upgrade appears in at least some iterations
            let foundWeaponUpgrade = false;
            for (let seed = 1; seed < 100; seed++) {
                const rng = createDeterministicRng(seed);
                const upgrades = UpgradeManager.generate(player, rng);
                if (upgrades.some(u => u.id === 'weapon_level')) {
                    foundWeaponUpgrade = true;
                    break;
                }
            }

            expect(foundWeaponUpgrade).toBe(true);
        });

        it('should not include weapon upgrade when maxed', () => {
            const player = createPlayer(0, { weaponLevel: 5, isEvolved: true });
            const rng = createDeterministicRng();

            const upgrades = UpgradeManager.generate(player, rng);

            const hasWeaponUpgrade = upgrades.some(u => u.id === 'weapon_level');
            expect(hasWeaponUpgrade).toBe(false);
        });

        it('should label weapon upgrade as Evolution at level 4', () => {
            const player = createPlayer(0, { weaponLevel: 4 });

            // Run multiple times to find when weapon upgrade appears
            let weaponUpgrade;
            for (let seed = 1; seed < 100; seed++) {
                const rng = createDeterministicRng(seed);
                const upgrades = UpgradeManager.generate(player, rng);
                weaponUpgrade = upgrades.find(u => u.id === 'weapon_level');
                if (weaponUpgrade) break;
            }

            expect(weaponUpgrade).toBeDefined();
            expect(weaponUpgrade?.name).toContain('Evolution');
        });

        it('should shuffle upgrades (different RNG gives different order)', () => {
            const player = createPlayer(0);
            const rng1 = createDeterministicRng(12345);
            const rng2 = createDeterministicRng(54321);

            const upgrades1 = UpgradeManager.generate(player, rng1);
            const upgrades2 = UpgradeManager.generate(player, rng2);

            // With different seeds, order should be different
            const order1 = upgrades1.map(u => u.id).join(',');
            const order2 = upgrades2.map(u => u.id).join(',');

            expect(order1).not.toBe(order2);
        });
    });

    describe('apply', () => {
        it('should increase weapon level', () => {
            const player = createPlayer(0, { weaponLevel: 1 });

            UpgradeManager.apply(player, {
                id: 'weapon_level',
                name: 'Weapon Upgrade',
                description: '',
                type: 'weapon'
            });

            expect(player.weaponLevel).toBe(2);
        });

        it('should cap weapon level at 5', () => {
            const player = createPlayer(0, { weaponLevel: 5 });

            UpgradeManager.apply(player, {
                id: 'weapon_level',
                name: 'Weapon Upgrade',
                description: '',
                type: 'weapon'
            });

            expect(player.weaponLevel).toBe(5);
        });

        it('should set isEvolved at weapon level 5', () => {
            const player = createPlayer(0, { weaponLevel: 4, isEvolved: false });

            UpgradeManager.apply(player, {
                id: 'weapon_level',
                name: 'Weapon Upgrade',
                description: '',
                type: 'weapon'
            });

            expect(player.isEvolved).toBe(true);
        });

        it('should increase damage multiplier by 20%', () => {
            const player = createPlayer(0);
            const originalMult = player.stats.damageMult;

            UpgradeManager.apply(player, {
                id: 'damage',
                name: 'Damage Up',
                description: '',
                type: 'stat'
            });

            expect(player.stats.damageMult).toBeCloseTo(originalMult * 1.2);
        });

        it('should reduce cooldown multiplier by 15%', () => {
            const player = createPlayer(0);
            const originalMult = player.stats.cooldownMult;

            UpgradeManager.apply(player, {
                id: 'cooldown',
                name: 'Cooldown Reduction',
                description: '',
                type: 'stat'
            });

            expect(player.stats.cooldownMult).toBeCloseTo(originalMult * 0.85);
        });

        it('should increase crit chance by 5%', () => {
            const player = createPlayer(0);
            const originalCrit = player.stats.critChance;

            UpgradeManager.apply(player, {
                id: 'crit',
                name: 'Crit Up',
                description: '',
                type: 'stat'
            });

            expect(player.stats.critChance).toBeCloseTo(originalCrit + 0.05);
        });

        it('should stack multiple upgrades', () => {
            const player = createPlayer(0);

            UpgradeManager.apply(player, { id: 'damage', name: '', description: '', type: 'stat' });
            UpgradeManager.apply(player, { id: 'damage', name: '', description: '', type: 'stat' });

            expect(player.stats.damageMult).toBeCloseTo(1.44); // 1.2 * 1.2
        });
    });

    describe('getAllUpgrades', () => {
        it('should return list of all available stat upgrades', () => {
            const upgrades = UpgradeManager.getAllUpgrades();

            expect(upgrades.length).toBeGreaterThanOrEqual(5);
            expect(upgrades.some(u => u.id === 'damage')).toBe(true);
            expect(upgrades.some(u => u.id === 'cooldown')).toBe(true);
        });
    });
});
