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
            const idx = game.projectiles.indexOf(proj);
            if (idx !== -1) {
                game.projectiles.splice(idx, 1);
            }
        } else {
             // Collision Check
             if (proj.life % ROCK_LEE_CONSTANTS.LEAF_HURRICANE.TICK_RATE === 0) {
                 CombatManager.checkCollision(game, proj);
             }
        }
    }

    render(ctx: CanvasRenderingContext2D, proj: ProjectileState, time: number) {
        ctx.save();
        ctx.translate(proj.pos.x, proj.pos.y);

        // Spin logic - match Character spin mostly
        const rotation = (time * 0.4) % (Math.PI * 2);
        ctx.rotate(rotation);

        const radius = proj.radius;

        // 1. Green Sweep/Blur (The "Kick" trail)
        // Draw a semi-transparent green arc trailing the "leg"
        const gradient = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
        gradient.addColorStop(0, "rgba(0, 255, 0, 0)");
        gradient.addColorStop(0.5, "rgba(0, 255, 0, 0.1)");
        gradient.addColorStop(1, "rgba(0, 255, 0, 0.3)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        // Assume leg is at angle 0 relative to context rotation
        // Draw a wide arc
        ctx.moveTo(0,0);
        ctx.arc(0, 0, radius, 0, Math.PI * 2); // Full circle sweep for "Hurricane" feel
        ctx.fill();

        // 2. Wind Lines - More dynamic
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 2;

        for(let i = 0; i < 5; i++) {
            ctx.save();
            ctx.rotate((Math.PI * 2 * i) / 5 + Math.sin(time * 0.1 + i)); // Varying rotation

            ctx.beginPath();
            // Spiral-ish lines
            const rOffset = Math.sin(time * 0.2 + i * 10) * 10;
            ctx.arc(0, 0, radius * 0.7 + rOffset, 0, Math.PI * 0.6);
            ctx.stroke();
            ctx.restore();
        }

        // 3. Dust Particles - Cloud effect
        ctx.fillStyle = "rgba(200, 200, 200, 0.5)";
        for(let j = 0; j < 8; j++) {
            ctx.save();
            // Random-ish placement that rotates
            const angleOffset = (Math.PI * 2 * j) / 8;
            ctx.rotate(angleOffset);

            const dist = radius * 0.9 + Math.sin(time * 0.5 + j) * 5;
            const size = 3 + Math.sin(time * 0.3 + j) * 2;

            ctx.beginPath();
            ctx.arc(dist, 0, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Faint outer boundary
        ctx.strokeStyle = "rgba(50, 205, 50, 0.3)";
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
