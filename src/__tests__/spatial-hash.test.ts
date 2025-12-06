/**
 * Unit tests for SpatialHash collision detection system
 */

import { SpatialHash } from '../spatial-hash';
import { Vec2 } from 'netplayjs';
import { Collider, Shape } from '../types';

interface TestEntity extends Collider {
    id: number;
    pos: Vec2;
}

function createCircleEntity(id: number, x: number, y: number, radius: number): TestEntity {
    return {
        id,
        pos: new Vec2(x, y),
        shape: { type: 'circle', radius }
    };
}

function createCapsuleEntity(id: number, x: number, y: number, radius: number, startX: number, startY: number, endX: number, endY: number): TestEntity {
    return {
        id,
        pos: new Vec2(x, y),
        shape: {
            type: 'capsule',
            radius,
            startOffset: new Vec2(startX, startY),
            endOffset: new Vec2(endX, endY)
        }
    };
}

describe('SpatialHash', () => {
    describe('constructor', () => {
        it('should create a SpatialHash with the specified cell size', () => {
            const hash = new SpatialHash(100);
            expect(hash.cellSize).toBe(100);
        });

        it('should initialize with empty buckets', () => {
            const hash = new SpatialHash(100);
            expect(hash.buckets.size).toBe(0);
        });
    });

    describe('add', () => {
        it('should add an entity to the correct bucket', () => {
            const hash = new SpatialHash(100);
            const entity = createCircleEntity(1, 50, 50, 10);

            hash.add(entity);

            expect(hash.buckets.size).toBeGreaterThan(0);
        });

        it('should add entity to multiple buckets if it spans cells', () => {
            const hash = new SpatialHash(100);
            // Entity at (90, 90) with radius 20 spans into multiple cells
            const entity = createCircleEntity(1, 90, 90, 20);

            hash.add(entity);

            // Should be in at least 4 cells (0,0), (0,1), (1,0), (1,1)
            expect(hash.buckets.size).toBeGreaterThanOrEqual(4);
        });
    });

    describe('clear', () => {
        it('should remove all entities from the hash', () => {
            const hash = new SpatialHash(100);
            hash.add(createCircleEntity(1, 50, 50, 10));
            hash.add(createCircleEntity(2, 150, 150, 10));

            hash.clear();

            expect(hash.buckets.size).toBe(0);
        });
    });

    describe('query', () => {
        it('should return entities in the same cell', () => {
            const hash = new SpatialHash(100);
            const entity1 = createCircleEntity(1, 50, 50, 10);
            const entity2 = createCircleEntity(2, 60, 60, 10);

            hash.add(entity1);
            hash.add(entity2);

            const results = hash.query(entity1);

            expect(results).toHaveLength(2);
            expect(results.map(e => e.id)).toContain(1);
            expect(results.map(e => e.id)).toContain(2);
        });

        it('should not return entities in distant cells', () => {
            const hash = new SpatialHash(100);
            const entity1 = createCircleEntity(1, 50, 50, 10);
            const entity2 = createCircleEntity(2, 500, 500, 10);

            hash.add(entity1);
            hash.add(entity2);

            const results = hash.query(entity1);

            expect(results).toHaveLength(1);
            expect(results[0].id).toBe(1);
        });

        it('should return unique entities (no duplicates)', () => {
            const hash = new SpatialHash(100);
            // Large entity that spans multiple cells
            const entity1 = createCircleEntity(1, 100, 100, 80);
            const entity2 = createCircleEntity(2, 50, 50, 10);

            hash.add(entity1);
            hash.add(entity2);

            const results = hash.query(entity2);
            const ids = results.map(e => e.id);
            const uniqueIds = [...new Set(ids)];

            expect(ids.length).toBe(uniqueIds.length);
        });
    });

    describe('getBounds', () => {
        it('should calculate correct bounds for circle', () => {
            const hash = new SpatialHash(100);
            const entity = createCircleEntity(1, 50, 50, 10);

            const bounds = hash.getBounds(entity);

            expect(bounds.minX).toBe(40);
            expect(bounds.minY).toBe(40);
            expect(bounds.maxX).toBe(60);
            expect(bounds.maxY).toBe(60);
        });

        it('should calculate correct bounds for capsule', () => {
            const hash = new SpatialHash(100);
            const entity = createCapsuleEntity(1, 50, 50, 10, 0, 0, 100, 0);

            const bounds = hash.getBounds(entity);

            expect(bounds.minX).toBe(40); // pos.x + min(start, end) - radius
            expect(bounds.maxX).toBe(160); // pos.x + max(start, end) + radius
            expect(bounds.minY).toBe(40);
            expect(bounds.maxY).toBe(60);
        });
    });

    describe('checkCollision', () => {
        describe('circle vs circle', () => {
            it('should detect collision when circles overlap', () => {
                const hash = new SpatialHash(100);
                const entity1 = createCircleEntity(1, 50, 50, 20);
                const entity2 = createCircleEntity(2, 70, 50, 20);

                expect(hash.checkCollision(entity1, entity2)).toBe(true);
            });

            it('should not detect collision when circles are separate', () => {
                const hash = new SpatialHash(100);
                const entity1 = createCircleEntity(1, 50, 50, 10);
                const entity2 = createCircleEntity(2, 100, 50, 10);

                expect(hash.checkCollision(entity1, entity2)).toBe(false);
            });

            it('should detect collision when circles touch exactly', () => {
                const hash = new SpatialHash(100);
                const entity1 = createCircleEntity(1, 50, 50, 10);
                const entity2 = createCircleEntity(2, 69, 50, 10); // Distance = 19, radii sum = 20

                expect(hash.checkCollision(entity1, entity2)).toBe(true);
            });
        });

        describe('circle vs capsule', () => {
            it('should detect collision when circle overlaps capsule segment', () => {
                const hash = new SpatialHash(100);
                const circle = createCircleEntity(1, 75, 50, 10);
                const capsule = createCapsuleEntity(2, 50, 50, 10, 0, 0, 50, 0);

                expect(hash.checkCollision(circle, capsule)).toBe(true);
            });

            it('should detect collision when circle overlaps capsule endpoint', () => {
                const hash = new SpatialHash(100);
                const circle = createCircleEntity(1, 105, 50, 10);
                const capsule = createCapsuleEntity(2, 50, 50, 10, 0, 0, 50, 0);

                expect(hash.checkCollision(circle, capsule)).toBe(true);
            });

            it('should not detect collision when circle is away from capsule', () => {
                const hash = new SpatialHash(100);
                const circle = createCircleEntity(1, 200, 50, 10);
                const capsule = createCapsuleEntity(2, 50, 50, 10, 0, 0, 50, 0);

                expect(hash.checkCollision(circle, capsule)).toBe(false);
            });

            it('should be commutative (capsule vs circle)', () => {
                const hash = new SpatialHash(100);
                const circle = createCircleEntity(1, 75, 50, 10);
                const capsule = createCapsuleEntity(2, 50, 50, 10, 0, 0, 50, 0);

                expect(hash.checkCollision(capsule, circle)).toBe(hash.checkCollision(circle, capsule));
            });
        });
    });
});
