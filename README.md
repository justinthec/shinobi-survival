Shinobi Survival Multiplayer

Play: https://www.jchan.me/shinobi-survival/dist/game.html

## Contributing
1. Install Antigravity: https://antigravity.google or another IDE / AI IDE
2. Git clone
3. go to the root directory
4. npm install

To run the server, npm run dev
Open up localhost:9000/game.html in a tab

## TODOs
 - Naruto Rasengan Charge needs to preserve the ball size when dashing. Also less knockback (or make the uzumaki barrage less of knockback, he shouldn't have 2 big knockback skills)
 - Projectiles should have their own size information for hitbox and drawing. Currently I think it is hardcoded to 30 for everything
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