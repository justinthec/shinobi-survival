import { DefaultInput, Vec2 } from "netplayjs";
import { ShinobiClashGame } from "../../../multiplayer-game";
import { PlayerState } from "../../../types";
import { Skill } from "../../../skills/Skill";

export class SandDashSkill implements Skill {
    readonly cooldown = 120; // 2 seconds

    cast(game: ShinobiClashGame, p: PlayerState, input: DefaultInput, targetPos: Vec2) {
        if (p.cooldowns.sp > 0) return;

        p.cooldowns.sp = this.cooldown;
        p.dash.active = true;
        p.dash.life = 10;

        const speed = 15;
        p.dash.vx = Math.cos(p.angle) * speed;
        p.dash.vy = Math.sin(p.angle) * speed;
    }
}
