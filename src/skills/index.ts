import { NarutoLogic } from './naruto';
import { SasukeLogic } from './sasuke';
import { GaaraLogic } from './gaara';
import { SakuraLogic } from './sakura';
import { CharacterLogic } from './types';

import { GaaraWeapon } from './gaara-weapon';
import { SakuraWeapon } from './sakura-weapon';
import { WeaponLogic } from './weapon-logic';
import { NarutoWeapon } from './naruto-weapon';
import { SasukeWeapon } from './sasuke-weapon';

import {
    SkillLogic,
    UzumakiBarrageSkill,
    RasenganSkill,
    KuramaModeSkill,
    FireballSkill,
    RinneganSwapSkill,
    KirinSkill,
    SphereOfSandSkill,
    DesertQuicksandSkill,
    GrandSandMausoleumSkill,
    HealSkill,
    ChakraScalpelSkill,
    KatsuyuSkill
} from './skill-logic';

const characterLogics: { [key: string]: CharacterLogic } = {
    naruto: new NarutoLogic(),
    sasuke: new SasukeLogic(),
    gaara: new GaaraLogic(),
    sakura: new SakuraLogic(),
};

export function getCharacterLogic(character: string): CharacterLogic | null {
    return characterLogics[character] || null;
}

const weaponLogics: { [key: string]: WeaponLogic } = {
    naruto: new NarutoWeapon(),
    sasuke: new SasukeWeapon(),
    gaara: new GaaraWeapon(),
    sakura: new SakuraWeapon(),
};

export function getWeapon(character: string): WeaponLogic | null {
    return weaponLogics[character] || null;
}

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
