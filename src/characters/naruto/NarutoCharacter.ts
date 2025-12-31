import { CharacterDefinition } from "../../core/interfaces";
import { PlayerState } from "../../types";
import { CharacterRendererHelper } from "../../core/CharacterRendererHelper";
import { RasenshurikenSkill } from "./skills/RasenshurikenSkill";
import { CloneStrikeSkill } from "./skills/CloneStrikeSkill";
import { DashSkill } from "../../skills/common/DashSkill";
import { SkillRegistry } from "../../skills/SkillRegistry";

export class NarutoCharacter implements CharacterDefinition {
    name = "Naruto";

    constructor() {
        // We can manually register skills here for now, or keep using SkillRegistry if we want.
        // But the plan says "Register Naruto and his projectiles".
        // Let's assume SkillRegistry is still the place for SKILLS for now,
        // but we are building the character definition.
        // In a full refactor, skills would be part of this class or registered here.
        // For now, I will ensure they are in SkillRegistry via side effect or explicit call if needed.
        // Actually, the user wants "everything related to the character specific skills ... located in character specific files".
        // So I should probably update SkillRegistry to pull from here, or register these skills when this character is loaded.
    }

    render(ctx: CanvasRenderingContext2D, state: PlayerState, time: number, isLocal: boolean, isOffCooldown: boolean) {
        CharacterRendererHelper.drawNinjaBody(
            ctx,
            state.pos.x,
            state.pos.y,
            state.angle,
            'naruto',
            state.hp,
            state.maxHp,
            state.name,
            time,
            false
        );
    }
}
