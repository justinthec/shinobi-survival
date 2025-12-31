import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../../../multiplayer-game";
import { PlayerState } from "../../../types";
import { Skill } from "../../../skills/Skill";
import { ROCK_LEE_CONSTANTS } from "../constants";

export class LeafHurricaneSkill implements Skill {
    id = "leaf_hurricane";
    type = "active";
    name = "Leaf Hurricane";
    description = "Spinning kick that damages enemies around you. Press Q to cancel early.";
    icon = "leaf_hurricane";
    cooldown = ROCK_LEE_CONSTANTS.LEAF_HURRICANE.COOLDOWN;

    cast(game: ShinobiClashGame, p: PlayerState, input: DefaultInput, targetPos: Vec2) {
        // Toggle/Cancel Logic
        // We now check skill state instead of cooldown to know if it's active
        const state = p.skillStates['leaf_hurricane'];

        if (state && state.active) {
            // Find existing projectile
            const proj = game.projectiles.find(pr => pr.ownerId === p.id && pr.type === 'leaf_hurricane');
            if (proj) {
                // Cancel it - The Projectile's update loop handles the cleanup and cooldown reset
                proj.life = 0;
                return;
            }
        }

        if (p.cooldowns.q > 0) return;

        // Spawn attached projectile
        game.projectiles.push({
            id: game.nextEntityId++,
            type: 'leaf_hurricane',
            pos: new Vec2(p.pos.x, p.pos.y),
            vel: new Vec2(0, 0),
            ownerId: p.id,
            angle: 0,
            life: ROCK_LEE_CONSTANTS.LEAF_HURRICANE.DURATION,
            maxLife: ROCK_LEE_CONSTANTS.LEAF_HURRICANE.DURATION,
            radius: ROCK_LEE_CONSTANTS.LEAF_HURRICANE.RADIUS,
            state: 'flying',
            isAoe: true,
            damage: ROCK_LEE_CONSTANTS.LEAF_HURRICANE.MIN_DAMAGE
        });

        // Set cooldown to a high value to lock input while active
        // The real cooldown is applied when the projectile ends.
        p.cooldowns.q = 9999;

        // Mark skill as active and store start time for animation
        p.skillStates['leaf_hurricane'] = {
            active: true,
            startTime: game.gameTime
        };
    }
}
