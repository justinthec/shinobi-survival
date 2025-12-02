import { SkillLogic, SkillState, CharacterLogic } from "./types";
import { PlayerState } from "../types";
import type { ShinobiSurvivalGame } from "../multiplayer-game";
import { Vec2 } from "netplayjs";
import { SPRITES } from "../sprites";

export class FireballSkill implements SkillLogic {
    update(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        if (state.cooldown > 0) {
            state.cooldown -= dt;
        }
    }

    onPress(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.cooldown <= 0) {
            // Fireball Projectile
            // We use spawnProjectile from game, but we need a custom type 'fireball'
            // which handles pushback and burn on hit.
            // Since spawnProjectile is generic, we can use 'fireball' type and handle collision logic in game loop if needed,
            // OR we can spawn a custom entity here?
            // The game loop handles 'fireball' type? 
            // In multiplayer-game.ts, spawnProjectile takes type string.
            // And collision logic is generic: damageEnemy(e, proj.dmg, owner).
            // But we need pushback and burn.
            // damageEnemy handles damage.
            // Pushback is handled by projectile 'knock' parameter.
            // Burn? We don't have burn status yet.
            // Let's just use high knockback and damage for now.

            const speed = 500;
            const dmg = 20 * player.stats.damageMult;
            const knock = 20 + player.stats.knockback; // High knockback

            // Spawn projectile
            // Use 'fireball' type. We added fallback drawing in multiplayer-game.ts
            game.spawnProjectile(player.id, player.pos, player.aimAngle, speed, dmg, 'fireball', knock, 1); // Pierce 1

            state.cooldown = 6.0 * player.stats.cooldownMult;
        }
    }

    onHold(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void { }
    onRelease(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void { }
    draw(ctx: CanvasRenderingContext2D, state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void { }
}

export class RinneganSwapSkill implements SkillLogic {
    update(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        if (state.cooldown > 0) {
            state.cooldown -= dt;
        }
    }

    onPress(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.cooldown <= 0) {
            // Find furthest enemy
            let furthestE = null;
            let maxDist = 0;

            for (const e of game.enemies) {
                const d = Math.sqrt((player.pos.x - e.pos.x) ** 2 + (player.pos.y - e.pos.y) ** 2);
                if (d > maxDist && d < 600) { // Limit range to screen-ish? Or global?
                    // Let's say max range 600 for gameplay balance
                    maxDist = d;
                    furthestE = e;
                }
            }

            if (furthestE) {
                // Teleport
                // Visual effect at old pos
                game.spawnFloatingText(player.pos, "Swap!", "purple");

                // Move player
                player.pos.x = furthestE.pos.x;
                player.pos.y = furthestE.pos.y;

                // Damage/Kill Enemy
                const dmg = 100 * player.stats.damageMult; // Massive damage
                game.damageEnemy(furthestE, dmg, player);

                // Visual at new pos
                // Maybe spawn a particle?

                state.cooldown = 12.0 * player.stats.cooldownMult;
            }
        }
    }

    onHold(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void { }
    onRelease(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void { }
    draw(ctx: CanvasRenderingContext2D, state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void { }
}

export class KirinSkill implements SkillLogic {
    update(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        if (state.cooldown > 0) {
            state.cooldown -= dt;
        }
        if (state.activeTime > 0) {
            state.activeTime -= dt;
            // Dragon Fall Animation / Delay
            if (state.activeTime <= 0.1) {
                // Impact!
                // We stored targetPos in state.customState? No, we don't have customState on SkillState.
                // We can use player.targetPos if we assume player hasn't moved mouse much?
                // Or we need to store it.
                // Actually, let's just trigger impact immediately on release for responsiveness, 
                // or handle the delay in draw/logic.
                // Let's do immediate impact logic but visual delay?
                // No, user wants "Dragon drops down".
                // We'll handle impact in onRelease for now to simplify state.
            }
        }
    }

    onPress(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.cooldown <= 0) {
            state.isCharging = true;
            state.chargeTime = 0;
        }
    }

    onHold(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        if (state.isCharging) {
            state.chargeTime += dt;
            // Cap charge?
            if (state.chargeTime > 2.0) state.chargeTime = 2.0;
        }
    }

    onRelease(state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        if (state.isCharging) {
            state.isCharging = false;

            // Trigger Kirin at targetPos
            const target = player.targetPos; // Use the mouse target we added

            // Damage Logic
            // AoE Damage
            const radius = 100 + (state.chargeTime * 50); // Grow with charge
            const dmg = 200 + (state.chargeTime * 100); // Grow with charge

            // Visual: Lightning Strike
            // We can spawn a 'kirin_strike' particle or handle in draw
            // Let's use activeTime for visual duration
            state.activeTime = 0.5;
            state.cooldown = 40.0 * player.stats.cooldownMult;

            // Apply Damage
            for (const e of game.enemies) {
                const dist = Math.sqrt((target.x - e.pos.x) ** 2 + (target.y - e.pos.y) ** 2);
                if (dist < radius) {
                    game.damageEnemy(e, dmg * player.stats.damageMult, player);
                    // Stun? We have stunTimer in EnemyState
                    e.stunTimer = 2.0;
                }
            }

            // Visual Effect (Screen Flash / Particle)
            game.spawnFloatingText(target, "KIRIN!", "cyan");
        }
    }

    draw(ctx: CanvasRenderingContext2D, state: SkillState, player: PlayerState, game: ShinobiSurvivalGame): void {
        // Charging Indicator
        if (state.isCharging) {
            const target = player.targetPos;
            const radius = 100 + (state.chargeTime * 50);

            ctx.save();
            ctx.translate(target.x, target.y);

            // Expanding Circle
            ctx.strokeStyle = `rgba(0, 255, 255, ${0.5 + Math.sin(game.gameTime * 10) * 0.2})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.stroke();

            // Inner filling
            ctx.fillStyle = `rgba(0, 255, 255, ${state.chargeTime / 4})`;
            ctx.fill();

            ctx.restore();
        }

        // Strike Visual (Dragon)
        if (state.activeTime > 0) {
            const target = player.targetPos;
            const progress = Math.max(0, (0.5 - state.activeTime) / 0.2); // 0 to 1 over 0.2s

            ctx.save();
            ctx.translate(target.x, target.y);

            // Flash
            if (state.activeTime > 0.4) {
                ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
                ctx.fillRect(-1000, -1000, 2000, 2000);
            }

            // Dragon Logic
            const startY = -800;
            const endY = 0;
            const currentY = startY + (endY - startY) * Math.min(progress, 1);

            // Draw Dragon Head & Body
            ctx.save();
            ctx.translate(0, currentY);

            // Glow
            ctx.shadowBlur = 30;
            ctx.shadowColor = "cyan";
            ctx.strokeStyle = "cyan";
            ctx.fillStyle = "#e0ffff";
            ctx.lineWidth = 5;

            // Head shape
            ctx.beginPath();
            ctx.moveTo(0, 0); // Nose

            ctx.lineTo(-20, -30);
            ctx.lineTo(-10, -50); // Horn
            ctx.lineTo(-30, -80); // Horn tip
            ctx.lineTo(-10, -60);
            ctx.lineTo(10, -60);
            ctx.lineTo(30, -80); // Horn tip
            ctx.lineTo(10, -50);
            ctx.lineTo(20, -30);
            ctx.lineTo(0, 0);
            ctx.fill();
            ctx.stroke();

            // Eyes
            ctx.fillStyle = "red";
            ctx.beginPath(); ctx.arc(-10, -35, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(10, -35, 3, 0, Math.PI * 2); ctx.fill();

            // Long Body trailing up
            ctx.strokeStyle = "cyan";
            ctx.lineWidth = 15;
            ctx.beginPath();
            ctx.moveTo(0, -60);

            let x = 0;
            for (let y = -60; y > -1000; y -= 40) {
                x = Math.sin(y * 0.01 + game.gameTime * 20) * 50;
                ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Lightning Sparks around
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const ox = (Math.random() - 0.5) * 200;
                const oy = (Math.random() - 0.5) * 200 - 100;
                ctx.moveTo(ox, oy);
                ctx.lineTo(ox + (Math.random() - 0.5) * 50, oy + (Math.random() - 0.5) * 50);
            }
            ctx.stroke();

            ctx.restore();

            // Impact Splash (only when hit ground)
            if (progress >= 1) {
                ctx.fillStyle = "rgba(0, 255, 255, 0.5)";
                ctx.beginPath();
                ctx.arc(0, 0, 150 * (state.activeTime / 0.3), 0, Math.PI * 2); // Fade out radius
                ctx.fill();
            }

            ctx.restore();
        }
    }
}

export class SasukeLogic implements CharacterLogic {
    updatePassives(player: PlayerState, game: ShinobiSurvivalGame, dt: number): void {
        if (player.dead) return;

        if (player.character === 'sasuke' && player.charState) {
            if ('dodgeBuffTimer' in player.charState && player.charState.dodgeBuffTimer > 0) {
                player.charState.dodgeBuffTimer -= dt;
                player.stats.critChance = 0.5;
            } else {
                player.stats.critChance = 0.05;
            }

            if ('sharinganCooldown' in player.charState && player.charState.sharinganCooldown > 0) {
                player.charState.sharinganCooldown -= dt;
            }
        }
    }
}
