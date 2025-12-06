/**
 * Performance Profiler Entry Point
 * 
 * Runs the actual game code with performance instrumentation.
 * Includes stress test mode, drift detection, spike analysis, and summary report.
 */

import { Vec2 } from 'netplayjs';
import { ShinobiSurvivalGame } from './multiplayer-game';

// Performance measurement state with compacting history
interface HistoryBucket {
    tick: number;
    draw: number;
    serialize: number;
    total: number;
    samples: number;
    timestamp: number;
}

interface SpikeEvent {
    frameNumber: number;
    totalTime: number;
    tickTime: number;
    drawTime: number;
    serializeTime: number;
    entityCounts: {
        enemies: number;
        projectiles: number;
        particles: number;
        xpOrbs: number;
        hazards: number;
    };
    context: string; // What was happening
}

interface DriftAnalysis {
    isIncreasing: boolean;
    slope: number; // ms per bucket
    confidence: number;
    totalChange: number; // total ms change from session start to end
    startAvg: number; // avg frame time at start of session
    endAvg: number; // avg frame time at end of session
}

interface ProfilerStats {
    frameCount: number;
    peakFrame: number;
    startTime: number;
    // Current frame values for live display
    currentTick: number;
    currentDraw: number;
    currentSerialize: number;
    currentTotal: number;
    // Totals for averages
    totalTickTime: number;
    totalDrawTime: number;
    totalSerializeTime: number;
    totalFrameTime: number;
    // Aggregated history (compacts over time)
    history: HistoryBucket[];
    samplesPerBucket: number;
    totalSamples: number;
    // Spike tracking
    spikes: SpikeEvent[];
    spikeMultiplier: number; // spike = frame time > avg * multiplier
    // Min/max tracking
    minFrameTime: number;
    // Last action for correlation
    lastActions: string[];
    // Rolling average for relative spike detection
    recentTimes: number[];
}

const MAX_BUCKETS = 200;
const COMPACT_THRESHOLD = 400;
const SPIKE_MULTIPLIER = 2.5; // Frame is a spike if > 2.5x rolling average
const MAX_SPIKES = 50;
const RECENT_WINDOW = 60; // Use last 60 frames for rolling average

const stats: ProfilerStats = {
    frameCount: 0,
    peakFrame: 0,
    startTime: 0,
    currentTick: 0,
    currentDraw: 0,
    currentSerialize: 0,
    currentTotal: 0,
    totalTickTime: 0,
    totalDrawTime: 0,
    totalSerializeTime: 0,
    totalFrameTime: 0,
    history: [],
    samplesPerBucket: 1,
    totalSamples: 0,
    spikes: [],
    spikeMultiplier: SPIKE_MULTIPLIER,
    minFrameTime: Infinity,
    lastActions: [],
    recentTimes: []
};

let running = false;
let game: ShinobiSurvivalGame | null = null;
let canvas: HTMLCanvasElement | null = null;
let animationId: number | null = null;
let mockPlayersArray: MockPlayer[] = [];
let stressTestMode = false;
let frameCounter = 0;

const CHARACTERS = ['naruto', 'sasuke', 'gaara', 'sakura'];

class MockInput {
    keysDown: Record<string, boolean> = {};
    keysPressed: Record<string, boolean> = {};
    keysHeld: Record<string, boolean> = {};
}

class MockPlayer {
    id: number;
    isLocal: boolean;
    constructor(id: number, isLocal: boolean = false) {
        this.id = id;
        this.isLocal = isLocal;
    }
}

function addToHistory(tick: number, draw: number, serialize: number, total: number) {
    stats.totalSamples++;
    const now = performance.now();

    const lastBucket = stats.history[stats.history.length - 1];

    if (!lastBucket || lastBucket.samples >= stats.samplesPerBucket) {
        stats.history.push({
            tick, draw, serialize, total,
            samples: 1,
            timestamp: now
        });
    } else {
        const n = lastBucket.samples;
        lastBucket.tick = (lastBucket.tick * n + tick) / (n + 1);
        lastBucket.draw = (lastBucket.draw * n + draw) / (n + 1);
        lastBucket.serialize = (lastBucket.serialize * n + serialize) / (n + 1);
        lastBucket.total = (lastBucket.total * n + total) / (n + 1);
        lastBucket.samples++;
    }

    if (stats.history.length >= COMPACT_THRESHOLD) {
        compactHistory();
    }
}

function compactHistory() {
    const newHistory: HistoryBucket[] = [];

    for (let i = 0; i < stats.history.length; i += 2) {
        const a = stats.history[i];
        const b = stats.history[i + 1];

        if (b) {
            newHistory.push({
                tick: (a.tick + b.tick) / 2,
                draw: (a.draw + b.draw) / 2,
                serialize: (a.serialize + b.serialize) / 2,
                total: (a.total + b.total) / 2,
                samples: a.samples + b.samples,
                timestamp: (a.timestamp + b.timestamp) / 2
            });
        } else {
            newHistory.push(a);
        }
    }

    stats.history = newHistory;
    stats.samplesPerBucket *= 2;
}

function analyzeDrift(): DriftAnalysis {
    if (stats.history.length < 10) {
        return { isIncreasing: false, slope: 0, confidence: 0, totalChange: 0, startAvg: 0, endAvg: 0 };
    }

    // Linear regression on total times across all buckets (entire session)
    const n = stats.history.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
        const x = i;
        const y = stats.history[i].total;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // Calculate predicted values at start and end of session
    const intercept = (sumY - slope * sumX) / n;
    const startPredicted = intercept;
    const endPredicted = intercept + slope * (n - 1);
    const totalChange = endPredicted - startPredicted;

    // Calculate actual averages for first and last 10% of buckets
    const windowSize = Math.max(1, Math.floor(n * 0.1));
    const startBuckets = stats.history.slice(0, windowSize);
    const endBuckets = stats.history.slice(-windowSize);
    const startAvg = startBuckets.reduce((sum, b) => sum + b.total, 0) / startBuckets.length;
    const endAvg = endBuckets.reduce((sum, b) => sum + b.total, 0) / endBuckets.length;

    // Calculate R² for confidence
    const meanY = sumY / n;
    let ssRes = 0, ssTot = 0;
    for (let i = 0; i < n; i++) {
        const predicted = intercept + slope * i;
        ssRes += (stats.history[i].total - predicted) ** 2;
        ssTot += (stats.history[i].total - meanY) ** 2;
    }
    const r2 = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;

    return {
        isIncreasing: totalChange > 0.5, // At least 0.5ms total increase
        slope: slope, // ms per bucket
        confidence: Math.abs(r2),
        totalChange,
        startAvg,
        endAvg
    };
}

function recordSpike(tick: number, draw: number, serialize: number, total: number, context: string) {
    if (!game) return;

    const g = game as any;
    stats.spikes.push({
        frameNumber: stats.frameCount,
        totalTime: total,
        tickTime: tick,
        drawTime: draw,
        serializeTime: serialize,
        entityCounts: {
            enemies: g.enemies.filter((e: any) => !e.dead).length,
            projectiles: g.projectiles.length,
            particles: g.particles.length,
            xpOrbs: g.xpOrbs.length,
            hazards: g.hazards.length
        },
        context
    });

    // Keep only top spikes
    if (stats.spikes.length > MAX_SPIKES) {
        stats.spikes.sort((a, b) => b.totalTime - a.totalTime);
        stats.spikes = stats.spikes.slice(0, MAX_SPIKES);
    }
}

function getSpikeContext(): string {
    const actions = stats.lastActions.filter(a => a).slice(-3);
    return actions.length > 0 ? actions.join(', ') : 'normal gameplay';
}

function trackAction(action: string) {
    stats.lastActions.push(action);
    if (stats.lastActions.length > 10) stats.lastActions.shift();
}

function initGame() {
    canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) {
        console.error('Canvas not found');
        return;
    }

    canvas.width = ShinobiSurvivalGame.canvasSize.width;
    canvas.height = ShinobiSurvivalGame.canvasSize.height;

    mockPlayersArray = [];
    for (let i = 0; i < 4; i++) {
        mockPlayersArray.push(new MockPlayer(i, i === 0));
    }

    game = new ShinobiSurvivalGame(canvas, mockPlayersArray as any);

    (game as any).gamePhase = 'playing';
    (game as any).teamLevel = 10;

    let playerIndex = 0;
    for (const id in (game as any).players) {
        const p = (game as any).players[id];
        p.character = CHARACTERS[playerIndex % CHARACTERS.length];
        p.ready = true;
        p.weaponLevel = 5;
        p.isEvolved = true;
        p.stats = {
            damageMult: 2.0,
            areaMult: 1.5,
            cooldownMult: 0.5,
            critChance: 0.25,
            knockback: 2,
            piercing: 3
        };
        const angle = (playerIndex / 4) * Math.PI * 2;
        p.pos = new Vec2(1000 + Math.cos(angle) * 200, 1000 + Math.sin(angle) * 200);
        playerIndex++;
    }

    const enemyCount = parseInt((document.getElementById('enemies') as HTMLInputElement)?.value || '100');
    for (let i = 0; i < enemyCount; i++) {
        (game as any).spawnEnemy();
    }

    stats.startTime = performance.now();
    frameCounter = 0;

    console.log('Game initialized:', {
        stressTestMode,
        enemies: (game as any).enemies.length,
        players: Object.keys((game as any).players).length
    });
}

function spawnRandomProjectile() {
    if (!game) return;
    const angle = Math.random() * Math.PI * 2;
    const types = ['kunai', 'rasengan', 'fireball', 'shuriken'];
    (game as any).spawnProjectile(
        new Vec2(500 + Math.random() * 1000, 500 + Math.random() * 1000),
        new Vec2(Math.cos(angle) * 300, Math.sin(angle) * 300),
        20, 0, types[Math.floor(Math.random() * types.length)],
        15 + Math.random() * 20, Math.floor(Math.random() * 3)
    );
    trackAction('spawn projectile');
}

function spawnHazard() {
    if (!game) return;
    const types = ['fire', 'acid', 'quicksand'];
    const radius = 40 + Math.random() * 40;
    (game as any).hazards.push({
        id: (game as any).nextEntityId++,
        pos: new Vec2(500 + Math.random() * 1000, 500 + Math.random() * 1000),
        radius, damage: 10, duration: 3, elapsed: 0,
        type: types[Math.floor(Math.random() * types.length)],
        ownerId: 0, tickTimer: 0,
        shape: { type: 'circle', radius }
    });
    trackAction('spawn hazard');
}

function spawnParticles(count: number) {
    if (!game) return;
    for (let i = 0; i < count; i++) {
        (game as any).particles.push({
            id: (game as any).nextEntityId++,
            type: 'explosion',
            pos: new Vec2(500 + Math.random() * 1000, 500 + Math.random() * 1000),
            vel: new Vec2((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200),
            life: 0.5 + Math.random() * 0.5, maxLife: 1,
            color: `hsl(${Math.random() * 60}, 100%, 60%)`,
            size: 5 + Math.random() * 15
        });
    }
    trackAction('spawn particles');
}

function triggerSkillEffects() {
    if (!game) return;
    trackAction('skill effects');

    for (const e of (game as any).enemies) {
        if (Math.random() < 0.1 && !e.dead) {
            (game as any).spawnFloatingText(new Vec2(e.pos.x, e.pos.y), Math.floor(Math.random() * 100).toString(), 'yellow');
        }
    }
}

function profileFrame() {
    if (!running || !game || !canvas) return;

    if ((game as any).gamePhase === 'levelUp') {
        (game as any).gamePhase = 'playing';
        (game as any).teamLevel += 1;
        trackAction('level up');
    }

    const frameStart = performance.now();
    frameCounter++;

    const mockInputs = new Map();
    for (const player of mockPlayersArray) {
        const input = new MockInput();

        if (stressTestMode) {
            if (Math.random() < 0.3) input.keysHeld['w'] = true;
            if (Math.random() < 0.3) input.keysHeld['s'] = true;
            if (Math.random() < 0.3) input.keysHeld['a'] = true;
            if (Math.random() < 0.3) input.keysHeld['d'] = true;
            if (Math.random() < 0.1) { input.keysPressed['q'] = true; trackAction('skill Q'); }
            if (Math.random() < 0.1) { input.keysPressed['e'] = true; trackAction('skill E'); }
            if (Math.random() < 0.05) { input.keysPressed['r'] = true; trackAction('ultimate'); }
            if (Math.random() < 0.1) { input.keysPressed[' '] = true; trackAction('dash'); }
        }

        mockInputs.set(player, input);
    }

    // Maintain projectile count
    const targetProj = parseInt((document.getElementById('projectiles') as HTMLInputElement)?.value || '50');
    const currentProj = (game as any).projectiles.length;
    if (currentProj < targetProj) {
        for (let i = 0; i < Math.min(10, targetProj - currentProj); i++) {
            spawnRandomProjectile();
        }
    }

    if (stressTestMode) {
        if (frameCounter % 30 === 0 && (game as any).hazards.length < 30) spawnHazard();
        if (frameCounter % 10 === 0) spawnParticles(5);
        if (frameCounter % 15 === 0) triggerSkillEffects();

        const targetEnemies = parseInt((document.getElementById('enemies') as HTMLInputElement)?.value || '100');
        const liveEnemies = (game as any).enemies.filter((e: any) => !e.dead).length;
        if (liveEnemies < targetEnemies * 0.8) {
            for (let i = 0; i < 5; i++) (game as any).spawnEnemy();
            trackAction('enemy respawn');
        }
    }

    // TICK
    const tickStart = performance.now();
    (game as any).tick(mockInputs);
    const tickTime = performance.now() - tickStart;

    // DRAW
    const drawStart = performance.now();
    game.draw(canvas);
    const drawTime = performance.now() - drawStart;

    // SERIALIZE
    const serializeStart = performance.now();
    const serialized = JSON.stringify(game);
    const serializeTime = performance.now() - serializeStart;

    const totalTime = performance.now() - frameStart;

    // Update stats
    stats.currentTick = tickTime;
    stats.currentDraw = drawTime;
    stats.currentSerialize = serializeTime;
    stats.currentTotal = totalTime;
    stats.totalTickTime += tickTime;
    stats.totalDrawTime += drawTime;
    stats.totalSerializeTime += serializeTime;
    stats.totalFrameTime += totalTime;
    stats.frameCount++;
    stats.peakFrame = Math.max(stats.peakFrame, totalTime);
    stats.minFrameTime = Math.min(stats.minFrameTime, totalTime);

    // Detect spike
    // Detect spike relative to rolling average
    stats.recentTimes.push(totalTime);
    if (stats.recentTimes.length > RECENT_WINDOW) {
        stats.recentTimes.shift();
    }

    const rollingAvg = stats.recentTimes.length >= 10
        ? stats.recentTimes.slice(0, -1).reduce((a, b) => a + b, 0) / (stats.recentTimes.length - 1)
        : 0;
    const spikeThreshold = rollingAvg * stats.spikeMultiplier;

    if (rollingAvg > 0 && totalTime > spikeThreshold) {
        recordSpike(tickTime, drawTime, serializeTime, totalTime, getSpikeContext());
    }

    addToHistory(tickTime, drawTime, serializeTime, totalTime);
    updateStatsUI(serialized.length);
    drawHistoryChart();

    animationId = requestAnimationFrame(profileFrame);
}

function updateStatsUI(stateBytes: number) {
    const avgTotal = stats.frameCount > 0 ? stats.totalFrameTime / stats.frameCount : 0;
    const fps = avgTotal > 0 ? 1000 / avgTotal : 0;
    const budgetPct = (stats.currentTotal / 16.67) * 100;

    const setStatValue = (id: string, value: string, threshold: { good: number, warn: number }) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
            const numVal = parseFloat(value);
            el.className = 'stat-value ' + (numVal < threshold.good ? 'good' : numVal < threshold.warn ? 'warning' : 'bad');
        }
    };

    setStatValue('currentFps', fps.toFixed(1), { good: 55, warn: 30 });
    setStatValue('avgFrameTime', avgTotal.toFixed(2) + 'ms', { good: 10, warn: 16 });
    setStatValue('peakFrameTime', stats.peakFrame.toFixed(2) + 'ms', { good: 16, warn: 33 });
    setStatValue('budgetUsed', budgetPct.toFixed(1) + '%', { good: 60, warn: 100 });

    const stateEl = document.getElementById('stateSize');
    if (stateEl) stateEl.textContent = (stateBytes / 1024).toFixed(1) + ' KB';

    const setTiming = (id: string, value: number) => {
        const valEl = document.getElementById(id);
        const barEl = document.getElementById(id + 'Bar');
        if (valEl) valEl.textContent = value.toFixed(2);
        if (barEl) barEl.style.width = Math.min(100, (value / 16.67) * 100) + '%';
    };

    setTiming('tickTime', stats.currentTick);
    setTiming('drawTime', stats.currentDraw);
    setTiming('serializeTime', stats.currentSerialize);
    setTiming('totalTime', stats.currentTotal);

    // Entity counts
    if (game) {
        const countsEl = document.getElementById('entityCounts');
        if (countsEl) {
            const g = game as any;
            countsEl.textContent = `${g.enemies.filter((e: any) => !e.dead).length} enemies, ${g.projectiles.length} proj, ${g.xpOrbs.length} orbs, ${g.particles.length} particles`;
        }
    }

    // Granularity
    const granularityEl = document.getElementById('granularity');
    if (granularityEl) {
        granularityEl.textContent = `${stats.totalSamples} frames, ${stats.samplesPerBucket}/bucket`;
    }

    // Drift analysis - always show the rate
    const drift = analyzeDrift();
    const driftEl = document.getElementById('driftStatus');
    if (driftEl) {
        if (drift.confidence > 0.3 && stats.history.length >= 10) {
            // Show actual change: startAvg -> endAvg (totalChange)
            const sign = drift.totalChange >= 0 ? '+' : '';
            const changeStr = `${drift.startAvg.toFixed(1)}ms → ${drift.endAvg.toFixed(1)}ms (${sign}${drift.totalChange.toFixed(1)}ms)`;
            if (drift.isIncreasing) {
                driftEl.textContent = `📈 ${changeStr}`;
                driftEl.className = 'drift-warning';
            } else {
                driftEl.textContent = `📉 ${changeStr}`;
                driftEl.className = 'drift-good';
            }
        } else {
            driftEl.textContent = `-- (need more data)`;
            driftEl.className = 'drift-ok';
        }
    }

    // Spike count with dynamic threshold
    const rollingAvg = stats.recentTimes.length > 0
        ? stats.recentTimes.reduce((a, b) => a + b, 0) / stats.recentTimes.length
        : avgTotal;
    const currentThreshold = rollingAvg * stats.spikeMultiplier;
    const spikeEl = document.getElementById('spikeCount');
    if (spikeEl) {
        spikeEl.textContent = `${stats.spikes.length} spikes (>${currentThreshold.toFixed(1)}ms = ${stats.spikeMultiplier}x avg)`;
    }
}

function drawHistoryChart() {
    const histCanvas = document.getElementById('historyCanvas') as HTMLCanvasElement;
    if (!histCanvas) return;

    const ctx = histCanvas.getContext('2d');
    if (!ctx) return;

    const w = histCanvas.width;
    const h = histCanvas.height;

    ctx.fillStyle = '#12121a';
    ctx.fillRect(0, 0, w, h);

    if (stats.history.length < 2) return;

    const maxVal = 25;
    const xScale = w / Math.max(stats.history.length, 1);
    const yScale = h / maxVal;

    // Budget line
    ctx.strokeStyle = '#ef4444';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, h - 16.67 * yScale);
    ctx.lineTo(w, h - 16.67 * yScale);
    ctx.stroke();
    ctx.setLineDash([]);

    // Trend line if drifting
    const drift = analyzeDrift();
    if (drift.confidence > 0.3) {
        ctx.strokeStyle = drift.isIncreasing ? '#ff6b35' : '#22c55e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const startY = stats.history[0]?.total || 0;
        const endY = startY + (drift.slope * stats.history.length * stats.samplesPerBucket / 1000);
        ctx.moveTo(0, h - startY * yScale);
        ctx.lineTo(w, h - endY * yScale);
        ctx.stroke();
        ctx.lineWidth = 1;
    }

    const drawArea = (getData: (b: HistoryBucket) => number, color: string, baseGetter?: (b: HistoryBucket) => number) => {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(0, h);

        for (let i = 0; i < stats.history.length; i++) {
            const bucket = stats.history[i];
            const x = i * xScale;
            const base = baseGetter ? baseGetter(bucket) : 0;
            const y = h - (base + getData(bucket)) * yScale;
            ctx.lineTo(x, Math.max(0, y));
        }

        ctx.lineTo((stats.history.length - 1) * xScale, h);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
    };

    drawArea(b => b.serialize, '#f59e0b', b => b.tick + b.draw);
    drawArea(b => b.draw, '#3b82f6', b => b.tick);
    drawArea(b => b.tick, '#22c55e');
}

function generateReport(): string {
    const runtime = (performance.now() - stats.startTime) / 1000;
    const runtimeMin = Math.floor(runtime / 60);
    const runtimeSec = Math.floor(runtime % 60);
    const runtimeStr = runtimeMin > 0 ? `${runtimeMin}m ${runtimeSec}s` : `${runtimeSec}s`;

    const avgTick = stats.frameCount > 0 ? stats.totalTickTime / stats.frameCount : 0;
    const avgDraw = stats.frameCount > 0 ? stats.totalDrawTime / stats.frameCount : 0;
    const avgSerialize = stats.frameCount > 0 ? stats.totalSerializeTime / stats.frameCount : 0;
    const avgTotal = stats.frameCount > 0 ? stats.totalFrameTime / stats.frameCount : 0;
    const drift = analyzeDrift();

    let report = `# Performance Profiler Report\n\n`;

    // Session info
    report += `## Session Info\n\n`;
    report += `| Parameter | Value |\n`;
    report += `|-----------|-------|\n`;
    report += `| Duration | ${runtimeStr} |\n`;
    report += `| Total Frames | ${stats.frameCount.toLocaleString()} |\n`;
    report += `| Stress Mode | ${stressTestMode ? '🔥 ON' : 'OFF'} |\n`;
    report += `| Enemies (target) | ${(document.getElementById('enemies') as HTMLInputElement)?.value || '100'} |\n`;
    report += `| Projectiles (target) | ${(document.getElementById('projectiles') as HTMLInputElement)?.value || '50'} |\n\n`;

    // Summary
    report += `## Performance Summary\n\n`;
    report += `| Metric | Value | Status |\n`;
    report += `|--------|-------|--------|\n`;
    report += `| Avg FPS | ${(1000 / avgTotal).toFixed(1)} | ${1000 / avgTotal >= 55 ? '✅' : 1000 / avgTotal >= 30 ? '⚠️' : '❌'} |\n`;
    report += `| Avg Frame Time | ${avgTotal.toFixed(2)}ms | ${avgTotal <= 10 ? '✅' : avgTotal <= 16.67 ? '⚠️' : '❌'} |\n`;
    report += `| Peak Frame Time | ${stats.peakFrame.toFixed(2)}ms | ${stats.peakFrame <= 16.67 ? '✅' : stats.peakFrame <= 33 ? '⚠️' : '❌'} |\n`;
    report += `| Min Frame Time | ${stats.minFrameTime === Infinity ? 'N/A' : stats.minFrameTime.toFixed(2) + 'ms'} | - |\n`;
    report += `| Budget Usage | ${((avgTotal / 16.67) * 100).toFixed(1)}% | ${avgTotal / 16.67 <= 0.6 ? '✅' : avgTotal / 16.67 <= 1 ? '⚠️' : '❌'} |\n\n`;

    // Timing breakdown
    report += `## Timing Breakdown\n\n`;
    report += `| Component | Avg (ms) | % of Frame | Status |\n`;
    report += `|-----------|----------|------------|--------|\n`;
    const tickStatus = avgTick <= 5 ? '✅' : avgTick <= 10 ? '⚠️' : '❌';
    const drawStatus = avgDraw <= 5 ? '✅' : avgDraw <= 10 ? '⚠️' : '❌';
    const serializeStatus = avgSerialize <= 3 ? '✅' : avgSerialize <= 8 ? '⚠️' : '❌';
    report += `| Tick (Game Logic) | ${avgTick.toFixed(2)} | ${((avgTick / avgTotal) * 100).toFixed(1)}% | ${tickStatus} |\n`;
    report += `| Draw (Render) | ${avgDraw.toFixed(2)} | ${((avgDraw / avgTotal) * 100).toFixed(1)}% | ${drawStatus} |\n`;
    report += `| Serialize (NetplayJS) | ${avgSerialize.toFixed(2)} | ${((avgSerialize / avgTotal) * 100).toFixed(1)}% | ${serializeStatus} |\n\n`;

    // Drift analysis
    report += `## Drift Analysis (Session)\n\n`;
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| Trend | ${drift.isIncreasing ? '📈 Increasing' : '📉 Stable/Decreasing'} |\n`;
    report += `| Start Avg | ${drift.startAvg.toFixed(2)}ms |\n`;
    report += `| End Avg | ${drift.endAvg.toFixed(2)}ms |\n`;
    report += `| Total Change | ${drift.totalChange >= 0 ? '+' : ''}${drift.totalChange.toFixed(2)}ms |\n`;
    report += `| Confidence | ${(drift.confidence * 100).toFixed(0)}% |\n\n`;

    if (drift.confidence > 0.3 && drift.isIncreasing) {
        report += `> ⚠️ **Warning:** Performance degraded by ${drift.totalChange.toFixed(1)}ms over this session (${drift.startAvg.toFixed(1)}ms → ${drift.endAvg.toFixed(1)}ms).\n\n`;
    } else if (drift.confidence > 0.3 && !drift.isIncreasing) {
        report += `> ✅ **Good:** Performance is stable or improving.\n\n`;
    } else {
        report += `> ℹ️ **Note:** Not enough data for confident drift analysis yet.\n\n`;
    }

    // Spikes
    const avgTime = stats.frameCount > 0 ? stats.totalFrameTime / stats.frameCount : 0;
    const dynamicThreshold = avgTime * stats.spikeMultiplier;

    if (stats.spikes.length > 0) {
        report += `## Spike Analysis (>${stats.spikeMultiplier}x avg = >${dynamicThreshold.toFixed(1)}ms)\n\n`;
        report += `**Total Spikes:** ${stats.spikes.length}\n\n`;
        report += `| Frame | Total | Tick | Draw | Serialize | Context |\n`;
        report += `|-------|-------|------|------|-----------|--------|\n`;

        const topSpikes = [...stats.spikes].sort((a, b) => b.totalTime - a.totalTime).slice(0, 10);
        for (const spike of topSpikes) {
            report += `| ${spike.frameNumber} | ${spike.totalTime.toFixed(1)}ms | ${spike.tickTime.toFixed(1)}ms | ${spike.drawTime.toFixed(1)}ms | ${spike.serializeTime.toFixed(1)}ms | ${spike.context} |\n`;
        }
        report += '\n';

        const worst = topSpikes[0];
        if (worst) {
            report += `### Worst Spike Entity Counts\n\n`;
            report += `| Entity | Count |\n`;
            report += `|--------|-------|\n`;
            report += `| Enemies | ${worst.entityCounts.enemies} |\n`;
            report += `| Projectiles | ${worst.entityCounts.projectiles} |\n`;
            report += `| Particles | ${worst.entityCounts.particles} |\n`;
            report += `| XP Orbs | ${worst.entityCounts.xpOrbs} |\n`;
            report += `| Hazards | ${worst.entityCounts.hazards} |\n\n`;
        }
    } else {
        report += `## Spike Analysis\n\n`;
        report += `\u2705 No spikes detected (all frames under ${dynamicThreshold.toFixed(1)}ms = ${stats.spikeMultiplier}x avg)\n\n`;
    }

    return report;
}

function showReport() {
    const report = generateReport();
    const modal = document.getElementById('reportModal');
    const content = document.getElementById('reportContent');
    if (modal && content) {
        content.textContent = report;
        modal.style.display = 'flex';
    }
}

function copyReport() {
    const report = generateReport();
    navigator.clipboard.writeText(report).then(() => {
        alert('Report copied to clipboard!');
    });
}

function closeReport() {
    const modal = document.getElementById('reportModal');
    if (modal) modal.style.display = 'none';
}

function toggleProfiler() {
    running = !running;
    const btn = document.getElementById('runBtn');
    const stressBtn = document.getElementById('stressBtn');

    if (running) {
        if (btn) { btn.textContent = '⏹ Stop'; btn.className = 'btn-stop'; }
        if (stressBtn) stressBtn.setAttribute('disabled', 'true');
        initGame();
        animationId = requestAnimationFrame(profileFrame);
    } else {
        if (btn) { btn.textContent = '▶ Run Profiler'; btn.className = 'btn-run'; }
        if (stressBtn) stressBtn.removeAttribute('disabled');
        if (animationId) cancelAnimationFrame(animationId);
    }
}

function toggleStressTest() {
    stressTestMode = !stressTestMode;
    const btn = document.getElementById('stressBtn');
    if (btn) {
        btn.textContent = stressTestMode ? '🔥 Stress: ON' : '💤 Stress: OFF';
        btn.className = stressTestMode ? 'btn-stress-on' : 'btn-stress';
    }
}

function resetStats() {
    stats.history = [];
    stats.frameCount = 0;
    stats.peakFrame = 0;
    stats.minFrameTime = Infinity;
    stats.samplesPerBucket = 1;
    stats.totalSamples = 0;
    stats.totalTickTime = 0;
    stats.totalDrawTime = 0;
    stats.totalSerializeTime = 0;
    stats.totalFrameTime = 0;
    stats.spikes = [];
    stats.lastActions = [];
    stats.recentTimes = [];
    stats.startTime = performance.now();

    ['currentFps', 'avgFrameTime', 'peakFrameTime', 'budgetUsed'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '--';
    });

    const histCtx = (document.getElementById('historyCanvas') as HTMLCanvasElement)?.getContext('2d');
    if (histCtx) {
        histCtx.fillStyle = '#12121a';
        histCtx.fillRect(0, 0, 1100, 150);
    }
}

// Expose to window
(window as any).toggleProfiler = toggleProfiler;
(window as any).toggleStressTest = toggleStressTest;
(window as any).resetStats = resetStats;
(window as any).showReport = showReport;
(window as any).copyReport = copyReport;
(window as any).closeReport = closeReport;

document.addEventListener('DOMContentLoaded', () => {
    console.log('Profiler loaded - click Run to start');
});
