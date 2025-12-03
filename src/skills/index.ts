import { SkillLogic, WeaponLogic } from "./types";
import { RasenganSkill, KuramaModeSkill, UzumakiBarrageSkill, NarutoWeapon } from "./naruto";
import { FireballSkill, RinneganSwapSkill, KirinSkill, SasukeWeapon } from "./sasuke";
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

export const WEAPON_REGISTRY: Record<string, WeaponLogic> = {
    'naruto': new NarutoWeapon(),
    'sasuke': new SasukeWeapon(),
    'gaara': new NarutoWeapon(), // Placeholder until implemented
    'sakura': new NarutoWeapon()  // Placeholder until implemented
};

export function getSkill(character: string, slot: string): SkillLogic | null {
    if (!character) return null;
    const charSkills = SKILL_REGISTRY[character];
    if (!charSkills) return null;
    return charSkills[slot] || null;
}

export function getWeapon(character: string): WeaponLogic | null {
    if (!character) return null;
    return WEAPON_REGISTRY[character] || null;
}
