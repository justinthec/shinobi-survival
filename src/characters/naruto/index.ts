import { CharacterRegistry, ProjectileRegistry } from "../../core/registries";
import { NarutoCharacter } from "./NarutoCharacter";
import { RasenshurikenProjectile, CloneStrikeProjectile } from "./projectiles";
import { SkillRegistry } from "../../skills/SkillRegistry";
import { RasenshurikenSkill } from "./skills/RasenshurikenSkill";
import { CloneStrikeSkill } from "./skills/CloneStrikeSkill";
import { DashSkill } from "../../skills/common/DashSkill";

export function registerNaruto() {
    CharacterRegistry.register('naruto', new NarutoCharacter());
    ProjectileRegistry.register('rasenshuriken', new RasenshurikenProjectile());
    ProjectileRegistry.register('clone_strike', new CloneStrikeProjectile());

    SkillRegistry.register('naruto', 'q', new RasenshurikenSkill());
    SkillRegistry.register('naruto', 'e', new CloneStrikeSkill());
    SkillRegistry.register('naruto', ' ', new DashSkill());
}
