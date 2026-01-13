import { ShinobiClashGame } from '../multiplayer-game';
import { CombatManager } from '../managers/combat-manager';
import { PlayerState } from '../types';
import { NetplayPlayer } from 'netplayjs';

describe('Spectator Logic', () => {
    let game: ShinobiClashGame;
    let spectator: PlayerState;
    let p1: PlayerState, p2: PlayerState, p3: PlayerState;

    beforeEach(() => {
        const canvas = {
            width: 800,
            height: 600,
            getContext: jest.fn().mockReturnValue({}),
        } as unknown as HTMLCanvasElement;

        const netplayPlayers = [
            { id: 0, isLocalPlayer: () => true, isHost: () => true },
            { id: 1, isLocalPlayer: () => false, isHost: () => false },
            { id: 2, isLocalPlayer: () => false, isHost: () => false },
            { id: 3, isLocalPlayer: () => false, isHost: () => false },
        ] as unknown as NetplayPlayer[];

        game = new ShinobiClashGame(canvas, netplayPlayers);
        spectator = game.players[0];
        p1 = game.players[1];
        p2 = game.players[2];
        p3 = game.players[3];

        // Set up initial states
        spectator.dead = true;
        p1.dead = false;
        p2.dead = false;
        p3.dead = false;
    });

    test('should cycle forward and backward through alive players', () => {
        // Initial state: No target
        expect(spectator.spectatorTargetId).toBeUndefined();

        // Cycle forward
        CombatManager.cycleSpectator(game, spectator, 1);
        expect(spectator.spectatorTargetId).toBe(p1.id);

        CombatManager.cycleSpectator(game, spectator, 1);
        expect(spectator.spectatorTargetId).toBe(p2.id);

        CombatManager.cycleSpectator(game, spectator, 1);
        expect(spectator.spectatorTargetId).toBe(p3.id);

        // Wrap around
        CombatManager.cycleSpectator(game, spectator, 1);
        expect(spectator.spectatorTargetId).toBe(p1.id);

        // Cycle backward
        CombatManager.cycleSpectator(game, spectator, -1);
        expect(spectator.spectatorTargetId).toBe(p3.id);

        CombatManager.cycleSpectator(game, spectator, -1);
        expect(spectator.spectatorTargetId).toBe(p2.id);
    });

    test('should do nothing if no players are alive', () => {
        p1.dead = true;
        p2.dead = true;
        p3.dead = true;

        CombatManager.cycleSpectator(game, spectator, 1);
        expect(spectator.spectatorTargetId).toBeUndefined();

        CombatManager.cycleSpectator(game, spectator, -1);
        expect(spectator.spectatorTargetId).toBeUndefined();
    });

    test('should pick a new target if current target dies', () => {
        // Start by spectating p2
        spectator.spectatorTargetId = p2.id;
        expect(spectator.spectatorTargetId).toBe(p2.id);

        // p2 dies
        p2.dead = true;

        // When cycling, it should realize p2 is dead and pick a new valid target (p1)
        CombatManager.cycleSpectator(game, spectator, 1);
        expect(spectator.spectatorTargetId).toBe(p1.id);
    });
});
