import { SkillLogic } from "./types";
import { RasenganSkill, KuramaModeSkill, UzumakiBarrageSkill } from "./naruto";
import { FireballSkill, RinneganSwapSkill, KirinSkill } from "./sasuke";
import { DesertQuicksandSkill, SphereOfSandSkill, GrandSandMausoleumSkill } from "./gaara";
import { ChakraScalpelSkill, HealSkill, KatsuyuSkill } from "./sakura";

export const SKILL_REGISTRY: Record<string, Record<string, SkillLogic>> = {
    'naruto': {
        'skillQ': new UzumakiBarrageSkill(),
        'skillE': new RasenganSkill(),
        'ult': new KuramaModeSkill()
    },
    'sasuke': {
        'skillQ': new FireballSkill(),
        'skillE': new RinneganSwapSkill(),
        'ult': new KirinSkill()
    },
    'gaara': {
        'skillQ': new SphereOfSandSkill(),
        'skillE': new DesertQuicksandSkill(),
        'ult': new GrandSandMausoleumSkill()
    },
    'sakura': {
        'skillQ': new HealSkill(),
        'skillE': new ChakraScalpelSkill(),
        'ult': new KatsuyuSkill()
    }
};

export function getSkill(character: string, slot: string): SkillLogic | null {
    if (!character) return null;
    const charSkills = SKILL_REGISTRY[character];
    if (!charSkills) return null;
    return charSkills[slot] || null;
}
