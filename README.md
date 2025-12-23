# Shinobi Clash

## Quick links
 - Play: https://www.jchan.me/shinobi-survival/dist/game.html

## Overview
Shinobi Clash is a multiplayer PvP arena fighter built with **TypeScript** and **NetplayJS**.
Choose your character (Naruto, Sasuke, or Gaara) and battle it out in a 1v1 duel using unique abilities and movement mechanics.

*Note: The original Shinobi Survival roguelike game is available on the `original-game` branch.*

## Contributing

### Setup

1.  Clone the repository: `git clone <repository-url>`
2.  Navigate to the root directory.
3.  Install dependencies: `npm install`

### Running Locally

1.  Start the development server: `npm run dev`
2.  Open [`http://localhost:9000/game.html`](http://localhost:9000/game.html) in a browser tab. This will be the host.
3.  Click the "Join" link, which will open a new tab for the second player. To test locally, you can drag this new tab into a separate window and place it side-by-side with the host window.
4.  On the host tab, you should see "Connected: 2".
5.  Press **Space** to confirm character selection after pressing **1** (Naruto), **2** (Sasuke), or **3** (Gaara).

## Controls

- **WASD**: Move
- **Mouse**: Aim
- **Q**: Skill 1
    - Naruto: Rasenshuriken
    - Sasuke: Lightning Slash
    - Gaara: Sand Coffin (Root)
- **E**: Skill 2
    - Naruto: Clone Strike
    - Sasuke: Teleport
    - Gaara: Sand Tsunami (Knockback)
- **Space**: Dash

## Submitting Changes

Before pushing your code, please run `npm run build` to create the production build in the `dist/` directory.

## TODOs

- Add more characters (Sakura, Gaara).
- Improve UI and HUD.
- Add sound effects.
- Implement more complex map features.
