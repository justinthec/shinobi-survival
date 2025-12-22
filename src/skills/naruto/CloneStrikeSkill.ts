import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../../multiplayer-game";
import { PlayerState, ProjectileState } from "../../types";
import { Skill } from "../Skill";

export class CloneStrikeSkill implements Skill {
    static readonly DAMAGE = 20;
    static readonly LIFE = 600;
    static readonly RADIUS = 20;

    readonly cooldown = 720;

    cast(game: ShinobiClashGame, p: PlayerState, input: DefaultInput, targetPos: Vec2) {
        if (p.cooldowns.e > 0) return;

        p.cooldowns.e = this.cooldown;

        const proj: ProjectileState = {
            id: game.nextEntityId++,
            type: 'clone_strike',
            pos: new Vec2(p.pos.x, p.pos.y), // Starts at player?
            vel: new Vec2(0, 0),
            ownerId: p.id,
            angle: p.angle,
            rotation: 0,
            life: CloneStrikeSkill.LIFE,
            maxLife: CloneStrikeSkill.LIFE,
            radius: CloneStrikeSkill.RADIUS,
            state: 'flying',
            hp: p.maxHp,
            maxHp: p.maxHp,
            actionState: 'run'
        };

        // Wait, original logic used targetPos for 'clone_strike'?
        // CombatManager:
        // if (type === 'clone_strike') { pos = p.pos; ... }
        // Ah, it spawns at player and walks.
        // But `tryCastE` calls `spawnProjectile(game, p, 'clone_strike', targetPos);`
        // But `spawnProjectile` ignored `targetPos` for `clone_strike`.
        // "pos = new Vec2(p.pos.x, p.pos.y);"
        // So targetPos is irrelevant for casting, it finds enemies itself.

        game.projectiles.push(proj);
    }
}
