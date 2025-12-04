Shinobi Survival Multiplayer

Play: [https://www.jchan.me/shinobi-survival/dist/game.html](https://www.jchan.me/shinobi-survival/dist/game.html)

## Contributing

### Setup

1.  Install [Antigravity](https://antigravity.google) or another IDE / AI IDE.
2.  Clone the repository: `git clone <repository-url>`
3.  Navigate to the root directory.
4.  Install dependencies: `npm install`

### Running Locally

1.  Start the development server: `npm run dev`
2.  Open [`http://localhost:9000/game.html`](http://localhost:9000/game.html) in a browser tab. This will be the host.
3.  Click the "Join" link, which will open a new tab for the second player. To test locally, you can drag this new tab into a separate window and place it side-by-side with the host window.
4.  On the host tab, you should see "Connected: 2".
5.  Click "Start" on the host tab to begin the game.

*Note: You can also try testing within a single tab by opening `local-testing.html`, but there is a known timing issue that causes the game to run slower. The recommended way to test is with `game.html` as described above.*

### Debug Mode

Press the backtick key to toggle debug mode. This will show you the following:
- Entity hitboxes (shapes)

### Submitting Changes

Before pushing your code, please run `npm run build` to create the production build in the `dist/` directory.

Deployment happens automatically from the `main` branch using GitHub Pages and can be accessed at the link at the top of this README.

## TODOs

### Meta
- Migrate TODOs to GitHub Issues.

### Mechanics / Core Bugs
- Figure out gametime issue
- Add a timer to the game
- Performance:
  - Add Entity Counter to debug mode. From my testing, the game gets laggier with time (Ping increases steadily). This implies that we are accumulating some sort of state that is not being cleaned up. My bet right now is xp orbs (we should add a limiter for this) but there could be something else. Need to research.

### Gameplay Features
- Expand the map
- Add drops to the map
- Implement death / revive system.
- Flesh out upgrade system
  - Come up with more upgrades and combinations
  - Weapon levels (already brainstormed some of these)
- Refactor Spawning logic to be cleaner and wave based.
- Make enemies more interesting

### Aesthetic Improvements
- Create a way for us to draw new sprites underneath other sprites (Z-axis system)
  - Need this for Naruto crater and Sasuke Rinnegan portal fx.
- Add player damage floating text
- Sound effects for skills?
- Add some floating text for all skills when used.

### Characters
- Naruto
  - The Level 5 attack shouldn't die when it hits enemies.
- Sasuke
  - Rinnegan Swap floating text should be purple
  - Fire trail should be a hazard not a projectile
     - Fix the shape of this and get this working again.
  - Level 5 unimplemented.
- Sakura Polish
  - Heal doesn't show the radius or have any VFX
  - Find other ways to make her ultimate more performant.
- Gaara Polish
  - Gaara Q doesn't freeze him in place
