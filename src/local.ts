import { LocalWrapper } from "netplayjs";
import { ShinobiClashGame } from "./multiplayer-game";

// Override number of players for local testing to 1
ShinobiClashGame.numPlayers = 1;

new LocalWrapper(ShinobiClashGame).start();
