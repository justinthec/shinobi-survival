import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../../multiplayer-game";
import { PlayerState, ProjectileState } from "../../types";
import { Skill } from "../Skill";

export class LightningSlashSkill implements Skill {
    static readonly DAMAGE = 25;
    static readonly LIFE = 15; // Visual duration
    static readonly RADIUS = 125;
    static readonly CAST_TIME = 20;

    readonly cooldown = 30;

    cast(game: ShinobiClashGame, p: PlayerState, input: DefaultInput, targetPos: Vec2) {
        if (p.cooldowns.q > 0) return;

        p.cooldowns.q = this.cooldown;
        p.casting = LightningSlashSkill.CAST_TIME;

        // Position fixed to player for the sector check
        const proj: ProjectileState = {
            id: game.nextEntityId++,
            type: 'lightning_slash',
            pos: new Vec2(p.pos.x, p.pos.y),
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
