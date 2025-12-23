import { CharacterRegistry, ProjectileRegistry } from "../../core/registries";
import { SasukeCharacter } from "./SasukeCharacter";
import { LightningSlashProjectile } from "./projectiles";
import { SkillRegistry } from "../../skills/SkillRegistry";
import { LightningSlashSkill } from "./skills/LightningSlashSkill";
import { TeleportSkill } from "./skills/TeleportSkill";
import { DashSkill } from "../../skills/common/DashSkill";

export function registerSasuke() {
    CharacterRegistry.register('sasuke', new SasukeCharacter());
    ProjectileRegistry.register('lightning_slash', new LightningSlashProjectile());

    SkillRegistry.register('sasuke', 'q', new LightningSlashSkill());
    SkillRegistry.register('sasuke', 'e', new TeleportSkill());
    SkillRegistry.register('sasuke', ' ', new DashSkill());
}
