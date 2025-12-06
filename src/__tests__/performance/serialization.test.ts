/**
 * Serialization Performance Tests
 * 
 * Tests the cost of NetplayJS state serialization which happens every frame
 * for network synchronization.
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

interface GameStateLike {
    players: Record<number, PlayerState>;
    enemies: EnemyState[];
    projectiles: ProjectileState[];
    xpOrbs: XpOrbState[];
    particles: ParticleState[];
    hazards: HazardZoneState[];
    floatingTexts: FloatingText[];
    gameTime: number;
    teamXp: number;
    teamLevel: number;
    nextEntityId: number;
    gamePhase: string;
}

/**
 * Create a game state for serialization testing
 */
function createSerializableState(config: {
    playerCount: number;
    enemyCount: number;
    projectileCount: number;
    xpOrbCount: number;
    particleCount: number;
    hazardCount: number;
    floatingTextCount: number;
}): GameStateLike {
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
            bleedStacks: Math.random() < 0.3 ? 2 : 0,
        }));
    }

    const projectiles: ProjectileState[] = [];
    for (let i = 0; i < config.projectileCount; i++) {
        projectiles.push(createProjectile(i, {
            pos: new Vec2(Math.random() * 2000, Math.random() * 2000),
            vel: new Vec2((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200),
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
            type: 'test',
            pos: new Vec2(Math.random() * 2000, Math.random() * 2000),
            vel: new Vec2(Math.random() * 100, Math.random() * 100),
            life: 1.0,
            maxLife: 1.0,
            color: 'white',
            size: 10
        });
    }

    const hazards: HazardZoneState[] = [];
    for (let i = 0; i < config.hazardCount; i++) {
        hazards.push(createHazard(i, {
            pos: new Vec2(Math.random() * 2000, Math.random() * 2000),
            radius: 50,
            duration: 5.0,
        }));
    }

    const floatingTexts: FloatingText[] = [];
    for (let i = 0; i < config.floatingTextCount; i++) {
        floatingTexts.push({
            id: i,
            pos: new Vec2(Math.random() * 2000, Math.random() * 2000),
            vel: new Vec2(0, -30),
            text: Math.floor(Math.random() * 100).toString(),
            color: 'white',
            life: 1.0,
            maxLife: 1.0,
            size: 16
        });
    }

    return {
        players,
        enemies,
        projectiles,
        xpOrbs,
        particles,
        hazards,
        floatingTexts,
        gameTime: 120.5,
        teamXp: 5000,
        teamLevel: 5,
        nextEntityId: 10000,
        gamePhase: 'playing',
    };
}

/**
 * Simulate NetplayJS serialization (JSON stringify/parse)
 */
function serializeState(state: GameStateLike): string {
    return JSON.stringify(state, (key, value) => {
        // NetplayJS serializes Vec2 as {x, y} objects
        if (value instanceof Vec2) {
            return { x: value.x, y: value.y };
        }
        return value;
    });
}

function deserializeState(json: string): GameStateLike {
    return JSON.parse(json);
}

describe('Serialization Performance Tests', () => {
    it('should measure serialization overhead with realistic load', () => {
        const config = {
            playerCount: 4,
            enemyCount: 50,
            projectileCount: 100,
            xpOrbCount: 200,
            particleCount: 100,
            hazardCount: 20,
            floatingTextCount: 50
        };

        console.log('\n=== SERIALIZATION TEST: Realistic Load ===');
        console.log(`Config: ${config.enemyCount} enemies, ${config.projectileCount} projectiles, ${config.xpOrbCount} orbs`);

        const state = createSerializableState(config);

        // Warmup
        serializeState(state);

        // Measure serialization
        const serIterations = 100;
        let serStart = performance.now();
        let serialized = '';
        for (let i = 0; i < serIterations; i++) {
            serialized = serializeState(state);
        }
        const serTime = (performance.now() - serStart) / serIterations;

        // Measure deserialization
        const deserStart = performance.now();
        for (let i = 0; i < serIterations; i++) {
            deserializeState(serialized);
        }
        const deserTime = (performance.now() - deserStart) / serIterations;

        // Calculate size
        const sizeBytes = new TextEncoder().encode(serialized).length;
        const sizeKB = sizeBytes / 1024;

        console.log('\n--- Serialization Results ---');
        console.log(`Serialized Size:       ${sizeKB.toFixed(2)} KB`);
        console.log(`Serialize Time:        ${serTime.toFixed(3)}ms`);
        console.log(`Deserialize Time:      ${deserTime.toFixed(3)}ms`);
        console.log(`Total Round-Trip:      ${(serTime + deserTime).toFixed(3)}ms`);
        console.log(`Network overhead/frame: ${(serTime + deserTime).toFixed(3)}ms (${((serTime + deserTime) / 16.67 * 100).toFixed(1)}% of frame budget)`);

        // Size breakdown
        const playerJson = JSON.stringify(state.players);
        const enemyJson = JSON.stringify(state.enemies);
        const projJson = JSON.stringify(state.projectiles);
        const orbJson = JSON.stringify(state.xpOrbs);
        const particleJson = JSON.stringify(state.particles);
        const hazardJson = JSON.stringify(state.hazards);
        const textJson = JSON.stringify(state.floatingTexts);

        console.log('\n--- Size Breakdown ---');
        console.log(`Players:       ${(new TextEncoder().encode(playerJson).length / 1024).toFixed(2)} KB`);
        console.log(`Enemies:       ${(new TextEncoder().encode(enemyJson).length / 1024).toFixed(2)} KB`);
        console.log(`Projectiles:   ${(new TextEncoder().encode(projJson).length / 1024).toFixed(2)} KB`);
        console.log(`XP Orbs:       ${(new TextEncoder().encode(orbJson).length / 1024).toFixed(2)} KB`);
        console.log(`Particles:     ${(new TextEncoder().encode(particleJson).length / 1024).toFixed(2)} KB`);
        console.log(`Hazards:       ${(new TextEncoder().encode(hazardJson).length / 1024).toFixed(2)} KB`);
        console.log(`Floating Text: ${(new TextEncoder().encode(textJson).length / 1024).toFixed(2)} KB`);

        // Should be under 5ms for serialize + deserialize
        expect(serTime + deserTime).toBeLessThan(5);
    });

    it('should find serialization breaking point', () => {
        console.log('\n=== SERIALIZATION: Finding Breaking Point ===');

        const scalingTests = [
            { enemies: 50, orbs: 100, size: 0, time: 0 },
            { enemies: 100, orbs: 200, size: 0, time: 0 },
            { enemies: 200, orbs: 400, size: 0, time: 0 },
            { enemies: 500, orbs: 500, size: 0, time: 0 },
            { enemies: 1000, orbs: 500, size: 0, time: 0 },
        ];

        for (const test of scalingTests) {
            const state = createSerializableState({
                playerCount: 4,
                enemyCount: test.enemies,
                projectileCount: 100,
                xpOrbCount: test.orbs,
                particleCount: 50,
                hazardCount: 20,
                floatingTextCount: 30
            });

            // Measure
            const iterations = 50;
            let totalTime = 0;
            let serialized = '';

            for (let i = 0; i < iterations; i++) {
                const start = performance.now();
                serialized = serializeState(state);
                deserializeState(serialized);
                totalTime += performance.now() - start;
            }

            test.time = totalTime / iterations;
            test.size = new TextEncoder().encode(serialized).length / 1024;

            const status = test.time > 5 ? '⚠️  HIGH' : '✅ OK';
            console.log(`${test.enemies} enemies + ${test.orbs} orbs: ${test.size.toFixed(1)}KB, ${test.time.toFixed(2)}ms ${status}`);
        }

        expect(true).toBe(true);
    });
});
