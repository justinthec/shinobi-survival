import { Skill } from "./Skill";
import { CharacterType } from "../types";

export class SkillRegistry {
    private static skills: Record<string, Record<string, Skill>> = {};

    static register(character: string, key: string, skill: Skill) {
        if (!this.skills[character]) {
            this.skills[character] = {};
        }
        this.skills[character][key] = skill;
    }

    static getSkill(character: CharacterType | null, key: string): Skill | null {
        if (!character) return null;
        return this.skills[character]?.[key] || null;
    }
}
