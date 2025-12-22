import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../../multiplayer-game";
import { PlayerState } from "../../types";
import { Skill } from "../Skill";

export class TeleportSkill implements Skill {
    static readonly RANGE = 300;

    readonly cooldown = 720;

    cast(game: ShinobiClashGame, p: PlayerState, input: DefaultInput, targetPos: Vec2) {
        if (p.cooldowns.e > 0) return;

        p.cooldowns.e = this.cooldown;

        const maxRange = TeleportSkill.RANGE;
        const dx = targetPos.x - p.pos.x;
        const dy = targetPos.y - p.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let tx = targetPos.x;
        let ty = targetPos.y;

        if (dist > maxRange) {
            const angle = Math.atan2(dy, dx);
            tx = p.pos.x + Math.cos(angle) * maxRange;
            ty = p.pos.y + Math.sin(angle) * maxRange;
        }

        // Clamp to map bounds (hardcoded in original as 20..1600-20)
        // Ideally should come from MapState but for now hardcode to match
        const bounds = 1600 - 20;
        tx = Math.max(20, Math.min(bounds, tx));
        ty = Math.max(20, Math.min(bounds, ty));

        // Particles at start
        game.particles.push({
            id: game.nextEntityId++,
            type: 'teleport',
            pos: new Vec2(p.pos.x, p.pos.y),
            vel: new Vec2(0, 0),
            life: 20, maxLife: 20, color: '#8A2BE2', size: 10
        });

        // Move
        p.pos.x = tx;
        p.pos.y = ty;

        // Particles at end
        game.particles.push({
            id: game.nextEntityId++,
            type: 'teleport',
            pos: new Vec2(p.pos.x, p.pos.y),
            vel: new Vec2(0, 0),
            life: 20, maxLife: 20, color: '#8A2BE2', size: 10
        });
    }
}
