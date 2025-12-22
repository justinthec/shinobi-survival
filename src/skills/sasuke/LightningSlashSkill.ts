import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../../multiplayer-game";
import { PlayerState, ProjectileState } from "../../types";
import { Skill } from "../Skill";

export class LightningSlashSkill implements Skill {
    static readonly DAMAGE = 25;
    static readonly LIFE = 10;
    static readonly RADIUS = 100;
    static readonly CAST_TIME = 20;

    readonly cooldown = 30;

    cast(game: ShinobiClashGame, p: PlayerState, input: DefaultInput, targetPos: Vec2) {
        if (p.cooldowns.q > 0) return;

        p.cooldowns.q = this.cooldown;
        p.casting = LightningSlashSkill.CAST_TIME;

        const ox = Math.cos(p.angle) * 50;
        const oy = Math.sin(p.angle) * 50;

        const proj: ProjectileState = {
            id: game.nextEntityId++,
            type: 'lightning_slash',
            pos: new Vec2(p.pos.x + ox, p.pos.y + oy),
            vel: new Vec2(0, 0),
            ownerId: p.id,
            angle: p.angle,
            rotation: p.angle,
            life: LightningSlashSkill.LIFE,
            maxLife: LightningSlashSkill.LIFE,
            radius: LightningSlashSkill.RADIUS,
            state: 'flying'
        };

        game.projectiles.push(proj);
    }
}
