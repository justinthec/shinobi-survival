import { ShinobiClashGame } from "../../multiplayer-game";
import { ProjectileState, PlayerState } from "../../types";
import { ProjectileDefinition } from "../../core/interfaces";
import { CombatManager } from "../../managers/combat-manager";
import { ROCK_LEE_CONSTANTS } from "./constants";

export class LeafHurricaneProjectile implements ProjectileDefinition {
    update(game: ShinobiClashGame, proj: ProjectileState) {
        // Find owner to attach position
        const owner = game.players[proj.ownerId];
        if (owner && !owner.dead) {
            proj.pos.x = owner.pos.x;
            proj.pos.y = owner.pos.y;
        } else {
            // If owner dead, expire immediately
            proj.life = 0;
        }

        proj.life--;
        if (proj.life <= 0) {
            // CRITICAL FIX: Explicitly remove projectile from game array
            const idx = game.projectiles.indexOf(proj);
            if (idx !== -1) {
                game.projectiles.splice(idx, 1);
            }
        } else {
             // Collision Check
             // Use `rotation` field as a tick timer if available, or just use life % rate
             if (proj.life % ROCK_LEE_CONSTANTS.LEAF_HURRICANE.TICK_RATE === 0) {
                 CombatManager.checkCollision(game, proj);
             }
        }
    }

    render(ctx: CanvasRenderingContext2D, proj: ProjectileState, time: number) {
        ctx.save();
        ctx.translate(proj.pos.x, proj.pos.y);

        // Spin effect
        const rotation = (time * 0.5) % (Math.PI * 2);

        ctx.rotate(rotation);

        // Draw spiral/swirl - Scaled to Radius
        // Radius is now 80.
        const radius = proj.radius;

        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 255, 0, 0.6)";
        ctx.lineWidth = 4;

        // Draw 3 spiraling "legs" or wind slashes
        for(let i = 0; i < 3; i++) {
            ctx.rotate((Math.PI * 2) / 3);
            ctx.beginPath();
            // Start near center
            ctx.moveTo(0,0);
            // Curve out to radius
            // Control point for curve
            ctx.quadraticCurveTo(radius / 2, radius / 2, radius, 0);
            ctx.stroke();

            // Draw "Foot" at end for visual clarity of a kick
            ctx.fillStyle = "orange";
            ctx.beginPath();
            ctx.arc(radius, 0, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Outer faint circle for hitbox clarity
        ctx.strokeStyle = "rgba(0, 255, 0, 0.2)";
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    calculateDamage(game: ShinobiClashGame, proj: ProjectileState): number {
        // Scale with owner stats?
        const owner = game.players[proj.ownerId];
        const mult = owner ? owner.stats.damageMult : 1;
        return (proj.damage || 10) * mult;
    }
}
