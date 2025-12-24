import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../../../multiplayer-game";
import { PlayerState, ProjectileState } from "../../../types";
import { Skill } from "../../../skills/Skill";

export class LeafHurricaneSkill implements Skill {
    static readonly DAMAGE = 15;
    static readonly COOLDOWN = 480; // 8 seconds
    static readonly SPEED = 15;
    static readonly DURATION = 20; // 20 frames * 15 speed = 300 range

    readonly cooldown = LeafHurricaneSkill.COOLDOWN;

    cast(game: ShinobiClashGame, p: PlayerState, input: DefaultInput, targetPos: Vec2) {
        if (p.cooldowns.q > 0) return;

        p.cooldowns.q = this.cooldown;

        // Calculate velocity and distance towards mouse
        const dx = targetPos.x - p.pos.x;
        const dy = targetPos.y - p.pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        // Duration based on distance / speed
        // Ensure at least 1 frame
        const duration = Math.max(1, Math.ceil(dist / LeafHurricaneSkill.SPEED));

        const vx = (dx / dist) * LeafHurricaneSkill.SPEED;
        const vy = (dy / dist) * LeafHurricaneSkill.SPEED;

        const proj: ProjectileState = {
            id: game.nextEntityId++,
            type: 'rock_lee_dive',
            pos: new Vec2(p.pos.x, p.pos.y),
            vel: new Vec2(vx, vy),
            ownerId: p.id,
            angle: Math.atan2(vy, vx),
            life: duration,
            maxLife: duration,
            radius: 35,
            state: 'flying',
            hitEntities: [],
            damage: LeafHurricaneSkill.DAMAGE
        };

        // Lock player for duration
        p.casting = duration;

        game.projectiles.push(proj);
    }
}
