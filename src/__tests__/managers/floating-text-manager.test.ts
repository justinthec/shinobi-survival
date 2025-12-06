/**
 * Unit tests for FloatingTextHelper
 */

import { FloatingTextHelper, FLOATING_TEXT_MAX_DISTANCE } from '../../managers/floating-text-manager';
import { Vec2 } from 'netplayjs';
import { FloatingText } from '../../types';

describe('FloatingTextHelper', () => {
    describe('spawn', () => {
        it('should create a new floating text', () => {
            const texts: FloatingText[] = [];

            const newId = FloatingTextHelper.spawn(texts, 1, new Vec2(100, 100), '50', 'white');

            expect(texts).toHaveLength(1);
            expect(texts[0].text).toBe('50');
            expect(texts[0].color).toBe('white');
            expect(newId).toBe(2); // Returns nextId + 1
        });

        it('should position text above the spawn position', () => {
            const texts: FloatingText[] = [];

            FloatingTextHelper.spawn(texts, 1, new Vec2(100, 100), '50', 'white');

            expect(texts[0].pos.y).toBe(80); // 100 - 20
        });

        it('should set upward velocity', () => {
            const texts: FloatingText[] = [];

            FloatingTextHelper.spawn(texts, 1, new Vec2(100, 100), '50', 'white');

            expect(texts[0].vel.y).toBe(-20);
        });

        it('should accumulate damage for same target within range', () => {
            const texts: FloatingText[] = [];
            const targetPos = new Vec2(100, 100);

            FloatingTextHelper.spawn(texts, 1, new Vec2(100, 100), '50', 'white', 1, targetPos);
            FloatingTextHelper.spawn(texts, 2, new Vec2(105, 100), '30', 'white', 1, targetPos);

            expect(texts).toHaveLength(1);
            expect(texts[0].text).toBe('80');
            expect(texts[0].accumulatedValue).toBe(80);
        });

        it('should create new text for different targets', () => {
            const texts: FloatingText[] = [];

            FloatingTextHelper.spawn(texts, 1, new Vec2(100, 100), '50', 'white', 1, new Vec2(100, 100));
            FloatingTextHelper.spawn(texts, 2, new Vec2(200, 200), '30', 'white', 2, new Vec2(200, 200));

            expect(texts).toHaveLength(2);
        });

        it('should create new text if existing text is too far from target', () => {
            const texts: FloatingText[] = [];
            const initialPos = new Vec2(100, 100);
            const farPos = new Vec2(100 + FLOATING_TEXT_MAX_DISTANCE + 50, 100);

            FloatingTextHelper.spawn(texts, 1, initialPos, '50', 'white', 1, initialPos);
            // Move existing text far away
            texts[0].pos = new Vec2(300, 300);

            FloatingTextHelper.spawn(texts, 2, farPos, '30', 'white', 1, farPos);

            // Should have created a new one since the existing is too far
            expect(texts).toHaveLength(2);
        });

        it('should preserve crit indicator when accumulating', () => {
            const texts: FloatingText[] = [];
            const targetPos = new Vec2(100, 100);

            FloatingTextHelper.spawn(texts, 1, new Vec2(100, 100), '50', 'white', 1, targetPos);
            FloatingTextHelper.spawn(texts, 2, new Vec2(100, 100), '30!', 'yellow', 1, targetPos);

            expect(texts[0].text).toBe('80!');
            expect(texts[0].color).toBe('yellow');
        });
    });

    describe('update', () => {
        it('should decrease life over time', () => {
            const texts: FloatingText[] = [{
                id: 1,
                pos: new Vec2(100, 100),
                vel: new Vec2(0, -20),
                text: '50',
                color: 'white',
                life: 1.0,
                maxLife: 1.0,
                size: 20
            }];

            FloatingTextHelper.update(texts, 0.5);

            expect(texts[0].life).toBe(0.5);
        });

        it('should move text according to velocity', () => {
            const texts: FloatingText[] = [{
                id: 1,
                pos: new Vec2(100, 100),
                vel: new Vec2(10, -20),
                text: '50',
                color: 'white',
                life: 1.0,
                maxLife: 1.0,
                size: 20
            }];

            FloatingTextHelper.update(texts, 0.5);

            expect(texts[0].pos.x).toBe(105); // 100 + 10 * 0.5
            expect(texts[0].pos.y).toBe(90); // 100 + (-20) * 0.5
        });

        it('should remove expired texts', () => {
            const texts: FloatingText[] = [{
                id: 1,
                pos: new Vec2(100, 100),
                vel: new Vec2(0, -20),
                text: '50',
                color: 'white',
                life: 0.1,
                maxLife: 1.0,
                size: 20
            }];

            FloatingTextHelper.update(texts, 0.2);

            expect(texts).toHaveLength(0);
        });

        it('should keep texts with remaining life', () => {
            const texts: FloatingText[] = [
                {
                    id: 1,
                    pos: new Vec2(100, 100),
                    vel: new Vec2(0, -20),
                    text: '50',
                    color: 'white',
                    life: 0.1,
                    maxLife: 1.0,
                    size: 20
                },
                {
                    id: 2,
                    pos: new Vec2(200, 200),
                    vel: new Vec2(0, -20),
                    text: '100',
                    color: 'white',
                    life: 1.0,
                    maxLife: 1.0,
                    size: 20
                }
            ];

            FloatingTextHelper.update(texts, 0.2);

            expect(texts).toHaveLength(1);
            expect(texts[0].id).toBe(2);
        });
    });
});
