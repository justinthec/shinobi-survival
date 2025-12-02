import { SkillLogic, CharacterLogic } from "./types";
import { RasenganSkill, KuramaModeSkill, NarutoLogic } from "./naruto";
import { FireballSkill, RinneganSwapSkill, KirinSkill, SasukeLogic } from "./sasuke";
import { DesertQuicksandSkill, SphereOfSandSkill, GrandSandMausoleumSkill, GaaraLogic } from "./gaara";
import { ChakraScalpelSkill, HealSkill, KatsuyuSkill, SakuraLogic } from "./sakura";

export const SKILL_REGISTRY: Record<string, Record<string, SkillLogic>> = {
    'naruto': { 'skill1': new RasenganSkill(), 'ult': new KuramaModeSkill() },
    'sasuke': { 'skill1': new FireballSkill(), 'skill2': new RinneganSwapSkill(), 'ult': new KirinSkill() },
    'gaara': { 'skill1': new DesertQuicksandSkill(), 'skill2': new SphereOfSandSkill(), 'ult': new GrandSandMausoleumSkill() },
    'sakura': { 'skill1': new ChakraScalpelSkill(), 'skill2': new HealSkill(), 'ult': new KatsuyuSkill() }
};

export const CHARACTER_LOGIC_REGISTRY: Record<string, CharacterLogic> = {
    'naruto': new NarutoLogic(),
    'sasuke': new SasukeLogic(),
    'gaara': new GaaraLogic(),
    'sakura': new SakuraLogic()
};

export function getSkill(character: string, slot: string): SkillLogic | null {
    if (!character) return null;
    const charSkills = SKILL_REGISTRY[character];
    return charSkills ? charSkills[slot] || null : null;
}

export function getCharacterLogic(character: string): CharacterLogic | null {
    if (!character) return null;
    return CHARACTER_LOGIC_REGISTRY[character] || null;
}
