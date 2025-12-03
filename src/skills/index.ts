import { NarutoLogic } from './naruto';
import { SasukeLogic } from './sasuke';
import { CharacterLogic } from './types';
import { GaaraWeapon } from './gaara-weapon';
import { SakuraWeapon } from './sakura-weapon';
import { WeaponLogic } from './weapon-logic';
import { NarutoWeapon } from './naruto-weapon';
import { SasukeWeapon } from './sasuke-weapon';
import { GaaraLogic } from './gaara';
import { SakuraLogic } from './sakura';
import { SkillLogic, getSkill } from './skill-logic';

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

export { SkillLogic, getSkill };
