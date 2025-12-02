import { SkillLogic } from "./types";
import { RasenganSkill, KuramaModeSkill } from "./naruto";
import { FireballSkill, RinneganSwapSkill, KirinSkill } from "./sasuke";
import { DesertQuicksandSkill, SphereOfSandSkill, GrandSandMausoleumSkill } from "./gaara";
import { ChakraScalpelSkill, HealSkill, KatsuyuSkill } from "./sakura";

export const SKILL_REGISTRY: Record<string, Record<string, SkillLogic>> = {
    'naruto': {
        'skill1': new RasenganSkill(),
        'ult': new KuramaModeSkill()
    },
    'sasuke': {
        'skill1': new FireballSkill(),
        'skill2': new RinneganSwapSkill(),
        'ult': new KirinSkill()
    },
    'gaara': {
        'skill1': new DesertQuicksandSkill(),
        'skill2': new SphereOfSandSkill(),
        'ult': new GrandSandMausoleumSkill()
    },
    'sakura': {
        'skill1': new ChakraScalpelSkill(),
        'skill2': new HealSkill(),
        'ult': new KatsuyuSkill()
    }
};

export function getSkill(character: string, slot: string): SkillLogic | null {
    if (!character) return null;
    const charSkills = SKILL_REGISTRY[character];
    if (!charSkills) return null;
    return charSkills[slot] || null;
}
