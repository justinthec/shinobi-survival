/**
 * Unit tests for HazardManager
 */

import { HazardManager } from '../../managers/hazard-manager';
import { Vec2 } from 'netplayjs';
import { createPlayer, createEnemy, createHazard } from '../test-utils';
import { SpatialHash } from '../../spatial-hash';
import { HazardZoneState, EnemyState, PlayerState } from '../../types';

describe('HazardManager', () => {
    describe('spawn', () => {
        it('should create a new hazard', () => {
            const hazards: HazardZoneState[] = [];

            const nextId = HazardManager.spawn(
                hazards, 1, new Vec2(100, 100), 50, 5.0, 10, 'fire', 0
            );

            expect(hazards).toHaveLength(1);
            expect(hazards[0].type).toBe('fire');
            expect(hazards[0].radius).toBe(50);
            expect(nextId).toBe(2);
        });
    });

    describe('cleanup', () => {
        it('should remove expired hazards', () => {
            const hazards = [
                createHazard(1, { duration: 0 }),
                createHazard(2, { duration: 3.0 })
            ];

            HazardManager.cleanup(hazards);

            expect(hazards).toHaveLength(1);
            expect(hazards[0].id).toBe(2);
        });
    });

    describe('update', () => {
        it('should decrease duration over time', () => {
            const hazards = [createHazard(1, { duration: 5.0 })];
            const enemies: EnemyState[] = [];
            const players = { 0: createPlayer(0) };
            const spatialHash = new SpatialHash(200);
            const mockDamage = jest.fn();

            HazardManager.update(hazards, enemies, players, spatialHash, 0.5, mockDamage);

            expect(hazards[0].duration).toBe(4.5);
        });

        it('should apply damage on tick interval', () => {
            const hazard = createHazard(1, {
                pos: new Vec2(100, 100),
                radius: 50,
                type: 'fire',
                damage: 20,
                tickTimer: 0.2 // Already past tick interval
            });
            const enemy = createEnemy(1, { pos: new Vec2(100, 100) });
            const player = createPlayer(0);
            const hazards = [hazard];
            const enemies = [enemy];
            const players = { 0: player };

            const spatialHash = new SpatialHash(200);
            spatialHash.add(hazard);
            spatialHash.add(enemy);

            const mockDamage = jest.fn();

            HazardManager.update(hazards, enemies, players, spatialHash, 0.1, mockDamage);

            expect(mockDamage).toHaveBeenCalled();
        });

        it('should apply slow for quicksand hazards', () => {
            const hazard = createHazard(1, {
                pos: new Vec2(100, 100),
                radius: 50,
                type: 'quicksand',
                damage: 10,
                tickTimer: 0.2
            });
            const enemy = createEnemy(1, { pos: new Vec2(100, 100), speedMult: 1.0 });
            const player = createPlayer(0);

            const spatialHash = new SpatialHash(200);
            spatialHash.add(hazard);
            spatialHash.add(enemy);

            const mockDamage = jest.fn();

            HazardManager.update([hazard], [enemy], { 0: player }, spatialHash, 0.1, mockDamage);

            expect(enemy.speedMult).toBe(0.3);
        });
    });
});
