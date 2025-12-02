import { MultiplayerRollbackWrapper } from "netplayjs";
import { ShinobiSurvivalGame } from "./multiplayer-game";

const wrapper = new MultiplayerRollbackWrapper(ShinobiSurvivalGame);
// The netplayjs wrapper defaults to 4 ticks per frame. Setting tickRate to 4 reduces this to 1 tick per frame.
wrapper.tickRate = 4;
wrapper.start();
