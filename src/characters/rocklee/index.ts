import { CharacterRegistry, ProjectileRegistry } from "../../core/registries";
import { RockLeeCharacter } from "./RockLeeCharacter";
import { LeafHurricaneProjectile, LotusKickProjectile, LotusSmashProjectile } from "./projectiles";
import { SkillRegistry } from "../../skills/SkillRegistry";
import { LeafHurricaneSkill } from "./skills/LeafHurricaneSkill";
import { PrimaryLotusSkill } from "./skills/PrimaryLotusSkill";
import { DashSkill } from "../../skills/common/DashSkill";

export function registerRockLee() {
    CharacterRegistry.register('rocklee', new RockLeeCharacter());

    ProjectileRegistry.register('rock_lee_dive', new LeafHurricaneProjectile());
    ProjectileRegistry.register('lotus_kick', new LotusKickProjectile());
    ProjectileRegistry.register('lotus_smash', new LotusSmashProjectile());

    SkillRegistry.register('rocklee', 'q', new LeafHurricaneSkill());
    SkillRegistry.register('rocklee', 'e', new PrimaryLotusSkill());
    SkillRegistry.register('rocklee', ' ', new DashSkill());
}
