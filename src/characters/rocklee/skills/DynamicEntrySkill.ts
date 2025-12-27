import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../../../multiplayer-game";
import { PlayerState } from "../../../types";
import { Skill } from "../../../skills/Skill";
import { ROCK_LEE_CONSTANTS } from "../constants";

export class DynamicEntrySkill implements Skill {
    id = "dynamic_entry";
    type = "active";
    name = "Dynamic Entry";
    description = "Dive towards cursor location.";
    icon = "dynamic_entry";
    cooldown = ROCK_LEE_CONSTANTS.DYNAMIC_ENTRY.COOLDOWN;

    cast(game: ShinobiClashGame, p: PlayerState, input: DefaultInput, targetPos: Vec2) {
        if (p.cooldowns.e > 0) return;

        // Calculate vector to target
        const dx = targetPos.x - p.pos.x;
        const dy = targetPos.y - p.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= 0) return;

        // Calculate time to reach target at set speed
        // Speed = dist / time -> time = dist / Speed
        const speed = ROCK_LEE_CONSTANTS.DYNAMIC_ENTRY.SPEED;
        const time = Math.ceil(dist / speed);

        // Set dash state to move exactly there
        p.dash.active = true;
        p.dash.vx = (dx / dist) * speed;
        p.dash.vy = (dy / dist) * speed;
        p.dash.life = time;

        p.cooldowns.e = this.cooldown;
        p.angle = Math.atan2(dy, dx); // Face target

        // Store target for rendering and mark the type of dash
        p.skillStates['dynamic_entry'] = {
            target: new Vec2(targetPos.x, targetPos.y)
        };
        p.skillStates['active_dash_skill'] = { type: 'dynamic_entry' };
    }
}
