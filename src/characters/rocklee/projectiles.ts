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

        // Quadratic Windup Rotation
        // Progress goes from 0.0 (start) to 1.0 (end)
        // life counts DOWN from maxLife to 0.
        const maxLife = proj.maxLife || ROCK_LEE_CONSTANTS.LEAF_HURRICANE.DURATION;
        const progress = 1 - (Math.max(0, proj.life) / maxLife);

        // Total rotations we want over the duration (e.g., 4 full spins)
        // If speed winds up linearly, angle scales with square of time.
        // Angle = k * t^2
        const totalSpins = 5;
        const rotation = (totalSpins * Math.PI * 2) * (progress * progress);

        ctx.rotate(rotation);

        const radius = proj.radius;

        // 1. Green Sweep/Blur (The "Kick" trail)
        // Opacity increases with speed (progress)
        const opacity = 0.1 + (0.3 * progress);
        const gradient = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
        gradient.addColorStop(0, "rgba(0, 255, 0, 0)");
        gradient.addColorStop(0.5, `rgba(0, 255, 0, ${opacity * 0.3})`);
        gradient.addColorStop(1, `rgba(0, 255, 0, ${opacity})`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        // 2. Wind Lines - More dynamic
        // Intensity scales with progress
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 + 0.4 * progress})`;
        ctx.lineWidth = 2 + 2 * progress;

        const numLines = 3 + Math.floor(progress * 4); // More lines as it gets faster

        for(let i = 0; i < numLines; i++) {
            ctx.save();
            // Offset rotation for lines so they don't look static relative to each other
            ctx.rotate((Math.PI * 2 * i) / numLines + Math.sin(time * 0.1 + i));

            ctx.beginPath();
            const rOffset = Math.sin(time * 0.2 + i * 10) * 10;
            // Arc length increases with speed
            const arcLen = Math.PI * (0.3 + 0.5 * progress);
            ctx.arc(0, 0, radius * 0.7 + rOffset, 0, arcLen);
            ctx.stroke();
            ctx.restore();
        }

        // 3. Dust Particles
        // More particles at high speed
        if (progress > 0.3) {
            ctx.fillStyle = "rgba(200, 200, 200, 0.5)";
            for(let j = 0; j < 6; j++) {
                ctx.save();
                const angleOffset = (Math.PI * 2 * j) / 6;
                ctx.rotate(angleOffset);

                // Particles spiral out?
                const dist = radius * 0.9 + Math.sin(time * 0.5 + j) * 5;
                const size = (2 + Math.sin(time * 0.3 + j) * 2) * progress;

                ctx.beginPath();
                ctx.arc(dist, 0, size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Faint outer boundary
        ctx.strokeStyle = "rgba(50, 205, 50, 0.3)";
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    calculateDamage(game: ShinobiClashGame, proj: ProjectileState): number {
        // Calculate progress
        const maxLife = proj.maxLife || ROCK_LEE_CONSTANTS.LEAF_HURRICANE.DURATION;
        const progress = 1 - (Math.max(0, proj.life) / maxLife);

        // Linear Interpolation: Min -> Max
        const minDmg = ROCK_LEE_CONSTANTS.LEAF_HURRICANE.MIN_DAMAGE;
        const maxDmg = ROCK_LEE_CONSTANTS.LEAF_HURRICANE.MAX_DAMAGE;

        const rawDmg = minDmg + (maxDmg - minDmg) * progress;

        const owner = game.players[proj.ownerId];
        const mult = owner ? owner.stats.damageMult : 1;
        return rawDmg * mult;
    }
}
