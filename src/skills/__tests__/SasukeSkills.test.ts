import { LightningSlashSkill } from "../../characters/sasuke/skills/LightningSlashSkill";
import { TeleportSkill } from "../../characters/sasuke/skills/TeleportSkill";
import { ShinobiClashGame } from "../../multiplayer-game";
import { PlayerState } from "../../types";
import { Vec2, DefaultInput } from "netplayjs";

describe('Sasuke Skills', () => {
    let game: ShinobiClashGame;
    let player: PlayerState;

    beforeEach(() => {
        // Mock game
        game = {
            projectiles: [],
            particles: [],
            nextEntityId: 0,
        } as unknown as ShinobiClashGame;

        player = {
            id: 0,
            pos: new Vec2(100, 100),
            angle: 0,
            cooldowns: { q: 0, e: 0 },
            casting: 0,
            skillStates: {}
        } as unknown as PlayerState;
    });

    describe('LightningSlashSkill', () => {
        const skill = new LightningSlashSkill();

        test('should have correct damage value', () => {
            expect(LightningSlashSkill.DAMAGE).toBe(50);
        });

        test('should apply damage to projectile state', () => {
            skill.cast(game, player, {} as DefaultInput, new Vec2(0, 0));
            const proj = game.projectiles[0];
            expect(proj.damage).toBe(50);
        });
    });

    describe('TeleportSkill', () => {
        const skill = new TeleportSkill();

        test('should have correct cooldown', () => {
            expect(skill.cooldown).toBe(600);
        });

        test('should apply cooldown on cast', () => {
            // Mock the input for cast if needed, but direct cast call is simpler
            skill.cast(game, player, {} as DefaultInput, new Vec2(200, 200));
            expect(player.cooldowns.e).toBe(600);
        });
    });
});
