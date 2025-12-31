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
        // If cooldown is active (skill is running), check if we should cancel
        if (p.cooldowns.q > 0) {
            // Find existing projectile
            const proj = game.projectiles.find(pr => pr.ownerId === p.id && pr.type === 'leaf_hurricane');
            if (proj) {
                // Cancel it
                proj.life = 0;
                // Optional: Reset cooldown or leave it? Leaving it prevents spam-toggling.
                // Standard: Cancel ends the effect, but cooldown remains or is set to a partial value.
                // For simplicity, just kill projectile.
                return;
            }
        }

        if (p.cooldowns.q > 0) return;

        // Spawn attached projectile
        game.projectiles.push({
            id: game.nextEntityId++,
            type: 'leaf_hurricane',
            pos: new Vec2(p.pos.x, p.pos.y), // Initial pos
            vel: new Vec2(0, 0), // Follows player
            ownerId: p.id,
            angle: 0,
            life: ROCK_LEE_CONSTANTS.LEAF_HURRICANE.DURATION,
            maxLife: ROCK_LEE_CONSTANTS.LEAF_HURRICANE.DURATION,
            radius: ROCK_LEE_CONSTANTS.LEAF_HURRICANE.RADIUS,
            state: 'flying',
            isAoe: true,
            damage: ROCK_LEE_CONSTANTS.LEAF_HURRICANE.MIN_DAMAGE
        });

        p.cooldowns.q = this.cooldown;
    }
}
