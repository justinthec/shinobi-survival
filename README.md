# Shinobi Survival Multiplayer

## Quick links
 - Play: https://www.jchan.me/shinobi-survival/dist/game.html
 - Map Maker / Viewer: https://gemini.google.com/share/0f64b691c8fe
 - Procedural Map Generator: https://gemini.google.com/share/326466148d96

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

### Testing

Run the test suite with:

```bash
# Run all tests
npm run test

# Run only performance tests
npm run test:perf

# Watch mode (re-run on file changes)
npm run test:watch
```

Performance tests include:
- **Tick Performance** - Measures game logic bottlenecks (spatial hash, enemy updates, projectiles, etc.)
- **Serialization** - Measures state size and serialize/deserialize times for NetplayJS sync

### Performance Profiler

A browser-based profiler is available for real-time performance analysis:

1. Start the dev server: `npm run dev`
2. Open [`http://localhost:9000/profiler.html`](http://localhost:9000/profiler.html)
3. Configure entity counts with sliders (enemies up to 1000, projectiles up to 300)
4. Toggle **Stress Mode** to fire all skills and spawn entities continuously
5. Click **Run Profiler** to start

**Features:**
- **Live Stats** - FPS, frame time, budget usage, state size
- **Timing Breakdown** - Tick, Draw, and Serialize times with visual bars
- **Session History** - Full session chart that compacts over time
- **Drift Detection** - Tracks if frame time increases over the session (e.g., `8.2ms → 12.1ms (+3.9ms)`)
- **Spike Analysis** - Detects frames >2.5x average and correlates with actions
- **Report Generation** - Click "Generate Report" for a markdown summary you can copy

### Submitting Changes

Before pushing your code, please run `npm run build` to create the production build in the `dist/` directory.

Deployment happens automatically from the `main` branch using GitHub Pages and can be accessed at the link at the top of this README.

## TODOs

### Meta
- [ ] Migrate TODOs to GitHub Issues.

### Mechanics / Core Bugs
- [ ] Figure out gametime issue
- [ ] Add a timer to the game
- [ ] Performance:
  - Add Entity Counter to debug mode. From my testing, the game gets laggier with time (Ping increases steadily). This implies that we are accumulating some sort of state that is not being cleaned up. My bet right now is xp orbs (we should add a limiter for this) but there could be something else. Need to research.

### Gameplay Features
- [ ] Implement death / revive system.
- [ ] Flesh out upgrade system
  - [ ] Come up with more upgrades and combinations
  - [ ] Weapon levels (already brainstormed some of these)
- [ ] Refactor Spawning logic to be cleaner and wave based.
- [ ] Make enemies more interesting

### Map System
- [x] Expand the map
- [ ] Add drops to the map
- [ ] **Handle Mutable Map State**: Currently `MapState` is static to avoid NetplayJS serialization issues. For future features like destructible walls or changing maps (boss arenas), we need a strategy:
  - **Option A**: Implement custom serializer/deserializer for `MapState` so it can be part of the synced game state.
  - **Option B**: Keep `MapState` as a stateless helper but store a raw `tiles` array (primitive data) in `gameState` that gets auto-serialized.

### Aesthetic Improvements
- [ ] Create a way for us to draw new sprites underneath other sprites (Z-axis system)
  - Need this for Naruto crater and Sasuke Rinnegan portal fx.
- [ ] Add player damage floating text
- [ ] Sound effects for skills?
- [ ] Add some floating text for all skills when used.

### Characters
- [ ] Naruto
  - The Level 5 attack shouldn't die when it hits enemies.
  - Kuruma beam doesnt use a capsule shape for some reason. At least when viewed through debug mode.
- [ ] Sasuke
  - Rinnegan Swap floating text should be purple
  - Fire trail should be a hazard not a projectile
     - Fix the shape of this and get this working again.
  - Level 5 unimplemented.
- [ ] Sakura Polish
  - Heal doesn't show the radius or have any VFX
  - Find other ways to make her ultimate more performant.
- [ ] Gaara Polish
  - Gaara Q doesn't freeze him in place
