import { ShinobiClashGame } from "../../../multiplayer-game";
import { DefaultInput, NetplayPlayer, Vec2 } from "netplayjs";
import { registerRockLee } from "../index";
import { registerNaruto } from "../../naruto";
import { registerSasuke } from "../../sasuke";

// Helper to create a dummy game state without instantiating Renderer
function createGame(): ShinobiClashGame {
    const player1 = new NetplayPlayer(0, true, true);
    const player2 = new NetplayPlayer(1, false, true);

    // Mock canvas context
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

    const game = new ShinobiClashGame(mockCanvas, [player1, player2]);
    game.gamePhase = 'playing';
    game.players[0].character = 'rocklee';
    game.initializeMatch();

    // Set P0 to valid start pos to avoid boundary clamp (PLAYER_RADIUS=25)
    game.players[0].pos = new Vec2(100, 100);

    return game;
}

test('Rock Lee Q (Leaf Hurricane) Destination Logic', () => {
    registerRockLee();
    const game = createGame();
    const p1 = game.players[0];

    // Target: 300 units away on X axis -> 400, 100
    // Speed is 15. Duration should be 20 frames.
    const startX = 100;
    const targetX = 400;

    const { SkillRegistry } = require('../../../skills/SkillRegistry');
    const skillQ = SkillRegistry.getSkill('rocklee', 'q');

    // Cast Q aiming at 400, 100
    skillQ.cast(game, p1, new DefaultInput(), new Vec2(targetX, 100));

    expect(game.projectiles.length).toBe(1);
    const proj = game.projectiles[0];

    // Verify Life
    expect(proj.life).toBe(20);
    expect(proj.maxLife).toBe(20);

    // Run 20 frames
    const { ProjectileRegistry } = require('../../../core/registries');
    const def = ProjectileRegistry.get(proj.type);

    for(let i=0; i<20; i++) {
        def.update(game, proj);
    }

    // Should be at destination
    expect(p1.pos.x).toBeCloseTo(targetX);
    expect(p1.pos.y).toBeCloseTo(100);

    expect(proj.life).toBe(0);
});
