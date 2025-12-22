import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../../multiplayer-game";
import { PlayerState, ProjectileState } from "../../types";
import { Skill } from "../Skill";

export class LightningSlashSkill implements Skill {
    static readonly DAMAGE = 40;
    static readonly LIFE = 2; // Logic duration (1 tick + 1 draw frame)
    static readonly VISUAL_LIFE = 15;
    static readonly RADIUS = 125;
    static readonly CAST_TIME = 20;

    readonly cooldown = 30;

    cast(game: ShinobiClashGame, p: PlayerState, input: DefaultInput, targetPos: Vec2) {
        if (p.cooldowns.q > 0) return;

        p.cooldowns.q = this.cooldown;
        p.casting = LightningSlashSkill.CAST_TIME;

        // 1. Logic Projectile (Invisible damage source)
        const proj: ProjectileState = {
            id: game.nextEntityId++,
            type: 'lightning_slash',
            pos: new Vec2(p.pos.x, p.pos.y),
            vel: new Vec2(0, 0),
            ownerId: p.id,
            angle: p.angle,
            rotation: p.angle,
            life: LightningSlashSkill.LIFE,
            maxLife: LightningSlashSkill.LIFE, // Explicitly set for collision check
            radius: LightningSlashSkill.RADIUS,
            state: 'flying',
            damage: LightningSlashSkill.DAMAGE
        };
        game.projectiles.push(proj);

        // 2. Visual Particle (Lingering effect)
        game.particles.push({
            id: game.nextEntityId++,
            type: 'slash',
            pos: new Vec2(p.pos.x, p.pos.y),
            vel: new Vec2(0, 0),
            life: LightningSlashSkill.VISUAL_LIFE,
            maxLife: LightningSlashSkill.VISUAL_LIFE,
            color: 'white', // Handled by renderer mostly
            size: LightningSlashSkill.RADIUS,
            rotation: p.angle
        });
    }
}
