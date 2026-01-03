import { CharacterRegistry, ProjectileRegistry } from "../../core/registries";
import { RockLeeCharacter } from "./RockLeeCharacter";
import { LeafHurricaneProjectile, DynamicEntryProjectile } from "./projectiles";
import { SkillRegistry } from "../../skills/SkillRegistry";
import { LeafHurricaneSkill } from "./skills/LeafHurricaneSkill";
import { DynamicEntrySkill } from "./skills/DynamicEntrySkill";
import { RockLeeDashSkill } from "./skills/RockLeeDashSkill";

export function registerRockLee() {
    CharacterRegistry.register('rocklee', new RockLeeCharacter());
    ProjectileRegistry.register('leaf_hurricane', new LeafHurricaneProjectile());
    ProjectileRegistry.register('dynamic_entry', new DynamicEntryProjectile());

    SkillRegistry.register('rocklee', 'q', new LeafHurricaneSkill());
    SkillRegistry.register('rocklee', 'e', new DynamicEntrySkill());
    SkillRegistry.register('rocklee', ' ', new RockLeeDashSkill());
}
