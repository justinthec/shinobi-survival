import { CharacterRegistry, ProjectileRegistry } from "../../core/registries";
import { RockLeeCharacter } from "./RockLeeCharacter";
import { LeafHurricaneProjectile } from "./projectiles";
import { SkillRegistry } from "../../skills/SkillRegistry";
import { LeafHurricaneSkill } from "./skills/LeafHurricaneSkill";
import { DiveSkill } from "./skills/DiveSkill";
import { RockLeeDashSkill } from "./skills/RockLeeDashSkill";

export function registerRockLee() {
    CharacterRegistry.register('rock_lee', new RockLeeCharacter());
    ProjectileRegistry.register('leaf_hurricane', new LeafHurricaneProjectile());

    SkillRegistry.register('rock_lee', 'q', new LeafHurricaneSkill());
    SkillRegistry.register('rock_lee', 'e', new DiveSkill());
    SkillRegistry.register('rock_lee', ' ', new RockLeeDashSkill());
}
