import { ShinobiClashGame } from "../multiplayer-game";
import { CombatManager } from "../managers/combat-manager";
import { Vec2 } from "netplayjs";
import { REGEN_CONSTANTS, MAP_SIZE, KOTH_SETTINGS } from "../types";

// Mock minimal dependencies
jest.mock("../renderer", () => ({
    Renderer: jest.fn().mockImplementation(() => ({
        draw: jest.fn(),
        drawCharSelect: jest.fn(),
        drawGameOver: jest.fn()
    }))
}));

describe("Regeneration System", () => {
    let game: ShinobiClashGame;

    beforeEach(() => {
        // Setup minimal game state
        // We can't easily use the real constructor because of NetplayPlayer logic,
        // so we'll instantiate and then manually fix up players.

        // Mocking NetplayPlayer is hard, so we assume the game can start with empty players
        // and we manually inject one.
        game = new ShinobiClashGame(null as any, []);

        // Inject a player
        game.players[0] = {
            id: 0,
            name: "TestPlayer",
            character: 'naruto',
            pos: new Vec2(200, 200), // Outside circle
            angle: 0,
            hp: 50, // Damaged
            maxHp: 100,
            dead: false,
            ready: true,
            lastDamageTime: -9999,
            stats: { speed: 1, damageMult: 1, cooldownMult: 1 },
            cooldowns: { q:0, e:0, sp:0 },
            casting: 0,
            dash: { active: false, vx: 0, vy: 0, life: 0 },
            skillStates: {},
            victoryProgress: 0,
            respawnTimer: 0,
            spawnCornerIndex: 0
        };

        game.gameTime = 1000;
    });

    test("Regen does not apply before delay", () => {
        const p = game.players[0];
        p.lastDamageTime = game.gameTime - (REGEN_CONSTANTS.DELAY_SECONDS * 60) + 1; // 1 frame before ready

        const initialHp = p.hp;
        CombatManager.tickRegen(game);

        expect(p.hp).toBe(initialHp);
    });

    test("Regen applies after delay", () => {
        const p = game.players[0];
        p.lastDamageTime = game.gameTime - (REGEN_CONSTANTS.DELAY_SECONDS * 60); // Exactly ready

        const initialHp = p.hp;
        CombatManager.tickRegen(game);

        const expectedGain = REGEN_CONSTANTS.HP_PER_SECOND / 60;
        expect(p.hp).toBeCloseTo(initialHp + expectedGain);
    });

    test("Regen stops when damage is taken", () => {
        const p = game.players[0];
        p.lastDamageTime = game.gameTime - 10000; // Long ago

        // Verify regen works first
        let initialHp = p.hp;
        CombatManager.tickRegen(game);
        expect(p.hp).toBeGreaterThan(initialHp);

        // Take damage
        CombatManager.applyDamage(game, p, { damage: 10, type: 'rasenshuriken' } as any);
        expect(p.lastDamageTime).toBe(game.gameTime);
        expect(p.hp).toBeLessThan(51); // Dropped

        // Next tick, no regen because time reset
        initialHp = p.hp;
        game.gameTime++;
        CombatManager.tickRegen(game);
        expect(p.hp).toBe(initialHp);
    });

    test("Regen does not apply inside KOTH circle", () => {
        const p = game.players[0];
        p.lastDamageTime = game.gameTime - 10000;

        // Move inside circle
        const center = MAP_SIZE / 2;
        p.pos.x = center;
        p.pos.y = center;

        const initialHp = p.hp;
        CombatManager.tickRegen(game);
        expect(p.hp).toBe(initialHp);
    });

    test("Regen caps at MaxHP", () => {
        const p = game.players[0];
        p.hp = 99.999; // Very close to max
        p.maxHp = 100;
        p.lastDamageTime = 0;
        game.gameTime = 5000;

        // One tick adds ~0.008 (0.5/60)
        // 99.999 + 0.008 = 100.007 -> capped to 100
        CombatManager.tickRegen(game);
        expect(p.hp).toBe(100);

        // Next tick stays at 100
        CombatManager.tickRegen(game);
        expect(p.hp).toBe(100);
    });
});
