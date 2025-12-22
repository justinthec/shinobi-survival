import { DashSkill } from "../common/DashSkill";
import { ShinobiClashGame } from "../../multiplayer-game";
import { PlayerState } from "../../types";
import { Vec2, DefaultInput } from "netplayjs";

describe('DashSkill', () => {
    let game: ShinobiClashGame;
    let player: PlayerState;
    let skill: DashSkill;

    beforeEach(() => {
        game = {
            particles: [],
            projectiles: [], // used for seed
            nextEntityId: 0,
        } as unknown as ShinobiClashGame;

        player = {
            id: 0,
            pos: new Vec2(100, 100),
            angle: 0,
            cooldowns: { sp: 0 },
            dash: { active: false }
        } as unknown as PlayerState;

        skill = new DashSkill();
    });

    test('should activate dash and spawn particles', () => {
        const input = { keysHeld: { 'w': true } } as unknown as DefaultInput;
        skill.cast(game, player, input, new Vec2(0, 0));

        expect(player.cooldowns.sp).toBe(skill.cooldown);
        expect(player.dash.active).toBe(true);
        expect(player.dash.vy).toBeLessThan(0); // moving up (W)
        expect(game.particles.length).toBeGreaterThan(0);
    });
});
