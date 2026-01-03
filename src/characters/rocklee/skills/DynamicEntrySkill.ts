import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../../../multiplayer-game";
import { PlayerState } from "../../../types";
import { Skill } from "../../../skills/Skill";
import { ROCK_LEE_CONSTANTS } from "../constants";

export class DynamicEntrySkill implements Skill {
    readonly name = "Dynamic Entry";
    readonly description = "Flying kick towards target. Stuns on impact.";
    readonly cooldown = ROCK_LEE_CONSTANTS.DYNAMIC_ENTRY.COOLDOWN;

    cast(game: ShinobiClashGame, p: PlayerState, input: DefaultInput, targetPos: Vec2) {
        if (p.cooldowns.e > 0) return;

        p.cooldowns.e = this.cooldown;

        const dx = targetPos.x - p.pos.x;
        const dy = targetPos.y - p.pos.y;
        const angle = Math.atan2(dy, dx);
        p.angle = angle; // Face target

        // Spawn Projectile to manage the dash (Windup -> Move)
        game.projectiles.push({
            id: game.nextEntityId++,
            type: 'dynamic_entry',
            pos: new Vec2(p.pos.x, p.pos.y),
            vel: new Vec2(0, 0), // Will be set after windup
            ownerId: p.id,
            angle: angle,
            life: ROCK_LEE_CONSTANTS.DYNAMIC_ENTRY.WINDUP, // Use life for windup timer first
            maxLife: ROCK_LEE_CONSTANTS.DYNAMIC_ENTRY.WINDUP,
            radius: 0, // No hit during windup
            state: 'flying',
            actionState: 'windup',
            damage: 0
        });

        // Init skill state for UI/Render to know something is happening?
        // Projectile will set 'active' during dash.
        // We can set it here too if we want immediate feedback (e.g. windup pose).
        p.skillStates['dynamic_entry'] = {
            target: new Vec2(targetPos.x, targetPos.y),
            active: false // Will be true when dashing
        };
        // We don't set 'active_dash_skill' here because p.dash is not used.
        // Instead RockLeeCharacter.render checks skillStates['dynamic_entry'].active
    }
}
