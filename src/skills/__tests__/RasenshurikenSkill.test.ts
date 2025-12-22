import { RasenshurikenSkill } from "../naruto/RasenshurikenSkill";
import { ShinobiClashGame } from "../../multiplayer-game";
import { PlayerState } from "../../types";
import { Vec2, DefaultInput } from "netplayjs";

describe('RasenshurikenSkill', () => {
    let game: ShinobiClashGame;
    let player: PlayerState;
    let skill: RasenshurikenSkill;

    beforeEach(() => {
        // Mock game
        game = {
            projectiles: [],
            nextEntityId: 0,
        } as unknown as ShinobiClashGame;

        player = {
            id: 0,
            pos: new Vec2(100, 100),
            angle: 0,
            cooldowns: { q: 0 },
            casting: 0
        } as unknown as PlayerState;

        skill = new RasenshurikenSkill();
    });

    test('should spawn projectile and apply cooldown', () => {
        skill.cast(game, player, {} as DefaultInput, new Vec2(0, 0));

        expect(player.cooldowns.q).toBe(skill.cooldown);
        expect(player.casting).toBe(RasenshurikenSkill.CAST_TIME);
        expect(game.projectiles.length).toBe(1);

        const proj = game.projectiles[0];
        expect(proj.type).toBe('rasenshuriken');
        expect(proj.life).toBe(RasenshurikenSkill.LIFE);
    });

    test('should not cast if on cooldown', () => {
        player.cooldowns.q = 10;
        skill.cast(game, player, {} as DefaultInput, new Vec2(0, 0));
        expect(game.projectiles.length).toBe(0);
    });
});
