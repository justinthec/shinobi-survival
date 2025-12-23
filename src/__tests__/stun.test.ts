import { ShinobiClashGame } from '../multiplayer-game';
import { CombatManager } from '../managers/combat-manager';
import { PlayerState } from '../types';
import { Vec2, NetplayPlayer, DefaultInput } from 'netplayjs';

describe('Stun Mechanics', () => {
    let game: ShinobiClashGame;
    let player: PlayerState;

    beforeEach(() => {
        // Mock canvas
        const canvas = {
            width: 800,
            height: 600,
            getContext: jest.fn().mockReturnValue({}),
        } as unknown as HTMLCanvasElement;

        const netplayPlayer = { id: 0, isLocalPlayer: () => true } as unknown as NetplayPlayer;
        game = new ShinobiClashGame(canvas, [netplayPlayer]);
        player = game.players[0];
        player.pos = new Vec2(100, 100);
        player.stats.speed = 10;
        player.stunned = 0;
    });

    test('Player should move when not stunned', () => {
        const input = {
            keysPressed: {},
            keysHeld: { 'w': true }, // Move up
            mousePosition: new Vec2(0,0),
            touches: []
        } as unknown as DefaultInput;

        CombatManager.processInput(game, player, input);
        expect(player.pos.y).toBeLessThan(100); // Moved up
    });

    test('Player should NOT move when stunned', () => {
        player.stunned = 10;
        const input = {
            keysPressed: {},
            keysHeld: { 'w': true },
            mousePosition: new Vec2(0,0),
            touches: []
        } as unknown as DefaultInput;

        CombatManager.processInput(game, player, input);
        expect(player.pos.y).toBe(100); // Did not move
        expect(player.stunned).toBe(9); // Stun decreased
    });
});
