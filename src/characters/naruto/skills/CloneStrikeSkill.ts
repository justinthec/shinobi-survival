import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../../../multiplayer-game";
import { PlayerState, ProjectileState } from "../../../types";
import { Skill } from "../../../skills/Skill";

export class CloneStrikeSkill implements Skill {
    static readonly DAMAGE = 15;
    static readonly LIFE = 150;
    static readonly RADIUS = 25;

    readonly cooldown = 180;

    cast(game: ShinobiClashGame, p: PlayerState, input: DefaultInput, targetPos: Vec2) {
        if (p.cooldowns.e > 0) return;

        p.cooldowns.e = this.cooldown;

        const proj: ProjectileState = {
            id: game.nextEntityId++,
            type: 'clone_strike',
            pos: new Vec2(p.pos.x, p.pos.y),
            vel: new Vec2(0, 0),
            ownerId: p.id,
            angle: p.angle,
            rotation: 0,
            life: CloneStrikeSkill.LIFE,
            maxLife: CloneStrikeSkill.LIFE,
            radius: CloneStrikeSkill.RADIUS,
            state: 'flying',
            hp: 40,
            maxHp: 40,
            actionState: 'run',
            damage: CloneStrikeSkill.DAMAGE
        };

        game.projectiles.push(proj);
    }
}
