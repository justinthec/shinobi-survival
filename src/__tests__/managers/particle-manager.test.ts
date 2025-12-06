/**
 * Unit tests for ParticleManager
 */

import { ParticleManager } from '../../managers/particle-manager';
import { Vec2 } from 'netplayjs';
import { ParticleState } from '../../types';

describe('ParticleManager', () => {
    describe('spawn', () => {
        it('should create a new particle', () => {
            const particles: ParticleState[] = [];

            const nextId = ParticleManager.spawn(particles, 'test', new Vec2(100, 100), 1);

            expect(particles).toHaveLength(1);
            expect(particles[0].type).toBe('test');
            expect(nextId).toBe(2);
        });

        it('should apply options', () => {
            const particles: ParticleState[] = [];

            ParticleManager.spawn(particles, 'test', new Vec2(100, 100), 1, {
                vel: new Vec2(50, 0),
                life: 2.0,
                color: 'red',
                size: 20
            });

            expect(particles[0].vel.x).toBe(50);
            expect(particles[0].life).toBe(2.0);
            expect(particles[0].color).toBe('red');
            expect(particles[0].size).toBe(20);
        });
    });

    describe('spawnCrater', () => {
        it('should create a crater particle', () => {
            const particles: ParticleState[] = [];

            ParticleManager.spawnCrater(particles, new Vec2(100, 100), 1, 3.0);

            expect(particles[0].type).toBe('crater');
            expect(particles[0].life).toBe(3.0);
        });
    });

    describe('spawnLightningBolt', () => {
        it('should create a lightning bolt between two points', () => {
            const particles: ParticleState[] = [];

            ParticleManager.spawnLightningBolt(
                particles,
                new Vec2(0, 0),
                new Vec2(100, 0),
                1
            );

            expect(particles[0].type).toBe('lightning_bolt');
            expect(particles[0].size).toBeCloseTo(100); // Distance
            expect(particles[0].angle).toBeCloseTo(0); // Horizontal
        });

        it('should calculate correct angle for diagonal bolts', () => {
            const particles: ParticleState[] = [];

            ParticleManager.spawnLightningBolt(
                particles,
                new Vec2(0, 0),
                new Vec2(100, 100),
                1
            );

            expect(particles[0].angle).toBeCloseTo(Math.PI / 4); // 45 degrees
        });
    });

    describe('update', () => {
        it('should decrease life over time', () => {
            const particles: ParticleState[] = [{
                id: 1,
                type: 'test',
                pos: new Vec2(100, 100),
                vel: new Vec2(0, 0),
                life: 1.0,
                maxLife: 1.0,
                color: 'white',
                size: 10
            }];

            ParticleManager.update(particles, 0.5);

            expect(particles[0].life).toBe(0.5);
        });

        it('should update position based on velocity', () => {
            const particles: ParticleState[] = [{
                id: 1,
                type: 'test',
                pos: new Vec2(100, 100),
                vel: new Vec2(100, 50),
                life: 1.0,
                maxLife: 1.0,
                color: 'white',
                size: 10
            }];

            ParticleManager.update(particles, 0.1);

            expect(particles[0].pos.x).toBeCloseTo(110);
            expect(particles[0].pos.y).toBeCloseTo(105);
        });
    });

    describe('cleanup', () => {
        it('should remove expired particles', () => {
            const particles: ParticleState[] = [
                { id: 1, type: 'test', pos: new Vec2(0, 0), vel: new Vec2(0, 0), life: 0, maxLife: 1, color: 'white', size: 10 },
                { id: 2, type: 'test', pos: new Vec2(0, 0), vel: new Vec2(0, 0), life: 0.5, maxLife: 1, color: 'white', size: 10 }
            ];

            ParticleManager.cleanup(particles);

            expect(particles).toHaveLength(1);
            expect(particles[0].id).toBe(2);
        });
    });
});
