import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../multiplayer-game";
import { PlayerState, ProjectileState } from "../types";

export class CombatManager {

    static processInput(game: ShinobiClashGame, p: PlayerState, input: DefaultInput) {
        if (p.casting > 0) {
            p.casting--;
            return; // Stunned while casting
        }

        // 1. Movement
        this.handleMovement(game, p, input);

        // 2. Aiming
        if (input.mousePosition) {
            // NetplayJS input.mousePosition is relative to canvas usually? or world?
            // In the default input, it's usually pixel coordinates on canvas.
            // We need to translate to world coordinates if camera is moving.
            // But for now, let's assume simple logic from index.html (Mouse - ScreenCenter = Aim Direction relative to player center)
            // Wait, netplayjs DefaultInput often requires custom mouse capture.
            // Let's assume input.mousePosition provided is valid screen coordinates.

            // NOTE: In many netplayjs simple implementations, mouse pos is raw.
            // We need to calculate angle.
            const screenW = ShinobiClashGame.canvasSize.width;
            const screenH = ShinobiClashGame.canvasSize.height;

            // Center of screen is where player is drawn
            const cx = screenW / 2;
            const cy = screenH / 2;

            const mx = input.mousePosition.x - cx;
            const my = input.mousePosition.y - cy;

            p.angle = Math.atan2(my, mx);
        }

        // 3. Cooldowns
        if (p.cooldowns.q > 0) p.cooldowns.q--;
        if (p.cooldowns.e > 0) p.cooldowns.e--;
        if (p.cooldowns.sp > 0) p.cooldowns.sp--;

        // 4. Skills
        if (input.keysPressed['q']) this.tryCastQ(game, p);
        if (input.keysPressed['e']) this.tryCastE(game, p);
        if (input.keysPressed[' ']) this.tryDash(game, p);
    }

    static handleMovement(game: ShinobiClashGame, p: PlayerState, input: DefaultInput) {
        if (p.dash.active) {
            p.pos.x += p.dash.vx;
            p.pos.y += p.dash.vy;
            p.dash.life--;
            if (p.dash.life <= 0) p.dash.active = false;
            return;
        }

        let dx = 0; let dy = 0;
        if (input.keysHeld['a']) dx -= 1;
        if (input.keysHeld['d']) dx += 1;
        if (input.keysHeld['w']) dy -= 1;
        if (input.keysHeld['s']) dy += 1;

        if (dx !== 0 || dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            const speed = p.stats.speed;

            const vx = (dx / len) * speed;
            const vy = (dy / len) * speed;

            p.pos.x += vx;
            p.pos.y += vy;

            // Bounds
            p.pos.x = Math.max(20, Math.min(1600 - 20, p.pos.x));
            p.pos.y = Math.max(20, Math.min(1600 - 20, p.pos.y));
        }
    }

    static tryCastQ(game: ShinobiClashGame, p: PlayerState) {
        if (p.cooldowns.q > 0) return;

        p.cooldowns.q = 120; // 2s at 60fps
        p.casting = 10; // Lock

        if (p.character === 'naruto') {
            this.spawnProjectile(game, p, 'rasenshuriken');
        } else {
            this.spawnProjectile(game, p, 'fireball');
        }
    }

    static tryCastE(game: ShinobiClashGame, p: PlayerState) {
        if (p.cooldowns.e > 0) return;

        p.cooldowns.e = 360; // 6s

        if (p.character === 'naruto') {
            // Clone Strike (Teleport + Clone)
            // Just spawn logic for now
            this.spawnProjectile(game, p, 'clone_strike');
        } else {
            // Amaterasu
            this.spawnProjectile(game, p, 'amaterasu_buildup');
        }
    }

    static tryDash(game: ShinobiClashGame, p: PlayerState) {
        if (p.cooldowns.sp > 0) return;

        p.cooldowns.sp = 180; // 3s

        // Dash vector based on aim angle
        const dashSpeed = 25;
        p.dash = {
            active: true,
            life: 8,
            vx: Math.cos(p.angle) * dashSpeed,
            vy: Math.sin(p.angle) * dashSpeed
        };

        // Effect
        game.particles.push({
            id: game.nextEntityId++,
            type: 'smoke',
            pos: new Vec2(p.pos.x, p.pos.y),
            vel: new Vec2(0, 0),
            life: 10, maxLife: 10, color: 'white', size: 10
        });
    }

    static spawnProjectile(game: ShinobiClashGame, p: PlayerState, type: string) {
        const speed = type === 'fireball' ? 14 : 18;
        const life = type === 'fireball' ? 50 : 60;

        // Spawn offset
        const ox = Math.cos(p.angle) * 30;
        const oy = Math.sin(p.angle) * 30;

        game.projectiles.push({
            id: game.nextEntityId++,
            type: type as any,
            pos: new Vec2(p.pos.x + ox, p.pos.y + oy),
            vel: new Vec2(Math.cos(p.angle) * speed, Math.sin(p.angle) * speed),
            ownerId: p.id,
            angle: p.angle,
            life: life,
            maxLife: life,
            radius: type === 'fireball' ? 20 : 25,
            state: 'flying'
        });
    }

    static updateProjectiles(game: ShinobiClashGame) {
        for (let i = game.projectiles.length - 1; i >= 0; i--) {
            const proj = game.projectiles[i];

            // Logic per type
            if (proj.type === 'amaterasu_buildup') {
                proj.life--;
                if (proj.life <= 0) {
                    // Explode
                    game.projectiles.push({
                        ...proj, id: game.nextEntityId++,
                        type: 'amaterasu_burn',
                        life: 60, radius: 60, isAoe: true
                    });
                    game.projectiles.splice(i, 1);
                }
                continue;
            }

            if (proj.state === 'exploding' || proj.isAoe) {
                proj.life--;
                if (proj.life % 5 === 0) this.checkCollision(game, proj);
                if (proj.life <= 0) game.projectiles.splice(i, 1);
                continue;
            }

            // Moving
            if (proj.type !== 'clone_strike') {
                proj.pos.x += proj.vel.x;
                proj.pos.y += proj.vel.y;
            }
            proj.life--;

            // Collision
            const hit = this.checkCollision(game, proj);

            if (hit || proj.life <= 0) {
                if (proj.type === 'rasenshuriken') {
                    proj.state = 'exploding';
                    proj.life = 40;
                    proj.radius = 80;
                    proj.vel.x = 0; proj.vel.y = 0;
                } else if (proj.type === 'fireball') {
                    proj.state = 'exploding';
                    proj.life = 10;
                    proj.radius = 50;
                    proj.vel.x = 0; proj.vel.y = 0;
                } else {
                    game.projectiles.splice(i, 1);
                }
            }
        }
    }

    static checkCollision(game: ShinobiClashGame, proj: ProjectileState): boolean {
        let hit = false;

        for (let id in game.players) {
            const target = game.players[id];
            if (target.id === proj.ownerId) continue;
            if (target.dead) continue;

            const dist = Math.sqrt((target.pos.x - proj.pos.x) ** 2 + (target.pos.y - proj.pos.y) ** 2);
            if (dist < proj.radius + 20) {
                hit = true;

                // Damage
                let dmg = 0;
                if (proj.type === 'fireball') dmg = 15;
                if (proj.type === 'rasenshuriken') dmg = 5;
                if (proj.type === 'clone_strike') dmg = 20;
                if (proj.type === 'amaterasu_burn') dmg = 2;
                if (proj.state === 'exploding') dmg = 2;

                if (dmg > 0) {
                    target.hp -= dmg;
                    game.floatingTexts.push({
                        id: game.nextEntityId++,
                        pos: new Vec2(target.pos.x, target.pos.y - 40),
                        val: dmg.toString(),
                        color: 'red',
                        life: 30, maxLife: 30, vy: 1
                    });

                    if (target.hp <= 0) {
                        target.hp = 0;
                        target.dead = true;
                    }
                }
            }
        }
        return hit;
    }
}
