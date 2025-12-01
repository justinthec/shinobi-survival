import { SkillLogic } from "./types";
import { RasenganSkill, KuramaModeSkill } from "./naruto";
import { AmaterasuSkill, SusanooSkill } from "./sasuke";
import { SandCoffinSkill, PyramidSealSkill } from "./gaara";
import { HealSkill, KatsuyuSkill } from "./sakura";

export const SKILL_REGISTRY: Record<string, Record<string, SkillLogic>> = {
    'naruto': {
        'skill1': new RasenganSkill(),
        'ult': new KuramaModeSkill()
    },
    'sasuke': {
        'skill1': new AmaterasuSkill(),
        'ult': new SusanooSkill()
    },
    'gaara': {
        'skill1': new SandCoffinSkill(),
        'ult': new PyramidSealSkill()
    },
    'sakura': {
        'skill1': new HealSkill(),
        'ult': new KatsuyuSkill()
    }
};

export function getSkill(character: string, slot: string): SkillLogic | null {
    if (!character) return null;
    const charSkills = SKILL_REGISTRY[character];
    if (!charSkills) return null;
    return charSkills[slot] || null;
}
