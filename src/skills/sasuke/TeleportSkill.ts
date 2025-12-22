import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../../multiplayer-game";
import { PlayerState, PLAYER_RADIUS } from "../../types";
import { Skill } from "../Skill";

export class TeleportSkill implements Skill {
    static readonly RANGE = 300;

    readonly cooldown = 720;

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

        // Particles at start
        game.particles.push({
            id: game.nextEntityId++,
            type: 'teleport',
            pos: new Vec2(p.pos.x, p.pos.y),
            vel: new Vec2(0, 0),
            life: 20, maxLife: 20, color: '#8A2BE2', size: 10
        });

        // Move
        p.pos.x = tx;
        p.pos.y = ty;

        // Particles at end
        game.particles.push({
            id: game.nextEntityId++,
            type: 'teleport',
            pos: new Vec2(p.pos.x, p.pos.y),
            vel: new Vec2(0, 0),
            life: 20, maxLife: 20, color: '#8A2BE2', size: 10
        });
    }
}
