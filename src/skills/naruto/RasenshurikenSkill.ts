import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../../multiplayer-game";
import { PlayerState, ProjectileState } from "../../types";
import { Skill } from "../Skill";

export class RasenshurikenSkill implements Skill {
    static readonly DAMAGE = 60;
    static readonly EXPLOSION_DAMAGE = 5;
    static readonly RADIUS = 32;
    static readonly EXPLOSION_RADIUS = 100;
    static readonly EXPLOSION_LIFE = 80;
    static readonly SPEED = 9;
    static readonly LIFE = 120;
    static readonly CAST_TIME = 20;

    readonly cooldown = 240;

    cast(game: ShinobiClashGame, p: PlayerState, input: DefaultInput, targetPos: Vec2) {
        if (p.cooldowns.q > 0) return;

        p.cooldowns.q = this.cooldown;
        p.casting = RasenshurikenSkill.CAST_TIME;

        const ox = Math.cos(p.angle) * 30;
        const oy = Math.sin(p.angle) * 30;
        const pos = new Vec2(p.pos.x + ox, p.pos.y + oy);
        const vel = new Vec2(Math.cos(p.angle) * RasenshurikenSkill.SPEED, Math.sin(p.angle) * RasenshurikenSkill.SPEED);

        const proj: ProjectileState = {
            id: game.nextEntityId++,
            type: 'rasenshuriken',
            pos: pos,
            vel: vel,
            ownerId: p.id,
            angle: p.angle,
            rotation: 0,
            life: RasenshurikenSkill.LIFE,
            maxLife: RasenshurikenSkill.LIFE,
            radius: RasenshurikenSkill.RADIUS,
            state: 'flying',
            damage: RasenshurikenSkill.DAMAGE
        };

        game.projectiles.push(proj);
    }
}
