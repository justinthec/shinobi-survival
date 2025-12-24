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

        // Calculate velocity towards mouse
        const dx = targetPos.x - p.pos.x;
        const dy = targetPos.y - p.pos.y;
        const len = Math.sqrt(dx*dx + dy*dy);
        const vx = (dx / len) * LeafHurricaneSkill.SPEED;
        const vy = (dy / len) * LeafHurricaneSkill.SPEED;

        // Create Projectile that acts as the "mover" and "damager"
        const proj: ProjectileState = {
            id: game.nextEntityId++,
            type: 'rock_lee_dive',
            pos: p.pos, // Shared reference to player pos so they move together?
            // WAIT: If I share the reference `p.pos`, updating proj.pos updates player?
            // NetplayJS Vec2 is mutable.
            // However, usually we want to explicitely set player pos in the update loop.
            // Better: The projectile has its own pos, and in update() we override player pos to match projectile.
            // Actually, let's keep them separate but sync them in the projectile logic.
            // If we set proj.pos = p.pos, it's a reference assignment.
            // Let's NOT share reference to avoid side effects if one is reassigned.
            // But we WANT them to stay synced.
            // safest is to update player pos in the Projectile's update method.

            // For initial spawn:
            vel: new Vec2(vx, vy),
            ownerId: p.id,
            angle: Math.atan2(vy, vx),
            life: LeafHurricaneSkill.DURATION,
            maxLife: LeafHurricaneSkill.DURATION,
            radius: 35, // Slightly larger than player
            state: 'flying',
            hitEntities: [], // Initialize empty hit list
            damage: LeafHurricaneSkill.DAMAGE
        };

        // Important: We need to set the projectile position to the player's CURRENT position (by value)
        // because we will update it.
        proj.pos = new Vec2(p.pos.x, p.pos.y);

        game.projectiles.push(proj);
    }
}
