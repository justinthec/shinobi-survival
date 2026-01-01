import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../../../multiplayer-game";
import { PlayerState, PLAYER_RADIUS } from "../../../types";
import { Skill } from "../../../skills/Skill";

export class TeleportSkill implements Skill {
    static readonly RANGE = 300;
    static readonly SWAP_RADIUS = 50;

    readonly cooldown = 600;

    handleInput(game: ShinobiClashGame, p: PlayerState, input: DefaultInput, targetPos: Vec2) {
        // Charging Logic
        if (input.keysHeld['e']) {
            if (!p.skillStates['e']) p.skillStates['e'] = {};
            p.skillStates['e'].charging = true;

            const maxRange = TeleportSkill.RANGE;
            const dx = targetPos.x - p.pos.x;
            const dy = targetPos.y - p.pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let tx = targetPos.x;
            let ty = targetPos.y;

            if (dist > maxRange) {
                const angle = Math.atan2(dy, dx);
                tx = p.pos.x + Math.cos(angle) * maxRange;
                ty = p.pos.y + Math.sin(angle) * maxRange;
            }

            const bounds = 1600 - PLAYER_RADIUS;
            tx = Math.max(PLAYER_RADIUS, Math.min(bounds, tx));
            ty = Math.max(PLAYER_RADIUS, Math.min(bounds, ty));

            p.skillStates['e'].target = new Vec2(tx, ty);

            // Check for Swap Target
            let swapTargetId = undefined;
            for (const id in game.players) {
                const other = game.players[id];
                if (other.id !== p.id && !other.dead) {
                    const distSq = (other.pos.x - tx) ** 2 + (other.pos.y - ty) ** 2;
                    if (distSq < TeleportSkill.SWAP_RADIUS ** 2) {
                        swapTargetId = other.id;
                        break;
                    }
                }
            }
            p.skillStates['e'].swapTargetId = swapTargetId;

        } else {
            // Released
            if (p.skillStates['e']?.charging) {
                if (p.skillStates['e'].target) {
                    this.cast(game, p, input, p.skillStates['e'].target);
                }
                delete p.skillStates['e'];
            }
        }
    }

    cast(game: ShinobiClashGame, p: PlayerState, input: DefaultInput, targetPos: Vec2) {
        if (p.cooldowns.e > 0) return;

        p.cooldowns.e = this.cooldown;

        // Target is already calculated/clamped if coming from handleInput, but safe to use directly
        let tx = targetPos.x;
        let ty = targetPos.y;

        const swapTargetId = p.skillStates['e']?.swapTargetId;
        let swapped = false;

        // Capture original position for particle (before move)
        const startPos = new Vec2(p.pos.x, p.pos.y);

        if (swapTargetId !== undefined) {
            const enemy = game.players[swapTargetId];
            if (enemy && !enemy.dead) {
                // Perform Swap
                const myOldPos = { x: p.pos.x, y: p.pos.y };
                p.pos.x = enemy.pos.x;
                p.pos.y = enemy.pos.y;

                enemy.pos.x = myOldPos.x;
                enemy.pos.y = myOldPos.y;

                // Particles for enemy (Orange/Red to signify aggressive swap)
                game.particles.push({
                    id: game.nextEntityId++,
                    type: 'teleport',
                    pos: new Vec2(enemy.pos.x, enemy.pos.y),
                    vel: new Vec2(0, 0),
                    life: 20, maxLife: 20, color: '#FF4500', size: 10
                });

                swapped = true;
            }
        }

        if (!swapped) {
            // Standard Teleport
            p.pos.x = tx;
            p.pos.y = ty;
        }

        // Particles for self (start pos)
        game.particles.push({
            id: game.nextEntityId++,
            type: 'teleport',
            pos: startPos,
            vel: new Vec2(0, 0),
            life: 20, maxLife: 20, color: '#8A2BE2', size: 10
        });

        // Particles for self (end pos)
        game.particles.push({
            id: game.nextEntityId++,
            type: 'teleport',
            pos: new Vec2(p.pos.x, p.pos.y),
            vel: new Vec2(0, 0),
            life: 20, maxLife: 20, color: '#8A2BE2', size: 10
        });
    }
}
