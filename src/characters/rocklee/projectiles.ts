import { ProjectileDefinition } from "../../core/interfaces";
import { ShinobiClashGame } from "../../multiplayer-game";
import { ProjectileState, PLAYER_RADIUS, PlayerState } from "../../types";
import { CombatManager } from "../../managers/combat-manager";
import { Vec2 } from "netplayjs";

export class LeafHurricaneProjectile implements ProjectileDefinition {
    update(game: ShinobiClashGame, proj: ProjectileState) {
        // Move Projectile
        proj.pos.x += proj.vel.x;
        proj.pos.y += proj.vel.y;

        // Bounds Check (Clamp)
        proj.pos.x = Math.max(PLAYER_RADIUS, Math.min(1600 - PLAYER_RADIUS, proj.pos.x));
        proj.pos.y = Math.max(PLAYER_RADIUS, Math.min(1600 - PLAYER_RADIUS, proj.pos.y));

        // Sync Owner Position (The Dive)
        const owner = game.players[proj.ownerId];
        if (owner && !owner.dead) {
            owner.pos.x = proj.pos.x;
            owner.pos.y = proj.pos.y;
            // Also lock orientation?
            owner.angle = proj.angle;

            // Should we set 'casting' to lock input?
            owner.casting = 2; // Keep locked while projectile is alive
        } else {
            // Owner died or invalid, kill projectile
            proj.life = 0;
        }

        // Custom Collision Logic (Pass-through)
        this.checkPassThroughCollision(game, proj);

        proj.life--;
        if (proj.life <= 0) {
            this.remove(game, proj);
        }
    }

    private checkPassThroughCollision(game: ShinobiClashGame, proj: ProjectileState) {
        if (!proj.hitEntities) proj.hitEntities = [];

        for (let id in game.players) {
            const target = game.players[id];
            if (target.id === proj.ownerId) continue;
            if (target.dead) continue;

            // Skip if already hit
            if (proj.hitEntities.includes(target.id)) continue;

            const dist = Math.sqrt((target.pos.x - proj.pos.x) ** 2 + (target.pos.y - proj.pos.y) ** 2);
            if (dist < proj.radius + PLAYER_RADIUS) {
                // HIT
                CombatManager.applyDamage(game, target, proj);
                proj.hitEntities.push(target.id);

                // Visual Effect?
                // Small puff or hit spark
            }
        }
    }

    private remove(game: ShinobiClashGame, proj: ProjectileState) {
        const idx = game.projectiles.indexOf(proj);
        if (idx >= 0) game.projectiles.splice(idx, 1);
    }

    // Render handled by generic system? Or custom?
    // Since this is a "body slam" type move, maybe just a wind effect around the player.
    // The player is rendered by the character renderer at the projectile position.
    // We can add a "wind" visual.
    render(ctx: CanvasRenderingContext2D, proj: ProjectileState, time: number) {
        ctx.save();
        ctx.translate(proj.pos.x, proj.pos.y);
        ctx.rotate(proj.angle);

        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        // Draw some wind lines
        ctx.moveTo(-20, -20); ctx.lineTo(0, -25);
        ctx.moveTo(-20, 20); ctx.lineTo(0, 25);
        ctx.moveTo(-30, 0); ctx.lineTo(-10, 0);
        ctx.stroke();

        ctx.restore();
    }
}

export class LotusKickProjectile implements ProjectileDefinition {
    update(game: ShinobiClashGame, proj: ProjectileState) {
        proj.pos.x += proj.vel.x;
        proj.pos.y += proj.vel.y;

        // Custom Collision for Single Target Hit + Stun
        let hit = false;

        for (let id in game.players) {
            const target = game.players[id];
            if (target.id === proj.ownerId) continue;
            if (target.dead) continue;

            const dist = Math.sqrt((target.pos.x - proj.pos.x) ** 2 + (target.pos.y - proj.pos.y) ** 2);
            if (dist < proj.radius + PLAYER_RADIUS) {
                this.applyLotusHit(game, target, proj);
                hit = true;
                break; // Stop on first hit
            }
        }

        if (hit) {
            proj.life = 0;
        } else {
            proj.life--;
        }

        if (proj.life <= 0) {
            const idx = game.projectiles.indexOf(proj);
            if (idx >= 0) game.projectiles.splice(idx, 1);
        }
    }

    private applyLotusHit(game: ShinobiClashGame, target: PlayerState, proj: ProjectileState) {
        // Deal Damage
        CombatManager.applyDamage(game, target, proj);

        // Apply Stun (Knock Up)
        // We use 'casting' as a stun lock for now, or we can add a 'stunned' field if we want proper status.
        // Memory says: "PlayerState includes a stunned property (frame counter) which CombatManager.processInput checks"
        // Let me check PlayerState in types.ts again...
        // ... I checked types.ts in Step 1. It had `casting: number;` and `dead: boolean;`.
        // I did NOT see `stunned`.
        // Let me re-read types.ts content from history.
        // "casting: number; // Frames remaining for cast lock"
        // "processInput ... if (p.casting > 0) ... return; // Stunned while casting"
        // So `casting` acts as a generic input lock / stun.
        target.casting = 60; // 1 second stun

        // Spawn Visual "Smash" Effect (LotusSmashProjectile)
        const smash: ProjectileState = {
            id: game.nextEntityId++,
            type: 'lotus_smash',
            pos: new Vec2(target.pos.x, target.pos.y),
            vel: new Vec2(0, 0),
            ownerId: proj.ownerId,
            angle: 0,
            life: 30,
            maxLife: 30,
            radius: 50,
            state: 'exploding'
        };
        game.projectiles.push(smash);
    }

    render(ctx: CanvasRenderingContext2D, proj: ProjectileState, time: number) {
        // Draw a fast kick blur?
        ctx.save();
        ctx.translate(proj.pos.x, proj.pos.y);
        ctx.rotate(proj.angle);

        ctx.fillStyle = 'rgba(0, 200, 0, 0.7)';
        ctx.beginPath();
        // A "kick" shape or impact line
        ctx.moveTo(0, -10);
        ctx.lineTo(20, 0);
        ctx.lineTo(0, 10);
        ctx.fill();

        ctx.restore();
    }
}

export class LotusSmashProjectile implements ProjectileDefinition {
    // Purely Visual
    update(game: ShinobiClashGame, proj: ProjectileState) {
        proj.life--;
        if (proj.life <= 0) {
            const idx = game.projectiles.indexOf(proj);
            if (idx >= 0) game.projectiles.splice(idx, 1);
        }
    }

    render(ctx: CanvasRenderingContext2D, proj: ProjectileState, time: number) {
        ctx.save();
        ctx.translate(proj.pos.x, proj.pos.y);
        const ratio = 1 - (proj.life / proj.maxLife);

        ctx.globalAlpha = 1 - ratio;
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 5;

        // Crater / Smash effect
        ctx.beginPath();
        ctx.ellipse(0, 0, 30 * ratio, 15 * ratio, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Upward spikes
        ctx.fillStyle = '#eee';
        for(let i=0; i<5; i++) {
            const a = (Math.PI * 2 * i) / 5 + ratio;
            const dist = 30 * ratio;
            ctx.fillRect(Math.cos(a)*dist, Math.sin(a)*dist, 5, 5);
        }

        ctx.restore();
    }
}
