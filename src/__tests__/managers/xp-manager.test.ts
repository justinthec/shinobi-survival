/**
 * Unit tests for XpManager
 */

import { XpManager } from '../../managers/xp-manager';
import { Vec2 } from 'netplayjs';
import { createPlayer, createXpOrb } from '../test-utils';
import { XpOrbState } from '../../types';

describe('XpManager', () => {
    describe('spawnOrb', () => {
        it('should create a new XP orb', () => {
            const orbs: XpOrbState[] = [];

            const nextId = XpManager.spawnOrb(orbs, new Vec2(100, 100), 10, 1);

            expect(orbs).toHaveLength(1);
            expect(orbs[0].val).toBe(10);
            expect(orbs[0].pos.x).toBe(100);
            expect(nextId).toBe(2);
        });
    });

    describe('update', () => {
        it('should move orbs towards nearby players', () => {
            // Position orb at edge of magnet range so it moves but doesn't get collected
            const orbs = [createXpOrb(1, { pos: new Vec2(45, 0) })];
            const players = { 0: createPlayer(0, { pos: new Vec2(0, 0) }) };

            XpManager.update(orbs, players, 0.05); // Small dt so we don't collect

            // Orb should have moved closer to player
            expect(orbs[0].pos.x).toBeLessThan(45);
        });

        it('should not move orbs that are too far', () => {
            const orbs = [createXpOrb(1, { pos: new Vec2(200, 0) })];
            const players = { 0: createPlayer(0, { pos: new Vec2(0, 0) }) };

            const originalX = orbs[0].pos.x;
            XpManager.update(orbs, players, 0.1);

            expect(orbs[0].pos.x).toBe(originalX);
        });

        it('should collect orbs when close enough', () => {
            const orbs = [createXpOrb(1, { pos: new Vec2(15, 0), val: 25 })];
            const players = { 0: createPlayer(0, { pos: new Vec2(0, 0) }) };

            const result = XpManager.update(orbs, players, 0.1);

            expect(result.collectedXP).toBe(25);
            expect(result.orbsCollected).toBe(1);
            expect(orbs).toHaveLength(0);
        });

        it('should not collect for dead players', () => {
            const orbs = [createXpOrb(1, { pos: new Vec2(15, 0), val: 25 })];
            const players = { 0: createPlayer(0, { pos: new Vec2(0, 0), dead: true }) };

            const result = XpManager.update(orbs, players, 0.1);

            expect(result.collectedXP).toBe(0);
            expect(orbs).toHaveLength(1);
        });

        it('should remove dead orbs', () => {
            const orbs = [createXpOrb(1, { dead: true })];
            const players = { 0: createPlayer(0) };

            XpManager.update(orbs, players, 0.1);

            expect(orbs).toHaveLength(0);
        });
    });

    describe('mergeOldestOrb', () => {
        it('should not merge when under capacity', () => {
            const orbs = [
                createXpOrb(1, { val: 10 }),
                createXpOrb(2, { val: 20 })
            ];

            XpManager.mergeOldestOrb(orbs, 500);

            expect(orbs).toHaveLength(2);
        });

        it('should merge oldest orb when at capacity', () => {
            const orbs = [
                createXpOrb(1, { pos: new Vec2(0, 0), val: 10 }),
                createXpOrb(2, { pos: new Vec2(10, 0), val: 20 })
            ];

            XpManager.mergeOldestOrb(orbs, 1); // Max 1 orb

            expect(orbs).toHaveLength(1);
            expect(orbs[0].id).toBe(2);
            expect(orbs[0].val).toBe(30); // 20 + 10
        });

        it('should merge into nearest orb', () => {
            const orbs = [
                createXpOrb(1, { pos: new Vec2(0, 0), val: 10 }),
                createXpOrb(2, { pos: new Vec2(100, 0), val: 20 }),
                createXpOrb(3, { pos: new Vec2(5, 0), val: 15 }) // Nearest to orb 1
            ];

            XpManager.mergeOldestOrb(orbs, 2);

            expect(orbs).toHaveLength(2);
            expect(orbs.find(o => o.id === 3)?.val).toBe(25); // 15 + 10
        });
    });

    describe('checkLevelUp', () => {
        it('should return true when XP meets threshold', () => {
            expect(XpManager.checkLevelUp(300, 300)).toBe(true);
        });

        it('should return true when XP exceeds threshold', () => {
            expect(XpManager.checkLevelUp(350, 300)).toBe(true);
        });

        it('should return false when XP is below threshold', () => {
            expect(XpManager.checkLevelUp(299, 300)).toBe(false);
        });
    });

    describe('getXpForNextLevel', () => {
        it('should return base XP for level 1', () => {
            expect(XpManager.getXpForNextLevel(1, 300)).toBe(300);
        });

        it('should scale XP by 1.2x per level', () => {
            expect(XpManager.getXpForNextLevel(2, 300)).toBe(360);
            expect(XpManager.getXpForNextLevel(3, 300)).toBe(432);
        });
    });
});
