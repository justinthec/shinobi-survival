import { ProjectileDefinition } from "../../core/interfaces";
import { ShinobiClashGame } from "../../multiplayer-game";
import { PlayerState, ProjectileState, PLAYER_RADIUS } from "../../types";
import { CombatManager } from "../../managers/combat-manager";
import { SPRITES } from "../../sprites";
import { Vec2 } from "netplayjs";

export class SandCoffinProjectile implements ProjectileDefinition {
    update(game: ShinobiClashGame, proj: ProjectileState) {
        proj.pos.x += proj.vel.x;
        proj.pos.y += proj.vel.y;
        proj.life--;

        const hit = CombatManager.checkCollision(game, proj);
        if (hit || proj.life <= 0) {
             const idx = game.projectiles.indexOf(proj);
             if (idx >= 0) game.projectiles.splice(idx, 1);
        }
    }

    render(ctx: CanvasRenderingContext2D, proj: ProjectileState, time: number) {
        ctx.save();
        ctx.translate(proj.pos.x, proj.pos.y);
        ctx.rotate(proj.angle + Math.PI/2);
        if (SPRITES.sand_hand_new instanceof HTMLCanvasElement) {
            ctx.drawImage(SPRITES.sand_hand_new, -60, -80);
        }
        ctx.restore();
    }

    onHit(game: ShinobiClashGame, target: PlayerState, proj: ProjectileState) {
        if (target.stunned !== undefined) {
             target.stunned = 60; // 1 second
             game.floatingTexts.push({
                 id: game.nextEntityId++,
                 pos: new Vec2(target.pos.x, target.pos.y - 60),
                 val: "ROOTED",
                 color: '#d35400',
                 life: 40, maxLife: 40, vy: 0.5
             });
        }
    }
}

export class SandTsunamiProjectile implements ProjectileDefinition {
    update(game: ShinobiClashGame, proj: ProjectileState) {
        proj.pos.x += proj.vel.x;
        proj.pos.y += proj.vel.y;
        proj.life--;

        if (!proj.hitEntities) proj.hitEntities = [];

        // Custom Collision for Piercing
        for (let id in game.players) {
            const target = game.players[id];
            if (target.id === proj.ownerId || target.dead) continue;

            if (proj.hitEntities.includes(target.id)) continue;

            const dist = Math.sqrt((target.pos.x - proj.pos.x) ** 2 + (target.pos.y - proj.pos.y) ** 2);
            if (dist < proj.radius + PLAYER_RADIUS) {
                // Hit
                proj.hitEntities.push(target.id);
                CombatManager.applyDamage(game, target, proj); // Applies damage & onHit
            }
        }

        if (proj.life <= 0) {
             const idx = game.projectiles.indexOf(proj);
             if (idx >= 0) game.projectiles.splice(idx, 1);
        }
    }

    render(ctx: CanvasRenderingContext2D, proj: ProjectileState, time: number) {
        ctx.save();
        ctx.translate(proj.pos.x, proj.pos.y);
        ctx.rotate(proj.angle + Math.PI/2);
        if (SPRITES.sand_tsunami_new instanceof HTMLCanvasElement) {
            ctx.drawImage(SPRITES.sand_tsunami_new, -80, -50);
        }
        ctx.restore();
    }

    onHit(game: ShinobiClashGame, target: PlayerState, proj: ProjectileState) {
        // Knockback
        const force = 40;
        const dx = target.pos.x - proj.pos.x;
        const dy = target.pos.y - proj.pos.y;
        const len = Math.sqrt(dx*dx + dy*dy) || 1;

        target.pos.x += (dx/len) * force;
        target.pos.y += (dy/len) * force;

        // Bounds check
        target.pos.x = Math.max(PLAYER_RADIUS, Math.min(1600 - PLAYER_RADIUS, target.pos.x));
        target.pos.y = Math.max(PLAYER_RADIUS, Math.min(1600 - PLAYER_RADIUS, target.pos.y));
    }
}
