import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../../multiplayer-game";
import { PlayerState } from "../../types";
import { Skill } from "../../skills/Skill";

export class DiveSkill implements Skill {
    readonly cooldown = 480; // 8 seconds

    cast(game: ShinobiClashGame, p: PlayerState, input: DefaultInput, targetPos: Vec2) {
        if (p.cooldowns.e > 0) return;

        // Calculate vector to target
        const dx = targetPos.x - p.pos.x;
        const dy = targetPos.y - p.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 1) return;

        const speed = 25; // Fast dive
        const timeToReach = Math.ceil(dist / speed);

        p.cooldowns.e = this.cooldown;

        // Use dash state for movement
        p.dash = {
            active: true,
            life: timeToReach,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed
        };

        // Visuals
         game.particles.push({
            id: game.nextEntityId++,
            type: 'smoke',
            pos: new Vec2(p.pos.x, p.pos.y),
            vel: new Vec2(0, 0),
            life: 20, maxLife: 20, color: 'white', size: 10
        });
    }
}
