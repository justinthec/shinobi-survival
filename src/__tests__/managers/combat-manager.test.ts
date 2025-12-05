/**
 * Unit tests for CombatManager
 */

import { CombatManager } from '../../managers/combat-manager';
import { Vec2 } from 'netplayjs';
import { createPlayer, createEnemy, createFixedRng, createDeterministicRng } from '../test-utils';

describe('CombatManager', () => {
    describe('damageEnemy', () => {
        it('should apply base damage to enemy', () => {
            const enemy = createEnemy(1, { hp: 100, maxHp: 100 });
            const player = createPlayer(0);
            const rng = createFixedRng(0.9); // No crit (need < 0.05)

            const result = CombatManager.damageEnemy(enemy, 20, player, rng);

            expect(result.finalDamage).toBe(20);
            expect(result.isCrit).toBe(false);
            expect(enemy.hp).toBe(80);
        });

        it('should apply crit damage when RNG rolls under crit chance', () => {
            const enemy = createEnemy(1, { hp: 100, maxHp: 100 });
            const player = createPlayer(0, { stats: { ...createPlayer(0).stats, critChance: 0.2 } });
            const rng = createFixedRng(0.1); // Crit (need < 0.2)

            const result = CombatManager.damageEnemy(enemy, 20, player, rng);

            expect(result.finalDamage).toBe(40); // 2x crit
            expect(result.isCrit).toBe(true);
            expect(enemy.hp).toBe(60);
        });

        it('should not damage dead enemies', () => {
            const enemy = createEnemy(1, { hp: 0, dead: true });
            const player = createPlayer(0);
            const rng = createFixedRng(0.9);

            const result = CombatManager.damageEnemy(enemy, 20, player, rng);

            expect(result.finalDamage).toBe(0);
            expect(result.blocked).toBe(true);
        });

        it('should mark enemy as killed when hp drops to 0', () => {
            const enemy = createEnemy(1, { hp: 15, maxHp: 50 });
            const player = createPlayer(0);
            const rng = createFixedRng(0.9);

            const result = CombatManager.damageEnemy(enemy, 20, player, rng);

            expect(result.killed).toBe(true);
            expect(enemy.dead).toBe(true);
        });

        it('should apply Sasuke dodge buff crit bonus', () => {
            const enemy = createEnemy(1, { hp: 100, maxHp: 100 });
            const player = createPlayer(0, {
                character: 'sasuke',
                charState: { dodgeBuffTimer: 1.0, sharinganCooldown: 0 }
            });
            const rng = createFixedRng(0.4); // Would not crit with 0.05, but will with 0.55

            const result = CombatManager.damageEnemy(enemy, 20, player, rng);

            expect(result.isCrit).toBe(true);
            expect(result.finalDamage).toBe(40);
        });

        it('should apply Sakura 5x damage when meter is full', () => {
            const enemy = createEnemy(1, { hp: 500, maxHp: 500 });
            const player = createPlayer(0, {
                character: 'sakura',
                charState: { meter: 100 }
            });
            const rng = createFixedRng(0.9);

            const result = CombatManager.damageEnemy(enemy, 20, player, rng);

            expect(result.finalDamage).toBe(100); // 20 * 5
            expect((player.charState as any).meter).toBe(0); // Consumed
        });

        it('should apply both Sakura 5x and crit for 10x damage', () => {
            const enemy = createEnemy(1, { hp: 500, maxHp: 500 });
            const player = createPlayer(0, {
                character: 'sakura',
                charState: { meter: 100 },
                stats: { ...createPlayer(0).stats, critChance: 0.5 }
            });
            const rng = createFixedRng(0.3); // Crit

            const result = CombatManager.damageEnemy(enemy, 20, player, rng);

            expect(result.finalDamage).toBe(200); // 20 * 2 (crit) * 5 (sakura)
        });
    });

    describe('damagePlayer', () => {
        it('should apply damage to player', () => {
            const player = createPlayer(0, { hp: 100 });
            const rng = createFixedRng(0.9);

            const result = CombatManager.damagePlayer(player, 20, rng);

            expect(result.finalDamage).toBe(20);
            expect(player.hp).toBe(80);
        });

        it('should not damage invincible players', () => {
            const player = createPlayer(0, { hp: 100, invincible: true });
            const rng = createFixedRng(0.9);

            const result = CombatManager.damagePlayer(player, 20, rng);

            expect(result.blocked).toBe(true);
            expect(player.hp).toBe(100);
        });

        it('should trigger Sasuke dodge when RNG rolls under 15%', () => {
            const player = createPlayer(0, {
                hp: 100,
                character: 'sasuke',
                charState: { dodgeBuffTimer: 0, sharinganCooldown: 0 }
            });
            const rng = createFixedRng(0.1); // Dodge (< 0.15)

            const result = CombatManager.damagePlayer(player, 20, rng);

            expect(result.blocked).toBe(true);
            expect(player.hp).toBe(100);
            expect((player.charState as any).sharinganCooldown).toBe(5.0);
            expect((player.charState as any).dodgeBuffTimer).toBe(2.0);
        });

        it('should not trigger Sasuke dodge when on cooldown', () => {
            const player = createPlayer(0, {
                hp: 100,
                character: 'sasuke',
                charState: { dodgeBuffTimer: 0, sharinganCooldown: 3.0 }
            });
            const rng = createFixedRng(0.1);

            const result = CombatManager.damagePlayer(player, 20, rng);

            expect(result.blocked).toBe(false);
            expect(player.hp).toBe(80);
        });

        it('should absorb damage with Gaara shield', () => {
            const player = createPlayer(0, {
                hp: 100,
                character: 'gaara',
                charState: { shieldHp: 30, shieldRegenTimer: 5.0 }
            });
            const rng = createFixedRng(0.9);

            const result = CombatManager.damagePlayer(player, 20, rng);

            expect(result.blocked).toBe(true);
            expect(player.hp).toBe(100);
            expect((player.charState as any).shieldHp).toBe(10);
            expect((player.charState as any).shieldRegenTimer).toBe(0);
        });

        it('should let damage through when Gaara shield is insufficient', () => {
            const player = createPlayer(0, {
                hp: 100,
                character: 'gaara',
                charState: { shieldHp: 10, shieldRegenTimer: 0 }
            });
            const rng = createFixedRng(0.9);

            const result = CombatManager.damagePlayer(player, 25, rng);

            expect(result.blocked).toBe(false);
            expect(player.hp).toBe(85); // 100 - (25 - 10)
            expect((player.charState as any).shieldHp).toBe(0);
        });

        it('should charge Sakura meter when taking damage', () => {
            const player = createPlayer(0, {
                hp: 100,
                character: 'sakura',
                charState: { meter: 50 }
            });
            const rng = createFixedRng(0.9);

            CombatManager.damagePlayer(player, 20, rng);

            expect((player.charState as any).meter).toBe(60);
        });

        it('should cap Sakura meter at 100', () => {
            const player = createPlayer(0, {
                hp: 100,
                character: 'sakura',
                charState: { meter: 95 }
            });
            const rng = createFixedRng(0.9);

            CombatManager.damagePlayer(player, 20, rng);

            expect((player.charState as any).meter).toBe(100);
        });
    });

    describe('chainLightning', () => {
        it('should bounce to nearest enemies', () => {
            const enemies = [
                createEnemy(1, { pos: new Vec2(100, 0), hp: 100 }),
                createEnemy(2, { pos: new Vec2(200, 0), hp: 100 }),
                createEnemy(3, { pos: new Vec2(300, 0), hp: 100 })
            ];
            const player = createPlayer(0);
            const rng = createFixedRng(0.9);

            const bounces = CombatManager.chainLightning(
                enemies, player, new Vec2(0, 0), 50, 3, 500, [], rng
            );

            expect(bounces).toHaveLength(3);
            expect(bounces[0].targetId).toBe(1);
            expect(bounces[1].targetId).toBe(2);
            expect(bounces[2].targetId).toBe(3);
        });

        it('should apply damage decay on each bounce', () => {
            const enemies = [
                createEnemy(1, { pos: new Vec2(100, 0), hp: 100 }),
                createEnemy(2, { pos: new Vec2(200, 0), hp: 100 }),
                createEnemy(3, { pos: new Vec2(300, 0), hp: 100 })
            ];
            const player = createPlayer(0);
            const rng = createFixedRng(0.9);

            const bounces = CombatManager.chainLightning(
                enemies, player, new Vec2(0, 0), 50, 3, 500, [], rng
            );

            expect(bounces[0].damage).toBe(50);
            expect(bounces[1].damage).toBe(40); // 50 * 0.8
            expect(bounces[2].damage).toBe(32); // 40 * 0.8
        });

        it('should not hit excluded enemies', () => {
            const enemies = [
                createEnemy(1, { pos: new Vec2(100, 0), hp: 100 }),
                createEnemy(2, { pos: new Vec2(200, 0), hp: 100 })
            ];
            const player = createPlayer(0);
            const rng = createFixedRng(0.9);

            const bounces = CombatManager.chainLightning(
                enemies, player, new Vec2(0, 0), 50, 3, 500, [1], rng
            );

            expect(bounces).toHaveLength(1);
            expect(bounces[0].targetId).toBe(2);
        });

        it('should stop when no valid targets in range', () => {
            const enemies = [
                createEnemy(1, { pos: new Vec2(100, 0), hp: 100 })
            ];
            const player = createPlayer(0);
            const rng = createFixedRng(0.9);

            const bounces = CombatManager.chainLightning(
                enemies, player, new Vec2(0, 0), 50, 3, 500, [], rng
            );

            expect(bounces).toHaveLength(1);
        });
    });

    describe('applyKnockback', () => {
        it('should push enemy away from source', () => {
            const enemy = createEnemy(1, { pos: new Vec2(100, 0) });

            CombatManager.applyKnockback(enemy, new Vec2(0, 0), 100);

            expect(enemy.push.x).toBeCloseTo(100);
            expect(enemy.push.y).toBeCloseTo(0);
        });

        it('should calculate correct angle for diagonal knockback', () => {
            const enemy = createEnemy(1, { pos: new Vec2(100, 100) });

            CombatManager.applyKnockback(enemy, new Vec2(0, 0), 100);

            // 45 degree angle, so x and y should be equal
            expect(enemy.push.x).toBeCloseTo(enemy.push.y);
            expect(Math.sqrt(enemy.push.x ** 2 + enemy.push.y ** 2)).toBeCloseTo(100);
        });
    });
});
