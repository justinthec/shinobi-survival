import { ShinobiClashGame } from "../../../multiplayer-game";
import { DefaultInput, NetplayPlayer, Vec2 } from "netplayjs";
import { registerRockLee } from "../index";
import { registerNaruto } from "../../naruto";
import { registerSasuke } from "../../sasuke";

// Helper to create a dummy game state without instantiating Renderer (which needs DOM)
function createGame(): ShinobiClashGame {
    const player1 = new NetplayPlayer(0, true, true);
    const player2 = new NetplayPlayer(1, false, true);

    // We need to bypass the Renderer instantiation in the constructor if possible,
    // or mock window/canvas.
    // Since Renderer instantiation is hardcoded in the constructor:
    // `Object.defineProperty(this, 'renderer', ... value: new Renderer(canvas) ...)`

    // We can mock the canvas element passed to constructor
    const mockCanvas = {
        getContext: () => ({
            canvas: {},
            createPattern: () => {},
            translate: () => {},
            scale: () => {},
            rotate: () => {},
            save: () => {},
            restore: () => {},
            beginPath: () => {},
            rect: () => {},
            fill: () => {},
            stroke: () => {},
            moveTo: () => {},
            lineTo: () => {},
            arc: () => {},
            ellipse: () => {},
            fillRect: () => {},
            strokeRect: () => {},
            fillText: () => {},
            strokeText: () => {},
            measureText: () => ({ width: 0 }),
            drawImage: () => {},
            resetTransform: () => {},
        }),
        width: 1280,
        height: 720
    } as unknown as HTMLCanvasElement;

    // IMPORTANT: We need to set a flag or environment variable if possible to suppress DOM listeners in Renderer
    // The Renderer checks `typeof window !== 'undefined'`.
    // In Jest, window IS defined (JSDOM).
    // So we should assume `new Renderer(mockCanvas)` will run.

    const game = new ShinobiClashGame(mockCanvas, [player1, player2]);

    // Bypass char select
    game.gamePhase = 'playing';

    // Set up Rock Lee on P0
    game.players[0].character = 'rocklee';

    // Call Initialize to set stats
    game.initializeMatch();

    // Force precise positions for testing
    game.players[0].pos = new Vec2(100, 100);
    game.players[1].character = 'naruto';
    game.players[1].maxHp = 150;
    game.players[1].hp = 150;
    game.players[1].pos = new Vec2(200, 100); // 100 units right

    return game;
}

test('Rock Lee Q (Leaf Hurricane) Moves Player and Hits', () => {
    registerRockLee();
    // We also need others if referenced by initializeMatch or shared logic
    registerNaruto();
    registerSasuke();

    const game = createGame();
    const p1 = game.players[0];
    const target = game.players[1];

    expect(p1.pos.x).toBe(100);
    expect(target.hp).toBe(150);

    const { SkillRegistry } = require('../../../skills/SkillRegistry');
    const skillQ = SkillRegistry.getSkill('rocklee', 'q');

    // Cast Q aiming at target
    skillQ.cast(game, p1, new DefaultInput(), new Vec2(200, 100));

    expect(game.projectiles.length).toBe(1);
    const proj = game.projectiles[0];
    expect(proj.type).toBe('rock_lee_dive');

    // Run Frames
    const { ProjectileRegistry } = require('../../../core/registries');
    const def = ProjectileRegistry.get(proj.type);

    // Simulate 10 frames of update
    for(let i=0; i<10; i++) {
        def.update(game, proj);
    }

    // Player moved right?
    expect(p1.pos.x).toBeGreaterThan(100);

    // Target Hit?
    // We need to check if enough frames passed to cover distance.
    // Speed = 15. Distance = 100. Should hit in ~7 frames.
    expect(target.hp).toBeLessThan(150);
    expect(proj.hitEntities).toContain(1);
});

test('Rock Lee E (Primary Lotus) Buffs Speed', () => {
    registerRockLee();
    const game = createGame();
    const p1 = game.players[0];

    const baseSpeed = p1.stats.speed; // 3.5

    // Cast E (Buff Phase)
    const { SkillRegistry } = require('../../../skills/SkillRegistry');
    const skillE = SkillRegistry.getSkill('rocklee', 'e');

    skillE.cast(game, p1, new DefaultInput(), new Vec2(0,0));

    expect(p1.skillStates['e'].active).toBe(true);

    // Verify Speed Multiplier Application logic
    // We need to run CombatManager.handleMovement or simulate the logic that reads speed.
    // Since we modified CombatManager logic, let's test that logic specifically if possible,
    // or trust that if p.stats.speed is used in movement, it will be scaled.
    // Wait, I modified `CombatManager.handleMovement` to calculate `speed` locally.
    // So `p.stats.speed` REMAINS 3.5.
    // But the movement delta should be higher.

    const { CombatManager } = require('../../../managers/combat-manager');

    // Simulate Input: Move Right
    const input = new DefaultInput();
    input.keysHeld['d'] = true;

    // Store pos
    const startX = p1.pos.x;

    // Tick Movement
    CombatManager.handleMovement(game, p1, input);

    const movedDist = p1.pos.x - startX;

    // Expected: 3.5 * 1.5 = 5.25
    expect(movedDist).toBeCloseTo(3.5 * 1.5);
});
