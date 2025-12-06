/**
 * Deep Performance Stress Test
 * 
 * This test simulates extreme game conditions to identify performance bottlenecks
 * and find the breaking point where frame budget is exceeded.
 */

import { Vec2 } from 'netplayjs';
import {
    createPlayer,
    createEnemy,
    createProjectile,
    createXpOrb,
    createHazard,
    createDeterministicRng
} from '../test-utils';
import { EnemyManager } from '../../managers/enemy-manager';
import { XpManager } from '../../managers/xp-manager';
import { CombatManager } from '../../managers/combat-manager';
import { ParticleManager } from '../../managers/particle-manager';
import { HazardManager } from '../../managers/hazard-manager';
import { FloatingTextHelper } from '../../managers/floating-text-manager';
import { SpatialHash } from '../../spatial-hash';
import {
    EnemyState,
    PlayerState,
    ProjectileState,
    XpOrbState,
    ParticleState,
    HazardZoneState,
    FloatingText
} from '../../types';

// Performance budgets
const FRAME_BUDGET_MS = 16.67; // 60 FPS

interface GameState {
    players: Record<number, PlayerState>;
    enemies: EnemyState[];
    projectiles: ProjectileState[];
    xpOrbs: XpOrbState[];
    particles: ParticleState[];
    hazards: HazardZoneState[];
    floatingTexts: FloatingText[];
    spatialHash: SpatialHash;
}

interface TimingBreakdown {
    spatialHashRebuild: number;
    enemyUpdates: number;
    projectileUpdates: number;
    xpOrbUpdates: number;
    particleUpdates: number;
    hazardUpdates: number;
    floatingTextUpdates: number;
    total: number;
}

/**
 * Create a stress test game state
 */
function createStressState(config: {
    playerCount: number;
    enemyCount: number;
    projectileCount: number;
    xpOrbCount: number;
    particleCount: number;
    hazardCount: number;
    floatingTextCount: number;
}): GameState {
    const players: Record<number, PlayerState> = {};
    for (let i = 0; i < config.playerCount; i++) {
        players[i] = createPlayer(i, {
            pos: new Vec2(500 + i * 100, 500)
        });
    }

    const enemies: EnemyState[] = [];
    for (let i = 0; i < config.enemyCount; i++) {
        enemies.push(createEnemy(i, {
            pos: new Vec2(Math.random() * 2000, Math.random() * 2000),
            hp: 50,
            maxHp: 50,
            bleedStacks: Math.random() < 0.3 ? 2 : 0, // 30% have bleed
            dotTimer: 0.1
        }));
    }

    const projectiles: ProjectileState[] = [];
    for (let i = 0; i < config.projectileCount; i++) {
        projectiles.push(createProjectile(i, {
            pos: new Vec2(Math.random() * 2000, Math.random() * 2000),
            vel: new Vec2((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200),
            pierce: Math.floor(Math.random() * 3)
        }));
    }

    const xpOrbs: XpOrbState[] = [];
    for (let i = 0; i < config.xpOrbCount; i++) {
        xpOrbs.push(createXpOrb(i, {
            pos: new Vec2(Math.random() * 2000, Math.random() * 2000)
        }));
    }

    const particles: ParticleState[] = [];
    for (let i = 0; i < config.particleCount; i++) {
        particles.push({
            id: i,
            type: Math.random() < 0.5 ? 'crater' : 'lightning_bolt',
            pos: new Vec2(Math.random() * 2000, Math.random() * 2000),
            vel: new Vec2(Math.random() * 100, Math.random() * 100),
            life: 0.5 + Math.random(),
            maxLife: 1.5,
            color: 'white',
            size: 10 + Math.random() * 20
        });
    }

    const hazards: HazardZoneState[] = [];
    for (let i = 0; i < config.hazardCount; i++) {
        hazards.push(createHazard(i, {
            pos: new Vec2(Math.random() * 2000, Math.random() * 2000),
            radius: 30 + Math.random() * 50,
            duration: 3 + Math.random() * 3,
            type: ['fire', 'acid', 'quicksand'][Math.floor(Math.random() * 3)],
            damage: 10,
            tickTimer: Math.random() * 0.2
        }));
    }

    const floatingTexts: FloatingText[] = [];
    for (let i = 0; i < config.floatingTextCount; i++) {
        floatingTexts.push({
            id: i,
            pos: new Vec2(Math.random() * 2000, Math.random() * 2000),
            vel: new Vec2(0, -30),
            text: Math.floor(Math.random() * 100).toString(),
            color: ['white', 'yellow', 'red', 'cyan'][Math.floor(Math.random() * 4)],
            life: 0.5 + Math.random() * 0.5,
            maxLife: 1.0,
            size: 16 + Math.random() * 10
        });
    }

    const spatialHash = new SpatialHash(200);
    for (const e of enemies) spatialHash.add(e);
    for (const h of hazards) spatialHash.add(h);

    return {
        players,
        enemies,
        projectiles,
        xpOrbs,
        particles,
        hazards,
        floatingTexts,
        spatialHash
    };
}

/**
 * Simulate one tick with timing breakdown
 */
function simulateTickWithTiming(state: GameState, dt: number): TimingBreakdown {
    const rng = createDeterministicRng();
    const damageCallback = (e: EnemyState, dmg: number, src: PlayerState) => {
        e.hp -= dmg;
        if (e.hp <= 0) e.dead = true;
    };

    const timing: TimingBreakdown = {
        spatialHashRebuild: 0,
        enemyUpdates: 0,
        projectileUpdates: 0,
        xpOrbUpdates: 0,
        particleUpdates: 0,
        hazardUpdates: 0,
        floatingTextUpdates: 0,
        total: 0
    };

    const totalStart = performance.now();

    // 1. Rebuild spatial hash
    let start = performance.now();
    state.spatialHash = new SpatialHash(200);
    for (const e of state.enemies) {
        if (!e.dead) state.spatialHash.add(e);
    }
    for (const h of state.hazards) {
        state.spatialHash.add(h);
    }
    timing.spatialHashRebuild = performance.now() - start;

    // 2. Enemy updates (most expensive - O(enemies * players))
    start = performance.now();
    for (const e of state.enemies) {
        if (e.dead) continue;

        // Find closest player
        const result = EnemyManager.findClosestPlayer(e, state.players);
        if (result.player) {
            EnemyManager.updateMovement(e, result.player, dt);

            // Contact damage check
            if (EnemyManager.checkContactDamage(e, result.player)) {
                CombatManager.damagePlayer(result.player, 10 * dt, rng);
            }
        }

        // Process DoT
        const bleedDmg = EnemyManager.processBleed(e, dt);
        if (bleedDmg > 0) {
            FloatingTextHelper.spawn(state.floatingTexts, 9999, e.pos, bleedDmg.toString(), 'red', e.id);
        }

        EnemyManager.constrainToMap(e, 2000, 2000);
        EnemyManager.resetFrameState(e);
    }
    EnemyManager.cleanup(state.enemies);
    timing.enemyUpdates = performance.now() - start;

    // 3. Projectile updates (O(projectiles * enemies in spatial hash cell))
    start = performance.now();
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const proj = state.projectiles[i];

        // Move projectile
        proj.pos.x += proj.vel.x * dt;
        proj.pos.y += proj.vel.y * dt;

        // Query spatial hash for potential collisions
        const collisions = state.spatialHash.query(proj);
        for (const item of collisions) {
            const enemy = item as EnemyState;
            if ('hp' in item && !enemy.dead && !proj.hitList.includes(item.id)) {
                // Check actual collision
                if (state.spatialHash.checkCollision(proj, item)) {
                    const owner = state.players[proj.ownerId];
                    if (owner) {
                        CombatManager.damageEnemy(enemy, proj.dmg, owner, rng);
                    }
                    proj.hitList.push(item.id);

                    if (proj.pierce <= 0) {
                        state.projectiles.splice(i, 1);
                        break;
                    }
                    proj.pierce--;
                }
            }
        }

        // Out of bounds check
        if (proj.pos.x < -100 || proj.pos.x > 2100 || proj.pos.y < -100 || proj.pos.y > 2100) {
            state.projectiles.splice(i, 1);
        }
    }
    timing.projectileUpdates = performance.now() - start;

    // 4. XP orb updates (O(orbs * players))
    start = performance.now();
    XpManager.update(state.xpOrbs, state.players, dt);
    XpManager.mergeOldestOrb(state.xpOrbs, 500);
    timing.xpOrbUpdates = performance.now() - start;

    // 5. Particle updates
    start = performance.now();
    ParticleManager.update(state.particles, dt);
    ParticleManager.cleanup(state.particles);
    timing.particleUpdates = performance.now() - start;

    // 6. Hazard updates (O(hazards * enemies))
    start = performance.now();
    HazardManager.update(
        state.hazards,
        state.enemies,
        state.players,
        state.spatialHash,
        dt,
        damageCallback
    );
    HazardManager.cleanup(state.hazards);
    timing.hazardUpdates = performance.now() - start;

    // 7. Floating text updates
    start = performance.now();
    FloatingTextHelper.update(state.floatingTexts, dt);
    timing.floatingTextUpdates = performance.now() - start;

    timing.total = performance.now() - totalStart;
    return timing;
}

describe('Deep Performance Stress Test', () => {
    it('should identify bottlenecks with realistic heavy load', () => {
        const config = {
            playerCount: 4,
            enemyCount: 50,
            projectileCount: 100,
            xpOrbCount: 200,
            particleCount: 100,
            hazardCount: 20,
            floatingTextCount: 50
        };

        console.log('\n=== STRESS TEST: Realistic Heavy Load ===');
        console.log(`Config: ${config.enemyCount} enemies, ${config.projectileCount} projectiles, ${config.xpOrbCount} orbs, ${config.hazardCount} hazards`);

        const state = createStressState(config);
        const iterations = 60; // 1 second of gameplay
        const timings: TimingBreakdown[] = [];

        for (let i = 0; i < iterations; i++) {
            timings.push(simulateTickWithTiming(state, 1 / 60));
        }

        // Calculate averages
        const avg = {
            spatialHashRebuild: timings.reduce((a, t) => a + t.spatialHashRebuild, 0) / iterations,
            enemyUpdates: timings.reduce((a, t) => a + t.enemyUpdates, 0) / iterations,
            projectileUpdates: timings.reduce((a, t) => a + t.projectileUpdates, 0) / iterations,
            xpOrbUpdates: timings.reduce((a, t) => a + t.xpOrbUpdates, 0) / iterations,
            particleUpdates: timings.reduce((a, t) => a + t.particleUpdates, 0) / iterations,
            hazardUpdates: timings.reduce((a, t) => a + t.hazardUpdates, 0) / iterations,
            floatingTextUpdates: timings.reduce((a, t) => a + t.floatingTextUpdates, 0) / iterations,
            total: timings.reduce((a, t) => a + t.total, 0) / iterations,
        };

        // Print breakdown
        console.log('\n--- Timing Breakdown (avg over 60 frames) ---');
        console.log(`Spatial Hash Rebuild: ${avg.spatialHashRebuild.toFixed(3)}ms`);
        console.log(`Enemy Updates:        ${avg.enemyUpdates.toFixed(3)}ms`);
        console.log(`Projectile Updates:   ${avg.projectileUpdates.toFixed(3)}ms`);
        console.log(`XP Orb Updates:       ${avg.xpOrbUpdates.toFixed(3)}ms`);
        console.log(`Particle Updates:     ${avg.particleUpdates.toFixed(3)}ms`);
        console.log(`Hazard Updates:       ${avg.hazardUpdates.toFixed(3)}ms`);
        console.log(`Floating Text:        ${avg.floatingTextUpdates.toFixed(3)}ms`);
        console.log(`---`);
        console.log(`TOTAL:                ${avg.total.toFixed(3)}ms (budget: ${FRAME_BUDGET_MS.toFixed(2)}ms)`);
        console.log(`Frame Budget Used:    ${((avg.total / FRAME_BUDGET_MS) * 100).toFixed(1)}%`);

        // Find bottleneck
        const components = [
            { name: 'Enemy Updates', time: avg.enemyUpdates },
            { name: 'Projectile Updates', time: avg.projectileUpdates },
            { name: 'XP Orb Updates', time: avg.xpOrbUpdates },
            { name: 'Hazard Updates', time: avg.hazardUpdates },
            { name: 'Spatial Hash Rebuild', time: avg.spatialHashRebuild },
            { name: 'Particle Updates', time: avg.particleUpdates },
            { name: 'Floating Text', time: avg.floatingTextUpdates },
        ].sort((a, b) => b.time - a.time);

        console.log('\n--- Bottleneck Ranking ---');
        components.forEach((c, i) => {
            const pct = (c.time / avg.total * 100).toFixed(1);
            console.log(`${i + 1}. ${c.name}: ${pct}%`);
        });

        expect(avg.total).toBeLessThan(FRAME_BUDGET_MS);
    });

    it('should find breaking point with escalating entity counts', () => {
        console.log('\n=== STRESS TEST: Finding Breaking Point ===');

        const scalingTests = [
            { enemies: 50, projectiles: 50, orbs: 100, hazards: 10 },
            { enemies: 100, projectiles: 100, orbs: 200, hazards: 20 },
            { enemies: 200, projectiles: 150, orbs: 300, hazards: 30 },
            { enemies: 300, projectiles: 200, orbs: 400, hazards: 40 },
            { enemies: 500, projectiles: 300, orbs: 500, hazards: 50 },
        ];

        let brokeAt: string | null = null;

        for (const test of scalingTests) {
            const state = createStressState({
                playerCount: 4,
                enemyCount: test.enemies,
                projectileCount: test.projectiles,
                xpOrbCount: test.orbs,
                particleCount: 100,
                hazardCount: test.hazards,
                floatingTextCount: 30
            });

            // Warmup
            simulateTickWithTiming(state, 1 / 60);

            // Measure
            const iterations = 30;
            let totalTime = 0;
            for (let i = 0; i < iterations; i++) {
                const timing = simulateTickWithTiming(state, 1 / 60);
                totalTime += timing.total;
            }
            const avgTime = totalTime / iterations;
            const status = avgTime > FRAME_BUDGET_MS ? '❌ OVER BUDGET' : '✅ OK';

            console.log(`${test.enemies} enemies + ${test.projectiles} proj + ${test.orbs} orbs: ${avgTime.toFixed(2)}ms ${status}`);

            if (avgTime > FRAME_BUDGET_MS && !brokeAt) {
                brokeAt = `${test.enemies} enemies, ${test.projectiles} projectiles, ${test.orbs} orbs`;
            }
        }

        if (brokeAt) {
            console.log(`\n⚠️  Breaking point: ${brokeAt}`);
        } else {
            console.log('\n✅ All loads within budget!');
        }

        // This test is informational - we just want to see the results
        expect(true).toBe(true);
    });

    it('should stress test chain lightning with many targets', () => {
        console.log('\n=== STRESS TEST: Chain Lightning ===');

        const enemies: EnemyState[] = [];
        for (let i = 0; i < 100; i++) {
            enemies.push(createEnemy(i, {
                pos: new Vec2(Math.random() * 500, Math.random() * 500),
                hp: 100
            }));
        }
        const player = createPlayer(0);
        const rng = createDeterministicRng();

        const bounceTests = [3, 5, 10, 15, 20];

        for (const bounces of bounceTests) {
            const iterations = 100;
            const start = performance.now();

            for (let i = 0; i < iterations; i++) {
                CombatManager.chainLightning(
                    enemies,
                    player,
                    new Vec2(250, 250),
                    50,
                    bounces,
                    500, // Large range
                    [],
                    rng
                );
            }

            const avgTime = (performance.now() - start) / iterations;
            console.log(`${bounces} bounces through 100 enemies: ${avgTime.toFixed(3)}ms`);
        }

        expect(true).toBe(true);
    });
});
