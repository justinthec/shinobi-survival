/**
 * Unit tests for EnemyManager
 */

import { EnemyManager } from '../../managers/enemy-manager';
import { Vec2 } from 'netplayjs';
import { createPlayer, createEnemy, createDeterministicRng, createFixedRng } from '../test-utils';

describe('EnemyManager', () => {
    describe('getEnemyType', () => {
        it('should spawn mostly zetsu early game', () => {
            const rng = createFixedRng(0.5);
            expect(EnemyManager.getEnemyType(30, rng)).toBe('zetsu');
        });

        it('should spawn sound ninja at low roll early game', () => {
            const rng = createFixedRng(0.95);
            expect(EnemyManager.getEnemyType(30, rng)).toBe('sound');
        });

        it('should spawn snake ninja late game at high roll', () => {
            const rng = createFixedRng(0.95);
            expect(EnemyManager.getEnemyType(150, rng)).toBe('snake');
        });
    });

    describe('getSpawnPosition', () => {
        it('should spawn on map edges', () => {
            const rng = createDeterministicRng(12345);
            const pos = EnemyManager.getSpawnPosition(1000, 1000, rng);

            // Should be near an edge (negative or beyond map bounds)
            const onEdge = pos.x <= 0 || pos.x >= 1000 || pos.y <= 0 || pos.y >= 1000;
            expect(onEdge).toBe(true);
        });
    });

    describe('getEnemyStats', () => {
        it('should scale HP with time for zetsu', () => {
            const stats1 = EnemyManager.getEnemyStats('zetsu', 0);
            const stats2 = EnemyManager.getEnemyStats('zetsu', 60);

            expect(stats2.hp).toBeGreaterThan(stats1.hp);
        });

        it('should give snake ninja more HP than zetsu', () => {
            const zetsuStats = EnemyManager.getEnemyStats('zetsu', 60);
            const snakeStats = EnemyManager.getEnemyStats('snake', 60);

            expect(snakeStats.hp).toBeGreaterThan(zetsuStats.hp);
        });

        it('should give sound ninja higher speed', () => {
            const zetsuStats = EnemyManager.getEnemyStats('zetsu', 60);
            const soundStats = EnemyManager.getEnemyStats('sound', 60);

            expect(soundStats.speed).toBeGreaterThan(zetsuStats.speed);
        });
    });

    describe('spawn', () => {
        it('should add enemy to array', () => {
            const enemies: any[] = [];
            const rng = createDeterministicRng();

            EnemyManager.spawn(enemies, 1, {
                gameTime: 60,
                mapWidth: 1000,
                mapHeight: 1000
            }, rng);

            expect(enemies).toHaveLength(1);
            expect(enemies[0].id).toBe(1);
        });

        it('should increment nextId', () => {
            const enemies: any[] = [];
            const rng = createDeterministicRng();

            const newId = EnemyManager.spawn(enemies, 5, {
                gameTime: 60,
                mapWidth: 1000,
                mapHeight: 1000
            }, rng);

            expect(newId).toBe(6);
        });
    });

    describe('findClosestPlayer', () => {
        it('should find nearest alive player', () => {
            const enemy = createEnemy(1, { pos: new Vec2(100, 100) });
            const players = {
                0: createPlayer(0, { pos: new Vec2(200, 100) }),
                1: createPlayer(1, { pos: new Vec2(110, 100) })
            };

            const result = EnemyManager.findClosestPlayer(enemy, players);

            expect(result.player?.id).toBe(1);
            expect(result.distance).toBeCloseTo(10);
        });

        it('should skip dead players', () => {
            const enemy = createEnemy(1, { pos: new Vec2(100, 100) });
            const players = {
                0: createPlayer(0, { pos: new Vec2(200, 100) }),
                1: createPlayer(1, { pos: new Vec2(110, 100), dead: true })
            };

            const result = EnemyManager.findClosestPlayer(enemy, players);

            expect(result.player?.id).toBe(0);
        });
    });

    describe('updateMovement', () => {
        it('should move enemy toward target', () => {
            const enemy = createEnemy(1, { pos: new Vec2(0, 0), speedMult: 1.0 });
            const target = createPlayer(0, { pos: new Vec2(100, 0) });

            EnemyManager.updateMovement(enemy, target, 0.1);

            expect(enemy.pos.x).toBeGreaterThan(0);
        });

        it('should apply knockback', () => {
            const enemy = createEnemy(1, {
                pos: new Vec2(0, 0),
                push: new Vec2(100, 0),
                speedMult: 1.0
            });
            const target = createPlayer(0, { pos: new Vec2(100, 0) });

            EnemyManager.updateMovement(enemy, target, 0.1);

            // Should have moved significantly due to knockback
            expect(enemy.pos.x).toBeGreaterThan(5);
        });

        it('should not move when rooted', () => {
            const enemy = createEnemy(1, {
                pos: new Vec2(0, 0),
                rooted: true,
                speedMult: 1.0
            });
            const target = createPlayer(0, { pos: new Vec2(100, 0) });

            EnemyManager.updateMovement(enemy, target, 0.1);

            expect(enemy.speedMult).toBe(0);
        });
    });

    describe('processBleed', () => {
        it('should return 0 if no bleed stacks', () => {
            const enemy = createEnemy(1, { bleedStacks: 0 });

            const damage = EnemyManager.processBleed(enemy, 0.1);

            expect(damage).toBe(0);
        });

        it('should deal damage when timer expires', () => {
            const enemy = createEnemy(1, {
                bleedStacks: 2,
                dotTimer: 0.05,
                hp: 100
            });

            const damage = EnemyManager.processBleed(enemy, 0.1);

            expect(damage).toBe(10); // 2 stacks * 5 damage
            expect(enemy.hp).toBe(90);
            expect(enemy.dotTimer).toBe(1.0);
        });
    });

    describe('constrainToMap', () => {
        it('should keep enemy inside map bounds', () => {
            const enemy = createEnemy(1, { pos: new Vec2(-50, 1500) });

            EnemyManager.constrainToMap(enemy, 1000, 1000, 20);

            expect(enemy.pos.x).toBe(20);
            expect(enemy.pos.y).toBe(980);
        });
    });

    describe('cleanup', () => {
        it('should remove dead enemies', () => {
            const enemies = [
                createEnemy(1, { dead: false }),
                createEnemy(2, { dead: true }),
                createEnemy(3, { dead: false })
            ];

            EnemyManager.cleanup(enemies);

            expect(enemies).toHaveLength(2);
            expect(enemies.map(e => e.id)).toEqual([1, 3]);
        });
    });

    describe('checkContactDamage', () => {
        it('should return true when in contact range', () => {
            const enemy = createEnemy(1, { pos: new Vec2(100, 100) });
            const player = createPlayer(0, { pos: new Vec2(120, 100) });

            expect(EnemyManager.checkContactDamage(enemy, player)).toBe(true);
        });

        it('should return false when out of range', () => {
            const enemy = createEnemy(1, { pos: new Vec2(100, 100) });
            const player = createPlayer(0, { pos: new Vec2(200, 100) });

            expect(EnemyManager.checkContactDamage(enemy, player)).toBe(false);
        });
    });
});
