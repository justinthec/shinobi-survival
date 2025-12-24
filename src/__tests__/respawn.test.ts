import { ShinobiClashGame } from '../multiplayer-game';
import { PlayerState } from '../types';
import { NetplayPlayer } from 'netplayjs';

describe('Respawn Logic', () => {
    let game: ShinobiClashGame;
    let player: PlayerState;

    beforeEach(() => {
        const canvas = {
            width: 800,
            height: 600,
            getContext: jest.fn().mockReturnValue({
                fillRect: jest.fn(),
                translate: jest.fn(),
                rotate: jest.fn(),
                restore: jest.fn(),
                save: jest.fn(),
                beginPath: jest.fn(),
                moveTo: jest.fn(),
                lineTo: jest.fn(),
                stroke: jest.fn(),
                fill: jest.fn(),
                arc: jest.fn(),
                roundRect: jest.fn(),
                strokeRect: jest.fn(),
                strokeText: jest.fn(),
                fillText: jest.fn(),
                measureText: jest.fn().mockReturnValue({ width: 0 }),
                quadraticCurveTo: jest.fn(),
                ellipse: jest.fn(),
                setLineDash: jest.fn(),
                createPattern: jest.fn(),
            }),
        } as unknown as HTMLCanvasElement;

        const netplayPlayer = {
            id: 0,
            isLocalPlayer: () => true,
            isHost: () => true
        } as unknown as NetplayPlayer;

        game = new ShinobiClashGame(canvas, [netplayPlayer]);
        player = game.players[0];
        player.character = 'naruto';
    });

    test('Should clear spectatorTargetId on respawn', () => {
        // Set up dead state
        player.dead = true;
        player.respawnTimer = 1; // 1 tick to respawn
        player.spectatorTargetId = 123; // Some ID

        // Run tick
        game.tickRespawnLogic();

        // Check if respawned
        expect(player.dead).toBe(false);
        // Check if spectatorTargetId is undefined
        expect(player.spectatorTargetId).toBeUndefined();
    });
});
