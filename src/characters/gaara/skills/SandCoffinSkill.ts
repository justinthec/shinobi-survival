import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../../../multiplayer-game";
import { PlayerState, ProjectileState } from "../../../types";
import { Skill } from "../../../skills/Skill";

export class SandCoffinSkill implements Skill {
    static readonly CAST_TIME = 20;
    static readonly SPEED = 12;
    static readonly LIFE = 60;
    static readonly RADIUS = 40;
    static readonly DAMAGE = 10;
    static readonly STUN_DURATION = 60; // 1 second

    readonly cooldown = 300;

    cast(game: ShinobiClashGame, p: PlayerState, input: DefaultInput, targetPos: Vec2) {
        if (p.cooldowns.q > 0) return;

        p.cooldowns.q = this.cooldown;
        p.casting = SandCoffinSkill.CAST_TIME;

        const ox = Math.cos(p.angle) * 30;
        const oy = Math.sin(p.angle) * 30;
        const pos = new Vec2(p.pos.x + ox, p.pos.y + oy);
        const vel = new Vec2(Math.cos(p.angle) * SandCoffinSkill.SPEED, Math.sin(p.angle) * SandCoffinSkill.SPEED);

        const proj: ProjectileState = {
            id: game.nextEntityId++,
            type: 'sand_coffin',
            pos: pos,
            vel: vel,
            ownerId: p.id,
            angle: p.angle,
            rotation: 0,
            life: SandCoffinSkill.LIFE,
            maxLife: SandCoffinSkill.LIFE,
            radius: SandCoffinSkill.RADIUS,
            state: 'flying',
            damage: SandCoffinSkill.DAMAGE
        };

        game.projectiles.push(proj);
    }
}
