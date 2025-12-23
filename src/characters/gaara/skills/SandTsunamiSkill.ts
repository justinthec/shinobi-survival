import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../../../multiplayer-game";
import { PlayerState, ProjectileState } from "../../../types";
import { Skill } from "../../../skills/Skill";

export class SandTsunamiSkill implements Skill {
    static readonly CAST_TIME = 30;
    static readonly SPEED = 5; // Slow moving wall
    static readonly LIFE = 150;
    static readonly RADIUS = 80;
    static readonly DAMAGE = 25;

    readonly cooldown = 600;

    cast(game: ShinobiClashGame, p: PlayerState, input: DefaultInput, targetPos: Vec2) {
        if (p.cooldowns.e > 0) return;

        p.cooldowns.e = this.cooldown;
        p.casting = SandTsunamiSkill.CAST_TIME;

        const ox = Math.cos(p.angle) * 40;
        const oy = Math.sin(p.angle) * 40;
        const pos = new Vec2(p.pos.x + ox, p.pos.y + oy);
        const vel = new Vec2(Math.cos(p.angle) * SandTsunamiSkill.SPEED, Math.sin(p.angle) * SandTsunamiSkill.SPEED);

        const proj: ProjectileState = {
            id: game.nextEntityId++,
            type: 'sand_tsunami',
            pos: pos,
            vel: vel,
            ownerId: p.id,
            angle: p.angle,
            rotation: 0,
            life: SandTsunamiSkill.LIFE,
            maxLife: SandTsunamiSkill.LIFE,
            radius: SandTsunamiSkill.RADIUS,
            state: 'flying',
            damage: SandTsunamiSkill.DAMAGE
        };

        game.projectiles.push(proj);
    }
}
