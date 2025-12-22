import { ShinobiClashGame } from '../multiplayer-game';
import { CombatManager } from '../managers/combat-manager';
import { PlayerState, ProjectileState } from '../types';
import { Vec2, NetplayPlayer, DefaultInput } from 'netplayjs';
import { RasenshurikenSkill } from '../skills/naruto/RasenshurikenSkill';
import { CloneStrikeSkill } from '../skills/naruto/CloneStrikeSkill';

describe('Projectile Spin', () => {
    let game: ShinobiClashGame;
    let player: PlayerState;

    beforeEach(() => {
        // Mock canvas since we are in Node
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
            }),
        } as unknown as HTMLCanvasElement;

        // Mock NetplayPlayer
        const netplayPlayer = {
            id: 0,
            isLocalPlayer: () => true,
            isHost: () => true
        } as unknown as NetplayPlayer;

        game = new ShinobiClashGame(canvas, [netplayPlayer]);

        player = game.players[0];
        player.character = 'naruto';
        player.pos = new Vec2(100, 100);
        player.angle = 0;

        // Clear projectiles
        game.projectiles = [];
    });

    test('Rasenshuriken projectile should rotate over time', () => {
        // Spawn projectile
        const skill = new RasenshurikenSkill();
        // Provide dummy input and target
        skill.cast(game, player, {} as DefaultInput, new Vec2(0, 0));

        expect(game.projectiles.length).toBe(1);
        const projectile = game.projectiles[0];

        expect(projectile.type).toBe('rasenshuriken');
        expect(projectile.rotation).toBe(0);

        // Run update loop a few times
        CombatManager.updateProjectiles(game);

        expect(projectile.rotation).toBeGreaterThan(0);
        const rotationAfter1Tick = projectile.rotation!;

        CombatManager.updateProjectiles(game);
        expect(projectile.rotation).toBeGreaterThan(rotationAfter1Tick);
    });

    test('Other projectiles (Clone) should not rotate', () => {
         // Spawn Clone
         const skill = new CloneStrikeSkill();
         skill.cast(game, player, {} as DefaultInput, new Vec2(0, 0));

         const clone = game.projectiles[0];
         expect(clone.rotation).toBe(0);

         CombatManager.updateProjectiles(game);

         // Should stay 0
         expect(clone.rotation).toBe(0);
    });
});
