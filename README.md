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

### Submitting Changes

Before pushing your code, please run `npm run build` to create the production build in the `dist/` directory.

Deployment happens automatically from the `main` branch using GitHub Pages and can be accessed at the link at the top of this README.

## TODOs

- Migrate TODOs to GitHub Issues.
- Implement death / revive system.
- Implement upgrade system
  - Come up with upgrades
  - Weapon levels (already brainstormed some of these)
- Figure out gametime issue
- Add a timer to the game
- Refactor Spawning logic to be cleaner and wave based.
- Make enemies more interesting
- Create a way for us to draw new sprites underneath other sprites (Z-axis system)
  - Need this for Naruto crater and Sasuke Rinnegan portal fx.
- Add player damage floating text
- Sound effects for skills?
- Add some floating text for all skills when used.
- Sasuke
  - Rinnegan Swap floating text should be purple
  - Fire trail should be a hazard not a projectile
- Sakura Polish
  - Heal doesn't show the radius or have any VFX
- Gaara Polish
  - Gaara Q doesn't freeze him in place
