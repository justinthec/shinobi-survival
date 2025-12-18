import { DefaultInput, NetplayPlayer, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "./multiplayer-game";
import { ProjectileState } from "./types";

// Profiler State
let isRunning = false;
let isStressTest = false;
let game: ShinobiClashGame;
let canvas: HTMLCanvasElement;
let historyCanvas: HTMLCanvasElement;
let historyCtx: CanvasRenderingContext2D;
let players: NetplayPlayer[] = [];
let currentPlayerCount = 4;

// Stats
let stats = {
    frames: 0,
    totalTime: 0,
    maxFrameTime: 0,
    spikes: 0,
    history: [] as any[], // { tick, draw, serialize, total }
};

const SAMPLE_SIZE = 60; // Update UI every 60 frames

// UI Elements
const ui = {
    tickTime: document.getElementById('tickTime'),
    drawTime: document.getElementById('drawTime'),
    serializeTime: document.getElementById('serializeTime'),
    totalTime: document.getElementById('totalTime'),
    tickTimeBar: document.getElementById('tickTimeBar'),
    drawTimeBar: document.getElementById('drawTimeBar'),
    serializeTimeBar: document.getElementById('serializeTimeBar'),
    totalTimeBar: document.getElementById('totalTimeBar'),
    currentFps: document.getElementById('currentFps'),
    avgFrameTime: document.getElementById('avgFrameTime'),
    peakFrameTime: document.getElementById('peakFrameTime'),
    budgetUsed: document.getElementById('budgetUsed'),
    stateSize: document.getElementById('stateSize'),
    driftStatus: document.getElementById('driftStatus'),
    spikeCount: document.getElementById('spikeCount'),
    entityCounts: document.getElementById('entityCounts'),
    reportModal: document.getElementById('reportModal'),
    reportContent: document.getElementById('reportContent'),
};

function init(numPlayers: number = 4) {
    currentPlayerCount = numPlayers;
    canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    historyCanvas = document.getElementById('historyCanvas') as HTMLCanvasElement;
    historyCtx = historyCanvas.getContext('2d')!;

    // Create mock players
    players = [];
    for (let i = 0; i < numPlayers; i++) {
        players.push(new NetplayPlayer(i, i === 0, i === 0));
    }

    // Initialize Game
    game = new ShinobiClashGame(canvas, players);
    game.gamePhase = 'playing';
    ShinobiClashGame.localPlayerId = 0;
    game.initializeMatch();

    // Resize canvas to fit container if needed, or let CSS handle it
    canvas.width = 800;
    canvas.height = 600;

    // Initial Draw
    game.draw(canvas);

    console.log(`Profiler initialized with ${numPlayers} players`);
}

function loop() {
    if (!isRunning) return;

    const start = performance.now();

    // 1. Inputs & Stress Test
    const inputs = new Map<NetplayPlayer, DefaultInput>();
    for (const p of players) {
        const input = new DefaultInput();
        input.keysPressed = {};
        input.keysHeld = {};

        if (isStressTest) {
            // Randomly press keys
            if (Math.random() < 0.05) input.keysPressed['q'] = true;
            if (Math.random() < 0.05) input.keysPressed['e'] = true;
            if (Math.random() < 0.02) input.keysPressed[' '] = true; // Dash

            // Random movement
            if (Math.random() < 0.5) {
                input.keysHeld['w'] = Math.random() < 0.5;
                input.keysHeld['s'] = Math.random() < 0.5;
                input.keysHeld['a'] = Math.random() < 0.5;
                input.keysHeld['d'] = Math.random() < 0.5;
            }

            // Mouse position (random)
            input.mousePosition = {
                x: Math.random() * 1600,
                y: Math.random() * 1600
            };
        }

        inputs.set(p, input);
    }

    // 2. Tick
    const t0 = performance.now();
    game.tick(inputs);

    // Immortality: Reset HP every frame to prevent death during stress test
    for (const id in game.players) {
        const p = game.players[id];
        if (p) {
            p.hp = p.maxHp;
            p.dead = false;
        }
    }

    const t1 = performance.now();
    const tickDuration = t1 - t0;

    // 3. Draw
    const t2 = performance.now();
    game.draw(canvas);
    const t3 = performance.now();
    const drawDuration = t3 - t2;

    // 4. Serialize
    const t4 = performance.now();
    const state = game.serialize();
    const json = JSON.stringify(state);
    const t5 = performance.now();
    const serializeDuration = t5 - t4;

    const totalDuration = performance.now() - start;

    // Update Stats
    stats.frames++;
    stats.totalTime += totalDuration;
    stats.maxFrameTime = Math.max(stats.maxFrameTime, totalDuration);
    if (totalDuration > 16.67) stats.spikes++;

    stats.history.push({
        tick: tickDuration,
        draw: drawDuration,
        serialize: serializeDuration,
        total: totalDuration
    });
    if (stats.history.length > 300) stats.history.shift(); // Keep last 300 frames

    // Update UI (throttled)
    if (stats.frames % SAMPLE_SIZE === 0) {
        updateUI(tickDuration, drawDuration, serializeDuration, totalDuration, json.length);
    }

    requestAnimationFrame(loop);
}

function updateUI(tick: number, draw: number, serialize: number, total: number, size: number) {
    if (ui.tickTime) ui.tickTime.textContent = tick.toFixed(2);
    if (ui.drawTime) ui.drawTime.textContent = draw.toFixed(2);
    if (ui.serializeTime) ui.serializeTime.textContent = serialize.toFixed(2);
    if (ui.totalTime) ui.totalTime.textContent = total.toFixed(2);

    // Bars (max 33ms scale)
    if (ui.tickTimeBar) ui.tickTimeBar.style.width = Math.min(100, (tick / 33) * 100) + '%';
    if (ui.drawTimeBar) ui.drawTimeBar.style.width = Math.min(100, (draw / 33) * 100) + '%';
    if (ui.serializeTimeBar) ui.serializeTimeBar.style.width = Math.min(100, (serialize / 33) * 100) + '%';
    if (ui.totalTimeBar) ui.totalTimeBar.style.width = Math.min(100, (total / 33) * 100) + '%';

    const fps = 1000 / (stats.totalTime / SAMPLE_SIZE);
    if (ui.currentFps) ui.currentFps.textContent = fps.toFixed(0);

    if (ui.avgFrameTime) ui.avgFrameTime.textContent = (stats.totalTime / SAMPLE_SIZE).toFixed(2) + 'ms';
    if (ui.peakFrameTime) ui.peakFrameTime.textContent = stats.maxFrameTime.toFixed(2) + 'ms';
    if (ui.budgetUsed) ui.budgetUsed.textContent = ((stats.totalTime / SAMPLE_SIZE) / 16.67 * 100).toFixed(0) + '%';
    if (ui.stateSize) ui.stateSize.textContent = (size / 1024).toFixed(2) + 'KB';

    if (ui.driftStatus) ui.driftStatus.textContent = "OK (Local)";
    if (ui.spikeCount) ui.spikeCount.textContent = stats.spikes + " spikes";

    if (ui.entityCounts) {
        ui.entityCounts.textContent = `Entities: ${Object.keys(game.players).length} Players, ${game.projectiles.length} Projectiles, ${game.particles.length} Particles`;
    }

    // Reset periodic stats
    stats.frames = 0;
    stats.totalTime = 0;
    stats.maxFrameTime = 0;

    drawHistoryChart();
}

function drawHistoryChart() {
    const w = historyCanvas.width;
    const h = historyCanvas.height;
    const ctx = historyCtx;

    ctx.clearRect(0, 0, w, h);

    // Draw history
    if (stats.history.length < 2) return;

    const step = w / stats.history.length;

    // Draw Total Time Line
    ctx.strokeStyle = '#ff6b35';
    ctx.beginPath();
    stats.history.forEach((d, i) => {
        const y = h - (d.total / 33) * h;
        if (i === 0) ctx.moveTo(i * step, y);
        else ctx.lineTo(i * step, y);
    });
    ctx.stroke();
}

// Global Functions
(window as any).toggleProfiler = () => {
    isRunning = !isRunning;
    const btn = document.getElementById('runBtn');
    if (btn) {
        btn.textContent = isRunning ? "II Stop Profiler" : "▶ Run Profiler";
        btn.className = isRunning ? "btn-stop" : "btn-run";
    }
    if (isRunning) loop();
};

(window as any).toggleStressTest = () => {
    isStressTest = !isStressTest;
    const btn = document.getElementById('stressBtn');
    if (btn) {
        btn.textContent = isStressTest ? "⚡ Stress: ON" : "💤 Stress: OFF";
        btn.className = isStressTest ? "btn-stress btn-stress-on" : "btn-stress";
    }
};

(window as any).resetStats = () => {
    stats.spikes = 0;
    stats.history = [];
    if (ui.spikeCount) ui.spikeCount.textContent = "0 spikes";
    // Reset max/avg
};

(window as any).updatePlayerCount = (val: string) => {
    const count = parseInt(val);
    if (!isNaN(count) && count > 0) {
        init(count);
    }
};

(window as any).showReport = () => {
    if (ui.reportModal && ui.reportContent) {
        ui.reportModal.style.display = 'flex';
        const report = `
Performance Report
------------------
Date: ${new Date().toLocaleString()}
FPS: ${ui.currentFps?.textContent}
Avg Frame Time: ${ui.avgFrameTime?.textContent}
Peak Frame Time: ${ui.peakFrameTime?.textContent}
State Size: ${ui.stateSize?.textContent}
Budget Used: ${ui.budgetUsed?.textContent}
Spikes: ${stats.spikes}

Settings:
Stress Test: ${isStressTest ? 'ON' : 'OFF'}
Players: ${currentPlayerCount}
        `;
        ui.reportContent.textContent = report;
    }
};

(window as any).closeReport = () => {
    if (ui.reportModal) ui.reportModal.style.display = 'none';
};

(window as any).copyReport = () => {
    if (ui.reportContent) {
        navigator.clipboard.writeText(ui.reportContent.textContent || "");
        alert("Report copied!");
    }
};

// Start
init();
