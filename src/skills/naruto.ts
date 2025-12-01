import { SkillLogic, SkillState } from "./types";
import { PlayerState } from "../types";
import type { ShinobiSurvivalGame } from "../multiplayer-game";
import { Vec2 } from "netplayjs";
import { SPRITES } from "../sprites";

export class RasenganSkill implements SkillLogic {
    update(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        if (state.cooldown > 0) {
            state.cooldown -= dt;
        }
    }

    onPress(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.cooldown <= 0 || state.isCharging) {
            state.isCharging = true;
            // Initialize charge time if starting fresh
            // But we actually handle accumulation in onHold
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

            // Impact circle ghost
            ctx.beginPath();
            ctx.arc(dist, 0, 50, 0, Math.PI * 2); // Anticipated hit radius
            ctx.fillStyle = 'rgba(0, 210, 255, 0.3)';
            ctx.fill();
            ctx.restore();

            // Growing Ball
            const size = 1 + (state.chargeTime / 1.5) * 2;
            ctx.save();
            ctx.scale(size, size);
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
                    e.hp -= dmg;
                    if (Math.random() < 0.3) game.spawnFloatingText(e.pos, Math.ceil(dmg).toString(), 'white');
                    if (e.hp <= 0) {
                        e.dead = true;
                        game.xpOrbs.push({
                            id: game.nextEntityId++,
                            pos: new Vec2(e.pos.x, e.pos.y),
                            val: 10,
                            dead: false
                        });
                    }
                }
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
