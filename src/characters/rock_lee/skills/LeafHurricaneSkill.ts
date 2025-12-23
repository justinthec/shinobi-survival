import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../../multiplayer-game";
import { PlayerState } from "../../types";
import { Skill } from "../../skills/Skill";

export class LeafHurricaneSkill implements Skill {
    readonly cooldown = 300; // 5 seconds

    cast(game: ShinobiClashGame, p: PlayerState, input: DefaultInput, targetPos: Vec2) {
        if (p.cooldowns.q > 0) return;

        p.cooldowns.q = this.cooldown;
        p.casting = 20; // Lock for animation

        // Spawn AOE projectile
        game.projectiles.push({
            id: game.nextEntityId++,
            type: 'leaf_hurricane',
            pos: new Vec2(p.pos.x, p.pos.y),
            vel: new Vec2(0, 0),
            ownerId: p.id,
            angle: 0,
            rotation: 0,
            life: 5, // Short duration active hit box
            maxLife: 5,
            radius: 60,
            state: 'flying',
            damage: 10, // Burst damage
            isAoe: true
        });
    }
}
