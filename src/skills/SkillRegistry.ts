import { Skill } from "./Skill";
import { DashSkill } from "./common/DashSkill";
import { RasenshurikenSkill } from "../characters/naruto/skills/RasenshurikenSkill";
import { CloneStrikeSkill } from "../characters/naruto/skills/CloneStrikeSkill";
import { LightningSlashSkill } from "../characters/sasuke/skills/LightningSlashSkill";
import { TeleportSkill } from "../characters/sasuke/skills/TeleportSkill";
import { CharacterType } from "../types";

export class SkillRegistry {
    private static skills: Record<string, Record<string, Skill>> = {
        'naruto': {
            'q': new RasenshurikenSkill(),
            'e': new CloneStrikeSkill(),
            ' ': new DashSkill()
        },
        'sasuke': {
            'q': new LightningSlashSkill(),
            'e': new TeleportSkill(),
            ' ': new DashSkill()
        }
    };

    static getSkill(character: CharacterType | null, key: string): Skill | null {
        if (!character) return null;
        return this.skills[character]?.[key] || null;
    }
}
