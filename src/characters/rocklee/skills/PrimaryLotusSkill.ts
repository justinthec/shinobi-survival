import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../../../multiplayer-game";
import { PlayerState, ProjectileState } from "../../../types";
import { Skill } from "../../../skills/Skill";

export class PrimaryLotusSkill implements Skill {
    static readonly BUFF_DURATION = 300; // 5 seconds (60fps)
    static readonly SPEED_MULT = 1.5; // +50%
    static readonly COOLDOWN = 900; // 15 seconds

    static readonly KICK_SPEED = 20;
    static readonly KICK_RANGE_FRAMES = 15; // 300 range
    static readonly KICK_DAMAGE = 35;
    static readonly STUN_DURATION = 60; // 1 second stun

    readonly cooldown = PrimaryLotusSkill.COOLDOWN;

    cast(game: ShinobiClashGame, p: PlayerState, input: DefaultInput, targetPos: Vec2) {
        // Check if Buff is active
        const buffState = p.skillStates['e'];

        if (buffState && buffState.active) {
            // PHASE 2: ATTACK
            // Consume Buff
            p.skillStates['e'] = { active: false };

            // Put on cooldown
            p.cooldowns.e = this.cooldown;

            // Fire Kick Projectile
            const dx = targetPos.x - p.pos.x;
            const dy = targetPos.y - p.pos.y;
            const len = Math.sqrt(dx*dx + dy*dy);
            const vx = (dx / len) * PrimaryLotusSkill.KICK_SPEED;
            const vy = (dy / len) * PrimaryLotusSkill.KICK_SPEED;

            const proj: ProjectileState = {
                id: game.nextEntityId++,
                type: 'lotus_kick',
                pos: new Vec2(p.pos.x, p.pos.y),
                vel: new Vec2(vx, vy),
                ownerId: p.id,
                angle: Math.atan2(vy, vx),
                life: PrimaryLotusSkill.KICK_RANGE_FRAMES,
                maxLife: PrimaryLotusSkill.KICK_RANGE_FRAMES,
                radius: 30,
                state: 'flying',
                damage: PrimaryLotusSkill.KICK_DAMAGE
            };

            game.projectiles.push(proj);

        } else {
            // PHASE 1: BUFF
            if (p.cooldowns.e > 0) return;

            // Activate Buff
            p.skillStates['e'] = {
                active: true,
                timer: PrimaryLotusSkill.BUFF_DURATION
            };

            // Minimal cooldown to prevent accidental double press?
            // No, user wants to press E then E. Instant is fine.
            // Maybe 10 frames just in case.
             p.cooldowns.e = 10;
        }
    }
}
