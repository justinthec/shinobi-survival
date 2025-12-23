import { CharacterRegistry, ProjectileRegistry } from "../../core/registries";
import { GaaraCharacter } from "./GaaraCharacter";
import { SandCoffinProjectile, SandTsunamiProjectile } from "./projectiles";
import { SkillRegistry } from "../../skills/SkillRegistry";
import { SandCoffinSkill } from "./skills/SandCoffinSkill";
import { SandTsunamiSkill } from "./skills/SandTsunamiSkill";
import { SandDashSkill } from "./skills/SandDashSkill";

export function registerGaara() {
    CharacterRegistry.register('gaara', new GaaraCharacter());
    ProjectileRegistry.register('sand_coffin', new SandCoffinProjectile());
    ProjectileRegistry.register('sand_tsunami', new SandTsunamiProjectile());

    SkillRegistry.register('gaara', 'q', new SandCoffinSkill());
    SkillRegistry.register('gaara', 'e', new SandTsunamiSkill());
    SkillRegistry.register('gaara', ' ', new SandDashSkill());
}
