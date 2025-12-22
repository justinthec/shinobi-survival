import { Skill } from "./Skill";
import { DashSkill } from "./common/DashSkill";
import { RasenshurikenSkill } from "./naruto/RasenshurikenSkill";
import { CloneStrikeSkill } from "./naruto/CloneStrikeSkill";
import { LightningSlashSkill } from "./sasuke/LightningSlashSkill";
import { TeleportSkill } from "./sasuke/TeleportSkill";
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
