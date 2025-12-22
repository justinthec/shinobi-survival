import { CharacterRegistry, ProjectileRegistry } from "../../core/registries";
import { NarutoCharacter } from "./NarutoCharacter";
import { RasenshurikenProjectile, CloneStrikeProjectile } from "./projectiles";
import { SkillRegistry } from "../../skills/SkillRegistry";
import { RasenshurikenSkill } from "./skills/RasenshurikenSkill";
import { CloneStrikeSkill } from "./skills/CloneStrikeSkill";

export function registerNaruto() {
    CharacterRegistry.register('naruto', new NarutoCharacter());
    ProjectileRegistry.register('rasenshuriken', new RasenshurikenProjectile());
    ProjectileRegistry.register('clone_strike', new CloneStrikeProjectile());

    // We also need to ensure skills are registered.
    // Currently SkillRegistry has them hardcoded. We will eventually remove that hardcoding.
    // Ideally: SkillRegistry.register('naruto', 'q', new RasenshurikenSkill());
}
