/**
 * Draw Performance Tests
 * 
 * Uses a mock canvas context to measure draw call overhead
 * without requiring a real browser environment.
 */

import { Vec2 } from 'netplayjs';
import {
    createPlayer,
    createEnemy,
    createProjectile,
    createXpOrb,
    createHazard,
} from '../test-utils';
import {
    EnemyState,
    PlayerState,
    ProjectileState,
    XpOrbState,
    ParticleState,
    HazardZoneState,
    FloatingText
} from '../../types';

interface DrawStats {
    fillRectCalls: number;
    strokeRectCalls: number;
    arcCalls: number;
    fillTextCalls: number;
    drawImageCalls: number;
    saveRestoreCalls: number;
    translateCalls: number;
    rotateCalls: number;
    totalCalls: number;
}

/**
 * Create a mock canvas context that counts draw calls
 */
function createMockContext(): { ctx: CanvasRenderingContext2D; stats: DrawStats; reset: () => void } {
    const stats: DrawStats = {
        fillRectCalls: 0,
        strokeRectCalls: 0,
        arcCalls: 0,
        fillTextCalls: 0,
        drawImageCalls: 0,
        saveRestoreCalls: 0,
        translateCalls: 0,
        rotateCalls: 0,
        totalCalls: 0,
    };

    const reset = () => {
        Object.keys(stats).forEach(key => (stats as any)[key] = 0);
    };

    const ctx = {
        fillStyle: '',
        strokeStyle: '',
        font: '',
        textAlign: '',
        textBaseline: '',
        globalAlpha: 1,
        lineWidth: 1,

        fillRect: () => { stats.fillRectCalls++; stats.totalCalls++; },
        strokeRect: () => { stats.strokeRectCalls++; stats.totalCalls++; },
        clearRect: () => { stats.totalCalls++; },

        beginPath: () => { stats.totalCalls++; },
        closePath: () => { stats.totalCalls++; },
        moveTo: () => { stats.totalCalls++; },
        lineTo: () => { stats.totalCalls++; },
        arc: () => { stats.arcCalls++; stats.totalCalls++; },
        fill: () => { stats.totalCalls++; },
        stroke: () => { stats.totalCalls++; },

        fillText: () => { stats.fillTextCalls++; stats.totalCalls++; },
        strokeText: () => { stats.totalCalls++; },
        measureText: () => ({ width: 50 }),

        drawImage: () => { stats.drawImageCalls++; stats.totalCalls++; },

        save: () => { stats.saveRestoreCalls++; stats.totalCalls++; },
        restore: () => { stats.saveRestoreCalls++; stats.totalCalls++; },
        translate: () => { stats.translateCalls++; stats.totalCalls++; },
        rotate: () => { stats.rotateCalls++; stats.totalCalls++; },
        scale: () => { stats.totalCalls++; },

        setTransform: () => { stats.totalCalls++; },
        getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),

        createLinearGradient: () => ({
            addColorStop: () => { }
        }),
        createRadialGradient: () => ({
            addColorStop: () => { }
        }),
    } as unknown as CanvasRenderingContext2D;

    return { ctx, stats, reset };
}

/**
 * Simulate drawing entities
 */
function simulateDraw(
    ctx: CanvasRenderingContext2D,
    entities: {
        players: Record<number, PlayerState>;
        enemies: EnemyState[];
        projectiles: ProjectileState[];
        xpOrbs: XpOrbState[];
        particles: ParticleState[];
        hazards: HazardZoneState[];
        floatingTexts: FloatingText[];
    }
) {
    // Background
    ctx.fillRect(0, 0, 1920, 1080);

    // Camera transform
    ctx.save();
    ctx.translate(-500, -500);

    // Draw hazards (circles with gradients)
    for (const h of entities.hazards) {
        ctx.beginPath();
        ctx.arc(h.pos.x, h.pos.y, h.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw XP orbs
    for (const orb of entities.xpOrbs) {
        ctx.beginPath();
        ctx.arc(orb.pos.x, orb.pos.y, 8, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw enemies
    for (const e of entities.enemies) {
        if (e.dead) continue;

        // Body
        ctx.beginPath();
        ctx.arc(e.pos.x, e.pos.y, 20, 0, Math.PI * 2);
        ctx.fill();

        // HP bar background
        ctx.fillRect(e.pos.x - 20, e.pos.y - 30, 40, 5);
        // HP bar fill
        ctx.fillRect(e.pos.x - 20, e.pos.y - 30, 40 * (e.hp / e.maxHp), 5);
    }

    // Draw projectiles
    for (const p of entities.projectiles) {
        ctx.save();
        ctx.translate(p.pos.x, p.pos.y);
        ctx.rotate(p.angle);
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Draw players
    for (const id in entities.players) {
        const p = entities.players[id];
        if (p.dead) continue;

        ctx.save();
        ctx.translate(p.pos.x, p.pos.y);

        // Body
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fill();

        // HP bar
        ctx.fillRect(-25, -40, 50, 8);
        ctx.fillRect(-25, -40, 50 * (p.hp / 100), 8);

        ctx.restore();
    }

    // Draw particles
    for (const part of entities.particles) {
        ctx.save();
        ctx.translate(part.pos.x, part.pos.y);
        if (part.angle) ctx.rotate(part.angle);
        ctx.beginPath();
        ctx.arc(0, 0, part.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Draw floating texts
    for (const text of entities.floatingTexts) {
        ctx.fillText(text.text, text.pos.x, text.pos.y);
    }

    ctx.restore();

    // HUD (always draw)
    ctx.fillRect(10, 10, 200, 30); // XP bar bg
    ctx.fillRect(10, 10, 150, 30); // XP bar fill
    ctx.fillText('Level 5', 220, 30);
}

describe('Draw Performance Tests', () => {
    it('should count draw calls with realistic load', () => {
        const { ctx, stats, reset } = createMockContext();

        const entities = {
            players: {
                0: createPlayer(0, { pos: new Vec2(500, 500) }),
                1: createPlayer(1, { pos: new Vec2(600, 500) }),
            },
            enemies: Array.from({ length: 50 }, (_, i) =>
                createEnemy(i, { pos: new Vec2(Math.random() * 2000, Math.random() * 2000) })
            ),
            projectiles: Array.from({ length: 100 }, (_, i) =>
                createProjectile(i, { pos: new Vec2(Math.random() * 2000, Math.random() * 2000) })
            ),
            xpOrbs: Array.from({ length: 200 }, (_, i) =>
                createXpOrb(i, { pos: new Vec2(Math.random() * 2000, Math.random() * 2000) })
            ),
            particles: Array.from({ length: 100 }, (_, i) => ({
                id: i,
                type: 'test',
                pos: new Vec2(Math.random() * 2000, Math.random() * 2000),
                vel: new Vec2(0, 0),
                life: 1,
                maxLife: 1,
                color: 'white',
                size: 10,
                angle: Math.random() * Math.PI * 2
            })),
            hazards: Array.from({ length: 20 }, (_, i) =>
                createHazard(i, { pos: new Vec2(Math.random() * 2000, Math.random() * 2000), radius: 50 })
            ),
            floatingTexts: Array.from({ length: 50 }, (_, i) => ({
                id: i,
                pos: new Vec2(Math.random() * 2000, Math.random() * 2000),
                vel: new Vec2(0, -30),
                text: '50',
                color: 'white',
                life: 1,
                maxLife: 1,
                size: 16
            })),
        } as const;

        console.log('\n=== DRAW TEST: Realistic Load ===');
        console.log(`Entities: ${entities.enemies.length} enemies, ${entities.projectiles.length} projectiles, ${entities.xpOrbs.length} orbs`);

        // Warmup
        simulateDraw(ctx, entities as any);
        reset();

        // Measure
        const iterations = 60;
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
            reset();
            simulateDraw(ctx, entities as any);
        }
        const avgTime = (performance.now() - start) / iterations;

        console.log('\n--- Draw Call Breakdown ---');
        console.log(`Arc calls (circles):   ${stats.arcCalls}`);
        console.log(`FillRect calls:        ${stats.fillRectCalls}`);
        console.log(`FillText calls:        ${stats.fillTextCalls}`);
        console.log(`Save/Restore calls:    ${stats.saveRestoreCalls}`);
        console.log(`Translate calls:       ${stats.translateCalls}`);
        console.log(`Rotate calls:          ${stats.rotateCalls}`);
        console.log(`---`);
        console.log(`TOTAL draw calls:      ${stats.totalCalls}`);
        console.log(`Time per frame:        ${avgTime.toFixed(3)}ms`);
        console.log(`Calls per entity:      ~${(stats.totalCalls / (50 + 100 + 200 + 100 + 20 + 50 + 2)).toFixed(1)}`);

        // Note: This is mock overhead, real browser will be different
        console.log('\n⚠️  Note: Mock context - real browser performance will differ');
        console.log('Run browser benchmark for accurate draw times');

        expect(stats.totalCalls).toBeGreaterThan(0);
    });

    it('should measure draw call scaling', () => {
        const { ctx, stats, reset } = createMockContext();

        console.log('\n=== DRAW: Scaling Test ===');

        const tests = [
            { enemies: 25, projectiles: 50, orbs: 100 },
            { enemies: 50, projectiles: 100, orbs: 200 },
            { enemies: 100, projectiles: 150, orbs: 300 },
            { enemies: 200, projectiles: 200, orbs: 400 },
        ];

        for (const test of tests) {
            const entities = {
                players: { 0: createPlayer(0), 1: createPlayer(1) },
                enemies: Array.from({ length: test.enemies }, (_, i) =>
                    createEnemy(i, { pos: new Vec2(Math.random() * 2000, Math.random() * 2000) })
                ),
                projectiles: Array.from({ length: test.projectiles }, (_, i) =>
                    createProjectile(i, { pos: new Vec2(Math.random() * 2000, Math.random() * 2000) })
                ),
                xpOrbs: Array.from({ length: test.orbs }, (_, i) =>
                    createXpOrb(i, { pos: new Vec2(Math.random() * 2000, Math.random() * 2000) })
                ),
                particles: [] as ParticleState[],
                hazards: [] as HazardZoneState[],
                floatingTexts: [] as FloatingText[],
            };

            reset();
            const iterations = 30;
            const start = performance.now();
            for (let i = 0; i < iterations; i++) {
                simulateDraw(ctx, entities as any);
            }
            const avgTime = (performance.now() - start) / iterations;

            console.log(`${test.enemies} enemies + ${test.projectiles} proj + ${test.orbs} orbs: ${stats.totalCalls} calls, ${avgTime.toFixed(2)}ms`);
        }

        expect(true).toBe(true);
    });
});
