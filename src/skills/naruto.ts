import { SkillLogic, SkillState } from "./types";
import { PlayerState } from "../types";
import type { ShinobiSurvivalGame } from "../multiplayer-game";
import { Vec2 } from "netplayjs";
import { SPRITES } from "../sprites";

export class UzumakiBarrageSkill implements SkillLogic {
    update(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        if (state.cooldown > 0) {
            state.cooldown -= dt;
        }
    }

    onPress(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.cooldown <= 0) {
            // Summon 16 clones in a circle and knockback
            const count = 16;
            const radius = 50;

            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const offset = new Vec2(Math.cos(angle) * radius, Math.sin(angle) * radius);
                const pos = new Vec2(player.pos.x + offset.x, player.pos.y + offset.y);

                // Visual: Spawn particle/clone
                // Short range burst: slow speed, short lifetime
                // Speed 50 (was 200), knockback high
                game.spawnProjectile(player.id, pos, angle, 50, 20 * player.stats.damageMult, 'clone_punch', 50 + player.stats.knockback, 99, 30);
                // Actually, design says "High kick outward".
                // Let's spawn a "kick" projectile or just apply AoE damage/knockback immediately.

                // Immediate AoE around player is better for "Get Off Me" tool.
            }

            // AoE Damage & Knockback
            for (const e of game.enemies) {
                const dist = Math.sqrt((player.pos.x - e.pos.x) ** 2 + (player.pos.y - e.pos.y) ** 2);
                if (dist < 150) { // Range
                    const dmg = 30 * player.stats.damageMult;
                    game.damageEnemy(e, dmg, player);

                    // Knockback away from player
                    const angle = Math.atan2(e.pos.y - player.pos.y, e.pos.x - player.pos.x);
                    e.push.x += Math.cos(angle) * 800; // Strong knockback
                    e.push.y += Math.sin(angle) * 800;
                }
            }

            game.spawnFloatingText(player.pos, "Uzumaki Barrage!", "orange");
            state.cooldown = 10.0 * player.stats.cooldownMult;
        }
    }

    onHold(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void { }
    onRelease(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void { }
    draw(ctx: CanvasRenderingContext2D, state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void { }
}

export class RasenganSkill implements SkillLogic {
    update(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        if (state.cooldown > 0) {
            state.cooldown -= dt;
        }
        // Manage invincibility during dash/charge
        if (player.skillCharging || player.dashTime > 0) {
            player.invincible = true;
        } else if (player.character === 'naruto' && player.ultActiveTime <= 0) {
            player.invincible = false;
        }
    }

    onPress(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.cooldown <= 0 || state.isCharging) {
            state.isCharging = true;
        }
    }

    onHold(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        if (state.cooldown <= 0 || state.isCharging) {
            state.isCharging = true;
            state.chargeTime = Math.min(state.chargeTime + dt, 1.5);

            // Update direction to face aim
            player.direction = Math.abs(player.aimAngle) > Math.PI / 2 ? -1 : 1;
            player.skillCharging = true; // Sync to player state for movement lock
            player.skillChargeTime = state.chargeTime; // Sync for visuals if needed elsewhere
            player.invincible = true; // Invincible while charging
        }
    }

    onRelease(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.chargeTime > 0) {
            // Release Charge -> Dash
            const chargeRatio = state.chargeTime / 1.5;
            const speed = 600;
            const baseDist = 75;
            const maxDist = 375;
            const distance = baseDist + (chargeRatio * (maxDist - baseDist));

            player.dashTime = distance / speed;
            player.dashHitList = [];

            // Use aimAngle which is updated from mouse input
            player.dashVec = new Vec2(Math.cos(player.aimAngle) * speed, Math.sin(player.aimAngle) * speed);

            // Reset charge
            state.chargeTime = 0;
            state.isCharging = false;
            state.cooldown = 5.0 * player.stats.cooldownMult;

            player.skillCharging = false;
            player.skillChargeTime = 0;
            player.invincible = true;

            // Store size for dash visual
            if (player.character === 'naruto' && player.charState) {
                (player.charState as any).rasenganSize = 1 + (chargeRatio * 2); // 1 to 3 scale
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D, state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        // Charging Visuals
        if (state.isCharging) {
            ctx.save();
            ctx.translate(player.pos.x, player.pos.y);

            // Calculate potential distance
            const chargeRatio = state.chargeTime / 1.5;
            const baseDist = 75;
            const maxDist = 375;
            const dist = baseDist + (chargeRatio * (maxDist - baseDist));

            // Draw Aim Line
            ctx.save();
            ctx.rotate(player.aimAngle);

            // Background line
            ctx.fillStyle = 'rgba(0, 210, 255, 0.2)';
            ctx.fillRect(0, -2, dist, 4);

            // Growing Ball
            const size = 1 + (state.chargeTime / 1.5) * 2;

            // Impact circle ghost
            ctx.beginPath();
            ctx.arc(dist, 0, size * 50 * 0.4, 0, Math.PI * 2); // Anticipated hit radius
            ctx.fillStyle = 'rgba(0, 210, 255, 0.3)';
            ctx.fill();
            ctx.restore();

            ctx.save();
            // Match dash visual scaling: dash uses size * 40. Sprite is 100px.
            // So scale = (size * 40) / 100 = size * 0.4
            const scale = size * 0.4;
            ctx.scale(scale, scale);
            // Rotate ball itself
            ctx.rotate(game.gameTime * 10);
            if (SPRITES.rasengan) ctx.drawImage(SPRITES.rasengan, -50, -50);
            ctx.restore();

            ctx.restore();
        }
    }
}

export class KuramaModeSkill implements SkillLogic {
    update(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        if (state.cooldown > 0) {
            state.cooldown -= dt;
        }

        if (state.activeTime > 0) {
            state.activeTime -= dt;
            player.ultActiveTime = state.activeTime; // Sync
            player.invincible = true;

            // Continuous Beam Damage
            const range = 2000;
            const p1 = player.pos;
            const p2 = { x: player.pos.x + Math.cos(player.aimAngle) * range, y: player.pos.y + Math.sin(player.aimAngle) * range };

            for (const e of game.enemies) {
                // Distance from point to line segment
                const l2 = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
                if (l2 == 0) continue;
                let t = ((e.pos.x - p1.x) * (p2.x - p1.x) + (e.pos.y - p1.y) * (p2.y - p1.y)) / l2;
                t = Math.max(0, Math.min(1, t));
                const proj = { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
                const dist = Math.sqrt((e.pos.x - proj.x) ** 2 + (e.pos.y - proj.y) ** 2);

                if (dist < 30) { // Beam width
                    if (e.dead) continue;
                    const dmg = 5 * player.stats.damageMult;
                    // Use game.damageEnemy
                    game.damageEnemy(e, dmg, player);
                }
            }
        } else {
            if (player.character === 'naruto' && !player.skillCharging && player.dashTime <= 0) {
                player.invincible = false;
            }
        }
    }

    onPress(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.cooldown <= 0) {
            state.activeTime = 6.0;
            state.cooldown = 25.0 * player.stats.cooldownMult;
            player.ultActiveTime = 6.0;
        }
    }

    onHold(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        // No hold effect
    }

    onRelease(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        // No release effect
    }

    draw(ctx: CanvasRenderingContext2D, state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.activeTime > 0) {
            ctx.save(); ctx.globalAlpha = 0.8;
            ctx.shadowBlur = 20; ctx.shadowColor = 'red';
            if (SPRITES.kurama) ctx.drawImage(SPRITES.kurama, player.pos.x - 150, player.pos.y - 180);

            // Draw Beam
            ctx.save();
            ctx.translate(player.pos.x, player.pos.y);
            ctx.rotate(player.aimAngle);
            const grd = ctx.createLinearGradient(0, -30, 0, 30);
            grd.addColorStop(0, "rgba(255, 0, 0, 0)");
            grd.addColorStop(0.5, "rgba(255, 200, 0, 0.9)");
            grd.addColorStop(1, "rgba(255, 0, 0, 0)");
            ctx.fillStyle = grd;
            ctx.fillRect(0, -30, 2000, 60);
            ctx.restore();
            ctx.shadowBlur = 0;
            ctx.restore();
        }
    }
}
